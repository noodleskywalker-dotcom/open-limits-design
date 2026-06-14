"use client";

import { useState } from "react";
import Link from "next/link";
import type { Material } from "@/lib/cms/types";
import { resolveImageUrl } from "@/lib/cms/types";

type SpecGroup = {
  label: string;
  value: string;
};

export default function FurnitureProductPanel({
  title,
  phone,
  specs,
  materials,
  upholstery
}: {
  title: string;
  phone: string;
  specs: SpecGroup[];
  materials: Material[];
  upholstery: string | null;
}) {
  const [openSection, setOpenSection] = useState<string | null>("Dimensions");
  const whatsapp = phone.replace(/\s+/g, "");
  const whatsappUrl = `https://wa.me/${whatsapp.replace(/^\+/, "")}?text=${encodeURIComponent(
    `Hello OPEN LIMITS DESIGN, I would like to request pricing for: ${title}`
  )}`;

  const sections: SpecGroup[] = [
    ...specs,
    ...(upholstery ? [{ label: "Upholstery options", value: upholstery }] : [])
  ];

  function toggle(label: string) {
    setOpenSection((current) => (current === label ? null : label));
  }

  return (
    <div className="furniture-product-panel">
      <div className="product-dropdowns">
        {sections.map((section) => (
          <div className="product-dropdown" key={section.label}>
            <button
              aria-expanded={openSection === section.label}
              className="product-dropdown-toggle"
              onClick={() => toggle(section.label)}
              type="button"
            >
              {section.label}
              <span>{openSection === section.label ? "−" : "+"}</span>
            </button>
            {openSection === section.label ? <p>{section.value}</p> : null}
          </div>
        ))}
      </div>

      {materials.length ? (
        <div className="material-swatches">
          <p className="eyebrow">Materials</p>
          <div className="swatch-grid">
            {materials.map((material) => {
              const image = resolveImageUrl(material.image);
              return (
                <div className="swatch-item" key={material.id}>
                  {image ? (
                    <img alt={material.name} className="swatch-image" src={image} />
                  ) : (
                    <div className="swatch-missing">Missing exact material image</div>
                  )}
                  <span>{material.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="button-row product-actions">
        <a className="button" href={whatsappUrl} rel="noopener noreferrer" target="_blank">
          Request Price
        </a>
        <a className="button ghost" href={whatsappUrl} rel="noopener noreferrer" target="_blank">
          WhatsApp
        </a>
        <Link className="button ghost" href="/book-meeting-with-ceo">
          Book Consultation
        </Link>
      </div>
    </div>
  );
}
