import type {
  ForemanAiEstimateEntry,
  ForemanAiEstimateEntryPoint,
} from "./foremanAiEstimateEntryContract";

const MATERIALS_ENTRY: ForemanAiEstimateEntry = {
  entryPoint: "foreman_materials_block",
  mode: "materials_procurement_focus",
  sourceRoute: "/office/foreman",
  sourceBlockTestId: "foreman-main-materials-open",
  estimateButtonTestId: "foreman-materials-estimate-open",
  usesSharedAiEstimateEngine: true,
  usesGlobalEstimatePipeline: true,
  usesProfessionalBoqSnapshot: true,
  forbiddenLegacyPickerVisible: false,
  forbiddenGenericDraftVisible: false,
  requiresUserConfirmationBeforeSubmit: true,
};

const SUBCONTRACTS_ENTRY: ForemanAiEstimateEntry = {
  entryPoint: "foreman_subcontracts_block",
  mode: "subcontract_work_package_focus",
  sourceRoute: "/office/foreman",
  sourceBlockTestId: "foreman-main-subcontracts-open",
  estimateButtonTestId: "foreman-subcontracts-estimate-open",
  usesSharedAiEstimateEngine: true,
  usesGlobalEstimatePipeline: true,
  usesProfessionalBoqSnapshot: true,
  forbiddenLegacyPickerVisible: false,
  forbiddenGenericDraftVisible: false,
  requiresUserConfirmationBeforeSubmit: true,
};

export const FOREMAN_MATERIALS_AI_ESTIMATE_ENTRY = MATERIALS_ENTRY;
export const FOREMAN_SUBCONTRACTS_AI_ESTIMATE_ENTRY = SUBCONTRACTS_ENTRY;

export function buildForemanAiEstimateEntry(
  entryPoint: ForemanAiEstimateEntryPoint,
): ForemanAiEstimateEntry {
  return entryPoint === "foreman_materials_block"
    ? { ...MATERIALS_ENTRY }
    : { ...SUBCONTRACTS_ENTRY };
}

export function buildForemanAiEstimateEntries(): ForemanAiEstimateEntry[] {
  return [
    buildForemanAiEstimateEntry("foreman_materials_block"),
    buildForemanAiEstimateEntry("foreman_subcontracts_block"),
  ];
}
