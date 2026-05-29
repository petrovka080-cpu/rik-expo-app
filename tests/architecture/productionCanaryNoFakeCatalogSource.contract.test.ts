import { readProductionCanarySources } from "./productionCanaryArchitectureTestHelpers";

test("production canary does not fake catalog or source evidence", () => {
  const source = readProductionCanarySources();
  expect(source).not.toMatch(/fake_catalog_items_found:\s*true|fake_sources_found:\s*true|fake_stock_found:\s*true|fake_supplier_found:\s*true/i);
});
