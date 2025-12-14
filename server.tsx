import { Hono } from "hono";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import { serveStatic } from "hono/deno";
import { loadConfig } from "./config.loader.ts";
import { setupGalleryRoutes } from "./src/routes/gallery.tsx";
import { setupImageRoutes } from "./src/routes/images.tsx";
import { setupUploadRoutes } from "./src/routes/upload.tsx";
import { intlify } from "./src/middleware/i18n.ts";

import { Index } from "./src/components/Index.tsx";
import { Error } from "./src/components/Error.tsx";
import type { Context } from "hono";

const config = await loadConfig();

const app = new Hono();

// Apply middleware
app.use(logger());
app.use(compress());

app.use("*", intlify);

// Serve static files
app.use("/static/*", serveStatic({ root: "./src" }));

// Setup routes
setupImageRoutes(app, config);
setupUploadRoutes(app, config);
setupGalleryRoutes(app, config);

// Home page
app.get("/", (c: Context) => {
  return c.html(<Index config={config} c={c} />);
});
// 404 handler
app.get("*", (c: Context) => {
  return c.html(<Error config={config} c={c} />, 404);
});

// Start server
Deno.serve({ port: config.server.port || 8080 }, app.fetch);
