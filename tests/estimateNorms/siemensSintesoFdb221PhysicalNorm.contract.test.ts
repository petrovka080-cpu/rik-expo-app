import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  SIEMENS_SINTESO_FDB221_NORM_ID,
  SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID,
  SIEMENS_SINTESO_FDB221_SOURCE_ID,
  SIEMENS_SINTESO_FDB221_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

const CAPTURED_AT = "2026-09-12T12:00:00.000Z";

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
    applicability: "Exact Siemens Sinteso FDB221 approved fire-alarm fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID),
    designed_detector_point_count: explicit(12, "piece"),
    approved_fire_alarm_design_and_code_basis: explicit("APS-2026-17 / KG-FIRE-BASIS-04"),
    selected_detector_product_number: explicit("FDOOT241-9"),
    selected_base_reference: explicit("FDB221/A5Q00001664"),
    detector_base_compatibility_document_revision: explicit("A6V15698430-R1"),
    installation_environment: explicit("DRY_INDOOR"),
    surface_or_recessed_supply_method: explicit("SURFACE"),
    surface_cable_diameter_mm: explicit(5, "mm"),
    conductor_cross_section_mm2: explicit(1.5, "mm2"),
    humid_or_wet_base_attachment_scope: explicit("NOT_REQUIRED_DRY_INDOOR"),
    auxiliary_terminal_scope: explicit("NOT_INCLUDED"),
    detector_heating_scope: explicit("NOT_INCLUDED"),
    locking_and_designation_plate_scope: explicit("NOT_INCLUDED"),
    project_spare_quantity: explicit(2, "piece"),
    commissioning_and_acceptance_scope: explicit("APS-COMM-2026-17"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FIRE_ALARM_DETECTION",
    operation_class: "INSTALL",
    material_system: "SIEMENS_SINTESO_FDB221_BASE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function completePrompt(spareQuantity = 2): string {
  return [
    "Смета адресной пожарной сигнализации Siemens Sinteso FDB221 / A5Q00001664:",
    "утверждённое проектное количество точек пожарных извещателей 12 шт.;",
    "проект АПС и нормативная основа: APS-2026-17-KG-FIRE-BASIS-04;",
    "модель совместимого извещателя: FDOOT241-9;",
    "документ совместимости и ревизия: A6V15698430-R1;",
    "сухое внутреннее помещение;",
    "подвод кабеля: поверхностный;",
    "наружный диаметр кабеля 5 мм;",
    "сечение подключаемых жил 1,5 мм²;",
    "насадка основания для влажной среды: не требуется;",
    "вспомогательная клемма: не включена;",
    "обогрев извещателя: не включён;",
    "фиксатор и табличка: не включены;",
    `проектный запас оснований FDB221 ${spareQuantity} шт.;`,
    "программа ПНР и приёмки: APS-COMM-2026-17",
  ].join(" ");
}

