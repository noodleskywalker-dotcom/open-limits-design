// Database authorization tests: applies the REAL migration files (existing schema +
// crm_handoff_outbox.sql + crm_lead_access_controls.sql) to an in-process Postgres
// (PGlite) and checks what anon users, ordinary signed-in users, admins and the
// website server (service role) can do. Run: npm run test:crm
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { CONSENT_VERSION, leadRow, parseEnquiry } from "../../lib/crm/enquiry";

const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const ADMIN = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const UNCONFIRMED_ADMIN_EMAIL = "33333333-3333-4333-8333-333333333333";
let db: PGlite;
let leadId = "";
let bookingId = "";

type Who = { role: "anon" | "authenticated" | "service_role"; sub?: string };
async function as<T>(who: Who, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${who.role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)", [who.sub ?? "", who.role]);
    return fn(tx);
  });
}
const denied = async (promise: Promise<unknown>, why?: string) => {
  await assert.rejects(promise, (error: Error) => /permission denied|row-level security|NOT_AUTHORIZED/i.test(error.message), why);
};
const anon: Who = { role: "anon" };
const user: Who = { role: "authenticated", sub: USER };
const admin: Who = { role: "authenticated", sub: ADMIN };
const impostor: Who = { role: "authenticated", sub: UNCONFIRMED_ADMIN_EMAIL };
const server: Who = { role: "service_role" };

before(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(file("tests/crm/supabase-stub.sql"));
  await db.exec(file("supabase/migrations/restore_open_limits.sql"));
  await db.exec(file("supabase/migrations/crm_handoff_outbox.sql"));
  await db.exec(file("supabase/migrations/crm_lead_access_controls.sql"));
  // Seeded admin (restore_open_limits.sql) with a confirmed account; a second account
  // with an UNconfirmed lookalike of an admin email; one ordinary user.
  await db.exec(`
    insert into public.admin_users (email) values ('owner.fixture@example.test');
    insert into auth.users values ('${ADMIN}', 'Owner.Fixture@example.test', now());
    insert into auth.users values ('${USER}', 'someone@example.test', now());
    insert into public.admin_users (email) values ('pending.admin@example.test');
    insert into auth.users values ('${UNCONFIRMED_ADMIN_EMAIL}', 'pending.admin@example.test', null);
  `);
});

test("website server path (service role) still creates a valid, consented, queued enquiry", async () => {
  const input = parseEnquiry(
    { idempotencyKey: "0b8f6a2e-4f7c-4b55-9a3e-2f1f0c9d7e11", name: "Fixture Person", email: "fixture@example.test", phone: "+974 5550 1234", projectType: "Fit-Out", message: "Brief", consent: true },
    { requirePhone: true, requireMessage: true, requireProjectType: true }
  );
  const row = leadRow(input, "contact_form", "NEW_ENQUIRY", new Date());
  const keys = Object.keys(row);
  const inserted = await as(server, (tx) =>
    tx.query<{ id: string; crm_status: string; consent_version: string }>(
      `insert into public.leads (${keys.join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")}) returning id, crm_status, consent_version`,
      Object.values(row)
    )
  );
  leadId = inserted.rows[0].id;
  assert.equal(inserted.rows[0].crm_status, "PENDING");
  assert.equal(inserted.rows[0].consent_version, CONSENT_VERSION);
  // Same idempotency key twice → unique violation (the route reports it as a successful replay).
  await assert.rejects(as(server, (tx) => tx.query(`insert into public.leads (idempotency_key, name, email, source) values ($1,'x','x@example.test','contact_form')`, [row.idempotency_key])), /duplicate key/);
  // Handoff cannot be queued without consent.
  await assert.rejects(as(server, (tx) => tx.query(`insert into public.leads (name, email, crm_status) values ('x','x@example.test','PENDING')`)), /leads_crm_consent_check/);
  const claimed = await as(server, (tx) => tx.query<{ id: string }>("select id from public.claim_crm_handoff(5, 60)"));
  assert.deepEqual(claimed.rows.map((r) => r.id), [leadId]);
});

test("leads: anonymous and ordinary signed-in users cannot read or insert", async () => {
  for (const who of [anon, user, impostor]) {
    const read = await as(who, (tx) => tx.query("select * from public.leads")).then((r) => r.rows.length, (e: Error) => e);
    assert.ok(read === 0 || read instanceof Error, `${who.role}/${who.sub} must not see leads`);
    await denied(as(who, (tx) => tx.query("insert into public.leads (name, email) values ('spam','spam@example.test')")));
    await denied(as(who, (tx) => tx.query("update public.leads set crm_status = 'SYNCED'")));
  }
});

test("leads: even an admin has no direct table access; admin reads go through audited functions", async () => {
  const direct = await as(admin, (tx) => tx.query("select * from public.leads")).then((r) => r.rows.length, () => 0);
  assert.equal(direct, 0);
  for (const fn of ["admin_read_leads($1)", "admin_export_leads($1)"]) {
    await denied(as(user, (tx) => tx.query(`select * from public.${fn}`, [USER])));
    await denied(as(admin, (tx) => tx.query(`select * from public.${fn}`, [ADMIN])), "callable only by the server");
  }
});

