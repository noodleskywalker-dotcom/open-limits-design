"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { ChatLink, ChatPreview } from "@/lib/ai/chat-types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: ChatLink[];
  previews?: ChatPreview[];
  welcome?: boolean;
  streaming?: boolean;
};

const WELCOME =
  "Welcome to Open Limits Design. I pull live data from our CMS — catalog, materials, projects, services, and CEO meeting availability. Try a quick action below or ask anything.";

const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  { label: "View Furniture Catalog", prompt: "catalog" },
  { label: "Browse Materials", prompt: "materials" },
  { label: "Book a Meeting", prompt: "booking" },
  { label: "View Projects", prompt: "projects" },
  { label: "Ask About Services", prompt: "services" }
];

function sessionId() {
  if (typeof window === "undefined") return "server";
  const key = "old-ai-session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

function toApiMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => !message.welcome && message.content.trim())
    .map(({ role, content }) => ({ role, content }));
}

function MessageBody({ content }: { content: string }) {
  const parts = content.split(/(\/[a-z0-9-]+)/gi);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("/") ? (
          <Link href={part} key={`${part}-${index}`}>
            {part}
          </Link>
        ) : (
          <span key={`${index}-text`}>{part}</span>
        )
      )}
    </>
  );
}

function PreviewCards({ previews }: { previews: ChatPreview[] }) {
  if (!previews.length) return null;

  return (
    <div className="ai-previews">
      {previews.map((preview) => (
        <article className="ai-preview-card" key={`${preview.href}-${preview.title}`}>
          {preview.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={preview.title} className="ai-preview-image" loading="lazy" src={preview.imageUrl} />
          ) : (
            <div aria-hidden className="ai-preview-placeholder" />
          )}
          <div className="ai-preview-body">
            <strong>{preview.title}</strong>
            {preview.subtitle ? <span className="ai-preview-subtitle">{preview.subtitle}</span> : null}
            {preview.meta ? <span className="ai-preview-meta">{preview.meta}</span> : null}
            <Link className="ai-preview-action" href={preview.href}>
              {preview.actionLabel ?? "View"}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <p aria-live="polite" className="ai-typing">
      <span className="ai-typing-label">Assistant is typing</span>
      <span aria-hidden className="ai-typing-dots">
        <span />
        <span />
        <span />
      </span>
    </p>
  );
}

async function consumeChatStream(
  response: Response,
  assistantId: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: { reply: string; links?: ChatLink[]; previews?: ChatPreview[] } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6)) as {
        type: string;
        content?: string;
        reply?: string;
        links?: ChatLink[];
        previews?: ChatPreview[];
      };

      if (payload.type === "meta" && payload.previews) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, previews: payload.previews, links: payload.links, streaming: true }
              : message
          )
        );
      }

      if (payload.type === "token" && payload.content !== undefined) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: payload.content ?? "", streaming: true }
              : message
          )
        );
      }

      if (payload.type === "done") {
        finalPayload = {
          reply: payload.reply ?? "",
          links: payload.links,
          previews: payload.previews
        };
      }
    }
  }

  if (finalPayload) {
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              content: finalPayload.reply,
              links: finalPayload.links,
              previews: finalPayload.previews,
              streaming: false
            }
          : message
      )
    );
  }
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next && !welcomed) {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: WELCOME,
            welcome: true
          }
        ]);
        setWelcomed(true);
      }
      return next;
    });
  }

  const sendText = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy || sendingRef.current) return;

      sendingRef.current = true;
      setBusy(true);

      let historyForApi: ChatMessage[] = [];
      setMessages((current) => {
        historyForApi = [...current, { id: crypto.randomUUID(), role: "user", content: trimmed }];
        return historyForApi;
      });

      const assistantId = crypto.randomUUID();
      setMessages((current) => [
        ...current,
        { id: assistantId, role: "assistant", content: "", streaming: true }
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: toApiMessages(historyForApi),
            sessionId: sessionId(),
            stream: true
          })
        });

        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("text/event-stream") && response.ok) {
          await consumeChatStream(response, assistantId, setMessages);
        } else {
          const data = await response.json();
          const reply = data.reply ?? data.error ?? "Sorry, something went wrong. Please try again.";
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: reply,
                    links: Array.isArray(data.links) ? data.links : undefined,
                    previews: Array.isArray(data.previews) ? data.previews : undefined,
                    streaming: false
                  }
                : message
            )
          );
        }
      } catch {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: "I could not reach the assistant service. Please try again or use the quick actions below.",
                  streaming: false
                }
              : message
          )
        );
      } finally {
        setBusy(false);
        sendingRef.current = false;
      }
    },
    [busy]
  );

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    setInput("");
    void sendText(question);
  }

  function handleQuickAction(action: (typeof QUICK_ACTIONS)[number]) {
    void sendText(action.prompt);
  }

  return (
    <div className="ai-widget">
      {open ? (
        <div aria-label="AI assistant" className="ai-panel" role="dialog">
          <div className="ai-header">
            <strong>Open Limits Assistant</strong>
            <button aria-label="Close assistant" onClick={() => setOpen(false)} type="button">
              ×
            </button>
          </div>
          <div className="ai-messages" ref={listRef}>
            {messages.map((message) => {
              const showTyping = message.role === "assistant" && message.streaming && !message.content;
              if (showTyping) {
                return (
                  <div className="ai-message-wrap assistant" key={message.id}>
                    <TypingIndicator />
                  </div>
                );
              }

              if (!message.content && message.role === "assistant") return null;

              return (
                <div className={`ai-message-wrap ${message.role}`} key={message.id}>
                  <p className={`ai-message ${message.role}`}>
                    <MessageBody content={message.content} />
                  </p>
                  {message.previews?.length ? <PreviewCards previews={message.previews} /> : null}
                  {message.links?.length ? (
                    <div className="ai-message-links">
                      {message.links.map((link) => (
                        <Link className="ai-link-chip" href={link.href} key={`${link.href}-${link.label}`}>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="ai-quick-actions">
            {QUICK_ACTIONS.map((action) => (
              <button
                className="ai-quick-action"
                disabled={busy}
                key={action.label}
                onClick={() => handleQuickAction(action)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
          <form className="ai-input" onSubmit={send}>
            <input
              aria-label="Ask the assistant"
              disabled={busy}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Try catalog, materials, booking…"
              value={input}
            />
            <button disabled={busy} type="submit">
              Send
            </button>
          </form>
        </div>
      ) : null}
      <button
        aria-label="Open AI assistant"
        className="ai-toggle"
        onClick={toggleOpen}
        type="button"
      >
        {open ? "×" : "AI"}
      </button>
    </div>
  );
}
