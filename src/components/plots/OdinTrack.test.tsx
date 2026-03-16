import { describe, it, expect } from "vitest";
import { composeStories } from "@storybook/react";
import * as OdinTrackStories from "./OdinTrack.stories";

const { Default } = composeStories(OdinTrackStories);

describe("OdinTrack story", () => {
  it("has at least one data point in args", () => {
    const data = Default.args?.data;
    expect(Array.isArray(data)).toBe(true);
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
