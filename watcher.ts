/// <reference lib="webworker" />

async function startWatching(path: string) {
  const watcher = Deno.watchFs(path);
  for await (const event of watcher) {
    if (event.kind != "create") {
      continue;
    }
    const fotoPath = event.paths.find((path) => path.endsWith(".jpg"));
    if (!fotoPath) {
      continue;
    }
    self.postMessage(fotoPath);
  }
}

self.onmessage = (e) => {
  startWatching(e.data as string);
};
