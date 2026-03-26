import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // GET /blog-posts - List all published posts with optional category filter
    if (req.method === "GET" && pathname === "/blog-posts") {
      const category = url.searchParams.get("category");
      const search = url.searchParams.get("search");
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let query = supabase
        .from("blog_posts")
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image,
          author,
          published_at,
          view_count,
          blog_categories (
            id,
            name,
            slug
          )
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Filter by category if provided
      if (category && category !== "all") {
        const { data: categoryData } = await supabase
          .from("blog_categories")
          .select("id")
          .eq("slug", category)
          .single();

        if (categoryData) {
          query = query.eq("category_id", categoryData.id);
        }
      }

      const { data: posts, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch posts" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Apply search filter on the client side if provided
      let filteredPosts = posts || [];
      if (search) {
        const searchLower = search.toLowerCase();
        filteredPosts = filteredPosts.filter(post =>
          post.title.toLowerCase().includes(searchLower) ||
          (post.excerpt && post.excerpt.toLowerCase().includes(searchLower))
        );
      }

      return new Response(
        JSON.stringify({ posts: filteredPosts }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET /blog-posts/:slug - Get a single post by slug
    if (req.method === "GET" && pathname.startsWith("/blog-posts/")) {
      const slug = pathname.split("/blog-posts/")[1];

      if (!slug) {
        return new Response(
          JSON.stringify({ error: "Post slug required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: post, error } = await supabase
        .from("blog_posts")
        .select(`
          id,
          title,
          slug,
          excerpt,
          content,
          featured_image,
          author,
          published_at,
          view_count,
          seo_title,
          seo_description,
          seo_keywords,
          blog_categories (
            id,
            name,
            slug
          )
        `)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) {
        console.error("Error fetching post:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch post" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!post) {
        return new Response(
          JSON.stringify({ error: "Post not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Increment view count
      await supabase
        .from("blog_posts")
        .update({ view_count: (post.view_count || 0) + 1 })
        .eq("id", post.id);

      return new Response(
        JSON.stringify({ post }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET /blog-posts/categories - Get all categories
    if (req.method === "GET" && pathname === "/blog-posts/categories") {
      const { data: categories, error } = await supabase
        .from("blog_categories")
        .select("id, name, slug, description, order_index")
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch categories" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ categories }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
