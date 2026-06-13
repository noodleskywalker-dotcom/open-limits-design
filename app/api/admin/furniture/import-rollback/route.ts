import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  let body: { batchId?: string; rollbackLast?: boolean };
  try {
    body = (await request.json()) as { batchId?: string; rollbackLast?: boolean };
  } catch {
    body = {};
  }

  try {
    const { rollbackFurnitureImportBatch } = await import("@/lib/furniture/pdf-import.mjs");

    let batchId = body.batchId;
    if (!batchId && body.rollbackLast !== false) {
      const { data: latest } = await supabase
        .from("furniture_import_batches")
        .select("id, status")
        .neq("status", "rolled_back")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) {
        return NextResponse.json({ error: "No import batch available to roll back." }, { status: 404 });
      }
      batchId = latest.id;
    }

    if (!batchId) {
      return NextResponse.json({ error: "Missing batchId." }, { status: 400 });
    }

    const result = await rollbackFurnitureImportBatch(batchId, supabase);
    revalidatePath("/furniture");
    revalidatePath("/furniture", "page");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rollback failed." },
      { status: 500 }
    );
  }
}
