"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FURNITURE_CATEGORIES,
  filterFurnitureProducts,
  getFurnitureCategory,
  type FurnitureCategoryName
} from "@/lib/furniture-categories";
import type { FurnitureItem } from "@/lib/cms/types";
import { resolveImageUrl } from "@/lib/cms/types";

export default function FurnitureCatalog({ items }: { items: FurnitureItem[] }) {
  const [activeCategory, setActiveCategory] = useState<FurnitureCategoryName>("All");

  const visibleItems = useMemo(
    () => filterFurnitureProducts(items, activeCategory),
    [activeCategory, items]
  );

  return (
    <div>
      <div className="category-list" role="tablist" aria-label="Furniture categories">
        {FURNITURE_CATEGORIES.map((category) => (
          <button
            aria-selected={activeCategory === category}
            className={`category-pill ${activeCategory === category ? "active" : ""}`}
            key={category}
            onClick={() => setActiveCategory(category)}
            role="tab"
            type="button"
          >
            {category}
          </button>
        ))}
      </div>

      <p className="meta catalog-count">
        {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"} in {activeCategory}
      </p>

      {visibleItems.length ? (
        <div className="grid">
          {visibleItems.map((item) => {
            const image = resolveImageUrl(item.featured_image ?? item.gallery?.[0]);
            const categoryName = getFurnitureCategory(item.title);
            return (
              <Link className="card furniture-card" href={`/furniture/${item.slug}`} key={item.id}>
                <div className="furniture-image-wrap">
                  {image ? (
                    <img
                      alt={item.featured_image?.alt_text ?? item.title}
                      className="furniture-image"
                      src={image}
                    />
                  ) : (
                    <div className="image-placeholder">{item.title}</div>
                  )}
                </div>
                <div className="card-body">
                  <p className="meta">
                    {categoryName}
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
        <div className="empty-state">No products found in this category.</div>
      )}
    </div>
  );
}
