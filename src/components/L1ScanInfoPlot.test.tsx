import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { L1ScanInfoPlot } from "./L1ScanInfoPlot";

vi.mock("@visx/responsive", () => ({ useParentSize: () => ({ parentRef: () => {}, width: 800, height: 320 }) }));

describe("scan timeline UTC contract", () => {
  it("renders zone-less API scan times as UTC in a non-UTC browser environment", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/New_York";
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      act(() => root.render(<L1ScanInfoPlot data={[
        { ScanID: 1, DateTime: "2015-01-11T12:00:00", SunZD: 20, Quality: 0 },
        { ScanID: 2, DateTime: "2015-01-11T13:00:00", SunZD: 80, Quality: 1 },
      ]} scanid={1} selectedScanid={() => {}} />));
      const labels = [...container.querySelectorAll(".visx-axis-bottom text")].map((text) => text.textContent);
      expect(labels).toContain("12:00");
      expect(labels).toContain("13:00");
      expect(labels).not.toContain("17:00");
      expect(container.querySelector('[aria-label^="Select scan 1"]')).not.toBeNull();
      expect(container.textContent).toContain("raw quality 0");
    } finally {
      act(() => root.unmount()); container.remove(); vi.unstubAllGlobals();
      if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
    }
  });
});
