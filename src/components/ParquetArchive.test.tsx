import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParquetArchive } from "./ParquetArchive";

const file = (name: string, year: number, month: number) => ({ url: `https://science.example.org/${name}.parquet`, size_bytes: 1024, year, month, etag: "opaque", last_modified: "2026-11-13T10:00:00Z" });
const shards = [
  { schema_version: 1, snapshot_id: "test", group_id: "a", files: [file("january", 2022, 1), file("march", 2022, 3), file("next-year", 2023, 2)] },
  { schema_version: 1, snapshot_id: "test", group_id: "b", files: [file("other-project", 2024, 6)] },
];
const index = { schema_version: 1, snapshot_id: "test", generated_at: "2026-11-13T12:00:00Z", description: "Synthetic inventory only.", source_scope: "Two synthetic projects.", groups: shards.map((shard) => ({ id: shard.group_id, project: `project-${shard.group_id}`, product: "O3", frequency_mode: 1, inversion_mode: "strat", level: "L2", file_count: shard.files.length, size_bytes: shard.files.length * 1024, index_url: `/parquet/archive/test/${shard.group_id}.json` })) };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
let container: HTMLDivElement, root: Root, fetchMock: ReturnType<typeof vi.fn>, downloads: Blob[];
const flush = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const mount = async () => { await act(async () => { root.render(<ParquetArchive />); }); await flush(); };
const button = (label: string) => [...container.querySelectorAll<HTMLButtonElement>("button")].find((entry) => entry.textContent === label)!;
const click = async (label: string) => { await act(async () => { button(label).click(); }); await flush(); };
const change = async (id: string, value: string) => {
  await act(async () => {
    const input = container.querySelector<HTMLSelectElement>(`#${id}`)!;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
};
const blobText = (blob: Blob) => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob); });

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  fetchMock = vi.fn(async (url: string) => response(url.endsWith("/index.json") ? index : shards.find((shard) => url.endsWith(`/${shard.group_id}.json`))));
  vi.stubGlobal("fetch", fetchMock);
  downloads = [];
  const OriginalURL = URL;
  vi.stubGlobal("URL", class extends OriginalURL {
    static createObjectURL(blob: Blob) { downloads.push(blob); return "blob:test"; }
    static revokeObjectURL() {}
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("archive file discovery", () => {
  it("loads only index and one shard, selecting earliest available partition month", async () => {
    await mount();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/parquet/archive/index.json", "/parquet/archive/test/a.json"]);
    for (const [, options] of fetchMock.mock.calls as unknown as [string, RequestInit][]) expect(options.credentials).toBe("omit");
    expect(container.querySelector<HTMLSelectElement>("#archive-year")!.value).toBe("2022");
    expect(container.querySelector<HTMLSelectElement>("#archive-month")!.value).toBe("1");
    expect(container.querySelector('a[href="https://science.example.org/january.parquet"]')).not.toBeNull();
    expect(container.querySelector('a[href="https://science.example.org/march.parquet"]')).toBeNull();
    expect(container.textContent).toContain("partition labels do not establish exact observation dates");
    expect(container.textContent).toContain("opaque S3 ETags");
  });

  it("filters locally and loads only a newly chosen project shard", async () => {
    await mount();
    await change("archive-month", "3");
    expect(container.querySelector('a[href="https://science.example.org/march.parquet"]')).not.toBeNull();
    await change("archive-year", "2023");
    expect(container.querySelector<HTMLSelectElement>("#archive-month")!.value).toBe("2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await change("archive-project", "project-b");
    expect(container.querySelector<HTMLSelectElement>("#archive-year")!.value).toBe("2024");
    expect(container.querySelector<HTMLSelectElement>("#archive-month")!.value).toBe("6");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.slice(-1)[0][0]).toBe("/parquet/archive/test/b.json");
  });

  it("downloads exact selected URLs and metadata without fetching scientific files", async () => {
    await mount(); await change("archive-month", "3");
    await click("Download archive URLs");
    expect(await blobText(downloads[0])).toBe("https://science.example.org/march.parquet\n");
    await click("Download archive metadata");
    const selected = JSON.parse(await blobText(downloads[1]));
    expect(selected.partition).toEqual({ year: 2022, month: 3 });
    expect(selected.snapshot_id).toBe("test");
    expect(selected.files).toEqual([shards[0].files[1]]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("withholds links on mismatched shard metadata and supports retry", async () => {
    fetchMock.mockImplementationOnce(async () => response(index)).mockImplementationOnce(async () => response({ ...shards[0], group_id: "wrong" }));
    await mount();
    expect(container.textContent).toContain("does not match this archive snapshot");
    expect(container.querySelector('a[href$=".parquet"]')).toBeNull();
    await click("Retry product");
    expect(container.querySelector('a[href$=".parquet"]')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
