import {
  ASPHALT_SURFACE_DRAINAGE_CATALOG_ID,
  ASPHALT_SURFACE_DRAINAGE_INPUTS,
  ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT,
  ASPHALT_SURFACE_DRAINAGE_ROWS,
  buildAsphaltSurfaceDrainageContentPassportR3,
  compileAsphaltSurfaceDrainageEstimate,
  type AsphaltSurfaceDrainageInputValue,
} from "../../scripts/estimate/drainageBackendR4/asphaltSurfaceDrainageR1";
import { auditRealProfessionalRowsR1 } from "../../scripts/estimate/concreteBackendR6/realProfessionalEstimateContentGateR1";
import {
  parseR4A10AsphaltDrainagePrompt,
  R4_A10_ASPHALT_DRAINAGE_CATALOG_ID,
} from "../../src/lib/estimate/r4A10AsphaltDrainagePrompt";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { validateCanonicalEstimateParameterInputs } from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";

const USER_FRAGMENT = "водоотвод для асфальтового покрытия на большой площади";
const FULL_LINEAR_PROMPT = `${USER_FRAGMENT}; тип системы: линейный лоток; проектная длина трассы 180 м; проектный продольный уклон 0,8%; ширина траншеи 0,6 м; средняя глубина траншеи 0,5 м; материал подготовки: щебень; толщина подготовки 0,1 м; плотность материала подготовки 1,6 т/м3; расстояние доставки материала подготовки 12 км; сечение обратной засыпки 0,18 м2; привозная обратная засыпка: да; материал обратной засыпки: песок; плотность привозного материала обратной засыпки 1,65 т/м3; расстояние доставки обратной засыпки 14 км; количество подключений к выпуску 2 шт; выпуск подтвержден; вывоз грунта: да; объем вывоза грунта 10,8 м3; плотность грунта 1,8 т/м3; расстояние вывоза грунта 20 км; доставка отдельно: да; транспортная масса системы 18 т; расстояние доставки системы 30 км; модель экскаватора E35; производительность экскаватора 25 м3/ч; модель траншейного уплотнителя DPU 6555; производительность траншейного уплотнителя 12 м3/ч; восстановление асфальта: нет; сечение лотка DN200; класс нагрузки лотка D400; длина модуля лотка 1 м; длина решетки 0,5 м; сечение бетонного основания и обоймы лотка 0,08 м2; расход герметика на стык лотка 0,12 кг/стык; крепеж на одну решетку 2 шт; пескоуловителей 6 шт; длина одного пескоуловителя 1 м; расстояние доставки бетона лотков 18 км`;

function catalog(): CanonicalEstimateCatalogItem {
  return {
    catalogId: ASPHALT_SURFACE_DRAINAGE_CATALOG_ID,
    releaseId: "00000000-0000-5000-8000-000000000009",
    namespace: "global",
    domain: "roadworks_drainage",
    workKey: "asphalt_surface_drainage",
    titleRu: "Устройство системы водоотвода асфальтированного покрытия",
    definitionVersion: 1,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: ASPHALT_SURFACE_DRAINAGE_INPUTS.map((parameter, ordinal) => ({
      parameterId: parameter.parameterId,
      ordinal,
      valueType: parameter.valueType,
      unitId: parameter.unitId,
      titleRu: parameter.titleRu,
      required: parameter.requiredWhen == null ? parameter.required : false,
      defaultValue: parameter.defaultValue,
      constraints: {
        ...(parameter.choices ? { values: [...parameter.choices] } : {}),
        ...(parameter.minimum != null ? { min: parameter.minimum } : {}),
        ...(parameter.maximum != null ? { max: parameter.maximum } : {}),
        ...(parameter.requiredWhen ? { requiredWhen: parameter.requiredWhen } : {}),
      },
      visibilityRole: parameter.visibilityRole,
      valueSourceRole: parameter.sourceRole === "SELECTED_EQUIPMENT_PASSPORT"
        ? "MANUFACTURER_CONFIRMED"
        : parameter.sourceRole,
    })),
  };
}

function commonWithoutLinear(): Record<string, AsphaltSurfaceDrainageInputValue> {
  return Object.fromEntries(Object.entries(ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT)
    .filter(([key]) => !key.startsWith("tray_") && key !== "concrete_delivery_distance_km"));
}

function preliminaryPlanState(prompt: string) {
  const definition = catalog();
  const plan = buildCanonicalBaselinePlan({ catalog: definition, prompt });
  const validation = validateCanonicalEstimateParameterInputs({
    schema: definition.parameterSchema,
    rawInputs: plan.parameters,
  });
  return {
    plan,
    missingParameterIds: validation.issues
      .filter((issue) => issue.code === "REQUIRED" || issue.code === "REQUIRED_WHEN")
      .map((issue) => issue.parameterId),
  };
}

