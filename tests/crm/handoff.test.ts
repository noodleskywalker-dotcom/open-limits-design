// Website enquiry → GoHighLevel handoff. Runs with Node's built-in test runner (no extra dependencies):
//   npm run test:crm
// Uses a fake Supabase client and a fake GHL HTTP server-in-a-function. Never touches the network.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { afterCallbacks } from "./stubs/next-server.mjs";
import { CONSENT_VERSION, parseAttribution, parseEnquiry, EnquiryValidationError } from "../../lib/crm/enquiry";
import { MAX_ATTEMPTS, processOutbox, type LeadStore, type OutboxLead, type OutboxPatch } from "../../lib/crm/outbox";
import { GhlHandoffClient, GhlHandoffError, ghlHandoffConfig, type GhlHandoffConfig } from "../../lib/crm/ghl";
import { POST as contactPOST } from "../../app/api/contact/route";
import { GET as cronGET } from "../../app/api/crm/handoff/route";

// Fixture personal data. Every log line and error must be free of these strings.
const PII = { name: "Fixture Person Zq", email: "fixture.zq@example.test", phone: "+974 5550 1234", message: "Private villa brief Zq-77" };
const PII_VALUES = Object.values(PII).map((value) => value.toLowerCase());

const validBody = (overrides: Record<string, unknown> = {}) => ({
  idempotencyKey: "0b8f6a2e-4f7c-4b55-9a3e-2f1f0c9d7e11",
  name: PII.name,
  email: PII.email,
  phone: PII.phone,
  projectType: "Interior Design",
  message: PII.message,
  consent: true,
  locale: "en",
  website: "",
  attribution: { utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "villa_q4", utm_content: "0123456789abcdef0123456789abcdef" },
  ...overrides
});

