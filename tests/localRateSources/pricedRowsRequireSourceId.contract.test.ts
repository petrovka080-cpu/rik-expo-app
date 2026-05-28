import { resolveCountryRegionCity } from "../../src/lib/ai/globalLocalContext";
import { resolveLocalRateSources, validateRateSourceEvidence } from "../../src/lib/ai/localRateSources";

describe("local rate source evidence", () => {
  it("requires source evidence for every priced row", () => {
    const context = resolveCountryRegionCity({ prompt: "смета на гидроизоляцию крыши 100 кв м в Бишкеке" });
    const policy = resolveLocalRateSources(context);

    expect(policy.level).toBe("city_ratebook");
    expect(policy.sourceId).toContain("KG");

    const validation = validateRateSourceEvidence({
      policy,
      pricedRows: [
        {
          rowId: "roof_membrane",
          unitPrice: 100,
          sourceId: policy.sourceId,
          sourceType: policy.sourceType,
          sourceDate: policy.sourceDate,
        },
      ],
    });

    expect(validation.valid).toBe(true);
  });

  it("fails priced rows without source metadata", () => {
    const context = resolveCountryRegionCity({ prompt: "смета на асфальтирование 10000 кв м в Алматы" });
    const policy = resolveLocalRateSources(context);

    expect(validateRateSourceEvidence({
      policy,
      pricedRows: [{ rowId: "asphalt", unitPrice: 10 }],
    }).failures).toContain("PRICED_ROW_SOURCE_REQUIRED:asphalt");
  });
});
