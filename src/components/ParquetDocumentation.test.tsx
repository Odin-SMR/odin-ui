import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ParquetDocumentation from "./ParquetDocumentation";

let container: HTMLDivElement;
let root: Root;
const mount = async (page: "guide" | "schema") => { await act(async () => { root.render(<MemoryRouter><ParquetDocumentation page={page} /></MemoryRouter>); }); };
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("Parquet documentation pages", () => {
  it("renders the guide source with one page heading and local documentation/download links", async () => {
    await mount("guide");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")!.textContent).toBe("Analyze Odin-SMR Parquet data");
    const article = container.querySelector("article")!;
    expect(article.textContent).toContain("A LIMIT bounds output rows, not download bytes");
    expect(article.querySelector('a[href="/data_access#parquet-access"]')).not.toBeNull();
    expect(article.querySelector('a[href="https://odin-smr.org/data_access#parquet-access"]')).toBeNull();
    expect(article.querySelector('a[href="/data_access/parquet-schema"]')).not.toBeNull();
    expect(article.querySelector('a[href="/parquet/requirements.txt"]')).not.toBeNull();
    for (const name of ["first-profile", "coverage", "diagnostics"]) expect(article.querySelector(`a[href="/parquet/${name}.ipynb"]`)).not.toBeNull();
    expect(container.querySelector('a[href="/parquet/guide.md"][download]')).not.toBeNull();
    expect(article.querySelector('pre[tabindex="0"]')).not.toBeNull();
    expect(article.querySelector('table')!.parentElement!.getAttribute("tabindex")).toBe("0");
  });

  it("renders the schema source and maps its analysis-guide cross-link", async () => {
    await mount("schema");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")!.textContent).toBe("Odin Parquet schemas and scientific contracts");
    const article = container.querySelector("article")!;
    expect(article.textContent).toContain("A Parquet physical type alone does not define scientific meaning");
    expect(article.querySelector('a[href="/data_access/parquet-guide"]')).not.toBeNull();
    expect(container.querySelector('a[href="/parquet/schema-guide.md"][download]')).not.toBeNull();
    expect(container.querySelector('nav a[aria-current="page"]')!.getAttribute("href")).toBe("/data_access/parquet-schema");
  });
});
