import { parse } from "csv-parse/sync";
import fs from "fs";

export function parseCsv(filepath) {
    const rows = parse(fs.readFileSync(filepath, "utf8"), {
        columns: true,
        trim: true,
    });

    return rows.map(row =>
        Object.fromEntries(
            Object.entries(row)
                .filter(([_, value]) => value !== "")
        )
    );
}