import type { FotostandConfig } from './config.ts';

export const config: Partial<FotostandConfig> = {
  event: {
    title: "Glühnix 2025",
    // subtitle: "Welcome!"  // Optional subtitle
  },

  theme: {
    backgroundColor: "#e2e8ee",  // Dark blue background
    primaryColor: "#5d869d",     // Indigo buttons
    textColor: "#284a55"         // White text
  },

  branding: {
    logoPath: "./logo.png",
    logoAlt: "Glühnix Logo"  },

  server: {
    baseUrl: "http://localhost:8080",  // Change to your production URL
    port: 8080
  },

  client: {
    idMode: 'hybrid'  // Support both auto-generated and external IDs
  },

  printer: {
    enabled: true,           // Enable thermal printer
    type: 'EPSON',
    interface: '\\\\.\\COM1',  // Windows COM port (use '/dev/ttyUSB0' on Linux)
    includeQR: true          // Print QR code on receipt
  },

  ui: {
    language: 'de',
    labels: {
      // Use defaults or customize:
      // codeInputLabel: 'Your Code',
      // submitButton: 'View Photos',
      // notFoundTitle: 'Not Found!',
      // notFoundMessage: 'Your photos may still be uploading...'
    }
  }
};
