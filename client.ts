// https://www.npmjs.com/package/node-thermal-printer

import { sample } from "@std/random";
import { ThermalPrinter, PrinterTypes } from "npm:node-thermal-printer";



const germanCommonWords = getGermanCommonWords();

async function main() {
    while (true) {
        const oldFiles: string[] = Deno.readDirSync("./input").filter((file) => file.isFile).map((file) => file.name).filter((name) => name.endsWith("jpg")).toArray();
        prompt("Please enter when shoot is complete!\n");

        const newFiles: string[] = Deno.readDirSync("./input").filter((file) => file.isFile).map((file) => file.name).filter((name) => name.endsWith("jpg")).filter((name) => !oldFiles.includes(name)).toArray();

        console.log("Detected following new files: ", newFiles);
        if (newFiles.length == 0) {
            continue;
        }

        const id = generateThreeWords();

        Deno.mkdirSync(`./data/${id}`)
        for (const file of newFiles) {
            Deno.linkSync(`./input/${file}`, `./data/${id}/${file}`)
        }
        console.log(`Created ${id} folder with ${newFiles.length} photos!`)
        console.log()
        await printCode(id);
    }

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
    const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: '\\.\COM1'
    });

    printer.alignCenter();
    printer.bold(true);
    printer.println("Winterball 2025");
    printer.bold(false);
    printer.drawLine();
    printer.newLine();
    await printer.printImage('./assets/olaii-logo-black.png');
    printer.printQR(`http://localhost:8080/gallery/${id}`, {
        cellSize: 3,
        correction: 'M',
        model: 2
    });
    printer.cut();

    try {
        printer.execute()
        console.log("Print done!");
    } catch (error) {
        console.error("Print failed:", error);
    }

}

await main()