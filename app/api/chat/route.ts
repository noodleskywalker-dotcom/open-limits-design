import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

async function buildSiteContext(): Promise<string> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return "Open Limits Design is a luxury architecture, interior design, and furniture studio.";
  }

  const [services, categories, company] = await Promise.all([
    supabase.from("services").select("title, description").eq("is_active", true).order("sort_order"),
    supabase.from("furniture_categories").select("name").eq("published", true).order("sort_order"),
    supabase.from("company_profile").select("name, tagline, description, phone, email, address").eq("id", 1).maybeSingle()
  ]);

  const parts: string[] = [];
  if (company.data) {
    parts.push(
      `Company: ${company.data.name}. ${company.data.tagline ?? ""} ${company.data.description ?? ""}`.trim()
    );
    if (company.data.email) parts.push(`Contact email: ${company.data.email}`);
    if (company.data.phone) parts.push(`Contact phone: ${company.data.phone}`);
    if (company.data.address) parts.push(`Address: ${company.data.address}`);
  }
  if (services.data?.length) {
    parts.push(`Services: ${services.data.map((s) => s.title).join(", ")}.`);
  }
  if (categories.data?.length) {
    parts.push(`Furniture categories: ${categories.data.map((c) => c.name).join(", ")}.`);
  }
  parts.push("Clients can book a meeting with the CEO at /book-meeting-with-ceo.");
  return parts.join("\n");
}

function fallbackReply(question: string, context: string): string {
  const q = question.toLowerCase();

  if (/book|meeting|appointment|schedule|calendar/.test(q)) {
    return "You can book a meeting with our CEO directly on the website. Open the “Book a Meeting” page, pick an available date and time on the calendar, and submit your details. We will confirm your request shortly.";
  }
  if (/service|architecture|interior|fit.?out|shell|facade|window|design/.test(q)) {
    const services = context.match(/Services: ([^\n]+)/)?.[1];
    return `Open Limits Design offers: ${services ?? "architecture, interior design, fit-out, and custom furniture"}. Visit the Services page for details, or book a meeting with our CEO to discuss your project.`;
  }
  if (/furniture|sofa|majlis|chair|table|bed|cabinet|light|decor/.test(q)) {
    const categories = context.match(/Furniture categories: ([^\n]+)/)?.[1];
    return `Our furniture catalog includes: ${categories ?? "sofas, majlis, chairs, tables, bedrooms, and exterior collections"}. Browse the Furniture page to see items with dimensions, materials, and photos.`;
  }
  if (/contact|phone|email|address|reach|location/.test(q)) {
    const email = context.match(/Contact email: ([^\n]+)/)?.[1];
    const phone = context.match(/Contact phone: ([^\n]+)/)?.[1];
    if (email || phone) {
      return `You can reach Open Limits Design${email ? ` by email at ${email}` : ""}${phone ? ` or by phone at ${phone}` : ""}. You can also use the Contact page or book a meeting online.`;
    }
    return "Please use the Contact page to reach us, or book a meeting with our CEO from the booking page.";
  }
  if (/price|cost|quote|budget/.test(q)) {
    return "Pricing depends on the scope of your project. The best next step is to book a meeting with our CEO — we will review your needs and prepare a tailored proposal.";
  }
  if (/material|wood|marble|leather|fabric|oak|walnut|brass/.test(q)) {
    return "We work with premium materials including oak, walnut, marble, leather, linen, steel, and brushed brass. See the Materials page for our full material library.";
  }
  return "I can help with our services, furniture catalog, materials, and booking a meeting with our CEO. What would you like to know about Open Limits Design?";
}

export async function POST(request: NextRequest) {
  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = (body.messages ?? []).slice(-10);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "No user message provided" }, { status: 400 });
  }

  const context = await buildSiteContext();
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 400,
          messages: [
            {
              role: "system",
              content:
                "You are the helpful assistant for Open Limits Design, a luxury architecture, interior design, and furniture studio. " +
                "Only describe services and furniture that appear in the site context below. Never invent services. " +
                "Encourage visitors to book a meeting with the CEO when relevant.\n\nSITE CONTEXT:\n" +
                context
            },
            ...messages
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return NextResponse.json({ reply, source: "openai" });
        }
      } else {
        const detail = await response.text();
        console.error("[chat] OpenAI error", response.status, detail.slice(0, 200));
        if (response.status === 429) {
          console.error("[chat] OpenAI quota/billing issue — using fallback responses.");
        }
      }
    } catch (error) {
      console.error("[chat] OpenAI request failed:", error instanceof Error ? error.message : error);
    }
  } else {
    console.log("[chat] OPENAI_API_KEY missing — using fallback responses.");
  }

  return NextResponse.json({
    reply: fallbackReply(lastUser.content, context),
    source: "fallback"
  });
}
