import type { Context } from "hono";
import { isValidPath } from "../utils/security.ts";
import { Gallery } from "../components/Gallery.tsx";
import { Error } from "../components/Error.tsx";
import type { Config } from "../../config.ts";

export function setupGalleryRoutes(app: any, config: Config) {
  const dataDir = config.server.dataDir ?? "./data";

  // Gallery page
  app.get("/gallery/:key", (c: Context) => {
    const key = c.req.param("key");
    if (!isValidPath(key)) {
      return c.html(<Error config={config} c={c} />, 404);
    }

    // Check if gallery folder exists
    try {
      Deno.statSync(`${dataDir}/${key}`);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return c.html(<Error config={config} c={c} />, 404);
      }
      throw err;
    }

    return c.html(<Gallery folder={key} config={config} c={c} />);
  });
}
