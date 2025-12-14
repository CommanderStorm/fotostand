import type { Context } from "hono";
import { isValidPath } from "../utils/security.ts";
import { generateRenamedFilename } from "../utils/file.ts";
import type { Config } from "../../config.ts";

export function setupImageRoutes(app: any, config?: Config) {
  const dataDir = config?.server?.dataDir ?? "./data";

  // Custom image serving with renamed files
  app.get("/img/:galleryId/:filename", async (c: Context) => {
    const galleryId = c.req.param("galleryId");
    const filename = c.req.param("filename");

    // Validate both parameters to prevent path traversal
    if (!isValidPath(galleryId) || !isValidPath(filename)) {
      return c.notFound();
    }

    const filePath = `${dataDir}/${galleryId}/${filename}`;

    // Check if file exists
    try {
      const stat = await Deno.stat(filePath);
      if (!stat.isFile) {
        return c.notFound();
      }
    } catch {
      return c.notFound();
    }

    // Read metadata for renamed filename
    let renamedFilename = filename;
    try {
      const metadataPath = `${dataDir}/${galleryId}/metadata.json`;
      const metadataContent = await Deno.readTextFile(metadataPath);
      const metadata = JSON.parse(metadataContent);

      const timestamp = new Date(metadata.timestamp);
      const extension = filename.split(".").pop() || "jpg";

      renamedFilename = generateRenamedFilename(
        metadata.eventTitle,
        timestamp,
        extension,
      );
    } catch (error) {
      // If metadata doesn't exist or can't be read, use original filename
      console.warn(
        `Could not read metadata for ${galleryId} because ${
          (error as Error)?.message
        }, using original filename`,
      );
    }

    // Read and serve the file
    const fileContent = await Deno.readFile(filePath);

    // Set headers
    c.header("Content-Type", "image/jpeg");
    c.header("Cache-Control", "immutable, max-age=360");
    c.header("Content-Disposition", `inline; filename="${renamedFilename}"`);

    return c.body(fileContent);
  });
}
