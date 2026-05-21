import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";
import type { Context } from "hono";
import { Layout } from "./Layout.tsx";
import { useTranslation } from "@intlify/hono";
import type { ResourceSchema } from "../locales/index.ts";

export const Gallery: FC<{ folder: string; config: Config; c: Context }> = (props) => {
  const t = useTranslation<ResourceSchema>(props.c);
  const images: Deno.DirEntry[] = [];
  const shareImageScript =
    "if (navigator.share) { event.preventDefault(); navigator.share({ title: document.title, url: this.href }).catch(function () {}); }";
  const downloadBaseName = props.config.event.title.replaceAll(/[^a-zA-Z0-9._-]+/g, "_") ||
    props.folder;

  const dataDir = props.config.server.dataDir ?? "./data";
  let downloadTimestamp = new Date().toISOString();

  try {
    for (const image of Deno.readDirSync(`${dataDir}/${props.folder}`)) {
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

  try {
    const metadata = JSON.parse(
      Deno.readTextFileSync(`${dataDir}/${props.folder}/metadata.json`),
    );
    if (typeof metadata.timestamp === "string" && !Number.isNaN(Date.parse(metadata.timestamp))) {
      downloadTimestamp = metadata.timestamp;
    }
  } catch {
    // Metadata is optional; fall back to render time for the batch name.
  }

  const downloadBatch = new Date(downloadTimestamp).toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "_");

  return (
    <Layout config={props.config} c={props.c}>
      <div class="p-5 sm:p-8">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-5xl font-bold">{props.config.event.title}</div>
          <a
            href={`/img/${props.folder}/download-all.tar`}
            class="border-0 rounded-md px-4 py-2 cursor-pointer text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 text-[color:var(--theme-text)] hover:-translate-y-px active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={`background-color: color-mix(in srgb, var(--theme-bg) 92%, transparent);`}
            title={t("ui.downloadAllTitle") ?? "Download all"}
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
            {t("ui.downloadAllButton") ?? "Download all"}
          </a>
        </div>

        <div class="columns-1 gap-5 sm:columns-2 sm:gap-8 md:columns-3 lg:columns-4 [&>div:not(:first-child)]:mt-8">
          {images.map((image, index) => {
            const imageUrl = "/img/" + props.folder + "/" + image.name;
            const extension = image.name.split(".").pop() || "jpg";
            const downloadName = `${downloadBaseName}_${downloadBatch}-${index + 1}.${extension}`;
            return (
              <div key={image.name} class="relative inline-block w-full">
                <a
                  href={imageUrl}
                  onclick={shareImageScript}
                  class="absolute top-3 right-3 z-10 border-0 rounded-md px-3 py-2 cursor-pointer text-sm font-medium flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all duration-200 text-[color:var(--theme-text)] hover:-translate-y-px active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={`background-color: color-mix(in srgb, var(--theme-bg) 92%, transparent);`}
                  title={t("ui.shareImageTitle")}
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
                      d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0-12.814a2.25 2.25 0 103.434-1.936 2.25 2.25 0 00-3.434 1.936zm0 12.814a2.25 2.25 0 103.434 1.936 2.25 2.25 0 00-3.434-1.936z"
                    />
                  </svg>
                  {t("ui.shareButton")}
                </a>

                <a
                  href={imageUrl}
                  download={downloadName}
                  class="block overflow-hidden rounded-md shadow-md leading-none"
                  title={t("ui.downloadImageTitle")}
                >
                  <img
                    class="block max-w-full w-auto max-h-full bg-transparent object-scale-down"
                    src={imageUrl}
                    alt={image.name}
                  />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};
