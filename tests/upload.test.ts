/**
 * Upload functionality tests
 * Tests the public API for uploading files via /api/upload/:galleryId endpoint
 */

import { assertEquals, assertExists } from "@std/assert";
import { Hono } from "hono";
import { intlify } from "../src/middleware/i18n.ts";
import { setupUploadRoutes } from "../src/routes/upload.tsx";
import {
  createFormDataWithFile,
  createMockConfig,
  createMockImageFile,
  createTempDataDir,
  generateTestToken,
} from "./test_helpers.ts";

const TEST_GALLERY = "test-upload-gallery";

function createTestApp(uploadTokenHash: string | undefined, dataDir: string) {
  const app = new Hono();
  const config = createMockConfig(uploadTokenHash, dataDir);
  app.use("*", intlify);
  setupUploadRoutes(app, config);
  return app;
}

Deno.test({
  name: "Upload: successful image upload with valid token",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { token, hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    try {
      const file = createMockImageFile("test.jpg", 1024, "image/jpeg");
      const formData = createFormDataWithFile(file);

      const req = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 201);

      const json = await res.json();
      assertEquals(json.success, true);
      assertEquals(json.galleryId, TEST_GALLERY);
      assertExists(json.filename);

      const filePath = `${dataDir}/${TEST_GALLERY}/${json.filename}`;
      const fileInfo = await Deno.stat(filePath);
      assertEquals(fileInfo.isFile, true);

      const metadataPath = `${dataDir}/${TEST_GALLERY}/metadata.json`;
      const metadataContent = await Deno.readTextFile(metadataPath);
      const metadata = JSON.parse(metadataContent);
      assertEquals(metadata.uploadedFiles, 1);
      assertEquals(metadata.eventTitle, "Test Event");
      assertExists(metadata.timestamp);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: multiple uploads increment counter",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { token, hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    try {
      const file1 = createMockImageFile("test1.jpg");
      const formData1 = createFormDataWithFile(file1);
      const req1 = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData1,
      });
      await app.fetch(req1);

      const file2 = createMockImageFile("test2.jpg");
      const formData2 = createFormDataWithFile(file2);
      const req2 = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData2,
      });
      await app.fetch(req2);

      const metadataPath = `${dataDir}/${TEST_GALLERY}/metadata.json`;
      const metadataContent = await Deno.readTextFile(metadataPath);
      const metadata = JSON.parse(metadataContent);
      assertEquals(metadata.uploadedFiles, 2);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: reject upload without authorization header",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    try {
      const file = createMockImageFile();
      const formData = createFormDataWithFile(file);

      const req = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        body: formData,
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 401);

      const json = await res.json();
      assertEquals(json.error, "Unauthorized");
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: reject upload with invalid token",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    try {
      const file = createMockImageFile();
      const formData = createFormDataWithFile(file);

      const req = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        headers: { "Authorization": "Bearer invalid-token" },
        body: formData,
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 401);

      const json = await res.json();
      assertEquals(json.error, "Unauthorized");
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: reject when upload not configured",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const app = createTestApp(undefined, dataDir);

    try {
      const file = createMockImageFile();
      const formData = createFormDataWithFile(file);

      const req = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        headers: { "Authorization": "Bearer some-token" },
        body: formData,
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 503);

      const json = await res.json();
      assertEquals(json.error, "Upload not configured");
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: reject path traversal attempts",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { token, hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    try {
      const maliciousGalleryIds = [
        "../etc/passwd",
        "gallery/../../../etc",
        "gallery/../../data",
        "gallery\\..\\windows",
      ];

      for (const galleryId of maliciousGalleryIds) {
        const file = createMockImageFile();
        const formData = createFormDataWithFile(file);

        const req = new Request(`http://localhost/api/upload/${encodeURIComponent(galleryId)}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        });

        const res = await app.fetch(req);
        assertEquals(res.status, 400, `Expected 400 for: ${galleryId}`);
      }
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: reject request without file",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { token, hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    try {
      const formData = new FormData();

      const req = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 400);

      const json = await res.json();
      assertEquals(json.error, "No file provided");
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: reject file that is too large",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { token, hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    try {
      const MAX_SIZE = 50 * 1024 * 1024;
      const file = createMockImageFile("huge.jpg", MAX_SIZE + 1024, "image/jpeg");
      const formData = createFormDataWithFile(file);

      const req = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 400);

      const json = await res.json();
      assertEquals(json.error.includes("File too large"), true);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: reject invalid file type",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { token, hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    try {
      const file = createMockImageFile("test.txt", 1024, "text/plain");
      const formData = createFormDataWithFile(file);

      const req = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const res = await app.fetch(req);
      assertEquals(res.status, 400);

      const json = await res.json();
      assertEquals(json.error.includes("Invalid file type"), true);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: accept all allowed MIME types",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { token, hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    const allowedTypes = [
      { type: "image/jpeg", ext: "jpg" },
      { type: "image/png", ext: "png" },
      { type: "image/webp", ext: "webp" },
      { type: "image/heic", ext: "heic" },
      { type: "image/heif", ext: "heif" },
      { type: "video/mp4", ext: "mp4" },
    ];

    try {
      for (const { type, ext } of allowedTypes) {
        const file = createMockImageFile(`test.${ext}`, 1024, type);
        const formData = createFormDataWithFile(file);

        const req = new Request(`http://localhost/api/upload/${TEST_GALLERY}-${ext}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        });

        const res = await app.fetch(req);
        assertEquals(res.status, 201, `Failed for type ${type}`);

        const json = await res.json();
        assertEquals(json.success, true);
      }
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Upload: generate unique filenames for duplicate uploads",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-upload-test-");
    const { token, hash } = await generateTestToken();
    const app = createTestApp(hash, dataDir);

    try {
      const filenames: string[] = [];

      for (let i = 0; i < 3; i++) {
        const file = createMockImageFile("same-name.jpg");
        const formData = createFormDataWithFile(file);

        const req = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        });

        const res = await app.fetch(req);
        const json = await res.json();
        filenames.push(json.filename);
      }

      const uniqueFilenames = new Set(filenames);
      assertEquals(uniqueFilenames.size, 3);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});
