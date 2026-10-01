// CSV building shared by the export routes.
//
// Receipt text (store names, item names) comes from an AI reading photos the
// user took, so it is untrusted: a crafted receipt could put "=HYPERLINK(...)"
// into a store name and have Excel execute it when the export is opened.

// Excel needs a UTF-8 byte-order mark to display Thai text correctly.
export const BOM = "﻿";

// Characters that make a spreadsheet treat a cell as a formula.
// Tab and CR are included because Excel strips them and then reads the
// character that follows as the start of the cell.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

// A cell that is entirely a number is data, not a formula. Matching the whole
// string matters: "-12.5" is a negative amount and must stay numeric, while
// "-2+3+cmd|' /C calc'!A0" only starts like one and must be neutralized.
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function escapeCsvCell(
  value: string | number | null | undefined
): string {
  if (value == null) return "";

  // Real numbers are never formulas — pass them through untouched so
  // spreadsheets can sum the column.
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  const raw = String(value);
  // Test the prefix before newline normalization, so a leading CR is caught.
  const isFormula = !PLAIN_NUMBER.test(raw) && FORMULA_PREFIX.test(raw);

  let cell = raw.replace(/\r\n|\r/g, "\n");
  if (isFormula) {
    // A leading apostrophe tells Excel/Sheets/LibreOffice "this is text".
    cell = `'${cell}`;
  }

  if (!/[",\n]/.test(cell)) return cell;
  return `"${cell.replace(/"/g, '""')}"`;
}

export function toCsvRow(
  cells: Array<string | number | null | undefined>
): string {
  return cells.map(escapeCsvCell).join(",");
}

export function csvResponse(rows: string[], filename: string): Response {
  return new Response(BOM + rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
