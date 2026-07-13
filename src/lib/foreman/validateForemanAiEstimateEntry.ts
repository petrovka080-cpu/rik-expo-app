import { buildForemanAiEstimateEntries } from "./buildForemanAiEstimateEntry";
import type {
  ForemanAiEstimateEntry,
  ForemanAiEstimateEntryPoint,
} from "./foremanAiEstimateEntryContract";

export type ForemanAiEstimateEntryValidation = {
  valid: boolean;
  entryPoint: ForemanAiEstimateEntryPoint;
  failures: string[];
};

export type ForemanAiEstimateEntryContractMatrix = {
  foreman_ai_estimate_entry_contract_created: boolean;
  foreman_materials_entry_created: boolean;
  foreman_subcontracts_entry_created: boolean;
  materials_entry_uses_shared_ai_estimate_engine: boolean;
  subcontracts_entry_uses_shared_ai_estimate_engine: boolean;
  old_picker_not_used: boolean;
  generic_draft_not_used: boolean;
  fake_green_claimed: false;
};

const expectedByEntryPoint: Record<ForemanAiEstimateEntryPoint, Pick<ForemanAiEstimateEntry, "mode" | "sourceBlockTestId" | "estimateButtonTestId">> = {
  foreman_materials_block: {
    mode: "materials_procurement_focus",
    sourceBlockTestId: "foreman-main-materials-open",
    estimateButtonTestId: "foreman-materials-estimate-open",
  },
  foreman_subcontracts_block: {
    mode: "subcontract_work_package_focus",
    sourceBlockTestId: "foreman-main-subcontracts-open",
    estimateButtonTestId: "foreman-subcontracts-estimate-open",
  },
};

export function validateForemanAiEstimateEntry(
  entry: ForemanAiEstimateEntry,
): ForemanAiEstimateEntryValidation {
  const failures: string[] = [];
  const expected = expectedByEntryPoint[entry.entryPoint];

  if (!expected) failures.push("unknown_entry_point");
  if (entry.sourceRoute !== "/office/foreman") failures.push("source_route_mismatch");
  if (expected && entry.mode !== expected.mode) failures.push("mode_mismatch");
  if (expected && entry.sourceBlockTestId !== expected.sourceBlockTestId) failures.push("source_block_test_id_mismatch");
  if (expected && entry.estimateButtonTestId !== expected.estimateButtonTestId) failures.push("estimate_button_test_id_mismatch");
  if (entry.usesSharedAiEstimateEngine !== true) failures.push("shared_ai_estimate_engine_not_used");
  if (entry.usesGlobalEstimatePipeline !== true) failures.push("global_estimate_pipeline_not_used");
  if (entry.usesProfessionalBoqSnapshot !== true) failures.push("professional_boq_snapshot_not_used");
  if (entry.forbiddenLegacyPickerVisible !== false) failures.push("legacy_picker_visible");
  if (entry.forbiddenGenericDraftVisible !== false) failures.push("generic_draft_visible");
  if (entry.requiresUserConfirmationBeforeSubmit !== true) failures.push("user_confirmation_not_required");

  return {
    valid: failures.length === 0,
    entryPoint: entry.entryPoint,
    failures,
  };
}

export function buildForemanAiEstimateEntryContractMatrix(
  entries: readonly ForemanAiEstimateEntry[] = buildForemanAiEstimateEntries(),
): ForemanAiEstimateEntryContractMatrix {
  const validations = entries.map(validateForemanAiEstimateEntry);
  const materials = entries.find((entry) => entry.entryPoint === "foreman_materials_block");
  const subcontracts = entries.find((entry) => entry.entryPoint === "foreman_subcontracts_block");

  return {
    foreman_ai_estimate_entry_contract_created: validations.every((item) => item.valid),
    foreman_materials_entry_created: Boolean(materials && validateForemanAiEstimateEntry(materials).valid),
    foreman_subcontracts_entry_created: Boolean(subcontracts && validateForemanAiEstimateEntry(subcontracts).valid),
    materials_entry_uses_shared_ai_estimate_engine: materials?.usesSharedAiEstimateEngine === true,
    subcontracts_entry_uses_shared_ai_estimate_engine: subcontracts?.usesSharedAiEstimateEngine === true,
    old_picker_not_used: entries.every((entry) => entry.forbiddenLegacyPickerVisible === false),
    generic_draft_not_used: entries.every((entry) => entry.forbiddenGenericDraftVisible === false),
    fake_green_claimed: false,
  };
}

export function validateForemanAiEstimateEntries(
  entries: readonly ForemanAiEstimateEntry[] = buildForemanAiEstimateEntries(),
): ForemanAiEstimateEntryValidation[] {
  return entries.map(validateForemanAiEstimateEntry);
}
