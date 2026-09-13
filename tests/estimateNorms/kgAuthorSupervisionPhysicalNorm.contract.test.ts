import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  KG_AUTHOR_SUPERVISION_NORM_ID,
  KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID,
  KG_AUTHOR_SUPERVISION_SOURCE_ID,
  KG_AUTHOR_SUPERVISION_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

const CAPTURED_AT = "2026-09-12T18:00:00.000Z";

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
    applicability: "Exact Kyrgyz author-supervision cost fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID),
    construction_estimated_cost_chapters_1_9_currency: explicit(10_000_000, "kgs"),
    construction_estimated_cost_currency: explicit("KGS"),
    author_supervision_required_for_object: explicit(true),
    applicable_consolidated_estimate_chapters: explicit("1-9"),
    current_legal_applicability_and_amendments: explicit(
      "KG_ORDER_52_NPA_CURRENT_CONFIRMED:2026-09-12",
    ),
    travel_to_and_from_site_required: explicit(false),
    travel_cost_separate_calculation: explicit("NOT_REQUIRED:NO_TRAVEL"),
    estimator_approval_reference: explicit("EST-AUTH-SUP-REV-C"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "PROJECT_COST_SERVICES",
    operation_class: "CALCULATE",
    material_system: "KG_AUTHOR_SUPERVISION",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function completePrompt(chaptersCost = 10_000_000): string {
  return [
    "Расчёт авторского надзора по приказу КР №52-нпа, приложение 5:",
    `сметная стоимость строительства по главам 1–9 ${chaptersCost} KGS;`,
    "валюта стоимости: KGS;",
    "авторский надзор для объекта обязателен;",
    "применимые главы сводной сметы: 1–9;",
    "текущая применимость и поправки: KG_ORDER_52_NPA_CURRENT_CONFIRMED:2026-09-12;",
    "проезд на объект не требуется;",
    "отдельный расчёт проезда: NOT_REQUIRED:NO_TRAVEL;",
    "согласование сметчика: EST-AUTH-SUP-REV-C",
  ].join(" ");
}

describe("Kyrgyz author-supervision exact 0.4 percent physical norm", () => {
  test("registers the official chapters 1-9 cost profile", () => {
    expect(KG_AUTHOR_SUPERVISION_SOURCE_METADATA).toMatchObject({
      norm_id: KG_AUTHOR_SUPERVISION_NORM_ID,
      rate_value: 0.004,
      jurisdiction: "Kyrgyz Republic",
      construction_estimated_cost_basis_chapters: "1-9",
    });
    expect(constructionNormativeRegistryV1.get(KG_AUTHOR_SUPERVISION_SOURCE_ID))
      .toMatchObject({
        source_type: "RESOURCE_ESTIMATE_NORM",
        jurisdiction: "KG",
        operation_class_applicability: ["CALCULATE"],
        material_system_applicability: ["KG_AUTHOR_SUPERVISION"],
        product_profile_applicability: [KG_AUTHOR_SUPERVISION_PRODUCT_PROFILE_ID],
        exact_rate_code_required: false,
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)
      .toContainEqual(expect.objectContaining({
        norm_id: KG_AUTHOR_SUPERVISION_NORM_ID,
        work_group: "services",
        technology_class: "PROJECT_COST_SERVICES",
        produced_parameter_ids: ["kg_author_supervision_cost_currency"],
      }));
  });

  test("returns 40,000 KGS from the exact 10,000,000 KGS chapters 1-9 basis", () => {
    const first = resolve(exactInputs());
    const second = resolve(exactInputs());
    expect(first).toMatchObject({
      status: "APPLIED",
      norm_id: KG_AUTHOR_SUPERVISION_NORM_ID,
      source_id: KG_AUTHOR_SUPERVISION_SOURCE_ID,
      calculated_kg_author_supervision_cost_currency: 40_000,
      blockers: [],
    });
    expect(first.parameter_values.kg_author_supervision_cost_currency).toMatchObject({
      value: 40_000,
      unit_id: "kgs",
      source_type: "APPLICABLE_NORM",
      source_id: KG_AUTHOR_SUPERVISION_SOURCE_ID,
    });
    expect(first.parameter_values.kg_author_supervision_cost_currency.applicability)
      .toContain("travel_included=false");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  test("fails closed for inferred basis, wrong currency/chapters, travel leakage, or conflict", () => {
    const withoutBasis = { ...exactInputs(), total_project_cost_currency: explicit(10_000_000, "kgs") };
    delete (withoutBasis as Record<string, ProfessionalParameterValueV4>)
      .construction_estimated_cost_chapters_1_9_currency;
    expect(resolve(withoutBasis)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining([
        "PROJECT_VALUE_REQUIRED_EXPLICIT:construction_estimated_cost_chapters_1_9_currency",
      ]),
    });
    expect(resolve(exactInputs({ construction_estimated_cost_currency: explicit("USD") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("construction_estimated_cost_currency=USD")]),
      });
    expect(resolve(exactInputs({ applicable_consolidated_estimate_chapters: explicit("1-12") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining([expect.stringContaining("applicable_consolidated_estimate_chapters=1-12")]),
      });
    expect(resolve(exactInputs({
      travel_to_and_from_site_required: explicit(true),
      travel_cost_separate_calculation: explicit("NOT_REQUIRED:NO_TRAVEL"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining(["PROJECT_VALUE_INVALID:travel_cost_separate_calculation"]),
    });
    expect(resolve(exactInputs({ kg_author_supervision_cost_currency: explicit(39_999, "kgs") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
      });
  });

  test("uses an exact services owner and one non-procurement service row", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(completePrompt())).toBe("services");
    expect(resolveDirectConsumerRepairOpenWorldOwner("расчёт авторского надзора для объекта"))
      .toBeNull();

    const draft = buildDirectConsumerRepairOpenWorldAiDraft(completePrompt(), {
      city: "Бишкек",
      countryCode: "KG",
    });
    const exactRows = draft.items.filter((item) => item.normId === KG_AUTHOR_SUPERVISION_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("services_kg_author_supervision_order_52_npa");
    expect(exactRows).toHaveLength(1);
    expect(exactRows[0]).toMatchObject({
      quantity: 1,
      unit: "set",
      unitPrice: 40_000,
      normSourceId: KG_AUTHOR_SUPERVISION_SOURCE_ID,
    });
    expect(exactRows[0]?.sourceParameters).toMatchObject({
      normSourceProfile: "KG_PRIMARY",
      includedInEstimate: true,
      includedInProcurement: false,
      parameterBlockerIds: [],
    });
    expect(exactRows[0]?.calculationTrace).toContain("costResult=40000");
  });

  test("changes only service money with the independently changed chapters 1-9 basis", () => {
    const cost10m = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(10_000_000),
      owner: "services",
      currency: "KGS",
    }));
    const cost11m = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: completePrompt(11_000_000),
      owner: "services",
      currency: "KGS",
    }));
    const first = cost10m.rows.find((row) => row.normId === KG_AUTHOR_SUPERVISION_NORM_ID)!;
    const second = cost11m.rows.find((row) => row.normId === KG_AUTHOR_SUPERVISION_NORM_ID)!;
    const firstOtherLabor = cost10m.rows.find((row) => row.code === "labor_2")!;
    const secondOtherLabor = cost11m.rows.find((row) => row.code === "labor_2")!;
    expect(second.quantity).toBe(first.quantity);
    expect(second.unitPrice - first.unitPrice).toBeCloseTo(4_000, 9);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice)
      .toBeCloseTo(4_000, 9);
    expect(secondOtherLabor.quantity).toBe(firstOtherLabor.quantity);
    expect(secondOtherLabor.unitPrice).toBe(firstOtherLabor.unitPrice);
  });

  test("keeps incomplete exact input blocked and generic supervision unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "Расчёт авторского надзора по приказу №52-нпа",
      { city: "Бишкек", countryCode: "KG" },
    );
    const blocked = incomplete.items.find((item) => item.normId === KG_AUTHOR_SUPERVISION_NORM_ID);
    expect(blocked).toMatchObject({ quantity: 0 });
    expect(blocked?.sourceParameters).toMatchObject({
      includedInEstimate: false,
      includedInProcurement: false,
      conditionalStatus: "blocked_missing_parameters",
    });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([
      expect.stringContaining("главам 1–9"),
      expect.stringContaining("текущей применимости"),
      expect.stringContaining("проезда"),
    ]));

    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Смета услуг авторского надзора для строительства",
      { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some((item) => item.normId === KG_AUTHOR_SUPERVISION_NORM_ID)).toBe(false);
    expect(generic.items.some((item) => item.normSourceId === KG_AUTHOR_SUPERVISION_SOURCE_ID))
      .toBe(false);
  });
});
