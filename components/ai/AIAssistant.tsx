"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME =
  "Welcome to Open Limits Design. Ask me about our services, furniture, materials, pricing process, or book a meeting with our CEO.";

function sessionId() {
  if (typeof window === "undefined") return "server";
  const key = "old-ai-session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next && !welcomed) {
        setMessages([{ role: "assistant", content: WELCOME }]);
        setWelcomed(true);
      }
      return next;
    });
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    const history = messages.filter((message) => message.content !== WELCOME || message.role === "user");
    const nextMessages: ChatMessage[] = [...history, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    console.log("[AI] user message:", question);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, sessionId: sessionId() })
      });

      console.log("[AI] API status:", response.status);
      const data = await response.json();
      console.log("[AI] API response:", data);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "Sorry, something went wrong. Please try again."
        }
      ]);
    } catch (error) {
      console.error("[AI] API error:", error);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "I could not reach the assistant service. Please try again." }
      ]);
    } finally {
      setBusy(false);
    }
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
            {messages.map((message, index) => (
              <p className={`ai-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </p>
            ))}
            {busy ? <p className="ai-message assistant">Thinking…</p> : null}
          </div>
          <form className="ai-input" onSubmit={send}>
            <input
              aria-label="Ask the assistant"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about services, furniture, booking…"
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
