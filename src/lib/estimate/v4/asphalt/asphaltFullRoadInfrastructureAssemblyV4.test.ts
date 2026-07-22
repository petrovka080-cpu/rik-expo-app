import {
  FULL_ROAD_INFRASTRUCTURE_FASTENER_OWNERSHIP_V4,
  FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4,
  FULL_ROAD_INFRASTRUCTURE_REQUIRED_ROW_IDS_V4,
} from "./asphaltFullRoadInfrastructureAssemblyV4";
import {
  FULL_ROAD_EXPANDED_INFORMATIONAL_COMPONENT_ROW_IDS_V4,
  FULL_ROAD_EXPANDED_REQUIRED_MATERIAL_ROW_IDS_V4,
  FULL_ROAD_EXPANDED_REQUIRED_ROW_IDS_V4,
  FULL_ROAD_EXPANDED_WBS_V4,
} from "./asphaltFullRoadExpandedBoqV4";
import { compileAsphaltProfessionalEstimateV4 } from "./compileAsphaltProfessionalEstimateV4";
import { validateAsphaltWorkAssemblyCoverageV4 } from "./validateAsphaltWorkAssemblyCoverageV4";

const ACCEPTANCE_PROMPT = "Полное строительство автомобильной дороги с водоотводом, дорожными знаками, разметкой, барьерным ограждением и освещением, длина 3000 м, ширина 32 м";

test("NEW_FULL_ROAD_INFRASTRUCTURE compiles the complete 3000 × 32 assembly with green material and quantity gates", () => {
  const compilation = compileAsphaltProfessionalEstimateV4({ raw_text: ACCEPTANCE_PROMPT });
  const rows = compilation.compiled_rows;
  const byId = new Map(rows.map((row) => [row.definition.row_id, row]));
  const materialRows = rows.filter((row) => ["MATERIAL", "EQUIPMENT"].includes(row.definition.professional_category ?? ""));
  const procurementByResource = new Map(compilation.passport.procurement_lines.map((line) => [line.resource_id.replace(/^resource:/u, ""), line]));
  const requiredPavementMaterials = [
    "geotextile_material",
    "sand_material",
    "crushed_layer_1_material",
    "crushed_layer_2_material",
    "base_emulsion_material",
    "asphalt_layer_1_material",
    "emulsion_interface_1_2",
    "asphalt_layer_2_material",
    "emulsion_interface_2_3",
    "asphalt_layer_3_material",
    "joint_sealing_material",
  ];
  const groupMissing = (groups: (keyof typeof FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4)[]) => groups
    .flatMap((group) => FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4[group])
    .filter((rowId) => !byId.has(rowId)).length;
  const counters = {
    pavementMaterialsMissing: requiredPavementMaterials.filter((rowId) => !byId.has(rowId)).length,
    curbMaterialsMissing: groupMissing(["curb"]),
    drainageMaterialsMissing: groupMissing(["drainage", "storm_inlet"]),
    stormSewerMaterialsMissing: groupMissing(["storm_pipe", "storm_well"]),
    markingMaterialsMissing: groupMissing(["marking"]),
    signMaterialsMissing: groupMissing(["sign"]),
    signFoundationMaterialsMissing: groupMissing(["sign_foundation"]),
    barrierMaterialsMissing: groupMissing(["barrier"]),
    lightingMaterialsMissing: groupMissing(["lighting"]),
    expandedRowsMissing: FULL_ROAD_EXPANDED_REQUIRED_ROW_IDS_V4.filter((rowId) => !byId.has(rowId)).length,
    expandedMaterialsMissing: FULL_ROAD_EXPANDED_REQUIRED_MATERIAL_ROW_IDS_V4.filter((rowId) => !byId.has(rowId)).length,
    wbsSectionsMissing: Object.keys(FULL_ROAD_EXPANDED_WBS_V4).filter((wbs) => !rows.some((row) => row.definition.wbs_code === wbs)).length,
    fastenerOwnershipErrors: Object.entries(FULL_ROAD_INFRASTRUCTURE_FASTENER_OWNERSHIP_V4).filter(([rowId, group]) => byId.get(rowId)?.definition.cost_ownership_id !== `infra:${group}:${rowId}`).length,
    quantityMissing: rows.filter((row) => !Number.isFinite(row.quantity) || row.quantity <= 0).length,
    unitMissing: materialRows.filter((row) => !row.definition.unit_id).length,
    formulaMissing: materialRows.filter((row) => !row.definition.formula_id || !row.definition.explanation_trace_ru).length,
    sourceOrAssumptionMissing: materialRows.filter((row) => !row.definition.source_id || row.assumption_ids.length === 0).length,
    genericMaterialNames: materialRows.filter((row) => /^(?:материалы?|товары?|оборудование|комплект|прочее)$/iu.test(row.definition.professional_name_ru)).length,
    internalTokensVisible: materialRows.filter((row) => /\b(?:new_full_road_infrastructure|storm_pipe_|lighting_|sign_)\b/iu.test(`${row.definition.professional_name_ru} ${row.definition.technical_specification_ru}`)).length,
    duplicateMaterialOwnership: materialRows.length - new Set(materialRows.map((row) => row.definition.cost_ownership_id)).size,
    procurementParityFailures: materialRows.filter((row) => row.included_in_procurement).filter((row) => {
      const procurement = procurementByResource.get(row.definition.row_id);
      return !procurement || procurement.quantity !== row.quantity || procurement.unit_id !== row.definition.unit_id || procurement.specification_ru !== row.definition.technical_specification_ru;
    }).length,
    informationalComponentsInProcurement: FULL_ROAD_EXPANDED_INFORMATIONAL_COMPONENT_ROW_IDS_V4.filter((rowId) => byId.get(rowId)?.included_in_procurement === true).length,
  };

  expect(compilation.preliminary_assembly_policy.profile_id).toBe("new_full_road_infrastructure");
  expect(compilation.preliminary_assembly_policy.public_scope_id).toBe("NEW_FULL_ROAD_INFRASTRUCTURE");
  expect(compilation.preliminary_assembly_policy.assembly_id).toBe("new_full_road_infrastructure_preliminary_v1");
  expect(compilation.quantity_basis).toEqual(expect.objectContaining({ length_m: 3000, width_m: 32, area_m2: 96000 }));
  expect(rows.length).toBeGreaterThan(600);
  expect(FULL_ROAD_INFRASTRUCTURE_REQUIRED_ROW_IDS_V4.every((rowId) => byId.has(rowId))).toBe(true);
  expect(FULL_ROAD_EXPANDED_REQUIRED_ROW_IDS_V4.every((rowId) => byId.has(rowId))).toBe(true);
  expect(materialRows.length).toBeGreaterThan(250);
  expect(compilation.passport.procurement_lines.length).toBeGreaterThan(250);
  expect(Object.values(counters).every((value) => value === 0)).toBe(true);
  expect(compilation.formula_dimension_blockers).toEqual([]);
  expect(compilation.category_unit_blockers).toEqual([]);
  expect(compilation.compile_blockers).toEqual([]);
  expect(validateAsphaltWorkAssemblyCoverageV4(compilation)).toEqual(expect.objectContaining({
    status: "GREEN_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4",
    manifest_coverage_ratio: 1,
    counters: expect.objectContaining({ required_wbs_rows_missing: 0, quantity_non_positive: 0, double_cost_ownership: 0 }),
  }));
});

