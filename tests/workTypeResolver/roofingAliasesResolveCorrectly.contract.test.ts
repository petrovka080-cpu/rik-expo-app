import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";

function resolve(prompt: string): string {
  return calculateGlobalConstructionEstimateSync({
    text: prompt,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  }).work.workKey;
}

describe("roofing aliases", () => {
  it("keeps roof, krovlya, membrane, leak, and detail aliases in roofing work families", () => {
    expect(resolve("гидроизоляция кровли 100 м²")).toBe("roof_waterproofing");
    expect(["roof_membrane_waterproofing", "flat_roof_membrane"]).toContain(resolve("мембрана на крыше 120 м²"));
    expect(["roof_membrane_waterproofing", "flat_roof_membrane"]).toContain(resolve("битумная мастика кровля 90 м²"));
    expect(resolve("протечка кровли гидроизоляция 70 м²")).toBe("roof_waterproofing");
    expect(resolve("гидроизоляция парапетов и ендовы на крыше 45 м²")).toBe("roof_waterproofing");
  });
});
