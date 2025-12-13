/**
 * Image serving tests
 * Tests the public API for serving images via /img/:galleryId/:filename endpoint
 */

import { assertEquals, assertExists } from "@std/assert";
import { Hono } from "hono";
import { setupImageRoutes } from "../src/routes/images.ts";
import {
  cleanupTestData,
  createTestGallery,
} from "./test_helpers.ts";

const TEST_GALLERY = "test-image-gallery";

function createTestApp() {
  const app = new Hono();
  setupImageRoutes(app);
  return app;
}

Deno.test({
  name: "Images: serve existing image with correct headers",
  async fn() {
    const app = createTestApp();

    try {
      const filenames = await createTestGallery(TEST_GALLERY, 1);
      const filename = filenames[0];

      const req = new Request(`http://localhost/img/${TEST_GALLERY}/${filename}`);
      const res = await app.fetch(req);

      assertEquals(res.status, 200);
      assertEquals(res.headers.get("content-type"), "image/jpeg");
      assertExists(res.headers.get("cache-control"));
      assertExists(res.headers.get("content-disposition"));

      const arrayBuffer = await res.arrayBuffer();
      const imageData = new Uint8Array(arrayBuffer);
      assertEquals(imageData.length > 0, true);
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});

Deno.test({
  name: "Images: return 404 for non-existent image",
  async fn() {
    const app = createTestApp();

    try {
      await createTestGallery(TEST_GALLERY, 1);

      const req = new Request(`http://localhost/img/${TEST_GALLERY}/nonexistent.jpg`);
      const res = await app.fetch(req);

      assertEquals(res.status, 404);
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});

Deno.test({
  name: "Images: return 404 for non-existent gallery",
  async fn() {
    const app = createTestApp();

    const req = new Request(`http://localhost/img/non-existent-gallery/image.jpg`);
    const res = await app.fetch(req);

    assertEquals(res.status, 404);
  },
});

Deno.test({
  name: "Images: reject path traversal attempts",
  async fn() {
    const app = createTestApp();

    try {
      await createTestGallery(TEST_GALLERY, 1);

      const maliciousPaths = [
        { galleryId: "../etc", filename: "passwd" },
        { galleryId: TEST_GALLERY, filename: "../../secret.txt" },
        { galleryId: "gallery/../../../etc", filename: "test.jpg" },
        { galleryId: TEST_GALLERY, filename: "..\\..\\windows" },
      ];

      for (const { galleryId, filename } of maliciousPaths) {
        const req = new Request(
          `http://localhost/img/${encodeURIComponent(galleryId)}/${encodeURIComponent(filename)}`,
        );
        const res = await app.fetch(req);

        assertEquals(
          res.status,
          404,
          `Expected 404 for galleryId="${galleryId}" filename="${filename}"`,
        );
      }
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});

Deno.test({
  name: "Images: set cache and content-disposition headers",
  async fn() {
    const app = createTestApp();

    try {
      const filenames = await createTestGallery(TEST_GALLERY, 1);
      const filename = filenames[0];

      const req = new Request(`http://localhost/img/${TEST_GALLERY}/${filename}`);
      const res = await app.fetch(req);

      const cacheControl = res.headers.get("cache-control");
      assertExists(cacheControl);
      assertEquals(cacheControl?.includes("immutable"), true);
      assertEquals(cacheControl?.includes("max-age"), true);

      const contentDisposition = res.headers.get("content-disposition");
      assertExists(contentDisposition);
      assertEquals(contentDisposition?.includes("inline"), true);
      assertEquals(contentDisposition?.includes("filename="), true);
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});

Deno.test({
  name: "Images: serve multiple images from same gallery",
  async fn() {
    const app = createTestApp();

    try {
      const filenames = await createTestGallery(TEST_GALLERY, 3);

      for (const filename of filenames) {
        const req = new Request(`http://localhost/img/${TEST_GALLERY}/${filename}`);
        const res = await app.fetch(req);

        assertEquals(res.status, 200, `Failed to serve ${filename}`);
        assertEquals(res.headers.get("content-type"), "image/jpeg");
      }
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});

Deno.test({
  name: "Images: images from different galleries are isolated",
  async fn() {
    const app = createTestApp();
    const gallery1 = "gallery-one";
    const gallery2 = "gallery-two";

    try {
      const files1 = await createTestGallery(gallery1, 1);
      const files2 = await createTestGallery(gallery2, 1);

      const req = new Request(`http://localhost/img/${gallery1}/${files2[0]}`);
      const res = await app.fetch(req);

      assertEquals(res.status, 404);
    } finally {
      await cleanupTestData(gallery1);
      await cleanupTestData(gallery2);
    }
  },
});

Deno.test({
  name: "Images: handle missing metadata gracefully",
  async fn() {
    const app = createTestApp();
    const galleryKey = "no-metadata-gallery";

    try {
      await Deno.mkdir(`./data/${galleryKey}`, { recursive: true });
      const testImage = new Uint8Array(1024);
      await Deno.writeFile(`./data/${galleryKey}/test.jpg`, testImage);

      const req = new Request(`http://localhost/img/${galleryKey}/test.jpg`);
      const res = await app.fetch(req);

      assertEquals(res.status, 200);
      assertEquals(res.headers.get("content-type"), "image/jpeg");
    } finally {
      await cleanupTestData(galleryKey);
    }
  },
});
