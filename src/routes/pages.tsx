import type { Context } from "hono";
import { isValidPath } from "../utils/security.ts";
import { Index } from "../components/Index.tsx";
import { Gallery } from "../components/Gallery.tsx";
import { Error } from "../components/Error.tsx";
import type { Config } from "../../config.ts";

export function setupPageRoutes(app: any, config: Config) {
  // Home page
  app.get("/", (c: Context) => {
    return c.html(<Index config={config} />);
  });

  // Gallery page
  app.get("/gallery/:key", (c: Context) => {
    const key = c.req.param("key");
    if (!isValidPath(key)) {
      return c.html(<Error config={config} />, 404);
    }

    const galleryComponent = <Gallery folder={key} config={config} />;
    if (galleryComponent === null) {
      return c.html(<Error config={config} />, 404);
    }

    return c.html(galleryComponent);
  });

  // 404 handler
  app.get("*", (c: Context) => {
    return c.html(<Error config={config} />, 404);
  });
}
