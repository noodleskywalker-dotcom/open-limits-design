"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type SlotState = "available" | "taken" | "blocked";
type AvailabilityResponse = {
  month: string;
  slots: string[];
  days: Record<string, Record<string, SlotState>>;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function BookingCalendar() {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadAvailability = useCallback(async (date: Date) => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/bookings?month=${monthKey(date)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load availability");
      setAvailability(data);
    } catch (error) {
      setAvailability(null);
      setLoadError(error instanceof Error ? error.message : "Unable to load availability");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Availability lives in Supabase; sync whenever the visible month changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAvailability(viewDate);
  }, [loadAvailability, viewDate]);

  const calendarCells = useMemo(() => {
    const firstWeekday = viewDate.getDay();
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(`${monthKey(viewDate)}-${String(day).padStart(2, "0")}`);
    }
    return cells;
  }, [viewDate]);

  function dayState(date: string): "past" | "full" | "open" {
    if (date < today) return "past";
    const slots = availability?.days[date];
    if (!slots) return "open";
    const hasFree = Object.values(slots).some((state) => state === "available");
    return hasFree ? "open" : "full";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: form.name,
          client_email: form.email,
          client_phone: form.phone,
          notes: form.notes,
          booking_date: selectedDate,
          start_time: selectedSlot
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to submit booking");

      setResult({
        ok: true,
        message: `Request received for ${selectedDate} at ${selectedSlot}. We will confirm shortly.`
      });
      setSelectedSlot("");
      setForm({ name: "", email: "", phone: "", notes: "" });
      await loadAvailability(viewDate);
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "Unable to submit booking"
      });
    } finally {
      setSubmitting(false);
    }
  }

  const slotsForSelected = selectedDate ? availability?.days[selectedDate] : null;

  return (
    <div className="booking-shell">
      <div className="booking-calendar">
        <div className="booking-month-bar">
          <button
            aria-label="Previous month"
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
            type="button"
          >
            ‹
          </button>
          <strong>{monthLabel(viewDate)}</strong>
          <button
            aria-label="Next month"
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
            type="button"
          >
            ›
          </button>
        </div>

        <div className="booking-grid booking-grid-head">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        {loadError ? <p className="status error">{loadError}</p> : null}
        {loading ? <p className="booking-loading">Loading availability…</p> : null}

        <div className="booking-grid">
          {calendarCells.map((date, index) =>
            date ? (
              <button
                className={`booking-day ${dayState(date)} ${selectedDate === date ? "selected" : ""}`}
                disabled={dayState(date) !== "open"}
                key={date}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedSlot("");
                  setResult(null);
                }}
                type="button"
              >
                {Number(date.slice(8))}
              </button>
            ) : (
              <span key={`empty-${index}`} />
            )
          )}
        </div>

        {selectedDate ? (
          <div className="booking-slots">
            <p className="meta">Available times on {selectedDate}</p>
            <div className="booking-slot-grid">
              {(availability?.slots ?? []).map((slot) => {
                const state = slotsForSelected?.[slot] ?? "available";
                return (
                  <button
                    className={`booking-slot ${state} ${selectedSlot === slot ? "selected" : ""}`}
                    disabled={state !== "available"}
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    type="button"
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <form className="booking-form" onSubmit={submit}>
        <h3>Your details</h3>
        <p className="meta">
          {selectedDate && selectedSlot
            ? `Requesting ${selectedDate} at ${selectedSlot}`
            : "Select a date and time on the calendar."}
        </p>
        <label className="field">
          <span>Full name</span>
          <input
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            value={form.name}
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
            type="email"
            value={form.email}
          />
        </label>
        <label className="field">
          <span>Phone</span>
          <input
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="+974…"
            value={form.phone}
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="Tell us about your project"
            value={form.notes}
          />
        </label>
        <button className="button" disabled={!selectedDate || !selectedSlot || submitting} type="submit">
          {submitting ? "Submitting…" : "Request meeting"}
        </button>
        {result ? <p className={`status ${result.ok ? "success" : "error"}`}>{result.message}</p> : null}
      </form>
    </div>
  );
}
