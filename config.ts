/**
 * Fotostand Configuration Interface
 *
 * This file defines the TypeScript interface for the photo booth configuration.
 * Use this to ensure type safety when creating custom event configurations.
 */

export interface FotostandConfig {
  /**
   * Event information displayed in the UI
   */
  event: {
    /** Event name displayed on web pages and receipts */
    title: string;
    /** Optional subtitle displayed below the title */
    subtitle?: string;
  };

  /**
   * Theme and color customization
   */
  theme: {
    /** Hex color for body background (e.g., "#041429") */
    backgroundColor: string;
    /** Primary accent color for buttons and interactive elements (e.g., "#6366f1") */
    primaryColor: string;
    /** Main text color (e.g., "#ffffff") */
    textColor: string;
  };

  /**
   * Branding assets
   */
  branding: {
    /** Path to logo image file for receipts (optional) */
    logoPath?: string;
    /** Alt text for logo image */
    logoAlt?: string;
  };

  /**
   * Server configuration
   */
  server: {
    /** Base URL for gallery access (e.g., "https://event.example.com" or "http://localhost:8080") */
    baseUrl: string;
    /** Server port (defaults to 8080 if not specified) */
    port?: number;
    /** 
     * SHA-256 hash of the upload bearer token (in hex format). Required for file uploads. 
     * Generate token with: openssl rand -hex 64, then hash with: echo -n "token" | openssl dgst -sha256 
     * */
    uploadTokenHash?: string;
  };

  /**
   * Client behavior configuration
   */
  client: {
    /**
     * ID generation mode:
     * - 'auto': Always generate three-word codes
     * - 'manual': Always require external ID via --id flag
     * - 'hybrid': Support both (default to auto if no --id provided)
     */
    idMode: 'auto' | 'manual' | 'hybrid';
  };

  /**
   * Thermal printer configuration (optional)
   */
  printer?: {
    /** Whether thermal printer is enabled */
    enabled: boolean;
    /** Printer type */
    type: 'EPSON' | 'STAR';
    /** COM port or network interface path (e.g., "\\.\COM1") */
    interface: string;
    /** Whether to print QR code on receipt */
    includeQR: boolean;
  };

  /**
   * UI text and labels
   */
  ui: {
    /** UI language */
    language: 'de' | 'en';
    /** Customizable UI labels and messages */
    labels: {
      /** Label for code input field (default: "Code") */
      codeInputLabel?: string;
      /** Submit button text (default: "Fotos abrufen") */
      submitButton?: string;
      /** Error page title when gallery not found (default: "Nicht gefunden!") */
      notFoundTitle?: string;
      /** Error page message (default: German waiting message) */
      notFoundMessage?: string;
    };
  };
}
