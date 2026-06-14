import type {
  HomepageHeroImage,
  Material,
  MediaAsset,
  MediaCategory,
  Project,
  ShowroomImage,
  ShowroomSection
} from "./types";

const LEGACY_BASE = "/images/legacy";

export const LEGACY_LOGO_URL = `${LEGACY_BASE}/open-limits-logo.png`;
export const LEGACY_INTRO_BLUEPRINT_URL = `${LEGACY_BASE}/hero-architecture-01.jpeg`;
export const LEGACY_INTRO_FINAL_URL = `${LEGACY_BASE}/hero-luxury-interior-01.jpeg`;

function legacyMedia(id: string, fileName: string, title: string, category: MediaCategory): MediaAsset {
  return {
    id: `legacy-${id}`,
    title,
    alt_text: title,
    category,
    storage_path: `${LEGACY_BASE}/${fileName}`,
    public_url: `${LEGACY_BASE}/${fileName}`,
    mime_type: null,
    width: null,
    height: null,
    size_bytes: null,
    created_at: "2024-01-01T00:00:00.000Z"
  };
}

const media = {
  logo: legacyMedia("logo", "open-limits-logo.png", "Open Limits Design Logo", "Company"),
  heroInterior01: legacyMedia(
    "hero-interior-01",
    "hero-luxury-interior-01.jpeg",
    "Luxury Interior",
    "Interior Design"
  ),
  heroInterior02: legacyMedia(
    "hero-interior-02",
    "hero-luxury-interior-02.jpeg",
    "Luxury Interior 02",
    "Interior Design"
  ),
  heroArchitecture: legacyMedia(
    "hero-architecture",
    "hero-architecture-01.jpeg",
    "Architecture",
    "Architecture"
  ),
  architectureShowroom01: legacyMedia(
    "architecture-showroom-01",
    "architecture-showroom-01.jpeg",
    "Architecture Scene 01",
    "Architecture"
  ),
  architectureShowroom02: legacyMedia(
    "architecture-showroom-02",
    "architecture-showroom-02.jpeg",
    "Architecture Scene 02",
    "Architecture"
  ),
  projectsShowroom: legacyMedia(
    "projects-showroom",
    "projects-showroom-feature.jpeg",
    "Portfolio Highlight",
    "Projects"
  ),
  furnitureShowroom: legacyMedia(
    "furniture-showroom",
    "furniture-showroom-feature.jpeg",
    "Furniture Collection",
    "Furniture"
  ),
  interiorBedroom: legacyMedia(
    "interior-bedroom",
    "interior-showroom-bedroom.jpeg",
    "Bedroom Suite",
    "Interior Design"
  ),
  interiorLiving: legacyMedia(
    "interior-living",
    "interior-showroom-living.jpeg",
    "Living Room",
    "Interior Design"
  ),
  materialsDetail: legacyMedia(
    "materials-detail",
    "materials-finish-detail.jpeg",
    "Materials & Finishes",
    "Materials"
  ),
  jazResidence: legacyMedia("jaz-residence", "project-jaz-residence.jpg", "JAZ Residence", "Projects"),
  lusailVilla01: legacyMedia(
    "lusail-villa-01",
    "project-lusail-villa-01.jpeg",
    "Lusail Villa — Living Space",
    "Projects"
  ),
  lusailVilla02: legacyMedia(
    "lusail-villa-02",
    "project-lusail-villa-02.jpeg",
    "Lusail Villa — Detail",
    "Projects"
  ),
  majlisSuite: legacyMedia("majlis-suite", "project-majlis-suite.jpeg", "Majlis Suite", "Projects"),
  diningCollection: legacyMedia(
    "dining-collection",
    "project-dining-collection.jpeg",
    "Dining Collection",
    "Projects"
  ),
  penthouseLounge: legacyMedia(
    "penthouse-lounge",
    "project-penthouse-lounge.jpeg",
    "Penthouse Lounge",
    "Projects"
  ),
  penthouseDetail: legacyMedia(
    "penthouse-detail",
    "project-gallery-detail-01.jpeg",
    "Project Detail",
    "Projects"
  )
};

function showroomImage(
  id: string,
  sectionId: string,
  asset: MediaAsset,
  title: string,
  sortOrder: number
): ShowroomImage {
  return {
    id,
    section_id: sectionId,
    media_id: asset.id,
    title,
    description: "Imported from openlimitsdesign.com",
    sort_order: sortOrder,
    published: true,
    media: asset
  };
}

export const legacyShowroomSections: ShowroomSection[] = [
  {
    id: "architecture",
    slug: "architecture",
    title: "Architecture",
    description: "Concept to delivery for residential and commercial spaces.",
    image_id: media.heroArchitecture.id,
    link_url: "/showroom/architecture",
    sort_order: 1,
    published: true,
    image: media.heroArchitecture
  },
  {
    id: "projects",
    slug: "projects",
    title: "Projects",
    description: "A curated portfolio of completed work across Qatar.",
    image_id: media.projectsShowroom.id,
    link_url: "/showroom/projects",
    sort_order: 2,
    published: true,
    image: media.projectsShowroom
  },
  {
    id: "furniture",
    slug: "furniture",
    title: "Furniture",
    description: "Bespoke collections, majlis, bedrooms, and custom pieces.",
    image_id: media.furnitureShowroom.id,
    link_url: "/showroom/furniture",
    sort_order: 3,
    published: true,
    image: media.furnitureShowroom
  },
  {
    id: "interior",
    slug: "interior",
    title: "Interior Design",
    description: "Material palettes, spatial planning, and turnkey interiors.",
    image_id: media.interiorBedroom.id,
    link_url: "/showroom/interior",
    sort_order: 4,
    published: true,
    image: media.interiorBedroom
  }
];

