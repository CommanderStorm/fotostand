/**
 * Image serving tests
 * Tests the public API for serving images via /img/:galleryId/:filename endpoint
 */

import { assertEquals, assertExists } from "@std/assert";
import { Hono } from "hono";
import { setupImageRoutes } from "../src/routes/images.ts";
import { createMockConfig, createTempDataDir, createTestGallery } from "./test_helpers.ts";

const TEST_GALLERY = "test-image-gallery";

function createTestApp(dataDir: string) {
  const app = new Hono();
  const config = createMockConfig(undefined, dataDir);
  setupImageRoutes(app, config);
  return app;
}

async function readAllBytes(body: ReadableStream<Uint8Array> | null): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function parseTarFilenames(tarBytes: Uint8Array): string[] {
  const names: string[] = [];
  const decoder = new TextDecoder();

  // TAR is 512-byte blocks. Each file starts with a 512-byte header.
  // Name is bytes [0..100), null-terminated.
  // Size (octal) is bytes [124..136), null/space padded.
  let offset = 0;

  while (offset + 512 <= tarBytes.length) {
    const header = tarBytes.subarray(offset, offset + 512);

    // End-of-archive: two consecutive 512-byte zero blocks. We'll stop on the first all-zero header.
    let allZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero) break;

    const nameRaw = header.subarray(0, 100);
    const name = decoder.decode(nameRaw).replace(/\0.*$/, "").trim();

    const sizeRaw = header.subarray(124, 136);
    const sizeStr = decoder.decode(sizeRaw).replace(/\0.*$/, "").trim();
    const size = sizeStr.length ? parseInt(sizeStr, 8) : 0;

    if (name.length > 0) names.push(name);

    // Move to file data (immediately after header), then skip padded size to 512-byte boundary.
    offset += 512;
    const paddedSize = Math.ceil(size / 512) * 512;
    offset += paddedSize;
  }

  return names;
}

Deno.test({
  name: "Images: serve existing image with correct headers",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);

    try {
      const filenames = await createTestGallery(dataDir, TEST_GALLERY, 1);
      const filename = filenames[0];

      const expectedFilePath = `${dataDir}/${TEST_GALLERY}/${filename}`;
      const stat = await Deno.stat(expectedFilePath);
      assertEquals(stat.isFile, true);

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
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: return 404 for non-existent image",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);

    try {
      await createTestGallery(dataDir, TEST_GALLERY, 1);

      const req = new Request(`http://localhost/img/${TEST_GALLERY}/nonexistent.jpg`);
      const res = await app.fetch(req);

      assertEquals(res.status, 404);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: return 404 for non-existent gallery",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);

    try {
      const req = new Request(`http://localhost/img/non-existent-gallery/image.jpg`);
      const res = await app.fetch(req);

      assertEquals(res.status, 404);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: reject path traversal attempts",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);

    try {
      await createTestGallery(dataDir, TEST_GALLERY, 1);

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
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: set cache and content-disposition headers",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);

    try {
      const filenames = await createTestGallery(dataDir, TEST_GALLERY, 1);
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
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: serve multiple images from same gallery",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);

    try {
      const filenames = await createTestGallery(dataDir, TEST_GALLERY, 3);

      for (const filename of filenames) {
        const req = new Request(`http://localhost/img/${TEST_GALLERY}/${filename}`);
        const res = await app.fetch(req);

        assertEquals(res.status, 200, `Failed to serve ${filename}`);
        assertEquals(res.headers.get("content-type"), "image/jpeg");
      }
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: images from different galleries are isolated",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);
    const gallery1 = "gallery-one";
    const gallery2 = "gallery-two";

    try {
      const files1 = await createTestGallery(dataDir, gallery1, 1);
      const files2 = await createTestGallery(dataDir, gallery2, 1);

      const req1 = new Request(`http://localhost/img/${gallery1}/${files2[0]}`);
      const req2 = new Request(`http://localhost/img/${gallery2}/${files1[0]}`);
      const [res1, res2] = await Promise.all([app.fetch(req1), app.fetch(req2)]);

      assertEquals(res1.status, 404);
      assertEquals(res2.status, 404);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: handle missing metadata gracefully",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);
    const galleryKey = "no-metadata-gallery";

    try {
      await Deno.mkdir(`${dataDir}/${galleryKey}`, { recursive: true });
      const testImage = new Uint8Array(1024);
      await Deno.writeFile(`${dataDir}/${galleryKey}/test.jpg`, testImage);

      const req = new Request(`http://localhost/img/${galleryKey}/test.jpg`);
      const res = await app.fetch(req);

      assertEquals(res.status, 200);
      assertEquals(res.headers.get("content-type"), "image/jpeg");
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: download-all.tar returns tar archive containing all images with original filenames",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);

    try {
      const filenames = await createTestGallery(dataDir, TEST_GALLERY, 3);

      const req = new Request(`http://localhost/img/${TEST_GALLERY}/download-all.tar`);
      const res = await app.fetch(req);

      assertEquals(res.status, 200);
      assertEquals(res.headers.get("content-type"), "application/x-tar");
      assertExists(res.headers.get("content-disposition"));

      const tarBytes = await readAllBytes(res.body);
      assertEquals(tarBytes.length > 0, true);

      const tarNames = parseTarFilenames(tarBytes);

      // Ensure every created image filename is present in the tar
      for (const filename of filenames) {
        assertEquals(
          tarNames.includes(filename),
          true,
          `Expected tar to contain "${filename}", got: ${tarNames.join(", ")}`,
        );
      }
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: download-all.tar returns 404 for non-existent gallery",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);

    try {
      const req = new Request(`http://localhost/img/non-existent-gallery/download-all.tar`);
      const res = await app.fetch(req);

      assertEquals(res.status, 404);
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "Images: download-all.tar rejects path traversal attempts",
  async fn() {
    const dataDir = await createTempDataDir("fotostand-images-test-");
    const app = createTestApp(dataDir);

    try {
      await createTestGallery(dataDir, TEST_GALLERY, 1);

      const maliciousGalleryIds = ["../etc", "gallery/../../../etc", "..\\..\\windows"];

      for (const galleryId of maliciousGalleryIds) {
        const req = new Request(
          `http://localhost/img/${encodeURIComponent(galleryId)}/download-all.tar`,
        );
        const res = await app.fetch(req);
        assertEquals(res.status, 404, `Expected 404 for galleryId="${galleryId}"`);
      }
    } finally {
      await Deno.remove(dataDir, { recursive: true });
    }
  },
});
