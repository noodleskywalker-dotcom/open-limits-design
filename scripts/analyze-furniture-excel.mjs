#!/usr/bin/env node
/**
 * Analyze furniture Excel workbook — DOES NOT IMPORT.
 *
 * Usage:
 *   node scripts/analyze-furniture-excel.mjs
 *   node scripts/analyze-furniture-excel.mjs path/to/file.xlsx
 *   node scripts/analyze-furniture-excel.mjs --json path/to/file.xlsx
 */
import {
  analyzeFurnitureExcel,
  formatAnalysisReport,
  resolveExcelPath
} from "../lib/furniture/excel-analyze.mjs";

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const inputPath = args.find((arg) => !arg.startsWith("--")) ?? null;

const filePath = resolveExcelPath(inputPath);
if (!filePath) {
  console.error("Excel file not found.");
  console.error("Place one of these in the project root:");
  console.error("  - AHMED SALAH data.xlsx");
  console.error("  - AHMED-SALAH-data.xlsx");
  console.error("  - ALI ALMOHANDI-FURNITURE.xlsx");
  console.error("Or pass the path: node scripts/analyze-furniture-excel.mjs path/to/file.xlsx");
  process.exit(1);
}

try {
  const report = await analyzeFurnitureExcel(filePath);
  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatAnalysisReport(report));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
