// These barriers must throw if a supposedly pure leaf loads a mixed owner or norm pack.
const forbiddenModules = [
  "../../src/lib/estimate/v4/chlorinationStationR1",
  "../../src/lib/estimate/v4/flushingDisinfectionR1",
  "../../src/lib/estimate/v4/pressurePipelineR1",
  "../../src/lib/estimate/v4/pressureSewerPipelineR1",
  "../../src/lib/estimate/v4/reservoirCleanWaterR1",
  "../../src/lib/estimate/ownedDomain/masonryBiaTn10ProductionBindingV1",
  "../../src/lib/estimate/ownedDomain/formworkFramiXlifeProductionBindingR1",
  "../../src/lib/estimate/v4/masonryBrickWallBiaTn10R1",
  "../../src/lib/estimate/v4/domainFactory/masonryBiaTn10PhysicalNormV1",
  "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1",
  "../../data/estimate-norms/professional/masonry.json",
  "../../src/lib/estimate/v4/filtrationStationR1",
  "../../src/lib/estimate/v4/automaticConstructionOwnerR1",
  "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore",
  "../../src/lib/estimate/backendPlatform/formulaGraph",
  "../../src/lib/estimate/ownedDomain/formworkRicsNrm2ProductionBindingV1",
  "../../src/lib/estimate/ownedDomain/reinforcementBarScheduleProductionBindingV1",
  "../../src/lib/estimate/v4/domainFactory/clientRuntimeV1",
  "../../src/lib/estimate/v4/domainFactory/formworkRicsNrm2PhysicalNormV1",
  "../../src/lib/estimate/v4/domainFactory/reinforcementBarSchedulePhysicalNormV1",
  "../../data/estimate-norms/professional/formwork.json",
  "../../data/estimate-norms/professional/reinforcement.json",
  "../../src/lib/estimate/v4/asphalt",
  "../../src/lib/estimate/v4/asphalt/compileAsphaltProfessionalEstimateV4",
  "../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedThroughCoreV4",
  "../../src/lib/estimate/v4/asphalt/compileEstimateFromResolvedRoadIntentV4",
  "../../src/lib/estimate/v4/asphalt/asphaltRemovalResourceAssembliesV4",
  "../../src/lib/estimate/v4/asphalt/asphaltAssociatedWorkAssembliesV4",
  "../../src/lib/estimate/v4/professionalProjectAssemblyV4",
] as const;

