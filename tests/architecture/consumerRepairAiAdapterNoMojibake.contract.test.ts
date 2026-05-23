import fs from "fs";
import path from "path";

const adapterPath = path.resolve(process.cwd(), "src/features/consumerRepair/consumerRepairAiAdapter.ts");

describe("consumer repair AI adapter text quality", () => {
  const source = fs.readFileSync(adapterPath, "utf8");

  it("keeps user-facing draft and dangerous-work copy readable", () => {
    expect(source).toContain("Это может быть опасно");
    expect(source).toContain("Не выполняйте ремонт самостоятельно");
    expect(source).toContain("Укладка ламината");
    expect(source).toContain("Коротко:");
    expect(source).not.toMatch(/РЎР|РџР|РћР|Р¤Р|РўР|Р‘Р|РґР|РµР|С‚Р|СЃР|СЂР/);
  });
});
