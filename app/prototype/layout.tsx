"use client";

import { useEffect } from "react";

/** Fullscreen prototype routes — hide global chrome (header, footer, AI widget). */
export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.dataset.prototype = "true";
    return () => {
      delete document.body.dataset.prototype;
    };
  }, []);

  return <>{children}</>;
}
