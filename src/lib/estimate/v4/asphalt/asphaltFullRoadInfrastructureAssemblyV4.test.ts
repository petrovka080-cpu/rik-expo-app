import {
  FULL_ROAD_INFRASTRUCTURE_FASTENER_OWNERSHIP_V4,
  FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4,
  FULL_ROAD_INFRASTRUCTURE_REQUIRED_ROW_IDS_V4,
  FULL_ROAD_INFRASTRUCTURE_ROW_IDS_BY_GROUP_V4,
} from "./asphaltFullRoadInfrastructureAssemblyV4";
import {
  GREEN_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_EXPANDED_PROFESSIONAL_BOQ_END_TO_END_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_AND_ESTIMATOR_REVIEW_NO_RELEASE,
  auditFullRoadInfrastructurePhase1DV4,
} from "./auditFullRoadInfrastructurePhase1DV4";
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
    drainageMaterialsMissing: groupMissing(["drainage"]),
    markingMaterialsMissing: groupMissing(["marking"]),
    signMaterialsMissing: groupMissing(["sign"]),
    signFoundationMaterialsMissing: groupMissing(["sign_foundation"]),
    barrierMaterialsMissing: groupMissing(["barrier"]),
    lightingMaterialsMissing: groupMissing(["lighting"]),
    fastenerOwnershipErrors: Object.entries(FULL_ROAD_INFRASTRUCTURE_FASTENER_OWNERSHIP_V4).filter(([rowId, group]) =>
      byId.has(rowId) && byId.get(rowId)?.definition.cost_ownership_id !== `infra:${group}:${rowId}`
    ).length,
    quantityMissing: rows.filter((row) => !Number.isFinite(row.quantity) || row.quantity <= 0).length,
    unitMissing: materialRows.filter((row) => !row.definition.unit_id).length,
    formulaMissing: materialRows.filter((row) => !row.definition.formula_id || !row.definition.explanation_trace_ru).length,
    sourceMissing: materialRows.filter((row) => !row.definition.source_id).length,
    genericMaterialNames: materialRows.filter((row) => /^(?:материалы?|товары?|оборудование|комплект|прочее)$/iu.test(row.definition.professional_name_ru)).length,
    internalTokensVisible: materialRows.filter((row) => /\b(?:new_full_road_infrastructure|storm_pipe_|lighting_|sign_)\b/iu.test(`${row.definition.professional_name_ru} ${row.definition.technical_specification_ru}`)).length,
    duplicateMaterialOwnership: materialRows.length - new Set(materialRows.map((row) => row.definition.cost_ownership_id)).size,
    procurementParityFailures: materialRows.filter((row) => row.included_in_procurement).filter((row) => {
      const procurement = procurementByResource.get(row.definition.row_id);
      return !procurement || procurement.quantity !== row.quantity || procurement.unit_id !== row.definition.unit_id || procurement.specification_ru !== row.definition.technical_specification_ru;
    }).length,
    unrequestedOptionalRows: rows.filter((row) => /^(?:curb_|storm_|culvert_|traffic_signal_|bus_stop_|restoration_)/u.test(row.definition.row_id)).length,
  };

  expect(compilation.preliminary_assembly_policy.profile_id).toBe("new_full_road_infrastructure");
  expect(compilation.preliminary_assembly_policy.public_scope_id).toBe("NEW_FULL_ROAD_INFRASTRUCTURE");
  expect(compilation.preliminary_assembly_policy.assembly_id).toBe("new_full_road_infrastructure_preliminary_v1");
  expect(compilation.quantity_basis).toEqual(expect.objectContaining({ length_m: 3000, width_m: 32, area_m2: 96000 }));
  expect(rows.length).toBeGreaterThan(300);
  expect(["drainage", "marking", "sign", "sign_foundation", "barrier", "lighting"].flatMap((group) =>
    FULL_ROAD_INFRASTRUCTURE_ROW_IDS_BY_GROUP_V4[group as keyof typeof FULL_ROAD_INFRASTRUCTURE_ROW_IDS_BY_GROUP_V4]
  ).every((rowId) => byId.has(rowId))).toBe(true);
  expect(materialRows.length).toBeGreaterThan(100);
  expect(compilation.passport.procurement_lines.length).toBeGreaterThan(100);
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

test("public asphalt catalog wording resolves to the complete accepted road baseline", () => {
  const compilation = compileAsphaltProfessionalEstimateV4({
    raw_text: "Дороги, транспорт и площадки: асфальтобетонное дорожное покрытие — полное строительство автомобильной дороги с водоотводом, дорожными знаками, разметкой, барьерным ограждением и освещением, длина 3000 м, ширина 32 м",
  });

  expect(compilation.preliminary_assembly_policy.profile_id).toBe("new_full_road_infrastructure");
  expect(compilation.quantity_basis).toEqual(expect.objectContaining({
    basis_type: "project",
    length_m: 3000,
    width_m: 32,
    area_m2: 96000,
  }));
  expect(compilation.compiled_rows.length).toBeGreaterThan(300);
  expect(compilation.passport.procurement_lines.length).toBeGreaterThan(100);
  expect(compilation.compiled_rows.some((row) => row.definition.row_id === "geotextile_material")).toBe(false);
  expect(["15", "19", "20", "21", "22", "23", "24"].every((wbs) =>
    compilation.compiled_rows.some((row) => row.definition.wbs_code === wbs))).toBe(true);
  expect(["06", "07", "13", "14", "16", "17", "18", "25", "26", "27"].every((wbs) =>
    !compilation.compiled_rows.some((row) => row.definition.wbs_code === wbs))).toBe(true);
  expect(compilation.compiled_rows.every((row) => Number.isFinite(row.quantity) && row.quantity > 0)).toBe(true);
});

