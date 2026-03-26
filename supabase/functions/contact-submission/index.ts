import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactFormData {
  service: string;
  budget: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  website?: string;
  description: string;
  notes?: string;
  source?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const formData: ContactFormData = await req.json();

    // Validate required fields
    if (!formData.service || !formData.name || !formData.email || !formData.description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get IP address for spam prevention
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Insert submission into database
    const { data: submission, error: dbError } = await supabase
      .from("contact_submissions")
      .insert({
        service: formData.service,
        budget: formData.budget || null,
        name: formData.name,
        company: formData.company || null,
        email: formData.email,
        phone: formData.phone || null,
        website: formData.website || null,
        description: formData.description,
        notes: formData.notes || null,
        source: formData.source || "contact_page",
        ip_address: ipAddress,
        status: "new",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save submission" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send email notification
    const emailSent = await sendEmailNotification(formData);

    // Send to HoneyBook (will be implemented next)
    let honeybookId = null;
    const honeybookApiKey = Deno.env.get("HONEYBOOK_API_KEY");
    if (honeybookApiKey) {
      honeybookId = await sendToHoneyBook(formData, honeybookApiKey);

      // Update submission with HoneyBook ID if successful
      if (honeybookId) {
        await supabase
          .from("contact_submissions")
          .update({ honeybook_id: honeybookId })
          .eq("id", submission.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Form submitted successfully",
        submissionId: submission.id,
        emailSent,
        honeybookId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing form:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendEmailNotification(formData: ContactFormData): Promise<boolean> {
  try {
    // Using a simple email service - you can configure this with your preferred email provider
    // For now, we'll use Resend API if available, otherwise log the email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const emailBody = `
New Contact Form Submission

Service Requested: ${formData.service}
Budget: ${formData.budget || "Not specified"}

Contact Information:
Name: ${formData.name}
Company: ${formData.company || "Not specified"}
Email: ${formData.email}
Phone: ${formData.phone || "Not specified"}
Website: ${formData.website || "Not specified"}

Project Description:
${formData.description}

${formData.notes ? `Additional Notes:\n${formData.notes}` : ""}

Submitted at: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} EST
    `.trim();

    if (resendApiKey) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Inside Leads Contact Form <noreply@insideleads.com>",
          to: ["hello@insideleads.com"],
          subject: `New Contact Form: ${formData.service} - ${formData.name}`,
          text: emailBody,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Email send failed:", await emailResponse.text());
        return false;
      }

      return true;
    } else {
      // Log email content if no email service configured
      console.log("Email notification (no service configured):", emailBody);
      return false;
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

async function sendToHoneyBook(formData: ContactFormData, apiKey: string): Promise<string | null> {
  try {
    // HoneyBook API endpoint for creating contacts
    const response = await fetch("https://api.honeybook.com/v1/contacts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: formData.name.split(" ")[0] || formData.name,
        last_name: formData.name.split(" ").slice(1).join(" ") || "",
        email: formData.email,
        phone: formData.phone || "",
        company_name: formData.company || "",
        notes: `Service: ${formData.service}\nBudget: ${formData.budget || "Not specified"}\nWebsite: ${formData.website || "Not specified"}\n\nProject Description:\n${formData.description}\n\n${formData.notes ? `Additional Notes:\n${formData.notes}` : ""}`,
        custom_fields: {
          service_requested: formData.service,
          budget: formData.budget,
          website: formData.website,
        },
      }),
    });

    if (!response.ok) {
      console.error("HoneyBook API error:", await response.text());
      return null;
    }

    const result = await response.json();
    return result.id || result.contact_id || null;
  } catch (error) {
    console.error("Error sending to HoneyBook:", error);
    return null;
  }
}
