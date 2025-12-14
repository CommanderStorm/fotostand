import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";
import type { Context } from "hono";
import { Layout } from "./Layout.tsx";
import { useTranslation } from "@intlify/hono";
import type { ResourceSchema } from "../locales/index.ts";

export const Index: FC<{ config: Config; c: Context }> = (props) => {
  const t = useTranslation<ResourceSchema>(props.c);
  const scriptContent = {
    __html:
      "document.getElementById('form').addEventListener('submit', function (e) { e.preventDefault(); document.location.href = '/gallery/' + document.getElementById('gallery-code').value; });",
  };
  return (
    <Layout config={props.config} c={props.c}>
      <div class="grid h-screen place-items-center">
        <form
          id="form"
          class="p-8 flex flex-col rounded-md gap-5 bg-white text-[color:var(--theme-text)] shadow-md ring-1 ring-black/10"
        >
          <div class="text-5xl font-bold p-8 text-center">
            {props.config.event.title}
          </div>
          {props.config.event.subtitle && (
            <div class="text-xl text-center text-gray-600">
              {props.config.event.subtitle}
            </div>
          )}
          <div class="sm:col-span-3">
            <label
              for="first-name"
              class="block text-sm/6 font-medium text-gray-900"
            >
              {t("ui.codeInputLabel")}
            </label>
            <div class="mt-2">
              <input
                id="gallery-code"
                type="text"
                name="gallery-code"
                class="block w-full rounded-md bg-[color:var(--theme-bg)] px-3 py-1.5 text-base text-[color:var(--theme-text)] outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[color:var(--theme-primary)] sm:text-sm/6"
              />
            </div>
          </div>

          <button
            type="submit"
            id="submit"
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--theme-primary)] disabled:opacity-50 text-white font-medium shadow-md h-9 px-4 py-2 cursor-pointer bg-[color:var(--theme-primary)]"
          >
            {t("ui.submitButton")}
          </button>
          <script dangerouslySetInnerHTML={scriptContent} />
        </form>
      </div>
    </Layout>
  );
};
