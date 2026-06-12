import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { bookingConfirmedMessage, bookingRejectedMessage, sendSms } from "@/lib/sms/send";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings/manage
 * Admin-only: accept or reject a booking. Requires a Supabase access token.
 * On accept, sends a confirmation SMS (safe fallback when Twilio is missing).
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role key is not configured." },
      { status: 503 }
    );
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  let payload: { id?: string; action?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, action } = payload;
  if (!id || !action || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "id and action (accept|reject) required." }, { status: 400 });
  }

  const status = action === "accept" ? "confirmed" : "rejected";

  const { data: booking, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sms =
    status === "confirmed"
      ? await sendSms(
          booking.client_phone,
          bookingConfirmedMessage(booking.booking_date, booking.start_time.slice(0, 5))
        )
      : await sendSms(booking.client_phone, bookingRejectedMessage());

  return NextResponse.json({ ok: true, booking, sms });
}
