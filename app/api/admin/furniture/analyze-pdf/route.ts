import { NextRequest, NextResponse } from "next/server";
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only .pdf files are supported." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { analyzeFurniturePdf } = await import("@/lib/furniture/pdf-analyze.mjs");
    const { buildImportPreview } = await import("@/lib/furniture/import-qc.mjs");

    const report = await analyzeFurniturePdf(buffer, { includeImageBuffers: true });

    const { data: existingItems } = await supabase
      .from("furniture_items")
      .select("id, slug, title");

    const preview = buildImportPreview(report, existingItems ?? []);
    preview.fileName = file.name || preview.fileName;

    return NextResponse.json({
      ...preview,
      importMode: "preview-only",
      message: "Review and edit extracted data before confirming import. Nothing is imported automatically."
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed." },
      { status: 500 }
    );
  }
}
