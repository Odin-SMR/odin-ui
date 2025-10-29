import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { OdinTrack } from "./OdinTrack";

const meta: Meta<typeof OdinTrack> = {
  component: OdinTrack,
  title: "Components/OdinTrack",
  decorators: [
    (Story) => (
      <div
        style={{
          width: "600px",
          height: "400px",
          border: "1px solid #ccc",
          resize: "both",
          overflow: "auto",
          padding: "8px",
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof OdinTrack> = {
  args: {
    data: [
      { lat: 0, lon: 0, scanid: 0 },
      { lat: 10, lon: 10, scanid: 1 },
      { lat: 20, lon: 20, scanid: 2 },
    ],
    scanid: 2,
    selectedScanid: fn(),
  },
};
