import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";
import type { Context } from "hono";
import { Layout } from "./Layout.tsx";
import { useTranslation } from "@intlify/hono";
import type { ResourceSchema } from "../locales/index.ts";

export const Error: FC<{ config: Config; c: Context }> = (props) => {
  const t = useTranslation<ResourceSchema>(props.c);
  return (
    <Layout config={props.config} c={props.c}>
      <div class="grid h-screen place-items-center">
        <div
          id="form"
          class="m-8 px-8 py-16 flex flex-col text-black bg-white rounded-md gap-5"
        >
          <div class="text-5xl font-bold text-center text-red-500">
            {t("ui.notFoundTitle")}
          </div>

          <div class="text-xl text-center">
            {t("ui.notFoundMessage")}
          </div>
        </div>
      </div>
    </Layout>
  );
};
