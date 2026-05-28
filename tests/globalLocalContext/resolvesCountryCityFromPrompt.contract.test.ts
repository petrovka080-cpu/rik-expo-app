import { resolveCountryRegionCity, validateGlobalLocalContext } from "../../src/lib/ai/globalLocalContext";
import { resolveGlobalLocaleContext } from "../../src/lib/ai/globalEstimate";

describe("global local context country/city resolution", () => {
  it("resolves Bishkek/Kyrgyzstan and Almaty/Kazakhstan without backend label leakage", () => {
    const bishkek = resolveCountryRegionCity({
      prompt: "смета на гидроизоляцию крыши 100 кв м в Бишкеке",
    });
    expect(bishkek).toMatchObject({
      countryCode: "KG",
      city: "Bishkek",
      currency: "KGS",
      completeness: "LOCAL_CONTEXT_EXACT",
      confidence: "high",
    });
    expect(validateGlobalLocalContext(bishkek).valid).toBe(true);

    const almaty = resolveCountryRegionCity({
      prompt: "смета на асфальтирование 10000 кв м в Алматы",
    });
    expect(almaty).toMatchObject({
      countryCode: "KZ",
      city: "Almaty",
      currency: "KZT",
      completeness: "LOCAL_CONTEXT_EXACT",
    });
  });

  it("keeps legacy global estimate locale resolver aligned for new local prompts", () => {
    const austin = resolveGlobalLocaleContext({
      text: "estimate for drywall installation on 1200 sq ft in Austin Texas",
    });
    expect(austin).toMatchObject({
      countryCode: "US",
      city: "Austin",
      stateOrRegion: "TX",
      currency: "USD",
    });

    const kazakhstan = resolveGlobalLocaleContext({ text: "смета на вентиляцию в Казахстане" });
    expect(kazakhstan.countryCode).toBe("KZ");
    expect(kazakhstan.currency).toBe("KZT");
  });
});
