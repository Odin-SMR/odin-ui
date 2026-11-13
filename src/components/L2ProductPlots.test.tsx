import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { L2ProductPlots } from "./L2ProductPlots";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../odinApi/cloud_client", () => ({ createApiClient: () => ({ products_products_get: client.request }) }));
vi.mock("./L2Plot", () => ({ L2Plot: () => <div>VMR plot</div> }));
const product = { name: "O3", scanid: 0, data: { vmr: [1e-6], alt: [30000], meas_resp: [0.8], temp: [], pressure: [] } };
let container: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); client.request.mockReset(); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const mount = async (scanid?: number, day?: string) => { await act(async () => { root.render(<L2ProductPlots scanid={scanid} day={day} />); }); };

describe("retrieved product states", () => {
  it("keeps no selection, no returned products, and request failures distinct", async () => {
    await mount(); expect(client.request).not.toHaveBeenCalled(); expect(container.textContent).toContain("Select a scan");
    client.request.mockResolvedValueOnce([]); await mount(0, "2015-01-11"); expect(container.textContent).toContain("No retrieved products were returned for scan 0");
    client.request.mockRejectedValueOnce(new Error("Unavailable")); await mount(1, "2015-01-11"); expect(container.textContent).toContain("products could not be loaded");
  });
  it("does not leave products from an old scan visible while the next scan is loading", async () => {
    client.request.mockResolvedValueOnce([product]); await mount(0, "2015-01-11"); expect(container.textContent).toContain("O3");
    client.request.mockImplementationOnce(() => new Promise(() => {})); await mount(1, "2015-01-11");
    expect(container.textContent).not.toContain("O3"); expect(container.textContent).toContain("Loading retrieved products for scan 1");
  });
  it("keeps temperature downloads discoverable without plotting them on a mixing-ratio axis", async () => {
    client.request.mockResolvedValueOnce([{ ...product, name: "Temperature" }]); await mount(0, "2015-01-11");
    expect(container.textContent).toContain("Temperature products are available as JSON");
    expect(container.textContent).not.toContain("VMR plot");
    act(() => { Array.from(container.querySelectorAll("button")).find((button) => button.getAttribute("aria-label") === "Download")?.click(); });
    expect(document.body.textContent).toContain("Download JSON");
  });
});
