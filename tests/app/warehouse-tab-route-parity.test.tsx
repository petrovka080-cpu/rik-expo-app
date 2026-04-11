import fs from "fs";
import path from "path";

describe("warehouse office route context", () => {
  const appTabsDir = path.join(__dirname, "../../app/(tabs)");

  const readAppRoute = (routePath: string) =>
    fs.readFileSync(path.join(appTabsDir, routePath), "utf8");

  it("does not register warehouse as a top-level tabs route", () => {
    const tabsLayoutSource = readAppRoute("_layout.tsx");
    const officeWarehouseSource = readAppRoute("office/warehouse.tsx");

    expect(fs.existsSync(path.join(appTabsDir, "warehouse.tsx"))).toBe(false);
    expect(tabsLayoutSource).not.toContain('name="warehouse"');
    expect(officeWarehouseSource).toContain(
      'import WarehouseScreenContent from "../../../src/screens/warehouse/WarehouseScreenContent";',
    );
    expect(officeWarehouseSource).not.toContain('from "../warehouse"');
  });
});
