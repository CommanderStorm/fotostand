/**
 * i18n Middleware Configuration
 */
import { defineI18nMiddleware } from "@intlify/hono";
import type { Context } from "hono";
import de from "../locales/de.ts";
import en from "../locales/en.ts";

export type ResourceSchema = typeof de;

// Custom locale detector that reads from config
export const createLocaleDetector = (defaultLocale: string) => {
  return (_ctx: Context): string => {
    // For now, we return the locale from config
    // You could extend this to check query params, cookies, headers, etc.
    return defaultLocale;
  };
};

// Define i18n middleware factory
export const createI18nMiddleware = (locale: string) => {
  return defineI18nMiddleware<[ResourceSchema], "en" | "de">({
    locale: createLocaleDetector(locale),
    messages: {
      de,
      en,
    },
  });
};

// Re-export useTranslation for convenience
export { useTranslation } from "@intlify/hono";
