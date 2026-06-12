declare module "@/lib/furniture/pdf-analyze.mjs" {
  export function resolvePdfPath(inputPath: string | null): string | null;
  export function analyzeFurniturePdf(
    source: string | Buffer,
    options?: { saveImages?: boolean; imageOutputDir?: string; includeImageBuffers?: boolean }
  ): Promise<Record<string, unknown>>;
  export function formatPdfAnalysisReport(report: Record<string, unknown>): string;
  export function sanitizePdfReportForClient(report: Record<string, unknown>): Record<string, unknown>;
  export function dedupeFurnitureItems(items: Record<string, unknown>[]): Record<string, unknown>[];
}

declare module "@/lib/furniture/pdf-import.mjs" {
  export function importFurnitureFromPdf(
    buffer: Buffer,
    supabase: import("@supabase/supabase-js").SupabaseClient
  ): Promise<Record<string, unknown>>;
}
