import { NextRequest } from "next/server";
import { buildSiteKnowledge, siteKnowledgeToPrompt } from "@/lib/ai/chat-context";
import { buildCmsReply, detectIntent, previewsForIntent } from "@/lib/ai/chat-fallback";
import type { ChatLink, ChatReplyPayload } from "@/lib/ai/chat-types";
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

function inferLinksFromReply(reply: string): ChatLink[] {
  const candidates: { label: string; href: string; pattern: RegExp }[] = [
    { label: "View Furniture Catalog", href: "/furniture", pattern: /\/furniture\b/i },
    { label: "Browse Materials", href: "/materials", pattern: /\/materials\b/i },
    { label: "View Projects", href: "/projects", pattern: /\/projects\b/i },
    { label: "Book a Meeting", href: "/book-meeting-with-ceo", pattern: /\/book-meeting-with-ceo\b/i },
    { label: "View Services", href: "/services", pattern: /\/services\b/i },
    { label: "Contact Us", href: "/contact", pattern: /\/contact\b/i },
    { label: "Location", href: "/location", pattern: /\/location\b/i }
  ];

  return candidates.filter((item) => item.pattern.test(reply)).map(({ label, href }) => ({ label, href }));
}

function mergePayload(
  textReply: string,
  cmsPayload: ChatReplyPayload,
  source: ChatReplyPayload["source"]
): ChatReplyPayload {
  const inferred = inferLinksFromReply(textReply);
  const linkMap = new Map<string, ChatLink>();
  for (const link of [...cmsPayload.links, ...inferred]) {
    linkMap.set(link.href, link);
  }

  return {
    reply: textReply,
    links: [...linkMap.values()],
    previews: cmsPayload.previews,
    source
  };
}

async function streamOpenAiReply(
  messages: ChatMessage[],
  context: string,
  apiKey: string
): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 600,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are the Open Limits Design website assistant — conversational, concise, and helpful. " +
            "Use ONLY facts from SITE CONTEXT (live CMS data). Include specific counts, category names, project titles, " +
            "furniture dimensions, and materials when relevant. When pointing visitors somewhere, mention these paths: " +
            "/furniture, /materials, /projects, /services, /book-meeting-with-ceo, /contact, /location. " +
            "Never invent products or projects not listed. Do not give fixed pricing — explain scope-based quotes. " +
            "Encourage booking a CEO meeting when appropriate.\n\nSITE CONTEXT:\n" +
            context
        },
        ...messages
      ]
    })
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    console.error("[chat] OpenAI error:", response.status, detail.slice(0, 200));
    return null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) full += delta;
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }

  return full.trim() || null;
}

function sseEvent(data: Record<string, unknown>) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  let body: { messages?: ChatMessage[]; sessionId?: string; stream?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const messages = (body.messages ?? []).slice(-12);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return new Response(JSON.stringify({ error: "No user message provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const knowledge = await buildSiteKnowledge();
  const context = siteKnowledgeToPrompt(knowledge);
  const intent = detectIntent(lastUser.content);
  const cmsPayload = buildCmsReply(lastUser.content, knowledge);
  const apiKey = process.env.OPENAI_API_KEY;
  const wantsStream = body.stream !== false;

  if (wantsStream) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(sseEvent(payload)));
        };

        send({ type: "meta", previews: cmsPayload.previews, links: cmsPayload.links, source: cmsPayload.source });

        let replyText = cmsPayload.reply;
        let source: ChatReplyPayload["source"] = "cms";

        if (apiKey) {
          try {
            const openAiReply = await streamOpenAiReply(messages, context, apiKey);
            if (openAiReply) {
              replyText = openAiReply;
              source = "openai";
            }
          } catch (error) {
            console.error("[chat] OpenAI request failed:", error instanceof Error ? error.message : error);
          }
        }

        const finalPayload = mergePayload(replyText, cmsPayload, source);
        const previews = finalPayload.previews.length ? finalPayload.previews : previewsForIntent(intent, knowledge);

        const step = replyText.length > 320 ? 4 : 2;
        for (let i = 0; i <= replyText.length; i += step) {
          send({ type: "token", content: replyText.slice(0, Math.min(i, replyText.length)) });
          await new Promise((resolve) => setTimeout(resolve, 12));
        }

        send({
          type: "done",
          reply: finalPayload.reply,
          links: finalPayload.links,
          previews,
          source: finalPayload.source
        });

        await storeLead(messages);
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  }

  let replyText = cmsPayload.reply;
  let source: ChatReplyPayload["source"] = "cms";

  if (apiKey) {
    try {
      const openAiReply = await streamOpenAiReply(messages, context, apiKey);
      if (openAiReply) {
        replyText = openAiReply;
        source = "openai";
      }
    } catch (error) {
      console.error("[chat] OpenAI request failed:", error instanceof Error ? error.message : error);
    }
  }

  const payload = mergePayload(replyText, cmsPayload, source);
  if (!payload.previews.length) {
    payload.previews = previewsForIntent(intent, knowledge);
  }

  await storeLead(messages);

  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" }
  });
}
