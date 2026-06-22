import { parse } from "csv-parse/sync";
import fs from "fs";

export function parseVariations(filepath) {
    const rows = parse(fs.readFileSync(filepath, "utf8"), {
        columns: true,
        trim: true,
        skip_empty_lines: true
    });

    const filtered_rows = rows
        .filter(row => Object.values(row).some(value => value !== ""))
        .map(row =>
            Object.fromEntries(
                Object.entries(row)
                    .filter(([_, value]) => value !== "")
            )
        );

    const listings = {};
    for (const variation of filtered_rows) {
        const id = variation.listing_id;
        if (!listings[id]) listings[id] = [];
        listings[id].push(variation);
    }

    return listings;
}