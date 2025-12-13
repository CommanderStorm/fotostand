/**
 * i18n Middleware Configuration
 */
import { defineI18nMiddleware, detectLocaleFromAcceptLanguageHeader } from "@intlify/hono";
import de from "../locales/de.ts";
import en from "../locales/en.ts";
import type { ResourceSchema } from "../locales/index.ts";

// Define i18n middleware factory
export const intlify = defineI18nMiddleware<[ResourceSchema], "en" | "de">({
  locale: detectLocaleFromAcceptLanguageHeader,
  messages: {
    de,
    en,
  },
});
