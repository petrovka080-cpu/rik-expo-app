import { dataLines, readText } from "./postM1R2TestSupport";

test("recounts 63 by 11 canonical jurisdiction lanes", () => {
  const text = readText("03-normative/JURISDICTION_693_RECOUNT.csv");
  expect(dataLines("03-normative/JURISDICTION_693_RECOUNT.csv")).toHaveLength(693);
  expect(text).toContain(",CIS,");
  expect(text).toContain("CIS_CONSTRUCTION_DOCUMENTS");
});
