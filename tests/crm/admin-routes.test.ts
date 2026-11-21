// Admin-only routes: booking accept/reject and audited lead view/export/requeue.
// Fake Supabase client; the database-level rules are covered by authorization.test.ts.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "./stubs/next-server.mjs";
import { POST as managePOST } from "../../app/api/bookings/manage/route";
import { GET as leadsGET } from "../../app/api/admin/leads/route";
import { GET as exportGET } from "../../app/api/admin/leads/export/route";
import { POST as requeuePOST } from "../../app/api/admin/leads/requeue/route";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const BOOKING = "44444444-4444-4444-8444-444444444444";
const LEAD = "55555555-5555-4555-8555-555555555555";
const PII_EMAIL = "client.fixture@example.test";

type Call = { fn: string; args: Record<string, unknown> };
function fakeSupabase(options: { rpcError?: boolean } = {}) {
  const calls: Call[] = [];
  return {
    calls,
    auth: {
      async getUser(token: string) {
        if (token === "admin-token") return { data: { user: { id: ADMIN_ID } }, error: null };
        if (token === "user-token") return { data: { user: { id: USER_ID } }, error: null };
        return { data: { user: null }, error: { message: "invalid" } };
      }
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      if (fn === "is_crm_admin") return { data: args.candidate === ADMIN_ID, error: null };
      if (options.rpcError) return { data: null, error: { code: "42501", message: `boom ${PII_EMAIL}` } };
      if (fn === "admin_set_booking_status") {
        return { data: [{ id: args.booking, status: args.new_status, client_phone: "+97400000000", booking_date: "2030-01-06" }], error: null };
      }
      if (fn === "admin_read_leads" || fn === "admin_export_leads") {
        return { data: [{ id: LEAD, email: PII_EMAIL, name: '=HYPERLINK("x")', secret_column: "nope" }], error: null };
      }
      if (fn === "admin_requeue_lead") return { data: args.lead === LEAD, error: null };
      return { data: null, error: { code: "XX000" } };
    }
  };
}

let logs: string[] = [];
const original = console.error;
beforeEach(() => {
  logs = [];
  console.error = (...args: unknown[]) => void logs.push(args.map(String).join(" "));
  delete process.env.BOOKING_SMS_ENABLED;
});
afterEach(() => {
  console.error = original;
  (globalThis as { __supabaseFake?: unknown }).__supabaseFake = undefined;
  assert.ok(!logs.join("\n").includes(PII_EMAIL), "no PII in logs");
});
const use = (fake: unknown) => void ((globalThis as { __supabaseFake?: unknown }).__supabaseFake = fake);
const req = (path: string, token?: string, body?: unknown) =>
  new NextRequest(`http://localhost${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }) as never;

test("booking accept/reject: no session 401, ordinary signed-in user 403, nothing changed", async () => {
  const db = fakeSupabase();
  use(db);
  assert.equal((await managePOST(req("/api/bookings/manage", undefined, { id: BOOKING, action: "accept" }))).status, 401);
  assert.equal((await managePOST(req("/api/bookings/manage", "bad-token", { id: BOOKING, action: "accept" }))).status, 401);
  assert.equal((await managePOST(req("/api/bookings/manage", "user-token", { id: BOOKING, action: "accept" }))).status, 403);
  assert.ok(!db.calls.some((c) => c.fn === "admin_set_booking_status"), "no status change attempted for non-admins");
});

test("booking accept/reject: admin changes status through the audited function with their own id; client SMS off by default", async () => {
  const db = fakeSupabase();
  use(db);
  const response = await managePOST(req("/api/bookings/manage", "admin-token", { id: BOOKING, action: "reject" }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.booking.status, "rejected");
  assert.deepEqual(body.sms, { sent: false, reason: "Client SMS disabled" });
  assert.deepEqual(db.calls.find((c) => c.fn === "admin_set_booking_status")?.args, { actor: ADMIN_ID, booking: BOOKING, new_status: "rejected" });
  assert.equal((await managePOST(req("/api/bookings/manage", "admin-token", { id: "not-a-uuid", action: "accept" }))).status, 400);
  assert.equal((await managePOST(req("/api/bookings/manage", "admin-token", { id: BOOKING, action: "delete" }))).status, 400);
});

test("booking accept/reject: database failure gives 503 with a code-only log and no raw DB message", async () => {
  use(fakeSupabase({ rpcError: true }));
  const response = await managePOST(req("/api/bookings/manage", "admin-token", { id: BOOKING, action: "accept" }));
  assert.equal(response.status, 503);
  assert.ok(!JSON.stringify(await response.json()).includes("boom"));
  assert.deepEqual(logs, ["[bookings/manage] status change failed: 42501"]);
});

test("admin lead routes: 401 without session, 403 for ordinary users, 503 when Supabase is not configured", async () => {
  use(fakeSupabase());
  assert.equal((await leadsGET(req("/api/admin/leads"))).status, 401);
  assert.equal((await exportGET(req("/api/admin/leads/export"))).status, 401);
  assert.equal((await leadsGET(req("/api/admin/leads", "user-token"))).status, 403);
  assert.equal((await exportGET(req("/api/admin/leads/export", "user-token"))).status, 403);
  assert.equal((await requeuePOST(req("/api/admin/leads/requeue", "user-token", { id: LEAD }))).status, 403);
  use(null);
  assert.equal((await leadsGET(req("/api/admin/leads", "admin-token"))).status, 503);
});

test("admin lead view/export pass the verified admin id to the audited functions; known columns only; CSV is formula-safe", async () => {
  const db = fakeSupabase();
  use(db);
  const view = await leadsGET(req("/api/admin/leads?limit=500", "admin-token"));
  assert.equal(view.status, 200);
  assert.equal(view.headers.get("cache-control"), "no-store");
  const { leads } = await view.json();
  assert.equal(leads[0].email, PII_EMAIL);
  assert.equal(leads[0].secret_column, undefined);
  assert.deepEqual(db.calls.find((c) => c.fn === "admin_read_leads")?.args, { actor: ADMIN_ID, max_rows: 200, created_before: null });

  const exported = await exportGET(req("/api/admin/leads/export", "admin-token"));
  assert.equal(exported.headers.get("content-type"), "text/csv; charset=utf-8");
  const csv = await exported.text();
  assert.ok(csv.startsWith("id,created_at,source,name,email"));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`), "formula cells are neutralised");
  assert.deepEqual(db.calls.find((c) => c.fn === "admin_export_leads")?.args, { actor: ADMIN_ID });
});

test("admin requeue: only NEEDS_REVIEW leads move (409 otherwise); invalid id 400", async () => {
  const db = fakeSupabase();
  use(db);
  assert.equal((await requeuePOST(req("/api/admin/leads/requeue", "admin-token", { id: LEAD }))).status, 200);
  assert.equal((await requeuePOST(req("/api/admin/leads/requeue", "admin-token", { id: BOOKING }))).status, 409);
  assert.equal((await requeuePOST(req("/api/admin/leads/requeue", "admin-token", { id: "x" }))).status, 400);
  assert.deepEqual(db.calls.filter((c) => c.fn === "admin_requeue_lead")[0].args, { actor: ADMIN_ID, lead: LEAD });
});