test("prompt parsers and profile identities load independently of mixed owners and normative data", () => {
  jest.resetModules();
  try {
    for (const modulePath of forbiddenModules) {
      jest.doMock(modulePath, () => {
        throw new Error(`Forbidden normative dependency: ${modulePath}`);
      });
    }
    // Positive control: prove every barrier is active, rather than passing on a warm cache.
    jest.isolateModules(() => {
      for (const modulePath of forbiddenModules) {
        expect(() => require(modulePath)).toThrow(`Forbidden normative dependency: ${modulePath}`);
      }
    });
    jest.isolateModules(() => {
      const road = require("../../src/lib/estimate/v4/asphalt/roadScopeTruthV4");
      const roadIds = require("../../src/lib/estimate/v4/asphalt/asphaltRelatedResourceParameterIdsV4");
      const related = require("../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4");
      const roadFacts = require("../../src/lib/estimate/v4/asphalt/extractAsphaltUserFactsV4");
      const roadProfile = require("../../src/lib/estimate/v4/asphalt/asphaltReferenceV1");
      expect(road.isRoadScopeIdV4("ROAD_SURFACING_ONLY")).toBe(true);
      expect(road.isRoadScopeIdV4("unregistered-scope")).toBe(false);
      expect(related.getAsphaltRelatedProfileByCatalogRecordIdV4("unregistered-work")).toBeNull();
      expect(roadIds.ASPHALT_RESOURCE_LEVEL_CORE_PARAMETER_KEYS_V4).toContain("asphalt_waste_percent");
      expect(roadIds.ASPHALT_REMOVAL_RESOURCE_PARAMETER_KEYS_V4).toContain("boundary_cut_required");
      expect(typeof roadFacts.extractAsphaltUserFactsV4).toBe("function");
      expect(roadProfile.ASPHALT_REFERENCE_V1_PROFILE.workPassportId).toBe("ASPHALT_REFERENCE_V1");
      const bia = require("../../src/lib/estimate/ownedDomain/masonryBiaTn10PromptParametersV1");
      const frami = require("../../src/lib/estimate/ownedDomain/formworkFramiXlifePromptParametersR1");
      const biaIdentity = require("../../src/lib/estimate/contracts/masonryBiaTn10IdentityV1");
      const framiIdentity = require("../../src/lib/estimate/contracts/formworkFramiXlifeIdentityR1");
      expect(bia.extractBiaTn10MasonryCanonicalParametersV1("Brick BIA TN 10 Table 4"))
        .toEqual({ product_profile_id: biaIdentity.BIA_TN10_MASONRY_PRODUCT_PROFILE_ID });
      expect(frami.isFormworkFramiXlifeFoundationCatalogR1(framiIdentity.FORMWORK_FRAMI_XLIFE_FOUNDATION_TARGETS[0].catalogId)).toBe(true);
      expect(frami.extractFormworkFramiXlifeCanonicalParametersR1({ catalogId: "unrelated-catalog", text: "Frami Xlife" })).toBeNull();
      const filtration = require("../../src/lib/estimate/v4/filtrationStationPromptR1");
      const waterPrompts = [
        [require("../../src/lib/estimate/v4/chlorinationStationPromptR1"), "CHLORINATION_STATION_CATALOG_ID", "parseChlorinationStationOrdinaryPromptR1", "canonical-work:expanded:chlorination_station", "Доза 2,5 мг/л", {chl_design_dose_mg_l: "2.5"}],
        [require("../../src/lib/estimate/v4/flushingDisinfectionPromptR1"), "FLUSHING_DISINFECTION_CATALOG_ID", "parseFlushingDisinfectionOrdinaryPromptR1", "canonical-work:expanded:flushing_disinfection", "Внутренний диаметр 130,8 мм", {fld_pipeline_internal_diameter_mm: "130.8"}],
        [require("../../src/lib/estimate/v4/pressurePipelinePromptR1"), "PRESSURE_PIPELINE_CATALOG_ID", "parsePressurePipelineOrdinaryPromptR1", "canonical-work:expanded:pressure_pipeline", "120 м", {ppl_route_length_m: "120"}],
        [require("../../src/lib/estimate/v4/pressureSewerPipelinePromptR1"), "PRESSURE_SEWER_PIPELINE_CATALOG_ID", "parsePressureSewerPipelineOrdinaryPromptR1", "canonical-work:expanded:pressure_sewer_pipeline", "120 метров", {psp_route_length_m: "120"}],
        [require("../../src/lib/estimate/v4/reservoirCleanWaterPromptR1"), "RESERVOIR_CLEAN_WATER_CATALOG_ID", "parseReservoirCleanWaterOrdinaryPromptR1", "canonical-work:expanded:reservoir_clean_water", "2 резервуара", {rcw_reservoir_count: "2"}],
      ] as const;
      for (const [module, id, parser, expectedId, prompt, expected] of waterPrompts) {
        expect(module[id]).toBe(expectedId);
        expect(module[parser](prompt)).toEqual(expected);
        expect(module[parser]("Данные объекта не указаны.")).toEqual({});
      }

      const ricsIdentity = require("../../src/lib/estimate/contracts/ricsNrm2FormworkProfileIdentityV1");
      const rebarIdentity = require("../../src/lib/estimate/contracts/reinforcementBarScheduleProfileIdentityV1");
      const rics = require("../../src/lib/estimate/ownedDomain/formworkRicsNrm2PromptParametersV1");
      const rebar = require("../../src/lib/estimate/ownedDomain/reinforcementBarSchedulePromptParametersV1");
      expect(filtration.FILTRATION_STATION_CATALOG_ID)
        .toBe("canonical-work:expanded:filtration_station");
      expect(filtration.parseFiltrationStationOrdinaryPromptR1(""))
        .toEqual({});
      expect(ricsIdentity.RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID)
        .toBe("standard-profile:rics-nrm2:formwork-measured-contact-area:v1");
      expect(rebarIdentity.REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID)
        .toBe("project-profile:approved-reinforcement-bar-schedule:fhwa-rics:v1");
      expect(rics.extractRicsNrm2FormworkCanonicalParametersV1("Опалубка по RICS NRM 2"))
        .toEqual({ product_profile_id: ricsIdentity.RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID });
      expect(rebar.extractReinforcementBarScheduleCanonicalParametersV1("Арматура по ведомости стержней FHWA-HIF-16-026"))
        .toEqual({ product_profile_id: rebarIdentity.REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID });
    });
  } finally {
    for (const modulePath of forbiddenModules) jest.dontMock(modulePath);
    jest.resetModules();
  }
});
