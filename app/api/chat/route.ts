import { NextRequest, NextResponse } from "next/server";
import { buildSiteKnowledge, siteKnowledgeToPrompt } from "@/lib/ai/chat-context";
import { buildFallbackReply } from "@/lib/ai/chat-fallback";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

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

  const knowledge = await buildSiteKnowledge();
  const context = siteKnowledgeToPrompt(knowledge);
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
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content:
                "You are the Open Limits Design website assistant — conversational, concise, and helpful. " +
                "Use ONLY facts from SITE CONTEXT (live CMS data). Include specific counts, category names, and project titles when relevant. " +
                "When pointing visitors somewhere, mention these paths: /furniture, /materials, /projects, /services, /book-meeting-with-ceo, /contact. " +
                "Never invent products or projects not listed. Do not give fixed pricing — explain scope-based quotes. " +
                "Encourage booking a CEO meeting when appropriate.\n\nSITE CONTEXT:\n" +
                context
            },
            ...messages
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) {
          await storeLead(messages);
          return NextResponse.json({
            reply,
            links: inferLinksFromReply(reply),
            source: "openai"
          });
        }
      } else {
        const detail = await response.text();
        console.error("[chat] OpenAI error:", response.status, detail.slice(0, 200));
      }
    } catch (error) {
      console.error("[chat] OpenAI request failed:", error instanceof Error ? error.message : error);
    }
  }

  const { reply, links } = buildFallbackReply(lastUser.content, knowledge);
  await storeLead(messages);

  return NextResponse.json({ reply, links, source: "fallback" });
}

function inferLinksFromReply(reply: string) {
  const candidates: { label: string; href: string; pattern: RegExp }[] = [
    { label: "View Furniture Catalog", href: "/furniture", pattern: /\/furniture\b/i },
    { label: "Browse Materials", href: "/materials", pattern: /\/materials\b/i },
    { label: "View Projects", href: "/projects", pattern: /\/projects\b/i },
    { label: "Book a Meeting", href: "/book-meeting-with-ceo", pattern: /\/book-meeting-with-ceo\b/i },
    { label: "View Services", href: "/services", pattern: /\/services\b/i },
    { label: "Contact Us", href: "/contact", pattern: /\/contact\b/i }
  ];

  return candidates.filter((item) => item.pattern.test(reply)).map(({ label, href }) => ({ label, href }));
}
