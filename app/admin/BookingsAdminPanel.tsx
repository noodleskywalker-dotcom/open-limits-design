"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { BlockedTime, Booking } from "@/lib/cms/types";
import { BOOKING_SLOTS } from "@/lib/cms/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type BlockForm = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  repeatType: "none" | "daily" | "weekly";
  wholeDay: boolean;
};

const blankBlock: BlockForm = {
  title: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  repeatType: "none",
  wholeDay: false
};

export default function BookingsAdminPanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<BlockedTime[]>([]);
  const [blockForm, setBlockForm] = useState<BlockForm>(blankBlock);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadData = useCallback(async () => {
    if (!supabase) return;
    const [bookingsResult, blockedResult] = await Promise.all([
      supabase.from("bookings").select("*").order("booking_date", { ascending: false }).order("start_time"),
      supabase.from("blocked_times").select("*").order("date", { ascending: false })
    ]);
    if (bookingsResult.error) throw bookingsResult.error;
    if (blockedResult.error) throw blockedResult.error;
    setBookings((bookingsResult.data ?? []) as Booking[]);
    setBlocked((blockedResult.data ?? []) as BlockedTime[]);
  }, [supabase]);

  useEffect(() => {
    // Initial bookings sync after admin authentication.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData().catch((loadError: Error) => setError(loadError.message));
  }, [loadData]);

  async function manage(bookingId: string, action: "accept" | "reject") {
    if (!supabase) return;
    setBusyId(bookingId);
    setError("");
    setMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch("/api/bookings/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: bookingId, action })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to update booking");

      setMessage(
        `Booking ${action === "accept" ? "confirmed" : "rejected"}.` +
          (data.sms?.sent ? " SMS sent." : ` SMS skipped (${data.sms?.reason ?? "not configured"}).`)
      );
      await loadData();
    } catch (manageError) {
      setError(manageError instanceof Error ? manageError.message : "Unable to update booking");
    } finally {
      setBusyId("");
    }
  }

  async function addBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setError("");

    const { error: insertError } = await supabase.from("blocked_times").insert({
      title: blockForm.title || null,
      date: blockForm.date || null,
      start_time: blockForm.wholeDay ? null : `${blockForm.startTime}:00`,
      end_time: blockForm.wholeDay ? null : `${blockForm.endTime}:00`,
      repeat_type: blockForm.repeatType
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setBlockForm(blankBlock);
    setMessage("Blocked time added.");
    await loadData();
  }

  async function removeBlock(blockId: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("blocked_times").delete().eq("id", blockId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage("Blocked time removed.");
    await loadData();
  }

  const visibleBookings =
    statusFilter === "all" ? bookings : bookings.filter((b) => b.status === statusFilter);

  return (
    <div>
      {message ? <p className="status success">{message}</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      <div className="admin-toolbar">
        <div>
          <h2>Booking requests</h2>
          <p>Accept or reject requests. Pending and confirmed slots are unavailable to clients.</p>
        </div>
        <label className="field">
          <span>Filter</span>
          <select
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            value={statusFilter}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>

      <div className="row-list">
        {visibleBookings.map((booking) => (
          <div className="row-item" key={booking.id}>
            <div className="row-thumb" />
            <div>
              <strong>
                {booking.client_name} — {booking.booking_date} at {booking.start_time.slice(0, 5)}
              </strong>
              <p>
                {booking.client_email}
                {booking.client_phone ? ` · ${booking.client_phone}` : ""}
                {booking.notes ? ` · “${booking.notes}”` : ""}
              </p>
              <span className={`badge ${booking.status}`}>{booking.status}</span>
            </div>
            <div className="button-row">
              {booking.status !== "confirmed" ? (
                <button
                  className="button"
                  disabled={busyId === booking.id}
                  onClick={() => manage(booking.id, "accept")}
                  type="button"
                >
                  Accept
                </button>
              ) : null}
              {booking.status !== "rejected" ? (
                <button
                  className="button ghost"
                  disabled={busyId === booking.id}
                  onClick={() => manage(booking.id, "reject")}
                  type="button"
                >
                  Reject
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {!visibleBookings.length ? <div className="empty-state">No bookings found.</div> : null}
      </div>

      <form className="form-grid form-card" onSubmit={addBlock}>
        <div className="field full">
          <h3>Blocked dates & times</h3>
          <p>Block whole days, time ranges, or repeating daily/weekly windows.</p>
        </div>
        <label className="field">
          <span>Title</span>
          <input
            onChange={(event) => setBlockForm({ ...blockForm, title: event.target.value })}
            placeholder="Site visit, holiday…"
            value={blockForm.title}
          />
        </label>
        <label className="field">
          <span>Date</span>
          <input
            onChange={(event) => setBlockForm({ ...blockForm, date: event.target.value })}
            required={blockForm.repeatType !== "daily"}
            type="date"
            value={blockForm.date}
          />
        </label>
        <label className="field">
          <span>Whole day</span>
          <select
            onChange={(event) => setBlockForm({ ...blockForm, wholeDay: event.target.value === "true" })}
            value={String(blockForm.wholeDay)}
          >
            <option value="false">Specific time range</option>
            <option value="true">Block entire day</option>
          </select>
        </label>
        <label className="field">
          <span>Repeat</span>
          <select
            onChange={(event) =>
              setBlockForm({ ...blockForm, repeatType: event.target.value as BlockForm["repeatType"] })
            }
            value={blockForm.repeatType}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week (same weekday)</option>
          </select>
        </label>
        {!blockForm.wholeDay ? (
          <>
            <label className="field">
              <span>Start time</span>
              <select
                onChange={(event) => setBlockForm({ ...blockForm, startTime: event.target.value })}
                value={blockForm.startTime}
              >
                {BOOKING_SLOTS.map((slot) => (
                  <option key={slot}>{slot}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>End time</span>
              <select
                onChange={(event) => setBlockForm({ ...blockForm, endTime: event.target.value })}
                value={blockForm.endTime}
              >
                {[...BOOKING_SLOTS.slice(1), "17:00"].map((slot) => (
                  <option key={slot}>{slot}</option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <button className="button" type="submit">
          Add blocked time
        </button>
      </form>

      <div className="row-list">
        {blocked.map((block) => (
          <div className="row-item" key={block.id}>
            <div className="row-thumb" />
            <div>
              <strong>{block.title ?? "Blocked"}</strong>
              <p>
                {block.date ?? "Any date"}
                {block.start_time
                  ? ` · ${block.start_time.slice(0, 5)}–${block.end_time?.slice(0, 5) ?? ""}`
                  : " · whole day"}
                {block.repeat_type !== "none" ? ` · repeats ${block.repeat_type}` : ""}
              </p>
            </div>
            <button className="button ghost" onClick={() => removeBlock(block.id)} type="button">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
