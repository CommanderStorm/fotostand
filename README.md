# Fotostand 📸

A simple photo booth web application for events, built with Deno and Hono.

## Features

- 🎨 Customizable themes and branding
- 🔐 Secure gallery access with codes
- 📤 API for uploading photos
- 🌍 Multi-language support (German/English)
- ⚡ Fast and lightweight

## Quick Start

### Prerequisites

- [Deno](https://deno.land/) installed on your system

### Installation

1. Clone the repository
2. Edit `config.toml` to customize for your event
3. Build the CSS + run the server
   ```bash
   deno task dev
   ```

The application will be available at `http://localhost:8080` (or the port specified in your config).

## Configuration

All configuration is done through the `config.toml` file. See `config.toml` for all available options.

### Basic Configuration

```toml
[event]
title = "My Event 2025"
subtitle = "Welcome!"  # Optional

[theme]
background_color = "#041429"
primary_color = "#6366f1"
text_color = "#ffffff"

[server]
port = 8080

[ui]
language = "de"  # or "en"
```

### Upload Authentication

To enable photo uploads via the API, you need to configure an upload token:

1. Generate a secure random token:
   ```bash
   openssl rand -hex 64
   ```

2. Hash the token with SHA-256:
   ```bash
   echo -n "your-token-from-step-1" | openssl dgst -sha256
   ```

3. Add the hash to your `config.toml`:
   ```toml
   [server]
   upload_token_hash = "your-hash-from-step-2"
   ```

**Important:** Keep the original token secret! Only the hash goes in the config file. Use the original token when making API requests.

## Usage

### Accessing Galleries

1. Navigate to the homepage
2. Enter the gallery code
3. View and download photos

### Uploading Photos

Photos can be uploaded via the API. See [API.md](API.md) for detailed documentation.

Example:
```bash
curl -X POST \
  -H "Authorization: Bearer your-original-token" \
  -F "file=@photo.jpg" \
  http://localhost:8080/api/upload/gallery-code
```

## Development

### Available Tasks

- `deno task dev` Build CSS (`deno task build:css`) and start server (`deno task server`)
- `deno task lint` - Run linter
- `deno task lint:fix` - Fix linting issues
- `deno task fmt` - Format code
- `deno task fmt:check` - Check formatting
- `deno task check` - Run all checks

### Project Structure

```
fotostand/
├── config.toml          # Configuration file (create from example)
├── config.example.toml  # Example configuration
├── server.tsx           # Main server file
├── src/
│   ├── components/      # UI components
│   ├── routes/          # Route handlers
│   ├── middleware/      # Middleware
│   └── utils/           # Utility functions
└── data/                # Photo storage (gitignored)
```

## Security

- Gallery codes prevent unauthorized access
- Upload API requires bearer token authentication
- Path traversal protection for gallery IDs
- File type and size validation
- Timing-safe token comparison

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please ensure your code passes linting and formatting checks before submitting.
