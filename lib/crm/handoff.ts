import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { GhlHandoffClient, ghlControlledTestConfig, ghlHandoffConfig, ghlReadiness } from "./ghl";
import { processOutbox, type LeadStore, type OutboxLead, type OutboxResult } from "./outbox";

const OUTBOX_COLUMNS =
  "id,name,email,phone,project_type,source,locale,utm_campaign,tracking_ref,crm_stage,crm_attempts,ghl_contact_id,ghl_opportunity_id";

const pick = (row: Record<string, unknown>) =>
  Object.fromEntries(OUTBOX_COLUMNS.split(",").map((key) => [key, row[key] ?? null])) as unknown as OutboxLead;

export function supabaseLeadStore(supabase: SupabaseClient): LeadStore {
  return {
    async claimDue(batchSize, leaseSeconds) {
      const { data, error } = await supabase.rpc("claim_crm_handoff", { batch_size: batchSize, lease_seconds: leaseSeconds });
      if (error) throw Object.assign(new Error("STORE_CLAIM_FAILED"), { code: "STORE_CLAIM_FAILED" });
      return ((data ?? []) as Record<string, unknown>[]).map(pick);
    },
    async update(id, patch) {
      const { error } = await supabase.from("leads").update(patch).eq("id", id);
      if (error) throw Object.assign(new Error("STORE_UPDATE_FAILED"), { code: "STORE_UPDATE_FAILED" });
    }
  };
}

/** Synthetic identities used for controlled production tests: reserved example.com address and a "TEST " name. */
export const CONTROLLED_TEST_EMAIL = /^ol-ghl-test-[a-z0-9]{4,24}@example\.com$/;
export function isControlledTestLead(lead: { name: string | null; email: string | null }) {
  return Boolean(lead.email && CONTROLLED_TEST_EMAIL.test(lead.email) && lead.name?.startsWith("TEST "));
}

/**
 * Store for the controlled TEST lane: claims ONLY synthetic TEST leads and refuses to update any
 * other row. Real enquiries are never read into the worker, leased or modified by this lane.
 */
export function controlledTestLeadStore(supabase: SupabaseClient, now: () => Date = () => new Date()): LeadStore {
  const claimed = new Set<string>();
  return {
    async claimDue(batchSize, leaseSeconds) {
      const at = now();
      const { data, error } = await supabase
        .from("leads")
        .select(`${OUTBOX_COLUMNS},crm_next_attempt_at,crm_lease_until`)
        .eq("crm_status", "PENDING")
        .like("email", "ol-ghl-test-%@example.com")
        .like("name", "TEST %")
        .limit(Math.min(Math.max(batchSize, 1), 25));
      if (error) throw Object.assign(new Error("STORE_CLAIM_FAILED"), { code: "STORE_CLAIM_FAILED" });
      const due = ((data ?? []) as Record<string, unknown>[]).filter((row) => {
        const next = row.crm_next_attempt_at ? Date.parse(String(row.crm_next_attempt_at)) : 0;
        const lease = row.crm_lease_until ? Date.parse(String(row.crm_lease_until)) : 0;
        return next <= at.getTime() && lease < at.getTime() && isControlledTestLead(row as OutboxLead);
      });
      if (!due.length) return [];
      const ids = due.map((row) => String(row.id));
      const until = new Date(at.getTime() + Math.min(Math.max(leaseSeconds, 30), 900) * 1000).toISOString();
      const { error: leaseError } = await supabase.from("leads").update({ crm_lease_until: until }).in("id", ids);
      if (leaseError) throw Object.assign(new Error("STORE_CLAIM_FAILED"), { code: "STORE_CLAIM_FAILED" });
      ids.forEach((id) => claimed.add(id));
      // The phone is never sent from the TEST lane: a made-up number could match a real GHL contact
      // in the duplicate lookup. TEST contacts are identified by their reserved email only.
      return due.map((row) => ({ ...pick(row), phone: null }));
    },
    async update(id, patch) {
      if (!claimed.has(id)) throw Object.assign(new Error("STORE_UPDATE_FAILED"), { code: "STORE_UPDATE_FAILED" });
      const { error } = await supabase.from("leads").update(patch).eq("id", id);
      if (error) throw Object.assign(new Error("STORE_UPDATE_FAILED"), { code: "STORE_UPDATE_FAILED" });
    }
  };
}

export type HandoffRun = { state: "DISABLED" | "STORE_UNAVAILABLE" | "RAN" | "TEST_LANE" | "FAILED"; result?: OutboxResult; code?: string; readiness?: ReturnType<typeof ghlReadiness> };

/**
 * TEST lane only (synthetic data): log GHL rejections with method, path (no query string), status
 * and GHL's message so contract mismatches can be diagnosed. Never used for real leads, whose
 * logs stay code-only.
 */
const testLaneFetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    let message = "";
    try {
      message = JSON.stringify(await response.clone().json()).slice(0, 500);
    } catch {
      message = "(non-JSON body)";
    }
    console.warn("[crm-handoff:test-lane] GHL rejected", init?.method ?? "GET", new URL(String(input)).pathname, response.status, message);
  }
  return response;
}) as typeof fetch;

const simulatedOutage = (async () => {
  throw new TypeError("simulated network failure");
}) as unknown as typeof fetch;

/**
 * Safe to call from after() and from the cron route. Does nothing unless the live handoff is fully
 * enabled, or the controlled TEST lane is on (then only synthetic TEST leads are processed).
 * `simulateOutage` applies to the TEST lane only and makes every GHL call fail as a network error.
 */
export async function runCrmHandoff(batchSize = 10, options: { simulateOutage?: boolean } = {}): Promise<HandoffRun> {
  const live = ghlHandoffConfig();
  const test = live ? null : ghlControlledTestConfig();
  const config = live ?? test;
  if (!config) return { state: "DISABLED" };
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { state: "STORE_UNAVAILABLE" };
  const store = live ? supabaseLeadStore(supabase) : controlledTestLeadStore(supabase);
  const client = new GhlHandoffClient(config, test ? (options.simulateOutage ? simulatedOutage : testLaneFetch) : fetch);
  try {
    const result = await processOutbox(store, client, { fieldIds: config.fieldIds, batchSize });
    if (result.claimed) console.info(live ? "[crm-handoff]" : "[crm-handoff:test-lane]", JSON.stringify(result));
    return { state: live ? "RAN" : "TEST_LANE", result };
  } catch (error) {
    const code = (error as { code?: string }).code ?? "HANDOFF_FAILED";
    console.error("[crm-handoff] run failed:", code);
    return { state: "FAILED", code };
  }
}
