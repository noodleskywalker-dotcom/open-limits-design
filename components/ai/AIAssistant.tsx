"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type ChatLink = { label: string; href: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: ChatLink[];
  welcome?: boolean;
};

const WELCOME =
  "Welcome to Open Limits Design. I can pull live info from our catalog, materials, projects, services, and CEO meeting availability. Try a quick action below or ask anything.";

const QUICK_ACTIONS: { label: string; prompt: string; href: string }[] = [
  { label: "View Furniture Catalog", prompt: "catalog", href: "/furniture" },
  { label: "Browse Materials", prompt: "materials", href: "/materials" },
  { label: "Book a Meeting", prompt: "booking", href: "/book-meeting-with-ceo" },
  { label: "View Projects", prompt: "projects", href: "/projects" },
  { label: "Ask About Services", prompt: "services", href: "/services" }
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

async function typeAssistantReply(
  fullText: string,
  links: ChatLink[] | undefined,
  messageId: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
) {
  const step = fullText.length > 280 ? 3 : 1;
  for (let i = 0; i <= fullText.length; i += step) {
    const slice = fullText.slice(0, Math.min(i, fullText.length));
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, content: slice, links: slice.length === fullText.length ? links : undefined } : message
      )
    );
    if (i < fullText.length) {
      await new Promise((resolve) => window.setTimeout(resolve, 10));
    }
  }
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

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: toApiMessages(historyForApi),
            sessionId: sessionId()
          })
        });

        const data = await response.json();
        const reply = data.reply ?? data.error ?? "Sorry, something went wrong. Please try again.";
        const links = Array.isArray(data.links) ? (data.links as ChatLink[]) : undefined;

        const assistantId = crypto.randomUUID();
        setMessages((current) => [...current, { id: assistantId, role: "assistant", content: "" }]);
        await typeAssistantReply(reply, links, assistantId, setMessages);
      } catch {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "I could not reach the assistant service. Please try again or use the quick actions below."
          }
        ]);
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
              if (!message.content && message.role === "assistant") return null;
              return (
              <div className={`ai-message-wrap ${message.role}`} key={message.id}>
                <p className={`ai-message ${message.role}`}>
                  <MessageBody content={message.content} />
                </p>
                {message.links?.length ? (
                  <div className="ai-message-links">
                    {message.links.map((link) => (
                      <Link className="ai-link-chip" href={link.href} key={link.href}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              );
            })}
            {busy ? <p className="ai-typing">Assistant is typing…</p> : null}
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
