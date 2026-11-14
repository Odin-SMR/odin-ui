import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import script from "../../public/parquet/l2-quickstart.py?raw";
import L2Quickstart from "./L2Quickstart";

let container: HTMLDivElement;
let root: Root;
const mount = async () => { await act(async () => { root.render(<MemoryRouter><L2Quickstart /></MemoryRouter>); }); };
const button = (label: string) => Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes(label))!;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("L2 quickstart", () => {
  it("keeps the small-file first step visible with advanced details collapsed", async () => {
    await mount();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")!.textContent).toBe("Your first L2 analysis");
    expect(container.querySelector('a[href="/parquet/l2-quickstart.py"][download]')).not.toBeNull();
    expect(container.querySelector('a[href="/data_access/files#parquet-access"]')).not.toBeNull();
    expect(container.querySelector('a[href="/data_access/files#parquet-archive"]')).not.toBeNull();
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
    expect(container.textContent).toContain("quality flag is unknown (null)");
    expect(container.textContent).toContain("a row count is not a count of observations");
  });

  it("shows the actual downloaded-script queries when switching to regional selection", async () => {
    await mount();
    const daily = container.querySelector('pre[aria-label="SQL · daily counts"]')!.textContent!;
    expect(script).toContain(daily);
    expect(daily).toContain("count(DISTINCT scan_id)");
    await act(async () => { button("Find a region").click(); });
    expect(container.querySelector('pre[aria-label="SQL · daily counts"]')).toBeNull();
    const regional = container.querySelector('pre[aria-label="SQL · tropical or polar scans"]')!.textContent!;
    expect(script).toContain(regional);
    expect(regional).toContain("THEN 'unknown'");
    expect(regional).toContain("lat_1d >= 60");
    expect(regional).toContain("lat_1d <= -60");
    expect(button("Find a region").getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("not a polar-vortex mask");
  });

  it("copies the displayed runnable query and reports clipboard failure accessibly", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await mount();
    const query = container.querySelector('pre[aria-label="SQL · daily counts"]')!.textContent!;
    await act(async () => { container.querySelector<HTMLButtonElement>('button[aria-label="Copy SQL · daily counts"]')!.click(); });
    expect(writeText).toHaveBeenCalledWith(query);
    expect(container.textContent).toContain("Copied.");
    writeText.mockRejectedValueOnce(new Error("Denied"));
    await act(async () => { container.querySelector<HTMLButtonElement>('button[aria-label="Copy SQL · daily counts"]')!.click(); });
    expect(Array.from(container.querySelectorAll('[role="status"]')).some((item) => item.textContent?.includes("Clipboard unavailable"))).toBe(true);
  });
});
