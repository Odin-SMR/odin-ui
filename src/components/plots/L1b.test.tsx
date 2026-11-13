import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { L1BPlots } from "./L1b";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../odinApi/client", () => ({ createApiClient: () => ({ getRest_apiv5level1FreqmodeScannoL1b: client.request }) }));
vi.mock("./PilotSpectrum", () => ({ default: ({ data, frequencyReference }: { data: { ScanID?: number[] }; frequencyReference: string }) => <div data-spectrum={data.ScanID?.[0]}>{frequencyReference}</div> }));
let container: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); client.request.mockReset(); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const mount = async (scanid?: number, freqmode?: number) => { await act(async () => { root.render(<L1BPlots scanid={scanid} freqmode={freqmode} />); }); };

describe("Level 1 spectrum request selection", () => {
  it("does not invent IDs or an epoch time before selection", async () => {
    await mount();
    expect(client.request).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Select a day and frequency mode");
    expect(container.textContent).not.toContain("1858");
  });
  it("accepts valid zero identifiers and explicitly preserves the legacy first-LO contract", async () => {
    client.request.mockResolvedValue({ Data: { ScanID: [0] } }); await mount(0, 0);
    expect(client.request).toHaveBeenCalledWith(expect.objectContaining({ params: { freqmode: 0, scanno: 0 } }));
    expect(container.querySelector('[data-spectrum="0"]')?.textContent).toBe("first");
    act(() => { Array.from(container.querySelectorAll("button")).find((button) => button.getAttribute("aria-label") === "Download")?.click(); });
    expect(document.body.textContent).toContain("UTC time unavailable");
  });
  it("clears the previous scan while loading and ignores a response after its selection was abandoned", async () => {
    let first: (value: unknown) => void = () => {};
    client.request.mockImplementationOnce(() => new Promise((resolve) => { first = resolve; }));
    await mount(1, 2);
    client.request.mockResolvedValue({ Data: { ScanID: [2] } }); await mount(2, 2);
    await act(async () => { first({ Data: { ScanID: [1] } }); });
    expect(container.querySelector('[data-spectrum="1"]')).toBeNull();
    expect(container.querySelector('[data-spectrum="2"]')).not.toBeNull();
    client.request.mockImplementationOnce(() => new Promise(() => {})); await mount(3, 2);
    expect(container.querySelector('[data-spectrum="2"]')).toBeNull();
    expect(container.textContent).toContain("Loading spectra");
  });
  it("distinguishes request failure from empty spectra and permits retry", async () => {
    client.request.mockRejectedValueOnce(new Error("Unavailable")); await mount(1, 2);
    expect(container.textContent).toContain("Spectra could not be loaded");
    client.request.mockResolvedValueOnce({ Data: { ScanID: [1] } });
    await act(async () => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Retry")?.click(); });
    expect(container.querySelector('[data-spectrum="1"]')).not.toBeNull();
  });
});
