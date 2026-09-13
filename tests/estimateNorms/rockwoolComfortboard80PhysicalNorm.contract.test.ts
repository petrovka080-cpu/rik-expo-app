import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";
import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";

const CAPTURED_AT = "2026-09-12T00:00:00.000Z";

function explicit(
  value: string | number | boolean,
  unitId: string | null = null,
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: unitId,
    source_type: "USER_EXPLICIT",
    source_id: `test-project:${String(value)}`,
    captured_at: CAPTURED_AT,
    confidence: "high",
    applicability: "Exact ROCKWOOL Comfortboard 80 project fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID),
    net_insulation_area_m2: explicit(100, "m2"),
    required_r_value: explicit("R6.3"),
    selected_thickness_mm: explicit(38, "mm"),
    selected_board_length_mm: explicit(1219, "mm"),
    selected_board_width_mm: explicit(610, "mm"),
    selected_package_format: explicit("R6_3_38MM_1219X610_6_BOARDS_4_45_M2"),
    opening_and_cut_layout: explicit("CB80-LAYOUT-2026-17"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "THERMAL_INSULATION",
    operation_class: "INSTALL",
    material_system: "ROCKWOOL_COMFORTBOARD80",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

const COMPLETE_PROMPT = [
  "Смета утепления ROCKWOOL Comfortboard 80:",
  "чистая площадь утепления 100 м²;",
  "проектное требование R6.3;",
  "толщина 38 мм;",
  "плиты 1219×610 мм;",
  "6 плит в упаковке;",
  "покрытие упаковки 4,45 м²;",
  "карта раскроя: CB80-LAYOUT-2026-17",
].join(" ");

describe("ROCKWOOL Comfortboard 80 exact net-area physical norm", () => {
  test("registers the exact reviewed format as one executable source", () => {
    expect(ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA).toMatchObject({
      norm_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
      product: "ROCKWOOL Comfortboard 80",
      nominal_r_value: "R6.3",
      thickness_mm: 38,
      board_length_mm: 1219,
      board_width_mm: 610,
      boards_per_pack: 6,
      manufacturer_pack_coverage_m2: 4.45,
    });
    expect(constructionNormativeRegistryV1.get(ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        jurisdiction: "INTERNATIONAL_PROJECT",
        authority: "ROCKWOOL",
        operation_class_applicability: ["INSTALL"],
        material_system_applicability: ["ROCKWOOL_COMFORTBOARD80"],
        product_profile_applicability: [ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
        work_group: "insulation",
        technology_class: "THERMAL_INSULATION",
        produced_parameter_ids: ["rockwool_comfortboard80_net_board_quantity_m2"],
      }));
  });

  test("returns the exact 100 m2 net board area without cutting or package rounding", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
      source_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
      calculated_rockwool_comfortboard80_net_board_quantity_m2: 100,
      produced_parameter_ids: ["rockwool_comfortboard80_net_board_quantity_m2"],
      blockers: [],
    });
    expect(first.parameter_values.rockwool_comfortboard80_net_board_quantity_m2)
      .toMatchObject({
        value: 100,
        unit_id: "m2",
        source_type: "APPLICABLE_NORM",
        source_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
      });
    expect(first.parameter_values.rockwool_comfortboard80_net_board_quantity_m2.applicability)
      .toContain("package_rounding=false");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed outside the exact R6.3 small-board format", () => {
    const incomplete = { ...exactInputs() };
    delete (incomplete as Record<string, ProfessionalParameterValueV4>).opening_and_cut_layout;
    expect(resolve(incomplete)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:opening_and_cut_layout"],
    });
    expect(resolve(exactInputs({ required_r_value: explicit("R8") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining([expect.stringContaining("required_r_value=R8")]),
    });
    expect(resolve(exactInputs({ selected_thickness_mm: explicit(50, "mm") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("selected_thickness_mm=50")]),
      });
    expect(resolve(exactInputs({ selected_board_width_mm: explicit(600, "mm") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("selected_board_width_mm=600")]),
      });
    expect(resolve(exactInputs({
      rockwool_comfortboard80_net_board_quantity_m2: explicit(101, "m2"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
    });
  });

  test("uses an independent insulation owner and preserves one exact material row", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(COMPLETE_PROMPT)).toBe("insulation");
    expect(resolveDirectConsumerRepairOpenWorldOwner("гидроизоляция кровли 100 м²"))
      .toBe("roof_waterproofing");
    expect(resolveDirectConsumerRepairOpenWorldOwner("изоляция электрического кабеля"))
      .toBe("electrical");

    const draft = buildDirectConsumerRepairOpenWorldAiDraft(COMPLETE_PROMPT, {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter(
      (item) => item.normId === ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
    );
    expect(draft.selectedWork?.selectedWorkKey).toBe("dynamic_insulation_estimate");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 100,
      unit: "sq_m",
      normSourceId: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
    });
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "MANUFACTURER_TECHNICAL",
      includedInEstimate: true,
      includedInProcurement: true,
      parameterBlockerIds: [],
    });
    expect(exactRows[0]?.calculationTrace).toContain("packageRounding=false");
    const automaticReserve = draft.items.find(
      (item) => item.sourceParameters?.rowCode === "reserve",
    );
    expect(draft.items.some((item) =>
      item.sourceParameters?.rowCode === "reserve" && Number(item.quantity) > 0
    )).toBe(false);
    if (automaticReserve) {
      expect(automaticReserve).toMatchObject({ quantity: 0 });
      expect(automaticReserve.sourceParameters).toMatchObject({
        includedInEstimate: false,
        includedInProcurement: false,
        conditionalStatus: "blocked_missing_parameters",
      });
    }
  });

  test("keeps incomplete exact input blocked and generic insulation unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета утепления ROCKWOOL Comfortboard 80, чистая площадь утепления 100 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find(
      (item) => item.normId === ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
    );
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("сопротивление теплопередаче R6.3"),
      expect.stringContaining("номер карты раскроя"),
    ]));

    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета утепления фасада минеральной ватой 100 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some(
      (item) => item.normId === ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
    )).toBe(false);
    expect(generic.items.some(
      (item) => item.normSourceId === ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
    )).toBe(false);
  });
});
