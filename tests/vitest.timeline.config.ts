import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", include: ["src/hooks/Level1Stats.test.tsx", "src/components/StackedBarPlot.test.tsx", "src/hooks/MigrationTimeline.test.tsx", "src/components/MigrationTimeline.test.tsx", "src/hooks/Level2Stats.test.tsx", "src/components/Level1.test.tsx"] },
});
