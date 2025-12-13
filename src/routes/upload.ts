import type { Context } from "hono";
import { isValidPath, verifyUploadToken } from "../utils/security.ts";
import { generateUniqueFilename } from "../utils/file.ts";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "../constants.ts";
import type { Config } from "../../config.ts";

export function setupUploadRoutes(app: any, config: Config) {
  // Upload endpoint with security measures
  app.post("/api/upload/:galleryId", async (c: Context) => {
    const galleryId = c.req.param("galleryId");

    // Validate gallery ID to prevent path traversal
    if (!isValidPath(galleryId)) {
      return c.json({ error: "Invalid gallery ID" }, 400);
    }

    // Check authentication token
    const authHeader = c.req.header("Authorization");
    const uploadTokenHash = config.server.uploadTokenHash;

    if (!uploadTokenHash) {
      return c.json({ error: "Upload not configured" }, 503);
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("Unauthorized upload attempt: Missing or invalid Authorization header");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const providedToken = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token using constant-time comparison to prevent timing attacks
    if (!await verifyUploadToken(providedToken, uploadTokenHash)) {
      console.warn("Unauthorized upload attempt: Invalid token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      // Parse multipart form data
      const formData = await c.req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return c.json({ error: "No file provided" }, 400);
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return c.json(
          { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          400,
        );
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return c.json(
          { error: "Invalid file type. Only images are allowed, but got " + file.type },
          400,
        );
      }

      // Create gallery directory if it doesn't exist
      const galleryPath = `./data/${galleryId}`;
      try {
        await Deno.mkdir(galleryPath, { recursive: true });
      } catch (err) {
        if (!(err instanceof Deno.errors.AlreadyExists)) {
          throw err;
        }
      }

      // Generate unique filename with timestamp
      const uniqueFilename = generateUniqueFilename(file.name);
      const filePath = `${galleryPath}/${uniqueFilename}`;

      // Write file to disk
      const arrayBuffer = await file.arrayBuffer();
      await Deno.writeFile(filePath, new Uint8Array(arrayBuffer));

      // Create/update metadata
      const metadataPath = `${galleryPath}/metadata.json`;
      const metadata = {
        timestamp: new Date().toISOString(),
        eventTitle: config.event.title,
        uploadedFiles: 1,
      };

      try {
        const existingMetadata = await Deno.readTextFile(metadataPath);
        const existing = JSON.parse(existingMetadata);
        metadata.uploadedFiles = (existing.uploadedFiles || 0) + 1;
      } catch {
        // Metadata doesn't exist yet, use defaults
      }

      await Deno.writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));

      return c.json({
        success: true,
        filename: uniqueFilename,
        galleryId: galleryId,
      }, 201);
    } catch (error) {
      console.error("Upload error:", error);
      return c.json({ error: "Upload failed" }, 500);
    }
  });
}
