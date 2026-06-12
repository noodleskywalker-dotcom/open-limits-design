import type { BlockedTime, Booking } from "@/lib/cms/types";
import { BOOKING_SLOTS } from "@/lib/cms/types";

export type BlockRepeatType = BlockedTime["repeat_type"] | "monthly";

export function timeToSlot(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

/** Whether a blocked_times row applies to a calendar date. */
export function blockMatchesDate(block: BlockedTime, date: string): boolean {
  if (block.repeat_type === "daily") return true;
  if (block.date === date) return true;

  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

  if (block.repeat_type === "weekly" && block.date) {
    return new Date(`${block.date}T00:00:00Z`).getUTCDay() === weekday;
  }

  if (block.repeat_type === "monthly" && block.date) {
    return Number(date.slice(-2)) === Number(block.date.slice(-2));
  }

  return false;
}

export function blocksForDate(blocked: BlockedTime[], date: string): BlockedTime[] {
  return blocked.filter((block) => blockMatchesDate(block, date));
}

export function bookingsForDate(bookings: Booking[], date: string): Booking[] {
  return bookings.filter(
    (booking) =>
      booking.booking_date === date && (booking.status === "pending" || booking.status === "confirmed")
  );
}

export function slotStatesForDate(
  date: string,
  blocked: BlockedTime[],
  bookings: Booking[]
): Record<string, "available" | "taken" | "blocked"> {
  const slots: Record<string, "available" | "taken" | "blocked"> = {};
  for (const slot of BOOKING_SLOTS) {
    slots[slot] = "available";
  }

  for (const block of blocksForDate(blocked, date)) {
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

  for (const booking of bookingsForDate(bookings, date)) {
    const slot = timeToSlot(booking.start_time);
    if (slot && slots[slot] === "available") {
      slots[slot] = "taken";
    }
  }

  return slots;
}

export function slotRangeFromSelection(slots: string[]): { startTime: string; endTime: string } | null {
  if (!slots.length) return null;
  const sorted = [...slots].sort();
  const startIdx = BOOKING_SLOTS.indexOf(sorted[0] as (typeof BOOKING_SLOTS)[number]);
  const endIdx = BOOKING_SLOTS.indexOf(sorted[sorted.length - 1] as (typeof BOOKING_SLOTS)[number]);
  if (startIdx < 0 || endIdx < 0) return null;

  const endSlot = BOOKING_SLOTS[Math.min(endIdx + 1, BOOKING_SLOTS.length - 1)] ?? "17:00";
  return { startTime: sorted[0], endTime: endSlot === sorted[0] ? "17:00" : endSlot };
}

export function slotsInRange(startTime: string, endTime: string): string[] {
  return BOOKING_SLOTS.filter((slot) => slot >= startTime && slot < endTime);
}
