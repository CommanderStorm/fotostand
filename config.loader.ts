/**
 * Configuration Loader - Loads and validates config from config.toml
 */

import { parse } from "@std/toml";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import type { Config } from "./config.ts";

// Define the Zod schema that matches our Config type
const ConfigSchema = z.object({
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
  }),

  server: z.object({
    port: z.number().int().min(1).max(65535, "Port must be between 1 and 65535"),
    upload_token_hash: z.string().regex(
      /^[a-fA-F0-9]{64}$/,
      "Must be a 64-character SHA-256 hex hash",
    ).optional(),
  }),

  footer: z.object({
    data_protection_url: z.string().url("Must be a valid URL"),
    imprint_url: z.string().url("Must be a valid URL"),
  }),

  ui: z.object({
    language: z.enum(["de", "en"], {
      errorMap: () => ({ message: "Language must be 'de' or 'en'" }),
    }),
    labels: z.object({
      code_input_label: z.string().min(1),
      submit_button: z.string().min(1),
      not_found_title: z.string().min(1),
      not_found_message: z.string().min(1),
    }),
  }),
});

/**
 * Load and validate configuration from config.toml file
 */
export async function loadConfig(): Promise<Config> {
  try {
    const configText = await Deno.readTextFile("./config.toml");
    const rawConfig = parse(configText);

    // Validate with Zod
    const validatedConfig = ConfigSchema.parse(rawConfig);

    // Transform snake_case TOML keys to camelCase TypeScript keys
    const config: Config = {
      event: {
        title: validatedConfig.event.title,
        subtitle: validatedConfig.event.subtitle,
      },
      theme: {
        backgroundColor: validatedConfig.theme.background_color,
        primaryColor: validatedConfig.theme.primary_color,
        textColor: validatedConfig.theme.text_color,
      },
      server: {
        port: validatedConfig.server.port,
        uploadTokenHash: validatedConfig.server.upload_token_hash,
      },
      footer: {
        dataProtectionUrl: validatedConfig.footer.data_protection_url,
        imprintUrl: validatedConfig.footer.imprint_url,
      },
      ui: {
        language: validatedConfig.ui.language,
        labels: {
          codeInputLabel: validatedConfig.ui.labels.code_input_label,
          submitButton: validatedConfig.ui.labels.submit_button,
          notFoundTitle: validatedConfig.ui.labels.not_found_title,
          notFoundMessage: validatedConfig.ui.labels.not_found_message,
        },
      },
    };

    return config;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error("Error: config.toml not found");
      throw new Error("Configuration file not found. Please create config.toml");
    } else if (error instanceof SyntaxError) {
      console.error("Error: Invalid TOML syntax");
      console.error(error.message);
      throw new Error("Configuration file has invalid TOML syntax");
    } else if (error instanceof z.ZodError) {
      console.error("Error: Configuration validation failed");
      console.error("\nValidation errors:");
      for (const issue of error.issues) {
        console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
      }
      throw new Error("Configuration validation failed. Please fix the errors above.");
    } else {
      console.error("Error loading configuration:", error);
      throw error;
    }
  }
}
