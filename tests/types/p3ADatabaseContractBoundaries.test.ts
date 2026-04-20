import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const importsDatabaseTypes = (source: string) =>
  /import\s+type[\s\S]*?from\s+["'][^"']*database\.types["']/.test(source);

const contractFiles = [
  "src/types/contracts/shared.ts",
  "src/types/contracts/director.ts",
  "src/types/contracts/warehouse.ts",
  "src/types/contracts/foreman.ts",
  "src/types/contracts/catalog.ts",
] as const;

const migratedHotPathFiles = [
  "src/lib/api/_core.ts",
  "src/lib/catalog/catalog.request.service.ts",
  "src/lib/catalog/catalog.types.ts",
  "src/lib/dbContract.types.ts",
  "src/screens/director/director.finance.rpc.ts",
  "src/screens/director/director.proposals.repo.ts",
  "src/screens/director/director.repository.ts",
  "src/screens/foreman/foreman.dicts.repo.ts",
  "src/screens/foreman/foreman.requests.ts",
  "src/screens/warehouse/warehouse.issue.repo.ts",
] as const;

describe("P3-A database contract boundaries", () => {
  it("keeps database.types as the only generated schema source", () => {
    const shared = read("src/types/contracts/shared.ts");

    expect(importsDatabaseTypes(shared)).toBe(true);

    for (const file of contractFiles.filter((file) => file !== "src/types/contracts/shared.ts")) {
      const source = read(file);
      expect(importsDatabaseTypes(source)).toBe(false);
      expect(source).toContain('from "./shared"');
    }
  });

  it("exposes permanent domain entrypoints", () => {
    for (const file of contractFiles) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }

    expect(read("src/types/contracts/director.ts")).toContain("DirectorFinancePanelScopeV4Args");
    expect(read("src/types/contracts/warehouse.ts")).toContain("WarehouseIssueRequestAtomicV1Args");
    expect(read("src/types/contracts/foreman.ts")).toContain("ForemanRequestUpdate");
    expect(read("src/types/contracts/catalog.ts")).toContain("CatalogRequestItemUpdateQtyArgs");
  });

  it("moves the selected hot paths off direct generated-type imports", () => {
    for (const file of migratedHotPathFiles) {
      expect(importsDatabaseTypes(read(file))).toBe(false);
    }
  });

  it("does not introduce unsafe widening inside the new contract layer", () => {
    for (const file of contractFiles) {
      const source = read(file);
      expect(source).not.toMatch(/\bas\s+any\b/);
      expect(source).not.toMatch(/:\s*any\b/);
      expect(source).not.toMatch(/<any\b/);
    }
  });
});
