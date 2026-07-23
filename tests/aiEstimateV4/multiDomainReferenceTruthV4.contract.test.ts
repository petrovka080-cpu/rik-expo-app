import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";
import {
  MULTI_DOMAIN_REFERENCE_SOURCE_BINDINGS_V4,
  validateAtomicMaterialResourcesV4,
  validateReferenceFormulaDimensionsV4,
  validateReferenceSourceTraceabilityV4,
} from "../../src/lib/estimate/v4/multiDomainReferenceTruthV4";

describe("multi-domain dimensional and source truth", () => {
  test("validates every formula graph dimension without hidden unit conversion", () => {
    for (const passport of MULTI_DOMAIN_REFERENCE_PASSPORTS_V4) {
      expect(validateReferenceFormulaDimensionsV4(passport)).toEqual([]);
    }
  });

  test("binds every passport and BOQ row to a claim-scoped source", () => {
    expect(new Set(MULTI_DOMAIN_REFERENCE_SOURCE_BINDINGS_V4.map((source) => source.sourceId)).size)
      .toBe(MULTI_DOMAIN_REFERENCE_SOURCE_BINDINGS_V4.length);
    for (const passport of MULTI_DOMAIN_REFERENCE_PASSPORTS_V4) {
      expect(validateReferenceSourceTraceabilityV4(passport)).toEqual([]);
      expect(validateAtomicMaterialResourcesV4(passport)).toEqual([]);
    }
  });

  test("never represents a foreign reference as mandatory in KG", () => {
    expect(MULTI_DOMAIN_REFERENCE_SOURCE_BINDINGS_V4.filter((source) => source.jurisdiction === "RU")
      .every((source) =>
        source.legalStatus === "REFERENCE_METHOD" &&
        source.limitations.includes("Не является обязательной нормой Кыргызской Республики")))
      .toBe(true);
  });
});