describe("Siemens Sinteso FDB221 exact detector-base physical norm", () => {
  test("registers the reviewed base profile separately from the detector", () => {
    expect(SIEMENS_SINTESO_FDB221_SOURCE_METADATA).toMatchObject({
      norm_id: SIEMENS_SINTESO_FDB221_NORM_ID,
      manufacturer: "Siemens",
      system_family: "Sinteso",
      order_number: "A5Q00001664",
      product_number: "FDB221",
      product_type: "addressable_detector_base",
      maximum_surface_supply_cable_diameter_mm: 6,
      connection_cable_capacity_mm2: [0.2, 1.5],
      package_quantity_piece: 1,
    });
    expect(constructionNormativeRegistryV1.get(SIEMENS_SINTESO_FDB221_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        jurisdiction: "INTERNATIONAL_PROJECT",
        authority: "Siemens",
        operation_class_applicability: ["INSTALL"],
        material_system_applicability: ["SIEMENS_SINTESO_FDB221_BASE"],
        product_profile_applicability: [SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: SIEMENS_SINTESO_FDB221_NORM_ID,
        work_group: "fire_safety",
        technology_class: "FIRE_ALARM_DETECTION",
        produced_parameter_ids: ["siemens_fdb221_base_quantity_piece"],
      }));
  });

  test("calculates approved points plus only explicit project spares", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: SIEMENS_SINTESO_FDB221_NORM_ID,
      source_id: SIEMENS_SINTESO_FDB221_SOURCE_ID,
      calculated_siemens_fdb221_base_quantity_piece: 14,
      produced_parameter_ids: ["siemens_fdb221_base_quantity_piece"],
      blockers: [],
    });
    expect(first.parameter_values.siemens_fdb221_base_quantity_piece).toMatchObject({
      value: 14,
      unit_id: "piece",
      source_type: "APPLICABLE_NORM",
      source_id: SIEMENS_SINTESO_FDB221_SOURCE_ID,
    });
    expect(first.parameter_values.siemens_fdb221_base_quantity_piece.applicability)
      .toContain("base_is_not_detector=true");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed for inferred points, a base-as-detector, or unsupported connection conditions", () => {
    const withoutPoints = { ...exactInputs(), area_m2: explicit(500, "m2") };
    delete (withoutPoints as Record<string, ProfessionalParameterValueV4>).designed_detector_point_count;
    expect(resolve(withoutPoints)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining([
        "PROJECT_VALUE_REQUIRED_EXPLICIT:designed_detector_point_count",
      ]),
    });
    expect(resolve(exactInputs({ selected_detector_product_number: explicit("FDB221") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([
          "PROJECT_VALUE_INVALID:selected_detector_product_number_must_identify_detector_not_base",
        ]),
      });
    expect(resolve(exactInputs({ surface_cable_diameter_mm: explicit(7, "mm") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("surface_cable_diameter_mm=7")]),
      });
    expect(resolve(exactInputs({ conductor_cross_section_mm2: explicit(2.5, "mm2") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("conductor_cross_section_mm2=2.5")]),
      });
    expect(resolve(exactInputs({ humid_or_wet_base_attachment_scope: explicit("REQUIRED") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("SEPARATE_ACCESSORY_SCOPE_REQUIRED")]),
      });
    expect(resolve(exactInputs({
      siemens_fdb221_base_quantity_piece: explicit(15, "piece"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
    });
  });

  test("routes ahead of generic electrical cable matching and keeps base and detector rows distinct", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(completePrompt())).toBe("fire_safety");
    expect(resolveDirectConsumerRepairOpenWorldOwner("проложить электрический кабель 20 м"))
      .toBe("electrical");

    const draft = buildDirectConsumerRepairOpenWorldAiDraft(completePrompt(), {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter((item) => item.normId === SIEMENS_SINTESO_FDB221_NORM_ID);
    const detectorRow = draft.items.find((item) => item.sourceParameters?.rowCode === "material_1");
    expect(draft.selectedWork?.selectedWorkKey).toBe("fire_alarm_installation");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 14,
      unit: "pcs",
      normSourceId: SIEMENS_SINTESO_FDB221_SOURCE_ID,
    });
    expect(exactRows[0]?.titleRu).toContain("не извещатели");
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "MANUFACTURER_TECHNICAL",
      includedInEstimate: true,
      includedInProcurement: true,
      parameterBlockerIds: [],
    });
    expect(detectorRow).toMatchObject({ quantity: 12 });
    expect(detectorRow?.normId).not.toBe(SIEMENS_SINTESO_FDB221_NORM_ID);
    expect(detectorRow?.normSourceId).not.toBe(SIEMENS_SINTESO_FDB221_SOURCE_ID);
  });

  test("changes quantity and money only by the explicit spare increment", () => {
    const twoSpares = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(2),
      owner: "fire_safety",
      currency: "KGS",
    }));
    const threeSpares = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(3),
      owner: "fire_safety",
      currency: "KGS",
    }));
    const first = twoSpares.rows.find((row) => row.normId === SIEMENS_SINTESO_FDB221_NORM_ID)!;
    const second = threeSpares.rows.find((row) => row.normId === SIEMENS_SINTESO_FDB221_NORM_ID)!;
    const firstDetector = twoSpares.rows.find((row) => row.code === "material_1")!;
    const secondDetector = threeSpares.rows.find((row) => row.code === "material_1")!;
    expect(second.quantity - first.quantity).toBe(1);
    expect(second.unitPrice).toBe(first.unitPrice);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice)
      .toBe(first.unitPrice);
    expect(secondDetector.quantity).toBe(firstDetector.quantity);
    expect(second.calculationTrace).toContain("explicitProjectSparesOnly=true");
  });

  test("keeps incomplete exact input blocked and generic fire-safety text unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета Siemens Sinteso FDB221 / A5Q00001664 на 500 м²",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find((item) => item.normId === SIEMENS_SINTESO_FDB221_NORM_ID);
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("утверждённое проектом количество"),
      expect.stringContaining("совместимость выбранного извещателя"),
    ]));

    expect(resolveDirectConsumerRepairOpenWorldOwner("Монтаж пожарной сигнализации в офисе"))
      .toBeNull();
  });
});
