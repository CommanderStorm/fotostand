// https://www.npmjs.com/package/node-thermal-printer

import { parseArgs } from "@std/cli/parse-args";
import { sample } from "@std/random";
import { ThermalPrinter, PrinterTypes } from "npm:node-thermal-printer";
import { loadConfig } from './config.loader.ts';

// Parse CLI arguments
const args = parseArgs(Deno.args, {
  string: ['id', 'config'],
  boolean: ['help']
});

// Show help text if requested
if (args.help) {
  console.log(`
Fotostand Photo Booth Client

Usage: deno task client [OPTIONS]

Options:
  --id <id>        Use external ID instead of auto-generating
  --config <path>  Path to custom config file
  --help           Show this help message

Examples:
  # Auto-generate ID (default)
  deno task client

  # Use external ID
  deno task client --id my-custom-code-123

  # Use custom config
  deno task client --config ./events/winterball.ts
  `);
  Deno.exit(0);
}

// Load configuration
const config = await loadConfig(args.config);

const germanCommonWords = getGermanCommonWords();

async function main() {
    console.log("Fotostand client started - watching for new photos...");
    console.log("Press Ctrl+C to stop\n");

    const processedFiles = new Set<string>();

    // Initial scan - mark existing files as already processed
    for (const file of Deno.readDirSync("./input")) {
        if (file.isFile && file.name.endsWith("jpg")) {
            processedFiles.add(file.name);
        }
    }

    // Continuously watch for new files
    while (true) {
        // Scan for new files
        const currentFiles: string[] = [];
        for (const file of Deno.readDirSync("./input")) {
            if (file.isFile && file.name.endsWith("jpg")) {
                currentFiles.push(file.name);
            }
        }

        // Find new files that haven't been processed yet
        const newFiles = currentFiles.filter(filename => !processedFiles.has(filename));

        // Process each new file individually
        for (const filename of newFiles) {
            await processPhoto(filename);
            processedFiles.add(filename);
        }

        // Wait before next scan (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

async function processPhoto(filename: string) {
    console.log(`\n📸 New photo detected: ${filename}`);

    // Use filename (without extension) as ID
    const id = filename.replace(/\.jpg$/i, '');
    console.log(`Using ID: ${id}`);

    // Check if folder already exists
    try {
        const stat = Deno.statSync(`./data/${id}`);
        if (stat) {
            console.error(`⚠️  Warning: Gallery ${id} already exists. Skipping this photo.`);
            return;
        }
    } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
            throw err;
        }
        // Folder doesn't exist, we're good to proceed
    }

    // Create gallery folder with timestamp for file renaming
    const timestamp = new Date().toISOString();
    Deno.mkdirSync(`./data/${id}`);

    // Store metadata for this gallery (used by server for file renaming)
    const metadata = {
        originalFilename: filename,
        timestamp: timestamp,
        eventTitle: config.event.title
    };
    Deno.writeTextFileSync(`./data/${id}/metadata.json`, JSON.stringify(metadata, null, 2));

    // Hard link the photo to the gallery folder
    Deno.linkSync(`./input/${filename}`, `./data/${id}/${filename}`);

    const galleryUrl = `${config.server.baseUrl}/gallery/${id}`;
    console.log(`✅ Created gallery: ${id}`);
    console.log(`📂 Gallery URL: ${galleryUrl}`);

    // Output machine-readable format for external systems
    const output = {
        id: id,
        url: galleryUrl,
        photoCount: 1,
        timestamp: timestamp,
        originalFilename: filename
    };
    console.log('FOTOSTAND_OUTPUT:', JSON.stringify(output));

    // Print receipt if printer is enabled
    await printCode(id);
}

function generateThreeWords(): string {
    const word = `${sample(germanCommonWords)}-${sample(germanCommonWords)}-${sample(germanCommonWords)}`;
    try {
        if (Deno.statSync(`./data/${word}`)) {
            return generateThreeWords();
        }
    } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
            throw err;
        }
    }
    return word;
}

function getGermanCommonWords() {
    return Deno.readTextFileSync("./common_german_word_list.txt").split("\n").map((lines) => lines.toLowerCase());
}

async function printCode(id: string) {
    // Skip printing if printer is not enabled in config
    if (!config.printer?.enabled) {
        console.log("Printer disabled in config, skipping receipt printing");
        return;
    }

    const printer = new ThermalPrinter({
        type: PrinterTypes[config.printer.type],
        interface: config.printer.interface
    });

    printer.alignCenter();
    printer.bold(true);
    printer.println(config.event.title);
    printer.bold(false);
    printer.drawLine();
    printer.newLine();

    // Print logo if configured
    if (config.branding.logoPath) {
        try {
            await printer.printImage(config.branding.logoPath);
        } catch (error) {
            console.warn(`Warning: Could not print logo from ${config.branding.logoPath}:`, error);
        }
    }

    // Print QR code if enabled
    if (config.printer.includeQR) {
        const galleryUrl = `${config.server.baseUrl}/gallery/${id}`;
        printer.printQR(galleryUrl, {
            cellSize: 3,
            correction: 'M',
            model: 2
        });
    }

    printer.cut();

    try {
        printer.execute()
        console.log("Print done!");
    } catch (error) {
        console.error("Print failed:", error);
    }

}

await main()