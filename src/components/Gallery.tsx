import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";
import type { Context } from "hono";
import { Layout } from "./Layout.tsx";
import { useTranslation } from "@intlify/hono";
import type { ResourceSchema } from "../locales/index.ts";

export const Gallery: FC<{ folder: string; config: Config; c: Context }> = (props) => {
  const t = useTranslation<ResourceSchema>(props.c);
  const images = [];
  try {
    for (const image of Deno.readDirSync(`./data/${props.folder}`)) {
      // Only include image files, skip metadata.json
      if (image.isFile && image.name !== "metadata.json") {
        images.push(image);
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
    return null; // Return null to indicate error, will be handled by caller
  }

  return (
    <Layout config={props.config} c={props.c}>
      <div class="text-5xl font-bold p-8">{props.config.event.title}</div>
      <div class="p-5 sm:p-8">
        <div class="columns-1 gap-5 sm:columns-2 sm:gap-8 md:columns-3 lg:columns-4 [&>div:not(:first-child)]:mt-8">
          {images.map((image) => {
            const imageUrl = "/img/" + props.folder + "/" + image.name;
            return (
              <div key={image.name} class="relative inline-block w-full group">
                <img
                  class="max-w-full w-auto max-h-full rounded-md shadow-md bg-transparent transition-transform object-scale-down hover:scale-105"
                  src={imageUrl}
                  alt={image.name}
                />
                <div class="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent to-30% opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto rounded-md">
                  <a
                    href={imageUrl}
                    download
                    class="absolute top-3 right-3 bg-white/95 hover:bg-white border-0 rounded-md px-3 py-2 cursor-pointer text-sm font-medium flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all duration-200 text-gray-800 hover:-translate-y-px active:translate-y-0"
                    title={t("ui.downloadImageTitle")}
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    {t("ui.downloadButton")}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};
