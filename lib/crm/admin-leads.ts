import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ADMIN_STATUS, authorizeAdmin } from "@/lib/auth/admin";

/** Columns shown to admins. CRM bookkeeping included; nothing else. */
export const ADMIN_LEAD_COLUMNS = [
  "id", "created_at", "source", "name", "email", "phone", "project_type", "message", "locale",
  "consent_at", "consent_version", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "tracking_ref",
  "crm_stage", "crm_status", "crm_attempts", "crm_last_error_code", "crm_synced_at", "ghl_contact_id", "ghl_opportunity_id", "redacted_at"
] as const;

export function pickLead(row: Record<string, unknown>) {
  return Object.fromEntries(ADMIN_LEAD_COLUMNS.map((key) => [key, row[key] ?? null]));
}

/** Resolves the admin or returns the error response to send. */
export async function adminContext(request: Request): Promise<{ supabase: SupabaseClient; userId: string } | Response> {
  const supabase = getSupabaseAdminClient();
  const auth = await authorizeAdmin(supabase, request.headers.get("authorization"));
  if (auth.state !== "ADMIN" || !supabase) {
    const { status, error } = ADMIN_STATUS[auth.state === "ADMIN" ? "UNAVAILABLE" : auth.state];
    return NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });
  }
  return { supabase, userId: auth.userId };
}

/** CSV with formula-injection protection (cells starting with = + - @ are prefixed). */
export function toCsv(rows: Record<string, unknown>[]) {
  const cell = (value: unknown) => {
    let text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [ADMIN_LEAD_COLUMNS.join(","), ...rows.map((row) => ADMIN_LEAD_COLUMNS.map((key) => cell(row[key])).join(","))].join("\r\n");
}
