import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  LEGRAND_049272_BUS_SCS_NORM_ID,
  LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID,
  LEGRAND_049272_BUS_SCS_SOURCE_ID,
  LEGRAND_049272_BUS_SCS_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

const CAPTURED_AT = "2026-09-12T13:00:00.000Z";

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
    applicability: "Exact Legrand 049272 approved BUS/SCS fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID),
    approved_route_length_linear_m: explicit(100, "linear_m"),
    circuit_count_and_point_to_point_schedule: explicit("12-CIRCUITS-P2P-LV-2026-04"),
    bus_scs_system_compatibility_confirmed: explicit(true),
    exact_cable_product_reference: explicit("LEGRAND 049272/EAN3414971327986"),
    routing_environment: explicit("INDOOR_ABOVE_GROUND"),
    power_cable_segregation_confirmed: explicit(true),
    device_and_panel_termination_allowance_m: explicit(4, "linear_m"),
    service_loop_allowance_m: explicit(6, "linear_m"),
    vertical_drop_and_riser_allowance_m: explicit(10, "linear_m"),
    reusable_reel_remnant_plan: explicit("LV049272-CUT-2026-04"),
    fire_class_requirement: explicit("Cca-s1b,d1,a1"),
    selected_reel_length_m: explicit(200, "linear_m"),
    project_cutting_allowance_percent: explicit(5, "percent"),
    installed_circuit_test_and_certification_scope: explicit("LV049272-TEST-2026-04"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "LOW_VOLTAGE_BUS_SCS",
    operation_class: "INSTALL",
    material_system: "LEGRAND_049272_BUS_SCS_CABLE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function completePrompt(serviceLoopAllowanceM = 6): string {
  return [
    "Смета кабельной системы Legrand 049272, EAN 3414971327986, BUS/SCS:",
    "утверждённая суммарная длина маршрутов 100 м;",
    "ведомость цепей и точка-точка: 12-CIRCUITS-P2P-LV-2026-04;",
    "совместимость кабеля с системой BUS/SCS: подтверждена;",
    "среда прокладки: внутренняя надземная;",
    "раздельная прокладка от силовых кабелей выше 50 В: подтверждена;",
    "оконцевание устройств и панелей 4 м;",
    `сервисных петель ${serviceLoopAllowanceM} м;`,
    "вертикальных спусков и стояков 10 м;",
    "план раскроя и повторного использования остатков: LV049272-CUT-2026-04;",
    "класс реакции на огонь Cca-s1b,d1,a1;",
    "поставочная длина выбранного барабана 200 м;",
    "проектный раскройный запас 5%;",
    "программа испытаний и сертификации: LV049272-TEST-2026-04",
  ].join(" ");
}

