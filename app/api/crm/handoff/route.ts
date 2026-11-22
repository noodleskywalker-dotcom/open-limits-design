import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runCrmHandoff } from "@/lib/crm/handoff";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 32) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * GET /api/crm/handoff — retries pending website enquiries into GoHighLevel.
 * Called by a scheduler (e.g. Vercel Cron) with `Authorization: Bearer $CRON_SECRET`.
 * Returns counts only. Does nothing while GHL_HANDOFF_ENABLED is not "true".
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Outage simulation only ever affects the controlled TEST lane (ignored by the live handoff).
  const simulateOutage = request.nextUrl?.searchParams.get("simulate") === "ghl_unavailable";
  const run = await runCrmHandoff(25, { simulateOutage });
  return NextResponse.json(run, { status: run.state === "FAILED" ? 500 : 200 });
}