test("full-road infrastructure assumptions are visible, source-backed, dependent and editable", () => {
  const before = compileAsphaltProfessionalEstimateV4({ raw_text: ACCEPTANCE_PROMPT });
  const requiredAssumptions = [
    "curb_length_m",
    "storm_inlet_spacing_m",
    "storm_pipe_diameter_mm",
    "storm_pipe_length_m",
    "storm_well_spacing_m",
    "road_marking_area_m2",
    "road_marking_rate_kg_m2",
    "road_marking_beads_rate_kg_m2",
    "traffic_signs_per_km",
    "guardrail_length_m",
    "lighting_pole_spacing_m",
    "lighting_luminaire_power_w",
    "lighting_cable_length_m",
    "lighting_cabinet_count",
  ];
  const assumptions = new Map(before.preliminary_assembly_policy.assumptions.map((assumption) => [assumption.canonical_key, assumption]));
  expect(requiredAssumptions.every((key) => {
    const assumption = assumptions.get(key);
    return Boolean(assumption?.source_id.startsWith("engineering_assumption:") && assumption.affected_row_ids.length > 0);
  })).toBe(true);

  const after = compileAsphaltProfessionalEstimateV4({
    raw_text: ACCEPTANCE_PROMPT,
    parameter_overrides: {
      lighting_pole_spacing_m: { value: 50, source: "edited_by_user" },
      lighting_cable_length_m: { value: 7200, source: "edited_by_user" },
    },
  });
  const quantity = (compilation: typeof before, rowId: string) => compilation.compiled_rows.find((row) => row.definition.row_id === rowId)?.quantity;
  expect(quantity(after, "lighting_pole")).toBeLessThan(quantity(before, "lighting_pole") ?? 0);
  expect(quantity(after, "lighting_power_cable")).toBe(7200);
  expect(after.preliminary_assembly_policy.assumptions.some((assumption) => assumption.canonical_key === "lighting_pole_spacing_m")).toBe(false);
});

test("scope separation keeps surfacing and pavement-only requests free of external road infrastructure", () => {
  const surfacing = compileAsphaltProfessionalEstimateV4({ raw_text: "Устройство асфальтобетонного покрытия по готовому основанию 1000 м²" });
  const pavement = compileAsphaltProfessionalEstimateV4({ raw_text: "Полное строительство дорожной одежды без внешней инфраструктуры 1000 м²" });
  const plainFullRoad = compileAsphaltProfessionalEstimateV4({ raw_text: "Полное строительство автомобильной дороги 1000 м²" });
  const infrastructureIds = new Set(FULL_ROAD_INFRASTRUCTURE_REQUIRED_ROW_IDS_V4);
  expect(surfacing.preliminary_assembly_policy.profile_id).toBe("surfacing_on_prepared_base");
  expect(pavement.preliminary_assembly_policy.profile_id).toBe("new_full_road_pavement");
  expect(plainFullRoad.preliminary_assembly_policy.profile_id).toBe("new_full_road_infrastructure");
  expect(surfacing.compiled_rows.some((row) => infrastructureIds.has(row.definition.row_id))).toBe(false);
  expect(pavement.compiled_rows.some((row) => infrastructureIds.has(row.definition.row_id))).toBe(false);
  expect(plainFullRoad.compiled_rows.every((row) => row.quantity > 0)).toBe(true);
});

test("an explicit clarification can disable one default infrastructure subassembly without changing UI structure", () => {
  const compilation = compileAsphaltProfessionalEstimateV4({
    raw_text: ACCEPTANCE_PROMPT,
    parameter_overrides: { lighting_required: { value: false, source: "edited_by_user" } },
  });
  expect(compilation.preliminary_assembly_policy.profile_id).toBe("new_full_road_infrastructure");
  expect(compilation.compiled_rows.some((row) => row.definition.row_id.startsWith("lighting_"))).toBe(false);
  expect(compilation.compiled_rows.some((row) => row.definition.row_id === "storm_pipe")).toBe(true);
});
