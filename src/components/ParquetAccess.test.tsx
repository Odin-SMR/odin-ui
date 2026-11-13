import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParquetAccess } from "./ParquetAccess";

// Synthetic catalog metadata only: these URLs must never be requested by the UI.
const file = (name: string, start: string, end: string, rows: number) => ({
  url: `https://science.example.org/releases/test/${name}.parquet`,
  sha256: "a".repeat(64), size_bytes: 1024, row_count: rows,
  observation_start: start, observation_end: end,
});
const dataset = (id: string, start: string, end: string) => ({
  id, title: `Synthetic ${id}`, level: "L2", project: "test-project", product: id,
  frequency_mode: 1, inversion_mode: "test", schema_url: "https://science.example.org/schema.json",
  description: "Synthetic vertical rows used to test file selection.",
  notes: ["These fixtures are not Odin observations."],
  columns: [{ name: "scan_id", type: "int64", description: "Synthetic identifier" }],
  files: [file(`${id}-first`, start, start, 12), file(`${id}-last`, end, end, 15)],
});
const release = (id: string, datasets: ReturnType<typeof dataset>[]) => ({
  id, title: `Synthetic ${id}`, published_at: "2026-01-01", datasets,
  license: { name: "Synthetic test license", url: "https://science.example.org/license" },
  citation: `Synthetic fixture citation ${id}.`, documentation_url: "https://science.example.org/docs",
});
const published = {
  schema_version: 1, status: "published", message: "Synthetic catalog for UI validation.",
  releases: [release("test-a", [dataset("ozone", "2023-01-01", "2023-01-31"), dataset("temperature", "2024-02-01", "2024-02-29")]), release("test-b", [dataset("water", "2025-03-01", "2025-03-31")])],
};

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;
let downloads: Blob[];
let clipboard: ReturnType<typeof vi.fn>;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const mount = async () => { await act(async () => { root.render(<MemoryRouter><ParquetAccess /></MemoryRouter>); await new Promise((resolve) => setTimeout(resolve, 5)); }); };
const button = (label: string) => Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((entry) => entry.textContent === label)!;
const click = async (label: string) => { await act(async () => { button(label).click(); }); };
const change = async (id: string, value: string) => {
  const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
  const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};