test("admin access works through the server and every VIEW / EXPORT is audited without PII", async () => {
  const viewed = await as(server, (tx) => tx.query<{ id: string; email: string }>("select id, email from public.admin_read_leads($1, 10)", [ADMIN]));
  assert.deepEqual(viewed.rows.map((r) => r.id), [leadId]);
  const exported = await as(server, (tx) => tx.query("select id from public.admin_export_leads($1)", [ADMIN]));
  assert.equal(exported.rows.length, 1);
  await denied(as(server, (tx) => tx.query("select * from public.admin_read_leads($1)", [USER])));
  await denied(as(server, (tx) => tx.query("select * from public.admin_read_leads($1)", [UNCONFIRMED_ADMIN_EMAIL])));
  const audit = await as(server, (tx) => tx.query<Record<string, unknown>>("select * from public.lead_access_audit order by id"));
  assert.deepEqual(audit.rows.map((r) => [r.actor_user_id, r.subject_type, r.subject_id, r.action]), [
    [ADMIN, "lead", leadId, "VIEW"],
    [ADMIN, "lead", leadId, "EXPORT"]
  ]);
  assert.ok(audit.rows.every((r) => r.created_at instanceof Date));
  assert.deepEqual(Object.keys(audit.rows[0]).sort(), ["action", "actor_user_id", "created_at", "detail", "id", "subject_id", "subject_type"]);
  await assert.rejects(as(server, (tx) => tx.query("delete from public.lead_access_audit")), /append-only/);
  await assert.rejects(as(server, (tx) => tx.query("update public.lead_access_audit set action = 'VIEW'")), /append-only/);
});

test("lead status change (NEEDS_REVIEW → PENDING) is admin-only and audited", async () => {
  await as(server, (tx) => tx.query("update public.leads set crm_status = 'NEEDS_REVIEW', crm_last_error_code = 'GHL_REJECTED' where id = $1", [leadId]));
  await denied(as(server, (tx) => tx.query("select public.admin_requeue_lead($1, $2)", [USER, leadId])));
  const ok = await as(server, (tx) => tx.query<{ ok: boolean }>("select public.admin_requeue_lead($1, $2) as ok", [ADMIN, leadId]));
  assert.equal(ok.rows[0].ok, true);
  const audit = await as(server, (tx) => tx.query<{ action: string; detail: string }>("select action, detail from public.lead_access_audit where action = 'STATUS_CHANGE'"));
  assert.deepEqual(audit.rows, [{ action: "STATUS_CHANGE", detail: "NEEDS_REVIEW:PENDING" }]);
});

test("bookings: public and ordinary users cannot read or change; admins read; accept/reject is admin-only and audited", async () => {
  const created = await as(server, (tx) =>
    tx.query<{ id: string }>("insert into public.bookings (client_name, client_email, booking_date, start_time, end_time) values ('Fixture','fixture@example.test','2030-01-06','10:00','11:00') returning id")
  );
  bookingId = created.rows[0].id;
  for (const who of [anon, user, impostor]) {
    const seen = await as(who, (tx) => tx.query("select * from public.bookings")).then((r) => r.rows.length, () => 0);
    assert.equal(seen, 0, `${who.role}/${who.sub} must not see bookings`);
    await denied(as(who, (tx) => tx.query("update public.bookings set status = 'confirmed'")));
    await denied(as(who, (tx) => tx.query("insert into public.bookings (client_name, client_email, booking_date, start_time, end_time) values ('x','x@example.test','2030-01-07','10:00','11:00')")));
  }
  const adminSees = await as(admin, (tx) => tx.query("select id from public.bookings"));
  assert.equal(adminSees.rows.length, 1, "admin booking panel keeps working");
  await denied(as(admin, (tx) => tx.query("update public.bookings set status = 'confirmed'")), "status changes only via the audited server path");
  await denied(as(server, (tx) => tx.query("select * from public.admin_set_booking_status($1, $2, 'confirmed')", [USER, bookingId])));
  const changed = await as(server, (tx) => tx.query<{ status: string }>("select status from public.admin_set_booking_status($1, $2, 'confirmed')", [ADMIN, bookingId]));
  assert.equal(changed.rows[0].status, "confirmed");
  const audit = await as(server, (tx) => tx.query("select subject_type, action, detail from public.lead_access_audit where subject_type = 'booking'"));
  assert.deepEqual(audit.rows, [{ subject_type: "booking", action: "STATUS_CHANGE", detail: "confirmed" }]);
  const blockedByUser = await as(user, (tx) => tx.query("insert into public.blocked_times (title, date) values ('x','2030-01-08')")).then(() => "inserted", () => "denied");
  assert.equal(blockedByUser, "denied");
});

test("retention: policy is PENDING business approval, so redaction changes nothing", async () => {
  const policy = await as(server, (tx) => tx.query("select subject, status, retention_days from public.data_retention_policy order by subject"));
  assert.deepEqual(policy.rows, [
    { subject: "bookings", status: "RETENTION_POLICY_PENDING_BUSINESS_APPROVAL", retention_days: null },
    { subject: "leads", status: "RETENTION_POLICY_PENDING_BUSINESS_APPROVAL", retention_days: null }
  ]);
  await as(server, (tx) => tx.query("update public.leads set crm_status = 'SYNCED', crm_synced_at = now() - interval '5 years' where id = $1", [leadId]));
  const redacted = await as(server, (tx) => tx.query<{ n: number }>("select public.redact_synced_leads() as n"));
  assert.equal(redacted.rows[0].n, 0);
  const still = await as(server, (tx) => tx.query<{ email: string }>("select email from public.leads where id = $1", [leadId]));
  assert.equal(still.rows[0].email, "fixture@example.test");
  await assert.rejects(as(server, (tx) => tx.query("update public.data_retention_policy set status = 'APPROVED' where subject = 'leads'")), /check constraint/);
});
