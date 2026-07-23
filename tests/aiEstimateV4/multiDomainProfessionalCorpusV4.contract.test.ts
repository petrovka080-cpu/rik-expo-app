import {
  CALCULATION_ARCHETYPES_V4,
  MULTI_DOMAIN_GROUPS_V4,
  OPEN_MULTI_DOMAIN_SOURCES_V4,
  PROFESSIONAL_GROUP_FACTORIES_V4,
  REFERENCE_WORK_CANDIDATES_V4,
} from "../../src/lib/estimate/v4/multiDomainProfessionalCorpusV4";

describe("Estimate V4 open multi-domain corpus", () => {
  test("covers the requested domains and calculation archetypes without generated work claims", () => {
    expect(MULTI_DOMAIN_GROUPS_V4).toHaveLength(20);
    expect(new Set(MULTI_DOMAIN_GROUPS_V4.map(([id]) => id)).size).toBe(20);
    expect(CALCULATION_ARCHETYPES_V4).toHaveLength(10);
    expect(REFERENCE_WORK_CANDIDATES_V4).toHaveLength(12);
    expect(new Set(REFERENCE_WORK_CANDIDATES_V4.map(([groupId]) => groupId)).size).toBe(12);
    expect(REFERENCE_WORK_CANDIDATES_V4.some(([, id]) => id === "asphalt_pavement")).toBe(true);
  });

  test("keeps factories declarative and passport-specific", () => {
    expect(PROFESSIONAL_GROUP_FACTORIES_V4).toHaveLength(20);
    for (const factory of PROFESSIONAL_GROUP_FACTORIES_V4) {
      expect(factory.sharedValidationRules).toContain("P0_REQUIRED_WITHOUT_SILENT_DEFAULT");
      expect(new Set(factory.passportDefinitions).size).toBe(factory.passportDefinitions.length);
    }
  });

  test("uses only public URLs and never promotes foreign references to KG mandatory norms", () => {
    expect(OPEN_MULTI_DOMAIN_SOURCES_V4.every((source) => source.url.startsWith("https://"))).toBe(true);
    expect(OPEN_MULTI_DOMAIN_SOURCES_V4.filter((source) => source.jurisdiction !== "KG")
      .every((source) => !String(source.profile).includes("KG_MANDATORY"))).toBe(true);
  });
});
