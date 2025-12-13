/**
 * Configuration Loader - Loads and validates config from config.toml
 */

import { parse } from "@std/toml";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { type Config, ConfigSchema } from "./config.ts";

/**
 * Load and validate configuration from config.toml file
 */
export async function loadConfig(): Promise<Config> {
  try {
    const configText = await Deno.readTextFile("./config.toml");
    const rawConfig = parse(configText);

    // Validate and transform with Zod (snake_case → camelCase happens automatically)
    const config = ConfigSchema.parse(rawConfig);

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
