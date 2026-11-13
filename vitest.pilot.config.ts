import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/odinApi/pilot.test.ts", "src/components/MigrationPilot.test.tsx", "src/components/plots/PilotSpectrum.test.tsx"],
  },
});
