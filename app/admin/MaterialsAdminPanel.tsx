"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Material, MediaAsset } from "@/lib/cms/types";
import { resolveImageUrl } from "@/lib/cms/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type MaterialForm = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  imageId: string;
  sortOrder: string;
  published: boolean;
};

const blankMaterial: MaterialForm = {
  id: "",
  name: "",
  slug: "",
  description: "",
  category: "",
  imageId: "",
  sortOrder: "0",
  published: true
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function MaterialsAdminPanel({ media }: { media: MediaAsset[] }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState<MaterialForm>(blankMaterial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadMaterials = useCallback(async () => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase
      .from("materials")
      .select("*, image:media_assets(*)")
      .order("sort_order");
    if (loadError) throw loadError;
    setMaterials((data ?? []) as Material[]);
  }, [supabase]);

  useEffect(() => {
    // Initial materials sync after admin authentication.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMaterials().catch((loadError: Error) => {
      setError(
        loadError.message.includes("schema cache")
          ? "The materials table does not exist yet. Run supabase/migrations/restore_open_limits.sql in the Supabase SQL Editor."
          : loadError.message
      );
    });
  }, [loadMaterials]);

  function edit(material: Material) {
    setForm({
      id: material.id,
      name: material.name,
      slug: material.slug,
      description: material.description ?? "",
      category: material.category ?? "",
      imageId: material.image_id ?? "",
      sortOrder: String(material.sort_order ?? 0),
      published: material.published
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setError("");

    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      category: form.category || null,
      image_id: form.imageId || null,
      sort_order: Number(form.sortOrder) || 0,
      published: form.published
    };

    const { error: saveError } = form.id
      ? await supabase.from("materials").update(payload).eq("id", form.id)
      : await supabase.from("materials").insert(payload);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    setForm(blankMaterial);
    setMessage("Material saved.");
    await loadMaterials();
  }

  async function remove(materialId: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("materials").delete().eq("id", materialId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage("Material deleted.");
    await loadMaterials();
  }

  const materialMedia = media.filter((asset) => ["Materials", "Furniture"].includes(asset.category));

  return (
    <div>
      {message ? <p className="status success">{message}</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      <form className="form-grid" onSubmit={save}>
        <div className="field full">
          <h2>{form.id ? "Edit material" : "Add material"}</h2>
          <p>
            Upload real swatch photos in the Media tab using the Materials category, then assign
            them here. Items without an image show an elegant placeholder.
          </p>
        </div>
        <label className="field">
          <span>Name</span>
          <input onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
        </label>
        <label className="field">
          <span>Category / type</span>
          <input
            onChange={(event) => setForm({ ...form, category: event.target.value })}
            placeholder="Wood, Stone, Upholstery, Metal…"
            value={form.category}
          />
        </label>
        <label className="field full">
          <span>Description</span>
          <textarea
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            value={form.description}
          />
        </label>
        <label className="field">
          <span>Image</span>
          <select onChange={(event) => setForm({ ...form, imageId: event.target.value })} value={form.imageId}>
            <option value="">No image (placeholder shown)</option>
            {materialMedia.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title} ({asset.category})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort order</span>
          <input
            onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
            value={form.sortOrder}
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select
            onChange={(event) => setForm({ ...form, published: event.target.value === "true" })}
            value={String(form.published)}
          >
            <option value="true">Published</option>
            <option value="false">Hidden</option>
          </select>
        </label>
        <div className="button-row">
          <button className="button" type="submit">
            Save material
          </button>
          <button className="button ghost" onClick={() => setForm(blankMaterial)} type="button">
            New material
          </button>
        </div>
      </form>

      <div className="row-list">
        {materials.map((material) => (
          <div className="row-item" key={material.id}>
            {resolveImageUrl(material.image) ? (
              <img alt={material.name} src={resolveImageUrl(material.image)!} />
            ) : (
              <div className="row-thumb" />
            )}
            <div>
              <strong>{material.name}</strong>
              <p>
                {material.category ?? "Uncategorized"} ·{" "}
                {material.published ? "Published" : "Hidden"}
                {!material.image_id ? " · placeholder image" : ""}
              </p>
            </div>
            <div className="button-row">
              <button className="button ghost" onClick={() => edit(material)} type="button">
                Edit
              </button>
              <button className="button ghost" onClick={() => remove(material.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
