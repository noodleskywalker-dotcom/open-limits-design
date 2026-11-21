import { after, NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { blockMatchesDate, slotStatesForDate, timeToSlot } from "@/lib/booking-utils";
import { BOOKING_SLOTS } from "@/lib/cms/types";
import { EnquiryValidationError, leadRow, parseEnquiry, saveLead } from "@/lib/crm/enquiry";
import { runCrmHandoff } from "@/lib/crm/handoff";

const BOOKING_UNAVAILABLE = "Booking is temporarily unavailable. Please call +974 7788 9033 or email info@openlimitsdesign.com.";

/** Today's date in Qatar (UTC+3, no daylight saving) — bookings are local to Lusail. */
function qatarToday(now = new Date()) {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const dynamic = "force-dynamic";

type SlotState = "available" | "taken" | "blocked";

/**
 * GET /api/bookings?month=YYYY-MM
 * Returns per-day slot availability for the booking calendar.
 * Pending + confirmed bookings and admin blocked times are unavailable.
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role key is not configured." },
      { status: 503 }
    );
  }

  const month = request.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month=YYYY-MM is required" }, { status: 400 });
  }

  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const [bookingsResult, blockedResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("booking_date, start_time, status")
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .in("status", ["pending", "confirmed"]),
    supabase.from("blocked_times").select("*")
  ]);

  if (bookingsResult.error || blockedResult.error) {
    return NextResponse.json(
      { error: BOOKING_UNAVAILABLE },
      { status: 503 }
    );
  }

  const days: Record<string, Record<string, SlotState>> = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const slots: Record<string, SlotState> = {};

    for (const slot of BOOKING_SLOTS) {
      slots[slot] = "available";
    }

    for (const block of blockedResult.data ?? []) {
      if (!blockMatchesDate(block, date)) continue;

      const blockStart = timeToSlot(block.start_time);
      const blockEnd = timeToSlot(block.end_time);

      for (const slot of BOOKING_SLOTS) {
        if (!blockStart && !blockEnd) {
          slots[slot] = "blocked";
        } else if (blockStart && blockEnd && slot >= blockStart && slot < blockEnd) {
          slots[slot] = "blocked";
        }
      }
    }

    days[date] = slots;
  }

  for (const booking of bookingsResult.data ?? []) {
    const slot = timeToSlot(booking.start_time);
    if (slot && days[booking.booking_date] && days[booking.booking_date][slot] === "available") {
      days[booking.booking_date][slot] = "taken";
    }
  }

  return NextResponse.json({ month, slots: [...BOOKING_SLOTS], days });
}

/**
 * POST /api/bookings
 * Creates a pending booking request after re-validating availability.
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[bookings] database not configured");
    return NextResponse.json({ error: BOOKING_UNAVAILABLE }, { status: 503 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const clientName = str(payload.client_name);
  const clientEmail = str(payload.client_email);
  const clientPhone = str(payload.client_phone) || null;
  const notes = str(payload.notes) || null;
  const bookingDate = str(payload.booking_date);
  const startTime = str(payload.start_time);

  if (!clientName || !clientEmail || !bookingDate || !startTime) {
    return NextResponse.json(
      { error: "Name, email, date, and time slot are required." },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !(BOOKING_SLOTS as readonly string[]).includes(startTime)) {
    return NextResponse.json({ error: "Invalid date or time slot." }, { status: 400 });
  }

  if (bookingDate < qatarToday()) {
    return NextResponse.json({ error: "Cannot book a past date." }, { status: 400 });
  }

  // Re-check conflicts server-side (double-booking prevention).
  const { data: conflicts, error: conflictError } = await supabase
    .from("bookings")
    .select("id")
    .eq("booking_date", bookingDate)
    .eq("start_time", `${startTime}:00`)
    .in("status", ["pending", "confirmed"]);

  if (conflictError) {
    console.error("[bookings] conflict check failed:", conflictError.code ?? "DB_ERROR");
    return NextResponse.json({ error: BOOKING_UNAVAILABLE }, { status: 503 });
  }
  if (conflicts?.length) {
    return NextResponse.json(
      { error: "That time slot was just taken. Please pick another slot." },
      { status: 409 }
    );
  }

  const { data: blockedRows, error: blockedError } = await supabase.from("blocked_times").select("*");
  if (blockedError) {
    console.error("[bookings] blocked times failed:", blockedError.code ?? "DB_ERROR");
    return NextResponse.json({ error: BOOKING_UNAVAILABLE }, { status: 503 });
  }

  const daySlots = slotStatesForDate(bookingDate, blockedRows ?? [], []);
  if (daySlots[startTime] === "blocked") {
    return NextResponse.json({ error: "That time slot is blocked." }, { status: 409 });
  }

  const endHour = String(Number(startTime.slice(0, 2)) + 1).padStart(2, "0");

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      notes,
      booking_date: bookingDate,
      start_time: `${startTime}:00`,
      end_time: `${endHour}:00:00`,
      status: "pending"
    })
    .select("id, status")
    .single();

  if (error) {
    if (error.code === "23505" || error.message.includes("bookings_active_slot_idx")) {
      return NextResponse.json({ error: "That time slot was just taken. Please pick another slot." }, { status: 409 });
    }
    console.error("[bookings] insert failed:", error.code ?? "DB_ERROR");
    return NextResponse.json({ error: BOOKING_UNAVAILABLE }, { status: 503 });
  }

  // The booking row is the durable record. With consent, also queue it for the CRM
  // (Consultation Booked). A queue failure never fails the booking itself.
  if (payload.consent === true) {
    try {
      const input = parseEnquiry(
        { ...payload, name: clientName, email: clientEmail, phone: clientPhone, message: notes, projectType: null },
        { requirePhone: false, requireMessage: false, requireProjectType: false }
      );
      const supabaseClient = supabase;
      const outcome = await saveLead(
        { insert: (row) => supabaseClient.from("leads").insert(row) },
        leadRow(input, "booking", "CONSULTATION_BOOKED", new Date(), { booking_id: data.id })
      );
      if (outcome.state === "FAILED") console.error("[bookings] CRM queue failed:", outcome.code);
      else after(async () => {
        await runCrmHandoff(3);
      });
    } catch (queueError) {
      const code = queueError instanceof EnquiryValidationError ? queueError.message : "QUEUE_FAILED";
      console.error("[bookings] CRM queue skipped:", code);
    }
  }

  return NextResponse.json({ ok: true, booking: data });
}
