import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckResult {
  id: string;
  category: string;
  title: string;
  description: string;
  status: "pass" | "fail" | "warn";
  priority: "critical" | "high" | "medium" | "low";
  detail?: string;
}

interface AuditResult {
  url: string;
  domain: string;
  overall_score: number;
  response_time_ms: number;
  categories: {
    on_page: number;
    technical: number;
    performance: number;
    mobile: number;
  };
  checks: CheckResult[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    critical_issues: string[];
  };
}

function extractDomain(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return rawUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "https://" + trimmed;
}

function isPrivateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname;
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.startsWith("192.168.") ||
      h.startsWith("10.") ||
      h.startsWith("172.") ||
      h === "0.0.0.0" ||
      !h.includes(".")
    );
  } catch {
    return true;
  }
}

async function fetchWithTimeout(url: string, ms = 12000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "InsideLeads-SEO-Checker/1.0 (+https://getinsideleads.com)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function scoreCategory(checks: CheckResult[], category: string): number {
  const cat = checks.filter(c => c.category === category);
  if (!cat.length) return 100;
  const weights = { critical: 4, high: 3, medium: 2, low: 1 };
  let totalWeight = 0;
  let penaltyWeight = 0;
  for (const c of cat) {
    const w = weights[c.priority];
    totalWeight += w;
    if (c.status === "fail") penaltyWeight += w;
    else if (c.status === "warn") penaltyWeight += w * 0.4;
  }
  return Math.round(Math.max(0, (1 - penaltyWeight / totalWeight) * 100));
}

