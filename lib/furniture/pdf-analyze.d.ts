declare module "@/lib/furniture/import-qc.mjs" {
  export function buildImportPreview(
    report: Record<string, unknown>,
    existingItems?: { id: string; slug: string; title: string }[]
  ): Record<string, unknown>;
  export function slugify(value: string): string;
  export function ensureUniqueSlugs(items: Record<string, unknown>[]): Record<string, unknown>[];
  export function ensureFurnitureCategoryHierarchy(
    supabase: import("@supabase/supabase-js").SupabaseClient
  ): Promise<{ slugToId: Map<string, string>; categoriesCreated: number; rootId: string }>;
}

declare module "@/lib/furniture/pdf-import.mjs" {
  export function importConfirmedFurnitureCatalog(
    payload: Record<string, unknown>,
    supabase: import("@supabase/supabase-js").SupabaseClient,
    options?: { userId?: string | null }
  ): Promise<Record<string, unknown>>;
  export function rollbackFurnitureImportBatch(
    batchId: string,
    supabase: import("@supabase/supabase-js").SupabaseClient
  ): Promise<Record<string, unknown>>;
  export function importFurnitureFromPdf(
    buffer: Buffer,
    supabase: import("@supabase/supabase-js").SupabaseClient
  ): Promise<Record<string, unknown>>;
}

declare module "@/lib/furniture/pdf-analyze.mjs" {
  export function resolvePdfPath(inputPath: string | null): string | null;
  export function analyzeFurniturePdf(
    source: string | Buffer,
    options?: {
      saveImages?: boolean;
      imageOutputDir?: string;
      includeImageBuffers?: boolean;
    }
  ): Promise<Record<string, unknown>>;
  export function formatPdfAnalysisReport(report: Record<string, unknown>): string;
  export function sanitizePdfReportForClient(report: Record<string, unknown>): Record<string, unknown>;
  export function dedupeFurnitureItems(items: Record<string, unknown>[]): Record<string, unknown>[];
}
