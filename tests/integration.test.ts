/**
 * Integration tests
 * Tests the public API with multiple features working together
 */

import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { Hono } from "hono";
import { setupGalleryRoutes } from "../src/routes/gallery.tsx";
import { setupImageRoutes } from "../src/routes/images.ts";
import { setupUploadRoutes } from "../src/routes/upload.ts";
import { intlify } from "../src/middleware/i18n.ts";
import {
  cleanupTestData,
  createFormDataWithFile,
  createMockConfig,
  createMockImageFile,
  generateTestToken,
} from "./test_helpers.ts";

const TEST_GALLERY = "integration-test-gallery";

async function createFullTestApp() {
  const { token, hash } = await generateTestToken();
  const app = new Hono();
  const config = createMockConfig(hash);

  app.use("*", intlify);
  setupImageRoutes(app);
  setupUploadRoutes(app, config);
  setupGalleryRoutes(app, config);

  return { app, token, config };
}

Deno.test({
  name: "Integration: complete upload and view workflow",
  async fn() {
    const { app, token } = await createFullTestApp();

    try {
      const file = createMockImageFile("test.jpg", 2048, "image/jpeg");
      const formData = createFormDataWithFile(file);

      const uploadReq = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const uploadRes = await app.fetch(uploadReq);
      assertEquals(uploadRes.status, 201);

      const uploadJson = await uploadRes.json();
      assertEquals(uploadJson.success, true);
      assertExists(uploadJson.filename);

      const uploadedFilename = uploadJson.filename;

      const galleryReq = new Request(`http://localhost/gallery/${TEST_GALLERY}`);
      const galleryRes = await app.fetch(galleryReq);
      assertEquals(galleryRes.status, 200);

      const galleryHtml = await galleryRes.text();
      assertStringIncludes(galleryHtml, TEST_GALLERY);

      const imageReq = new Request(`http://localhost/img/${TEST_GALLERY}/${uploadedFilename}`);
      const imageRes = await app.fetch(imageReq);
      assertEquals(imageRes.status, 200);
      assertEquals(imageRes.headers.get("content-type"), "image/jpeg");
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});

Deno.test({
  name: "Integration: upload multiple files and verify metadata",
  async fn() {
    const { app, token } = await createFullTestApp();

    try {
      const uploadedFiles: string[] = [];

      for (let i = 0; i < 3; i++) {
        const file = createMockImageFile(`test${i}.jpg`, 1024, "image/jpeg");
        const formData = createFormDataWithFile(file);

        const uploadReq = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        });

        const uploadRes = await app.fetch(uploadReq);
        const uploadJson = await uploadRes.json();
        uploadedFiles.push(uploadJson.filename);

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      for (const filename of uploadedFiles) {
        const imageReq = new Request(`http://localhost/img/${TEST_GALLERY}/${filename}`);
        const imageRes = await app.fetch(imageReq);
        assertEquals(imageRes.status, 200, `File ${filename} should exist`);
      }

      const metadataPath = `./data/${TEST_GALLERY}/metadata.json`;
      const metadataContent = await Deno.readTextFile(metadataPath);
      const metadata = JSON.parse(metadataContent);
      assertEquals(metadata.uploadedFiles, 3);
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});

Deno.test({
  name: "Integration: unauthorized requests cannot access upload",
  async fn() {
    const { app } = await createFullTestApp();

    try {
      const file = createMockImageFile();
      const formData = createFormDataWithFile(file);

      const uploadReq = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
        method: "POST",
        body: formData,
      });

      const uploadRes = await app.fetch(uploadReq);
      assertEquals(uploadRes.status, 401);

      const galleryReq = new Request(`http://localhost/gallery/${TEST_GALLERY}`);
      const galleryRes = await app.fetch(galleryReq);
      assertEquals(galleryRes.status, 404);
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});

Deno.test({
  name: "Integration: different galleries are isolated",
  async fn() {
    const { app, token } = await createFullTestApp();
    const gallery1 = "gallery-one";
    const gallery2 = "gallery-two";

    try {
      const file1 = createMockImageFile("file1.jpg");
      const formData1 = createFormDataWithFile(file1);
      const upload1Req = new Request(`http://localhost/api/upload/${gallery1}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData1,
      });
      const upload1Res = await app.fetch(upload1Req);
      const upload1Json = await upload1Res.json();
      const filename1 = upload1Json.filename;

      const file2 = createMockImageFile("file2.jpg");
      const formData2 = createFormDataWithFile(file2);
      const upload2Req = new Request(`http://localhost/api/upload/${gallery2}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData2,
      });
      const upload2Res = await app.fetch(upload2Req);
      const upload2Json = await upload2Res.json();
      const filename2 = upload2Json.filename;

      const crossAccessReq = new Request(`http://localhost/img/${gallery1}/${filename2}`);
      const crossAccessRes = await app.fetch(crossAccessReq);
      assertEquals(crossAccessRes.status, 404);

      const crossAccessReq2 = new Request(`http://localhost/img/${gallery2}/${filename1}`);
      const crossAccessRes2 = await app.fetch(crossAccessReq2);
      assertEquals(crossAccessRes2.status, 404);

      const gallery1FileReq = new Request(`http://localhost/img/${gallery1}/${filename1}`);
      const gallery1FileRes = await app.fetch(gallery1FileReq);
      assertEquals(gallery1FileRes.status, 200);

      const gallery2FileReq = new Request(`http://localhost/img/${gallery2}/${filename2}`);
      const gallery2FileRes = await app.fetch(gallery2FileReq);
      assertEquals(gallery2FileRes.status, 200);
    } finally {
      await cleanupTestData(gallery1);
      await cleanupTestData(gallery2);
    }
  },
});

Deno.test({
  name: "Integration: path traversal blocked across all endpoints",
  async fn() {
    const { app, token } = await createFullTestApp();

    const maliciousGalleryIds = [
      "../etc",
      "../../config",
      "test/../../../etc",
    ];

    for (const galleryId of maliciousGalleryIds) {
      const file = createMockImageFile();
      const formData = createFormDataWithFile(file);
      const uploadReq = new Request(
        `http://localhost/api/upload/${encodeURIComponent(galleryId)}`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        },
      );
      const uploadRes = await app.fetch(uploadReq);
      assertEquals(uploadRes.status, 400, `Upload should reject: ${galleryId}`);

      const galleryReq = new Request(
        `http://localhost/gallery/${encodeURIComponent(galleryId)}`,
      );
      const galleryRes = await app.fetch(galleryReq);
      assertEquals(galleryRes.status, 404, `Gallery should reject: ${galleryId}`);

      const imageReq = new Request(
        `http://localhost/img/${encodeURIComponent(galleryId)}/test.jpg`,
      );
      const imageRes = await app.fetch(imageReq);
      assertEquals(imageRes.status, 404, `Image should reject: ${galleryId}`);
    }
  },
});

Deno.test({
  name: "Integration: upload different media types and retrieve them",
  async fn() {
    const { app, token } = await createFullTestApp();

    const fileTypes = [
      { type: "image/jpeg", ext: "jpg" },
      { type: "image/png", ext: "png" },
      { type: "image/webp", ext: "webp" },
      { type: "video/mp4", ext: "mp4" },
    ];

    try {
      for (const { type, ext } of fileTypes) {
        const file = createMockImageFile(`test.${ext}`, 1024, type);
        const formData = createFormDataWithFile(file);

        const uploadReq = new Request(`http://localhost/api/upload/${TEST_GALLERY}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        });

        const uploadRes = await app.fetch(uploadReq);
        assertEquals(uploadRes.status, 201, `Failed to upload ${type}`);

        const uploadJson = await uploadRes.json();
        assertExists(uploadJson.filename);

        const imageReq = new Request(
          `http://localhost/img/${TEST_GALLERY}/${uploadJson.filename}`,
        );
        const imageRes = await app.fetch(imageReq);
        assertEquals(imageRes.status, 200, `Failed to download ${type}`);
      }

      const metadataPath = `./data/${TEST_GALLERY}/metadata.json`;
      const metadataContent = await Deno.readTextFile(metadataPath);
      const metadata = JSON.parse(metadataContent);
      assertEquals(metadata.uploadedFiles, fileTypes.length);
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});
