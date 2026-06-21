import { defineCloudflareConfig } from "@opennextjs/cloudflare"

// Build with Webpack instead of Turbopack: OpenNext's server bundle is not yet
// compatible with Turbopack output (causes ChunkLoadError at runtime on Workers).
export default {
  ...defineCloudflareConfig(),
  buildCommand: "bunx next build --webpack",
}
