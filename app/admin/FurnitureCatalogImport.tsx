"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminLogin from "@/app/admin/AdminLogin";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type FieldConfidence = {
  name: number;
  category: number;
  dimensions: number;
  materials: number;
};

type DuplicateRef = {
  id: string;
  slug: string;
  title: string;
};

type QCItem = {
  previewId: string;
  title: string;
  slug: string;
  category: string;
  categorySlug: string;
  extractedCategory: string | null;
  dimensions: string | null;
  materials: string | null;
  description: string | null;
  seoTitle: string;
  metaDescription: string;
  pageNumber: number;
  source: string;
  imageIds: string[];
  confidence: FieldConfidence;
  duplicateOf: DuplicateRef | null;
  missing: string[];
  selected: boolean;
};

type QCImage = {
  id: string;
  pageNumber: number;
  index: number;
  width: number | null;
  height: number | null;
  bytes: number;
  thumbnail: string | null;
  assignedPreviewId: string | null;
};

type CategoryOption = {
  slug: string;
  name: string;
};

type ImportPreview = {
  fileName: string;
  pageCount: number;
  furnitureItemCount: number;
  embeddedImageCount: number;
  imageMatchedItemCount: number;
  imageMappingStatus: string;
  categories: string[];
  categoryHierarchy: {
    root: CategoryOption;
    children: CategoryOption[];
  };
  items: QCItem[];
  images: QCImage[];
  duplicateCount: number;
  lowConfidenceCount: number;
  rowsMissingDataCount: number;
  unclearMappings: string[];
  sourceType: string;
  message?: string;
};

type ImportResult = {
  batchId: string | null;
  fileName: string;
  totalItems: number;
  created: number;
  updated: number;
  skipped: number;
  categoriesCreated: number;
  imagesUploaded: number;
  imageLinksCreated: number;
  errors: string[];
  log: string[];
};

function confidenceClass(score: number) {
  if (score >= 80) return "confidence-high";
  if (score >= 55) return "confidence-medium";
  return "confidence-low";
}

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSeoTitle(title: string, category: string) {
  const clean = title.trim();
  if (!clean) return "Open Limits Design — Custom Furniture";
  if (category && category !== "Furniture") {
    return `${clean} | ${category} — Open Limits Design`;
  }
  return `${clean} — Open Limits Design Furniture`;
}

function generateMetaDescription(
  title: string,
  category: string,
  materials: string | null,
  dimensions: string | null
) {
  const parts = [
    `Discover ${title.trim()}${category && category !== "Furniture" ? ` in our ${category} collection` : ""} by Open Limits Design.`
  ];
  if (materials?.trim()) parts.push(`Materials: ${materials.trim().slice(0, 120)}.`);
  if (dimensions?.trim()) parts.push(`Dimensions: ${dimensions.trim().slice(0, 80)}.`);
  parts.push("Bespoke craftsmanship, premium finishes, worldwide delivery.");
  return parts.join(" ").slice(0, 320);
}

function ConfidenceBadge({ label, score }: { label: string; score: number }) {
  return (
    <span className={`confidence-badge ${confidenceClass(score)}`} title={`${label}: ${score}%`}>
      {label} {score}%
    </span>
  );
}

