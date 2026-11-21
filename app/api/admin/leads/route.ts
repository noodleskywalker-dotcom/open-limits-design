import { NextRequest, NextResponse } from "next/server";
import { adminContext, pickLead } from "@/lib/crm/admin-leads";

export const dynamic = "force-dynamic";

/** GET /api/admin/leads?limit=50&before=ISO — approved admins only; each returned lead is audited as VIEW. */
export async function GET(request: NextRequest) {
  const ctx = await adminContext(request);
  if (ctx instanceof Response) return ctx;
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 50, 1), 200);
  const beforeParam = request.nextUrl.searchParams.get("before");
  const before = beforeParam && !Number.isNaN(Date.parse(beforeParam)) ? new Date(beforeParam).toISOString() : null;
  const { data, error } = await ctx.supabase.rpc("admin_read_leads", { actor: ctx.userId, max_rows: limit, created_before: before });
  if (error) {
    console.error("[admin/leads] read failed:", error.code ?? "DB_ERROR");
    return NextResponse.json({ error: "Unable to load leads right now." }, { status: 503 });
  }
  return NextResponse.json({ leads: ((data ?? []) as Record<string, unknown>[]).map(pickLead) }, { headers: { "cache-control": "no-store" } });
}
