# Use official Deno image with latest stable version
FROM denoland/deno:2.6.0

# The port that your application listens to
EXPOSE 8080

WORKDIR /app

# Cache the dependencies as a layer (re-run only when deno.json/deno.lock changes)
# This caches dependencies defined in deno.json imports
COPY deno.json deno.lock ./
RUN deno install

# These steps will be re-run upon each file change in your working directory:
COPY . .

# Compile the main app so that it doesn't need to be compiled each startup/entry
RUN deno run build:css
RUN deno cache server.tsx

# Create data directories with correct permissions
RUN mkdir -p ./data && \
  chown -R deno:deno /app

# Prefer not to run as root
USER deno

CMD ["run", "--allow-net", "--allow-env", "--allow-read=./data,./config.toml,./src", "--allow-write=./data", "server.tsx"]
