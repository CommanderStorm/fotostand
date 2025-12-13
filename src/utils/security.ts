import { timingSafeEqual } from "@std/crypto/timing-safe-equal";

/**
 * Helper function for constant-time token comparison to prevent timing attacks
 */
export async function verifyUploadToken(
  providedToken: string,
  storedHash: string,
): Promise<boolean> {
  try {
    // Hash the provided token with SHA-256
    const encoder = new TextEncoder();
    const tokenBuffer = encoder.encode(providedToken);
    const providedHashBuffer = await crypto.subtle.digest("SHA-256", tokenBuffer);

    // Convert stored hex hash to Uint8Array
    const storedHashBuffer = new Uint8Array(
      storedHash.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
    );

    // Both should be 32 bytes (SHA-256 output)
    if (providedHashBuffer.byteLength !== 32 || storedHashBuffer.byteLength !== 32) {
      return false;
    }

    // Use Deno's timing-safe comparison on raw bytes
    return timingSafeEqual(
      new Uint8Array(providedHashBuffer),
      storedHashBuffer,
    );
  } catch (error) {
    console.error("Token verification error:", error);
    return false;
  }
}

/**
 * Helper function to prevent path traversal attacks
 * Rejects paths containing .. or / or \ to prevent directory traversal
 */
export function isValidPath(folder: string): boolean {
  if (folder.includes("..") || folder.includes("/") || folder.includes("\\")) {
    return false;
  }
  return true;
}
