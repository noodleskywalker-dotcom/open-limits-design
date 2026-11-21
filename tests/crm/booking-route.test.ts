// Booking form route: success ONLY after the booking row is persisted; failures give the fallback
// contact route and never echo personal data; a CRM-queue failure never fails the saved booking.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest, afterCallbacks } from "./stubs/next-server.mjs";
import { POST } from "../../app/api/bookings/route";
import { BOOKING_SLOTS } from "../../lib/cms/types";

const EMAIL = "booking.fixture@example.test";
const PHONE = "+97455501234";
const SLOT = BOOKING_SLOTS[0];
type Result = { data: unknown; error: { code?: string; message: string } | null };
type Behaviour = { conflicts?: Result; blocked?: Result; insertBooking?: Result; insertLead?: Result };
type Op = { table: string; action: string; payload?: unknown };

function fake(behaviour: Behaviour = {}) {
  const ops: Op[] = [];
  const from = (table: string) => {
    let action = "select";
    let payload: unknown;
    const resolve = (): Result => {
      if (table === "bookings" && action === "insert") return behaviour.insertBooking ?? { data: { id: "bk-1", status: "pending" }, error: null };
      if (table === "bookings") return behaviour.conflicts ?? { data: [], error: null };
      if (table === "blocked_times") return behaviour.blocked ?? { data: [], error: null };
      if (table === "leads" && action === "insert") return behaviour.insertLead ?? { data: null, error: null };
      return { data: null, error: null };
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      insert: (row: unknown) => {
        action = "insert";
        payload = row;
        ops.push({ table, action, payload });
        return builder;
      },
      single: async () => resolve(),
      then: (ok: (value: Result) => unknown, fail?: (reason: unknown) => unknown) => Promise.resolve(resolve()).then(ok, fail)
    };
    return builder;
  };
  return { ops, from };
}

let logs: string[] = [];
const original = console.error;
beforeEach(() => {
  logs = [];
  afterCallbacks.length = 0;
  console.error = (...args: unknown[]) => void logs.push(args.map(String).join(" "));
});
afterEach(() => {
  console.error = original;
  (globalThis as { __supabaseFake?: unknown }).__supabaseFake = undefined;
  const text = logs.join("\n");
  assert.ok(!text.includes(EMAIL) && !text.includes(PHONE), "no personal data in logs");
});
const use = (client: unknown) => void ((globalThis as { __supabaseFake?: unknown }).__supabaseFake = client);
const futureDate = () => {
  const d = new Date(Date.now() + 10 * 86_400_000);
  return d.toISOString().slice(0, 10);
};
const body = (extra: Record<string, unknown> = {}) => ({
  client_name: "Booking Fixture", client_email: EMAIL, client_phone: PHONE, notes: "Villa brief",
  booking_date: futureDate(), start_time: SLOT, consent: true, idempotencyKey: "7d0e5a4c-2b1f-4c3d-9e8f-0a1b2c3d4e5f", ...extra
});
const post = (payload: unknown) =>
  POST(new NextRequest("http://localhost/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }) as never);

test("booking: success is reported only after the booking row is saved; CRM queue follows with Consultation Booked", async () => {
  const db = fake();
  use(db);
  const response = await post(body());
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).booking, { id: "bk-1", status: "pending" });
  const [bookingInsert, leadInsert] = db.ops;
  assert.equal(bookingInsert.table, "bookings");
  assert.equal((bookingInsert.payload as { status: string }).status, "pending");
  assert.equal(leadInsert.table, "leads");
  assert.deepEqual(
    { stage: (leadInsert.payload as Record<string, unknown>).crm_stage, source: (leadInsert.payload as Record<string, unknown>).source, booking: (leadInsert.payload as Record<string, unknown>).booking_id },
    { stage: "CONSULTATION_BOOKED", source: "booking", booking: "bk-1" }
  );
  assert.equal(afterCallbacks.length, 1, "handoff scheduled after the response");
});

test("booking: NEVER reports success when the database is not configured or the save fails", async () => {
  for (const behaviour of [
    null,
    { insertBooking: { data: null, error: { code: "XX000", message: `boom ${EMAIL}` } } },
    { conflicts: { data: null, error: { code: "08006", message: "connection" } } },
    { blocked: { data: null, error: { code: "08006", message: "connection" } } }
  ]) {
    use(behaviour === null ? null : fake(behaviour));
    const response = await post(body());
    assert.equal(response.status, 503);
    const json = await response.json();
    assert.equal(json.ok, undefined);
    assert.match(json.error, /\+974 7788 9033|info@openlimitsdesign\.com/, "fallback contact route offered");
    assert.ok(!JSON.stringify(json).includes(EMAIL) && !JSON.stringify(json).includes("boom"));
  }
});

test("booking: a taken slot (pre-check or unique-index race) is a 409, not a success", async () => {
  use(fake({ conflicts: { data: [{ id: "other" }], error: null } }));
  assert.equal((await post(body())).status, 409);
  use(fake({ insertBooking: { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint bookings_active_slot_idx" } } }));
  assert.equal((await post(body())).status, 409);
});

test("booking: a CRM queue failure never fails the saved booking (and logs only a code)", async () => {
  use(fake({ insertLead: { data: null, error: { code: "XX000", message: `fail ${EMAIL}` } } }));
  const response = await post(body());
  assert.equal(response.status, 200);
  assert.equal(afterCallbacks.length, 0, "nothing queued when the lead row was not saved");
  assert.ok(logs.some((line) => line.startsWith("[bookings] CRM queue failed:")));
});

test("booking: without consent the booking is saved but NOT queued for the CRM", async () => {
  const db = fake();
  use(db);
  assert.equal((await post(body({ consent: false }))).status, 200);
  assert.deepEqual(db.ops.map((op) => op.table), ["bookings"]);
});
