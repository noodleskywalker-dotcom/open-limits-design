import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BOOKING_SLOTS } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

type SlotState = "available" | "taken" | "blocked";

function timeToSlot(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

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
      { error: bookingsResult.error?.message ?? blockedResult.error?.message },
      { status: 500 }
    );
  }

  const days: Record<string, Record<string, SlotState>> = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const slots: Record<string, SlotState> = {};

    for (const slot of BOOKING_SLOTS) {
      slots[slot] = "available";
    }

    for (const block of blockedResult.data ?? []) {
      const matchesDate =
        block.repeat_type === "daily" ||
        (block.repeat_type === "weekly" &&
          block.date &&
          new Date(`${block.date}T00:00:00Z`).getUTCDay() === weekday) ||
        block.date === date;

      if (!matchesDate) continue;

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
    return NextResponse.json(
      { error: "Supabase service role key is not configured." },
      { status: 503 }
    );
  }

  let payload: Record<string, string>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientName = payload.client_name?.trim();
  const clientEmail = payload.client_email?.trim();
  const clientPhone = payload.client_phone?.trim() || null;
  const notes = payload.notes?.trim() || null;
  const bookingDate = payload.booking_date;
  const startTime = payload.start_time;

  if (!clientName || !clientEmail || !bookingDate || !startTime) {
    return NextResponse.json(
      { error: "Name, email, date, and time slot are required." },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !(BOOKING_SLOTS as readonly string[]).includes(startTime)) {
    return NextResponse.json({ error: "Invalid date or time slot." }, { status: 400 });
  }

  if (bookingDate < new Date().toISOString().slice(0, 10)) {
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
    return NextResponse.json({ error: conflictError.message }, { status: 500 });
  }
  if (conflicts?.length) {
    return NextResponse.json(
      { error: "That time slot was just taken. Please pick another slot." },
      { status: 409 }
    );
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
    const friendly = error.message.includes("bookings_active_slot_idx")
      ? "That time slot was just taken. Please pick another slot."
      : error.message;
    return NextResponse.json({ error: friendly }, { status: 409 });
  }

  return NextResponse.json({ ok: true, booking: data });
}