const blobText = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsText(blob);
});

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  fetchMock = vi.fn().mockResolvedValue(response(published)); vi.stubGlobal("fetch", fetchMock);
  downloads = [];
  const OriginalURL = URL;
  vi.stubGlobal("URL", class extends OriginalURL {
    static createObjectURL(blob: Blob) { downloads.push(blob); return "blob:synthetic-download"; }
    static revokeObjectURL() {}
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  clipboard = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboard } });
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Parquet release access", () => {
  it("selects undated diagnostic files without claiming observation coverage", async () => {
    const diagnostic = { ...dataset("diagnostics", "2023-01-01", "2023-01-31"), level: "L2I", files: [
      { ...file("diagnostics", "2023-01-01", "2023-01-31", 15), observation_start: null, observation_end: null },
    ] };
    fetchMock.mockResolvedValue(response({ ...published, releases: [{ ...published.releases[0], datasets: [diagnostic] }] }));
    await mount();
    expect(container.querySelector('input[type="date"]')).toBeNull();
    expect(container.textContent).toContain("Observation dates unavailable; select diagnostics by scan ID.");
    expect(container.textContent).toContain("Dates unavailable");
    expect(container.textContent).not.toContain("These files overlap your dates");
    await click("Download diagnostics-selection.json");
    const selected = JSON.parse(await blobText(downloads[0]));
    expect(selected.files).toEqual(diagnostic.files);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("keeps guides accessible without presenting planned data as published", async () => {
    fetchMock.mockResolvedValue(response({ schema_version: 1, status: "planned", message: "Release validation is pending.", releases: [] }));
    await mount();
    expect(container.textContent).toContain("Public Parquet release in preparation");
    expect(container.textContent).toContain("Release validation is pending.");
    expect(container.querySelector('a[href="/data_access/parquet-guide"]')).not.toBeNull();
    expect(container.querySelector('a[href="/parquet/first-profile.ipynb"]')).not.toBeNull();
    expect(container.querySelector("select")).toBeNull();
    expect(button("Download selection.json")).toBeUndefined();
    expect(container.textContent).not.toContain("0 stored rows");
  });

  it("loads only catalog metadata anonymously and starts with one day of file coverage", async () => {
    await mount();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/parquet/catalog.json", expect.objectContaining({ credentials: "omit" }));
    expect(container.querySelector<HTMLInputElement>("#parquet-start")!.value).toBe("2023-01-01");
    expect(container.querySelector<HTMLInputElement>("#parquet-end")!.value).toBe("2023-01-01");
    expect(container.textContent).toContain("1 file ·");
    expect(container.textContent).toContain("12 stored rows");
    expect(container.textContent).toContain("not an exact observation subset or query-cost estimate");
  });

  it("downloads only the selected files with release, science and checksum metadata", async () => {
    await mount();
    await change("parquet-end", "2023-01-31");
    expect(container.textContent).toContain("2 files");
    expect(container.textContent).toContain("27 stored rows");
    await click("Download selection.json");
    const selected = JSON.parse(await blobText(downloads[0]));
    expect(JSON.stringify(selected)).toContain("test-a");
    expect(JSON.stringify(selected)).toContain("test-project");
    expect(selected.files).toHaveLength(2);
    expect(selected.files[0].sha256).toBe("a".repeat(64));
    expect(selected.files.map((entry: { url: string }) => entry.url)).toEqual(published.releases[0].datasets[0].files.map((entry) => entry.url));
    await click("Download file URLs");
    expect(await blobText(downloads[1])).toBe(`${selected.files.map((entry: { url: string }) => entry.url).join("\n")}\n`);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("resets dates and product when switching release, and dates when switching product", async () => {
    await mount();
    await change("parquet-end", "2023-01-31");
    await change("parquet-dataset", "temperature");
    expect(container.querySelector<HTMLInputElement>("#parquet-start")!.value).toBe("2024-02-01");
    expect(container.querySelector<HTMLInputElement>("#parquet-end")!.value).toBe("2024-02-01");
    await change("parquet-release", "test-b");
    expect(container.querySelector<HTMLSelectElement>("#parquet-dataset")!.value).toBe("water");
    expect(container.querySelector<HTMLInputElement>("#parquet-start")!.value).toBe("2025-03-01");
    expect(container.textContent).toContain("Synthetic fixture citation test-b");
    expect(container.textContent).not.toContain("Synthetic fixture citation test-a");
  });

  it("distinguishes no matching files and invalid dates, withholding code and downloads", async () => {
    await mount();
    await change("parquet-start", "2023-01-10");
    expect(container.textContent).toContain("Choose both dates");
    expect(button("Download selection.json")).toBeUndefined();
    await change("parquet-end", "2023-01-20");
    expect(container.textContent).toContain("No catalog files overlap these dates");
    expect(container.querySelector("pre")).toBeNull();
    await change("parquet-start", "");
    expect(container.textContent).toContain("Choose both dates");
    expect(container.textContent).not.toContain("No catalog files overlap these dates");
  });

  it.each(["http", "network", "malformed"])("keeps %s catalog failure distinct from missing observations and supports retry", async (kind) => {
    if (kind === "http") fetchMock.mockResolvedValueOnce(response({}, 503));
    else if (kind === "network") fetchMock.mockRejectedValueOnce(new Error("offline"));
    else fetchMock.mockResolvedValueOnce(response({ schema_version: 99, status: "published", releases: [] }));
    await mount();
    expect(container.textContent).toContain("Parquet catalog unavailable");
    expect(container.textContent).toContain("does not mean that observations are missing");
    expect(container.querySelector("select")).toBeNull();
    await click("Retry");
    expect(container.querySelector("select")).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("copies each generated example and offers manual selection when clipboard access fails", async () => {
    await mount();
    for (const label of ["Python", "SQL", "CLI"]) {
      await click(label);
      const source = container.querySelector<HTMLElement>(`pre[aria-label="${label} Parquet example"]`)!.textContent;
      await act(async () => { container.querySelector<HTMLButtonElement>(`button[aria-label="Copy ${label} Parquet example"]`)!.click(); });
      expect(clipboard).toHaveBeenLastCalledWith(source);
      expect(container.textContent).toContain("Copied to clipboard.");
    }
    clipboard.mockRejectedValueOnce(new Error("permission denied"));
    await act(async () => { container.querySelector<HTMLButtonElement>('button[aria-label="Copy Release citation"]')!.click(); });
    expect(container.textContent).toContain("Select the text below and copy it");
    expect(container.querySelector('pre[aria-label="Release citation"]')!.textContent).toBe(published.releases[0].citation);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
