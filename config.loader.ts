/**
 * Configuration Loader - Loads config from config.toml
 */

import { parse } from "@std/toml";
import type { Config } from "./config.ts";

/**
 * Load configuration from config.toml file
 */
export async function loadConfig(): Promise<Config> {
  try {
    const configText = await Deno.readTextFile("./config.toml");
    const rawConfig = parse(configText) as any;

    // Transform snake_case TOML keys to camelCase TypeScript keys
    const config: Config = {
      event: {
        title: rawConfig.event.title,
        subtitle: rawConfig.event.subtitle,
      },
      theme: {
        backgroundColor: rawConfig.theme.background_color,
        primaryColor: rawConfig.theme.primary_color,
        textColor: rawConfig.theme.text_color,
      },
      server: {
        port: rawConfig.server.port || 8080,
        uploadTokenHash: rawConfig.server.upload_token_hash,
      },
      ui: {
        language: rawConfig.ui.language || "de",
        labels: {
          codeInputLabel: rawConfig.ui.labels.code_input_label || "Code",
          submitButton: rawConfig.ui.labels.submit_button || "Fotos abrufen",
          notFoundTitle: rawConfig.ui.labels.not_found_title || "Nicht gefunden!",
          notFoundMessage: rawConfig.ui.labels.not_found_message ||
            "Keine Sorge! Deine Bilder werden möglicherweise noch hochgeladen.",
        },
      },
    };

    return config;
  } catch (error) {
    console.error("Failed to load config.toml:", error);
    throw new Error("Configuration file could not be loaded. Please ensure config.toml exists.");
  }
}
