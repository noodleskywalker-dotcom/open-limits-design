"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { BlockedTime, Booking } from "@/lib/cms/types";
import { BOOKING_SLOTS } from "@/lib/cms/types";
import {
  blockMatchesDate,
  blocksForDate,
  bookingsForDate,
  slotRangeFromSelection,
  slotStatesForDate,
  slotsInRange
} from "@/lib/booking-utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type BlockDraft = {
  title: string;
  date: string;
  wholeDay: boolean;
  startTime: string;
  endTime: string;
  repeatType: "none" | "daily" | "weekly" | "monthly";
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

function formatDateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export default function AdminBlockCalendar({ bookings, blocked, onSave, onRemoveBlock }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<BlockDraft>({
    title: "",
    date: "",
    wholeDay: true,
    startTime: "09:00",
    endTime: "12:00",
    repeatType: "none"
  });
  const [slotSelection, setSlotSelection] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const dragAnchor = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");

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

  const dayMeta = useCallback(
    (date: string) => {
      const dayBookings = bookingsForDate(bookings, date);
      const dayBlocks = blocksForDate(blocked, date);
      const slots = slotStatesForDate(date, blocked, bookings);
      const availableCount = Object.values(slots).filter((s) => s === "available").length;
      return {
        dayBookings,
        dayBlocks,
        slots,
        blocked: dayBlocks.length > 0,
        booked: dayBookings.length > 0,
        availableCount
      };
    },
    [bookings, blocked]
  );

  const selectedMeta = selectedDate ? dayMeta(selectedDate) : null;

  function openBlockModal(date?: string, wholeDay = true, preserveSelection = false) {
    const times = preserveSelection && slotSelection.length ? slotRangeFromSelection(slotSelection) : null;
    setDraft({
      title: "",
      date: date ?? selectedDate ?? "",
      wholeDay,
      startTime: times?.startTime ?? "09:00",
      endTime: times?.endTime ?? "12:00",
      repeatType: "none"
    });
    if (!preserveSelection) setSlotSelection([]);
    setError("");
    setModalOpen(true);
  }

  function selectDay(date: string) {
    setSelectedDate(date);
  }

  function applySlotRange(from: string, to: string) {
    const startIdx = BOOKING_SLOTS.indexOf(from as (typeof BOOKING_SLOTS)[number]);
    const endIdx = BOOKING_SLOTS.indexOf(to as (typeof BOOKING_SLOTS)[number]);
    if (startIdx < 0 || endIdx < 0) return;

    const [lo, hi] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const range = BOOKING_SLOTS.slice(lo, hi + 1);
    setSlotSelection(range);
    const times = slotRangeFromSelection(range);
    if (times) {
      setDraft((d) => ({ ...d, wholeDay: false, startTime: times.startTime, endTime: times.endTime }));
    }
  }

  function onSlotPointerDown(slot: string) {
    setDraft((d) => ({ ...d, wholeDay: false }));
    dragAnchor.current = slot;
    setDragging(true);
    applySlotRange(slot, slot);
  }

  function onSlotPointerEnter(slot: string) {
    if (!dragging || !dragAnchor.current) return;
    applySlotRange(dragAnchor.current, slot);
  }

  function endDrag() {
    setDragging(false);
    dragAnchor.current = null;
  }

  async function saveBlock() {
    if (!draft.date && draft.repeatType !== "daily") {
      setError("Select a date.");
      return;
    }
    if (!draft.wholeDay && !slotSelection.length) {
      setError("Select at least one time slot.");
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

  async function handleBlockClick(block: BlockedTime) {
    if (confirmDeleteId === block.id) {
      setConfirmDeleteId("");
      await onRemoveBlock(block.id);
      return;
    }
    setConfirmDeleteId(block.id);
    window.setTimeout(() => setConfirmDeleteId(""), 3000);
  }

  async function handleBlockedSlotClick(slot: string) {
    if (!selectedDate || !selectedMeta) return;
    const matchingBlock = selectedMeta.dayBlocks.find((block) => {
      if (!block.start_time || !block.end_time) return true;
      const range = slotsInRange(block.start_time.slice(0, 5), block.end_time.slice(0, 5));
      return range.includes(slot);
    });
    if (matchingBlock) {
      await handleBlockClick(matchingBlock);
    }
  }

  return (
    <div className="admin-block-calendar" onMouseLeave={endDrag} onMouseUp={endDrag}>
      <div className="admin-block-toolbar">
        <div>
          <h3>Calendar</h3>
          <p>
            Gold = booked · Red = blocked · Green = available. Select a day, drag slots to block, or
            click blocked items to delete.
          </p>
        </div>
        <div className="admin-filter-row">
          <button
            className="button ghost"
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
              setSelectedDate(today);
            }}
            type="button"
          >
            Today
          </button>
          <button
            className="button ghost"
            onClick={() => {
              const now = new Date();
              setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDate(now.toISOString().slice(0, 10));
            }}
            type="button"
          >
            This week
          </button>
          <button
            className="button ghost"
            onClick={() => {
              const now = new Date();
              setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDate("");
            }}
            type="button"
          >
            This month
          </button>
          <button className="button" onClick={() => openBlockModal()} type="button">
            Block time
          </button>
        </div>
      </div>

      <div className="booking-month-bar">
        <button
          aria-label="Previous month"
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
          type="button"
        >
          ←
        </button>
        <strong>{monthLabel(viewDate)}</strong>
        <button
          aria-label="Next month"
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
          type="button"
        >
          →
        </button>
      </div>

      <div className="admin-calendar-legend">
        <span className="legend-booked">Booked</span>
        <span className="legend-blocked">Blocked</span>
        <span className="legend-open">Available</span>
      </div>

      <div className="admin-calendar-layout">
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
              meta.blocked && meta.booked ? "mixed-day" : "",
              meta.blocked ? "blocked-day" : "",
              meta.booked ? "booked-day" : "",
              !meta.blocked && !meta.booked && meta.availableCount > 0 ? "open-day" : "",
              selectedDate === date ? "selected" : ""
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                className={className}
                key={date}
                onClick={() => selectDay(date)}
                title={`${date} · ${meta.availableCount} open slots`}
                type="button"
              >
                <span>{Number(date.slice(-2))}</span>
                <div className="day-dots">
                  {meta.dayBookings.length ? <em className="day-dot booked" /> : null}
                  {meta.dayBlocks.length ? <em className="day-dot blocked" /> : null}
                  {meta.availableCount > 0 && !meta.dayBookings.length && !meta.dayBlocks.length ? (
                    <em className="day-dot open" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <aside className="admin-day-panel">
          {selectedDate && selectedMeta ? (
            <>
              <div className="admin-day-panel-header">
                <div>
                  <h4>{formatDateLabel(selectedDate)}</h4>
                  <p className="meta">
                    {selectedMeta.dayBookings.length} booking(s) · {selectedMeta.dayBlocks.length} block rule(s)
                  </p>
                </div>
                <button className="button ghost" onClick={() => openBlockModal(selectedDate, false, true)} type="button">
                  Block slots
                </button>
              </div>

              <p className="meta">Drag across slots to preview a range. Click red blocked slots to remove.</p>
              <div className="admin-slot-timeline admin-slot-timeline-interactive">
                {BOOKING_SLOTS.map((slot) => {
                  const state = selectedMeta.slots[slot];
                  const inSelection = slotSelection.includes(slot) && !modalOpen;
                  return (
                    <button
                      className={`admin-slot-chip ${state} ${inSelection ? "selected" : ""} ${state === "blocked" ? "clickable-block" : ""}`}
                      key={slot}
                      onClick={() => {
                        if (state === "blocked") {
                          handleBlockedSlotClick(slot);
                        }
                      }}
                      onMouseDown={() => {
                        if (state !== "blocked") onSlotPointerDown(slot);
                      }}
                      onMouseEnter={() => {
                        if (state !== "blocked") onSlotPointerEnter(slot);
                      }}
                      type="button"
                    >
                      <span>{slot}</span>
                      <small>{state}</small>
                    </button>
                  );
                })}
              </div>

              {slotSelection.length && !modalOpen ? (
                <div className="button-row">
                  <button
                    className="button"
                    onClick={() => openBlockModal(selectedDate, false, true)}
                    type="button"
                  >
                    Block {slotSelection[0]}–{draft.endTime}
                  </button>
                </div>
              ) : null}

              {selectedMeta.dayBookings.length ? (
                <div className="admin-day-section">
                  <h5>Bookings</h5>
                  {selectedMeta.dayBookings.map((booking) => (
                    <div className="admin-day-item booked" key={booking.id}>
                      <strong>
                        {booking.start_time.slice(0, 5)} — {booking.client_name}
                      </strong>
                      <p>
                        {booking.client_email} · <span className={`badge ${booking.status}`}>{booking.status}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedMeta.dayBlocks.length ? (
                <div className="admin-day-section">
                  <h5>Blocked times</h5>
                  {selectedMeta.dayBlocks.map((block) => (
                    <button
                      className={`admin-day-item blocked admin-day-item-clickable ${confirmDeleteId === block.id ? "confirm-delete" : ""}`}
                      key={block.id}
                      onClick={() => handleBlockClick(block)}
                      title="Click to delete blocked time"
                      type="button"
                    >
                      <div>
                        <strong>{block.title ?? "Blocked"}</strong>
                        <p>
                          {block.start_time
                            ? `${block.start_time.slice(0, 5)}–${block.end_time?.slice(0, 5) ?? ""}`
                            : "Whole day"}
                          {block.repeat_type !== "none" ? ` · ${block.repeat_type}` : ""}
                        </p>
                        {confirmDeleteId === block.id ? (
                          <p className="status error">Click again to confirm delete</p>
                        ) : (
                          <p className="meta">Click to remove</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {!selectedMeta.dayBookings.length && !selectedMeta.dayBlocks.length ? (
                <p className="meta">All slots available on this day.</p>
              ) : null}
            </>
          ) : (
            <div className="empty-state">Select a day on the calendar to view bookings, blocks, and availability.</div>
          )}
        </aside>
      </div>

      {modalOpen ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div aria-modal="true" className="admin-modal admin-modal-wide admin-block-modal" role="dialog">
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
                  <option value="monthly">Monthly (same day of month)</option>
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
              <>
                <p className="meta">Click and drag across slots to select a time range.</p>
                <div className="booking-slot-grid admin-block-slots">
                  {BOOKING_SLOTS.map((slot) => {
                    const daySlots = draft.date ? slotStatesForDate(draft.date, blocked, bookings) : null;
                    const dayState = daySlots?.[slot] ?? "available";
                    const inSelection = slotSelection.includes(slot);
                    return (
                      <button
                        className={`booking-slot slot-${dayState} ${inSelection ? "selected" : ""}`}
                        key={slot}
                        onMouseDown={() => onSlotPointerDown(slot)}
                        onMouseEnter={() => onSlotPointerEnter(slot)}
                        type="button"
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {slotSelection.length ? (
                  <p className="meta">
                    Selected: {slotSelection[0]} – {draft.endTime} ({slotSelection.length} slot
                    {slotSelection.length === 1 ? "" : "s"})
                  </p>
                ) : null}
              </>
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

export { blockMatchesDate, slotsInRange };
