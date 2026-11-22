/**
 * Internal production diagnostics for the enquiry → CRM pipeline. Counts, ages and fixed error
 * codes only: never names, emails, phones, messages or secrets. No external alerts are sent.
 */
import { PRIVACY_NOTICE_STATUS } from "./enquiry";
import { ghlHandoffConfig } from "./ghl";

export type DiagnosticsRow = { crm_status: string; crm_last_error_code: string | null; crm_next_attempt_at: string | null; created_at: string };
export type Diagnostics = {
  checkedAt: string;
  database: "OK" | "UNAVAILABLE";
  handoff: { flag: boolean; privacyStatus: string; tokenConfigured: boolean; active: boolean; smsEnabled: boolean };
  outbox: { pending: number; due: number; needsReview: number; synced: number; notQueued: number; oldestPendingMinutes: number | null; errorCodes: Record<string, number> } | null;
  warnings: string[];
};

export function handoffGate(env: Record<string, string | undefined> = process.env) {
  return {
    flag: env.GHL_HANDOFF_ENABLED === "true",
    privacyStatus: PRIVACY_NOTICE_STATUS,
    tokenConfigured: /^\S{20,4096}$/.test(env.GHL_PRIVATE_INTEGRATION_TOKEN ?? ""),
    active: ghlHandoffConfig(env) !== null,
    smsEnabled: env.BOOKING_SMS_ENABLED === "true"
  };
}

/** Pure summary so it can be tested without a database. */
export function summarize(rows: DiagnosticsRow[] | null, env: Record<string, string | undefined> = process.env, now = new Date()): Diagnostics {
  const handoff = handoffGate(env);
  const warnings: string[] = [];
  if (handoff.smsEnabled) warnings.push("BOOKING_SMS_ENABLED_IS_TRUE");
  if (handoff.flag && !handoff.active) warnings.push("HANDOFF_FLAG_ON_BUT_GATE_CLOSED");
  if (!rows) return { checkedAt: now.toISOString(), database: "UNAVAILABLE", handoff, outbox: null, warnings: [...warnings, "DATABASE_UNAVAILABLE"] };
  const count = (status: string) => rows.filter((r) => r.crm_status === status).length;
  const pendingRows = rows.filter((r) => r.crm_status === "PENDING");
  const oldest = pendingRows.reduce<number | null>((min, r) => {
    const t = Date.parse(r.created_at);
    return Number.isNaN(t) ? min : min === null ? t : Math.min(min, t);
  }, null);
  const errorCodes: Record<string, number> = {};
  for (const r of rows) if (r.crm_status !== "SYNCED" && r.crm_last_error_code && /^[A-Z][A-Z0-9_]{1,59}$/.test(r.crm_last_error_code)) errorCodes[r.crm_last_error_code] = (errorCodes[r.crm_last_error_code] ?? 0) + 1;
  const outbox = {
    pending: pendingRows.length,
    due: pendingRows.filter((r) => !r.crm_next_attempt_at || Date.parse(r.crm_next_attempt_at) <= now.getTime()).length,
    needsReview: count("NEEDS_REVIEW"),
    synced: count("SYNCED"),
    notQueued: count("NOT_QUEUED"),
    oldestPendingMinutes: oldest === null ? null : Math.floor((now.getTime() - oldest) / 60_000),
    errorCodes
  };
  if (outbox.needsReview) warnings.push("LEADS_NEED_MANUAL_REVIEW");
  if (handoff.active && outbox.oldestPendingMinutes !== null && outbox.oldestPendingMinutes > 26 * 60) warnings.push("OUTBOX_BACKLOG_OVER_26H");
  if (!handoff.active && outbox.pending) warnings.push("PENDING_LEADS_WAITING_FOR_HANDOFF_ENABLEMENT");
  return { checkedAt: now.toISOString(), database: "OK", handoff, outbox, warnings };
}
