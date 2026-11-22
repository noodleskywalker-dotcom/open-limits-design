// Controlled TEST lane: pre-activation production verification that can only ever touch synthetic
// TEST leads. Real enquiries must never be read into the worker, leased, modified or sent to GHL.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ghlControlledTestConfig, ghlHandoffConfig, ghlReadiness } from "../../lib/crm/ghl";
import { isControlledTestLead, runCrmHandoff } from "../../lib/crm/handoff";
import { GET as cronGET } from "../../app/api/crm/handoff/route";

const ENV = {
  GHL_PRIVATE_INTEGRATION_TOKEN: "pit-" + "x".repeat(36),
  GHL_LOCATION_ID: "loc123456789",
  GHL_PIPELINE_ID: "pipe123456789",
  GHL_STAGE_NEW_ENQUIRY_ID: "stage-new-123",
  GHL_STAGE_CONSULTATION_BOOKED_ID: "stage-cons-123"
};
const KEYS = [...Object.keys(ENV), "GHL_CONTROLLED_TEST_ENABLED", "GHL_HANDOFF_ENABLED", "CRON_SECRET"];
const realFetch = globalThis.fetch;
afterEach(() => {
  for (const key of KEYS) delete process.env[key];
  globalThis.fetch = realFetch;
  (globalThis as { __supabaseFake?: unknown }).__supabaseFake = undefined;
});

type Row = Record<string, unknown>;
const lead = (id: string, name: string, email: string, extra: Row = {}): Row => ({
  id, name, email, phone: null, project_type: "Other", source: "contact_form", locale: "en", utm_campaign: null, tracking_ref: null,
  crm_stage: "NEW_ENQUIRY", crm_status: "PENDING", crm_attempts: 0, crm_next_attempt_at: "2026-01-01T00:00:00Z", crm_lease_until: null,
  ghl_contact_id: null, ghl_opportunity_id: null, ...extra
});

/** Minimal PostgREST-style fake for the leads table. Records every row that is written. */
function fakeSupabase(rows: Row[]) {
  const writes: string[] = [];
  const like = (value: unknown, pattern: string) =>
    typeof value === "string" && new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$").test(value);
  return {
    writes,
    rpc() {
      throw new Error("the TEST lane must not use the live claim function");
    },
    from(table: string) {
      assert.equal(table, "leads");
      const filters: ((r: Row) => boolean)[] = [];
      let patch: Row | null = null;
      const apply = () => {
        const matched = rows.filter((r) => filters.every((f) => f(r)));
        if (patch) for (const r of matched) { writes.push(String(r.id)); Object.assign(r, patch); }
        return { data: matched.map((r) => ({ ...r })), error: null };
      };
      const builder = {
        select: () => builder,
        update(p: Row) { patch = p; return builder; },
        eq(column: string, value: unknown) { filters.push((r) => r[column] === value); return patch ? Promise.resolve(apply()) : builder; },
        like(column: string, pattern: string) { filters.push((r) => like(r[column], pattern)); return builder; },
        in(column: string, values: unknown[]) { filters.push((r) => values.includes(r[column])); return Promise.resolve(apply()); },
        limit: async () => apply()
      };
      return builder;
    }
  };
}

