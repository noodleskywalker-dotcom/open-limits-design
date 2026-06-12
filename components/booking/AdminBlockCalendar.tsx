"use client";

import { useMemo, useState } from "react";
import type { BlockedTime, Booking } from "@/lib/cms/types";
import { BOOKING_SLOTS } from "@/lib/cms/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type BlockDraft = {
  title: string;
  date: string;
  wholeDay: boolean;
  startTime: string;
  endTime: string;
  repeatType: "none" | "daily" | "weekly";
};

type Props = {
  bookings: Booking[];
  blocked: BlockedTime[];
  onSave: (draft: BlockDraft) => Promise<void>;
  onRemoveBlock: (id: string) => Promise<void>;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function AdminBlockCalendar({ bookings, blocked, onSave, onRemoveBlock }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<BlockDraft>({
    title: "",
    date: "",
    wholeDay: false,
    startTime: "09:00",
    endTime: "12:00",
    repeatType: "none"
  });
  const [slotSelection, setSlotSelection] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const month = monthKey(viewDate);
  const today = new Date().toISOString().slice(0, 10);

  const calendarCells = useMemo(() => {
    const first = viewDate.getDay();
    const days = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: first }, () => null);
    for (let d = 1; d <= days; d += 1) {
      cells.push(`${month}-${String(d).padStart(2, "0")}`);
    }
    return cells;
  }, [viewDate, month]);

  function dayMeta(date: string) {
    const dayBookings = bookings.filter(
      (b) => b.booking_date === date && (b.status === "pending" || b.status === "confirmed")
    );
    const dayBlocks = blocked.filter(
      (b) =>
        b.repeat_type === "daily" ||
        b.date === date ||
        (b.repeat_type === "weekly" &&
          b.date &&
          new Date(`${b.date}T00:00:00Z`).getUTCDay() === new Date(`${date}T00:00:00Z`).getUTCDay())
    );
    return { dayBookings, dayBlocks, blocked: dayBlocks.length > 0, booked: dayBookings.length > 0 };
  }

  function openBlockModal(date?: string) {
    setDraft({
      title: "",
      date: date ?? "",
      wholeDay: Boolean(date),
      startTime: "09:00",
      endTime: "12:00",
      repeatType: "none"
    });
    setSlotSelection([]);
    setError("");
    setModalOpen(true);
  }

  function toggleSlot(slot: string) {
    setDraft((d) => ({ ...d, wholeDay: false, date: d.date }));
    setSlotSelection((current) => {
      if (current.includes(slot)) return current.filter((s) => s !== slot);
      const next = [...current, slot].sort();
      if (next.length >= 2) {
        const startIdx = BOOKING_SLOTS.indexOf(next[0] as (typeof BOOKING_SLOTS)[number]);
        const endIdx = BOOKING_SLOTS.indexOf(next[next.length - 1] as (typeof BOOKING_SLOTS)[number]);
        if (startIdx >= 0 && endIdx >= 0) {
          setDraft((d) => ({
            ...d,
            startTime: BOOKING_SLOTS[startIdx],
            endTime: BOOKING_SLOTS[Math.min(endIdx + 1, BOOKING_SLOTS.length - 1)] ?? "17:00"
          }));
        }
      } else if (next.length === 1) {
        setDraft((d) => ({ ...d, startTime: next[0], endTime: next[0] === "16:00" ? "17:00" : BOOKING_SLOTS[BOOKING_SLOTS.indexOf(next[0] as (typeof BOOKING_SLOTS)[number]) + 1] ?? "17:00" }));
      }
      return next;
    });
  }

  async function saveBlock() {
    if (!draft.date && draft.repeatType !== "daily") {
      setError("Select a date.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(draft);
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save block");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-block-calendar">
      <div className="admin-block-toolbar">
        <div>
          <h3>Calendar</h3>
          <p>Bookings, blocked times, and availability at a glance.</p>
        </div>
        <button className="button" onClick={() => openBlockModal()} type="button">
          Block time
        </button>
      </div>

      <div className="booking-month-bar">
        <button
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
          type="button"
        >
          ←
        </button>
        <strong>{monthLabel(viewDate)}</strong>
        <button
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
          type="button"
        >
          →
        </button>
      </div>

      <div className="admin-calendar-legend">
        <span className="legend-booked">Booked</span>
        <span className="legend-blocked">Blocked</span>
        <span className="legend-open">Open</span>
      </div>

      <div className="booking-grid admin-calendar-grid">
        {WEEKDAYS.map((day) => (
          <span className="booking-grid-head" key={day}>
            {day}
          </span>
        ))}
        {calendarCells.map((date, index) => {
          if (!date) return <span className="booking-day empty" key={`e-${index}`} />;
          const meta = dayMeta(date);
          const className = [
            "booking-day",
            "admin-calendar-day",
            date === today ? "today" : "",
            meta.blocked ? "blocked-day" : "",
            meta.booked ? "booked-day" : "",
            draft.date === date ? "selected" : ""
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              className={className}
              key={date}
              onClick={() => openBlockModal(date)}
              title={`${date}${meta.dayBookings.length ? ` · ${meta.dayBookings.length} booking(s)` : ""}`}
              type="button"
            >
              <span>{Number(date.slice(-2))}</span>
              {meta.dayBookings.length ? <em className="day-dot booked" /> : null}
              {meta.dayBlocks.length ? <em className="day-dot blocked" /> : null}
            </button>
          );
        })}
      </div>

      <div className="row-list">
        {blocked.map((block) => (
          <div className="row-item" key={block.id}>
            <div>
              <strong>{block.title ?? "Blocked"}</strong>
              <p>
                {block.date ?? "Daily"}
                {block.start_time
                  ? ` · ${block.start_time.slice(0, 5)}–${block.end_time?.slice(0, 5) ?? ""}`
                  : " · whole day"}
                {block.repeat_type !== "none" ? ` · ${block.repeat_type}` : ""}
              </p>
            </div>
            <button className="button ghost" onClick={() => onRemoveBlock(block.id)} type="button">
              Remove
            </button>
          </div>
        ))}
      </div>

      {modalOpen ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div aria-modal="true" className="admin-modal" role="dialog">
            <div className="admin-modal-header">
              <h3>Block time</h3>
              <button aria-label="Close" onClick={() => setModalOpen(false)} type="button">
                ×
              </button>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Title</span>
                <input
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Holiday, site visit…"
                  value={draft.title}
                />
              </label>
              <label className="field">
                <span>Date</span>
                <input
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  required={draft.repeatType !== "daily"}
                  type="date"
                  value={draft.date}
                />
              </label>
              <label className="field">
                <span>Repeat</span>
                <select
                  onChange={(e) =>
                    setDraft({ ...draft, repeatType: e.target.value as BlockDraft["repeatType"] })
                  }
                  value={draft.repeatType}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly (same weekday)</option>
                </select>
              </label>
              <label className="field">
                <span>Block type</span>
                <select
                  onChange={(e) => setDraft({ ...draft, wholeDay: e.target.value === "true" })}
                  value={String(draft.wholeDay)}
                >
                  <option value="true">Full day</option>
                  <option value="false">Time range</option>
                </select>
              </label>
            </div>

            {!draft.wholeDay ? (
              <div className="booking-slot-grid admin-block-slots">
                {BOOKING_SLOTS.map((slot) => (
                  <button
                    className={`booking-slot ${slotSelection.includes(slot) ? "selected" : ""}`}
                    key={slot}
                    onClick={() => toggleSlot(slot)}
                    type="button"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            ) : null}

            {error ? <p className="status error">{error}</p> : null}

            <div className="button-row">
              <button className="button" disabled={busy} onClick={saveBlock} type="button">
                {busy ? "Saving…" : "Save blocked time"}
              </button>
              <button className="button ghost" onClick={() => setModalOpen(false)} type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
