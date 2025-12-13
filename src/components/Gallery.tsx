import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";
import { Layout } from "./Layout.tsx";

export const Gallery: FC<{ folder: string; config: Config }> = (props) => {
  const images = [];
  try {
    for (const image of Deno.readDirSync(`./data/${props.folder}`)) {
      // Only include image files, skip metadata.json
      if (image.isFile && image.name !== 'metadata.json') {
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
    <Layout config={props.config}>
      <div class="text-5xl font-bold p-8">{props.config.event.title}</div>
      <div class="p-5 sm:p-8">
        <div class="columns-1 gap-5 sm:columns-2 sm:gap-8 md:columns-3 lg:columns-4 [&>img:not(:first-child)]:mt-8">
          {images.map((image) => {
            return (
              <img
                key={image.name}
                class="max-w-full w-auto max-h-full rounded-md shadow-md bg-transparent transition-transform object-scale-down hover:scale-105"
                src={"/img/" + props.folder + "/" + image.name}
              />
            );
          })}
        </div>
      </div>
    </Layout>
  );
};
