import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PilotL1b } from "../../odinApi/pilot";
import PilotSpectrum from "./PilotSpectrum";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const render = (data: PilotL1b) => {
  act(() => root.render(<PilotSpectrum data={data} />));
  return container.innerHTML;
};
const click = (label: string) => act(() => { Array.from(document.querySelectorAll("button")).find((button) => button.textContent === label || button.getAttribute("aria-label") === label)?.click(); });
const setThumb = (label: "First spectrum" | "Last spectrum", value: number) => {
  const input = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};
const selectSpectrum = (relative: number) => {
  act(() => { container.querySelector('[role="combobox"]')?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 })); });
  act(() => { document.querySelectorAll('[role="option"]')[relative]?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
};
const selectedBounds = () => ["First spectrum", "Last spectrum"].map((label) => Number(container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!.value));
const shiftRange = (label: "First spectrum" | "Last spectrum", key: "ArrowLeft" | "ArrowRight", shiftKey = true) => act(() => {
  container.querySelector(`input[aria-label="${label}"]`)!.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }));
});
const dragFixture: PilotL1b = { Spectrum: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]], Altitude: [50000, 40000, 30000, 20000, 10000],
  Frequency: { IFreqGrid: [0, 1], LOFreq: [100], SubBandIndex: [[1], [2]] } };
const pointerDrag = (pointerType: "mouse" | "touch" = "mouse") => {
  const slider = container.querySelector<HTMLElement>(".MuiSlider-root")!;
  const track = slider.querySelector<HTMLElement>(".MuiSlider-track")!;
  vi.spyOn(slider, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 30, width: 400, height: 30, toJSON: () => ({}) });
  const captured = new Set<number>();
  slider.setPointerCapture = (id) => { captured.add(id); };
  slider.hasPointerCapture = (id) => captured.has(id);
  slider.releasePointerCapture = (id) => { captured.delete(id); };
  return (type: string, clientX: number) => {
    const event = new MouseEvent(type, { clientX, button: 0, bubbles: true, cancelable: true });
    Object.defineProperties(event, { pointerId: { value: 7 }, pointerType: { value: pointerType } });
    act(() => { (type === "pointerdown" ? track : slider).dispatchEvent(event); });
    return event;
  };
};