export default function FurnitureCatalogImport() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [items, setItems] = useState<QCItem[]>([]);
  const [images, setImages] = useState<QCImage[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [adminConfirmed, setAdminConfirmed] = useState(false);
  const [bulkCategorySlug, setBulkCategorySlug] = useState("");
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());

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

  const categoryOptions = preview?.categoryHierarchy.children ?? [];

  async function getToken() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  function updateItem(previewId: string, patch: Partial<QCItem>) {
    setItems((current) => {
      const next = current.map((item) => {
        if (item.previewId !== previewId) return item;
        const merged = { ...item, ...patch };
        if (patch.title !== undefined) {
          merged.slug = slugifyTitle(patch.title);
          merged.seoTitle = generateSeoTitle(patch.title, merged.category);
          merged.metaDescription = generateMetaDescription(
            patch.title,
            merged.category,
            merged.materials,
            merged.dimensions
          );
        }
        if (patch.categorySlug !== undefined) {
          const cat = categoryOptions.find((c) => c.slug === patch.categorySlug);
          if (cat) {
            merged.category = cat.name;
            merged.categorySlug = cat.slug;
            merged.seoTitle = generateSeoTitle(merged.title, cat.name);
            merged.metaDescription = generateMetaDescription(
              merged.title,
              cat.name,
              merged.materials,
              merged.dimensions
            );
          }
        }
        return merged;
      });
      return next;
    });
  }

  function reassignImage(imageId: string, previewId: string | null) {
    setImages((currentImages) => {
      const nextImages = currentImages.map((img) =>
        img.id === imageId ? { ...img, assignedPreviewId: previewId } : img
      );
      setItems((currentItems) => {
        const nextItems = currentItems.map((item) => ({
          ...item,
          imageIds: nextImages
            .filter((img) => img.assignedPreviewId === item.previewId)
            .map((img) => img.id)
        }));
        return nextItems;
      });
      return nextImages;
    });
  }

  function applyBulkCategory() {
    if (!bulkCategorySlug) return;
    const cat = categoryOptions.find((c) => c.slug === bulkCategorySlug);
    if (!cat) return;

    setItems((current) =>
      current.map((item) => {
        if (selectedForBulk.size && !selectedForBulk.has(item.previewId)) return item;
        return {
          ...item,
          category: cat.name,
          categorySlug: cat.slug,
          seoTitle: generateSeoTitle(item.title, cat.name),
          metaDescription: generateMetaDescription(item.title, cat.name, item.materials, item.dimensions),
          confidence: { ...item.confidence, category: 100 }
        };
      })
    );
  }

  function toggleBulkSelect(previewId: string) {
    setSelectedForBulk((current) => {
      const next = new Set(current);
      if (next.has(previewId)) next.delete(previewId);
      else next.add(previewId);
      return next;
    });
  }

  async function analyzePdf(file: File) {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setBusy(true);
    setError("");
    setPreview(null);
    setItems([]);
    setImages([]);
    setImportResult(null);
    setAdminConfirmed(false);
    setSelectedForBulk(new Set());
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

      const report = data as ImportPreview;
      setPreview(report);
      setItems(report.items);
      setImages(report.images);
      if (report.categoryHierarchy.children[0]) {
        setBulkCategorySlug(report.categoryHierarchy.children[0].slug);
      }
    } catch {
      setError("Could not analyze the PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!preview || !items.length || !adminConfirmed) return;

    setImporting(true);
    setError("");
    setImportResult(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Sign in to import the catalog.");
        return;
      }

      const payload = {
        fileName: pdfFile?.name ?? preview.fileName,
        sourceType: preview.sourceType ?? "pdf",
        confirmed: true,
        items: items.filter((item) => item.selected),
        images: images.filter((img) => img.thumbnail)
      };

      const response = await fetch("/api/admin/furniture/import-pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
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

  const selectedCount = items.filter((item) => item.selected).length;
  const duplicateItems = items.filter((item) => item.duplicateOf);

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
            Upload a furniture catalog PDF. Extracted data is shown for review — edit fields, reassign images,
            resolve duplicates, then confirm import. Nothing is imported automatically.
          </p>
        </div>
        <div className="button-row">
          <Link className="button ghost" href="/admin/furniture/import/history">
            Import History
          </Link>
          <Link className="button ghost" href="/admin/furniture">
            ← Back to Furniture
          </Link>
        </div>
      </div>

      <div className="form-card">
        <label className="field full excel-dropzone">
          <span>{busy ? "Analyzing PDF…" : "Drop PDF here or click to browse (multiple PDFs supported in future)"}</span>
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

        {preview ? (
          <div className="import-qc-panel">
            <h3>Import preview — review required</h3>
            <p className="status success">{preview.message ?? "Analysis complete. Edit data below before confirming import."}</p>

            <ul className="excel-analysis-stats">
              <li>
                <strong>{preview.furnitureItemCount}</strong> items
              </li>
              <li>
                <strong>{preview.embeddedImageCount}</strong> images
              </li>
              <li>
                <strong>{preview.duplicateCount}</strong> duplicates
              </li>
              <li>
                <strong>{preview.lowConfidenceCount}</strong> low confidence
              </li>
              <li>
                <strong>{preview.pageCount}</strong> pages
              </li>
            </ul>

            <p className="meta">{preview.imageMappingStatus}</p>

            <div className="category-hierarchy-tree">
              <strong>{preview.categoryHierarchy.root.name}</strong>
              <ul>
                {preview.categoryHierarchy.children.map((cat) => (
                  <li key={cat.slug}>{cat.name}</li>
                ))}
              </ul>
            </div>

            {preview.unclearMappings.length ? (
              <ul className="excel-example-list">
                {preview.unclearMappings.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}

            {duplicateItems.length ? (
              <div className="import-qc-warning">
                <h4>Duplicate detection ({duplicateItems.length})</h4>
                <p className="meta">These slugs already exist in the catalog. Import will update existing items unless deselected.</p>
                <ul className="excel-example-list">
                  {duplicateItems.map((item) => (
                    <li key={item.previewId}>
                      <strong>{item.title}</strong> ({item.slug}) → existing: {item.duplicateOf?.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="bulk-category-bar">
              <label className="field">
                <span>Bulk category reassignment</span>
                <select
                  onChange={(event) => setBulkCategorySlug(event.target.value)}
                  value={bulkCategorySlug}
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button ghost" onClick={() => applyBulkCategory()} type="button">
                Apply to {selectedForBulk.size ? `${selectedForBulk.size} selected` : "all items"}
              </button>
              <p className="meta">Select rows with checkboxes, or apply to all items.</p>
            </div>

            <h4>Extracted images ({images.length})</h4>
            <div className="import-image-grid">
              {images.map((image) => (
                <div className="import-image-card" key={image.id}>
                  {image.thumbnail ? (
                    <img alt={`Page ${image.pageNumber} image ${image.index + 1}`} src={image.thumbnail} />
                  ) : (
                    <div className="image-placeholder">No preview</div>
                  )}
                  <p className="meta">
                    Page {image.pageNumber} · #{image.index + 1}
                    {image.width && image.height ? ` · ${image.width}×${image.height}` : ""}
                  </p>
                  <label className="field full">
                    <span>Assigned item</span>
                    <select
                      onChange={(event) =>
                        reassignImage(image.id, event.target.value || null)
                      }
                      value={image.assignedPreviewId ?? ""}
                    >
                      <option value="">Unassigned</option>
                      {items.map((item) => (
                        <option key={item.previewId} value={item.previewId}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </div>

            <h4>Items — edit before import ({items.length})</h4>
            <div className="catalog-preview-table-wrap">
              <table className="catalog-preview-table import-qc-table">
                <thead>
                  <tr>
                    <th>Bulk</th>
                    <th>Import</th>
                    <th>Page</th>
                    <th>Name &amp; slug</th>
                    <th>Category</th>
                    <th>Dimensions</th>
                    <th>Materials</th>
                    <th>SEO</th>
                    <th>Confidence</th>
                    <th>Images</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr className={item.duplicateOf ? "row-duplicate" : ""} key={item.previewId}>
                      <td>
                        <input
                          checked={selectedForBulk.has(item.previewId)}
                          onChange={() => toggleBulkSelect(item.previewId)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <input
                          checked={item.selected}
                          onChange={(event) => updateItem(item.previewId, { selected: event.target.checked })}
                          type="checkbox"
                        />
                      </td>
                      <td>{item.pageNumber}</td>
                      <td>
                        <input
                          className="import-inline-input"
                          onChange={(event) => updateItem(item.previewId, { title: event.target.value })}
                          value={item.title}
                        />
                        <input
                          className="import-inline-input meta-input"
                          onChange={(event) => updateItem(item.previewId, { slug: event.target.value })}
                          value={item.slug}
                        />
                        {item.duplicateOf ? (
                          <p className="status error meta">Duplicate: {item.duplicateOf.title}</p>
                        ) : null}
                        <textarea
                          className="import-inline-textarea"
                          onChange={(event) => updateItem(item.previewId, { description: event.target.value })}
                          placeholder="Description"
                          rows={2}
                          value={item.description ?? ""}
                        />
                      </td>
                      <td>
                        <select
                          onChange={(event) => updateItem(item.previewId, { categorySlug: event.target.value })}
                          value={item.categorySlug}
                        >
                          {categoryOptions.map((cat) => (
                            <option key={cat.slug} value={cat.slug}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        {item.extractedCategory && item.extractedCategory !== item.category ? (
                          <p className="meta">Extracted: {item.extractedCategory}</p>
                        ) : null}
                      </td>
                      <td>
                        <input
                          className="import-inline-input"
                          onChange={(event) => updateItem(item.previewId, { dimensions: event.target.value })}
                          value={item.dimensions ?? ""}
                        />
                      </td>
                      <td>
                        <input
                          className="import-inline-input"
                          onChange={(event) => updateItem(item.previewId, { materials: event.target.value })}
                          value={item.materials ?? ""}
                        />
                      </td>
                      <td>
                        <input
                          className="import-inline-input"
                          onChange={(event) => updateItem(item.previewId, { seoTitle: event.target.value })}
                          placeholder="SEO title"
                          value={item.seoTitle}
                        />
                        <textarea
                          className="import-inline-textarea"
                          onChange={(event) => updateItem(item.previewId, { metaDescription: event.target.value })}
                          placeholder="Meta description"
                          rows={2}
                          value={item.metaDescription}
                        />
                      </td>
                      <td>
                        <div className="confidence-stack">
                          <ConfidenceBadge label="Name" score={item.confidence.name} />
                          <ConfidenceBadge label="Cat." score={item.confidence.category} />
                          <ConfidenceBadge label="Dim." score={item.confidence.dimensions} />
                          <ConfidenceBadge label="Mat." score={item.confidence.materials} />
                        </div>
                      </td>
                      <td>{item.imageIds.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.rowsMissingDataCount ? (
              <p className="status error">
                {preview.rowsMissingDataCount} item(s) have missing extracted fields — review and edit before import.
              </p>
            ) : null}

            <div className="import-confirm-block">
              <label className="field checkbox-field">
                <input
                  checked={adminConfirmed}
                  disabled={importing || !selectedCount}
                  onChange={(event) => setAdminConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I have reviewed {selectedCount} selected item(s), {images.length} image(s), duplicate warnings,
                  and edited data. Confirm import into the furniture catalog.
                </span>
              </label>

              <div className="button-row">
                <button
                  className="button"
                  disabled={importing || !adminConfirmed || !selectedCount}
                  onClick={() => void confirmImport()}
                  type="button"
                >
                  {importing ? "Importing…" : `Confirm import (${selectedCount} items)`}
                </button>
                <Link className="button ghost" href="/furniture" target="_blank">
                  View /furniture
                </Link>
              </div>
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
                <strong>{importResult.imagesUploaded}</strong> images uploaded
              </li>
            </ul>
            {importResult.batchId ? (
              <p className="meta">
                Batch recorded.{" "}
                <Link href="/admin/furniture/import/history">View import history</Link> to rollback if needed.
              </p>
            ) : null}
            {importResult.errors.length ? (
              <ul className="excel-example-list">
                {importResult.errors.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="status success">
                Catalog imported after admin confirmation. Items are visible on <Link href="/furniture">/furniture</Link>.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
