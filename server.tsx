import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import type { FC } from "hono/jsx";
import { loadConfig } from './config.loader.ts';

const config = await loadConfig();

// Helper function to prevent path traversal attacks
function isValidPath(folder: string): boolean {
  // Reject paths containing .. or / or \ to prevent directory traversal
  if (folder.includes('..') || folder.includes('/') || folder.includes('\\')) {
    return false;
  }
  return true;
}
const app = new Hono();
app.use(logger());
app.use(compress());

const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">
        </script>
        <title>{config.event.title}</title>
      </head>
      <body style={`background-color: ${config.theme.backgroundColor}; color: ${config.theme.textColor};`}>
        {props.children}
      </body>
    </html>
  );
};

const Gallery: FC<{ folder: string }> = (props: {
  folder: string;
}) => {
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
    return <Error />;
  }

  return (
    <Layout>
      <div class="text-5xl font-bold p-8">{config.event.title}</div>
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

const Index: FC = () => {
  const scriptContent = {
    __html:
      "document.getElementById('form').addEventListener('submit', function (e) { e.preventDefault(); document.location.href = '/gallery/' + document.getElementById('gallery-code').value; });",
  };
  return (
    <Layout>
      <div class="grid h-screen place-items-center">
        <form
          id="form"
          class="p-8 flex flex-col text-black bg-white rounded-md gap-5"
        >
          <div class="text-5xl font-bold p-8 text-center">
            {config.event.title}
          </div>
          {config.event.subtitle && (
            <div class="text-xl text-center text-gray-600">
              {config.event.subtitle}
            </div>
          )}
          <div class="sm:col-span-3">
            <label
              for="first-name"
              class="block text-sm/6 font-medium text-gray-900"
            >
              {config.ui.labels.codeInputLabel || 'Code'}
            </label>
            <div class="mt-2">
              <input
                id="gallery-code"
                type="text"
                name="gallery-code"
                class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
              />
            </div>
          </div>

          <button
            type="submit"
            id="submit"
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 text-white font-medium shadow-md h-9 px-4 py-2 cursor-pointer"
            style={`background-color: ${config.theme.primaryColor};`}
          >
            {config.ui.labels.submitButton || 'Fotos abrufen'}
          </button>
          <script dangerouslySetInnerHTML={scriptContent} />
        </form>
      </div>
    </Layout>
  );
};

const Error: FC = () => {
  return (
    <Layout>
      <div class="grid h-screen place-items-center">
        <div
          id="form"
          class="m-8 px-8 py-16 flex flex-col text-black bg-white rounded-md gap-5"
        >
          <div class="text-5xl font-bold text-center text-red-500">
            {config.ui.labels.notFoundTitle || 'Nicht gefunden!'}
          </div>

          <div class="text-xl text-center">
            {config.ui.labels.notFoundMessage || 'Keine Sorge! Deine Bilder werden möglicherweise noch hochgeladen. Sprich uns sonst gerne in Person am Stand an!'}
          </div>
        </div>
      </div>
    </Layout>
  );
};

app.get("/", (c) => {
  return c.html(<Index />);
});

app.get("/gallery/:key", (c) => {
  const key = c.req.param("key");
  if (!isValidPath(key)) {
    return c.html(<Error />);
  }
  return c.html(<Gallery folder={key} />);
});

// Custom image serving with renamed files
app.get("/img/:galleryId/:filename", async (c) => {
  const galleryId = c.req.param("galleryId");
  const filename = c.req.param("filename");

  // Validate both parameters to prevent path traversal
  if (!isValidPath(galleryId) || !isValidPath(filename)) {
    return c.notFound();
  }

  const filePath = `./data/${galleryId}/${filename}`;

  // Check if file exists
  try {
    const stat = await Deno.stat(filePath);
    if (!stat.isFile) {
      return c.notFound();
    }
  } catch {
    return c.notFound();
  }

  // Read metadata for renamed filename
  let renamedFilename = filename;
  try {
    const metadataPath = `./data/${galleryId}/metadata.json`;
    const metadataContent = await Deno.readTextFile(metadataPath);
    const metadata = JSON.parse(metadataContent);

    // Create renamed filename: EventTitle_YYYYMMDD_HHMMSS.jpg
    const timestamp = new Date(metadata.timestamp);
    const dateStr = timestamp.toISOString()
      .replace(/[-:]/g, '')  // Remove dashes and colons
      .replace(/\..+/, '')   // Remove milliseconds and timezone
      .replace('T', '_');    // Replace T with underscore

    // Clean event title for filename (remove spaces, special chars)
    const eventTitle = metadata.eventTitle
      .replace(/\s+/g, '')   // Remove spaces
      .replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters

    const extension = filename.split('.').pop();
    renamedFilename = `${eventTitle}_${dateStr}.${extension}`;
  } catch (error) {
    // If metadata doesn't exist or can't be read, use original filename
    console.warn(`Could not read metadata for ${galleryId}, using original filename`);
  }

  // Read and serve the file
  const fileContent = await Deno.readFile(filePath);

  // Set headers
  c.header("Content-Type", "image/jpeg");
  c.header("Cache-Control", "immutable, max-age=360");
  c.header("Content-Disposition", `inline; filename="${renamedFilename}"`);

  return c.body(fileContent);
});

app.get("*", (c) => {
  return c.html(<Error />);
});

Deno.serve({ port: config.server.port || 8080 }, app.fetch);
