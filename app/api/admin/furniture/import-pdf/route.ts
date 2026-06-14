import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ConfirmImportBody = {
  fileName?: string;
  sourceType?: string;
  confirmed?: boolean;
  items?: unknown[];
  images?: unknown[];
};

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

  let body: ConfirmImportBody;
  try {
    body = (await request.json()) as ConfirmImportBody;
  } catch {
    return NextResponse.json({ error: "Expected JSON body with confirmed import payload." }, { status: 400 });
  }

  if (!body.confirmed) {
    return NextResponse.json(
      {
        error:
          "Import blocked — admin confirmation required. Review the preview, edit items, then set confirmed: true."
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "No items in import payload." }, { status: 400 });
  }

  try {
    const { importConfirmedFurnitureCatalog } = await import("@/lib/furniture/pdf-import.mjs");
    const result = await importConfirmedFurnitureCatalog(body, supabase, {
      userId: userData.user.id
    });
    revalidatePath("/furniture");
    revalidatePath("/furniture", "page");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed." },
      { status: 500 }
    );
  }
}
