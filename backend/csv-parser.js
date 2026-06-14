import { parse } from "csv-parse/sync";
import fs from "fs";

export function parseListings(filepath) {
    const rows = parse(fs.readFileSync(filepath, "utf8"), {
        columns: true,
        trim: true,
        skip_empty_lines: true
    });

    return rows
        .filter(row => Object.values(row).some(value => value !== ""))
        .map(row =>
            Object.fromEntries(
                Object.entries(row)
                    .filter(([_, value]) => value !== "")
            )
        );
}

export function parseVariations(filepath) {
    const rows = parse(fs.readFileSync(filepath, "utf8"), {
        columns: true,
        trim: true,
        skip_empty_lines: true
    });

    return rows
        .filter(row => Object.values(row).some(value => value !== ""))
        .map(row =>
            Object.fromEntries(
                Object.entries(row)
                    .filter(([_, value]) => value !== "")
            )
        );
}