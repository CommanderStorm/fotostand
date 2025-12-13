/**
 * Security utility tests
 * Tests the public API for security validation functions
 */

import { assertEquals } from "@std/assert";
import { isValidPath, verifyUploadToken } from "../src/utils/security.ts";
import { generateTestToken } from "./test_helpers.ts";

Deno.test({
  name: "Security: isValidPath accepts valid paths",
  fn() {
    const validPaths = [
      "simple",
      "with-dashes",
      "with_underscores",
      "AlphaNumeric123",
      "happy-blue-sky-2024",
      "my-gallery",
      "test.jpg",
      ".hidden",
    ];

    for (const path of validPaths) {
      assertEquals(
        isValidPath(path),
        true,
        `Expected "${path}" to be valid`,
      );
    }
  },
});

Deno.test({
  name: "Security: isValidPath rejects path traversal patterns",
  fn() {
    const maliciousPaths = [
      "..",
      "../",
      "test/../etc",
      "../../../etc/passwd",
      "gallery/../../../sensitive",
      "..test",
      "test..",
      "te..st",
    ];

    for (const path of maliciousPaths) {
      assertEquals(
        isValidPath(path),
        false,
        `Expected "${path}" to be invalid`,
      );
    }
  },
});

Deno.test({
  name: "Security: isValidPath rejects paths with slashes",
  fn() {
    const pathsWithSlashes = [
      "/",
      "/etc/passwd",
      "test/subdir",
      "gallery/images",
      "./test",
      "\\",
      "test\\subdir",
      "C:\\Windows",
      "..\\etc",
    ];

    for (const path of pathsWithSlashes) {
      assertEquals(
        isValidPath(path),
        false,
        `Expected "${path}" to be invalid`,
      );
    }
  },
});

Deno.test({
  name: "Security: verifyUploadToken accepts valid token",
  async fn() {
    const { token, hash } = await generateTestToken();
    const result = await verifyUploadToken(token, hash);
    assertEquals(result, true);
  },
});

Deno.test({
  name: "Security: verifyUploadToken rejects invalid token",
  async fn() {
    const { hash } = await generateTestToken();
    const wrongToken = "wrong-token-completely-different";
    const result = await verifyUploadToken(wrongToken, hash);
    assertEquals(result, false);
  },
});

Deno.test({
  name: "Security: verifyUploadToken rejects empty token",
  async fn() {
    const { hash } = await generateTestToken();
    const result = await verifyUploadToken("", hash);
    assertEquals(result, false);
  },
});

Deno.test({
  name: "Security: verifyUploadToken handles malformed hash",
  async fn() {
    const token = "test-token";
    const malformedHashes = [
      "not-a-hex-hash",
      "12345",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
      "",
      "g123456789abcdef",
    ];

    for (const hash of malformedHashes) {
      const result = await verifyUploadToken(token, hash);
      assertEquals(
        result,
        false,
        `Expected malformed hash "${hash}" to fail verification`,
      );
    }
  },
});

Deno.test({
  name: "Security: verifyUploadToken is case-insensitive for hash",
  async fn() {
    const { token, hash } = await generateTestToken();
    const uppercaseHash = hash.toUpperCase();
    const lowercaseHash = hash.toLowerCase();

    const resultLower = await verifyUploadToken(token, lowercaseHash);
    const resultUpper = await verifyUploadToken(token, uppercaseHash);

    assertEquals(resultLower, true);
    assertEquals(resultUpper, true);
  },
});

Deno.test({
  name: "Security: different tokens have different hashes",
  async fn() {
    const { token: token1, hash: hash1 } = await generateTestToken();
    const { token: token2, hash: hash2 } = await generateTestToken();

    assertEquals(await verifyUploadToken(token1, hash1), true);
    assertEquals(await verifyUploadToken(token2, hash2), true);
    assertEquals(await verifyUploadToken(token1, hash2), false);
    assertEquals(await verifyUploadToken(token2, hash1), false);
  },
});
