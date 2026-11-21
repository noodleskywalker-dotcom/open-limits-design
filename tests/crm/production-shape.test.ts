// Migration rehearsal on the REAL production schema (fixture rebuilt from the live catalog, no data):
// applies crm_leads_schema_alignment.sql -> crm_handoff_outbox.sql -> crm_lead_access_controls.sql twice,
// then checks that legacy data survives, the live code paths still insert, and every access rule holds.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { leadRow, parseEnquiry } from "../../lib/crm/enquiry";

const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const MIGRATIONS = ["crm_leads_schema_alignment.sql", "crm_handoff_outbox.sql", "crm_lead_access_controls.sql"].map(
  (name) => file(`supabase/migrations/${name}`)
);
const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
// Owner email exactly as the repository seeds it (not duplicated here).
const ownerEmail = /insert into public\.admin_users \(email\)\s*values \('([^']+)'\)/i.exec(file("supabase/migrations/restore_open_limits.sql"))![1];
let db: PGlite;
let legacyLead = "";
let booking = "";

type Who = { role: "anon" | "authenticated" | "service_role"; sub?: string };
async function as<T>(who: Who, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${who.role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)", [who.sub ?? "", who.role]);
    return fn(tx);
  });
}
const denied = (promise: Promise<unknown>, why?: string) =>
  assert.rejects(promise, (e: Error) => /permission denied|row-level security|NOT_AUTHORIZED/i.test(e.message), why);
const rows = (who: Who, sql: string) => as(who, (tx) => tx.query(sql)).then((r) => r.rows.length, () => 0);
const anon: Who = { role: "anon" };
const user: Who = { role: "authenticated", sub: USER };
const owner: Who = { role: "authenticated", sub: OWNER };
const server: Who = { role: "service_role" };

before(async () => {
  db = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
  await db.exec(file("tests/crm/supabase-stub.sql").replace(/-- CMS tables that pre-date[\s\S]*$/, ""));
  await db.exec(file("tests/crm/fixtures/production-schema-2026-11-21.sql"));
  await db.query("insert into auth.users values ($1, $2, now()), ($3, 'someone@example.test', now())", [OWNER, ownerEmail.toUpperCase(), USER]);
  // Legacy rows in the old production shape, inserted before the migrations.
  legacyLead = (await db.query<{ id: string }>(
    "insert into public.leads (session_id, name, email, project_type, estimated_budget, status, notes) values ('s-1','Legacy Fixture','legacy@example.test','Villa','500k','new','kept') returning id"
  )).rows[0].id;
  booking = (await db.query<{ id: string }>(
    "insert into public.bookings (client_name, client_email, booking_date, start_time, end_time, status) values ('Fixture','fixture@example.test','2030-01-06','10:00','11:00','pending') returning id"
  )).rows[0].id;
  for (let round = 0; round < 2; round++) for (const sql of MIGRATIONS) await db.exec(sql);
});

test("legacy production data is untouched and the owner (only) became a CRM admin", async () => {
  const legacy = await db.query<Record<string, unknown>>("select session_id, name, estimated_budget, status, notes, crm_status, message, source from public.leads where id = $1", [legacyLead]);
  assert.deepEqual(legacy.rows[0], { session_id: "s-1", name: "Legacy Fixture", estimated_budget: "500k", status: "new", notes: "kept", crm_status: "NOT_QUEUED", message: null, source: "contact_form" });
  const admins = await db.query<{ id: string; role: string }>("select id, role from public.admin_users");
  assert.deepEqual(admins.rows, [{ id: OWNER, role: "owner" }], "seed is idempotent across both rounds");
  assert.equal((await db.query("select 1 from public.bookings where id = $1 and status = 'pending'", [booking])).rows.length, 1);
});

test("every legacy policy is gone; exactly the intended policies remain", async () => {
  const policies = await db.query<{ t: string; p: string }>(
    "select tablename as t, policyname as p from pg_policies where schemaname='public' and tablename in ('leads','bookings','blocked_times') order by 1,2"
  );
  assert.deepEqual(policies.rows, [
    { t: "blocked_times", p: "Admins can manage blocked times" },
    { t: "blocked_times", p: "Public can read blocked times" },
    { t: "bookings", p: "Admins can read bookings" }
  ]);
});

