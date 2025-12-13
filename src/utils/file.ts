/**
 * Generates a unique filename with timestamp and random suffix
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const extension = originalFilename.split(".").pop() || "jpg";
  return `${timestamp}_${randomSuffix}.${extension}`;
}

/**
 * Generates a renamed filename based on event metadata
 * Format: EventTitle_YYYYMMDD_HHMMSS.extension
 */
export function generateRenamedFilename(
  eventTitle: string,
  timestamp: Date,
  extension: string,
): string {
  // Format timestamp as YYYYMMDD_HHMMSS
  const dateStr = timestamp.toISOString()
    .replace(/[-:]/g, "") // Remove dashes and colons
    .replace(/\..+/, "") // Remove milliseconds and timezone
    .replace("T", "_"); // Replace T with underscore

  // Clean event title for filename (remove spaces, special chars)
  const cleanEventTitle = eventTitle
    .replace(/\s+/g, "") // Remove spaces
    .replace(/[^a-zA-Z0-9]/g, ""); // Remove special characters

  return `${cleanEventTitle}_${dateStr}.${extension}`;
}
