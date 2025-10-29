import type { Meta, StoryObj } from "@storybook/react-vite";
import dayjs from "dayjs";
import { fn } from "storybook/test";
import { OdinCalendar } from "./OdinCalendar";

const meta: Meta<typeof OdinCalendar> = {
  component: OdinCalendar,
  title: "Components/OdinCalendar",
};
export default meta;

export const Default: StoryObj<typeof OdinCalendar> = {
  args: {
    eventClick: fn(),
    events: [
      { start: "2025-09-09T03:12Z", title: "Birthday" },
      { start: "2025-09-09T04:13", title: "Birthday2" },
    ],
    loading: false,
    month: dayjs.utc("2025-09-01T00:00"),
    setMonth: fn(),
  },
};
