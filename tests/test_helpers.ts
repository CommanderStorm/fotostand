/**
 * Test helper utilities for Fotostand tests
 */
import { encodeHex } from "@std/encoding/hex";

/**
 * Join path segments with a single "/" (sufficient for these tests).
 */
function joinPath(...parts: string[]): string {
  // Preserve absolute paths (e.g. "/tmp/...") by not stripping leading slashes
  // from the first segment. Subsequent segments should not contribute a leading
  // slash.
  const filtered = parts.filter((p) => p.length > 0);
  if (filtered.length === 0) return "";

  const [first, ...rest] = filtered;

  const normalizedFirst = first.replace(/\/+$/g, ""); // keep any leading "/"
  const normalizedRest = rest.map((p) => p.replace(/^\/+/g, "").replace(/\/+$/g, ""));

  return [normalizedFirst, ...normalizedRest].filter((p) => p.length > 0).join("/");
}

/**
 * Create a unique temporary data directory for a single test.
 *
 * Callers should `await Deno.remove(dir, { recursive: true })` in a `finally`.
 */
export async function createTempDataDir(prefix = "fotostand-test-"): Promise<string> {
  return await Deno.makeTempDir({ prefix });
}

/**
 * Generate a test upload token and its hash
 */
export async function generateTestToken(): Promise<{ token: string; hash: string }> {
  const token = "test-token-" + crypto.randomUUID();
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  const hash = encodeHex(new Uint8Array(hashBuffer));
  return { token, hash };
}

/**
 * Create a mock image file for testing
 */
export function createMockImageFile(
  name = "test.jpg",
  size = 1024,
  type = "image/jpeg",
): File {
  const buffer = new Uint8Array(size);
  const blob = new Blob([buffer], { type });
  return new File([blob], name, { type });
}

/**
 * Create a mock config object for testing
 */
export function createMockConfig(uploadTokenHash?: string, dataDir = "./data") {
  return {
    event: {
      title: "Test Event",
      subtitle: "Test Subtitle",
    },
    theme: {
      backgroundColor: "#041429",
      primaryColor: "#6366f1",
      textColor: "#ffffff",
    },
    server: {
      port: 8080,
      uploadTokenHash: uploadTokenHash,
      dataDir,
    },
    footer: {
      dataProtectionUrl: "https://example.com/privacy",
      imprintUrl: "https://example.com/imprint",
    },
  };
}

/**
 * Create a test gallery with some files
 */
export async function createTestGallery(
  dataDir: string,
  galleryId: string,
  fileCount = 3,
): Promise<string[]> {
  const galleryPath = joinPath(dataDir, galleryId);
  await Deno.mkdir(galleryPath, { recursive: true });

  const filenames: string[] = [];
  for (let i = 0; i < fileCount; i++) {
    const filename = `${galleryId}_${i}.jpg`;
    const filePath = joinPath(galleryPath, filename);
    const mockImage = createMockImageFile();
    const buffer = await mockImage.arrayBuffer();
    await Deno.writeFile(filePath, new Uint8Array(buffer));
    filenames.push(filename);
  }

  // Create metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    eventTitle: "Test Event",
    uploadedFiles: fileCount,
  };
  await Deno.writeTextFile(
    joinPath(galleryPath, "metadata.json"),
    JSON.stringify(metadata, null, 2),
  );

  return filenames;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a FormData object with a file for upload testing
 */
export function createFormDataWithFile(file: File): FormData {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

/**
 * Assert that a response is JSON with expected status
 */
export async function assertJsonResponse(
  response: Response,
  expectedStatus: number,
): Promise<any> {
  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. Body: ${body}`,
    );
  }
  return await response.json();
}

/**
 * Assert that a response is HTML with expected status
 */
export async function assertHtmlResponse(
  response: Response,
  expectedStatus: number,
): Promise<string> {
  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. Body: ${body}`,
    );
  }
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("text/html")) {
    throw new Error(`Expected HTML response, got ${contentType}`);
  }
  return await response.text();
}
