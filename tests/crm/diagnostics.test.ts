// Internal diagnostics: admin-only, counts/codes only, honest about the handoff gate.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "./stubs/next-server.mjs";
import { GET as healthGET } from "../../app/api/admin/health/route";
import { summarize, handoffGate } from "../../lib/crm/diagnostics";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-11-22T12:00:00Z");
const row = (crm_status: string, created_at: string, extra: Partial<{ crm_last_error_code: string; crm_next_attempt_at: string }> = {}) =>
  ({ crm_status, created_at, crm_last_error_code: extra.crm_last_error_code ?? null, crm_next_attempt_at: extra.crm_next_attempt_at ?? null });

afterEach(() => void ((globalThis as { __supabaseFake?: unknown }).__supabaseFake = undefined));

test("diagnostics: outbox counts, due work, oldest pending age, error codes only", () => {
  const d = summarize([
    row("PENDING", "2026-11-22T10:00:00Z"),
    row("PENDING", "2026-11-22T11:30:00Z", { crm_next_attempt_at: "2026-11-22T13:00:00Z", crm_last_error_code: "GHL_UNAVAILABLE" }),
    row("NEEDS_REVIEW", "2026-11-21T10:00:00Z", { crm_last_error_code: "GHL_REJECTED" }),
    row("NEEDS_REVIEW", "2026-11-21T10:00:00Z", { crm_last_error_code: "free text with client@example.test" }),
    row("SYNCED", "2026-11-20T10:00:00Z", { crm_last_error_code: "GHL_UNAVAILABLE" }),
    row("NOT_QUEUED", "2026-11-19T10:00:00Z")
  ], {}, NOW);
  assert.deepEqual(d.outbox, { pending: 2, due: 1, needsReview: 2, synced: 1, notQueued: 1, oldestPendingMinutes: 120, errorCodes: { GHL_UNAVAILABLE: 1, GHL_REJECTED: 1 } });
  assert.ok(d.warnings.includes("LEADS_NEED_MANUAL_REVIEW"));
  assert.ok(d.warnings.includes("PENDING_LEADS_WAITING_FOR_HANDOFF_ENABLEMENT"));
  assert.ok(!JSON.stringify(d).includes("@"), "no free text that could hold personal data");
});

test("diagnostics: database outage and unsafe flags are reported, secrets never echoed", () => {
  const d = summarize(null, { GHL_HANDOFF_ENABLED: "true", GHL_PRIVATE_INTEGRATION_TOKEN: "pit-secret-value-1234567890", BOOKING_SMS_ENABLED: "true" }, NOW);
  assert.equal(d.database, "UNAVAILABLE");
  assert.deepEqual(d.warnings.sort(), ["BOOKING_SMS_ENABLED_IS_TRUE", "DATABASE_UNAVAILABLE", "HANDOFF_FLAG_ON_BUT_GATE_CLOSED"]);
  assert.equal(d.handoff.tokenConfigured, true);
  assert.equal(d.handoff.active, false, "missing GHL ids keep the handoff closed even with the switch on");
  assert.ok(!JSON.stringify(d).includes("pit-secret"));
  assert.deepEqual(handoffGate({}), { flag: false, privacyStatus: "APPROVED", tokenConfigured: false, active: false, testLane: false, smsEnabled: false });
});

test("health route: anonymous and non-admin callers are refused; admin gets counts", async () => {
  const fake = {
    auth: { async getUser(token: string) { return token === "admin-token" ? { data: { user: { id: ADMIN_ID } }, error: null } : { data: { user: null }, error: { message: "x" } }; } },
    async rpc(fn: string, args: Record<string, unknown>) { return { data: fn === "is_crm_admin" && args.candidate === ADMIN_ID, error: null }; },
    from() {
      const b = { select: () => b, limit: async () => ({ data: [row("PENDING", "2026-11-22T10:00:00Z")], error: null }) };
      return b;
    }
  };
  (globalThis as { __supabaseFake?: unknown }).__supabaseFake = fake;
  const get = (token?: string) => healthGET(new NextRequest("http://localhost/api/admin/health", { headers: token ? { authorization: `Bearer ${token}` } : {} }) as never);
  assert.equal((await get()).status, 401);
  assert.ok([401, 403].includes((await get("user-token")).status));
  const ok = await get("admin-token");
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.database, "OK");
  assert.equal(body.outbox.pending, 1);
});
