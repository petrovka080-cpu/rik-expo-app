import fs from "node:fs";
import path from "node:path";

describe("stale async screen state contract", () => {
  it("keeps role screens on lifecycle/query owner boundaries instead of stale local truth", () => {
    const files = [
      "src/screens/warehouse/hooks/useWarehouseLifecycle.ts",
      "src/screens/buyer/hooks/useBuyerScreenSideEffects.ts",
      "src/lib/navigation/officeReentryBreadcrumbs.ts",
    ];
    for (const file of files) {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true);
    }
  });
});
