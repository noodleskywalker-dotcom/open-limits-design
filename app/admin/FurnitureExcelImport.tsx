"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AnalysisReport = {
  fileName: string;
  furnitureItemCount: number;
  embeddedImageCount?: number;
  embeddedImageCountPdf?: number;
  totalRows?: number;
  pageCount?: number;
  sheetNames?: string[];
  imageAnchorCount?: number;
  imageMappingStatus: string;
  categories: string[];
  materials: string[];
  collections?: string[];
  dimensions?: string[];
  examples: {
    rowNumber?: number;
    pageNumber?: number;
    sheetName?: string;
    source?: string;
    title: string;
    category: string | null;
    dimensions: string | null;
    materials: string | null;
    missing: string[];
  }[];
  rowsMissingDataCount: number;
  unclearMappings: string[];
  sheets?: {
    sheetName: string;
    rowCount: number;
    itemCount: number;
    columns: string[];
    mapping: Record<string, string | null>;
  }[];
  pages?: {
    pageNumber: number;
    itemCount: number;
    tableCount: number;
    tableHeaders: string[];
  }[];
};

export default function FurnitureExcelImport() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [sourceType, setSourceType] = useState<"excel" | "pdf" | null>(null);

  async function analyzeFile(file: File) {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isExcel = file.name.toLowerCase().endsWith(".xlsx");

    if (!isPdf && !isExcel) {
      setError("Upload AHMED SALAH data.pdf or AHMED SALAH data.xlsx");
      return;
    }

    setBusy(true);
    setError("");
    setReport(null);
    setSourceType(isPdf ? "pdf" : "excel");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Sign in to analyze catalog files.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const endpoint = isPdf ? "/api/admin/furniture/analyze-pdf" : "/api/admin/furniture/analyze-excel";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Analysis failed.");
        return;
      }

      setReport(data as AnalysisReport);
    } catch {
      setError("Could not analyze the catalog file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-card">
      <div className="field full">
        <h3>Analyze catalog (no import)</h3>
        <p>
          Upload <strong>AHMED SALAH data.pdf</strong> or <strong>AHMED SALAH data.xlsx</strong> to extract
          furniture names, categories, dimensions, materials, descriptions, and images. Import is blocked until
          you approve the report.
        </p>
      </div>

      <label className="field full excel-dropzone">
        <span>{busy ? "Analyzing…" : "Drop PDF/XLSX here or click to browse"}</span>
        <input
          accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void analyzeFile(file);
          }}
          type="file"
        />
      </label>

      {error ? <p className="status error">{error}</p> : null}

      {report ? (
        <div className="excel-analysis-report">
          <p className="status success">Analysis complete — review before importing.</p>
          <ul className="excel-analysis-stats">
            <li>
              <strong>{report.furnitureItemCount}</strong> furniture items
            </li>
            <li>
              <strong>{report.embeddedImageCount ?? report.embeddedImageCountPdf ?? 0}</strong> embedded images
            </li>
            {sourceType === "excel" && report.totalRows != null ? (
              <li>
                <strong>{report.totalRows}</strong> total rows
              </li>
            ) : null}
            {sourceType === "pdf" && report.pageCount != null ? (
              <li>
                <strong>{report.pageCount}</strong> pages
              </li>
            ) : null}
            {report.sheetNames?.length ? <li>Sheets: {report.sheetNames.join(", ")}</li> : null}
          </ul>
          <p className="meta">{report.imageMappingStatus}</p>

          {sourceType === "excel" && report.sheets?.length ? (
            <>
              <h4>Column mapping</h4>
              {report.sheets.map((sheet) => (
                <div className="excel-sheet-block" key={sheet.sheetName}>
                  <strong>{sheet.sheetName}</strong> — {sheet.itemCount} items / {sheet.rowCount} rows
                  <pre>{JSON.stringify(sheet.mapping, null, 2)}</pre>
                </div>
              ))}
            </>
          ) : null}

          {sourceType === "pdf" && report.pages?.length ? (
            <>
              <h4>Pages</h4>
              <ul className="excel-example-list">
                {report.pages.map((page) => (
                  <li key={page.pageNumber}>
                    Page {page.pageNumber}: {page.itemCount} item(s), {page.tableCount} table(s)
                    {page.tableHeaders.length ? ` — headers: ${page.tableHeaders.join(" | ")}` : ""}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h4>Example items (first 10)</h4>
          <ul className="excel-example-list">
            {report.examples.map((item, index) => (
              <li key={`${item.title}-${index}`}>
                {item.pageNumber ? `Page ${item.pageNumber}` : `Row ${item.rowNumber}`}: {item.title}
                {item.category ? ` · ${item.category}` : ""}
                {item.dimensions ? ` · ${item.dimensions}` : ""}
                {item.materials ? ` · ${item.materials}` : ""}
                {item.missing.length ? ` · missing: ${item.missing.join(", ")}` : ""}
              </li>
            ))}
          </ul>

          {report.categories.length ? (
            <p className="meta">Categories: {report.categories.join(", ")}</p>
          ) : null}
          {report.materials.length ? (
            <p className="meta">Materials: {report.materials.slice(0, 12).join(", ")}</p>
          ) : null}
          {report.dimensions?.length ? (
            <p className="meta">Dimensions: {report.dimensions.slice(0, 8).join(" | ")}</p>
          ) : null}
          {report.rowsMissingDataCount ? (
            <p className="status error">{report.rowsMissingDataCount} row(s) missing important fields.</p>
          ) : null}
          {report.unclearMappings.length ? (
            <ul className="excel-example-list">
              {report.unclearMappings.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}

          <p className="meta">
            Import is blocked. Approve this report first, then run import from CLI with Supabase credentials.
          </p>
          <button className="button ghost" disabled type="button">
            Import blocked — awaiting approval
          </button>
        </div>
      ) : null}
    </div>
  );
}