function auditHtml(html: string, url: string, responseTimeMs: number, isHttps: boolean, finalUrl: string): AuditResult {
  const checks: CheckResult[] = [];
  const domain = extractDomain(url);

  // ---- TECHNICAL ----

  // HTTPS
  checks.push({
    id: "https",
    category: "technical",
    title: "HTTPS / Secure Connection",
    description: "Your site uses HTTPS, which is required for SEO and user trust.",
    status: isHttps ? "pass" : "fail",
    priority: "critical",
    detail: isHttps ? "Site loaded over HTTPS." : "Site is served over HTTP. Switch to HTTPS immediately.",
  });

  // Viewport meta
  const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  checks.push({
    id: "viewport",
    category: "mobile",
    title: "Mobile Viewport Tag",
    description: "A viewport meta tag tells browsers how to scale the page on mobile devices.",
    status: hasViewport ? "pass" : "fail",
    priority: "high",
    detail: hasViewport
      ? "Viewport meta tag found."
      : 'Missing <meta name="viewport"> tag. Add it to enable proper mobile scaling.',
  });

  // Title tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].trim() : "";
  let titleStatus: "pass" | "fail" | "warn" = "pass";
  let titleDetail = `Title: "${titleText}" (${titleText.length} chars)`;
  if (!titleText) {
    titleStatus = "fail";
    titleDetail = "No title tag found. Every page must have a unique, descriptive title.";
  } else if (titleText.length < 30) {
    titleStatus = "warn";
    titleDetail = `Title is too short (${titleText.length} chars). Aim for 50–60 characters.`;
  } else if (titleText.length > 65) {
    titleStatus = "warn";
    titleDetail = `Title is too long (${titleText.length} chars). Keep it under 65 characters to avoid truncation in search results.`;
  }
  checks.push({
    id: "title",
    category: "on_page",
    title: "Page Title Tag",
    description: "The title tag is one of the most important on-page SEO elements.",
    status: titleStatus,
    priority: "critical",
    detail: titleDetail,
  });

  // Meta description
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const descText = descMatch ? descMatch[1].trim() : "";
  let descStatus: "pass" | "fail" | "warn" = "pass";
  let descDetail = `Description: "${descText.substring(0, 80)}${descText.length > 80 ? "…" : ""}" (${descText.length} chars)`;
  if (!descText) {
    descStatus = "fail";
    descDetail = "No meta description found. Add a concise description (120–160 chars) to improve click-through rates.";
  } else if (descText.length < 70) {
    descStatus = "warn";
    descDetail = `Meta description is short (${descText.length} chars). Aim for 120–160 characters.`;
  } else if (descText.length > 165) {
    descStatus = "warn";
    descDetail = `Meta description is too long (${descText.length} chars). Keep it under 165 characters.`;
  }
  checks.push({
    id: "meta_description",
    category: "on_page",
    title: "Meta Description",
    description: "Meta descriptions appear in search results and influence click-through rates.",
    status: descStatus,
    priority: "high",
    detail: descDetail,
  });

  // H1 tag
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h1Texts = h1Matches.map(m => m.replace(/<[^>]+>/g, "").trim());
  let h1Status: "pass" | "fail" | "warn" = "pass";
  let h1Detail = `H1: "${h1Texts[0]?.substring(0, 60) || ""}"`;
  if (h1Matches.length === 0) {
    h1Status = "fail";
    h1Detail = "No H1 heading found. Every page should have exactly one H1 heading.";
  } else if (h1Matches.length > 1) {
    h1Status = "warn";
    h1Detail = `${h1Matches.length} H1 tags found. Use only one H1 per page for clear content hierarchy.`;
  }
  checks.push({
    id: "h1",
    category: "on_page",
    title: "H1 Heading",
    description: "The H1 heading is the most important on-page SEO element after the title.",
    status: h1Status,
    priority: "high",
    detail: h1Detail,
  });

  // H2 headings
  const h2Matches = html.match(/<h2[^>]*>/gi) || [];
  checks.push({
    id: "h2",
    category: "on_page",
    title: "Heading Structure (H2s)",
    description: "Subheadings help search engines understand content hierarchy.",
    status: h2Matches.length > 0 ? "pass" : "warn",
    priority: "medium",
    detail: h2Matches.length > 0
      ? `${h2Matches.length} H2 heading(s) found. Good content structure.`
      : "No H2 headings found. Use subheadings to structure your content and include keywords.",
  });

  // Open Graph tags
  const hasOgTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
  const hasOgDesc = /<meta[^>]+property=["']og:description["']/i.test(html);
  const hasOgImage = /<meta[^>]+property=["']og:image["']/i.test(html);
  const ogScore = [hasOgTitle, hasOgDesc, hasOgImage].filter(Boolean).length;
  checks.push({
    id: "open_graph",
    category: "on_page",
    title: "Open Graph / Social Tags",
    description: "Open Graph tags control how your page looks when shared on social media.",
    status: ogScore === 3 ? "pass" : ogScore >= 1 ? "warn" : "fail",
    priority: "medium",
    detail: ogScore === 3
      ? "All key Open Graph tags (og:title, og:description, og:image) are present."
      : `Missing Open Graph tags: ${[!hasOgTitle && "og:title", !hasOgDesc && "og:description", !hasOgImage && "og:image"].filter(Boolean).join(", ")}.`,
  });

  // Canonical tag
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  checks.push({
    id: "canonical",
    category: "technical",
    title: "Canonical Tag",
    description: "Canonical tags prevent duplicate content issues by specifying the preferred URL.",
    status: hasCanonical ? "pass" : "warn",
    priority: "medium",
    detail: hasCanonical
      ? "Canonical tag found."
      : "No canonical tag found. Add a canonical tag to prevent duplicate content issues.",
  });

  // Robots meta
  const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  const robotsContent = robotsMatch ? robotsMatch[1].toLowerCase() : "";
  const isNoindex = robotsContent.includes("noindex");
  checks.push({
    id: "robots_meta",
    category: "technical",
    title: "Robots Meta Tag",
    description: "The robots meta tag controls whether search engines index the page.",
    status: isNoindex ? "fail" : "pass",
    priority: "critical",
    detail: isNoindex
      ? 'Page has "noindex" — search engines are blocked from indexing this page. Remove if unintentional.'
      : "Page is not blocked from indexing.",
  });

  // Structured data
  const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  const hasMicrodata = /itemscope|itemtype/i.test(html);
  const hasSchema = hasJsonLd || hasMicrodata;
  checks.push({
    id: "structured_data",
    category: "technical",
    title: "Structured Data (Schema.org)",
    description: "Structured data helps search engines understand your content and can unlock rich results.",
    status: hasSchema ? "pass" : "warn",
    priority: "medium",
    detail: hasSchema
      ? `Structured data detected (${hasJsonLd ? "JSON-LD" : "Microdata"}).`
      : "No structured data found. Adding Schema.org markup can improve how your site appears in search results.",
  });

  // Images without alt text
  const imgTags = html.match(/<img[^>]+>/gi) || [];
  const missingAlt = imgTags.filter(img => !/alt=["'][^"']+["']/i.test(img)).length;
  const altStatus: "pass" | "fail" | "warn" = missingAlt === 0 ? "pass" : missingAlt > 3 ? "fail" : "warn";
  checks.push({
    id: "img_alt",
    category: "on_page",
    title: "Image Alt Text",
    description: "Alt text helps search engines understand images and improves accessibility.",
    status: altStatus,
    priority: "medium",
    detail: missingAlt === 0
      ? `All ${imgTags.length} image(s) have alt text.`
      : `${missingAlt} of ${imgTags.length} image(s) are missing alt text.`,
  });

  // Page size / HTML bloat
  const htmlSize = new TextEncoder().encode(html).length;
  const htmlKb = Math.round(htmlSize / 1024);
  checks.push({
    id: "html_size",
    category: "performance",
    title: "HTML Page Size",
    description: "Large HTML files slow down page load and can impact SEO.",
    status: htmlKb < 100 ? "pass" : htmlKb < 200 ? "warn" : "fail",
    priority: "medium",
    detail: htmlKb < 100
      ? `HTML size is ${htmlKb}KB — well within recommended limits.`
      : htmlKb < 200
      ? `HTML size is ${htmlKb}KB — slightly large. Consider reducing inline styles or scripts.`
      : `HTML size is ${htmlKb}KB — too large. Reduce inline content, compress output, or enable server-side minification.`,
  });

  // Response time
  checks.push({
    id: "response_time",
    category: "performance",
    title: "Server Response Time",
    description: "Faster server response times improve both user experience and SEO rankings.",
    status: responseTimeMs < 600 ? "pass" : responseTimeMs < 1500 ? "warn" : "fail",
    priority: "high",
    detail: responseTimeMs < 600
      ? `Response time: ${responseTimeMs}ms — excellent.`
      : responseTimeMs < 1500
      ? `Response time: ${responseTimeMs}ms — acceptable but could be improved. Aim for under 600ms.`
      : `Response time: ${responseTimeMs}ms — too slow. Optimize server performance, caching, and hosting.`,
  });

  // robots.txt
  let robotsTxtStatus: "pass" | "fail" | "warn" = "warn";
  let robotsTxtDetail = "Could not verify robots.txt (check separately).";

  // sitemap.xml
  let sitemapStatus: "pass" | "fail" | "warn" = "warn";
  let sitemapDetail = "Could not verify sitemap.xml (check separately).";

  checks.push({
    id: "robots_txt",
    category: "technical",
    title: "Robots.txt File",
    description: "robots.txt tells search engine crawlers which pages to crawl or ignore.",
    status: robotsTxtStatus,
    priority: "medium",
    detail: robotsTxtDetail,
  });

  checks.push({
    id: "sitemap",
    category: "technical",
    title: "XML Sitemap",
    description: "An XML sitemap helps search engines discover and index all your important pages.",
    status: sitemapStatus,
    priority: "medium",
    detail: sitemapDetail,
  });

  // Check robots.txt and sitemap in parallel (best-effort)
  // (These results are filled in after fetch, see below)

  // ---- SCORING ----
  const on_page = scoreCategory(checks, "on_page");
  const technical = scoreCategory(checks, "technical");
  const performance = scoreCategory(checks, "performance");
  const mobile = scoreCategory(checks, "mobile");

  const overall_score = Math.round((on_page * 0.35) + (technical * 0.3) + (performance * 0.2) + (mobile * 0.15));

  const passed = checks.filter(c => c.status === "pass").length;
  const warnings = checks.filter(c => c.status === "warn").length;
  const failed = checks.filter(c => c.status === "fail").length;
  const critical_issues = checks
    .filter(c => c.status === "fail" && c.priority === "critical")
    .map(c => c.title);

  return {
    url: finalUrl,
    domain,
    overall_score,
    response_time_ms: responseTimeMs,
    categories: { on_page, technical, performance, mobile },
    checks,
    summary: { passed, warnings, failed, critical_issues },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawUrl: string = body?.url || "";

    if (!rawUrl || rawUrl.length < 3) {
      return new Response(JSON.stringify({ error: "Please enter a valid URL or domain." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUrl = normalizeUrl(rawUrl);

    if (isPrivateUrl(normalizedUrl)) {
      return new Response(JSON.stringify({ error: "Please enter a public website URL." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: 5 audits per IP per hour
    const visitorIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("seo_audits")
      .select("*", { count: "exact", head: true })
      .eq("visitor_ip", visitorIp)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "You've reached the limit of 5 free audits per hour. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the target page
    const fetchStart = Date.now();
    let fetchResponse: Response;
    try {
      fetchResponse = await fetchWithTimeout(normalizedUrl);
    } catch (err) {
      const msg = err instanceof Error && err.name === "AbortError"
        ? "The website took too long to respond. Please try again."
        : "Could not reach the website. Please check the URL and try again.";
      return new Response(JSON.stringify({ error: msg }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const responseTimeMs = Date.now() - fetchStart;
    const finalUrl = fetchResponse.url || normalizedUrl;
    const isHttps = finalUrl.startsWith("https://");

    const contentType = fetchResponse.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return new Response(
        JSON.stringify({ error: "The URL does not appear to be an HTML page." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await fetchResponse.text();
    const domain = extractDomain(finalUrl);

    // Check robots.txt and sitemap in parallel (best-effort, don't fail audit on error)
    const [robotsRes, sitemapRes] = await Promise.allSettled([
      fetchWithTimeout(`https://${domain}/robots.txt`, 5000),
      fetchWithTimeout(`https://${domain}/sitemap.xml`, 5000),
    ]);

    const hasRobotsTxt =
      robotsRes.status === "fulfilled" &&
      robotsRes.value.status === 200 &&
      (robotsRes.value.headers.get("content-type") || "").includes("text");

    const hasSitemap =
      sitemapRes.status === "fulfilled" &&
      sitemapRes.value.status === 200 &&
      (sitemapRes.value.headers.get("content-type") || "").includes("xml");

    // Build audit
    const result = auditHtml(html, normalizedUrl, responseTimeMs, isHttps, finalUrl);

    // Patch robots.txt and sitemap results
    const robotsCheck = result.checks.find(c => c.id === "robots_txt");
    if (robotsCheck) {
      robotsCheck.status = hasRobotsTxt ? "pass" : "warn";
      robotsCheck.detail = hasRobotsTxt
        ? "robots.txt file found and accessible."
        : "No robots.txt found. Create one to help search engines navigate your site.";
    }

    const sitemapCheck = result.checks.find(c => c.id === "sitemap");
    if (sitemapCheck) {
      sitemapCheck.status = hasSitemap ? "pass" : "warn";
      sitemapCheck.detail = hasSitemap
        ? "XML sitemap found at /sitemap.xml."
        : "No sitemap.xml found. Create and submit a sitemap to Google Search Console.";
    }

    // Recalculate scores after patching
    const on_page = scoreCategory(result.checks, "on_page");
    const technical = scoreCategory(result.checks, "technical");
    const performance = scoreCategory(result.checks, "performance");
    const mobile = scoreCategory(result.checks, "mobile");
    result.categories = { on_page, technical, performance, mobile };
    result.overall_score = Math.round((on_page * 0.35) + (technical * 0.3) + (performance * 0.2) + (mobile * 0.15));
    result.summary.passed = result.checks.filter(c => c.status === "pass").length;
    result.summary.warnings = result.checks.filter(c => c.status === "warn").length;
    result.summary.failed = result.checks.filter(c => c.status === "fail").length;
    result.summary.critical_issues = result.checks
      .filter(c => c.status === "fail" && c.priority === "critical")
      .map(c => c.title);

    // Persist to database
    await supabase.from("seo_audits").insert({
      url: result.url,
      domain: result.domain,
      overall_score: result.overall_score,
      results: result,
      visitor_ip: visitorIp,
    });

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("seo-audit error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
