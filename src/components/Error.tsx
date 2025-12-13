import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";
import { Layout } from "./Layout.tsx";

export const Error: FC<{ config: Config }> = (props) => {
  return (
    <Layout config={props.config}>
      <div class="grid h-screen place-items-center">
        <div
          id="form"
          class="m-8 px-8 py-16 flex flex-col text-black bg-white rounded-md gap-5"
        >
          <div class="text-5xl font-bold text-center text-red-500">
            {props.config.ui.labels.notFoundTitle || "Nicht gefunden!"}
          </div>

          <div class="text-xl text-center">
            {props.config.ui.labels.notFoundMessage ||
              "Keine Sorge! Deine Bilder werden möglicherweise noch hochgeladen. Sprich uns sonst gerne in Person am Stand an!"}
          </div>
        </div>
      </div>
    </Layout>
  );
};