const request = (body: unknown) =>
  new Request("http://localhost/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });

// ---- fake Supabase (leads table with a unique idempotency_key) ----
type Row = Record<string, unknown>;
function fakeSupabase(mode: "ok" | "error" | "throw" = "ok") {
  const rows: Row[] = [];
  return {
    rows,
    from(table: string) {
      assert.equal(table, "leads");
      return {
        async insert(row: Row) {
          if (mode === "throw") throw new Error(`socket closed for ${PII.email}`);
          if (mode === "error") return { error: { code: "42P01", message: `relation missing near ${PII.email}` } };
          if (rows.some((r) => r.idempotency_key === row.idempotency_key)) return { error: { code: "23505", message: "duplicate" } };
          rows.push({ id: `lead-${rows.length + 1}`, ...row });
          return { error: null };
        }
      };
    }
  };
}

// ---- log capture: assert no PII ever reaches console ----
let logs: string[] = [];
const originals = { log: console.log, info: console.info, warn: console.warn, error: console.error };
beforeEach(() => {
  logs = [];
  for (const level of ["log", "info", "warn", "error"] as const) console[level] = (...args: unknown[]) => void logs.push(args.map(String).join(" "));
  afterCallbacks.length = 0;
  delete process.env.GHL_HANDOFF_ENABLED;
});
afterEach(() => {
  Object.assign(console, originals);
  (globalThis as { __supabaseFake?: unknown }).__supabaseFake = undefined;
  const joined = logs.join("\n").toLowerCase();
  for (const value of PII_VALUES) assert.ok(!joined.includes(value), "a log line contained personal data");
});
const useSupabase = (fake: unknown) => void ((globalThis as { __supabaseFake?: unknown }).__supabaseFake = fake);

// ===================== /api/contact =====================

test("contact: saves the enquiry with consent, attribution and a PENDING CRM status before reporting success", async () => {
  const db = fakeSupabase();
  useSupabase(db);
  const response = await contactPOST(request(validBody()) as never);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(db.rows.length, 1);
  const row = db.rows[0];
  assert.equal(row.email, PII.email);
  assert.equal(row.source, "contact_form");
  assert.equal(row.consent_version, CONSENT_VERSION);
  assert.ok(typeof row.consent_at === "string");
  assert.equal(row.crm_status, "PENDING");
  assert.equal(row.crm_stage, "NEW_ENQUIRY");
  assert.equal(row.utm_campaign, "villa_q4");
  assert.equal(row.tracking_ref, "0123456789abcdef0123456789abcdef");
  assert.equal(afterCallbacks.length, 1, "CRM handoff is scheduled after the response");
});

test("contact: NEVER reports success when the database is not configured (regression for the old fake success)", async () => {
  useSupabase(null);
  const response = await contactPOST(request(validBody()) as never);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.match(body.error, /call \+974 7788 9033 or email info@openlimitsdesign\.com/);
  assert.equal(body.ok, undefined);
  assert.deepEqual(logs, ["[contact] lead not saved: STORE_NOT_CONFIGURED"]);
});

test("contact: database error and network failure both return 503 with the fallback, logging only a code", async () => {
  useSupabase(fakeSupabase("error"));
  const failed = await contactPOST(request(validBody()) as never);
  assert.equal(failed.status, 503);
  useSupabase(fakeSupabase("throw"));
  const unreachable = await contactPOST(request(validBody()) as never);
  assert.equal(unreachable.status, 503);
  assert.deepEqual(logs, ["[contact] lead not saved: DB_42P01", "[contact] lead not saved: STORE_UNREACHABLE"]);
});

test("contact: a retried submission (same idempotency key) is saved once and still reports success", async () => {
  const db = fakeSupabase();
  useSupabase(db);
  assert.equal((await contactPOST(request(validBody()) as never)).status, 200);
  assert.equal((await contactPOST(request(validBody()) as never)).status, 200);
  assert.equal(db.rows.length, 1);
});

test("contact: rejects missing consent, bad email, missing key, honeypot and bad JSON without saving or echoing values", async () => {
  const db = fakeSupabase();
  useSupabase(db);
  const cases: [unknown, string][] = [
    [validBody({ consent: false }), "consent"],
    [validBody({ consent: "true" }), "consent"],
    [validBody({ email: "not-an-email" }), "email"],
    [validBody({ idempotencyKey: "short" }), "idempotencyKey"],
    [validBody({ website: "http://spam.example" }), "honeypot"],
    [validBody({ phone: "" }), "phone"],
    [validBody({ message: "   " }), "message"]
  ];
  for (const [body, field] of cases) {
    const response = await contactPOST(request(body) as never);
    assert.equal(response.status, 400, field);
    const json = await response.json();
    assert.equal(json.field, field);
    for (const value of PII_VALUES) assert.ok(!JSON.stringify(json).toLowerCase().includes(value));
  }
  assert.equal((await contactPOST(request("{not json") as never)).status, 400);
  assert.equal(db.rows.length, 0);
});

test("attribution: malformed UTM values are dropped, tracking ref accepted only as 32 hex", () => {
  assert.deepEqual(parseAttribution({ utm_source: "<script>", utm_campaign: "ok_1", tracking_ref: "XYZ" }), {
    utm_source: null, utm_medium: null, utm_campaign: "ok_1", utm_content: null, tracking_ref: null
  });
  assert.equal(parseAttribution({ tracking_ref: "ABCDEF0123456789ABCDEF0123456789" }).tracking_ref, "abcdef0123456789abcdef0123456789");
  assert.throws(() => parseEnquiry({}, { requirePhone: false, requireMessage: false, requireProjectType: false }), EnquiryValidationError);
});

// ===================== outbox worker =====================

function lead(overrides: Partial<OutboxLead> = {}): OutboxLead {
  return {
    id: "lead-1", name: PII.name, email: PII.email, phone: PII.phone, project_type: "Interior Design", source: "contact_form", locale: "en",
    utm_campaign: "villa_q4", tracking_ref: "0123456789abcdef0123456789abcdef", crm_stage: "NEW_ENQUIRY", crm_attempts: 0,
    ghl_contact_id: null, ghl_opportunity_id: null, ...overrides
  };
}
function memoryStore(input: OutboxLead[]) {
  const rows = input as (OutboxLead & Record<string, unknown>)[];
  const patches: { id: string; patch: OutboxPatch }[] = [];
  const store: LeadStore = {
    async claimDue() { return rows.map((row) => ({ ...row })); },
    async update(id, patch) {
      patches.push({ id, patch });
      const row = rows.find((r) => r.id === id);
      if (row) Object.assign(row, patch);
    }
  };
  return { store, patches, rows };
}

const FIXED_NOW = new Date("2026-11-19T10:00:00.000Z");

test("outbox: finds-or-creates contact, creates opportunity in the configured stage, stores ids after each step, marks SYNCED", async () => {
  const { store, patches } = memoryStore([lead()]);
  const calls: string[] = [];
  const ghl = {
    async findOrCreateContact(c: { customFields: { id: string; field_value: string }[] }) { calls.push(`contact:${c.customFields.length}`); return { id: "contact-AAA111", created: true }; },
    async findOpportunity() { calls.push("find"); return null; },
    async createOpportunity(input: { stage: string }) { calls.push(`create:${input.stage}`); return "opp-BBB222"; }
  };
  const result = await processOutbox(store, ghl, { fieldIds: { project_type: "fieldPT001", ol_tracking_ref: "fieldTR001" }, now: () => FIXED_NOW });
  assert.deepEqual(result, { claimed: 1, synced: 1, retried: 0, needsReview: 0, errors: {} });
  // "Interior Design" has no GHL Project Type option, so only the tracking ref is sent.
  assert.deepEqual(calls, ["contact:1", "find", "create:NEW_ENQUIRY"]);
  assert.deepEqual(patches.map((p) => Object.keys(p.patch)[0]), ["ghl_contact_id", "ghl_opportunity_id", "crm_status"]);
  assert.equal(patches[2].patch.crm_status, "SYNCED");
});

test("outbox: GHL outage keeps the enquiry PENDING with backoff (nothing lost) and stops the batch", async () => {
  const { store, rows } = memoryStore([lead(), lead({ id: "lead-2" })]);
  let attempts = 0;
  const ghl = {
    async findOrCreateContact(): Promise<{ id: string; created: boolean }> { attempts += 1; throw new GhlHandoffError("GHL_UNAVAILABLE", 503); },
    async findOpportunity() { return null; },
    async createOpportunity() { return "x"; }
  };
  const result = await processOutbox(store, ghl, { now: () => FIXED_NOW });
  assert.equal(attempts, 1, "provider-wide failure stops the batch instead of hammering GHL");
  assert.equal(result.retried, 1);
  assert.equal(rows[0].crm_status, "PENDING");
  assert.equal(rows[0].crm_attempts, 1);
  assert.equal(rows[0].crm_last_error_code, "GHL_UNAVAILABLE");
  assert.equal(rows[0].crm_next_attempt_at, "2026-11-19T10:01:00.000Z");
  assert.equal(rows[1].crm_status, undefined, "second lead untouched, retried after its lease");
});

test("outbox: retry resumes from the saved contact id and reuses an existing open opportunity (no duplicates)", async () => {
  const { store, rows } = memoryStore([lead({ ghl_contact_id: "contact-AAA111", crm_attempts: 2 })]);
  const calls: string[] = [];
  const ghl = {
    async findOrCreateContact() { calls.push("contact"); return { id: "never", created: false }; },
    async findOpportunity(contactId: string) { calls.push(`find:${contactId}`); return "opp-EXISTING"; },
    async createOpportunity() { calls.push("create"); return "never"; }
  };
  await processOutbox(store, ghl, { now: () => FIXED_NOW });
  assert.deepEqual(calls, ["find:contact-AAA111"]);
  assert.equal(rows[0].ghl_opportunity_id, "opp-EXISTING");
  assert.equal(rows[0].crm_status, "SYNCED");
});

test("outbox: rate limit honours Retry-After; rejected payload and exhausted retries go to NEEDS_REVIEW", async () => {
  const limited = memoryStore([lead()]);
  await processOutbox(limited.store, { async findOrCreateContact(): Promise<{ id: string; created: boolean }> { throw new GhlHandoffError("GHL_RATE_LIMITED", 429, 600); }, async findOpportunity() { return null; }, async createOpportunity() { return "x"; } }, { now: () => FIXED_NOW });
  assert.equal(limited.rows[0].crm_next_attempt_at, "2026-11-19T10:10:00.000Z");

  const rejected = memoryStore([lead()]);
  await processOutbox(rejected.store, { async findOrCreateContact(): Promise<{ id: string; created: boolean }> { throw new GhlHandoffError("GHL_REJECTED", 422); }, async findOpportunity() { return null; }, async createOpportunity() { return "x"; } }, { now: () => FIXED_NOW });
  assert.equal(rejected.rows[0].crm_status, "NEEDS_REVIEW");

  const exhausted = memoryStore([lead({ crm_attempts: MAX_ATTEMPTS - 1 })]);
  await processOutbox(exhausted.store, { async findOrCreateContact(): Promise<{ id: string; created: boolean }> { throw new GhlHandoffError("GHL_TIMEOUT"); }, async findOpportunity() { return null; }, async createOpportunity() { return "x"; } }, { now: () => FIXED_NOW });
  assert.equal(exhausted.rows[0].crm_status, "NEEDS_REVIEW");
  assert.equal(exhausted.rows[0].crm_last_error_code, "GHL_TIMEOUT");
});

test("outbox: unknown errors are stored as a fixed code, never as their (possibly personal) message", async () => {
  const { store, rows } = memoryStore([lead()]);
  await processOutbox(store, { async findOrCreateContact(): Promise<{ id: string; created: boolean }> { throw new Error(`boom ${PII.email}`); }, async findOpportunity() { return null; }, async createOpportunity() { return "x"; } }, { now: () => FIXED_NOW });
  assert.equal(rows[0].crm_last_error_code, "HANDOFF_FAILED");
});

// ===================== GHL client =====================

const config: GhlHandoffConfig = {
  token: "pit-test-token-0000000000000000",
  locationId: "ya27Ye5RJURn4bLEfJu3",
  pipelineId: "PIPELINE0001",
  stageIds: { NEW_ENQUIRY: "stage-new-001", CONSULTATION_BOOKED: "stage-consult-001" },
  fieldIds: {}
};

test("ghl config: disabled by default and when any required id is missing", () => {
  assert.equal(ghlHandoffConfig({}, "APPROVED"), null);
  const full = { GHL_HANDOFF_ENABLED: "true", GHL_PRIVATE_INTEGRATION_TOKEN: config.token, GHL_LOCATION_ID: config.locationId, GHL_PIPELINE_ID: config.pipelineId, GHL_STAGE_NEW_ENQUIRY_ID: "stage-new-001", GHL_STAGE_CONSULTATION_BOOKED_ID: "stage-consult-001" };
  assert.ok(ghlHandoffConfig(full, "APPROVED"));
  assert.equal(ghlHandoffConfig(full), null, "privacy notice still DRAFT, so the handoff stays off even with the switch on");
  assert.equal(ghlHandoffConfig({ ...full, GHL_HANDOFF_ENABLED: "1" }, "APPROVED"), null);
  assert.equal(ghlHandoffConfig({ ...full, GHL_PIPELINE_ID: "" }, "APPROVED"), null);
});

test("ghl client: sends only the three allowed calls to the official origin with version header; maps errors to codes", async () => {
  const seen: { method: string; url: string; auth: string | null; version: string | null; body: unknown }[] = [];
  const fakeFetch = (async (url: URL, init: RequestInit) => {
    const headers = new Headers(init.headers);
    seen.push({ method: init.method ?? "GET", url: String(url), auth: headers.get("authorization"), version: headers.get("version"), body: init.body ? JSON.parse(String(init.body)) : null });
    if (String(url).includes("/contacts/search/duplicate")) return Response.json({ contact: null });
    if (String(url).endsWith("/contacts/")) return Response.json({ contact: { id: "contact-AAA111" } });
    if (String(url).includes("/opportunities/search")) return Response.json({ opportunities: [] });
    return Response.json({ opportunity: { id: "opp-BBB222" } });
  }) as unknown as typeof fetch;
  const client = new GhlHandoffClient(config, fakeFetch);
  assert.deepEqual(await client.findOrCreateContact({ name: PII.name, email: PII.email, phone: PII.phone, source: "Website contact form", customFields: [] }), { id: "contact-AAA111", created: true });
  assert.equal(await client.findOpportunity("contact-AAA111"), null);
  assert.equal(await client.createOpportunity({ contactId: "contact-AAA111", stage: "CONSULTATION_BOOKED", name: "n", source: "s" }), "opp-BBB222");
  assert.deepEqual(seen.map((s) => `${s.method} ${new URL(s.url).origin}${new URL(s.url).pathname}`), [
    "GET https://services.leadconnectorhq.com/contacts/search/duplicate",
    "GET https://services.leadconnectorhq.com/contacts/search/duplicate",
    "POST https://services.leadconnectorhq.com/contacts/",
    "GET https://services.leadconnectorhq.com/opportunities/search",
    "POST https://services.leadconnectorhq.com/opportunities/"
  ]);
  assert.ok(seen.every((s) => s.auth === `Bearer ${config.token}` && s.version === "2021-07-28"));
  assert.equal(new URL(seen[0].url).searchParams.get("email"), PII.email);
  assert.equal(new URL(seen[1].url).searchParams.get("number"), "+97455501234");
  assert.equal((seen[2].body as { tags?: unknown }).tags, undefined, "create must not send tags");
  assert.equal((seen[4].body as { pipelineStageId: string }).pipelineStageId, "stage-consult-001");
  const search = new URL(seen[3].url).searchParams;
  assert.equal(search.get("status"), "open");
  assert.equal(search.get("locationId"), config.locationId, "camelCase params (snake_case location_id is rejected live with 422)");
  assert.equal(search.get("contactId"), "contact-AAA111");
  assert.equal(search.get("pipelineId"), config.pipelineId);
  assert.equal(search.get("location_id"), null);

  const failing = (status: number, headers: Record<string, string> = {}) =>
    new GhlHandoffClient(config, (async () => new Response(`{"message":"bad ${PII.email}"}`, { status, headers })) as unknown as typeof fetch);
  const codeOf = async (client: GhlHandoffClient) => client.findOpportunity("c").then(() => "none", (e: GhlHandoffError) => `${e.code}:${e.retryable}:${e.retryAfterSeconds}:${e.message}`);
  assert.equal(await codeOf(failing(401)), "GHL_AUTH:true:null:GHL_AUTH");
  assert.equal(await codeOf(failing(429, { "retry-after": "30" })), "GHL_RATE_LIMITED:true:30:GHL_RATE_LIMITED");
  assert.equal(await codeOf(failing(502)), "GHL_UNAVAILABLE:true:null:GHL_UNAVAILABLE");
  assert.equal(await codeOf(failing(422)), "GHL_REJECTED:false:null:GHL_REJECTED");
  const offline = new GhlHandoffClient(config, (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch);
  assert.equal(await codeOf(offline), "GHL_UNAVAILABLE:true:null:GHL_UNAVAILABLE");
});

// ===================== cron route =====================

test("cron route: requires a long CRON_SECRET bearer token; disabled handoff does nothing", async () => {
  const call = (auth?: string) => cronGET(new Request("http://localhost/api/crm/handoff", { headers: auth ? { authorization: auth } : {} }) as never);
  delete process.env.CRON_SECRET;
  assert.equal((await call("Bearer anything")).status, 401);
  process.env.CRON_SECRET = "s".repeat(48);
  assert.equal((await call()).status, 401);
  assert.equal((await call(`Bearer ${"t".repeat(48)}`)).status, 401);
  const ok = await call(`Bearer ${"s".repeat(48)}`);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { state: "DISABLED" });
  delete process.env.CRON_SECRET;
});

test("ghl client: an enquiry using an existing client's email NEVER modifies that contact (no create/update/upsert)", async () => {
  const methods: string[] = [];
  const fakeFetch = (async (url: URL, init: RequestInit) => {
    methods.push(`${init.method} ${new URL(String(url)).pathname}`);
    return Response.json({ contact: { id: "contact-EXISTING1" } });
  }) as unknown as typeof fetch;
  const result = await new GhlHandoffClient(config, fakeFetch).findOrCreateContact({ name: "Impostor", email: PII.email, phone: "+974 0000 0000", source: "s", customFields: [{ id: "fieldPT001", field_value: "x" }] });
  assert.deepEqual(result, { id: "contact-EXISTING1", created: false });
  assert.deepEqual(methods, ["GET /contacts/search/duplicate"], "only a lookup; no write to the contact");
});

test("ghl client: losing a create race falls back to the contact that now exists", async () => {
  let lookups = 0;
  const fakeFetch = (async (url: URL, init: RequestInit) => {
    if (init.method === "POST") return new Response("{}", { status: 400 });
    lookups += 1;
    return Response.json({ contact: lookups > 2 ? { id: "contact-RACED01" } : null });
  }) as unknown as typeof fetch;
  const result = await new GhlHandoffClient(config, fakeFetch).findOrCreateContact({ name: "n", email: PII.email, phone: PII.phone, source: "s", customFields: [] });
  assert.deepEqual(result, { id: "contact-RACED01", created: false });
});

test("outbox: field values use the exact GHL option labels and the opportunity carries the tracking ref", async () => {
  const contactFields: { id: string; field_value: string }[][] = [];
  const oppFields: { id: string; field_value: string }[][] = [];
  const ghl = {
    async findOrCreateContact(c: { customFields: { id: string; field_value: string }[] }) { contactFields.push(c.customFields); return { id: "contact-AAA111", created: true }; },
    async findOpportunity() { return null; },
    async createOpportunity(input: { customFields: { id: string; field_value: string }[] }) { oppFields.push(input.customFields); return "opp-BBB222"; }
  };
  const ids = { project_type: "fPT", lead_source: "fLS", utm_campaign: "fUC", ol_tracking_ref: "fTR", preferred_language: "fPL", opportunity_tracking_ref: "fOTR" };
  await processOutbox(memoryStore([lead({ project_type: "Furniture Supply", source: "booking", locale: "ar" })]).store, ghl, { fieldIds: ids, now: () => FIXED_NOW });
  assert.deepEqual(Object.fromEntries(contactFields[0].map((f) => [f.id, f.field_value])), {
    fPT: "FF&E / Furniture", fLS: "Website booking", fUC: "villa_q4", fTR: "0123456789abcdef0123456789abcdef", fPL: "Arabic"
  });
  assert.deepEqual(oppFields[0], [{ id: "fOTR", field_value: "0123456789abcdef0123456789abcdef" }]);
});
