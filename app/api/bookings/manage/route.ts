import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ADMIN_STATUS, authorizeAdmin } from "@/lib/auth/admin";
import { bookingConfirmedMessage, bookingRejectedMessage, sendSms } from "@/lib/sms/send";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatBookingDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year.slice(2)}`;
}

/**
 * POST /api/bookings/manage
 * Approved admins only (admin_users + confirmed email; any other signed-in user gets 403).
 * The status change and its audit row are written atomically by
 * public.admin_set_booking_status(). Client SMS is sent only when
 * BOOKING_SMS_ENABLED=true (client messaging needs separate approval).
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const auth = await authorizeAdmin(supabase, request.headers.get("authorization"));
  if (auth.state !== "ADMIN" || !supabase) {
    const { status, error } = ADMIN_STATUS[auth.state === "ADMIN" ? "UNAVAILABLE" : auth.state];
    return NextResponse.json({ error }, { status });
  }

  let payload: { id?: unknown; action?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, action } = payload;
  if (typeof id !== "string" || !UUID.test(id) || (action !== "accept" && action !== "reject")) {
    return NextResponse.json({ error: "id and action (accept|reject) required." }, { status: 400 });
  }

  const status = action === "accept" ? "confirmed" : "rejected";
  const { data, error } = await supabase.rpc("admin_set_booking_status", { actor: auth.userId, booking: id, new_status: status });
  if (error) {
    console.error("[bookings/manage] status change failed:", error.code ?? "DB_ERROR");
    return NextResponse.json({ error: "Unable to update the booking right now." }, { status: 503 });
  }
  const booking = Array.isArray(data) ? data[0] : null;
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const sms =
    process.env.BOOKING_SMS_ENABLED !== "true"
      ? { sent: false, reason: "Client SMS disabled" }
      : status === "confirmed"
        ? await sendSms(booking.client_phone, bookingConfirmedMessage(formatBookingDate(booking.booking_date)))
        : await sendSms(booking.client_phone, bookingRejectedMessage());

  return NextResponse.json({ ok: true, booking, sms });
}
