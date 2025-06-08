import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/rest_api": {
        target: "https://odin-smr.org",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
