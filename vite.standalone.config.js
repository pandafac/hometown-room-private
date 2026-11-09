import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "D:/codex-tools/standalone-build",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: "index.standalone.html",
      output: {
        codeSplitting: false,
        entryFileNames: "app.js",
        assetFileNames: "app.[ext]",
      },
    },
  },
});
