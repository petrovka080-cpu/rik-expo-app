import {
  PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES,
  PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASE_SET,
  runProfessionalBoqRuntimeContractCases,
  type ProfessionalBoqRuntimeContractCaseProof,
} from "../../scripts/estimate/professionalBoqRuntimeContractCases";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import type { ConsumerRepairAiDraft } from "../../src/lib/consumerRequests";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { applyProfessionalBoqRuntimeContract } from "../../src/lib/estimate/buildProfessionalBoqDraft";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import { validateProfessionalBoqRuntimeContract } from "../../src/lib/estimate/professionalBoqRuntimeValidator";

function completeDraft(units: string[] = ["m2"]): ConsumerRepairAiDraft {
  return {
    titleRu: "Contract audit draft",
    summaryRu: "Preliminary BOQ with source-backed rows.",
    repairType: "contract_audit",
    dangerousDiyBlocked: false,
    missingData: [],
    items: units.map((unit, index) => ({
      itemType: index === 0 ? "material" : "work",
      titleRu: `Row ${index + 1}`,
      quantity: 1,
      unit,
      unitLabel: unit,
      unitPrice: null,
      currency: "KGS",
      source: "reference_price_book",
      sourceId: `source:${index + 1}`,
      sourceLabel: "Engineering source",
      category: index === 0 ? "material" : "work",
      formulaId: `formula:${index + 1}`,
      quantityFormula: "q",
      calculationTrace: `q=1; unit=${unit}`,
      sourceParameters: { rowCode: `row_${index + 1}` },
      templateId: "contract_audit_template_v1",
      templateVersion: "1.0.0",
      normId: `norm:${index + 1}`,
      normFamilyId: "norm_family:contract_audit",
      normSourceId: "src_contract_audit",
      normSourceTitle: "Contract audit source",
      normVersion: "2026-07",
      normReviewStatus: "quantity_engineering_reviewed",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Price missing",
      costConfidence: "missing",
      confidence: "medium",
      addedBy: "ai",
    })),
  };
}

