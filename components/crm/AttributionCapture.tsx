"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/crm/attribution-client";

/** Records campaign parameters from the landing URL (first touch, this tab only). Renders nothing. */
export default function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
