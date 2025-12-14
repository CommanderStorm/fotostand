/**
 * Gallery functionality tests
 * Tests the public API for viewing galleries via /gallery/:key endpoint
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "hono";
import { setupGalleryRoutes } from "../src/routes/gallery.tsx";
import { intlify } from "../src/middleware/i18n.ts";
import { createMockConfig, createTempDataDir, createTestGallery } from "./test_helpers.ts";

const TEST_GALLERY = "test-gallery-view";

function createTestApp(dataDir: string) {
  const app = new Hono();
  const config = createMockConfig(undefined, dataDir);
  app.use("*", intlify);
  setupGalleryRoutes(app, config);
  return app;
}

Deno.test({
  name: "Gallery: view existing gallery returns 200 with HTML",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-gallery-test-");
    const app = createTestApp(dataDir);

    try {
      await createTestGallery(dataDir, TEST_GALLERY, 3);

      const req = new Request(`http://localhost/gallery/${TEST_GALLERY}`);
      const res = await app.fetch(req);

      assertEquals(res.status, 200);

      const contentType = res.headers.get("content-type");
      assertStringIncludes(contentType || "", "text/html");

      const html = await res.text();
      assertStringIncludes(html, TEST_GALLERY);
      assertStringIncludes(html, "<html>");
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Gallery: view non-existent gallery returns 404",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-gallery-test-");
    const app = createTestApp(dataDir);

    try {
      const req = new Request(`http://localhost/gallery/non-existent-gallery`);
      const res = await app.fetch(req);

      assertEquals(res.status, 404);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Gallery: reject path traversal attempts",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-gallery-test-");
    const app = createTestApp(dataDir);

    try {
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
          400,
          `Expected 400 for malicious key: ${key}`,
        );
      }
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Gallery: empty gallery loads successfully",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-gallery-test-");
    const app = createTestApp(dataDir);
    const emptyGallery = "empty-test-gallery";

    try {
      await Deno.mkdir(`${dataDir}/${emptyGallery}`, { recursive: true });

      const req = new Request(`http://localhost/gallery/${emptyGallery}`);
      const res = await app.fetch(req);

      assertEquals(res.status, 200);

      const html = await res.text();
      assertStringIncludes(html, "<html>");
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Gallery: multiple galleries are independent",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-gallery-test-");
    const app = createTestApp(dataDir);
    const gallery1 = "gallery-one";
    const gallery2 = "gallery-two";

    try {
      await createTestGallery(dataDir, gallery1, 2);
      await createTestGallery(dataDir, gallery2, 3);

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
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});
