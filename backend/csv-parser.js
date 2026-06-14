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

    const parsedRows = rows
        .filter(row => Object.values(row).some(value => value !== ""))
        .map(row =>
            Object.fromEntries(
                Object.entries(row)
                    .filter(([_, value]) => value !== "")
            )
        );

    const ids = parsedRows.map(v => v.variation_id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length) {
        throw new Error(`Duplicate variation_ids found in ${filepath}, cannot have multiple variations with id: ${[...new Set(duplicates)].join(", ")}`);
    }

    return Object.fromEntries(parsedRows.map(({ variation_id, ...rest }) => [variation_id, rest]));
}