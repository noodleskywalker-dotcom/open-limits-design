declare module "@/lib/furniture/pdf-analyze.mjs" {
  export function resolvePdfPath(inputPath: string | null): string | null;
  export function analyzeFurniturePdf(
    source: string | Buffer,
    options?: { saveImages?: boolean; imageOutputDir?: string }
  ): Promise<Record<string, unknown>>;
  export function formatPdfAnalysisReport(report: Record<string, unknown>): string;
}
