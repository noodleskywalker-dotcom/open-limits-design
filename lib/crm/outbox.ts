/**
 * Outbox worker: moves durably-saved website enquiries into GoHighLevel.
 * Pure orchestration over two ports (LeadStore, GhlPort) so it is testable
 * without Supabase or GHL. Logs and stored errors contain codes only — no PII.
 */
import type { CrmStage } from "./enquiry";

export type OutboxLead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  project_type: string | null;
  source: string;
  locale: string | null;
  utm_campaign: string | null;
  tracking_ref: string | null;
  crm_stage: CrmStage | null;
  crm_attempts: number;
  ghl_contact_id: string | null;
  ghl_opportunity_id: string | null;
};

export type OutboxPatch = Partial<{
  crm_status: "PENDING" | "SYNCED" | "NEEDS_REVIEW";
  crm_attempts: number;
  crm_next_attempt_at: string | null;
  crm_lease_until: string | null;
  crm_last_error_code: string | null;
  crm_synced_at: string;
  ghl_contact_id: string;
  ghl_opportunity_id: string;
}>;

export interface LeadStore {
  claimDue(batchSize: number, leaseSeconds: number): Promise<OutboxLead[]>;
  update(id: string, patch: OutboxPatch): Promise<void>;
}

export interface GhlPort {
  upsertContact(contact: { name: string; email: string; phone: string | null; source: string; customFields: { id: string; field_value: string }[] }): Promise<string>;
  findOpportunity(contactId: string): Promise<string | null>;
  createOpportunity(input: { contactId: string; stage: CrmStage; name: string; source: string }): Promise<string>;
}

export type FieldIds = Partial<Record<"project_type" | "lead_source" | "utm_campaign" | "ol_tracking_ref" | "preferred_language", string>>;

/** Retry schedule after the n-th failure. After the last entry the lead goes to NEEDS_REVIEW. */
export const RETRY_DELAYS_SECONDS = [60, 300, 900, 3600, 3 * 3600, 6 * 3600, 12 * 3600, 24 * 3600] as const;
export const MAX_ATTEMPTS = RETRY_DELAYS_SECONDS.length + 1;

type ErrorLike = { code?: unknown; retryable?: unknown; retryAfterSeconds?: unknown };

function errorCode(error: unknown): string {
  const code = (error as ErrorLike | null)?.code;
  return typeof code === "string" && /^[A-Z_]{3,40}$/.test(code) ? code : "HANDOFF_FAILED";
}

const SOURCE_LABEL: Record<string, string> = { contact_form: "Website contact form", booking: "Website consultation booking", ai_assistant: "Website AI assistant" };

function customFields(lead: OutboxLead, ids: FieldIds) {
  const values: [keyof FieldIds, string | null][] = [
    ["project_type", lead.project_type],
    ["lead_source", "Website"],
    ["utm_campaign", lead.utm_campaign],
    ["ol_tracking_ref", lead.tracking_ref],
    ["preferred_language", lead.locale === "ar" ? "Arabic" : lead.locale === "en" ? "English" : null]
  ];
  return values.flatMap(([key, value]) => (ids[key] && value ? [{ id: ids[key] as string, field_value: value }] : []));
}

const STOP_BATCH = new Set(["GHL_AUTH", "GHL_RATE_LIMITED", "GHL_UNAVAILABLE", "GHL_TIMEOUT"]);

export type OutboxResult = { claimed: number; synced: number; retried: number; needsReview: number; errors: Record<string, number> };

export async function processOutbox(
  store: LeadStore,
  ghl: GhlPort,
  options: { fieldIds?: FieldIds; batchSize?: number; leaseSeconds?: number; now?: () => Date } = {}
): Promise<OutboxResult> {
  const now = options.now ?? (() => new Date());
  const result: OutboxResult = { claimed: 0, synced: 0, retried: 0, needsReview: 0, errors: {} };
  const leads = await store.claimDue(options.batchSize ?? 10, options.leaseSeconds ?? 120);
  result.claimed = leads.length;

  for (const lead of leads) {
    let contactId = lead.ghl_contact_id;
    try {
      if (!lead.email || !lead.name || !lead.crm_stage) {
        throw Object.assign(new Error("LEAD_INCOMPLETE"), { code: "LEAD_INCOMPLETE", retryable: false });
      }
      const source = SOURCE_LABEL[lead.source] ?? "Website";
      if (!contactId) {
        contactId = await ghl.upsertContact({ name: lead.name, email: lead.email, phone: lead.phone, source, customFields: customFields(lead, options.fieldIds ?? {}) });
        await store.update(lead.id, { ghl_contact_id: contactId });
      }
      if (!lead.ghl_opportunity_id) {
        const opportunityId =
          (await ghl.findOpportunity(contactId)) ??
          (await ghl.createOpportunity({ contactId, stage: lead.crm_stage, name: `${lead.name} — ${lead.project_type ?? "Website enquiry"}`, source }));
        await store.update(lead.id, { ghl_opportunity_id: opportunityId });
      }
      await store.update(lead.id, { crm_status: "SYNCED", crm_synced_at: now().toISOString(), crm_last_error_code: null, crm_next_attempt_at: null, crm_lease_until: null });
      result.synced += 1;
    } catch (error) {
      const code = errorCode(error);
      result.errors[code] = (result.errors[code] ?? 0) + 1;
      const attempts = lead.crm_attempts + 1;
      const retryable = (error as ErrorLike | null)?.retryable !== false;
      try {
        if (!retryable || attempts >= MAX_ATTEMPTS) {
          await store.update(lead.id, { crm_status: "NEEDS_REVIEW", crm_attempts: attempts, crm_last_error_code: code, crm_next_attempt_at: null, crm_lease_until: null });
          result.needsReview += 1;
        } else {
          const hinted = Number((error as ErrorLike | null)?.retryAfterSeconds);
          const delay = Math.max(RETRY_DELAYS_SECONDS[attempts - 1], Number.isFinite(hinted) ? hinted : 0);
          await store.update(lead.id, { crm_status: "PENDING", crm_attempts: attempts, crm_last_error_code: code, crm_next_attempt_at: new Date(now().getTime() + delay * 1000).toISOString(), crm_lease_until: null });
          result.retried += 1;
        }
      } catch {
        // The lease expires on its own; the row stays PENDING and is retried later.
        result.errors.STORE_UPDATE_FAILED = (result.errors.STORE_UPDATE_FAILED ?? 0) + 1;
      }
      // Provider-wide failures: stop the batch instead of hammering GHL; leased rows retry after the lease.
      if (STOP_BATCH.has(code)) break;
    }
  }
  return result;
}
