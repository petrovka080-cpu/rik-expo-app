import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
  WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID,
  WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
  WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

const CAPTURED_AT = "2026-09-12T16:00:00.000Z";

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
    applicability: "Exact Wavin Osma C3766BK above-ground soil-and-waste fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID),
    approved_pipe_route_linear_m: explicit(12, "linear_m"),
    system_application: explicit("ABOVE_GROUND_SOIL_AND_WASTE"),
    hydraulic_and_appliance_design_reference: explicit("HYD-SW110-REV-C"),
    selected_nominal_diameter: explicit("DN100_OD110"),
    selected_product_code: explicit("C3766BK"),
    selected_commercial_pipe_length_m: explicit(3, "m"),
    fitting_schedule: explicit("FIT-SW110-REV-C"),
    fitting_socket_and_insertion_layout: explicit("SOCKET-SW110-REV-C"),
    reusable_cut_length_plan: explicit("CUT-SW110-REV-C"),
    thermal_movement_design: explicit("THERMAL-SW110-REV-C"),
    support_schedule: explicit("SUPPORT-SW110-REV-C"),
    firestopping_scope: explicit("FIRESTOP-SW110-REV-C"),
    acoustic_scope: explicit("ACOUSTIC-SW110-REV-C"),
    project_cutting_allowance_percent: explicit(0, "percent"),
    supplier_purchase_packaging: explicit(
      "PROJECT_ORDER:5X3M=15M;SUPPLIER_MASTER_PACK_57_NOT_ASSUMED",
    ),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "ABOVE_GROUND_SOIL_WASTE_PIPE_SYSTEM",
    operation_class: "INSTALL",
    material_system: "WAVIN_OSMA_C3766BK_110MM_3M",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function completePrompt(orderPieces = 5, routeLengthM = 12): string {
  const orderLengthM = orderPieces * 3;
  return [
    "Смета Wavin Osma C3766BK, SAP 3080894, EAN 5098987303844:",
    `утверждённая трасса трубы ${routeLengthM} пог. м;`,
    "применение системы: ABOVE_GROUND_SOIL_AND_WASTE;",
    "гидравлический проект: HYD-SW110-REV-C;",
    "выбранный диаметр: DN100/OD110;",
    "выбранный код продукта: C3766BK;",
    "выбранная коммерческая длина трубы 3 м;",
    "ведомость фитингов: FIT-SW110-REV-C;",
    "схема раструбов и глубин вставки: SOCKET-SW110-REV-C;",
    "план раскроя и повторного использования отрезков: CUT-SW110-REV-C;",
    "проект температурных перемещений: THERMAL-SW110-REV-C;",
    "ведомость опор: SUPPORT-SW110-REV-C;",
    "огнезаделка: FIRESTOP-SW110-REV-C;",
    "акустика: ACOUSTIC-SW110-REV-C;",
    "проектный припуск на резку 0%;",
    `закупка: PROJECT_ORDER:${orderPieces}X3M=${orderLengthM}M;SUPPLIER_MASTER_PACK_57_NOT_ASSUMED`,
  ].join(" ");
}

