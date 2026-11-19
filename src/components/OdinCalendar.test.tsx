import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { composeStories } from "@storybook/react";
import dayjs, { type Dayjs } from "dayjs";
import { OdinCalendar } from "./OdinCalendar";
import * as OdinCalendarStories from "./OdinCalendar.stories";

vi.mock("@fullcalendar/react", () => ({ default: () => null }));
const { Default } = composeStories(OdinCalendarStories);

describe("OdinCalendar story", () => {
  it("has two events configured in args", () => {
    const events = Default.args?.events;
    if (!Array.isArray(events)) {
      throw new Error("events is not an array");
    }
    expect(events).toHaveLength(2);
  });
});

describe("observation month editing", () => {
  let container: HTMLDivElement, root: Root, currentMonth: Dayjs;
  let accept: boolean, minDate: string | undefined, maxDate: string | undefined, selectedId: string | undefined;
  const selectMonth = vi.fn((next: Dayjs) => {
    if (accept) { currentMonth = next; render(); }
  });
  const render = () => root.render(<OdinCalendar loading={false} events={[]} month={currentMonth} setMonth={selectMonth} minDate={minDate} maxDate={maxDate} selectedId={selectedId} />);
  const mount = (fallback = true) => {
    if (fallback) {
      const type = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "type")!;
      vi.spyOn(HTMLInputElement.prototype, "type", "set").mockImplementation(function (this: HTMLInputElement, value) {
        type.set!.call(this, value === "month" ? "text" : value);
      });
      const setAttribute = HTMLInputElement.prototype.setAttribute;
      vi.spyOn(HTMLInputElement.prototype, "setAttribute").mockImplementation(function (this: HTMLInputElement, name, value) {
        return setAttribute.call(this, name, name === "type" && value === "month" ? "text" : value);
      });
    }
    act(render);
  };
  const input = () => container.querySelector<HTMLInputElement>('input[placeholder="YYYY-MM"]')!;
  const edit = (value: string) => act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
  const blur = () => act(() => { input().dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
  const key = (value: string) => {
    const event = new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true });
    act(() => { input().dispatchEvent(event); });
    return event;
  };
  const button = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    selectMonth.mockClear(); accept = true; minDate = undefined; maxDate = undefined; selectedId = undefined;
    currentMonth = dayjs.utc("2015-01-01");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("retains partial text and commits a complete leap-year month only on Enter", () => {
    mount();
    expect(input().type).toBe("text");
    expect(container.textContent).toContain("Enter YYYY-MM");
    for (const value of ["", "2", "20", "201", "2016", "2016-", "2016-0", "2016-02"]) {
      edit(value); expect(input().value).toBe(value); expect(selectMonth).not.toHaveBeenCalled();
    }
    expect(key("Enter").defaultPrevented).toBe(true);
    expect(selectMonth).toHaveBeenCalledTimes(1);
    const selected = selectMonth.mock.calls[0][0];
    expect(selected.format("YYYY-MM-DDTHH:mm:ss[Z]")).toBe("2016-02-01T00:00:00Z");
    expect(selected.isUTC()).toBe(true); expect(selected.daysInMonth()).toBe(29);
    expect(input().value).toBe("2016-02");
  });

  it("commits text on blur and native picker values on change", () => {
    mount(false);
    expect(input().type).toBe("month");
    edit("2016-02"); expect(selectMonth).toHaveBeenCalledTimes(1);
    expect(input().value).toBe("2016-02");
    // Exercise the same component with the DOM type supplied by a fallback browser.
    input().type = "text";
    edit("2020-02"); expect(selectMonth).toHaveBeenCalledTimes(1);
    blur(); expect(selectMonth).toHaveBeenCalledTimes(2);
    expect(currentMonth.format("YYYY-MM")).toBe("2020-02");
  });

  it.each(["", "2016-", "2016-00", "2016-13", "2016-2", "0000-02", "20160-02", "2016-02junk"])("rejects incomplete or invalid month %j without normalizing it", (value) => {
    mount(); edit(value); blur();
    expect(selectMonth).not.toHaveBeenCalled(); expect(input().value).toBe(value);
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("Enter a valid month as YYYY-MM (01–12).");
  });

  it("preserves inclusive month bounds and previous/next navigation", () => {
    minDate = "2015-01-11"; maxDate = "2015-03-09"; mount();
    expect(button("Previous month").disabled).toBe(true);
    edit("2014-12"); key("Enter"); expect(selectMonth).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Choose 2015-01 or a later month.");
    edit("2015-04"); blur(); expect(selectMonth).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Choose 2015-03 or an earlier month.");
    edit("2015-03"); key("Enter");
    expect(currentMonth.format("YYYY-MM-DD")).toBe("2015-03-01");
    expect(button("Next month").disabled).toBe(true);
    edit("invalid"); blur();
    act(() => button("Previous month").click());
    expect(input().value).toBe("2015-02"); expect(input().getAttribute("aria-invalid")).toBe("false");
    act(() => button("Previous month").click());
    expect(input().value).toBe("2015-01"); expect(button("Previous month").disabled).toBe(true);
  });

  it("tracks external month changes while preserving drafts on unrelated rerenders", () => {
    mount(); edit("2020-");
    currentMonth = currentMonth.clone(); act(render);
    expect(input().value).toBe("2020-");
    currentMonth = dayjs.utc("2018-12-01"); act(render);
    expect(input().value).toBe("2018-12");
    edit("invalid"); key("Escape");
    expect(input().value).toBe("2018-12"); expect(selectMonth).not.toHaveBeenCalled();
  });

  it("retains the parent's committed value when a coverage gap is declined", () => {
    accept = false; mount(); edit("2016-02"); key("Enter");
    expect(selectMonth).toHaveBeenCalledTimes(1);
    expect(input().value).toBe("2015-01");
    act(() => button("Next month").click());
    expect(selectMonth).toHaveBeenCalledTimes(2); expect(input().value).toBe("2015-01");
  });

  it("does not resubmit a committed edit when navigation moves focus away", () => {
    mount(); edit("2016-02"); key("Enter");
    blur(); key("Enter");
    expect(selectMonth).toHaveBeenCalledTimes(1);
    expect(input().value).toBe("2016-02");
    currentMonth = dayjs.utc("2020-03-01"); act(render); blur();
    expect(selectMonth).toHaveBeenCalledTimes(1);
    expect(input().value).toBe("2020-03");
  });

  it("cancels a dirty month when external navigation changes only the selected day or mode", () => {
    selectedId = "2015-01-12-1"; mount(); edit("2020-03");
    selectedId = "2015-01-11-1"; act(render); blur();
    expect(selectMonth).not.toHaveBeenCalled(); expect(input().value).toBe("2015-01");
    edit("2022-05"); selectedId = "2015-01-11-2"; act(render); blur();
    expect(selectMonth).not.toHaveBeenCalled(); expect(input().value).toBe("2015-01");
  });

  it("keeps early years exact and prevents navigation beyond the calendar range", () => {
    mount(); edit("0001-01"); key("Enter");
    expect(currentMonth.year()).toBe(1); expect(input().value).toBe("0001-01");
    expect(button("Previous month").disabled).toBe(true);
    edit("9999-12"); key("Enter");
    expect(currentMonth.year()).toBe(9999); expect(button("Next month").disabled).toBe(true);
  });
});
