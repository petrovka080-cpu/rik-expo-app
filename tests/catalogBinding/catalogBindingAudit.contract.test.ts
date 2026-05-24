import fs from "node:fs";
import path from "node:path";

describe("catalog binding audit artifacts", () => {
  const root = path.resolve(__dirname, "../..");

  it("records the current catalog path and no audit failures", () => {
    const audit = JSON.parse(fs.readFileSync(path.join(root, "artifacts/S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_audit.json"), "utf8"));
    const catalogPath = JSON.parse(fs.readFileSync(path.join(root, "artifacts/S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_catalog_path.json"), "utf8"));
    const failures = JSON.parse(fs.readFileSync(path.join(root, "artifacts/S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_failures.json"), "utf8"));
    expect(audit.catalog_path_found).toBe(true);
    expect(catalogPath.material_binding_search_reuses_service).toBe(true);
    expect(failures).toEqual([]);
  });
});