describe("Legrand 049272 exact BUS/SCS cable physical norm", () => {
  test("registers the reviewed special cable profile separately from generic UTP", () => {
    expect(LEGRAND_049272_BUS_SCS_SOURCE_METADATA).toMatchObject({
      norm_id: LEGRAND_049272_BUS_SCS_NORM_ID,
      manufacturer_reference: "Legrand 049272",
      ean: "3414971327986",
      system: "BUS-SCS",
      manufacturer_catalogue_context: "nurse_call_system_accessory",
      conductor_cross_section_mm2: 0.56,
      cores: 2,
      manufacturer_delivery_reel_m: 200,
      reaction_to_fire_class: "Cca-s1b,d1,a1",
    });
    expect(constructionNormativeRegistryV1.get(LEGRAND_049272_BUS_SCS_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        jurisdiction: "INTERNATIONAL_PROJECT",
        authority: "Legrand",
        operation_class_applicability: ["INSTALL"],
        material_system_applicability: ["LEGRAND_049272_BUS_SCS_CABLE"],
        product_profile_applicability: [LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: LEGRAND_049272_BUS_SCS_NORM_ID,
        work_group: "low_voltage",
        technology_class: "LOW_VOLTAGE_BUS_SCS",
        produced_parameter_ids: ["legrand_049272_design_cable_quantity_linear_m"],
      }));
  });

  test("combines approved geometry with only explicit project allowances and no reel rounding", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: LEGRAND_049272_BUS_SCS_NORM_ID,
      source_id: LEGRAND_049272_BUS_SCS_SOURCE_ID,
      calculated_legrand_049272_design_cable_quantity_linear_m: 126,
      produced_parameter_ids: ["legrand_049272_design_cable_quantity_linear_m"],
      blockers: [],
    });
    expect(first.parameter_values.legrand_049272_design_cable_quantity_linear_m)
      .toMatchObject({
        value: 126,
        unit_id: "linear_m",
        source_type: "APPLICABLE_NORM",
        source_id: LEGRAND_049272_BUS_SCS_SOURCE_ID,
      });
    expect(first.parameter_values.legrand_049272_design_cable_quantity_linear_m.applicability)
      .toContain("reel_rounding=false");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed for inferred routes, generic cable, unsafe segregation, and source conflicts", () => {
    const withoutRoute = { ...exactInputs(), area_m2: explicit(500, "m2") };
    delete (withoutRoute as Record<string, ProfessionalParameterValueV4>).approved_route_length_linear_m;
    expect(resolve(withoutRoute)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining([
        "PROJECT_VALUE_REQUIRED_EXPLICIT:approved_route_length_linear_m",
      ]),
    });
    expect(resolve(exactInputs({ exact_cable_product_reference: explicit("UTP CAT6") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("exact_cable_product_reference=UTP CAT6")]),
      });
    expect(resolve(exactInputs({ power_cable_segregation_confirmed: explicit(false) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining(["SAFETY_SCOPE_REQUIRED:power_cable_segregation_confirmed"]),
      });
    expect(resolve(exactInputs({ routing_environment: explicit("UNDERGROUND") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("routing_environment=UNDERGROUND")]),
      });
    expect(resolve(exactInputs({ selected_reel_length_m: explicit(100, "linear_m") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("selected_reel_length_m=100")]),
      });
    expect(resolve(exactInputs({
      legrand_049272_design_cable_quantity_linear_m: explicit(127, "linear_m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
    });
  });

  test("routes ahead of generic electrical cable matching and emits no UTP substitution", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(completePrompt())).toBe("low_voltage");
    expect(resolveDirectConsumerRepairOpenWorldOwner("проложить электрический кабель 20 м"))
      .toBe("electrical");

    const draft = buildDirectConsumerRepairOpenWorldAiDraft(completePrompt(), {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter((item) => item.normId === LEGRAND_049272_BUS_SCS_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("low_voltage_legrand_049272_bus_scs_cable");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 126,
      unit: "linear_m",
      normSourceId: LEGRAND_049272_BUS_SCS_SOURCE_ID,
    });
    expect(exactRows[0]?.titleRu).toContain("не UTP");
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "MANUFACTURER_TECHNICAL",
      includedInEstimate: true,
      includedInProcurement: true,
      parameterBlockerIds: [],
    });
    expect(draft.items.some((item) =>
      item.normId !== LEGRAND_049272_BUS_SCS_NORM_ID && /UTP|RJ45/iu.test(item.titleRu)
    )).toBe(false);
  });

  test("changes quantity and money only by the explicit service-loop increment", () => {
    const sixMetres = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(6),
      owner: "low_voltage",
      currency: "KGS",
    }));
    const sevenMetres = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(7),
      owner: "low_voltage",
      currency: "KGS",
    }));
    const first = sixMetres.rows.find((row) => row.normId === LEGRAND_049272_BUS_SCS_NORM_ID)!;
    const second = sevenMetres.rows.find((row) => row.normId === LEGRAND_049272_BUS_SCS_NORM_ID)!;
    const firstOtherMaterial = sixMetres.rows.find((row) => row.code === "material_2")!;
    const secondOtherMaterial = sevenMetres.rows.find((row) => row.code === "material_2")!;
    expect(second.quantity - first.quantity).toBeCloseTo(1.05, 9);
    expect(second.unitPrice).toBe(first.unitPrice);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice)
      .toBeCloseTo(first.unitPrice * 1.05, 9);
    expect(secondOtherMaterial.quantity).toBe(firstOtherMaterial.quantity);
    expect(second.calculationTrace).toContain("projectAllowancesExplicit=true");
  });

  test("keeps incomplete exact input blocked and generic UTP unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета Legrand 049272, EAN 3414971327986, BUS/SCS на 500 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find((item) => item.normId === LEGRAND_049272_BUS_SCS_NORM_ID);
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("утверждённую длину маршрутов"),
      expect.stringContaining("раздельную прокладку"),
    ]));

    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета обычного UTP Cat.6 кабеля на 20 м",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some((item) => item.normId === LEGRAND_049272_BUS_SCS_NORM_ID))
      .toBe(false);
    expect(generic.items.some((item) => item.normSourceId === LEGRAND_049272_BUS_SCS_SOURCE_ID))
      .toBe(false);
  });
});
