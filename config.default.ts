/**
 * Default Fotostand Configuration
 *
 * This file contains the default configuration used when no user config is provided.
 * These values serve as sensible fallbacks for all configuration options.
 */

import type { FotostandConfig } from "./config.ts";

export const defaultConfig: FotostandConfig = {
  event: {
    title: "Photo Booth",
  },

  theme: {
    backgroundColor: "#041429", // Dark blue
    primaryColor: "#6366f1", // Indigo-500
    textColor: "#ffffff", // White
  },

  branding: {
    // No default logo
  },

  server: {
    port: 8080,
  },

  client: {
    idMode: "hybrid", // Support both auto-generation and external IDs
  },

  printer: {
    enabled: false, // Disabled by default (safer for new deployments)
    type: "EPSON",
    interface: "\\\\.\\COM1",
    includeQR: true,
  },

  ui: {
    language: "de",
    labels: {
      codeInputLabel: "Code",
      submitButton: "Fotos abrufen",
      notFoundTitle: "Nicht gefunden!",
      notFoundMessage:
        "Keine Sorge! Deine Bilder werden möglicherweise noch hochgeladen. Sprich uns sonst gerne in Person am Stand an!",
    },
  },
};
