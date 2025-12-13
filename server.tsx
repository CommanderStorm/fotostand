import { Hono } from "hono";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import { loadConfig } from './config.loader.ts';
import { setupPageRoutes } from './src/routes/pages.tsx';
import { setupImageRoutes } from './src/routes/images.ts';
import { setupUploadRoutes } from './src/routes/upload.ts';

const config = await loadConfig();

const app = new Hono();

// Apply middleware
app.use(logger());
app.use(compress());

// Setup routes
setupPageRoutes(app, config);
setupImageRoutes(app, config);
setupUploadRoutes(app, config);

// Start server
Deno.serve({ port: config.server.port || 8080 }, app.fetch);
