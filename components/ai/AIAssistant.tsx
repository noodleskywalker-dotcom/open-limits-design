"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to Open Limits Design. Ask me about our services, furniture, materials, or book a meeting with our CEO."
    }
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });
      const data = await response.json();
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "Sorry, something went wrong. Please try again."
        }
      ]);
    } catch {
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
        <div className="ai-panel" role="dialog" aria-label="AI assistant">
          <div className="ai-header">
            <strong>Open Limits Assistant</strong>
            <button aria-label="Close assistant" onClick={() => setOpen(false)} type="button">
              ×
            </button>
          </div>
          <div className="ai-messages" ref={listRef}>
            {messages.map((message, index) => (
              <p className={`ai-message ${message.role}`} key={index}>
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
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? "×" : "AI"}
      </button>
    </div>
  );
}
