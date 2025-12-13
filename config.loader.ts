/**
 * Configuration Loader
 *
 * Loads and merges user configuration with default configuration.
 * Supports loading from default location or custom path.
 */

import { defaultConfig } from "./config.default.ts";
import type { FotostandConfig } from "./config.ts";

/**
 * Deep merge utility for configuration objects
 * Recursively merges source into target, with source taking precedence
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (sourceValue === undefined) {
        continue;
      }

      // If both are objects (and not null/array), recurse
      if (
        typeof sourceValue === "object" &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === "object" &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        // Otherwise, use source value
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Load configuration from user config file or use defaults
 *
 * @param configPath - Optional path to custom config file
 * @returns Merged configuration object
 */
export async function loadConfig(configPath?: string): Promise<FotostandConfig> {
  if (configPath) {
    // Load from specified path
    try {
      const userConfigModule = await import(configPath);
      const userConfig: Partial<FotostandConfig> = userConfigModule.config ||
        userConfigModule.default;
      return deepMerge(defaultConfig, userConfig);
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error);
      console.log("Falling back to default configuration");
      return defaultConfig;
    }
  }

  // Try to load from default location (config.user.ts)
  try {
    const userConfigModule = await import("./config.user.ts");
    const userConfig: Partial<FotostandConfig> = userConfigModule.config ||
      userConfigModule.default;
    return deepMerge(defaultConfig, userConfig);
  } catch {
    // No user config found, use defaults (this is normal)
    return defaultConfig;
  }
}
