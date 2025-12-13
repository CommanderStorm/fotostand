/**
 * Fotostand Configuration Type
 */

export interface Config {
  event: {
    title: string;
    subtitle?: string;
  };

  theme: {
    backgroundColor: string;
    primaryColor: string;
    textColor: string;
  };

  server: {
    port: number;
    uploadTokenHash?: string;
  };

  footer: {
    dataProtectionUrl: string;
    imprintUrl: string;
  };

  ui: {
    language: "de" | "en";
    labels: {
      codeInputLabel: string;
      submitButton: string;
      notFoundTitle: string;
      notFoundMessage: string;
    };
  };
}
