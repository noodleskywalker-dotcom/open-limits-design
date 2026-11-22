import { NextRequest, NextResponse } from "next/server";
import { adminContext } from "@/lib/crm/admin-leads";
import { summarize, type DiagnosticsRow } from "@/lib/crm/diagnostics";

export const dynamic = "force-dynamic";

/** GET /api/admin/health — approved admins only. Pipeline counts and error codes; no personal data. */
export async function GET(request: NextRequest) {
  const ctx = await adminContext(request);
  if (ctx instanceof Response) return ctx;
  const { data, error } = await ctx.supabase
    .from("leads")
    .select("crm_status, crm_last_error_code, crm_next_attempt_at, created_at")
    .limit(5000);
  if (error) console.error("[admin/health] outbox read failed:", error.code ?? "DB_ERROR");
  return NextResponse.json(summarize(error ? null : ((data ?? []) as DiagnosticsRow[])), { headers: { "cache-control": "no-store" } });
}