test("an explicit clarification can disable one default infrastructure subassembly without changing UI structure", () => {
  const compilation = compileAsphaltProfessionalEstimateV4({
    raw_text: ACCEPTANCE_PROMPT,
    parameter_overrides: { lighting_required: { value: false, source: "edited_by_user" } },
  });
  expect(compilation.preliminary_assembly_policy.profile_id).toBe("new_full_road_infrastructure");
  expect(compilation.compiled_rows.some((row) => row.definition.row_id.startsWith("lighting_"))).toBe(false);
  expect(compilation.compiled_rows.some((row) => row.definition.row_id === "storm_pipe")).toBe(false);
});

test("a bare or forged reference SHA cannot convert preliminary factors into accepted M1 evidence", () => {
  const compilation = compileAsphaltProfessionalEstimateV4({
    raw_text: ACCEPTANCE_PROMPT,
    parameter_overrides: {
      asphalt_reference_design_id: "forged-reference",
      asphalt_reference_design_sha256: "a".repeat(64),
    },
  });
  const sources = compilation.passport.formulas.flatMap((formula) => formula.source_ids);
  expect(compilation.compiled_rows.filter((row) => row.definition.specification_status === "SOURCE_CONFIRMED")).toHaveLength(0);
  expect(sources.some((source) => source.startsWith("engineering_assumption:"))).toBe(true);
  expect(sources.some((source) => source.startsWith("benchmark_fixture:"))).toBe(false);
});

test("full-road rows use the public 30-section WBS without legacy numeric collisions", () => {
  const compilation = compileAsphaltProfessionalEstimateV4({ raw_text: ACCEPTANCE_PROMPT });
  const wbsByRowId = new Map(compilation.compiled_rows.map((row) => [row.definition.row_id, row.definition.wbs_code]));
  expect(Object.fromEntries([
    "temporary_traffic_management",
    "subgrade_excavation",
    "sand_material",
    "crushed_layer_1_material",
    "base_emulsion_material",
    "asphalt_layer_1_material",
    "joint_sealing_application",
    "drainage_tray",
    "marking_road_paint",
    "sign_warning_panel",
    "barrier_galvanized_beam",
    "lighting_pole",
    "lighting_power_cable",
    "lighting_ground_electrodes",
    "asphalt_compaction_control",
    "execution_documentation",
    "asphalt_layer_1_delivery",
  ].map((rowId) => [rowId, wbsByRowId.get(rowId)]))).toEqual({
    temporary_traffic_management: "04",
    subgrade_excavation: "05",
    sand_material: "08",
    crushed_layer_1_material: "09",
    base_emulsion_material: "10",
    asphalt_layer_1_material: "11",
    joint_sealing_application: "12",
    drainage_tray: "15",
    marking_road_paint: "19",
    sign_warning_panel: "20",
    barrier_galvanized_beam: "21",
    lighting_pole: "22",
    lighting_power_cable: "23",
    lighting_ground_electrodes: "24",
    asphalt_compaction_control: "28",
    execution_documentation: "29",
    asphalt_layer_1_delivery: "30",
  });
  expect(["curb_stone_material", "storm_pipe", "culvert_reinforced_concrete_pipe", "storm_inlet_body", "traffic_signal_vehicle_head", "bus_stop_shelters", "restoration_topsoil"].every((rowId) => !wbsByRowId.has(rowId))).toBe(true);
  expect(compilation.compiled_rows.every((row) =>
    row.definition.parent_wbs_id === `wbs:${row.definition.wbs_code}`
  )).toBe(true);
});

test("full-road quantities scale across the four Phase 1D acceptance geometries", () => {
  const geometries = [
    [100, 7],
    [1000, 14],
    [3000, 32],
    [10000, 32],
  ] as const;
  const compilations = geometries.map(([length, width]) => compileAsphaltProfessionalEstimateV4({
    raw_text: `Полное строительство автомобильной дороги длиной ${length} м, шириной ${width} м`,
  }));
  const scalableCategories = ["MATERIAL", "WORK", "LABOR", "MACHINERY", "LOGISTICS", "LAB_CONTROL"] as const;
  const totalFor = (index: number, category: typeof scalableCategories[number]) => compilations[index].compiled_rows
    .filter((row) => row.definition.professional_category === category)
    .reduce((sum, row) => sum + row.quantity, 0);

  for (const category of scalableCategories) {
    const totals = compilations.map((_, index) => totalFor(index, category));
    expect(totals.every((value, index) => index === 0 || value > totals[index - 1])).toBe(true);
  }
  for (const compilation of compilations) {
    expect(compilation.compiled_rows.filter((row) =>
      ["pcs", "trip", "test", "document", "service"].includes(row.definition.unit_id ?? "")
    ).every((row) => Number.isInteger(row.quantity) && row.quantity > 0)).toBe(true);
  }
});

test("Phase 1D professional blocker audit and eight-column WBS matrix are green", () => {
  const compilation = compileAsphaltProfessionalEstimateV4({ raw_text: ACCEPTANCE_PROMPT });
  const audit = auditFullRoadInfrastructurePhase1DV4(compilation);
  expect(audit.status).toBe(
    GREEN_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_EXPANDED_PROFESSIONAL_BOQ_END_TO_END_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_AND_ESTIMATOR_REVIEW_NO_RELEASE,
  );
  expect(audit.matrix).toHaveLength(30);
  expect(audit.matrix.every((section) =>
    Object.values(section.columns).every((cell) => cell.status !== "BLOCKED")
  )).toBe(true);
  expect(Object.values(audit.counters).every((value) => value === 0)).toBe(true);
});
