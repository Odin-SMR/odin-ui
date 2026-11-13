import { useCallback, useEffect, useState } from "react";

/** Match SVG coordinates to CSS pixels so labels do not shrink on a phone. */
export function usePlotWidth() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const ref = useCallback((element: HTMLDivElement | null) => setNode(element), []);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { ref, width };
}
