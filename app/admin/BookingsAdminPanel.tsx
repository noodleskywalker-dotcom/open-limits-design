"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BlockedTime, Booking } from "@/lib/cms/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import AdminBlockCalendar, { type BlockDraft } from "@/components/booking/AdminBlockCalendar";

export default function BookingsAdminPanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<BlockedTime[]>([]);
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
      const response = await fetch("/api/bookings/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token}`
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

  async function saveBlock(draft: BlockDraft) {
    if (!supabase) return;
    const { error: insertError } = await supabase.from("blocked_times").insert({
      title: draft.title || null,
      date: draft.date || null,
      start_time: draft.wholeDay ? null : `${draft.startTime}:00`,
      end_time: draft.wholeDay ? null : `${draft.endTime}:00`,
      repeat_type: draft.repeatType
    });
    if (insertError) throw new Error(insertError.message);
    setMessage("Blocked time saved.");
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

      <AdminBlockCalendar
        blocked={blocked}
        bookings={bookings}
        onRemoveBlock={removeBlock}
        onSave={saveBlock}
      />

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
    </div>
  );
}
