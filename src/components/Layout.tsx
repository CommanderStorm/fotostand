import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";
import type { Context } from "hono";
import { useTranslation } from "@intlify/hono";

export const Layout: FC<{ config: Config; c: Context; children?: any }> = (props) => {
  const t = useTranslation(props.c);
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/static/output.css" />
        <title>{props.config.event.title}</title>
      </head>
      <body
        style={`background-color: ${props.config.theme.backgroundColor}; color: ${props.config.theme.textColor};`}
      >
        {props.children}
        <footer class="fixed bottom-0 w-full py-4 text-center text-sm opacity-70">
          <a
            href={props.config.footer.dataProtectionUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline mx-2"
          >
            {t("footer.dataProtection")}
          </a>
          <span>|</span>
          <a
            href={props.config.footer.imprintUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline mx-2"
          >
            {t("footer.imprint")}
          </a>
        </footer>
      </body>
    </html>
  );
};
