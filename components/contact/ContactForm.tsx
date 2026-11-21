"use client";

import { FormEvent, useState } from "react";
import { newIdempotencyKey, readAttribution } from "@/lib/crm/attribution-client";
import Link from "next/link";
import { CONSENT_TEXT, PRIVACY_NOTICE_PATH } from "@/lib/crm/enquiry";

const PROJECT_TYPES = [
  "Architecture",
  "Interior Design",
  "Construction",
  "Furniture Supply",
  "Fit-Out",
  "Other"
];

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    projectType: "",
    message: ""
  });
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  // One key per submission attempt: a network retry of the same attempt is deduplicated server-side.
  const [attemptKey, setAttemptKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const key = attemptKey ?? newIdempotencyKey();
    setAttemptKey(key);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          consent,
          website,
          locale: document.documentElement.lang === "ar" ? "ar" : "en",
          idempotencyKey: key,
          attribution: readAttribution()
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Unable to send message");

      setResult({ ok: true, message: "Thank you — we will be in touch shortly." });
      setForm({ name: "", phone: "", email: "", projectType: "", message: "" });
      setConsent(false);
      setAttemptKey(null);
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "Unable to send message"
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="contact-form card" onSubmit={submit}>
      <div className="card-body">
        <h3>Send a message</h3>
        <div className="form-grid">
          <label>
            Name
            <input
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              value={form.name}
            />
          </label>
          <label>
            Phone
            <input
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
              type="tel"
              value={form.phone}
            />
          </label>
          <label>
            Email
            <input
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
              type="email"
              value={form.email}
            />
          </label>
          <label>
            Project type
            <select
              onChange={(event) =>
                setForm((current) => ({ ...current, projectType: event.target.value }))
              }
              required
              value={form.projectType}
            >
              <option value="">Select…</option>
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Message
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              required
              rows={5}
              value={form.message}
            />
          </label>
          <label className="checkbox-field full-width">
            <input
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
              }}
              required
              type="checkbox"
            />
            <span>
                  {CONSENT_TEXT.en}{" "}
                  <Link href={PRIVACY_NOTICE_PATH} target="_blank">
                    Privacy notice
                  </Link>
                </span>
          </label>
          <label aria-hidden="true" className="form-honeypot">
            Website
            <input
              autoComplete="off"
              onChange={(event) => setWebsite(event.target.value)}
              tabIndex={-1}
              value={website}
            />
          </label>
        </div>
        <button className="button" disabled={busy} type="submit">
          {busy ? "Sending…" : "Send message"}
        </button>
        {result ? (
          <p className={result.ok ? "form-success" : "form-error"} role="status">
            {result.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