describe("professional BOQ runtime contract", () => {
  let proofs: ProfessionalBoqRuntimeContractCaseProof[];

  beforeAll(() => {
    proofs = runProfessionalBoqRuntimeContractCases();
  });

  it("passes the 18-case runtime contract set", () => {
    const failed = proofs.filter((proof) => !proof.passed);

    expect(PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASE_SET).toBe("professional-boq-runtime-contract-18");
    expect(proofs).toHaveLength(PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length);
    expect(failed).toEqual([]);
  });

  it("seals every runtime row with type, unit, norm provenance, trace and contract marker", () => {
    for (const proof of proofs) {
      expect(proof.row_count).toBeGreaterThan(0);
      expect(proof.all_rows_have_row_type).toBe(true);
      expect(proof.all_rows_have_canonical_unit).toBe(true);
      expect(proof.all_rows_have_norm_source).toBe(true);
      expect(proof.all_rows_have_calculation_trace).toBe(true);
      expect(proof.all_rows_have_runtime_contract_marker).toBe(true);
      expect(proof.no_fake_final_total_without_source).toBe(true);
    }
  });

  it("does not invent missing passport or normative source", () => {
    const draft = completeDraft();
    delete draft.items[0].normId;
    delete draft.items[0].normFamilyId;
    delete draft.items[0].normSourceId;
    delete draft.items[0].normVersion;

    const contracted = applyProfessionalBoqRuntimeContract(draft, { prompt: "contract audit" });
    const validation = validateProfessionalBoqRuntimeContract({ prompt: "contract audit", draft: contracted });

    expect(contracted.items[0].normId).toBeUndefined();
    expect(contracted.items[0].normSourceId).toBeUndefined();
    expect(validation.failures).toContain("professional_draft_rows_without_norm_source");
  });

  it("does not hide missing parameters or missing price", () => {
    const draft = completeDraft();
    draft.missingData.push("span length");
    draft.items[0].unitPrice = null;
    draft.items[0].priceStatus = "PRICE_MISSING";

    const contracted = applyProfessionalBoqRuntimeContract(draft, { prompt: "contract audit" });

    expect(contracted.missingData).toContain("span length");
    expect(contracted.items[0].unitPrice).toBeNull();
    expect(contracted.items[0].priceStatus).toBe("PRICE_MISSING");
  });

  it("does not make incomplete BOQ rows professionally valid by adding markers", () => {
    const draft = completeDraft();
    draft.items[0].quantity = 0;
    delete draft.items[0].formulaId;
    delete draft.items[0].quantityFormula;
    delete draft.items[0].calculationTrace;

    const contracted = applyProfessionalBoqRuntimeContract(draft, { prompt: "contract audit" });
    const validation = validateProfessionalBoqRuntimeContract({ prompt: "contract audit", draft: contracted });

    expect(contracted.items[0].sourceParameters?.professionalBoqRuntimeContract).toBe("professional_boq_runtime_contract_v1");
    expect(validation.failures).toContain("invalid_boq_row_shape");
    expect(validation.failures).toContain("professional_draft_rows_without_trace");
    expect(validation.passed).toBe(false);
  });

  it("is idempotent and preserves row identity fields used by revision hashes", () => {
    const once = applyProfessionalBoqRuntimeContract(completeDraft(["m2", "m3"]), { prompt: "contract audit" });
    const twice = applyProfessionalBoqRuntimeContract(once, { prompt: "contract audit" });

    expect(twice).toEqual(once);
    expect(twice.items.map((item) => ({
      unit: item.unit,
      formulaId: item.formulaId,
      normId: item.normId,
      templateId: item.templateId,
    }))).toEqual(once.items.map((item) => ({
      unit: item.unit,
      formulaId: item.formulaId,
      normId: item.normId,
      templateId: item.templateId,
    })));
  });

  it("preserves canonical runtime units across the requested matrix", () => {
    const units = ["m2", "m3", "linear_m", "kg", "l", "piece", "set", "day", "hour"];
    const contracted = applyProfessionalBoqRuntimeContract(completeDraft(units), { prompt: "contract audit" });
    const validation = validateProfessionalBoqRuntimeContract({ prompt: "contract audit", draft: contracted });

    expect(contracted.items.map((item) => item.unit)).toEqual(units);
    expect(validation.failures.filter((failure) => failure.startsWith("canonical_unit_blockers"))).toEqual([]);
  });

  it("keeps base-template machine unit separate from display unit label", () => {
    const result = buildEstimateFromInlineWorkPrompt({
      rawInput: "10 m2",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      currency: "KGS",
      countryCode: "KG",
    });
    const units = result.draft?.items.map((item) => item.unit) ?? [];
    const unitLabels = result.draft?.items.map((item) => item.unitLabel ?? "") ?? [];

    expect(units).toContain("m2");
    expect(units).not.toContain("м²");
    expect(unitLabels).toContain("м²");
  });
  it("routes profiled sheet fence prompts to the outdoor dynamic BOQ instead of the interior catalog template", () => {
    const rawInput = "site perimeter profiled metal fence 100 m height 2 m";
    const inlineResult = buildEstimateFromInlineWorkPrompt({
      rawInput,
      currency: "KGS",
      countryCode: "KG",
    });
    const runtimeDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      rawInput,
      city: "Bishkek",
      currency: "KGS",
    });
    const draft = runtimeDraft ?? inlineResult.draft;
    const templateIds = [...new Set(draft?.items.map((item) => item.templateId) ?? [])];
    const units = [...new Set(draft?.items.map((item) => item.unit) ?? [])];
    const titles = (draft?.items.map((item) => item.titleRu).join("\n") ?? "").toLocaleLowerCase("ru-RU");
    const rowCodes = draft?.items.map((item) => String(item.sourceParameters?.rowCode ?? "")) ?? [];

    expect(inlineResult.draft?.selectedWork?.selectedWorkKey).toBe("dynamic_fencing_estimate");
    expect(runtimeDraft?.repairType).toBe("profile_sheet_fence");
    expect(templateIds).toEqual(["dynamic_fencing_estimate_dynamic_professional_boq_runtime_v1"]);
    expect(templateIds).not.toContain("carpentry_metal_interior_fence_install_standard_professional_expanded_v1");
    expect(rowCodes).not.toContain("required_plan_equipment_1");
    expect(rowCodes).not.toContain("required_plan_equipment_2");
    expect(units).toEqual(expect.arrayContaining(["linear_m", "m3", "pcs", "set", "shift", "sq_m", "trip"]));
    expect(titles).toContain("панели / профнастил");
    expect(titles).toContain("бур / мотобур");
    expect(titles).toContain("металлические столбы");
    expect(titles).toContain("бетон");
    expect(titles).toContain("крепеж");
    expect(titles).toContain("антикоррозион");
    expect(titles).toContain("линии забора");
  });

  it("keeps tile primer as a consumable quantity instead of an area row", () => {
    const tileCase = PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.find(
      (testCase) => testCase.case_id === "runtime-tile-001",
    );
    if (!tileCase) throw new Error("runtime_tile_case_missing");
    const draft = buildConsumerRepairAiDraft(tileCase.prompt, {
      city: "Bishkek",
      currency: "KGS",
    });
    const primer = draft.items.find((item) =>
      String(item.sourceParameters?.rowCode ?? "").endsWith("_primer"),
    );

    expect(primer?.unit).toBe("kg");
  });
});
