/**
 * i18n Middleware Configuration
 */
import { defineI18nMiddleware, detectLocaleFromAcceptLanguageHeader } from "@intlify/hono";
import de from "../locales/de.ts";
import en from "../locales/en.ts";

export type ResourceSchema = typeof de;

// Define i18n middleware factory
export const createI18nMiddleware = (locale: string) => {
  return defineI18nMiddleware<[ResourceSchema], "en" | "de">({
    locale: detectLocaleFromAcceptLanguageHeader,
    messages: {
      de,
      en,
    },
  });
};

// Re-export useTranslation for convenience
export { useTranslation } from "@intlify/hono";
