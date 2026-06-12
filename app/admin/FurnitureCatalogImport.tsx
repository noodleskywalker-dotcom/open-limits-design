"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminLogin from "@/app/admin/AdminLogin";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type CatalogItem = {
  title: string;
  slug: string;
  category: string | null;
  dimensions: string | null;
  materials: string | null;
  description: string | null;
  pageNumber: number;
  source: string;
  imageCount: number;
  missing: string[];
};

type AnalysisReport = {
  fileName: string;
  pageCount: number;
  furnitureItemCount: number;
  embeddedImageCount: number;
  imageMatchedItemCount: number;
  imageMappingStatus: string;
  categories: string[];
  materials: string[];
  dimensions: string[];
  items: CatalogItem[];
  rowsMissingDataCount: number;
  unclearMappings: string[];
};

type ImportResult = {
  fileName: string;
  totalItems: number;
  created: number;
  updated: number;
  skipped: number;
  categoriesCreated: number;
  imagesUploaded: number;
  imageLinksCreated: number;
  errors: string[];
};

export default function FurnitureCatalogImport() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSessionChecked(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
  }, [supabase]);

  async function getToken() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function analyzePdf(file: File) {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setBusy(true);
    setError("");
    setReport(null);
    setImportResult(null);
    setPdfFile(file);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sign in to analyze the catalog PDF.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/furniture/analyze-pdf", {
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
      setError("Could not analyze the PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function importPdf() {
    if (!pdfFile || !report) return;

    setImporting(true);
    setError("");
    setImportResult(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sign in to import the catalog.");
        return;
      }

      const formData = new FormData();
      formData.append("file", pdfFile);

      const response = await fetch("/api/admin/furniture/import-pdf", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }

      setImportResult(data as ImportResult);
    } catch {
      setError("Import request failed.");
    } finally {
      setImporting(false);
    }
  }

  if (!sessionChecked) {
    return <div className="admin-page">Loading…</div>;
  }

  if (!supabase) {
    return (
      <div className="admin-page">
        <p className="status error">Supabase is not configured.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <AdminLogin
        onSignedIn={() => {
          void supabase?.auth.getSession().then(({ data }) => setSession(data.session));
        }}
      />
    );
  }

  return (
    <div className="admin-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin · Furniture</p>
          <h1>Import Catalog</h1>
          <p>
            Upload <strong>AHMED SALAH data.pdf</strong>. Data is extracted from the PDF only — preview the
            report, then import into furniture categories, items, and galleries.
          </p>
        </div>
        <Link className="button ghost" href="/admin/furniture">
          ← Back to Furniture
        </Link>
      </div>

      <div className="form-card">
        <label className="field full excel-dropzone">
          <span>{busy ? "Analyzing PDF…" : "Drop PDF here or click to browse"}</span>
          <input
            accept=".pdf,application/pdf"
            disabled={busy || importing}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void analyzePdf(file);
            }}
            type="file"
          />
        </label>

        {pdfFile ? <p className="meta">Selected: {pdfFile.name}</p> : null}
        {error ? <p className="status error">{error}</p> : null}

        {report ? (
          <div className="excel-analysis-report">
            <h3>Preview report</h3>
            <p className="status success">Analysis complete — review before importing.</p>

            <ul className="excel-analysis-stats">
              <li>
                <strong>{report.furnitureItemCount}</strong> furniture items
              </li>
              <li>
                <strong>{report.categories.length}</strong> categories
              </li>
              <li>
                <strong>{report.materials.length}</strong> materials
              </li>
              <li>
                <strong>{report.embeddedImageCount}</strong> images found
              </li>
              <li>
                <strong>{report.pageCount}</strong> pages
              </li>
            </ul>

            <p className="meta">{report.imageMappingStatus}</p>

            {report.categories.length ? (
              <p className="meta">
                <strong>Categories:</strong> {report.categories.join(", ")}
              </p>
            ) : null}
            {report.materials.length ? (
              <p className="meta">
                <strong>Materials:</strong> {report.materials.slice(0, 20).join(", ")}
                {report.materials.length > 20 ? "…" : ""}
              </p>
            ) : null}

            {report.unclearMappings.length ? (
              <ul className="excel-example-list">
                {report.unclearMappings.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}

            <h4>Extracted items ({report.items.length})</h4>
            <div className="catalog-preview-table-wrap">
              <table className="catalog-preview-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Dimensions</th>
                    <th>Materials</th>
                    <th>Images</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr key={`${item.slug}-${item.pageNumber}`}>
                      <td>{item.pageNumber}</td>
                      <td>
                        <strong>{item.title}</strong>
                        {item.description ? (
                          <p className="meta">{item.description.slice(0, 100)}</p>
                        ) : null}
                      </td>
                      <td>{item.category ?? "—"}</td>
                      <td>{item.dimensions ?? "—"}</td>
                      <td>{item.materials ?? "—"}</td>
                      <td>{item.imageCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {report.rowsMissingDataCount ? (
              <p className="status error">
                {report.rowsMissingDataCount} item(s) missing fields (may be skipped if category is absent).
              </p>
            ) : null}

            <div className="button-row">
              <button
                className="button"
                disabled={importing || !report.furnitureItemCount}
                onClick={() => void importPdf()}
                type="button"
              >
                {importing ? "Importing…" : "Import into Furniture Catalog"}
              </button>
              <Link className="button ghost" href="/furniture" target="_blank">
                View /furniture
              </Link>
            </div>
          </div>
        ) : null}

        {importResult ? (
          <div className="excel-analysis-report">
            <h3>Import complete</h3>
            <ul className="excel-analysis-stats">
              <li>
                <strong>{importResult.created}</strong> created
              </li>
              <li>
                <strong>{importResult.updated}</strong> updated
              </li>
              <li>
                <strong>{importResult.skipped}</strong> skipped
              </li>
              <li>
                <strong>{importResult.categoriesCreated}</strong> new categories
              </li>
              <li>
                <strong>{importResult.imagesUploaded}</strong> images uploaded
              </li>
              <li>
                <strong>{importResult.imageLinksCreated}</strong> gallery links
              </li>
            </ul>
            {importResult.errors.length ? (
              <ul className="excel-example-list">
                {importResult.errors.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="status success">
                Catalog imported. Items are published and visible on{" "}
                <Link href="/furniture">/furniture</Link>.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