export const legacyShowroomImagesBySection: Record<string, ShowroomImage[]> = {
  architecture: [
    showroomImage("legacy-arch-1", "architecture", media.architectureShowroom01, "Architecture Scene 01", 0),
    showroomImage("legacy-arch-2", "architecture", media.architectureShowroom02, "Architecture Scene 02", 1),
    showroomImage("legacy-arch-3", "architecture", media.heroArchitecture, "Architecture Overview", 2)
  ],
  projects: [
    showroomImage("legacy-proj-1", "projects", media.projectsShowroom, "Portfolio Highlight", 0),
    showroomImage("legacy-proj-2", "projects", media.lusailVilla01, "Lusail Villa", 1),
    showroomImage("legacy-proj-3", "projects", media.penthouseLounge, "Penthouse Lounge", 2)
  ],
  furniture: [
    showroomImage("legacy-furn-1", "furniture", media.furnitureShowroom, "Furniture Collection", 0),
    showroomImage("legacy-furn-2", "furniture", media.majlisSuite, "Majlis Suite", 1),
    showroomImage("legacy-furn-3", "furniture", media.diningCollection, "Dining Collection", 2)
  ],
  interior: [
    showroomImage("legacy-int-1", "interior", media.interiorBedroom, "Bedroom Suite", 0),
    showroomImage("legacy-int-2", "interior", media.interiorLiving, "Living Room", 1),
    showroomImage("legacy-int-3", "interior", media.materialsDetail, "Materials Detail", 2)
  ]
};

export const legacyProjects: Project[] = [
  {
    id: "legacy-jaz-residence",
    slug: "jaz-residence",
    title: "JAZ Residence",
    description: "Luxury residential architecture and interior delivery.",
    location: "Qatar",
    category: "Residential",
    completion_date: null,
    cover_image_url: media.jazResidence.public_url,
    featured_image_id: media.jazResidence.id,
    is_featured: true,
    is_published: true,
    sort_order: 1,
    featured_image: media.jazResidence,
    gallery: [media.jazResidence]
  },
  {
    id: "legacy-lusail-villa-living",
    slug: "lusail-villa-living",
    title: "Lusail Villa — Living Space",
    description: "Open-plan living with bespoke FF&E and material palette.",
    location: "Lusail, Qatar",
    category: "Residential",
    completion_date: null,
    cover_image_url: media.lusailVilla01.public_url,
    featured_image_id: media.lusailVilla01.id,
    is_featured: true,
    is_published: true,
    sort_order: 2,
    featured_image: media.lusailVilla01,
    gallery: [media.lusailVilla01, media.lusailVilla02]
  },
  {
    id: "legacy-majlis-suite",
    slug: "majlis-suite",
    title: "Majlis Suite",
    description: "Custom majlis seating and hospitality furniture.",
    location: "Qatar",
    category: "Furniture",
    completion_date: null,
    cover_image_url: media.majlisSuite.public_url,
    featured_image_id: media.majlisSuite.id,
    is_featured: false,
    is_published: true,
    sort_order: 3,
    featured_image: media.majlisSuite,
    gallery: [media.majlisSuite]
  },
  {
    id: "legacy-dining-collection",
    slug: "dining-collection",
    title: "Dining Collection",
    description: "Dining tables, chairs, and lighting for formal entertaining.",
    location: "Qatar",
    category: "Furniture",
    completion_date: null,
    cover_image_url: media.diningCollection.public_url,
    featured_image_id: media.diningCollection.id,
    is_featured: false,
    is_published: true,
    sort_order: 4,
    featured_image: media.diningCollection,
    gallery: [media.diningCollection]
  },
  {
    id: "legacy-penthouse-lounge",
    slug: "penthouse-lounge",
    title: "Penthouse Lounge",
    description: "Penthouse lounge with layered textures and custom upholstery.",
    location: "Doha, Qatar",
    category: "Interior Design",
    completion_date: null,
    cover_image_url: media.penthouseLounge.public_url,
    featured_image_id: media.penthouseLounge.id,
    is_featured: true,
    is_published: true,
    sort_order: 5,
    featured_image: media.penthouseLounge,
    gallery: [media.penthouseLounge, media.penthouseDetail]
  }
];

export const legacyMaterials: Material[] = [
  {
    id: "legacy-materials-finish",
    slug: "materials-finish-detail",
    name: "Materials & Finishes",
    description: "Stone, wood, metal, and textile combinations from live projects.",
    category: "Finishes",
    image_id: media.materialsDetail.id,
    sort_order: 1,
    published: true,
    image: media.materialsDetail
  }
];

export const legacyHeroImages: HomepageHeroImage[] = [
  { id: "legacy-hero-1", media_id: media.heroInterior01.id, sort_order: 0, media: media.heroInterior01 },
  { id: "legacy-hero-2", media_id: media.heroInterior02.id, sort_order: 1, media: media.heroInterior02 },
  { id: "legacy-hero-3", media_id: media.heroArchitecture.id, sort_order: 2, media: media.heroArchitecture }
];

export { media as legacyMediaAssets };
