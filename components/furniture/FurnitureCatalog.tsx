"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FurnitureCategory, FurnitureItem } from "@/lib/cms/types";
import { resolveImageUrl } from "@/lib/cms/types";

export default function FurnitureCatalog({
  categories,
  items
}: {
  categories: FurnitureCategory[];
  items: FurnitureItem[];
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const visibleItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((item) => item.category_id === activeCategory);
  }, [activeCategory, items]);

  const activeName =
    activeCategory === "all"
      ? "All"
      : categories.find((category) => category.id === activeCategory)?.name ?? "All";

  return (
    <div>
      <div className="category-list" role="tablist" aria-label="Furniture categories">
        <button
          className={`category-pill ${activeCategory === "all" ? "active" : ""}`}
          onClick={() => setActiveCategory("all")}
          role="tab"
          aria-selected={activeCategory === "all"}
          type="button"
        >
          All
        </button>
        {categories.map((category) => (
          <button
            className={`category-pill ${activeCategory === category.id ? "active" : ""}`}
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            role="tab"
            aria-selected={activeCategory === category.id}
            type="button"
          >
            {category.name}
          </button>
        ))}
      </div>

      <p className="meta catalog-count">
        {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"} in {activeName}
      </p>

      {visibleItems.length ? (
        <div className="grid">
          {visibleItems.map((item) => {
            const image = resolveImageUrl(item.featured_image ?? item.gallery?.[0]);
            return (
              <Link className="card" href={`/furniture/${item.slug}`} key={item.id}>
                {image ? (
                  <img
                    className="project-cover"
                    src={image}
                    alt={item.featured_image?.alt_text ?? item.title}
                  />
                ) : (
                  <div className="image-placeholder">{item.title}</div>
                )}
                <div className="card-body">
                  <p className="meta">
                    {item.category?.name ?? "Furniture"}
                    {item.collection ? ` · ${item.collection}` : ""}
                  </p>
                  <h3>{item.title}</h3>
                  {item.dimensions ? <p className="meta">{item.dimensions}</p> : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          No published items in {activeName} yet. Add items from the admin dashboard.
        </div>
      )}
    </div>
  );
}
