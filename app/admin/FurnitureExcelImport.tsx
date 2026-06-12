"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AnalysisReport = {
  fileName: string;
  sheetNames: string[];
  totalRows: number;
  furnitureItemCount: number;
  embeddedImageCount: number;
  imageAnchorCount: number;
  imageMappingStatus: string;
  categories: string[];
  materials: string[];
  collections: string[];
  examples: {
    rowNumber: number;
    sheetName: string;
    title: string;
    category: string | null;
    dimensions: string | null;
    materials: string | null;
    missing: string[];
  }[];
  rowsMissingDataCount: number;
  unclearMappings: string[];
  sheets: {
    sheetName: string;
    rowCount: number;
    itemCount: number;
    columns: string[];
    mapping: Record<string, string | null>;
  }[];
};

export default function FurnitureExcelImport() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);

  async function analyzeFile(file: File) {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setBusy(true);
    setError("");
    setReport(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Sign in to analyze Excel files.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/furniture/analyze-excel", {
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
      setError("Could not analyze the Excel file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-card">
      <div className="field full">
        <h3>Import Excel</h3>
        <p>
          Upload <strong>AHMED SALAH data.xlsx</strong> to analyze furniture rows and embedded images.
          Import is blocked until analysis is reviewed and approved.
        </p>
      </div>

      <label className="field full excel-dropzone">
        <span>{busy ? "Analyzing…" : "Drop XLSX here or click to browse"}</span>
        <input
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
              <strong>{report.embeddedImageCount}</strong> embedded images
            </li>
            <li>
              <strong>{report.totalRows}</strong> total rows
            </li>
            <li>Sheets: {report.sheetNames.join(", ")}</li>
          </ul>
          <p className="meta">{report.imageMappingStatus}</p>

          <h4>Column mapping</h4>
          {report.sheets.map((sheet) => (
            <div className="excel-sheet-block" key={sheet.sheetName}>
              <strong>{sheet.sheetName}</strong> — {sheet.itemCount} items / {sheet.rowCount} rows
              <pre>{JSON.stringify(sheet.mapping, null, 2)}</pre>
            </div>
          ))}

          <h4>Example items</h4>
          <ul className="excel-example-list">
            {report.examples.map((item) => (
              <li key={`${item.sheetName}-${item.rowNumber}`}>
                Row {item.rowNumber}: {item.title}
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
            Next step: approve analysis, then run{" "}
            <code>npm run furniture:import -- --confirm path/to/file.xlsx</code> from a machine with Supabase
            credentials. Browser import execution will be enabled after approval.
          </p>
          <button className="button ghost" disabled type="button">
            Import blocked — awaiting approval
          </button>
        </div>
      ) : null}
    </div>
  );
}
