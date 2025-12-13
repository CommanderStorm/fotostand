/**
 * Gallery functionality tests
 * Tests the public API for viewing galleries via /gallery/:key endpoint
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "hono";
import { setupGalleryRoutes } from "../src/routes/gallery.tsx";
import { intlify } from "../src/middleware/i18n.ts";
import {
  cleanupTestData,
  createMockConfig,
  createTestGallery,
} from "./test_helpers.ts";

const TEST_GALLERY = "test-gallery-view";

function createTestApp() {
  const app = new Hono();
  const config = createMockConfig();
  app.use("*", intlify);
  setupGalleryRoutes(app, config);
  return app;
}

Deno.test({
  name: "Gallery: view existing gallery returns 200 with HTML",
  async fn() {
    const app = createTestApp();

    try {
      await createTestGallery(TEST_GALLERY, 3);

      const req = new Request(`http://localhost/gallery/${TEST_GALLERY}`);
      const res = await app.fetch(req);

      assertEquals(res.status, 200);

      const contentType = res.headers.get("content-type");
      assertStringIncludes(contentType || "", "text/html");

      const html = await res.text();
      assertStringIncludes(html, TEST_GALLERY);
      assertStringIncludes(html, "<html>");
    } finally {
      await cleanupTestData(TEST_GALLERY);
    }
  },
});

Deno.test({
  name: "Gallery: view non-existent gallery returns 404",
  async fn() {
    const app = createTestApp();

    const req = new Request(`http://localhost/gallery/non-existent-gallery`);
    const res = await app.fetch(req);

    assertEquals(res.status, 404);
  },
});

Deno.test({
  name: "Gallery: reject path traversal attempts",
  async fn() {
    const app = createTestApp();

    const maliciousKeys = [
      "../etc/passwd",
      "gallery/../../../etc",
      "test/subdir",
      "test\\windows\\path",
      "..\\windows",
    ];

    for (const key of maliciousKeys) {
      const req = new Request(`http://localhost/gallery/${encodeURIComponent(key)}`);
      const res = await app.fetch(req);

      assertEquals(
        res.status,
        404,
        `Expected 404 for malicious key: ${key}`,
      );
    }
  },
});

Deno.test({
  name: "Gallery: empty gallery loads successfully",
  async fn() {
    const app = createTestApp();
    const emptyGallery = "empty-test-gallery";

    try {
      await Deno.mkdir(`./data/${emptyGallery}`, { recursive: true });

      const req = new Request(`http://localhost/gallery/${emptyGallery}`);
      const res = await app.fetch(req);

      assertEquals(res.status, 200);

      const html = await res.text();
      assertStringIncludes(html, "<html>");
    } finally {
      await cleanupTestData(emptyGallery);
    }
  },
});

Deno.test({
  name: "Gallery: multiple galleries are independent",
  async fn() {
    const app = createTestApp();
    const gallery1 = "gallery-one";
    const gallery2 = "gallery-two";

    try {
      await createTestGallery(gallery1, 2);
      await createTestGallery(gallery2, 3);

      const req1 = new Request(`http://localhost/gallery/${gallery1}`);
      const res1 = await app.fetch(req1);
      assertEquals(res1.status, 200);

      const req2 = new Request(`http://localhost/gallery/${gallery2}`);
      const res2 = await app.fetch(req2);
      assertEquals(res2.status, 200);

      const html1 = await res1.text();
      const html2 = await res2.text();
      assertEquals(html1 === html2, false);
    } finally {
      await cleanupTestData(gallery1);
      await cleanupTestData(gallery2);
    }
  },
});
