import type { FC } from "hono/jsx";
import type { Config } from "../../config.ts";
import { Layout } from "./Layout.tsx";

export const Gallery: FC<{ folder: string; config: Config }> = (props) => {
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
    <Layout config={props.config}>
      <style>
        {`
        .image-container {
          position: relative;
          display: inline-block;
          width: 100%;
        }

        .download-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          border-radius: 0.375rem;
        }

        .image-container:hover .download-overlay {
          opacity: 1;
          pointer-events: auto;
        }

        .download-button {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.95);
          border: none;
          border-radius: 0.375rem;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
          color: #333;
        }

        .download-button:hover {
          background: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .download-button:active {
          transform: translateY(0);
        }

        .download-icon {
          width: 16px;
          height: 16px;
        }
      `}
      </style>

      <div class="text-5xl font-bold p-8">{props.config.event.title}</div>
      <div class="p-5 sm:p-8">
        <div class="columns-1 gap-5 sm:columns-2 sm:gap-8 md:columns-3 lg:columns-4 [&>div:not(:first-child)]:mt-8">
          {images.map((image) => {
            const imageUrl = "/img/" + props.folder + "/" + image.name;
            return (
              <div key={image.name} class="image-container">
                <img
                  class="max-w-full w-auto max-h-full rounded-md shadow-md bg-transparent transition-transform object-scale-down hover:scale-105"
                  src={imageUrl}
                  alt={image.name}
                />
                <div class="download-overlay">
                  <a
                    href={imageUrl}
                    download
                    class="download-button"
                    title="Download image"
                  >
                    <svg
                      class="download-icon"
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
                    Download
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
