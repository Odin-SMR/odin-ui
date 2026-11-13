import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { L2Plot } from "./L2Plot";

type Product = ComponentProps<typeof L2Plot>["data"];
const product = (patch: Partial<Product["data"]> = {}): Product => ({
  name: "O3", scanid: 0,
  data: { alt: [0, 10000, 20000, 30000], vmr: [1e-6, 2e-6, 3e-6, 4e-6], meas_resp: [0.8, 0.81, 0.7, 0.9], temp: [], pressure: [], ...patch },
});
let container: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const mount = (data: Product) => { act(() => root.render(<L2Plot data={data} />)); };

describe("retrieval profile scientific contracts", () => {
  it("converts VMR to ppmv, keeps altitude upward, and treats exactly 0.8 as open", () => {
    mount(product());
    const low = container.querySelector('circle[data-level="0"]')!, high = container.querySelector('circle[data-level="3"]')!;
    expect(low.getAttribute("data-response")).toBe("at-or-below");
    expect(container.querySelector('circle[data-level="1"]')?.getAttribute("data-response")).toBe("above");
    expect(Number(high.getAttribute("cy"))).toBeLessThan(Number(low.getAttribute("cy")));
    expect(high.textContent).toContain("30000 m, 4 ppmv");
    expect(container.textContent).toContain("not a pass/fail rule");
  });
  it("leaves the missing level empty without widening neighboring bars and marks unavailable response", () => {
    mount(product({ vmr: [1e-6, null, 3e-6, 4e-6], meas_resp: [0.8] }));
    expect(container.querySelector('[data-profile-line="true"]')).toBeNull();
    expect(container.querySelectorAll('[data-profile-bar="true"]')).toHaveLength(3);
    expect(container.querySelector('[data-bar-level="0"]')?.getAttribute("data-bin-upper")).toBe("5000");
    expect(container.querySelector('[data-bar-level="2"]')?.getAttribute("data-bin-lower")).toBe("15000");
    expect(container.querySelector('[data-level="1"]')).toBeNull();
    expect(container.querySelectorAll('[data-response="missing"]')).toHaveLength(2);
  });
  it("pins exact source values with the keyboard and closes the pin without changing the product", () => {
    mount(product({ vmr: [1e-6, 1.23456789e-6, 3e-6, 4e-6] }));
    const svg = container.querySelector('svg[role="img"]')!;
    act(() => { svg.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })); });
    act(() => { svg.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(document.body.textContent).toContain("Pinned level");
    expect(document.body.textContent).toContain("1.23456789 ppmv");
    expect(document.body.textContent).toContain("Source VMR: 0.00000123456789");
    expect(document.body.textContent).toContain("Measurement response: 0.81");
    act(() => { document.querySelector<HTMLButtonElement>('[aria-label="Close Inspect level"]')?.click(); });
    expect(container.querySelector('[data-profile-line="true"]')).toBeNull();
    act(() => { Array.from(container.querySelectorAll("button")).find((button) => button.getAttribute("aria-label") === "Inspect level")?.click(); });
    act(() => { Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Clear pin")?.click(); });
    expect(document.body.textContent).not.toContain("Pinned level");
    expect(document.body.textContent).toContain("project/version are unavailable");
  });
  it("provides a table for entirely missing VMR rather than a fabricated zero profile", () => {
    mount(product({ vmr: [null, null, null, null] }));
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    expect(container.textContent).toContain("no finite altitude and mixing-ratio pairs");
    expect(container.querySelector('table[aria-label="Exact retrieval profile values"]')).not.toBeNull();
  });

  it("shows visx axes with exact profile forms closed until requested", () => {
    mount(product());
    expect(container.querySelector(".visx-axis-left")).not.toBeNull();
    expect(container.querySelector(".visx-axis-bottom")).not.toBeNull();
    expect(container.querySelector("form")).toBeNull();
    act(() => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Axes & range")?.click(); });
    expect(document.querySelector('[role="dialog"] form')).not.toBeNull();
    expect(document.body.textContent).toContain("Minimum altitude (m)");
  });

  it("uses zero as the bar baseline and includes signed total-error endpoints in the domain", () => {
    mount(product({ vmr: [-1e-6, 0, 3e-6, 4e-6], error_total: [2e-6, 0, -1e-6, null], error_noise: [1e-6] }));
    expect(container.querySelectorAll('[data-error-bar="true"]')).toHaveLength(2);
    expect(container.querySelector('[data-error-level="0"]')?.getAttribute("data-error-ppmv")).toBe("2");
    expect(container.querySelector('[data-error-level="1"]')?.getAttribute("data-error-ppmv")).toBe("0");
    expect(container.querySelector('[data-error-level="2"]')).toBeNull();
    expect(container.querySelector('[data-bar-level="1"]')?.getAttribute("width")).toBe("0");
    expect(container.querySelector('circle[data-level="1"]')).not.toBeNull();
    const negativeBar = container.querySelector('[data-bar-level="0"]')!;
    const zero = Number(container.querySelector('[data-bar-level="1"]')?.getAttribute("x"));
    expect(Number(negativeBar.getAttribute("x"))).toBeLessThan(zero);
    expect(Number(negativeBar.getAttribute("x")) + Number(negativeBar.getAttribute("width"))).toBeCloseTo(zero);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("VMR: -3–4 ppmv");
    expect(container.innerHTML).not.toMatch(/(?:cx|cy|x1|x2|height|width)="(?:NaN|Infinity)/);
  });

  it("shows exact hover details, leaves missing-level gaps unselected, and dismisses on Escape", () => {
    mount(product({ vmr: [1e-6, null, 3e-6, 4e-6], error_total: [0.25e-6], error_noise: [0.1e-6] }));
    const svg = container.querySelector<SVGSVGElement>('svg[role="img"]')!;
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, width: 640, height: 410, right: 640, bottom: 410, toJSON() {} });
    const firstY = Number(container.querySelector('circle[data-level="0"]')?.getAttribute("cy"));
    act(() => { svg.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 200, clientY: firstY })); });
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Source total error (1σ): ±0.25 ppmv");
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Noise error (1σ): ±0.09999999999999999 ppmv");
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Grid display bounds: -5000–5000 m");
    expect(svg.getAttribute("aria-describedby")).toBe(container.querySelector('[role="tooltip"]')?.id);
    act(() => { document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })); });
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    act(() => { svg.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 200, clientY: 226.25 })); });
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    act(() => { svg.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 20, clientY: firstY })); });
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("shows uncertainty availability in keyboard preview and retains duplicate-height identities on hover", () => {
    mount(product({ alt: [1000, 1000, 3000, 7000], error_total: [-1e-6, 0, null, 2e-6] }));
    const svg = container.querySelector<SVGSVGElement>('svg[role="img"]')!;
    act(() => { svg.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" })); });
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Invalid (-0.000001 source units)");
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Grid display thickness: unavailable");
    expect(container.querySelectorAll('[data-profile-bar="true"]')).toHaveLength(2);
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, width: 640, height: 410, right: 640, bottom: 410, toJSON() {} });
    const second = container.querySelector('circle[data-level="1"]')!;
    act(() => { svg.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: Number(second.getAttribute("cx")), clientY: Number(second.getAttribute("cy")) })); });
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Level 1 · O3");
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Source total error (1σ): ±0 ppmv");
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain("Noise error (1σ): Unavailable");
  });

  it("does not hover a wholly clipped level in an empty custom VMR range", () => {
    mount(product({ error_total: [0.1e-6, 0.1e-6, 0.1e-6, 0.1e-6] }));
    act(() => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Axes & range")?.click(); });
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('[role="dialog"] form input'));
    act(() => { ["10", "20", "-5000", "35000"].forEach((value, index) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(inputs[index], value);
      inputs[index].dispatchEvent(new Event("input", { bubbles: true }));
    }); });
    act(() => { document.querySelector('[role="dialog"] form')?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(container.querySelector('[role="status"]')?.textContent).toContain("VMR: 10–20 ppmv");
    const svg = container.querySelector<SVGSVGElement>('svg[role="img"]')!;
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, width: 640, height: 410, right: 640, bottom: 410, toJSON() {} });
    const firstY = Number(container.querySelector('circle[data-level="0"]')?.getAttribute("cy"));
    act(() => { svg.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 200, clientY: firstY })); });
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("starts observing when a missing profile gains valid pairs without remounting the product", () => {
    vi.stubGlobal("ResizeObserver", class {
      readonly callback: (entries: { contentRect: { width: number } }[]) => void;
      constructor(callback: (entries: { contentRect: { width: number } }[]) => void) { this.callback = callback; }
      observe() { this.callback([{ contentRect: { width: 350 } }]); }
      disconnect() {}
    });
    mount(product({ vmr: [null, null, null, null] }));
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    mount(product());
    expect(container.querySelector('svg[role="img"]')?.getAttribute("viewBox")).toBe("0 0 350 410");
    expect(container.querySelector('svg[role="img"] text')?.getAttribute("font-size")).toBe("12");
  });
});
