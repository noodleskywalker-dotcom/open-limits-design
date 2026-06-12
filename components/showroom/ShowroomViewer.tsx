"use client";

import Link from "next/link";
import { useState } from "react";
import type { ShowroomHotspot, ShowroomImage } from "@/lib/cms/types";
import { resolveImageUrl } from "@/lib/cms/types";
import { hotspotHref } from "@/lib/cms/showroom-utils";

function Hotspot({
  hotspot,
  onSelect
}: {
  hotspot: ShowroomHotspot;
  onSelect: (h: ShowroomHotspot) => void;
}) {
  return (
    <button
      aria-label={hotspot.label}
      className="showroom-hotspot"
      onClick={() => onSelect(hotspot)}
      style={{
        left: `${hotspot.x_percent}%`,
        top: `${hotspot.y_percent}%`,
        width: `${hotspot.width_percent}%`,
        height: `${hotspot.height_percent}%`
      }}
      type="button"
    >
      <span className="showroom-hotspot-pulse" />
      <span className="showroom-hotspot-label">{hotspot.label}</span>
    </button>
  );
}

export default function ShowroomViewer({ images }: { images: ShowroomImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<ShowroomHotspot | null>(null);

  if (!images.length) {
    return (
      <div className="empty-state">
        Showroom rooms coming soon. Add room images and hotspots in Admin → Showroom.
      </div>
    );
  }

  const current = images[activeIndex];
  const imageUrl = resolveImageUrl(current.media);

  return (
    <div className="showroom-viewer">
      <div className="showroom-viewer-tabs">
        {images.map((image, index) => (
          <button
            className={index === activeIndex ? "active" : ""}
            key={image.id}
            onClick={() => {
              setActiveIndex(index);
              setSelected(null);
            }}
            type="button"
          >
            {image.title}
          </button>
        ))}
      </div>

      {current.description ? <p className="lead">{current.description}</p> : null}

      <div className="showroom-scene">
        {imageUrl ? (
          <img alt={current.title} className="showroom-scene-image" src={imageUrl} />
        ) : (
          <div className="image-placeholder tall">{current.title}</div>
        )}
        {(current.hotspots ?? []).map((hotspot) => (
          <Hotspot hotspot={hotspot} key={hotspot.id} onSelect={setSelected} />
        ))}
      </div>

      {selected ? (
        <div className="showroom-hotspot-panel">
          <strong>{selected.label}</strong>
          <Link className="button" href={hotspotHref(selected.link_type, selected.link_target)}>
            View details
          </Link>
          <button className="button ghost" onClick={() => setSelected(null)} type="button">
            Close
          </button>
        </div>
      ) : (
        <p className="meta">Tap highlighted areas to explore furniture, materials, and projects.</p>
      )}
    </div>
  );
}