function fakeGhl() {
  const calls: { method: string; path: string; body: string }[] = [];
  globalThis.fetch = (async (input: URL | string, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ method: init?.method ?? "GET", path: url.pathname, body: String(init?.body ?? "") });
    const json = url.pathname === "/contacts/search/duplicate" ? { contact: null }
      : url.pathname === "/contacts/" ? { contact: { id: "contact-123456" } }
      : url.pathname === "/opportunities/search" ? { opportunities: [] }
      : { opportunity: { id: "opp-123456" } };
    return new Response(JSON.stringify(json), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

test("test lane: off by default, independent of the live gate, and requires the token and ids", () => {
  assert.equal(ghlControlledTestConfig({}), null);
  assert.equal(ghlControlledTestConfig({ ...ENV }), null, "needs the explicit flag");
  assert.equal(ghlControlledTestConfig({ GHL_CONTROLLED_TEST_ENABLED: "true" }), null, "needs token and ids");
  assert.ok(ghlControlledTestConfig({ ...ENV, GHL_CONTROLLED_TEST_ENABLED: "true" }));
  assert.equal(ghlHandoffConfig({ ...ENV, GHL_CONTROLLED_TEST_ENABLED: "true" }), null, "the test flag never opens the live handoff");
});

test("test lane: only synthetic identities qualify (reserved domain, TEST name, no phone)", () => {
  assert.ok(isControlledTestLead({ name: "TEST Enquiry", email: "ol-ghl-test-abcd1234@example.com", phone: null }));
  for (const bad of [
    { name: "Real Person", email: "ol-ghl-test-abcd1234@example.com" },
    { name: "TEST Enquiry", email: "someone@gmail.com" },
    { name: "TEST Enquiry", email: "ol-ghl-test-abcd1234@example.com.evil.qa" },
    { name: "TEST Enquiry", email: "OL-GHL-TEST-abcd1234@example.com" },
    { name: "TEST Enquiry", email: "ol-ghl-test-abcd1234@example.com", phone: "+97455501234" },
    { name: null, email: null }
  ]) assert.equal(isControlledTestLead({ phone: null, ...bad }), false, JSON.stringify(bad));
});

test("test lane: sends ONLY the TEST lead to GHL; real pending leads are never read into the worker or modified", async () => {
  Object.assign(process.env, ENV, { GHL_CONTROLLED_TEST_ENABLED: "true" });
  const real = lead("real-1", "Real Client", "client@gmail.com");
  const lookalike = lead("real-2", "TEST but real", "ol-ghl-test-abcd1234@example.com", { phone: "+97455501234" });
  const synthetic = lead("test-1", "TEST Enquiry", "ol-ghl-test-abcd1234@example.com");
  const before = JSON.stringify([real, lookalike]);
  const db = fakeSupabase([real, lookalike, synthetic]);
  (globalThis as { __supabaseFake?: unknown }).__supabaseFake = db;
  const calls = fakeGhl();

  const run = await runCrmHandoff(10);
  assert.equal(run.state, "TEST_LANE");
  assert.equal(run.result?.synced, 1);
  assert.equal(synthetic.crm_status, "SYNCED");
  assert.equal(synthetic.ghl_contact_id, "contact-123456");
  assert.equal(JSON.stringify([real, lookalike]), before, "real rows untouched");
  assert.deepEqual([...new Set(db.writes)], ["test-1"]);
  assert.ok(calls.every((c) => !c.body.includes("client@gmail.com") && !c.path.includes("gmail")));
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ["GET /contacts/search/duplicate", "POST /contacts/", "GET /opportunities/search", "POST /opportunities/"]);
});

test("test lane: simulated outage keeps the TEST lead PENDING with backoff and makes no GHL call; recovery syncs it", async () => {
  Object.assign(process.env, ENV, { GHL_CONTROLLED_TEST_ENABLED: "true", CRON_SECRET: "s".repeat(48) });
  const synthetic = lead("test-1", "TEST Enquiry", "ol-ghl-test-abcd1234@example.com");
  (globalThis as { __supabaseFake?: unknown }).__supabaseFake = fakeSupabase([synthetic]);
  const calls = fakeGhl();
  const cron = (query = "") =>
    cronGET(Object.assign(new Request(`http://localhost/api/crm/handoff${query}`, { headers: { authorization: `Bearer ${"s".repeat(48)}` } }), {
      nextUrl: new URL(`http://localhost/api/crm/handoff${query}`)
    }) as never);

  const down = await (await cron("?simulate=ghl_unavailable")).json();
  assert.equal(down.state, "TEST_LANE");
  assert.equal(down.result.retried, 1);
  assert.equal(calls.length, 0);
  assert.equal(synthetic.crm_status, "PENDING");
  assert.equal(synthetic.crm_last_error_code, "GHL_UNAVAILABLE");
  assert.equal(synthetic.crm_attempts, 1);
  assert.ok(Date.parse(String(synthetic.crm_next_attempt_at)) > Date.now(), "backoff scheduled");

  synthetic.crm_next_attempt_at = "2026-01-01T00:00:00Z"; // backoff elapsed
  const up = await (await cron()).json();
  assert.equal(up.result.synced, 1);
  assert.equal(synthetic.crm_status, "SYNCED");
  assert.equal(synthetic.crm_last_error_code, null);
});

test("live gate closed and test lane off: nothing runs, simulate flag is harmless", async () => {
  Object.assign(process.env, ENV, { GHL_HANDOFF_ENABLED: "true" }); // privacy notice still unapproved in code
  (globalThis as { __supabaseFake?: unknown }).__supabaseFake = fakeSupabase([lead("real-1", "Real Client", "client@gmail.com")]);
  const calls = fakeGhl();
  assert.deepEqual(await runCrmHandoff(10, { simulateOutage: true }), { state: "DISABLED" });
  assert.equal(calls.length, 0);
});

test("readiness: explains a closed gate with booleans and variable names only, never values", () => {
  const r = ghlReadiness({ ...ENV, GHL_PRIVATE_INTEGRATION_TOKEN: ENV.GHL_PRIVATE_INTEGRATION_TOKEN + " ", GHL_PIPELINE_ID: "bad id!", GHL_CONTROLLED_TEST_ENABLED: "true" });
  assert.deepEqual(r, { liveFlag: false, testLaneFlag: true, privacyApproved: false, tokenPresent: true, tokenFormatValid: false, tokenHasSurroundingWhitespace: true, invalidIds: ["GHL_PIPELINE_ID"] });
  assert.ok(!JSON.stringify(r).includes("pit-") && !JSON.stringify(r).includes("loc123"));
});
