import { NextRequest, NextResponse } from "next/server";
import { adminContext } from "@/lib/crm/admin-leads";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/admin/leads/requeue {id} — moves a NEEDS_REVIEW lead back to PENDING (audited STATUS_CHANGE). */
export async function POST(request: NextRequest) {
  const ctx = await adminContext(request);
  if (ctx instanceof Response) return ctx;
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  if (typeof body.id !== "string" || !UUID.test(body.id)) return NextResponse.json({ error: "id required." }, { status: 400 });
  const { data, error } = await ctx.supabase.rpc("admin_requeue_lead", { actor: ctx.userId, lead: body.id });
  if (error) {
    console.error("[admin/leads/requeue] failed:", error.code ?? "DB_ERROR");
    return NextResponse.json({ error: "Unable to update the lead right now." }, { status: 503 });
  }
  return data === true
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Lead is not awaiting manual review." }, { status: 409 });
}