describe("R4-A10 asphalt surface drainage canonical owner", () => {
  test("keeps unresolved geometry visible and never converts asphalt area into drainage geometry", () => {
    expect(parseR4A10AsphaltDrainagePrompt(USER_FRAGMENT)).toEqual({});
    expect(parseR4A10AsphaltDrainagePrompt(`${USER_FRAGMENT} 10000 м2`)).toEqual({});
    const state = preliminaryPlanState(`${USER_FRAGMENT} 10000 м2`);
    expect(state.plan.parameters).toEqual({});
    expect(state.plan.primaryMeasureParameterId).toBe("route_length_m");
    expect(state.missingParameterIds).toEqual(expect.arrayContaining([
      "system_type",
      "route_length_m",
      "design_slope_percent",
    ]));
    expect(state.missingParameterIds).not.toContain("tray_nominal_size");
    expect(state.missingParameterIds).not.toContain("drain_pipe_nominal_size");
    expect(state.missingParameterIds).not.toContain("storm_pipe_nominal_size");
  });

  test("recognizes an explicitly named drainage technology without requiring a 'system type' prefix", () => {
    expect(parseR4A10AsphaltDrainagePrompt("линейный поверхностный водоотвод 25 м"))
      .toEqual({ system_type: "linear_tray", route_length_m: "25" });
    expect(parseR4A10AsphaltDrainagePrompt("подземный дренаж 25 м"))
      .toEqual({ system_type: "subsurface_drain", route_length_m: "25" });
    expect(parseR4A10AsphaltDrainagePrompt("ливневая канализация 25 м"))
      .toEqual({ system_type: "storm_sewer", route_length_m: "25" });
    expect(parseR4A10AsphaltDrainagePrompt("водоотвод 25 м"))
      .toEqual({ route_length_m: "25" });
  });

  test("accepts one typoed linear-metre primary measure and keeps remaining P0 needs visible", () => {
    const prompt = "Устройство системы водоотвода асфальтированного покрытия 100 метроа";
    expect(parseR4A10AsphaltDrainagePrompt(prompt)).toEqual({ route_length_m: "100" });
    expect(parseR4A10AsphaltDrainagePrompt(`${prompt}; ещё 2 метра`)).toEqual({});
    const state = preliminaryPlanState(prompt);
    expect(state.plan.parameters).toMatchObject({ route_length_m: "100" });
    expect(state.missingParameterIds).toEqual(expect.arrayContaining([
      "system_type",
      "design_slope_percent",
    ]));
    expect(state.missingParameterIds).not.toContain("route_length_m");
  });

  test("keeps needs limited to the selected drainage branch", () => {
    const state = preliminaryPlanState(
      `${USER_FRAGMENT}; система: линейные лотки; проектная длина трассы 100 м`,
    );
    expect(state.missingParameterIds).toContain("tray_nominal_size");
    expect(state.missingParameterIds).not.toContain("drain_pipe_nominal_size");
    expect(state.missingParameterIds).not.toContain("storm_pipe_nominal_size");
  });

  test("parses an explicitly labelled full linear-tray scheme and fixes the primary measure at route length", () => {
    const parsed = parseR4A10AsphaltDrainagePrompt(FULL_LINEAR_PROMPT);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(), prompt: FULL_LINEAR_PROMPT });

    expect(plan.primaryMeasureParameterId).toBe("route_length_m");
    expect(parsed).toEqual(plan.parameters);
    expect(Object.keys(parsed)).toHaveLength(Object.keys(ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT).length);
    for (const [parameterId, expected] of Object.entries(ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT)) {
      expect(String(parsed[parameterId])).toBe(String(expected));
    }
  });

  test("compiles independently frozen linear quantities without road-infrastructure pollution", () => {
    const rows = compileAsphaltSurfaceDrainageEstimate(ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT);
    const rowsWithPersistedInactivePipeValue = compileAsphaltSurfaceDrainageEstimate({
      ...ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT,
      drain_pipe_nominal_size: "DN160",
    });
    const quantities = new Map(rows.map((row) => [row.rowId, Number(row.evaluatedQuantity)]));

    expect(rowsWithPersistedInactivePipeValue).toEqual(rows);
    expect(rows).toHaveLength(28);
    expect(quantities.get("trench_excavation")).toBe(54);
    expect(quantities.get("bedding_crushed_stone")).toBe(10.8);
    expect(quantities.get("imported_backfill_sand")).toBe(32.4);
    expect(quantities.get("tray_base_concrete")).toBe(14.4);
    expect(quantities.get("tray_body")).toBe(174);
    expect(quantities.get("tray_grating")).toBe(360);
    expect(quantities.get("tray_connection_kits")).toBe(179);
    expect(quantities.get("tray_grating_fasteners")).toBe(720);
    expect(quantities.get("tray_joint_sealant")).toBe(21.48);
    expect(quantities.get("soil_disposal")).toBe(388.8);
    expect(rows.find((row) => row.rowId === "tray_body")?.canonicalRuName).toBe("Лоток водоотводный бетонный — DN200, D400");
    expect(rows.some((row) => /освещ|дорожн.*знак|разметк|барьер|башенн.*кран|налог|сметн.*сопровожд/iu.test(row.canonicalRuName))).toBe(false);
    expect(auditRealProfessionalRowsR1(rows)).toEqual([]);
  });

  test("keeps the 25 m asphalt-strip geometry disjoint and counts actual modules, gratings and joints", () => {
    const rows = compileAsphaltSurfaceDrainageEstimate({
      ...ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT,
      route_length_m: 25,
      trench_width_m: 0.5,
      trench_depth_m: 0.4,
      bedding_material: "sand",
      bedding_thickness_m: 0.1,
      backfill_cross_section_m2: 0,
      backfill_import_required: false,
      outlet_connection_count: 1,
      soil_disposal_included: false,
      delivery_separately_priced: false,
      surface_restoration_scope: "local_asphalt_strip",
      existing_asphalt_thickness_mm: 50,
      asphalt_restoration_area_m2: 7.5,
      asphalt_restoration_thickness_mm: 50,
      asphalt_density_t_m3: 2.4,
      asphalt_emulsion_rate_kg_m2: 0.3,
      asphalt_cut_edge_length_m: 51,
      asphalt_delivery_distance_km: 0,
      asphalt_roller_model: "Подтверждённая виброплита",
      asphalt_roller_productivity_m2_h: 25,
      tray_nominal_size: "DN100",
      tray_load_class: "D400",
      tray_module_length_m: 1,
      tray_grating_length_m: 0.5,
      tray_base_concrete_cross_section_m2: 0.095,
      tray_fasteners_per_grating: 0,
      tray_silt_trap_count: 0,
      tray_silt_trap_length_m_item: 0,
      concrete_delivery_distance_km: 0,
    });
    const quantities = new Map(rows.map((row) => [row.rowId, Number(row.evaluatedQuantity)]));

    expect(quantities.get("asphalt_strip_removal")).toBe(0.625);
    expect(quantities.get("trench_excavation_below_asphalt")).toBe(4.375);
    expect(quantities.get("bedding_sand")).toBe(1.25);
    expect(quantities.get("tray_base_concrete")).toBe(2.375);
    expect(quantities.get("asphalt_strip_restoration")).toBe(7.5);
    expect(quantities.get("asphalt_edge_cutting")).toBe(51);
    expect(quantities.get("tray_body")).toBe(25);
    expect(quantities.get("tray_grating")).toBe(50);
    expect(quantities.get("tray_connection_kits")).toBe(24);
    expect(quantities.has("tray_silt_traps")).toBe(false);
    expect(quantities.has("tray_grating_fasteners")).toBe(false);
    expect(quantities.has("trench_backfill")).toBe(false);
    expect(1.25 + 1 + 0.375 + 2.375).toBe(5);
  });

  test("keeps subsurface drainage and storm sewer as distinct mutually exclusive resource branches", () => {
    const base = commonWithoutLinear();
    const subsurface = compileAsphaltSurfaceDrainageEstimate({
      ...base,
      system_type: "subsurface_drain",
      drain_pipe_nominal_size: "DN160",
      drain_pipe_stiffness_class: "SN8",
      drain_pipe_module_length_m: 6,
      filter_aggregate_cross_section_m2: 0.22,
      filter_aggregate_density_t_m3: 1.55,
      filter_aggregate_delivery_distance_km: 16,
      geotextile_developed_width_m: 1.8,
      drain_inspection_well_count: 5,
    });
    const storm = compileAsphaltSurfaceDrainageEstimate({
      ...base,
      system_type: "storm_sewer",
      storm_pipe_nominal_size: "DN400",
      storm_pipe_material: "ПП",
      storm_pipe_stiffness_class: "SN8",
      storm_pipe_module_length_m: 6,
      storm_fitting_count: 12,
      storm_inlet_count: 18,
      storm_inlet_load_class: "D400",
      storm_well_count: 6,
      storm_well_nominal_size: "DN1000",
    });

    expect(subsurface.some((row) => row.rowId === "drain_perforated_pipe")).toBe(true);
    expect(subsurface.some((row) => row.rowId.startsWith("storm_") || row.rowId.startsWith("tray_"))).toBe(false);
    expect(storm.some((row) => row.rowId === "storm_pipe")).toBe(true);
    expect(storm.some((row) => row.rowId.startsWith("drain_") || row.rowId.startsWith("tray_"))).toBe(false);
    expect(auditRealProfessionalRowsR1(subsurface)).toEqual([]);
    expect(auditRealProfessionalRowsR1(storm)).toEqual([]);
  });

  test("content passport has one owner per cost row and no generic service padding", () => {
    const { decision, passport } = buildAsphaltSurfaceDrainageContentPassportR3();

    expect(ASPHALT_SURFACE_DRAINAGE_CATALOG_ID).toBe(R4_A10_ASPHALT_DRAINAGE_CATALOG_ID);
    expect(decision).toMatchObject({ allowed: true, status: "GREEN" });
    expect(decision.metrics).toMatchObject({ genericCartesianRows: 0, duplicateSemanticOwners: 0, duplicateOwnCostOwners: 0 });
    expect(passport.resources).toHaveLength(ASPHALT_SURFACE_DRAINAGE_ROWS.length);
    expect(passport.resources.some((row) => /налог|сметн.*сопровожд|исполнительн.*документ|чек-лист/iu.test(row.titleRu))).toBe(false);
  });
});
