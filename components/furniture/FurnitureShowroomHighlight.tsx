"use client";

import { useEffect, useState } from "react";

export default function FurnitureShowroomHighlight({ title }: { title: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="furniture-showroom-highlight">
      <div>
        <p className="eyebrow">From the showroom</p>
        <strong>{title}</strong>
      </div>
      <button aria-label="Dismiss" className="button ghost" onClick={() => setVisible(false)} type="button">
        ×
      </button>
    </div>
  );
}
