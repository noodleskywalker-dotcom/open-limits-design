import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { GhlHandoffClient, ghlHandoffConfig } from "./ghl";
import { processOutbox, type LeadStore, type OutboxLead, type OutboxResult } from "./outbox";

const OUTBOX_COLUMNS =
  "id,name,email,phone,project_type,source,locale,utm_campaign,tracking_ref,crm_stage,crm_attempts,ghl_contact_id,ghl_opportunity_id";

export function supabaseLeadStore(supabase: SupabaseClient): LeadStore {
  return {
    async claimDue(batchSize, leaseSeconds) {
      const { data, error } = await supabase.rpc("claim_crm_handoff", { batch_size: batchSize, lease_seconds: leaseSeconds });
      if (error) throw Object.assign(new Error("STORE_CLAIM_FAILED"), { code: "STORE_CLAIM_FAILED" });
      return ((data ?? []) as Record<string, unknown>[]).map((row) =>
        Object.fromEntries(OUTBOX_COLUMNS.split(",").map((key) => [key, row[key] ?? null])) as unknown as OutboxLead
      );
    },
    async update(id, patch) {
      const { error } = await supabase.from("leads").update(patch).eq("id", id);
      if (error) throw Object.assign(new Error("STORE_UPDATE_FAILED"), { code: "STORE_UPDATE_FAILED" });
    }
  };
}

export type HandoffRun = { state: "DISABLED" | "STORE_UNAVAILABLE" | "RAN" | "FAILED"; result?: OutboxResult; code?: string };

/** Safe to call from after() and from the cron route. Does nothing unless GHL_HANDOFF_ENABLED=true and fully configured. */
export async function runCrmHandoff(batchSize = 10): Promise<HandoffRun> {
  const config = ghlHandoffConfig();
  if (!config) return { state: "DISABLED" };
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { state: "STORE_UNAVAILABLE" };
  try {
    const result = await processOutbox(supabaseLeadStore(supabase), new GhlHandoffClient(config), { fieldIds: config.fieldIds, batchSize });
    if (result.claimed) console.info("[crm-handoff]", JSON.stringify(result));
    return { state: "RAN", result };
  } catch (error) {
    const code = (error as { code?: string }).code ?? "HANDOFF_FAILED";
    console.error("[crm-handoff] run failed:", code);
    return { state: "FAILED", code };
  }
}
