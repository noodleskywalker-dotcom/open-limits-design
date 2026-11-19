// The test sets globalThis.__supabaseFake to a fake client (or null for "not configured").
export function getSupabaseAdminClient() {
  return globalThis.__supabaseFake ?? null;
}
