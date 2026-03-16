import { describe, it, expect } from "vitest";
import { composeStories } from "@storybook/react";
import * as OdinCalendarStories from "./OdinCalendar.stories";

const { Default } = composeStories(OdinCalendarStories);

describe("OdinCalendar story", () => {
  it("has two events configured in args", () => {
    const events = Default.args?.events;
    expect(Array.isArray(events)).toBe(true);
    expect(events?.length).toBe(2);
  });
});
