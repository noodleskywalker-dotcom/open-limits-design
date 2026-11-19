import { after, NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ENQUIRY_FALLBACK_MESSAGE,
  EnquiryValidationError,
  FIELD_MESSAGES,
  leadRow,
  parseEnquiry,
  saveLead
} from "@/lib/crm/enquiry";
import { runCrmHandoff } from "@/lib/crm/handoff";

export const dynamic = "force-dynamic";

/**
 * POST /api/contact
 * Success is reported ONLY after the enquiry is durably saved in Supabase.
 * CRM handoff to GoHighLevel happens afterwards (after() + cron), so a CRM
 * outage can delay but never lose an enquiry. Logs contain codes only.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let input;
  try {
    input = parseEnquiry(body, { requirePhone: true, requireMessage: true, requireProjectType: true });
  } catch (error) {
    if (error instanceof EnquiryValidationError) {
      return NextResponse.json({ error: FIELD_MESSAGES[error.field] ?? "Please check the form.", field: error.field }, { status: 400 });
    }
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const outcome = await saveLead(
    supabase ? { insert: (row) => supabase.from("leads").insert(row) } : null,
    leadRow(input, "contact_form", "NEW_ENQUIRY", new Date())
  );

  if (outcome.state === "FAILED") {
    console.error("[contact] lead not saved:", outcome.code);
    return NextResponse.json({ error: ENQUIRY_FALLBACK_MESSAGE }, { status: 503 });
  }

  after(async () => {
    await runCrmHandoff(3);
  });
  return NextResponse.json({ ok: true });
}
