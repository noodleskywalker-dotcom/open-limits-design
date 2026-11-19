import "server-only";

/**
 * Minimal GoHighLevel client for the website → CRM handoff. Disabled unless
 * GHL_HANDOFF_ENABLED=true AND every required id is configured. Only three calls exist:
 * contact upsert (dedupes on email/phone), opportunity search (duplicate guard), opportunity create.
 * No messaging, workflow, tag, delete or update calls. Errors carry fixed codes only.
 */
export const GHL_API_ORIGIN = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";

export type GhlHandoffConfig = {
  token: string;
  locationId: string;
  pipelineId: string;
  stageIds: { NEW_ENQUIRY: string; CONSULTATION_BOOKED: string };
  fieldIds: Partial<Record<"project_type" | "lead_source" | "utm_campaign" | "ol_tracking_ref" | "preferred_language", string>>;
};

const ID = /^[A-Za-z0-9_-]{6,64}$/;

/** Returns null (handoff disabled) unless explicitly enabled and fully configured. Never throws secrets. */
export function ghlHandoffConfig(env: Record<string, string | undefined> = process.env): GhlHandoffConfig | null {
  if (env.GHL_HANDOFF_ENABLED !== "true") return null;
  const token = env.GHL_PRIVATE_INTEGRATION_TOKEN ?? "";
  const ids = {
    locationId: env.GHL_LOCATION_ID ?? "",
    pipelineId: env.GHL_PIPELINE_ID ?? "",
    newEnquiry: env.GHL_STAGE_NEW_ENQUIRY_ID ?? "",
    consultation: env.GHL_STAGE_CONSULTATION_BOOKED_ID ?? ""
  };
  if (!/^\S{20,4096}$/.test(token) || !Object.values(ids).every((value) => ID.test(value))) return null;
  const field = (key: string) => (ID.test(env[key] ?? "") ? env[key] : undefined);
  return {
    token,
    locationId: ids.locationId,
    pipelineId: ids.pipelineId,
    stageIds: { NEW_ENQUIRY: ids.newEnquiry, CONSULTATION_BOOKED: ids.consultation },
    fieldIds: {
      project_type: field("GHL_FIELD_PROJECT_TYPE_ID"),
      lead_source: field("GHL_FIELD_LEAD_SOURCE_ID"),
      utm_campaign: field("GHL_FIELD_UTM_CAMPAIGN_ID"),
      ol_tracking_ref: field("GHL_FIELD_TRACKING_REF_ID"),
      preferred_language: field("GHL_FIELD_PREFERRED_LANGUAGE_ID")
    }
  };
}

export type GhlErrorCode = "GHL_AUTH" | "GHL_RATE_LIMITED" | "GHL_UNAVAILABLE" | "GHL_TIMEOUT" | "GHL_REJECTED" | "GHL_RESPONSE_INVALID";
export class GhlHandoffError extends Error {
  readonly code: GhlErrorCode;
  readonly status: number | null;
  readonly retryAfterSeconds: number | null;
  constructor(code: GhlErrorCode, status: number | null = null, retryAfterSeconds: number | null = null) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
  /** REJECTED (400/422) needs a human: retrying the same payload cannot succeed. */
  get retryable() {
    return this.code !== "GHL_REJECTED";
  }
}

export type ContactPayload = {
  name: string;
  email: string;
  phone: string | null;
  source: string;
  customFields: { id: string; field_value: string }[];
};

export class GhlHandoffClient {
  private readonly config: GhlHandoffConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  constructor(config: GhlHandoffConfig, fetchImpl: typeof fetch = fetch, timeoutMs = 15_000) {
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  /** Upsert by the sub-account's unique identifiers (email + phone). Deliberately sends no tags: upsert would overwrite them. */
  async upsertContact(contact: ContactPayload): Promise<string> {
    const body = {
      locationId: this.config.locationId,
      name: contact.name,
      email: contact.email,
      ...(contact.phone ? { phone: contact.phone } : {}),
      source: contact.source,
      ...(contact.customFields.length ? { customFields: contact.customFields } : {})
    };
    const json = await this.call("POST", "/contacts/upsert", body);
    const id = (json as { contact?: { id?: unknown } }).contact?.id;
    if (typeof id !== "string" || !ID.test(id)) throw new GhlHandoffError("GHL_RESPONSE_INVALID");
    return id;
  }

  /** Duplicate guard: reuse this contact's OPEN opportunity in the pipeline (covers a crash between create and save). */
  async findOpportunity(contactId: string): Promise<string | null> {
    const query = new URLSearchParams({ location_id: this.config.locationId, contact_id: contactId, pipeline_id: this.config.pipelineId, status: "open", limit: "5" });
    const json = await this.call("GET", `/opportunities/search?${query}`);
    const list = (json as { opportunities?: { id?: unknown; pipelineId?: unknown; contactId?: unknown }[] }).opportunities;
    if (!Array.isArray(list)) throw new GhlHandoffError("GHL_RESPONSE_INVALID");
    const match = list.find((o) => o.pipelineId === this.config.pipelineId && o.contactId === contactId && typeof o.id === "string");
    return match ? String(match.id) : null;
  }

  async createOpportunity(input: { contactId: string; stage: keyof GhlHandoffConfig["stageIds"]; name: string; source: string }): Promise<string> {
    const json = await this.call("POST", "/opportunities/", {
      locationId: this.config.locationId,
      pipelineId: this.config.pipelineId,
      pipelineStageId: this.config.stageIds[input.stage],
      contactId: input.contactId,
      name: input.name,
      status: "open",
      source: input.source
    });
    const id = (json as { opportunity?: { id?: unknown } }).opportunity?.id;
    if (typeof id !== "string" || !ID.test(id)) throw new GhlHandoffError("GHL_RESPONSE_INVALID");
    return id;
  }

  private async call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(new URL(path, GHL_API_ORIGIN), {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Version: API_VERSION,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      throw new GhlHandoffError(name === "TimeoutError" || name === "AbortError" ? "GHL_TIMEOUT" : "GHL_UNAVAILABLE");
    }
    if (!response.ok) {
      const header = response.headers.get("retry-after");
      const retryAfter = header && /^\d{1,6}$/.test(header.trim()) ? Number(header) : Number.NaN;
      const seconds = Number.isFinite(retryAfter) && retryAfter >= 0 ? Math.min(retryAfter, 3600) : null;
      if (response.status === 401 || response.status === 403) throw new GhlHandoffError("GHL_AUTH", response.status);
      if (response.status === 429) throw new GhlHandoffError("GHL_RATE_LIMITED", 429, seconds ?? 60);
      if (response.status >= 500) throw new GhlHandoffError("GHL_UNAVAILABLE", response.status, seconds);
      throw new GhlHandoffError("GHL_REJECTED", response.status);
    }
    try {
      return await response.json();
    } catch {
      throw new GhlHandoffError("GHL_RESPONSE_INVALID", response.status);
    }
  }
}
