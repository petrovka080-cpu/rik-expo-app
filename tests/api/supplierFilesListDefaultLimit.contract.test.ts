import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("supplier file metadata list default limit contract", () => {
  it("keeps supplier API list reads fail-closed behind a shared maxRows ceiling", () => {
    const source = read("src/lib/api/suppliers.ts");

    expect(source).toContain("loadPagedRowsWithCeiling<T>");
    expect(source).toContain("const SUPPLIER_LIST_PAGE_DEFAULTS = {");
    expect(source).toContain("maxRows: 5000");
    expect(source).toContain('.from("suppliers")');
    expect(source).toContain('.from("supplier_files")');
    expect(source).toContain('.order("id", { ascending: false })');
    expect(source).not.toContain("for (let pageIndex = 0; ; pageIndex += 1)");
  });

  it("gives supplier_files metadata a default bounded preview and deterministic tie-breaker", () => {
    const source = read("src/lib/files.ts");

    expect(source).toContain("SUPPLIER_FILES_META_DEFAULT_LIMIT = 50");
    expect(source).toContain("SUPPLIER_FILES_META_MAX_LIMIT = 1000");
    expect(source).toContain("normalizeSupplierFilesMetaLimit");
    expect(source).toContain('.from("supplier_files")');
    expect(source).toContain('.order("created_at", { ascending: false })');
    expect(source).toContain('.order("id", { ascending: false })');
    expect(source).toContain("query = query.limit(limit)");
  });
});
