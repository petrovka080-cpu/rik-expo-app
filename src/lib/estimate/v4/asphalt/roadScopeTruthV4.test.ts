import {
  ROAD_SCOPE_SELECTION_QUESTION_RU,
  resolveRoadScopeV4,
  semanticKindForAsphaltProfileV4,
  validateCompositeRoadProjectV4,
} from "./roadScopeTruthV4";

describe("road scope truth V4", () => {
  const workId = "catalog:road:asphalt";
  const explicitCases = [
    ["Уложить асфальт по готовому щебёночному основанию", "ROAD_SURFACING_ONLY"],
    ["Построить дорожную одежду с подготовкой грунта, щебёночным основанием и двумя слоями асфальта", "FULL_PAVEMENT_STRUCTURE"],
    ["Полное строительство дороги с водоотводом, освещением, знаками, разметкой и ограждением", "FULL_ROAD_INFRASTRUCTURE"],
    ["Фрезерование старого покрытия и устройство нового слоя", "ROAD_REPAIR_REHABILITATION"],
    ["Даяр шагыл негизге асфальттоо керек", "ROAD_SURFACING_ONLY"],
  ] as const;

  test.each(explicitCases)("%s resolves to %s", (originalText, expected) => {
    expect(resolveRoadScopeV4({ originalText, requestedCatalogWorkId: workId })).toMatchObject({
      resolverStatus: "RESOLVED",
      selectedScopeId: expected,
    });
  });

  test("does not silently expand an ambiguous asphalt request", () => {
    const result = resolveRoadScopeV4({
      originalText: "Асфальтировать дорогу 1000 метров, ширина 32 метра",
      requestedCatalogWorkId: workId,
    });
    expect(result).toMatchObject({
      resolverStatus: "NEEDS_SCOPE_SELECTION",
      selectedScopeId: null,
      profileId: null,
    });
    expect(ROAD_SCOPE_SELECTION_QUESTION_RU.options).toHaveLength(4);
  });

  test("does not classify the word drawings inside a non-road template id as road", () => {
    expect(resolveRoadScopeV4({
      originalText: "Детализированная смета портового причала по drawings, 120 m2",
      requestedCatalogWorkId: "port_quay_detailed_boq_from_drawings_expanded_complex_v1",
    })).toMatchObject({
      resolverStatus: "NOT_ROAD",
      selectedScopeId: null,
    });
  });

  test("persists explicit user scope selection with original request identity", () => {
    const result = resolveRoadScopeV4({
      originalText: "Асфальтировать дорогу 1000 метров, ширина 32 метра",
      requestedCatalogWorkId: workId,
      selectedScopeId: "ROAD_SURFACING_ONLY",
    });
    expect(result).toMatchObject({
      resolverStatus: "RESOLVED",
      originalText: "Асфальтировать дорогу 1000 метров, ширина 32 метра",
      requestedCatalogWorkId: workId,
      selectedScopeId: "ROAD_SURFACING_ONLY",
      exclusions: expect.arrayContaining(["earthworks", "new_base"]),
    });
  });

  test("classifies full road scopes as composite projects", () => {
    expect(semanticKindForAsphaltProfileV4("surfacing_on_prepared_base")).toBe("SCOPE_PRESET");
    expect(semanticKindForAsphaltProfileV4("new_full_road_pavement")).toBe("COMPOSITE_PROJECT");
    expect(semanticKindForAsphaltProfileV4("new_full_road_infrastructure")).toBe("COMPOSITE_PROJECT");
    expect(semanticKindForAsphaltProfileV4("rehabilitation_with_milling")).toBe("PROFESSIONAL_WORK");
  });

  test("rejects duplicate composite ownership", () => {
    expect(validateCompositeRoadProjectV4({
      compositeProjectId: "road-project:1",
      requestedCatalogWorkId: workId,
      selectedScopeId: "FULL_ROAD_INFRASTRUCTURE",
      childPassportRefs: [
        { passportId: "earthwork", passportVersion: "1", quantityBindingId: "area", wbsSectionId: "02" },
        { passportId: "pavement", passportVersion: "1", quantityBindingId: "area", wbsSectionId: "02" },
      ],
      projectParameterBindings: ["length_m", "width_m"],
      projectLevelServices: [],
      assumptions: [],
      exclusions: [],
      sourceRegistryVersion: "v1",
    })).toContain("duplicate_wbs_ownership");
  });
});
