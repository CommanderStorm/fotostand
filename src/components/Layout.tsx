import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";

export const Layout: FC<{ config: Config }> = (props) => {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">
        </script>
        <title>{props.config.event.title}</title>
      </head>
      <body
        style={`background-color: ${props.config.theme.backgroundColor}; color: ${props.config.theme.textColor};`}
      >
        {props.children}
        <footer class="fixed bottom-0 w-full py-4 text-center text-sm opacity-70">
          <a
            href="https://www.sv.tum.de/sv/datenschutz/"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline mx-2"
          >
            Data Protection
          </a>
          <span>|</span>
          <a
            href="https://www.sv.tum.de/sv/impressum/"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline mx-2"
          >
            Imprint
          </a>
        </footer>
      </body>
    </html>
  );
};
