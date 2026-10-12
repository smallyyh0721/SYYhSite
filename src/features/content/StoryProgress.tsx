"use client";
import { useEffect, useState } from "react";
export default function StoryProgress() {
  const [active, setActive] = useState("SIGNAL");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(e.target.id.toUpperCase());
      },
      { rootMargin: "-20% 0px -50% 0px" },
    );
    document
      .querySelectorAll("#signal,#ascent,#arrival")
      .forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, []);
  return (
    <div
      aria-label="故事阅读进度"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        padding: "8px 14px",
        background: "var(--surface)",
        color: "var(--primary)",
        border: "1px solid var(--hairline)",
        font: "11px monospace",
        zIndex: 3,
      }}
    >
      CH-03 / {active}
    </div>
  );
}
