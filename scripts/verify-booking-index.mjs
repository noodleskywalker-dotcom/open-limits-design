#!/usr/bin/env node
/**
 * Verify bookings_active_slot_idx prevents duplicate active bookings.
 * Also tests that rejected bookings free the slot.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      if (!process.env[trimmed.slice(0, eq).trim()]) {
        process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
      }
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const testDate = "2099-06-15";
const testSlot = "09:00:00";

async function cleanup() {
  await supabase.from("bookings").delete().eq("booking_date", testDate);
}

async function main() {
  console.log("Booking index verification\n");

  await cleanup();

  const first = await supabase
    .from("bookings")
    .insert({
      client_name: "Index Test A",
      client_email: "test-a@openlimits.test",
      booking_date: testDate,
      start_time: testSlot,
      end_time: "10:00:00",
      status: "pending"
    })
    .select("id")
    .single();

  if (first.error) {
    console.error("FAIL: Could not insert first booking:", first.error.message);
    process.exit(1);
  }
  console.log("PASS: First booking inserted");

  const duplicate = await supabase.from("bookings").insert({
    client_name: "Index Test B",
    client_email: "test-b@openlimits.test",
    booking_date: testDate,
    start_time: testSlot,
    end_time: "10:00:00",
    status: "confirmed"
  });

  if (duplicate.error) {
    const isUnique =
      duplicate.error.message.includes("bookings_active_slot_idx") ||
      duplicate.error.message.includes("duplicate key") ||
      duplicate.error.code === "23505";
    if (isUnique) {
      console.log("PASS: Duplicate booking blocked by unique index");
    } else {
      console.error("FAIL: Duplicate rejected but not by index:", duplicate.error.message);
      await cleanup();
      process.exit(1);
    }
  } else {
    console.error("FAIL: Duplicate booking was allowed — index missing or not applied");
    await cleanup();
    process.exit(1);
  }

  const bookingId = first.data?.id;
  if (bookingId) {
    await supabase.from("bookings").update({ status: "rejected" }).eq("id", bookingId);

    const afterReject = await supabase.from("bookings").insert({
      client_name: "Index Test C",
      client_email: "test-c@openlimits.test",
      booking_date: testDate,
      start_time: testSlot,
      end_time: "10:00:00",
      status: "pending"
    });

    if (afterReject.error) {
      console.error("FAIL: Slot not reopened after rejection:", afterReject.error.message);
      await cleanup();
      process.exit(1);
    }
    console.log("PASS: Rejected booking frees slot for new booking");
  }

  await cleanup();
  console.log("\nAll booking index checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
