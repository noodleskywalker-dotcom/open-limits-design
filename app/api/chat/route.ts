import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

async function buildSiteContext(): Promise<string> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return "Open Limits Design is a luxury architecture, interior design, and furniture studio in Lusail, Qatar.";
  }

  const [services, categories, company] = await Promise.all([
    supabase.from("services").select("title, description").eq("is_active", true).order("sort_order"),
    supabase.from("furniture_categories").select("name").eq("published", true).order("sort_order"),
    supabase
      .from("company_profile")
      .select("name, tagline, description, phone, phone2, email, address")
      .eq("id", 1)
      .maybeSingle()
  ]);

  const parts: string[] = [];
  if (company.data) {
    parts.push(
      `Company: ${company.data.name}. ${company.data.tagline ?? ""} ${company.data.description ?? ""}`.trim()
    );
    if (company.data.email) parts.push(`Contact email: ${company.data.email}`);
    if (company.data.phone) parts.push(`Contact phone: ${company.data.phone}`);
    if (company.data.phone2) parts.push(`Secondary phone: ${company.data.phone2}`);
    if (company.data.address) parts.push(`Address: ${company.data.address}`);
    parts.push("Locations served: Qatar and select international projects.");
  }
  if (services.data?.length) {
    parts.push(`Services: ${services.data.map((s) => s.title).join(", ")}.`);
  }
  if (categories.data?.length) {
    parts.push(`Furniture categories: ${categories.data.map((c) => c.name).join(", ")}.`);
  }
  parts.push("Pricing depends on project type, size, materials, design complexity, location, timeline, and furniture/fit-out requirements — no fixed pricing.");
  parts.push("Clients can book a meeting with the CEO at /book-meeting-with-ceo.");
  return parts.join("\n");
}

function fallbackReply(question: string, context: string): string {
  const q = question.toLowerCase();

  if (/futuristic|avant.?garde|modern|contemporary/.test(q)) {
    return "Yes — Open Limits Design creates contemporary and forward-thinking architecture and interiors. We tailor each concept to your vision, from minimalist luxury to bold statement spaces. Book a consultation to explore a futuristic direction for your project.";
  }
  if (/custom furniture|bespoke furniture|made.?to.?order/.test(q)) {
    return "Absolutely. We design and supply custom furniture — majlis seating, bedrooms, dining collections, and one-off commissions. Browse our Furniture catalog or book a meeting to discuss dimensions, materials, and finishes for your piece.";
  }
  if (/price|cost|quote|budget|how much/.test(q)) {
    return "Pricing depends on project type, size, materials, design complexity, location, timeline, and furniture or fit-out requirements. We do not publish fixed prices. What type of project is it, and what is the approximate size? You can also book a meeting with our CEO for a tailored proposal.";
  }
  if (/outside qatar|international|abroad|other countr/.test(q)) {
    return "We are based in Lusail, Qatar and primarily serve clients across Qatar. For select international projects we can discuss remote design and supply arrangements — share your location and project scope and we will advise on feasibility.";
  }
  if (/book|meeting|appointment|schedule|calendar/.test(q)) {
    return "You can book a meeting with our CEO on the website. Open Book a Meeting, pick an available date and time, and submit your details. We confirm every request personally.";
  }
  if (/service|architecture|interior|fit.?out|shell|facade|window|construction|bim|revit|engineering|project management/.test(q)) {
    const services = context.match(/Services: ([^\n]+)/)?.[1];
    return `Open Limits Design offers: ${services ?? "architecture, interior design, construction, furniture supply, BIM/Revit, fit-out, engineering, and project management"}. Visit the Services page or book a meeting to discuss your scope.`;
  }
  if (/furniture|sofa|majlis|chair|table|bed|cabinet|light|decor/.test(q)) {
    const categories = context.match(/Furniture categories: ([^\n]+)/)?.[1];
    return `Our furniture catalog includes: ${categories ?? "sofas, majlis, chairs, tables, bedrooms, and exterior collections"}. Browse the Furniture page for dimensions, materials, and photos.`;
  }
  if (/contact|phone|email|address|reach|location/.test(q)) {
    const email = context.match(/Contact email: ([^\n]+)/)?.[1];
    const phone = context.match(/Contact phone: ([^\n]+)/)?.[1];
    if (email || phone) {
      return `Reach Open Limits Design${email ? ` at ${email}` : ""}${phone ? ` or call ${phone}` : ""}. Visit the Contact page or book a meeting online.`;
    }
    return "Use the Contact page to reach us, or book a meeting with our CEO from the booking page.";
  }
  if (/material|wood|marble|leather|fabric|oak|walnut|brass/.test(q)) {
    return "We work with premium materials including oak, walnut, marble, leather, linen, steel, and brushed brass. See the Materials page for our material library.";
  }
  return "I can help with our services, furniture catalog, materials, pricing process, and booking a meeting with our CEO. What would you like to know about Open Limits Design?";
}

function extractLeadFields(messages: ChatMessage[]) {
  const text = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const email = text.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] ?? null;
  const phone = text.match(/(\+?\d[\d\s-]{7,}\d)/)?.[0]?.trim() ?? null;
  const nameMatch = text.match(/(?:my name is|i am|i'm)\s+([A-Za-z][A-Za-z\s'-]{1,40})/i);
  const name = nameMatch?.[1]?.trim() ?? null;

  const hasLeadSignal = Boolean(email || phone || name);
  if (!hasLeadSignal) return null;

  return {
    name,
    phone,
    email,
    message: text.slice(0, 2000),
    source: "ai_assistant"
  };
}

async function storeLead(messages: ChatMessage[]) {
  const lead = extractLeadFields(messages);
  if (!lead) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from("leads").insert(lead);
  if (error) console.error("[chat] lead insert failed:", error.message);
}

export async function POST(request: NextRequest) {
  let body: { messages?: ChatMessage[]; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = (body.messages ?? []).slice(-12);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "No user message provided" }, { status: 400 });
  }

  console.log("[chat] user message:", lastUser.content);

  const context = await buildSiteContext();
  const apiKey = process.env.OPENAI_API_KEY;
  const openAiLoaded = Boolean(apiKey);
  console.log("[chat] OpenAI key loaded:", openAiLoaded);

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
          max_tokens: 450,
          messages: [
            {
              role: "system",
              content:
                "You are the helpful assistant for Open Limits Design, a luxury architecture, interior design, and furniture studio in Qatar. " +
                "Only describe services and furniture from the site context. Never invent services. " +
                "Do not give fixed pricing — explain that pricing depends on scope, size, materials, complexity, location, timeline, and fit-out needs. " +
                "Encourage booking a CEO meeting when relevant. Collect name, phone, email, project type, location, and preferred date/time when the visitor is interested.\n\nSITE CONTEXT:\n" +
                context
            },
            ...messages
          ]
        })
      });

      console.log("[chat] OpenAI status code:", response.status);

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          await storeLead(messages);
          console.log("[chat] final response (openai):", reply.slice(0, 120));
          return NextResponse.json({ reply, source: "openai" });
        }
      } else {
        const detail = await response.text();
        console.error("[chat] OpenAI error:", response.status, detail.slice(0, 200));
      }
    } catch (error) {
      console.error("[chat] OpenAI request failed:", error instanceof Error ? error.message : error);
    }
  } else {
    console.log("[chat] OPENAI_API_KEY missing — using fallback responses.");
  }

  const reply = fallbackReply(lastUser.content, context);
  await storeLead(messages);
  console.log("[chat] final response (fallback):", reply.slice(0, 120));

  return NextResponse.json({ reply, source: "fallback" });
}
