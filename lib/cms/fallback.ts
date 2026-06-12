import type {
  CompanyProfile,
  FurnitureCategory,
  FurnitureItem,
  IntroSlide,
  Material,
  Project,
  Service,
  ShowroomSection,
  TeamMember
} from "./types";
import { fallbackFurnitureCatalog } from "@/lib/furniture/fallback-catalog";
import {
  LEGACY_LOGO_URL,
  legacyMaterials,
  legacyProjects,
  legacyShowroomSections
} from "./legacy-images";

export const fallbackCompanyProfile: CompanyProfile = {
  id: 1,
  name: "Open Limits Design",
  tagline: "Architecture · Interior Design · FF&E · Construction",
  description:
    "A luxury design studio for architecture, interiors, custom furniture, and turnkey project delivery.",
  address: "Street 303, Zone 69, Building 254 Unit 303, Lusail City, Qatar",
  phone: "+974 7788 9033",
  phone2: "+974 5081 6176",
  email: "info@openlimitsdesign.com",
  hero_headline: "Design Without Limits",
  hero_subheadline:
    "Luxury architecture, interior design, FF&E, and construction — crafted in Qatar.",
  ceo_image_id: null,
  ceo_name: "Mohammed",
  ceo_bio:
    "Leading Open Limits with vision and expertise in luxury design and contracting.",
  about_text: null,
  map_query: "Street 303, Zone 69, Building 254 Unit 303, Lusail City, Qatar",
  logo_image_id: "legacy-logo",
  ceo_image: null,
  logo_image: {
    id: "legacy-logo",
    title: "Open Limits Design Logo",
    alt_text: "Open Limits Design",
    category: "Company",
    storage_path: LEGACY_LOGO_URL,
    public_url: LEGACY_LOGO_URL,
    mime_type: "image/png",
    width: null,
    height: null,
    size_bytes: null,
    created_at: "2024-01-01T00:00:00.000Z"
  }
};

export const fallbackShowroomSections: ShowroomSection[] = legacyShowroomSections;

export const fallbackIntroSlides: IntroSlide[] = [];

export const fallbackServices: Service[] = [
  {
    id: "architecture",
    slug: "architecture",
    title: "Architecture",
    description: "Concept, design development, and delivery for residential and commercial spaces.",
    icon: null,
    image_url: "/images/legacy/hero-architecture-01.jpeg",
    image_id: null,
    sort_order: 1,
    is_active: true
  },
  {
    id: "interior-design",
    slug: "interior-design",
    title: "Interior Design",
    description: "Material palettes, spatial planning, FF&E, and turnkey interior experiences.",
    icon: null,
    image_url: "/images/legacy/interior-showroom-bedroom.jpeg",
    image_id: null,
    sort_order: 2,
    is_active: true
  },
  {
    id: "furniture-design",
    slug: "furniture-design",
    title: "Furniture Design",
    description: "Custom furniture direction and curated pieces for complete environments.",
    icon: null,
    image_url: "/images/legacy/furniture-showroom-feature.jpeg",
    image_id: null,
    sort_order: 3,
    is_active: true
  }
];

export const fallbackProjects: Project[] = legacyProjects;

export const fallbackTeam: TeamMember[] = [];

export const fallbackFurnitureCategories: FurnitureCategory[] = [
  { id: "sofas", slug: "sofas", name: "Sofas", description: null, sort_order: 1, published: true },
  { id: "majlis", slug: "majlis", name: "Majlis", description: null, sort_order: 2, published: true },
  { id: "chairs", slug: "chairs", name: "Chairs", description: null, sort_order: 3, published: true },
  { id: "tables", slug: "tables", name: "Tables", description: null, sort_order: 4, published: true },
  { id: "bedrooms", slug: "bedrooms", name: "Bedrooms", description: null, sort_order: 9, published: true },
  { id: "exterior", slug: "exterior", name: "Exterior", description: null, sort_order: 10, published: true }
];

export const fallbackFurnitureItems: FurnitureItem[] = fallbackFurnitureCatalog;

export const fallbackMaterials: Material[] = legacyMaterials;
