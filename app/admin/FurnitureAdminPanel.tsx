"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { FurnitureCategory, FurnitureItem, Material, MediaAsset } from "@/lib/cms/types";
import { resolveImageUrl } from "@/lib/cms/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type FurnitureCategoryForm = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  published: boolean;
};

type FurnitureItemForm = {
  id: string;
  title: string;
  slug: string;
  description: string;
  collection: string;
  dimensions: string;
  width: string;
  depth: string;
  height: string;
  materials: string;
  finishes: string;
  features: string;
  availability: string;
  categoryId: string;
  featuredImageId: string;
  imageIds: string[];
  materialIds: string[];
  sortOrder: string;
  published: boolean;
};

type FurnitureImageRow = {
  media_id: string;
  sort_order: number;
  media: MediaAsset | null;
};

type FurnitureItemRow = FurnitureItem & {
  furniture_item_images?: FurnitureImageRow[];
  furniture_item_materials?: { material_id: string }[];
};

const blankCategory: FurnitureCategoryForm = {
  id: "",
  name: "",
  slug: "",
  description: "",
  sortOrder: "0",
  published: true
};

const blankItem: FurnitureItemForm = {
  id: "",
  title: "",
  slug: "",
  description: "",
  collection: "",
  dimensions: "",
  width: "",
  depth: "",
  height: "",
  materials: "",
  finishes: "",
  features: "",
  availability: "",
  categoryId: "",
  featuredImageId: "",
  imageIds: [],
  materialIds: [],
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

function normalizeItem(item: FurnitureItemRow): FurnitureItem & { material_ids: string[] } {
  return {
    ...item,
    gallery: (item.furniture_item_images ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => image.media)
      .filter((asset): asset is MediaAsset => Boolean(asset)),
    material_ids: (item.furniture_item_materials ?? []).map((row) => row.material_id)
  };
}

export default function FurnitureAdminPanel({ media }: { media: MediaAsset[] }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [categories, setCategories] = useState<FurnitureCategory[]>([]);
  const [items, setItems] = useState<(FurnitureItem & { material_ids: string[] })[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categoryForm, setCategoryForm] = useState<FurnitureCategoryForm>(blankCategory);
  const [itemForm, setItemForm] = useState<FurnitureItemForm>(blankItem);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const furnitureMedia = media.filter((asset) => asset.category === "Furniture");

  const loadFurnitureData = useCallback(async () => {
    if (!supabase) return;

    const [categoryResult, itemResult, materialResult] = await Promise.all([
      supabase.from("furniture_categories").select("*").order("sort_order"),
      supabase
        .from("furniture_items")
        .select(
          "*, category:furniture_categories(*), featured_image:media_assets!furniture_items_featured_image_id_fkey(*), furniture_item_images(media_id, sort_order, media:media_assets!furniture_item_images_media_id_fkey(*)), furniture_item_materials(material_id)"
        )
        .order("sort_order"),
      supabase.from("materials").select("*").order("sort_order")
    ]);

    if (categoryResult.error) throw categoryResult.error;
    if (itemResult.error) throw itemResult.error;

    setCategories((categoryResult.data ?? []) as FurnitureCategory[]);
    setItems(((itemResult.data ?? []) as FurnitureItemRow[]).map(normalizeItem));
    setMaterials((materialResult.data ?? []) as Material[]);
  }, [supabase]);

  useEffect(() => {
    // Initial furniture sync after admin authentication.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFurnitureData().catch((loadError: Error) => {
      setError(
        loadError.message.includes("schema cache")
          ? "Some furniture tables/columns are missing. Run supabase/migrations/restore_open_limits.sql in the Supabase SQL Editor."
          : loadError.message
      );
    });
  }, [loadFurnitureData]);

  function editCategory(category: FurnitureCategory) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      sortOrder: String(category.sort_order ?? 0),
      published: category.published
    });
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");

    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug || slugify(categoryForm.name),
      description: categoryForm.description || null,
      sort_order: Number(categoryForm.sortOrder) || 0,
      published: categoryForm.published
    };

    const { error: saveError } = categoryForm.id
      ? await supabase.from("furniture_categories").update(payload).eq("id", categoryForm.id)
      : await supabase.from("furniture_categories").insert(payload);

    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setCategoryForm(blankCategory);
    setMessage("Furniture category saved.");
    await loadFurnitureData();
  }

  async function deleteCategory(categoryId: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("furniture_categories")
      .delete()
      .eq("id", categoryId);
    if (deleteError) {
      setError(
        deleteError.message.includes("foreign key")
          ? "This category still has furniture items. Move or delete them first."
          : deleteError.message
      );
      return;
    }
    setMessage("Furniture category deleted.");
    await loadFurnitureData();
  }

  function editItem(item: FurnitureItem & { material_ids: string[] }) {
    setItemForm({
      id: item.id,
      title: item.title,
      slug: item.slug,
      description: item.description,
      collection: item.collection ?? "",
      dimensions: item.dimensions ?? "",
      width: item.width ?? "",
      depth: item.depth ?? "",
      height: item.height ?? "",
      materials: item.materials ?? "",
      finishes: item.finishes ?? "",
      features: item.features ?? "",
      availability: item.availability ?? "",
      categoryId: item.category_id,
      featuredImageId: item.featured_image_id ?? "",
      imageIds: item.gallery?.map((asset) => asset.id) ?? [],
      materialIds: item.material_ids,
      sortOrder: String(item.sort_order ?? 0),
      published: item.published
    });
  }

  async function replaceItemRelations(itemId: string, imageIds: string[], materialIds: string[]) {
    if (!supabase) return;

    const { error: deleteImagesError } = await supabase
      .from("furniture_item_images")
      .delete()
      .eq("furniture_item_id", itemId);
    if (deleteImagesError) throw deleteImagesError;

    if (imageIds.length) {
      const { error: insertImagesError } = await supabase.from("furniture_item_images").insert(
        imageIds.map((mediaId, index) => ({
          furniture_item_id: itemId,
          media_id: mediaId,
          sort_order: index
        }))
      );
      if (insertImagesError) throw insertImagesError;
    }

    const { error: deleteMaterialsError } = await supabase
      .from("furniture_item_materials")
      .delete()
      .eq("furniture_item_id", itemId);
    if (deleteMaterialsError && !deleteMaterialsError.message.includes("schema cache")) {
      throw deleteMaterialsError;
    }

    if (materialIds.length) {
      const { error: insertMaterialsError } = await supabase.from("furniture_item_materials").insert(
        materialIds.map((materialId) => ({
          furniture_item_id: itemId,
          material_id: materialId
        }))
      );
      if (insertMaterialsError && !insertMaterialsError.message.includes("schema cache")) {
        throw insertMaterialsError;
      }
    }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");

    try {
      const payload = {
        title: itemForm.title,
        slug: itemForm.slug || slugify(itemForm.title),
        description: itemForm.description,
        collection: itemForm.collection || null,
        dimensions: itemForm.dimensions || null,
        width: itemForm.width || null,
        depth: itemForm.depth || null,
        height: itemForm.height || null,
        materials: itemForm.materials || null,
        finishes: itemForm.finishes || null,
        features: itemForm.features || null,
        availability: itemForm.availability || null,
        category_id: itemForm.categoryId,
        featured_image_id: itemForm.featuredImageId || null,
        sort_order: Number(itemForm.sortOrder) || 0,
        published: itemForm.published
      };

      const result = itemForm.id
        ? await supabase.from("furniture_items").update(payload).eq("id", itemForm.id).select("id").single()
        : await supabase.from("furniture_items").insert(payload).select("id").single();

      if (result.error) throw result.error;

      await replaceItemRelations(result.data.id as string, itemForm.imageIds, itemForm.materialIds);
      setItemForm(blankItem);
      setMessage("Furniture item saved.");
      await loadFurnitureData();
    } catch (saveError) {
      const text = saveError instanceof Error ? saveError.message : "Unable to save furniture item";
      setError(
        text.includes("schema cache") || text.includes("column")
          ? `${text} — run supabase/migrations/restore_open_limits.sql to add the new furniture columns.`
          : text
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(itemId: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("furniture_items").delete().eq("id", itemId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage("Furniture item deleted.");
    await loadFurnitureData();
  }

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Furniture catalog</p>
          <h3>Import from PDF</h3>
          <p>
            Upload <strong>AHMED SALAH data.pdf</strong> on the dedicated import page to preview and import
            extracted furniture data.
          </p>
        </div>
        <Link className="button" href="/admin/furniture/import">
          Open Import Catalog →
        </Link>
      </div>
      {message ? <p className="status success">{message}</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      <form className="form-grid" onSubmit={saveCategory}>
        <div className="field full">
          <h2>Furniture categories</h2>
          <p>Sofas, Majlis, Chairs, Tables, Beds, Cabinets, Lighting, Decor, Bedrooms, Exterior, Dining, Custom…</p>
        </div>
        <label className="field">
          <span>Name</span>
          <input
            onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
            required
            value={categoryForm.name}
          />
        </label>
        <label className="field">
          <span>Slug</span>
          <input
            onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })}
            placeholder="auto-generated if blank"
            value={categoryForm.slug}
          />
        </label>
        <label className="field full">
          <span>Description</span>
          <textarea
            onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })}
            value={categoryForm.description}
          />
        </label>
        <label className="field">
          <span>Sort order</span>
          <input
            onChange={(event) => setCategoryForm({ ...categoryForm, sortOrder: event.target.value })}
            value={categoryForm.sortOrder}
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select
            onChange={(event) =>
              setCategoryForm({ ...categoryForm, published: event.target.value === "true" })
            }
            value={String(categoryForm.published)}
          >
            <option value="true">Published</option>
            <option value="false">Hidden</option>
          </select>
        </label>
        <div className="button-row">
          <button className="button" disabled={busy} type="submit">
            Save category
          </button>
          <button className="button ghost" onClick={() => setCategoryForm(blankCategory)} type="button">
            New category
          </button>
        </div>
      </form>

      <div className="row-list">
        {categories.map((category) => (
          <div className="row-item" key={category.id}>
            <div className="row-thumb" />
            <div>
              <strong>{category.name}</strong>
              <p>
                {category.slug} · {category.published ? "Published" : "Hidden"} ·{" "}
                {items.filter((item) => item.category_id === category.id).length} items
              </p>
            </div>
            <div className="button-row">
              <button className="button ghost" onClick={() => editCategory(category)} type="button">
                Edit
              </button>
              <button className="button ghost" onClick={() => deleteCategory(category.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="form-grid form-card" onSubmit={saveItem}>
        <div className="field full">
          <h2>{itemForm.id ? "Edit furniture item" : "Create furniture item"}</h2>
          <p>Upload photos in the Media tab using the Furniture category, then assign them here.</p>
        </div>
        <label className="field">
          <span>Name</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, title: event.target.value })}
            required
            value={itemForm.title}
          />
        </label>
        <label className="field">
          <span>Slug</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, slug: event.target.value })}
            placeholder="auto-generated if blank"
            value={itemForm.slug}
          />
        </label>
        <label className="field full">
          <span>Description</span>
          <textarea
            onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })}
            required
            value={itemForm.description}
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select
            onChange={(event) => setItemForm({ ...itemForm, categoryId: event.target.value })}
            required
            value={itemForm.categoryId}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Collection</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, collection: event.target.value })}
            placeholder="Dema Bedroom, Raghad Bedroom…"
            value={itemForm.collection}
          />
        </label>
        <label className="field">
          <span>Width</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, width: event.target.value })}
            placeholder="240 cm"
            value={itemForm.width}
          />
        </label>
        <label className="field">
          <span>Depth / Length</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, depth: event.target.value })}
            placeholder="95 cm"
            value={itemForm.depth}
          />
        </label>
        <label className="field">
          <span>Height</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, height: event.target.value })}
            placeholder="76 cm"
            value={itemForm.height}
          />
        </label>
        <label className="field">
          <span>Dimensions (combined)</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, dimensions: event.target.value })}
            placeholder="240W x 95D x 76H cm"
            value={itemForm.dimensions}
          />
        </label>
        <label className="field">
          <span>Materials (text)</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, materials: event.target.value })}
            placeholder="oak, linen, brass"
            value={itemForm.materials}
          />
        </label>
        <label className="field">
          <span>Finishes</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, finishes: event.target.value })}
            placeholder="Veneer finish, brushed brass"
            value={itemForm.finishes}
          />
        </label>
        <label className="field">
          <span>Features</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, features: event.target.value })}
            placeholder="High-density sponge, solid wood frame"
            value={itemForm.features}
          />
        </label>
        <label className="field">
          <span>Availability</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, availability: event.target.value })}
            placeholder="In stock / Made to order"
            value={itemForm.availability}
          />
        </label>
        {materials.length ? (
          <label className="field full">
            <span>Material library links (hold Ctrl/Cmd to select multiple)</span>
            <select
              multiple
              onChange={(event) =>
                setItemForm({
                  ...itemForm,
                  materialIds: Array.from(event.target.selectedOptions).map((o) => o.value)
                })
              }
              value={itemForm.materialIds}
            >
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span>Main image</span>
          <select
            onChange={(event) => setItemForm({ ...itemForm, featuredImageId: event.target.value })}
            value={itemForm.featuredImageId}
          >
            <option value="">No image (placeholder shown)</option>
            {furnitureMedia.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field full">
          <span>Gallery images (hold Ctrl/Cmd to select multiple)</span>
          <select
            multiple
            onChange={(event) =>
              setItemForm({
                ...itemForm,
                imageIds: Array.from(event.target.selectedOptions).map((o) => o.value)
              })
            }
            value={itemForm.imageIds}
          >
            {furnitureMedia.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort order</span>
          <input
            onChange={(event) => setItemForm({ ...itemForm, sortOrder: event.target.value })}
            value={itemForm.sortOrder}
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select
            onChange={(event) => setItemForm({ ...itemForm, published: event.target.value === "true" })}
            value={String(itemForm.published)}
          >
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </label>
        <div className="button-row">
          <button className="button" disabled={busy} type="submit">
            Save furniture item
          </button>
          <button className="button ghost" onClick={() => setItemForm(blankItem)} type="button">
            New furniture item
          </button>
        </div>
      </form>

      <div className="row-list">
        {items.map((item) => (
          <div className="row-item" key={item.id}>
            {resolveImageUrl(item.featured_image ?? item.gallery?.[0]) ? (
              <img
                alt={item.title}
                src={resolveImageUrl(item.featured_image ?? item.gallery?.[0])!}
              />
            ) : (
              <div className="row-thumb" />
            )}
            <div>
              <strong>{item.title}</strong>
              <p>
                {item.category?.name ?? "Uncategorized"} ·{" "}
                {item.published ? "Published" : "Draft"} · {item.gallery?.length ?? 0} images
              </p>
            </div>
            <div className="button-row">
              <button className="button ghost" onClick={() => editItem(item)} type="button">
                Edit
              </button>
              <button className="button ghost" onClick={() => deleteItem(item.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
