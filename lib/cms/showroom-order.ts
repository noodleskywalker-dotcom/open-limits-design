import type { ShowroomSection } from "./types";

/** Canonical homepage discipline order: Architecture → Interior → Projects → Furniture */
export const SHOWROOM_SECTION_ORDER = ["architecture", "interior", "projects", "furniture"] as const;

export function sortShowroomSections(sections: ShowroomSection[]): ShowroomSection[] {
  const orderIndex = new Map(SHOWROOM_SECTION_ORDER.map((slug, index) => [slug, index]));

  return [...sections].sort((a, b) => {
    const aOrder = orderIndex.get(a.slug as (typeof SHOWROOM_SECTION_ORDER)[number]);
    const bOrder = orderIndex.get(b.slug as (typeof SHOWROOM_SECTION_ORDER)[number]);
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}
