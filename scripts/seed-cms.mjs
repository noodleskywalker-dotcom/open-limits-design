#!/usr/bin/env node
/**
 * Seeds/repairs CMS data in Supabase using the service role key.
 * Idempotent: re-running never duplicates rows.
 * Run AFTER applying supabase/migrations/restore_open_limits.sql.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// The first eight are the highlighted core offering; they sort to the top.
const SERVICES = [
  { slug: "architecture", title: "Architecture", description: "Concept, design development, and delivery for residential and commercial spaces.", sort_order: 1 },
  { slug: "interior-design", title: "Interior Design", description: "Material palettes, spatial planning, FF&E, and turnkey interior experiences.", sort_order: 2 },
  { slug: "construction", title: "Construction", description: "Full construction works from groundbreaking to handover.", sort_order: 3 },
  { slug: "furniture-supply", title: "Furniture Supply", description: "Sourcing, supply, and installation of bespoke and curated furniture.", sort_order: 4 },
  { slug: "bim-revit", title: "BIM / Revit", description: "Building information modeling, Revit documentation, and coordination.", sort_order: 5 },
  { slug: "fit-out", title: "Fit-Out", description: "Complete interior fit-out packages for residential and commercial spaces.", sort_order: 6 },
  { slug: "engineering-services", title: "Engineering Services", description: "Structural, MEP, and specialist engineering services.", sort_order: 7 },
  { slug: "project-management", title: "Project Management", description: "End-to-end delivery, scheduling, and supervision.", sort_order: 8 },
  { slug: "luxury-residential-design", title: "Luxury Residential Design", description: "Bespoke villas, penthouses, and private residences.", sort_order: 9 },
  { slug: "commercial-design", title: "Commercial Design", description: "Offices, retail, and hospitality environments.", sort_order: 10 },
  { slug: "furniture-design", title: "Furniture Design", description: "Custom furniture direction and curated pieces.", sort_order: 11 },
  { slug: "shell-core", title: "Shell & Core", description: "Structural shell and core construction works.", sort_order: 12 },
  { slug: "windows", title: "Windows", description: "Premium window systems and installation.", sort_order: 13 },
  { slug: "facade", title: "Facade", description: "Facade design, engineering, and cladding.", sort_order: 14 },
  { slug: "freelance", title: "Freelance", description: "Specialist freelance design services.", sort_order: 15 },
  { slug: "drill-types", title: "Drill Types", description: "Specialized drilling works.", sort_order: 16 }
];

const OFFICE = {
  address: "Street 303, Zone 69, Building 254, Unit 303, Lusail, Qatar",
  phone: "+974 7788 9033",
  email: "info@openlimitsdesign.com",
  map_query: "Street 303, Zone 69, Building 254, Unit 303, Lusail, Qatar"
};

const FURNITURE_CATEGORIES = [
  { slug: "sofas", name: "Sofas", sort_order: 1 },
  { slug: "majlis", name: "Majlis", sort_order: 2 },
  { slug: "chairs", name: "Chairs", sort_order: 3 },
  { slug: "tables", name: "Tables", sort_order: 4 },
  { slug: "beds", name: "Beds", sort_order: 5 },
  { slug: "cabinets", name: "Cabinets", sort_order: 6 },
  { slug: "lighting", name: "Lighting", sort_order: 7 },
  { slug: "decor", name: "Decor", sort_order: 8 },
  { slug: "bedrooms", name: "Bedrooms", sort_order: 9 },
  { slug: "exterior", name: "Exterior", sort_order: 10 },
  { slug: "dining", name: "Dining", sort_order: 11 },
  { slug: "custom-furniture", name: "Custom Furniture", sort_order: 12 }
];

const MATERIALS = [
  { slug: "oak", name: "Oak", category: "Wood", sort_order: 1 },
  { slug: "walnut", name: "Walnut", category: "Wood", sort_order: 2 },
  { slug: "solid-wood-frame", name: "Solid Wood Frame", category: "Wood", sort_order: 3 },
  { slug: "veneer-finish", name: "Veneer Finish", category: "Wood", sort_order: 4 },
  { slug: "marble", name: "Marble", category: "Stone", sort_order: 5 },
  { slug: "leather", name: "Leather", category: "Upholstery", sort_order: 6 },
  { slug: "fabric", name: "Fabric", category: "Upholstery", sort_order: 7 },
  { slug: "linen", name: "Linen", category: "Upholstery", sort_order: 8 },
  { slug: "high-density-sponge", name: "High-Density Sponge", category: "Upholstery", sort_order: 9 },
  { slug: "steel", name: "Steel", category: "Metal", sort_order: 10 },
  { slug: "brushed-brass", name: "Brushed Brass", category: "Metal", sort_order: 11 }
];

async function upsertBySlug(table, rows, extra = {}) {
  const { data: existing, error } = await supabase.from(table).select("slug");
  if (error) {
    console.log(`SKIP ${table}: ${error.message}`);
    return;
  }
  const have = new Set((existing ?? []).map((row) => row.slug));
  const missing = rows.filter((row) => !have.has(row.slug)).map((row) => ({ ...row, ...extra }));
  if (!missing.length) {
    console.log(`OK   ${table}: nothing to add (${have.size} rows present)`);
    return;
  }
  const { error: insertError } = await supabase.from(table).insert(missing);
  console.log(
    insertError
      ? `FAIL ${table}: ${insertError.message}`
      : `OK   ${table}: added ${missing.length} rows (${missing.map((r) => r.slug).join(", ")})`
  );
}

async function reorderServices() {
  for (const service of SERVICES) {
    await supabase
      .from("services")
      .update({ sort_order: service.sort_order })
      .eq("slug", service.slug);
  }
  console.log("OK   services: sort order refreshed (core 8 first)");
}

async function seedOfficeInfo() {
  const { data: current, error } = await supabase
    .from("company_profile")
    .select("address, phone, email")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.log(`SKIP office info: ${error.message}`);
    return;
  }

  const patch = {};
  if (!current?.address) patch.address = OFFICE.address;
  if (!current?.phone) patch.phone = OFFICE.phone;
  if (!current?.email) patch.email = OFFICE.email;

  if (!Object.keys(patch).length) {
    console.log("OK   office info: already set");
  } else {
    const { error: updateError } = await supabase.from("company_profile").update(patch).eq("id", 1);
    console.log(
      updateError ? `FAIL office info: ${updateError.message}` : "OK   office info: address/phone/email set"
    );
  }

  // map_query column only exists after restore_open_limits.sql has been run.
  const { error: mapError } = await supabase
    .from("company_profile")
    .update({ map_query: OFFICE.map_query })
    .eq("id", 1)
    .is("map_query", null);
  if (mapError) {
    console.log(`SKIP map_query: ${mapError.message} (run restore_open_limits.sql first)`);
  } else {
    console.log("OK   map_query: set");
  }
}

async function dedupeTeamMembers() {
  const { data, error } = await supabase
    .from("team_members")
    .select("id, name, role, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    console.log(`SKIP team dedupe: ${error.message}`);
    return;
  }
  const seen = new Set();
  const duplicates = [];
  for (const member of data ?? []) {
    const key = `${member.name}|${member.role}`;
    if (seen.has(key)) duplicates.push(member.id);
    else seen.add(key);
  }
  if (!duplicates.length) {
    console.log("OK   team_members: no duplicates");
    return;
  }
  const { error: deleteError } = await supabase.from("team_members").delete().in("id", duplicates);
  console.log(
    deleteError
      ? `FAIL team dedupe: ${deleteError.message}`
      : `OK   team_members: removed ${duplicates.length} duplicate rows`
  );
}

console.log("Seeding Open Limits Design CMS…\n");
await dedupeTeamMembers();
await upsertBySlug("services", SERVICES, { is_active: true });
await reorderServices();
await upsertBySlug("furniture_categories", FURNITURE_CATEGORIES, { published: true });
await upsertBySlug("materials", MATERIALS, { published: true });
await seedOfficeInfo();
console.log("\nDone.");
