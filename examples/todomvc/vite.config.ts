import { defineConfig } from "vite"
import viteCompression from "vite-plugin-compression"

export default defineConfig({
  root: ".",
  plugins: [
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024 // Only compress files larger than 1KB
    })
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022"
  },
  server: {
    port: 3000,
    open: true
  }
})
