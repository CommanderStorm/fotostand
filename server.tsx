import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import type { FC } from "hono/jsx";

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
        <title>Winterball 2025</title>
      </head>
      <body style="background-color: #041429; color: white;">
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
      if (image.isFile) {
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
      <div class="text-5xl font-bold p-8">Winterball 2025</div>
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
            Winterball 2025
          </div>
          <div class="sm:col-span-3">
            <label
              for="first-name"
              class="block text-sm/6 font-medium text-gray-900"
            >
              Code
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
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 bg-indigo-500 text-white font-medium shadow-md hover:bg-indigo-500/90 h-9 px-4 py-2 cursor-pointer"
          >
            Fotos abrufen
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
            Nicht gefunden!
          </div>

          <div class="text-xl text-center">
            Keine Sorge! Deine Bilder werden möglicherweise noch hochgeladen.
            Sprich uns sonst gerne in Person am Stand an!
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
  return c.html(<Gallery folder={key} />);
});

app.use(
  "/img/**",
  serveStatic({
    root: "./data",
    rewriteRequestPath: (path) => path.replace(/^\/img/, "/"),
    onFound: (_path, c) => {
      c.header("Cache-Control", `immutable, max-age=360`);
    },
  }),
);

app.get("*", (c) => {
  return c.html(<Error />);
});

Deno.serve(app.fetch);
