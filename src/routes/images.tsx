import type { Context } from "hono";
import { isValidPath } from "../utils/security.ts";
import { generateRenamedFilename } from "../utils/file.ts";
import type { Config } from "../../config.ts";
import { Tar } from "@std/archive/tar";
import { readAll } from "@std/io/read-all";
import { Error } from "../components/Error.tsx";

export function setupImageRoutes(app: any, config: Config) {
  const dataDir = config.server.dataDir;

  // Download all images as a tar archive
  // IMPORTANT: keep this route before /img/:galleryId/:filename
  app.get("/img/:galleryId/download-all.tar", async (c: Context) => {
    const galleryId = c.req.param("galleryId");

    // Validate parameter to prevent path traversal
    if (!isValidPath(galleryId)) {
      return c.notFound();
    }

    const galleryDir = `${dataDir}/${galleryId}`;

    // Ensure gallery directory exists
    try {
      const stat = await Deno.stat(galleryDir);
      if (!stat.isDirectory) {
        return c.html(<Error config={config} c={c} />, 404);
      }
    } catch {
      return c.html(<Error config={config} c={c} />, 404);
    }

    // Read metadata (optional) for nicer tar filename
    let tarBaseName = `gallery-${galleryId}`;
    try {
      const metadataPath = `${galleryDir}/metadata.json`;
      const metadataContent = await Deno.readTextFile(metadataPath);
      const metadata = JSON.parse(metadataContent);

      if (typeof metadata?.eventTitle === "string" && metadata.eventTitle.trim().length > 0) {
        tarBaseName = metadata.eventTitle;
      }
    } catch {
      // ignore metadata errors; fall back to defaults
    }

    // Collect image file paths (skip metadata.json)
    const files: Array<{ diskPath: string; tarPath: string }> = [];
    try {
      for await (const entry of Deno.readDir(galleryDir)) {
        if (!entry.isFile) continue;
        if (entry.name === "metadata.json") continue;

        files.push({
          diskPath: `${galleryDir}/${entry.name}`,
          tarPath: entry.name,
        });
      }
    } catch {
      return c.notFound();
    }

    if (files.length === 0) {
      return c.text("No images found", 404);
    }

    // ASCII-safe tar filename in Content-Disposition
    const safeTarName = `${tarBaseName}`.replaceAll(/[^a-zA-Z0-9._-]+/g, "_");
    const tarFilename = `${safeTarName}.tar`;

    // Build tar in memory (simple + reliable, no external binaries, no web-worker deps)
    const tar = new Tar();
    const openFiles: Deno.FsFile[] = [];

    try {
      for (const f of files) {
        const stat = await Deno.stat(f.diskPath);
        if (!stat.isFile) continue;

        const file = await Deno.open(f.diskPath, { read: true });
        // IMPORTANT:
        // We must not close `file` until the tar has been fully materialized.
        // `Tar.append()` keeps reading from the provided Reader as the tar is generated.
        // Closing early can lead to "BadResource: Bad resource ID".
        openFiles.push(file);

        await tar.append(f.tarPath, {
          reader: file,
          contentSize: stat.size,
          mtime: stat.mtime ? Math.floor(stat.mtime.getTime() / 1000) : undefined,
        });
      }

      const tarBytes = await readAll(tar.getReader());

      const headers = new Headers();
      headers.set("Content-Type", "application/x-tar");
      headers.set("Cache-Control", "no-store");
      headers.set("Content-Disposition", `attachment; filename="${tarFilename}"`);

      // Deno's type defs sometimes treat Uint8Array as ArrayBufferLike (could be SharedArrayBuffer),
      // which doesn't satisfy BlobPart typing. Copy into a fresh ArrayBuffer-backed Uint8Array.
      const copied = new Uint8Array(tarBytes.byteLength);
      copied.set(tarBytes);
      const tarBlob = new Blob([copied.buffer], { type: "application/x-tar" });
      return new Response(tarBlob, { headers });
    } finally {
      for (const f of openFiles) {
        try {
          f.close();
        } catch {
          // ignore cleanup errors
        }
      }
    }
  });

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
