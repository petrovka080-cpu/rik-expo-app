import fs from "node:fs";
import path from "node:path";

import { resolveFioModalSubtitle, type FioModalSurface } from "./WarehouseFioModal";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("shared FIO modal surface copy", () => {
  it.each<[FioModalSurface, string, string]>([
    ["warehouse", "складских документов", "складским экраном"],
    ["buyer", "предложений снабжения", "экране снабжения"],
    ["accountant", "финансовых документов", "экране бухгалтерии"],
    ["foreman", "документов прораба", "экране прораба"],
  ])("uses %s-specific confirmed and initial copy", (surface, confirmedText, initialText) => {
    expect(resolveFioModalSubtitle(surface, true)).toContain(confirmedText);
    expect(resolveFioModalSubtitle(surface, false)).toContain(initialText);
  });

  it("binds every current caller to its own surface without changing FIO ownership", () => {
    expect(read("src/screens/warehouse/components/WarehouseModalsManager.tsx")).toContain('surface="warehouse"');
    expect(read("src/screens/buyer/components/BuyerScreenSheets.tsx")).toContain('surface="buyer"');
    expect(read("src/screens/accountant/components/AccountantScreenView.tsx")).toContain('surface="accountant"');
    expect(read("src/screens/foreman/ForemanMaterialsContent.sections.tsx")).toContain('surface="foreman"');
  });
});
