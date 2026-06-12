"use client";

import { FormEvent, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AdminLogin({ onSignedIn }: { onSignedIn?: () => void }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!supabase) {
    return (
      <div className="empty-state">
        Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
        <code> .env.local</code>, then restart the dev server.
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");

    if (mode === "password") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (signInError) {
        setError(
          signInError.message === "Failed to fetch"
            ? "Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your internet connection."
            : signInError.message
        );
        return;
      }
      onSignedIn?.();
      if (typeof window !== "undefined" && window.location.pathname.endsWith("/admin/login")) {
        window.location.href = "/admin";
      }
    } else {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/admin` }
      });
      setBusy(false);
      if (otpError) {
        setError(otpError.message);
        return;
      }
      setMessage("Check your email for the admin login link.");
    }
  }

  return (
    <section className="form-card">
      <p className="eyebrow">Admin CMS</p>
      <h1>Sign in to manage content.</h1>
      <p>Use your Supabase Auth account (for example noodleskywalker@gmail.com).</p>
      <form onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        {mode === "password" ? (
          <label className="field">
            <span>Password</span>
            <input
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
        ) : null}
        <div className="button-row">
          <button className="button" disabled={busy} type="submit">
            {mode === "password" ? "Sign in" : "Send magic link"}
          </button>
          <button
            className="button ghost"
            onClick={() => setMode(mode === "password" ? "magic" : "password")}
            type="button"
          >
            {mode === "password" ? "Use magic link instead" : "Use password instead"}
          </button>
        </div>
      </form>
      {message ? <p className="status success">{message}</p> : null}
      {error ? <p className="status error">{error}</p> : null}
    </section>
  );
}
