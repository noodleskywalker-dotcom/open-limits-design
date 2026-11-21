import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side admin authorization for sensitive lead/booking routes.
 * A valid Supabase session is NOT enough: the user must also pass
 * public.is_crm_admin() (listed in admin_users with role admin|owner AND a
 * confirmed email). The database function is the single source of truth.
 */
export type AdminCheck =
  | { state: "ADMIN"; userId: string }
  | { state: "UNAUTHENTICATED" }
  | { state: "FORBIDDEN" }
  | { state: "UNAVAILABLE" };

export async function authorizeAdmin(supabase: SupabaseClient | null, authorization: string | null): Promise<AdminCheck> {
  if (!supabase) return { state: "UNAVAILABLE" };
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { state: "UNAUTHENTICATED" };
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { state: "UNAUTHENTICATED" };
    const check = await supabase.rpc("is_crm_admin", { candidate: data.user.id });
    if (check.error) return { state: "UNAVAILABLE" };
    return check.data === true ? { state: "ADMIN", userId: data.user.id } : { state: "FORBIDDEN" };
  } catch {
    return { state: "UNAVAILABLE" };
  }
}

export const ADMIN_STATUS: Record<Exclude<AdminCheck["state"], "ADMIN">, { status: number; error: string }> = {
  UNAUTHENTICATED: { status: 401, error: "Sign in required." },
  FORBIDDEN: { status: 403, error: "Not authorized." },
  UNAVAILABLE: { status: 503, error: "Service temporarily unavailable." }
};
