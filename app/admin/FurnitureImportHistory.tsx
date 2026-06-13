"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminLogin from "@/app/admin/AdminLogin";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type ImportBatch = {
  id: string;
  source_type: string;
  file_name: string;
  item_count: number;
  image_count: number;
  status: string;
  log: string[];
  created_at: string;
  rolled_back_at: string | null;
};

export default function FurnitureImportHistory() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setSessionChecked(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
  }, [supabase]);

  async function getToken() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadHistory() {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) {
        setError("Sign in required.");
        return;
      }

      const response = await fetch("/api/admin/furniture/import-history", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not load history.");
        return;
      }
      setBatches(data.batches ?? []);
    } catch {
      setError("Failed to load import history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) void loadHistory();
  }, [session]);

  async function rollbackBatch(batchId?: string) {
    const targetId = batchId ?? batches.find((b) => b.status !== "rolled_back")?.id;
    if (!targetId) {
      setError("No import available to roll back.");
      return;
    }

    if (!window.confirm("Roll back this import? Created items will be deleted and updated items restored.")) {
      return;
    }

    setRollingBack(targetId);
    setError("");
    setMessage("");

    try {
      const token = await getToken();
      if (!token) {
        setError("Sign in required.");
        return;
      }

      const response = await fetch("/api/admin/furniture/import-rollback", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ batchId: targetId })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Rollback failed.");
        return;
      }

      setMessage(
        `Rollback complete: ${data.deletedItems} item(s) deleted, ${data.restoredItems} item(s) restored, ${data.deletedMedia} media file(s) removed.`
      );
      await loadHistory();
    } catch {
      setError("Rollback request failed.");
    } finally {
      setRollingBack(null);
    }
  }

  if (!sessionChecked) {
    return <div className="admin-page">Loading…</div>;
  }

  if (!supabase) {
    return (
      <div className="admin-page">
        <p className="status error">Supabase is not configured.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <AdminLogin
        onSignedIn={() => {
          void supabase?.auth.getSession().then(({ data }) => setSession(data.session));
        }}
      />
    );
  }

  const latestActive = batches.find((b) => b.status !== "rolled_back");

  return (
    <div className="admin-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin · Furniture</p>
          <h1>Import History</h1>
          <p>Past catalog imports with item counts, image counts, and success/failure logs. Roll back the last import if needed.</p>
        </div>
        <div className="button-row">
          <Link className="button ghost" href="/admin/furniture/import">
            ← Import Catalog
          </Link>
          <Link className="button ghost" href="/admin/furniture">
            Furniture Admin
          </Link>
        </div>
      </div>

      <div className="form-card">
        {error ? <p className="status error">{error}</p> : null}
        {message ? <p className="status success">{message}</p> : null}

        <div className="button-row">
          <button className="button ghost" disabled={loading} onClick={() => void loadHistory()} type="button">
            {loading ? "Loading…" : "Refresh"}
          </button>
          {latestActive ? (
            <button
              className="button"
              disabled={Boolean(rollingBack)}
              onClick={() => void rollbackBatch()}
              type="button"
            >
              {rollingBack ? "Rolling back…" : "Rollback last import"}
            </button>
          ) : null}
        </div>

        {!batches.length && !loading ? (
          <p className="meta">No imports recorded yet. Complete a confirmed import from the Import Catalog page.</p>
        ) : null}

        <div className="import-history-list">
          {batches.map((batch) => (
            <article className="import-history-card" key={batch.id}>
              <header>
                <div>
                  <h3>{batch.file_name}</h3>
                  <p className="meta">
                    {new Date(batch.created_at).toLocaleString()} · {batch.source_type.toUpperCase()} ·{" "}
                    <span className={`import-status import-status-${batch.status}`}>{batch.status}</span>
                  </p>
                </div>
                <ul className="excel-analysis-stats">
                  <li>
                    <strong>{batch.item_count}</strong> items
                  </li>
                  <li>
                    <strong>{batch.image_count}</strong> images
                  </li>
                </ul>
              </header>

              {Array.isArray(batch.log) && batch.log.length ? (
                <ul className="excel-example-list import-log">
                  {batch.log.map((line, index) => (
                    <li key={`${batch.id}-${index}`}>{line}</li>
                  ))}
                </ul>
              ) : null}

              {batch.rolled_back_at ? (
                <p className="meta">Rolled back: {new Date(batch.rolled_back_at).toLocaleString()}</p>
              ) : batch.status !== "rolled_back" ? (
                <button
                  className="button ghost"
                  disabled={rollingBack === batch.id}
                  onClick={() => void rollbackBatch(batch.id)}
                  type="button"
                >
                  {rollingBack === batch.id ? "Rolling back…" : "Rollback this import"}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