describe("Wavin Osma C3766BK exact above-ground route physical norm", () => {
  test("registers the reviewed 1:1 geometric identity for the exact 3 m product", () => {
    expect(WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_METADATA).toMatchObject({
      norm_id: WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
      catalog_code: "C3766BK",
      sap_number: "3080894",
      standard: "EN 1453-1",
      nominal_diameter: "DN 100",
      outer_pipe_diameter_mm: 110,
      wall_thickness_mm: 3.5,
      piece_length_m: 3,
      rate_value: 1,
    });
    expect(constructionNormativeRegistryV1.get(WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        jurisdiction: "INTERNATIONAL_PROJECT",
        authority: "Wavin",
        operation_class_applicability: ["INSTALL"],
        material_system_applicability: ["WAVIN_OSMA_C3766BK_110MM_3M"],
        product_profile_applicability: [WAVIN_OSMA_C3766BK_110MM_3M_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
        work_group: "sewerage",
        technology_class: "ABOVE_GROUND_SOIL_WASTE_PIPE_SYSTEM",
        produced_parameter_ids: [
          "wavin_osma_geometric_pipe_quantity_linear_m",
          "wavin_osma_project_procurement_quantity_linear_m",
        ],
      }));
  });

  test("keeps 12 geometric metres distinct from the explicit 15 m project order", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
      source_id: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
      calculated_wavin_osma_geometric_pipe_quantity_linear_m: 12,
      calculated_wavin_osma_project_procurement_quantity_linear_m: 15,
      blockers: [],
    });
    expect(first.parameter_values.wavin_osma_geometric_pipe_quantity_linear_m).toMatchObject({
      value: 12,
      unit_id: "linear_m",
      source_type: "APPLICABLE_NORM",
      source_id: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
    });
    expect(first.parameter_values.wavin_osma_project_procurement_quantity_linear_m)
      .toMatchObject({ value: 15, unit_id: "linear_m", source_type: "USER_EXPLICIT" });
    expect(first.parameter_values.wavin_osma_geometric_pipe_quantity_linear_m.applicability)
      .toContain("automatic_three_metre_rounding=false");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed for inferred route, wrong system/diameter/length, bad order, or conflict", () => {
    const withoutRoute = { ...exactInputs(), floor_area_m2: explicit(120, "m2") };
    delete (withoutRoute as Record<string, ProfessionalParameterValueV4>).approved_pipe_route_linear_m;
    expect(resolve(withoutRoute)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining([
        "PROJECT_VALUE_REQUIRED_EXPLICIT:approved_pipe_route_linear_m",
      ]),
    });
    expect(resolve(exactInputs({ system_application: explicit("BELOW_GROUND_DRAINAGE") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("system_application=BELOW_GROUND_DRAINAGE")]),
      });
    expect(resolve(exactInputs({ selected_nominal_diameter: explicit("DN150_OD160") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("selected_nominal_diameter=DN150_OD160")]),
      });
    expect(resolve(exactInputs({ selected_commercial_pipe_length_m: explicit(4, "m") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("selected_commercial_pipe_length_m=4")]),
      });
    expect(resolve(exactInputs({
      supplier_purchase_packaging: explicit(
        "PROJECT_ORDER:4X3M=11M;SUPPLIER_MASTER_PACK_57_NOT_ASSUMED",
      ),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining([expect.stringContaining("supplier_purchase_packaging")]),
    });
    expect(resolve(exactInputs({
      wavin_osma_geometric_pipe_quantity_linear_m: explicit(13, "linear_m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
    });
  });

  test("uses an independent sewerage owner and one exact project-order row", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(completePrompt())).toBe("sewerage");
    expect(resolveDirectConsumerRepairOpenWorldOwner("монтаж внутренней канализации 12 м"))
      .toBeNull();

    const draft = buildDirectConsumerRepairOpenWorldAiDraft(completePrompt(), {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter(
      (item) => item.normId === WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
    );
    expect(draft.selectedWork?.selectedWorkKey).toBe("sewerage_wavin_osma_c3766bk_110mm_3m");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 15,
      unit: "linear_m",
      normSourceId: WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
    });
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "MANUFACTURER_TECHNICAL",
      includedInEstimate: true,
      includedInProcurement: true,
      parameterBlockerIds: [],
    });
    expect(exactRows[0]?.calculationTrace).toContain("geometricResult=12");
    expect(exactRows[0]?.calculationTrace).toContain("supplierMasterPack57Assumed=false");
  });

  test("changes quantity and money only with the explicit project order", () => {
    const order15 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(5),
      owner: "sewerage",
      currency: "KGS",
    }));
    const order18 = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(6),
      owner: "sewerage",
      currency: "KGS",
    }));
    const first = order15.rows.find((row) => row.normId === WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID)!;
    const second = order18.rows.find((row) => row.normId === WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID)!;
    const firstOtherMaterial = order15.rows.find((row) => row.code === "material_2")!;
    const secondOtherMaterial = order18.rows.find((row) => row.code === "material_2")!;
    expect(second.quantity - first.quantity).toBeCloseTo(3, 9);
    expect(second.unitPrice).toBe(first.unitPrice);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice)
      .toBeCloseTo(3 * first.unitPrice, 9);
    expect(secondOtherMaterial.quantity).toBe(firstOtherMaterial.quantity);
    expect(first.calculationTrace).toContain("geometricResult=12");
    expect(second.calculationTrace).toContain("geometricResult=12");

    const route13SameOrder = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(5, 13),
      owner: "sewerage",
      currency: "KGS",
    })).rows.find((row) => row.normId === WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID)!;
    expect(route13SameOrder.quantity).toBe(first.quantity);
    expect(route13SameOrder.calculationTrace).toContain("geometricResult=13");
  });

  test("keeps incomplete exact input blocked and generic sewerage unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета Wavin Osma C3766BK: утверждённая трасса трубы 12 пог. м",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find(
      (item) => item.normId === WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
    );
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("гидравлический расчёт"),
      expect.stringContaining("план раскроя"),
      expect.stringContaining("проектный заказ"),
    ]));

    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета монтажа внутренней бытовой канализации 12 м",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some(
      (item) => item.normId === WAVIN_OSMA_C3766BK_110MM_3M_NORM_ID,
    )).toBe(false);
    expect(generic.items.some(
      (item) => item.normSourceId === WAVIN_OSMA_C3766BK_110MM_3M_SOURCE_ID,
    )).toBe(false);
  });
});
