/**
 * Browser-side first-touch attribution. Keeps only UTM parameters and the Open Limits
 * tracking reference (no cookies, no third-party scripts, no personal data) in
 * sessionStorage so an enquiry can be attributed to the campaign that brought the visitor.
 */
const KEY = "ol_attribution_v1";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "tracking_ref"] as const;
export type ClientAttribution = Partial<Record<(typeof PARAMS)[number], string>>;

export function captureAttribution(search: string = typeof window === "undefined" ? "" : window.location.search) {
  try {
    const params = new URLSearchParams(search);
    const found: ClientAttribution = {};
    for (const key of PARAMS) {
      const value = params.get(key);
      if (value && value.length <= 100) found[key] = value;
    }
    if (Object.keys(found).length && !window.sessionStorage.getItem(KEY)) {
      window.sessionStorage.setItem(KEY, JSON.stringify(found));
    }
  } catch {
    // Storage blocked (private mode): attribution is optional.
  }
}

export function readAttribution(): ClientAttribution {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ClientAttribution) : {};
  } catch {
    return {};
  }
}

/** One key per submission attempt; reused on retry of the same attempt so the server can deduplicate. */
export function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
