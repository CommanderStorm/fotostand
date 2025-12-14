import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";
import type { Context } from "hono";
import { useTranslation } from "@intlify/hono";
import type { ResourceSchema } from "../locales/index.ts";

export const Layout: FC<{ config: Config; c: Context; children?: any }> = (props) => {
  const t = useTranslation<ResourceSchema>(props.c);

  const themeVars = [
    `--theme-bg: ${props.config.theme.backgroundColor}`,
    `--theme-text: ${props.config.theme.textColor}`,
    `--theme-primary: ${props.config.theme.primaryColor}`,
  ].join("; ");

  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/static/output.css" />
        <title>{props.config.event.title}</title>
      </head>
      <body
        style={`${themeVars}; background-color: var(--theme-bg); color: var(--theme-text); padding-bottom: 4rem;`}
      >
        {props.children}
        <footer class="fixed z-20 bottom-0 w-full py-4 text-center font-bold text-sm uppercase opacity-90 bg-[color:var(--theme-bg)]/85">
          <a
            href={props.config.footer.dataProtectionUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline mx-2 text-[color:var(--theme-text)]"
          >
            {t("footer.dataProtection")}
          </a>
          <span>|</span>
          <a
            href={props.config.footer.imprintUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline mx-2 text-[color:var(--theme-text)]"
          >
            {t("footer.imprint")}
          </a>
        </footer>
      </body>
    </html>
  );
};
