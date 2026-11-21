import { NextRequest, NextResponse } from "next/server";
import { adminContext, toCsv } from "@/lib/crm/admin-leads";

export const dynamic = "force-dynamic";

/** GET /api/admin/leads/export — CSV for approved admins; each exported lead is audited as EXPORT. */
export async function GET(request: NextRequest) {
  const ctx = await adminContext(request);
  if (ctx instanceof Response) return ctx;
  const { data, error } = await ctx.supabase.rpc("admin_export_leads", { actor: ctx.userId });
  if (error) {
    console.error("[admin/leads/export] export failed:", error.code ?? "DB_ERROR");
    return NextResponse.json({ error: "Unable to export leads right now." }, { status: 503 });
  }
  return new NextResponse(toCsv((data ?? []) as Record<string, unknown>[]), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="open-limits-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store"
    }
  });
}
