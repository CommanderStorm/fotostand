/**
 * Fotostand Configuration Type and Schema
 */

import { z } from "zod";

// Define the Zod schema that parses TOML (snake_case) and transforms to camelCase
export const ConfigSchema = z.object({
  event: z.object({
    title: z.string().min(1, "Event title cannot be empty"),
    subtitle: z.string().optional(),
  }),

  theme: z.object({
    background_color: z.string().regex(
      /^#[0-9a-fA-F]{6}$/,
      "Must be a 6-digit hex color (e.g., #041429)",
    ),
    primary_color: z.string().regex(
      /^#[0-9a-fA-F]{6}$/,
      "Must be a 6-digit hex color (e.g., #6366f1)",
    ),
    text_color: z.string().regex(
      /^#[0-9a-fA-F]{6}$/,
      "Must be a 6-digit hex color (e.g., #ffffff)",
    ),
  }).transform((theme) => ({
    backgroundColor: theme.background_color,
    primaryColor: theme.primary_color,
    textColor: theme.text_color,
  })),

  server: z.object({
    port: z.number().int().min(1).max(65535, "Port must be between 1 and 65535"),
    upload_token_hash: z.string().regex(
      /^[a-fA-F0-9]{64}$/,
      "Must be a 64-character SHA-256 hex hash",
    ).optional(),
  }).transform((server) => ({
    port: server.port,
    uploadTokenHash: server.upload_token_hash,
  })),

  footer: z.object({
    data_protection_url: z.string().url("Must be a valid URL"),
    imprint_url: z.string().url("Must be a valid URL"),
  }).transform((footer) => ({
    dataProtectionUrl: footer.data_protection_url,
    imprintUrl: footer.imprint_url,
  })),
});

// Single Config type - inferred from the schema after transformation
export type Config = z.infer<typeof ConfigSchema>;
