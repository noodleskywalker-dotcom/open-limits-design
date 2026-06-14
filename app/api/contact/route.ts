import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    phone?: string;
    email?: string;
    projectType?: string;
    message?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  const email = body.email?.trim();
  const projectType = body.projectType?.trim();
  const message = body.message?.trim();

  if (!name || !phone || !email || !projectType || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase.from("leads").insert({
      name,
      phone,
      email,
      project_type: projectType,
      message,
      source: "contact_form"
    });

    if (error) {
      console.error("[contact] lead insert failed:", error.message);
      return NextResponse.json(
        { error: "Unable to save your message right now. Please call or email us directly." },
        { status: 500 }
      );
    }
  } else {
    console.log("[contact] Supabase not configured — lead logged:", { name, email, projectType });
  }

  return NextResponse.json({ ok: true });
}
