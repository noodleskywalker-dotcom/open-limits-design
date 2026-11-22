/**
 * Website enquiry validation, consent and attribution. Shared by /api/contact and /api/bookings.
 * GoHighLevel (GHL) is the CRM of record; this site stores each enquiry durably first.
 */

/**
 * Bump when the consent wording shown to visitors changes. Stored with each enquiry.
 * The consent line links to /privacy (app/privacy/page.tsx).
 */
export const CONSENT_VERSION = "website-enquiry-v1-2026-11";
export const CONSENT_TEXT = {
  en: "I agree that Open Limits Design may store my details and contact me about this enquiry.",
  ar: "أوافق على أن تحتفظ أوبن ليمتس ديزاين ببياناتي وتتواصل معي بخصوص هذا الاستفسار."
} as const;

/**
 * The privacy notice text needs management approval before the GHL handoff may be enabled.
 * APPROVED by the business owner on 2026-11-22 (notice and consent wording as published, consent
 * reference CONSENT_VERSION). Changing the wording requires a new approval and a new CONSENT_VERSION.
 */
export const PRIVACY_NOTICE_STATUS: "DRAFT_PENDING_APPROVAL" | "APPROVED" = "APPROVED";
export const PRIVACY_NOTICE_PATH = "/privacy";

export const CRM_STAGES = ["NEW_ENQUIRY", "CONSULTATION_BOOKED"] as const;
export type CrmStage = (typeof CRM_STAGES)[number];
export type EnquirySource = "contact_form" | "booking" | "ai_assistant";

export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  tracking_ref: string | null;
};

export type EnquiryInput = {
  idempotencyKey: string;
  name: string;
  email: string;
  phone: string | null;
  projectType: string | null;
  message: string | null;
  locale: "en" | "ar";
  consent: boolean;
  attribution: Attribution;
};

export class EnquiryValidationError extends Error {
  readonly field: string;
  constructor(field: string) {
    super(`INVALID_${field.toUpperCase()}`);
    this.field = field;
  }
}

const IDEMPOTENCY = /^[A-Za-z0-9-]{16,64}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,63}$/;
const PHONE = /^\+?[0-9][0-9\s-]{6,19}$/;
const TRACKING_REF = /^[a-f0-9]{32}$/;
const UTM_VALUE = /^[A-Za-z0-9_.:+-]{1,100}$/;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Attribution comes from the landing URL; anything malformed is dropped, never rejected. */
export function parseAttribution(raw: unknown): Attribution {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const utm = (key: string) => {
    const value = typeof source[key] === "string" ? (source[key] as string).trim() : "";
    return UTM_VALUE.test(value) ? value : null;
  };
  const content = utm("utm_content");
  const explicitRef = typeof source.tracking_ref === "string" ? source.tracking_ref.trim().toLowerCase() : "";
  const tracking_ref = TRACKING_REF.test(explicitRef) ? explicitRef : content && TRACKING_REF.test(content.toLowerCase()) ? content.toLowerCase() : null;
  return { utm_source: utm("utm_source"), utm_medium: utm("utm_medium"), utm_campaign: utm("utm_campaign"), utm_content: content, utm_term: utm("utm_term"), tracking_ref };
}

/**
 * Validates a public enquiry. Throws EnquiryValidationError naming only the field (never the value).
 * `requirePhone`/`requireMessage` follow each form's existing required fields.
 */
export function parseEnquiry(raw: unknown, options: { requirePhone: boolean; requireMessage: boolean; requireProjectType: boolean }): EnquiryInput {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (typeof body.website === "string" && body.website.trim()) throw new EnquiryValidationError("honeypot");
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!IDEMPOTENCY.test(idempotencyKey)) throw new EnquiryValidationError("idempotencyKey");
  const name = text(body.name, 120);
  if (!name) throw new EnquiryValidationError("name");
  const email = text(body.email, 254)?.toLowerCase() ?? null;
  if (!email || !EMAIL.test(email)) throw new EnquiryValidationError("email");
  const phone = text(body.phone, 24);
  if (phone ? !PHONE.test(phone) : options.requirePhone) throw new EnquiryValidationError("phone");
  const projectType = text(body.projectType, 80);
  if (!projectType && options.requireProjectType) throw new EnquiryValidationError("projectType");
  const message = text(body.message, 4000);
  if (!message && options.requireMessage) throw new EnquiryValidationError("message");
  if (body.consent !== true) throw new EnquiryValidationError("consent");
  const locale = body.locale === "ar" ? "ar" : "en";
  return { idempotencyKey, name, email, phone, projectType, message, locale, consent: true, attribution: parseAttribution(body.attribution) };
}

/** Database row for public.leads. Only consented enquiries are eligible for CRM handoff. */
export function leadRow(input: EnquiryInput, source: EnquirySource, stage: CrmStage, now: Date, extra: { booking_id?: string } = {}) {
  return {
    idempotency_key: input.idempotencyKey,
    name: input.name,
    email: input.email,
    phone: input.phone,
    project_type: input.projectType,
    message: input.message,
    source,
    locale: input.locale,
    consent_at: now.toISOString(),
    consent_version: CONSENT_VERSION,
    ...input.attribution,
    crm_stage: stage,
    crm_status: "PENDING" as const,
    crm_next_attempt_at: now.toISOString(),
    ...(extra.booking_id ? { booking_id: extra.booking_id } : {})
  };
}

/** Minimal insert port so the save path can be tested without Supabase. */
export type LeadInsertPort = {
  insert(row: Record<string, unknown>): PromiseLike<{ error: { code?: string } | null }>;
};

export type SaveOutcome = { state: "SAVED" } | { state: "DUPLICATE" } | { state: "FAILED"; code: string };

/** Durable first step. A replay of the same submission (same idempotency key) is reported as DUPLICATE, not an error. */
export async function saveLead(port: LeadInsertPort | null, row: Record<string, unknown>): Promise<SaveOutcome> {
  if (!port) return { state: "FAILED", code: "STORE_NOT_CONFIGURED" };
  try {
    const { error } = await port.insert(row);
    if (!error) return { state: "SAVED" };
    if (error.code === "23505") return { state: "DUPLICATE" };
    return { state: "FAILED", code: /^[A-Z0-9]{5}$/.test(error.code ?? "") ? `DB_${error.code}` : "DB_ERROR" };
  } catch {
    return { state: "FAILED", code: "STORE_UNREACHABLE" };
  }
}

export const ENQUIRY_FALLBACK_MESSAGE =
  "We couldn't save your message right now. Please call +974 7788 9033 or email info@openlimitsdesign.com and we'll respond directly.";

/** Visitor-facing validation messages. Never echo submitted values. */
export const FIELD_MESSAGES: Record<string, string> = {
  name: "Please enter your name.",
  email: "Please enter a valid email address.",
  phone: "Please enter a valid phone number.",
  projectType: "Please choose a project type.",
  message: "Please enter a message.",
  consent: "Please confirm we may store your details and contact you about this enquiry.",
  idempotencyKey: "Please refresh the page and try again.",
  honeypot: "Unable to send message."
};