describe("pilot spectra", () => {
  it("moves both bounds with Shift+arrows, clamps without changing count, and still resizes a thumb with plain arrows", () => {
    render(dragFixture);
    shiftRange("First spectrum", "ArrowRight");
    expect(selectedBounds()).toEqual([1, 5]);
    setThumb("First spectrum", 2); setThumb("Last spectrum", 4);
    shiftRange("First spectrum", "ArrowRight");
    expect(selectedBounds()).toEqual([3, 5]);
    shiftRange("Last spectrum", "ArrowRight");
    expect(selectedBounds()).toEqual([3, 5]);
    shiftRange("Last spectrum", "ArrowLeft"); shiftRange("First spectrum", "ArrowLeft"); shiftRange("First spectrum", "ArrowLeft");
    expect(selectedBounds()).toEqual([1, 3]);
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(3);
    shiftRange("First spectrum", "ArrowRight", false);
    expect(selectedBounds()).toEqual([2, 3]);
    setThumb("Last spectrum", 2);
    shiftRange("Last spectrum", "ArrowRight");
    expect(selectedBounds()).toEqual([3, 3]);
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(1);
  });

  it("drags the track from the original grab offset and clamps both ends, then stops on release", () => {
    render(dragFixture);
    setThumb("First spectrum", 2); setThumb("Last spectrum", 4);
    const pointer = pointerDrag();
    expect(pointer("pointerdown", 150).defaultPrevented).toBe(true);
    expect(selectedBounds()).toEqual([2, 4]);
    pointer("pointermove", 250);
    expect(selectedBounds()).toEqual([3, 5]);
    pointer("pointermove", 800);
    expect(selectedBounds()).toEqual([3, 5]);
    pointer("pointermove", -400);
    expect(selectedBounds()).toEqual([1, 3]);
    pointer("pointermove", 150);
    expect(selectedBounds()).toEqual([2, 4]);
    pointer("pointerup", 150); pointer("pointermove", 350);
    expect(selectedBounds()).toEqual([2, 4]);
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(3);
  });

  it("does not resize the full range on grab and cancels touch/lost capture without a stuck translation", () => {
    render(dragFixture);
    const pointer = pointerDrag("touch");
    expect(pointer("pointerdown", 200).defaultPrevented).toBe(true);
    pointer("pointermove", 400); pointer("pointerup", 400);
    expect(selectedBounds()).toEqual([1, 5]);
    setThumb("First spectrum", 3); setThumb("Last spectrum", 3);
    pointer("pointerdown", 200);
    const touch = new Event("touchstart", { bubbles: true });
    Object.defineProperty(touch, "changedTouches", { value: [{ identifier: 7, clientX: 200, clientY: 15 }] });
    act(() => { container.querySelector(".MuiSlider-track")!.dispatchEvent(touch); });
    expect(selectedBounds()).toEqual([3, 3]);
    pointer("pointermove", 300);
    expect(selectedBounds()).toEqual([4, 4]);
    pointer("pointercancel", 300); pointer("pointermove", 400);
    expect(selectedBounds()).toEqual([4, 4]);
    pointer("pointerdown", 300); pointer("pointermove", 200);
    expect(selectedBounds()).toEqual([3, 3]);
    pointer("lostpointercapture", 200); pointer("pointermove", 100);
    expect(selectedBounds()).toEqual([3, 3]);
    shiftRange("Last spectrum", "ArrowRight", false);
    expect(selectedBounds()).toEqual([3, 4]);
  });

  it("narrows an inclusive range to one spectrum, preserves scan order and restores all spectra", () => {
    const data: PilotL1b = { Spectrum: [[1, 2], [3, 4], [5, 6]], Altitude: [30000, null, 20000], Quality: [0, 2, 1],
      Frequency: { IFreqGrid: [0, 1], LOFreq: [100, 200, 300], SubBandIndex: [[1], [2]] } };
    const original = JSON.stringify(data);
    render(data);
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(3);
    expect(container.querySelector('input[aria-label="First spectrum"]')?.getAttribute("aria-valuetext")).toBe("Spectrum 1, 30 km");
    expect(container.querySelector('input[aria-label="Last spectrum"]')?.getAttribute("aria-valuetext")).toBe("Spectrum 3, 20 km");
    setThumb("First spectrum", 2); setThumb("Last spectrum", 2);
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(1);
    expect(container.querySelector('[data-spectrum-line="true"]')?.getAttribute("data-spectrum-index")).toBe("1");
    expect(container.textContent).toContain("Showing 1 of 3 spectra · spectrum 2");
    expect(container.textContent).toContain("height missing");
    expect(container.textContent).toContain("Frequency range: 200–201 Hz");
    click("Show all");
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(3);
    expect(container.textContent).toContain("Frequency range: 100–301 Hz");
    expect(JSON.stringify(data)).toBe(original);
  });

  it("selects the nearest displayed trace in both dimensions and shows exact height and values only in a hover tooltip", () => {
    render({ Spectrum: [[10, 20, 30], [40, 50.123456789, 60]], Altitude: [20000, 35000], Quality: [0, 4],
      Frequency: { IFreqGrid: [0, 1, 2], LOFreq: [100], SubBandIndex: [[1], [3]] } });
    const svg = container.querySelector<SVGSVGElement>('svg[role="img"]')!;
    const width = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: 382, width, height: 382, toJSON: () => ({}) });
    const move = (brightness: number) => act(() => { svg.dispatchEvent(new MouseEvent("pointermove", { clientX: (64 + width - 18) / 2, clientY: 322 - (brightness - 10) / 50 * 300, bubbles: true })); });
    move(50.123456789);
    const tooltip = container.querySelector('[role="tooltip"]')!;
    expect(tooltip.textContent).toContain("Spectrum 2 · Channel 2");
    expect(tooltip.textContent).toContain("Tangent altitude: 35000 m (35 km)");
    expect(tooltip.textContent).toContain("Brightness temperature: 50.123456789 K");
    expect(tooltip.textContent).toContain("Frequency: 101 Hz");
    expect(tooltip.textContent).toContain("Quality: 4 (raw)");
    move(20);
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Spectrum 1 · Channel 2");
    act(() => { svg.dispatchEvent(new MouseEvent("pointerout", { bubbles: true })); });
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(container.textContent).not.toContain("Tangent altitude: 35000 m");
  });

  it("clears excluded inspection and resets the range on a new scan, retaining active-spectrum keyboard inspection", () => {
    const data: PilotL1b = { Spectrum: [[1, 2], [3, 4], [5, 6]], Altitude: [30000, null, 10000], ScanID: [123],
      Frequency: { IFreqGrid: [0, 1], LOFreq: [100, 200, 300] } };
    render(data);
    selectSpectrum(2);
    act(() => { container.querySelector('svg[role="img"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Spectrum 3 · Channel 2");
    act(() => { container.querySelector('svg[role="img"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(document.body.textContent).toContain("Frequency: 301 Hz");
    click("Close Inspect channel");
    setThumb("Last spectrum", 1);
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    click("Inspect channel");
    expect(document.body.textContent).not.toContain("Pinned channel");
    click("Close Inspect channel");
    render({ ...data, ScanID: [124] });
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(3);
    expect(container.textContent).toContain("Showing 3 of 3 spectra · 1–3");
  });

  it("keeps missing height explicit in the tooltip and a single spectrum's range disabled", () => {
    render({ Spectrum: [[1, 2]], Frequency: { IFreqGrid: [0, 1], LOFreq: [100] } });
    expect(container.querySelector<HTMLInputElement>('input[aria-label="First spectrum"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('input[aria-label="Last spectrum"]')?.disabled).toBe(true);
    act(() => { container.querySelector('svg[role="img"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Tangent altitude: Missing");
  });

  it("uses compact height labels while preserving exact fractional metres in inspection", () => {
    const data: PilotL1b = { Spectrum: [[1, 2], [3, 4]], Altitude: [Number("16413.123456789123"), Number("70533.987654321012")],
      Frequency: { IFreqGrid: [0, 1], LOFreq: [100] } };
    const original = JSON.stringify(data);
    render(data);
    expect(container.querySelector('input[aria-label="First spectrum"]')?.getAttribute("aria-valuetext")).toBe("Spectrum 1, 16.41 km");
    expect(container.querySelector('input[aria-label="Last spectrum"]')?.getAttribute("aria-valuetext")).toBe("Spectrum 2, 70.53 km");
    selectSpectrum(1);
    act(() => { container.querySelector('svg[role="img"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain(`Tangent altitude: ${data.Altitude![1]} m (70.53 km)`);
    expect(JSON.stringify(data)).toBe(original);
  });

  it("breaks the line at missing values and preserves quality", () => {
    const markup = render({
      Frequency: { IFreqGrid: [0, 1, 2], LOFreq: [100], SubBandIndex: [[1], [3]] },
      Spectrum: [[2, null, 4]], Quality: [0], Altitude: [30000],
    });
    expect(markup).toContain("2 of 3 channels plotted");
    const path = container.querySelector('[data-spectrum-line="true"]')?.getAttribute("d");
    expect(path?.match(/M/g)?.length).toBe(2);
    expect(path).not.toContain("L");
    expect(container.querySelectorAll("circle")).toHaveLength(2);
    click("Spectrum details");
    expect(document.body.textContent).toContain("Quality: 0");
    expect(document.body.textContent).toContain("30000 m");
  });

  it("keeps missing frequency coordinates missing", () => {
    const markup = render({ Spectrum: [[2, 4]], Frequency: { IFreqGrid: [0, 1], LOFreq: [null] } });
    expect(markup).toContain("no finite frequency and brightness pairs");
    expect(markup).not.toContain("Brightness temperature spectrum");
  });

  it("never draws across explicit subband gaps and retains each band's inclusive last channel", () => {
    render({
      Spectrum: [[1, 2, 3, 4]],
      Frequency: { IFreqGrid: [0, 1, 100, 101], LOFreq: [0], SubBandIndex: [[3, 1, -1], [4, 2, -1]] },
    });
    const path = container.querySelector('[data-spectrum-line="true"]')?.getAttribute("d") ?? "";
    const segments = path.split("M").filter(Boolean);
    expect(segments).toHaveLength(2);
    expect(segments.map((segment) => segment.match(/[ML]/g)?.length ?? 0)).toEqual([1, 1]);
    // Each band has its first point plus its inclusive last point: all four survive.
    expect(path.match(/[ML]/g)).toHaveLength(4);
    expect(container.textContent).toContain("4 of 4 channels plotted");
    expect(container.textContent).toContain("Subbands are drawn separately");
    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });

  it.each([
    { bounds: undefined },
    { bounds: [[1], [3]] }, // uncovered final channel
    { bounds: [[1, 2], [2, 4]] }, // overlapping bounds
    { bounds: [[0, 3], [2, 4]] }, // zero is not a 1-based start
    { bounds: [[1, 3], [2, 5]] }, // end outside the spectrum
    { bounds: [[1, 2.5], [2, 4]] }, // fractional indices
  ])("shows all finite channels as separate points when band boundaries are missing or unusable ($bounds)", ({ bounds }) => {
    render({
      Spectrum: [[1, 2, 3, 4]],
      Frequency: { IFreqGrid: [0, 1, 100, 101], LOFreq: [0], SubBandIndex: bounds },
    });
    expect(container.querySelector('[data-spectrum-line="true"]')?.getAttribute("d")).toBe("");
    expect(container.querySelectorAll('svg[role="img"] circle')).toHaveLength(4);
    expect(container.querySelector('svg[role="img"] circle:last-of-type title')?.textContent).toContain("Channel 4:");
    expect(container.textContent).toContain("Channels are shown as separate points");
  });

  it("starts with all spectra and can isolate a finite spectrum after a missing one using its own LO frequency", () => {
    render({ Spectrum: [[null, null], [4, 5]], Frequency: { IFreqGrid: [0, 1], LOFreq: [100, 200] } });
    expect(container.querySelectorAll('[data-spectrum-line="true"]')).toHaveLength(2);
    expect(container.textContent).toContain("2 of 4 channels plotted");
    setThumb("Last spectrum", 1);
    expect(container.textContent).toContain("no finite frequency and brightness pairs");
    setThumb("Last spectrum", 2);
    setThumb("First spectrum", 2);
    expect(container.textContent).not.toContain("no finite frequency and brightness pairs");
    expect(container.querySelector('svg[role="img"]')?.textContent).toContain("200");
    expect(container.querySelector('svg[role="img"]')?.textContent).not.toContain("100");
  });

  it("measures a newly revealed plot after an invalid spectrum so 12px labels retain their CSS size", () => {
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      readonly callback: (entries: { contentRect: { width: number } }[]) => void;
      constructor(callback: (entries: { contentRect: { width: number } }[]) => void) { this.callback = callback; }
      observe() { this.callback([{ contentRect: { width: 350 } }]); }
      disconnect = disconnect;
    });
    render({ Spectrum: [[null, null], [4, 5]], Frequency: { IFreqGrid: [0, 1], LOFreq: [100, 200] } });
    setThumb("Last spectrum", 1);
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    setThumb("Last spectrum", 2);
    expect(container.querySelector('svg[role="img"]')?.getAttribute("viewBox")).toBe("0 0 350 382");
    expect(container.querySelector('svg[role="img"] text')?.getAttribute("font-size")).toBe("12");
    setThumb("Last spectrum", 1);
    expect(disconnect).toHaveBeenCalled();
    setThumb("Last spectrum", 2);
    expect(container.querySelector('svg[role="img"]')?.getAttribute("viewBox")).toBe("0 0 350 382");
  });

  it("allows hiding and reopening the exact channel table when all frequency/brightness pairs are invalid", () => {
    render({ Spectrum: [[null, 4]], Frequency: { IFreqGrid: [0, null], LOFreq: [100] } });
    const table = () => container.querySelector('table[aria-label="Exact spectrum channel values"]');
    expect(table()).not.toBeNull();
    expect(table()?.textContent).toContain("100Missing");
    expect(table()?.textContent).toContain("Missing4");
    act(() => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Hide table")?.click(); });
    expect(table()).toBeNull();
    act(() => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Table")?.click(); });
    expect(table()).not.toBeNull();
    expect(container.querySelector('svg[role="img"]')).toBeNull();
  });

  it("retains the legacy first-LO convention when explicitly requested", () => {
    act(() => root.render(<PilotSpectrum frequencyReference="first" data={{
      Spectrum: [[2, 3], [4, 5]], Frequency: { IFreqGrid: [0, 1], LOFreq: [100, 200] },
    }} />));
    setThumb("First spectrum", 2);
    expect(container.querySelector('svg[role="img"]')?.textContent).toContain("100");
    expect(container.querySelector('svg[role="img"]')?.textContent).not.toContain("200");
  });

  it("pins actual channel values with the keyboard and keeps the pin across frequency zoom", () => {
    render({ Spectrum: [[2, 3.123456789, 4]], ScanID: [0], FreqMode: [0],
      Frequency: { IFreqGrid: [0, 1, 2], LOFreq: [100], SubBandIndex: [[1], [3]] },
    });
    const svg = container.querySelector('svg[role="img"]')!;
    act(() => { svg.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    act(() => { svg.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(document.body.textContent).toContain("Pinned channel");
    expect(document.body.textContent).toContain("Frequency: 101 Hz");
    expect(document.body.textContent).toContain("Brightness temperature: 3.123456789 K");
    expect(document.body.textContent).toContain("Scan: 0 · FM: 0");
    click("Close Inspect channel");
    expect(container.textContent).not.toContain("Channel 2 · 101 Hz · 3.123456789 K");
    act(() => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Zoom +")?.click(); });
    expect(container.textContent).toContain("Frequency range: 100.5–101.5 Hz");
    click("Inspect channel");
    expect(document.body.textContent).toContain("Brightness temperature: 3.123456789 K");
    click("Close Inspect channel");
    act(() => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Reset")?.click(); });
    expect(container.textContent).toContain("Frequency range: 100–102 Hz");
  });

  it.each([320, 390])("keeps frequency ticks distinct in MHz and 12Hz windows at %ipx without changing source values", (width) => {
    vi.stubGlobal("ResizeObserver", class {
      readonly callback: (entries: { contentRect: { width: number } }[]) => void;
      constructor(callback: (entries: { contentRect: { width: number } }[]) => void) { this.callback = callback; }
      observe() { this.callback([{ contentRect: { width } }]); }
      disconnect() {}
    });
    const assertReadableTicks = () => {
      const ticks = Array.from(container.querySelectorAll('[data-frequency-tick="true"]'));
      expect(ticks.length).toBeGreaterThanOrEqual(3);
      expect(new Set(ticks.map((tick) => tick.textContent)).size).toBe(ticks.length);
      expect(ticks.every((tick) => tick.getAttribute("font-size") === "12")).toBe(true);
    };
    const source: PilotL1b = { Spectrum: [[1, 2, 3, 4, 5]], Frequency: { IFreqGrid: [-6e6, -3e6, 0, 3e6, 6e6], LOFreq: [544_300_000_000] } };
    const original = JSON.stringify(source);
    render(source);
    assertReadableTicks();
    expect(JSON.stringify(source)).toBe(original);
    render({ Spectrum: [[1, 2, 3, 4, 5]], Frequency: { IFreqGrid: [-6, -3, 0, 3, 6], LOFreq: [544_300_000_000] } });
    assertReadableTicks();
    expect(container.textContent).toContain("Frequency offset (Hz)");
    expect(container.textContent).toContain("Reference frequency: 544299999994 Hz. Add each offset");
    expect(container.textContent).toContain("Frequency range: 544299999994–544300000006 Hz");
    const svg = container.querySelector('svg[role="img"]')!;
    act(() => { svg.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    act(() => { svg.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(document.body.textContent).toContain("Frequency: 544299999997 Hz");
  });

  it("keeps range forms secondary and preserves invalid channels in touch/keyboard inspection", () => {
    render({ Spectrum: [[null, 4]], Frequency: { IFreqGrid: [0, null], LOFreq: [100] } });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    click("Inspect channel 1");
    expect(document.body.textContent).toContain("Frequency: 100 Hz");
    expect(document.body.textContent).toContain("Brightness temperature: Missing");
    click("Close Inspect channel");
    expect(container.textContent).not.toContain("Channel 1 · 100 Hz · Missing");
    click("Inspect channel");
    click("Clear pin");
    expect(document.body.textContent).not.toContain("Pinned channel");
  });
});
