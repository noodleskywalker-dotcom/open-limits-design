#!/usr/bin/env node
/**
 * Import public images and company info from https://openlimitsdesign.com/
 * into Supabase Storage (site-media) + CMS tables.
 *
 * Usage:
 *   node scripts/import-legacy-website.mjs
 *   node scripts/import-legacy-website.mjs --dry-run
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const SOURCE_SITE = "https://openlimitsdesign.com";
const DRY_RUN = process.argv.includes("--dry-run");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const OFFICE = {
  name: "Open Limits Design",
  tagline: "Architecture · Interior Design · FF&E · Construction",
  address: "Street 303, Zone 69, Building 254 Unit 303, Lusail City, Qatar",
  map_query: "Street 303, Zone 69, Building 254 Unit 303, Lusail City, Qatar",
  phone: "+974 7788 9033",
  email: "info@openlimitsdesign.com",
  hero_headline: "Design Without Limits",
  hero_subheadline:
    "Luxury architecture, interior design, FF&E, and construction — crafted in Qatar."
};

/** Official images only — full-size uploads from openlimitsdesign.com */
const IMAGE_MANIFEST = [
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2024/07/cropped-open_limits_logo-removebg-preview-1.png`,
    fileName: "open-limits-logo.png",
    title: "Open Limits Design Logo",
    category: "Company",
    placements: ["company:logo"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2024/07/JAZ1.jpg`,
    fileName: "project-jaz-residence.jpg",
    title: "JAZ Residence",
    category: "Projects",
    placements: ["project:jaz-residence:featured", "hero"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/0a5fe951-b9e4-45be-93c8-00fe64d947a2.jpeg`,
    fileName: "hero-luxury-interior-01.jpeg",
    title: "Hero — Luxury Interior 01",
    category: "Interior Design",
    placements: ["hero", "showroom-section:interior"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/0e205e8a-8ea2-4b83-ab21-2e9bfdb4fe55.jpeg`,
    fileName: "hero-luxury-interior-02.jpeg",
    title: "Hero — Luxury Interior 02",
    category: "Interior Design",
    placements: ["hero"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/02a9405b-82e1-4cdc-b3df-2fbfd851da75.jpeg`,
    fileName: "hero-architecture-01.jpeg",
    title: "Hero — Architecture 01",
    category: "Architecture",
    placements: ["hero", "showroom-section:architecture"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/4d64aeb7-45bf-46ce-8e8f-ba95ce42dc8d.jpeg`,
    fileName: "architecture-showroom-01.jpeg",
    title: "Architecture Showroom Scene 01",
    category: "Architecture",
    placements: ["showroom-room:architecture:Architecture Scene 01"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/06ef35c8-098f-4a65-a3be-7b53bd5fa0c9.jpeg`,
    fileName: "architecture-showroom-02.jpeg",
    title: "Architecture Showroom Scene 02",
    category: "Architecture",
    placements: ["showroom-room:architecture:Architecture Scene 02"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/8c5bfaca-91e2-4125-b909-01a5f848b6fb.jpeg`,
    fileName: "project-lusail-villa-01.jpeg",
    title: "Lusail Villa — Living Space",
    category: "Projects",
    placements: ["project:lusail-villa-living:featured", "project-gallery:lusail-villa-living"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/37bbb6b6-d4a6-4a7c-bd28-8b290c560066.jpeg`,
    fileName: "project-lusail-villa-02.jpeg",
    title: "Lusail Villa — Detail",
    category: "Projects",
    placements: ["project-gallery:lusail-villa-living"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/62cbea71-2d59-4ec0-819c-4f315246f182.jpeg`,
    fileName: "project-majlis-suite.jpeg",
    title: "Majlis Suite",
    category: "Projects",
    placements: ["project:majlis-suite:featured", "project-gallery:majlis-suite"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/81a880b7-6f7b-45fd-ad67-1743cfd98e95.jpeg`,
    fileName: "interior-showroom-bedroom.jpeg",
    title: "Interior Showroom — Bedroom",
    category: "Interior Design",
    placements: ["showroom-room:interior:Bedroom Suite", "showroom-section:interior"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/570a86e9-a7b4-45b3-86b3-199f770f3814.jpeg`,
    fileName: "interior-showroom-living.jpeg",
    title: "Interior Showroom — Living Room",
    category: "Interior Design",
    placements: ["showroom-room:interior:Living Room"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/809b6384-9aa4-4110-91aa-ca84a3d6c81f.jpeg`,
    fileName: "project-dining-collection.jpeg",
    title: "Dining Collection",
    category: "Projects",
    placements: ["project:dining-collection:featured"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/20348de4-1277-4cb3-8785-cdd2401758c4.jpeg`,
    fileName: "project-penthouse-lounge.jpeg",
    title: "Penthouse Lounge",
    category: "Projects",
    placements: ["project:penthouse-lounge:featured", "project-gallery:penthouse-lounge"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/21517de7-304b-4a9c-9a93-da1d684c315b.jpeg`,
    fileName: "project-gallery-detail-01.jpeg",
    title: "Project Detail 01",
    category: "Projects",
    placements: ["project-gallery:penthouse-lounge"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/57161d1e-a68e-46df-99c6-93123eb7b8f8.jpeg`,
    fileName: "furniture-showroom-feature.jpeg",
    title: "Furniture Showroom Feature",
    category: "Furniture",
    placements: ["showroom-section:furniture", "showroom-room:furniture:Furniture Collection"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/78408fb2-1a7d-4da3-9377-49928f5069fe.jpeg`,
    fileName: "projects-showroom-feature.jpeg",
    title: "Projects Showroom Feature",
    category: "Projects",
    placements: ["showroom-section:projects", "showroom-room:projects:Portfolio Highlight"]
  },
  {
    sourceUrl: `${SOURCE_SITE}/wp-content/uploads/2026/01/54121739-8c12-410c-ad2e-cead58418a32.jpeg`,
    fileName: "materials-finish-detail.jpeg",
    title: "Materials & Finishes Detail",
    category: "Materials",
    placements: ["showroom-room:interior:Materials Detail"]
  }
];

const report = {
  found: IMAGE_MANIFEST.length,
  uploaded: 0,
  skipped: 0,
  placements: [],
  errors: []
};

async function downloadBuffer(sourceUrl) {
  const response = await fetch(sourceUrl, { redirect: "follow" });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}

async function ensureMediaAsset(item) {
  const storagePath = `legacy-import/${item.fileName}`;

  const { data: existing } = await supabase
    .from("media_assets")
    .select("id, public_url, storage_path")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (existing) {
    report.skipped += 1;
    report.placements.push({ title: item.title, mediaId: existing.id, status: "existing", storagePath });
    return existing.id;
  }

  if (DRY_RUN) {
    report.placements.push({ title: item.title, status: "dry-run", storagePath });
    return null;
  }

  const { buffer, contentType } = await downloadBuffer(item.sourceUrl);
  const { error: uploadError } = await supabase.storage.from("site-media").upload(storagePath, buffer, {
    contentType,
    upsert: false
  });
  if (uploadError) throw new Error(uploadError.message);

  const publicUrl = supabase.storage.from("site-media").getPublicUrl(storagePath).data.publicUrl;
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      title: item.title,
      alt_text: item.title,
      category: item.category,
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: contentType,
      size_bytes: buffer.length
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  report.uploaded += 1;
  report.placements.push({ title: item.title, mediaId: data.id, status: "uploaded", storagePath });
  return data.id;
}

async function upsertProject(slug, title, description, featuredMediaId, location = "Lusail, Qatar") {
  if (DRY_RUN || !featuredMediaId) return;

  const { data: existing } = await supabase.from("projects").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    await supabase
      .from("projects")
      .update({ featured_image_id: featuredMediaId, title, description, location, is_published: true })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      slug,
      title,
      description,
      location,
      featured_image_id: featuredMediaId,
      is_published: true,
      is_featured: false,
      sort_order: 50
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function linkProjectGallery(projectSlug, mediaId) {
  if (DRY_RUN || !mediaId) return;
  const { data: project } = await supabase.from("projects").select("id").eq("slug", projectSlug).maybeSingle();
  if (!project) return;

  const { data: existing } = await supabase
    .from("project_images")
    .select("media_id")
    .eq("project_id", project.id)
    .eq("media_id", mediaId)
    .maybeSingle();
  if (existing) return;

  await supabase.from("project_images").insert({
    project_id: project.id,
    media_id: mediaId,
    sort_order: Date.now() % 1000
  });
}

async function applyPlacements(item, mediaId) {
  if (!mediaId) return;

  for (const placement of item.placements) {
    if (placement === "hero") {
      if (DRY_RUN) continue;
      const { data: heroExisting } = await supabase
        .from("homepage_hero_images")
        .select("id")
        .eq("media_id", mediaId)
        .maybeSingle();
      if (!heroExisting) {
        const { count } = await supabase.from("homepage_hero_images").select("*", { count: "exact", head: true });
        await supabase.from("homepage_hero_images").insert({ media_id: mediaId, sort_order: (count ?? 0) + 1 });
      }
      report.placements.push({ title: item.title, placed: "homepage_hero_images" });
    } else if (placement.startsWith("company:logo")) {
      if (!DRY_RUN) await supabase.from("company_profile").update({ logo_image_id: mediaId }).eq("id", 1);
      report.placements.push({ title: item.title, placed: "company_profile.logo_image_id" });
    } else if (placement.startsWith("showroom-section:")) {
      const slug = placement.split(":")[1];
      if (!DRY_RUN) {
        await supabase.from("showroom_sections").update({ image_id: mediaId }).eq("slug", slug);
      }
      report.placements.push({ title: item.title, placed: `showroom_sections.${slug}` });
    } else if (placement.startsWith("showroom-room:")) {
      const [, slug, roomTitle] = placement.split(":");
      if (DRY_RUN) continue;
      const { data: section } = await supabase.from("showroom_sections").select("id").eq("slug", slug).maybeSingle();
      if (!section) continue;
      const { data: roomExisting } = await supabase
        .from("showroom_images")
        .select("id")
        .eq("section_id", section.id)
        .eq("title", roomTitle)
        .maybeSingle();
      if (!roomExisting) {
        const { count } = await supabase
          .from("showroom_images")
          .select("*", { count: "exact", head: true })
          .eq("section_id", section.id);
        await supabase.from("showroom_images").insert({
          section_id: section.id,
          media_id: mediaId,
          title: roomTitle,
          description: `Imported from ${SOURCE_SITE}`,
          sort_order: count ?? 0,
          published: true
        });
      }
      report.placements.push({ title: item.title, placed: `showroom_images.${slug}.${roomTitle}` });
    } else if (placement.startsWith("project:")) {
      const parts = placement.split(":");
      const slug = parts[1];
      const title = item.title.replace(/^Project — /, "");
      await upsertProject(slug, title, `Imported portfolio project from ${SOURCE_SITE}.`, mediaId);
      report.placements.push({ title: item.title, placed: `projects.${slug}` });
    } else if (placement.startsWith("project-gallery:")) {
      const slug = placement.split(":")[1];
      await linkProjectGallery(slug, mediaId);
      report.placements.push({ title: item.title, placed: `project_images.${slug}` });
    }
  }
}

async function updateCompanyProfile() {
  if (DRY_RUN) {
    console.log("DRY RUN — would update company_profile with office/contact info");
    return;
  }

  const { error } = await supabase.from("company_profile").upsert({
    id: 1,
    ...OFFICE
  });
  if (error) throw new Error(error.message);
}

async function attachServiceImages(mediaByCategory) {
  const architectureId = mediaByCategory.get("Architecture")?.[0];
  const interiorId = mediaByCategory.get("Interior Design")?.[0];
  if (DRY_RUN) return;

  if (architectureId) {
    await supabase.from("services").update({ image_id: architectureId }).eq("slug", "architecture");
  }
  if (interiorId) {
    await supabase.from("services").update({ image_id: interiorId }).eq("slug", "interior-design");
  }
}

console.log(`Importing from ${SOURCE_SITE}${DRY_RUN ? " (dry run)" : ""}\n`);

await updateCompanyProfile();

const mediaByCategory = new Map();
for (const item of IMAGE_MANIFEST) {
  try {
    const mediaId = await ensureMediaAsset(item);
    if (mediaId) {
      if (!mediaByCategory.has(item.category)) mediaByCategory.set(item.category, []);
      mediaByCategory.get(item.category).push(mediaId);
    }
    await applyPlacements(item, mediaId);
  } catch (error) {
    report.errors.push({ title: item.title, error: error instanceof Error ? error.message : String(error) });
  }
}

await attachServiceImages(mediaByCategory);

console.log("=== IMPORT REPORT ===");
console.log("Images in manifest:", report.found);
console.log("Uploaded:", report.uploaded);
console.log("Skipped (already imported):", report.skipped);
console.log("Errors:", report.errors.length);
console.log("\nOffice / location from contact page:");
console.log(OFFICE.address);
console.log(OFFICE.phone);
console.log(OFFICE.email);
console.log("\nPlacements:");
console.table(report.placements);
if (report.errors.length) {
  console.log("\nErrors:");
  report.errors.forEach((e) => console.log("-", e.title, e.error));
  process.exit(1);
}

console.log("\nDone. Verify in Admin → Media, Homepage, Showroom, Projects.");
