import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (...parts: string[]) =>
  readFileSync(path.join(repoRoot, ...parts), "utf8");

describe("S-PDF-CHILD-LISTS-CEILING-CONTRACTS-1", () => {
  it("publishes one shared foreman request PDF child-list ceiling contract", () => {
    const shared = read("src", "lib", "pdf", "foremanRequestPdf.shared.ts");

    expect(shared).toContain("FOREMAN_REQUEST_PDF_CHILD_LIST_PAGE_DEFAULTS");
    expect(shared).toContain("pageSize: 100");
    expect(shared).toContain("maxPageSize: 100");
    expect(shared).toContain("maxRows: 5000");
  });

  it("bounds local foreman request PDF item reads without a separate note full-read", () => {
    const builder = read("src", "lib", "pdf", "pdf.builder.ts");

    expect(builder).toContain("loadPagedRowsWithCeiling<RequestItemPdfRow>");
    expect(builder).toContain("FOREMAN_REQUEST_PDF_CHILD_LIST_PAGE_DEFAULTS");
    expect(builder).toContain('.from("request_items")');
    expect(builder).toContain(
      '.select("id, name_human, uom, qty, note, status")',
    );
    expect(builder).toContain('.order("id", {');
    expect(builder).toContain("ascending: true");
    expect(builder).toContain(
      "const itemRows = await loadRequestPdfItemRows(client, requestKey)",
    );
    expect(builder).toContain("itemRows.map((row) => row.note)");
    expect(builder).not.toContain('.select("note")');
    expect(builder).not.toContain("itemsForContext");
  });

  it("bounds backend foreman-request-pdf child rows with overflow probe and deterministic ordering", () => {
    const fn = read("supabase", "functions", "foreman-request-pdf", "index.ts");

    expect(fn).toContain("loadForemanRequestPdfChildRows");
    expect(fn).toContain("FOREMAN_REQUEST_PDF_CHILD_LIST_PAGE_DEFAULTS");
    expect(fn).toContain('.from("request_items")');
    expect(fn).toContain('.select("id, name_human, uom, qty, note, status")');
    expect(fn).toContain('.order("id", { ascending: true })');
    expect(fn).toContain(".range(from, to)");
    expect(fn).toContain(".range(maxRows, maxRows)");
    expect(fn).toContain("buildForemanRequestPdfChildListCeilingError");
    expect(fn).toContain(
      "itemRows.map((row: Record<string, unknown>) => row.note)",
    );
    expect(fn).not.toContain(
      'admin.from("request_items").select("note").eq("request_id", requestId)',
    );
    expect(fn).not.toContain(".limit(5000)");
  });
});
