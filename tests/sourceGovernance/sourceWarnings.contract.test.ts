import { formatSourceWarnings } from "../../src/lib/ai/globalEstimate/sourceGovernance";

describe("source warning formatter", () => {
  it("returns user-facing warnings for source governance failures", () => {
    const warnings = formatSourceWarnings([
      { code: "PRICE_WITHOUT_SOURCE", path: "row.sourceId", message: "missing" },
      { code: "FAKE_STOCK", path: "row.stockStatus", message: "fake" },
    ]);
    expect(warnings).toContain("Цена скрыта: нет подтвержденного источника.");
    expect(warnings).toContain("Найдена неподтвержденная stock-метка.");
  });
});