test("live code paths still insert through the server: current main (message/source) and the new CRM row", async () => {
  await as(server, (tx) => tx.query("insert into public.leads (name, phone, email, project_type, message, source) values ('Main Shape','+97400000000','main@example.test','Villa','hello','contact_form')"));
  const input = parseEnquiry(
    { idempotencyKey: "4f1c2b8a-9d3e-4a6b-8c7d-1e2f3a4b5c6d", name: "CRM Shape", email: "crm@example.test", phone: "+974 5550 0000", projectType: "Fit-Out", message: "Brief", consent: true },
    { requirePhone: true, requireMessage: true, requireProjectType: true }
  );
  const row = leadRow(input, "contact_form", "NEW_ENQUIRY", new Date());
  const keys = Object.keys(row);
  const inserted = await as(server, (tx) =>
    tx.query<{ crm_status: string }>(`insert into public.leads (${keys.join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")}) returning crm_status`, Object.values(row))
  );
  assert.equal(inserted.rows[0].crm_status, "PENDING");
  await as(server, (tx) => tx.query("insert into public.bookings (client_name, client_email, booking_date, start_time, end_time, status) values ('B','b@example.test','2030-01-07','10:00','11:00','pending')"));
});

test("anonymous and ordinary signed-in users: no lead read/insert, no booking changes, no admin functions, no self-promotion", async () => {
  for (const who of [anon, user]) {
    assert.equal(await rows(who, "select * from public.leads"), 0);
    await denied(as(who, (tx) => tx.query("insert into public.leads (name, email) values ('x','x@example.test')")));
    await denied(as(who, (tx) => tx.query("insert into public.bookings (client_name, client_email, booking_date, start_time, end_time) values ('x','x@example.test','2030-02-01','10:00','11:00')")));
    await denied(as(who, (tx) => tx.query("update public.bookings set status = 'confirmed'")));
    assert.equal(await rows(who, "select * from public.bookings"), 0);
    for (const fn of ["admin_read_leads($1)", "admin_export_leads($1)"]) await denied(as(who, (tx) => tx.query(`select * from public.${fn}`, [OWNER])));
    await denied(as(who, (tx) => tx.query("select * from public.admin_set_booking_status($1, $2, 'confirmed')", [OWNER, booking])));
    assert.equal(await rows(who, "select * from public.lead_access_audit"), 0);
    await denied(as(who, (tx) => tx.query("delete from public.lead_access_audit")));
  }
  await assert.rejects(as(user, (tx) => tx.query("insert into public.admin_users (id, email) values ($1, 'someone@example.test')", [USER])));
  assert.ok((await rows(anon, "select * from public.blocked_times")) >= 0, "public read of blocked times still allowed");
  await denied(as(anon, (tx) => tx.query("insert into public.blocked_times (title, date) values ('x','2030-01-08')")));
});

test("owner: reads bookings directly; leads only via audited server functions; status changes audited; audit append-only", async () => {
  assert.ok((await rows(owner, "select id from public.bookings")) >= 2);
  assert.equal(await rows(owner, "select * from public.leads"), 0, "no direct lead table access even for admins");
  const viewed = await as(server, (tx) => tx.query("select id from public.admin_read_leads($1, 10)", [OWNER]));
  assert.ok(viewed.rows.length >= 3);
  await denied(as(server, (tx) => tx.query("select * from public.admin_read_leads($1)", [USER])));
  const exported = await as(server, (tx) => tx.query("select id from public.admin_export_leads($1)", [OWNER]));
  assert.equal(exported.rows.length, viewed.rows.length);
  const changed = await as(server, (tx) => tx.query<{ status: string }>("select status from public.admin_set_booking_status($1, $2, 'confirmed')", [OWNER, booking]));
  assert.equal(changed.rows[0].status, "confirmed");
  const audit = await as(server, (tx) => tx.query<{ action: string; actor_user_id: string; subject_type: string }>("select action, actor_user_id, subject_type from public.lead_access_audit"));
  assert.deepEqual([...new Set(audit.rows.map((r) => `${r.subject_type}:${r.action}`))].sort(), ["booking:STATUS_CHANGE", "lead:EXPORT", "lead:VIEW"]);
  assert.ok(audit.rows.every((r) => r.actor_user_id === OWNER));
  await assert.rejects(as(server, (tx) => tx.query("update public.lead_access_audit set action = 'VIEW'")), /append-only/);
  const retention = await db.query<{ status: string }>("select distinct status from public.data_retention_policy");
  assert.deepEqual(retention.rows, [{ status: "RETENTION_POLICY_PENDING_BUSINESS_APPROVAL" }]);
});
