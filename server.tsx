import { Hono } from "hono";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import { loadConfig } from "./config.loader.ts";
import { setupGalleryRoutes } from "./src/routes/gallery.tsx";
import { setupImageRoutes } from "./src/routes/images.ts";
import { setupUploadRoutes } from "./src/routes/upload.ts";
import { Index } from "./src/components/Index.tsx";
import { Error } from "./src/components/Error.tsx";
import type { Context } from "hono";

const config = await loadConfig();

const app = new Hono();

// Apply middleware
app.use(logger());
app.use(compress());

// Setup routes
setupImageRoutes(app);
setupUploadRoutes(app, config);
setupGalleryRoutes(app, config);
// Home page
app.get("/", (c: Context) => {
  return c.html(<Index config={config} />);
});
// 404 handler
app.get("*", (c: Context) => {
  return c.html(<Error config={config} />, 404);
});

// Start server
Deno.serve({ port: config.server.port || 8080 }, app.fetch);
