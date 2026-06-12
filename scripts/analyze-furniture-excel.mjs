#!/usr/bin/env node
/**
 * Analyze furniture Excel workbook — DOES NOT IMPORT.
 *
 * Reads AHMED SALAH data.xlsx (or path argument) and outputs a full analysis report.
 *
 * Usage:
 *   npm run furniture:analyze
 *   node scripts/analyze-furniture-excel.mjs
 *   node scripts/analyze-furniture-excel.mjs "AHMED SALAH data.xlsx"
 *   node scripts/analyze-furniture-excel.mjs --json path/to/file.xlsx
 *
 * Detects: sheets, rows, name/category/material/dimension/description columns,
 * embedded xl/media images, drawing anchors, and image-to-row matches.
 *
 * Import is blocked — review the report and approve before any import step.
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
  console.error("");
  console.error("Expected file: AHMED SALAH data.xlsx");
  console.error("Place it in the project root, or pass a path:");
  console.error('  node scripts/analyze-furniture-excel.mjs "AHMED SALAH data.xlsx"');
  console.error("");
  console.error("Also searched:");
  console.error("  - AHMED-SALAH-data.xlsx");
  console.error("  - ALI ALMOHANDI-FURNITURE.xlsx");
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
