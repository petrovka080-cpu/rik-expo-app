import { REAL_WORK_ONTOLOGY_10000_CASES, resolveConstructionWorkOntologyIntent } from "./workOntologyTestHelpers";

describe("work ontology pricebook scope", () => {
  it("selects country and regional currency scopes from user location", () => {
    const kg = resolveConstructionWorkOntologyIntent("\u0448\u0442\u0443\u043a\u0430\u0442\u0443\u0440\u043a\u0430 \u0441\u0442\u0435\u043d 85 \u043c2 Bishkek");
    expect(kg.country).toBe("KG");
    expect(kg.expected_currency).toBe("KGS");
    expect(kg.pricebook_scope).toContain("KG_BISHKEK");

    const kzCase = REAL_WORK_ONTOLOGY_10000_CASES.find((item) => item.region === "Almaty");
    expect(kzCase).toBeTruthy();
    const kz = resolveConstructionWorkOntologyIntent(kzCase!.user_input_ru);
    expect(kz.country).toBe("KZ");
    expect(kz.expected_currency).toBe("KZT");
    expect(kz.pricebook_scope).toContain("KZ_ALMATY");
  });
});
