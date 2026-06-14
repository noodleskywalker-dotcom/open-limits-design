declare module "@/lib/furniture/excel-analyze.mjs" {
  export function analyzeFurnitureExcel(source: string | Buffer): Promise<Record<string, unknown>>;
  export function formatAnalysisReport(report: Record<string, unknown>): string;
  export function resolveExcelPath(inputPath?: string | null): string | null;
  export const DEFAULT_XLSX_CANDIDATES: string[];
}
