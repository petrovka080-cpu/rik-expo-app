import {
  PARKING_SCOPE_SELECTION_QUESTION_RU,
  asphaltScopeSelectionQuestionForIntentV5,
  resolveRoadEstimateScopeV4,
  type ParkingScopeIdV5,
} from "../../src/lib/estimate/v4/asphalt/roadScopeTruthV4";
import {
  compileEstimateFromResolvedRoadIntentV4,
  createResolvedRoadEstimateIntentV4,
} from "../../src/lib/estimate/v4/asphalt/compileEstimateFromResolvedRoadIntentV4";
import { auditAsphaltParkingMaterialScenariosV5 } from "../../src/lib/estimate/v4/asphalt/asphaltParkingMaterialCompletenessV5";

const EXPECTED_PROFILE: Readonly<Record<ParkingScopeIdV5, string>> = {
  NEW_PARKING_FULL_CONSTRUCTION: "parking_full_construction",
  PAVEMENT_ON_CONFIRMED_PREPARED_BASE: "parking_surfacing_only",
  OVERLAY_EXISTING_PAVEMENT: "overlay_on_existing_pavement",
  LOCAL_REPAIR_OR_MILLING: "local_patch_repair",
};

function compileParking(scope: ParkingScopeIdV5) {
  const resolution = resolveRoadEstimateScopeV4({
    originalText: "Парковка площадью 657 м²",
    requestedCatalogWorkId: "asphalt_concrete_pavement",
    selectedScopeId: scope,
  });
  const intent = createResolvedRoadEstimateIntentV4({
    resolution,
    requestId: `parking-${scope}`,
    resolutionOrigin: "USER_SELECTION",
    resolverVersion: "road-scope-resolver-v4.1.0",
  });
  return compileEstimateFromResolvedRoadIntentV4({ resolvedIntent: intent });
}

describe("FINAL R5 parking scope selector and material boundaries", () => {
  it("does not infer prepared base or full construction from a bare parking area", () => {
    const resolution = resolveRoadEstimateScopeV4({
      originalText: "Парковка 657 м²",
      requestedCatalogWorkId: "asphalt_concrete_pavement",
    });
    expect(resolution.resolverStatus).toBe("NEEDS_SCOPE_SELECTION");
    expect(resolution.selectedScopeId).toBeNull();
    expect(resolution.evidence).toEqual(expect.arrayContaining([
      "parking_scope_not_explicit",
      "prepared_base_not_assumed",
    ]));
    expect(asphaltScopeSelectionQuestionForIntentV5("Парковка 657 м²")).toBe(PARKING_SCOPE_SELECTION_QUESTION_RU);
    expect(PARKING_SCOPE_SELECTION_QUESTION_RU.options.map((option) => option.scopeId)).toEqual([
      "NEW_PARKING_FULL_CONSTRUCTION",
      "PAVEMENT_ON_CONFIRMED_PREPARED_BASE",
      "OVERLAY_EXISTING_PAVEMENT",
      "LOCAL_REPAIR_OR_MILLING",
    ]);
  });

  it.each([
    ["Построить новую парковку площадью 657 м²", "NEW_PARKING_FULL_CONSTRUCTION"],
    ["Уложить асфальт парковки 657 м² по готовому основанию", "PAVEMENT_ON_CONFIRMED_PREPARED_BASE"],
    ["Обновить парковку новым слоем поверх существующего покрытия 657 м²", "OVERLAY_EXISTING_PAVEMENT"],
    ["Локальный ремонт парковки картами 657 м²", "LOCAL_REPAIR_OR_MILLING"],
  ] as const)("resolves explicit parking intent %s", (originalText, expected) => {
    expect(resolveRoadEstimateScopeV4({
      originalText,
      requestedCatalogWorkId: "asphalt_concrete_pavement",
    }).selectedScopeId).toBe(expected);
  });

  it.each(Object.keys(EXPECTED_PROFILE) as ParkingScopeIdV5[])(
    "compiles the selected parking scope %s at exact area 657",
    (scope) => {
      const compilation = compileParking(scope);
      expect(compilation.quantity_basis.area_m2).toBe(657);
      expect(compilation.preliminary_assembly_policy.profile_id).toBe(EXPECTED_PROFILE[scope]);
      expect(compilation.compiled_rows.length).toBeGreaterThan(0);
      expect(compilation.compile_blockers).toEqual([]);
    },
  );

  it("includes a full base for new parking but excludes unconfirmed geotextile and conditional infrastructure", () => {
    const fullIds = new Set(compileParking("NEW_PARKING_FULL_CONSTRUCTION").compiled_rows.map((row) => row.definition.row_id));
    expect(fullIds.has("sand_material")).toBe(true);
    expect(fullIds.has("crushed_layer_1_material")).toBe(true);
    expect(fullIds.has("crushed_layer_2_material")).toBe(true);
    expect(fullIds.has("asphalt_layer_1_material")).toBe(true);
    expect(fullIds.has("asphalt_layer_2_material")).toBe(true);
    expect(fullIds.has("geotextile_material")).toBe(false);
    expect(fullIds.has("curb_material")).toBe(false);
    expect(fullIds.has("drainage_material")).toBe(false);
    expect(fullIds.has("road_marking")).toBe(false);
  });

  it("keeps prepared-base, overlay and repair profiles free of invented full-road layers", () => {
    for (const scope of [
      "PAVEMENT_ON_CONFIRMED_PREPARED_BASE",
      "OVERLAY_EXISTING_PAVEMENT",
      "LOCAL_REPAIR_OR_MILLING",
    ] as const) {
      const ids = new Set(compileParking(scope).compiled_rows.map((row) => row.definition.row_id));
      expect(ids.has("sand_material")).toBe(false);
      expect(ids.has("crushed_layer_1_material")).toBe(false);
      expect(ids.has("geotextile_material")).toBe(false);
      expect(ids.has("topsoil_stripping")).toBe(false);
    }
  });

  it("passes the versioned material-completeness contract for all four 657 m² scenarios", () => {
    const audit = auditAsphaltParkingMaterialScenariosV5();
    expect(audit).toMatchObject({
      scope_selector: 4,
      complete: 4,
      missing_required_roles: 0,
      unexpected_roles: 0,
      duplicate_material_owners: 0,
      unknown_material_rows: 0,
    });
    expect(audit.scenarios.map((scenario) => scenario.area_m2)).toEqual([657, 657, 657, 657]);
    expect(new Set(audit.scenarios.map((scenario) => scenario.scenarioHash)).size).toBe(4);
  });
});
