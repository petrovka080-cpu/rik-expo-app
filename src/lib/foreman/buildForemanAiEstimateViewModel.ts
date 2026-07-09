import {
  buildSharedAiEstimateViewModel,
  validateSharedAiEstimateViewModel,
  type SharedAiEstimateViewModel,
} from "../ai/estimatePresentation";
import type { GlobalEstimateResult } from "../ai/globalEstimate";
import type { StructuredEstimatePayload } from "../estimateStructuredPipeline";
import {
  mapAiEstimateToForemanDraft,
  mapApprovedForemanDraftToBuyerRows,
  verifyForemanAiEstimatePayloadParity,
  type ForemanAiEstimateDraftMapping,
  type ForemanDraftEstimateRow,
  type ForemanEstimateContext,
} from "../foremanAiEstimate";
import {
  buildForemanAiEstimateEntry,
} from "./buildForemanAiEstimateEntry";
import type {
  ForemanAiEstimateEntry,
  ForemanAiEstimateEntryPoint,
} from "./foremanAiEstimateEntryContract";
import { validateForemanAiEstimateEntry } from "./validateForemanAiEstimateEntry";

export type ForemanAiEstimateViewModel = {
  entry: ForemanAiEstimateEntry;
  shared: SharedAiEstimateViewModel;
  mapping: ForemanAiEstimateDraftMapping;
  rows: ForemanDraftEstimateRow[];
  materialRows: ForemanDraftEstimateRow[];
  workServiceEquipmentRows: ForemanDraftEstimateRow[];
  buyerProcurementRows: ReturnType<typeof mapApprovedForemanDraftToBuyerRows>;
  rowCount: number;
  hiddenByFocusCount: 0;
  selectedWorkActiveInput: string;
  userConfirmationRequiredBeforeSubmit: true;
  autoSubmitWithoutConfirmation: false;
  usesSharedAiEstimateViewModel: true;
  noScreenLocalCalculation: true;
  noSecondEstimateEngine: true;
  fakeGreenClaimed: false;
};

export type ForemanAiEstimateViewModelValidation = {
  passed: boolean;
  failures: string[];
};

const materialFocusWeight = (row: ForemanDraftEstimateRow): number => {
  if (row.section === "materials") return 0;
  if (row.section === "equipment" || row.section === "delivery") return 1;
  if (row.section === "labor" || row.section === "quality_control") return 2;
  return 3;
};

const subcontractFocusWeight = (row: ForemanDraftEstimateRow): number => {
  if (row.section === "labor" || row.section === "equipment") return 0;
  if (row.section === "delivery" || row.section === "materials") return 1;
  if (row.section === "quality_control") return 2;
  return 3;
};

function rowsForEntry(
  entry: ForemanAiEstimateEntry,
  rows: readonly ForemanDraftEstimateRow[],
): ForemanDraftEstimateRow[] {
  const weight = entry.mode === "materials_procurement_focus"
    ? materialFocusWeight
    : subcontractFocusWeight;
  return [...rows].sort((left, right) => weight(left) - weight(right));
}

export function buildForemanAiEstimateViewModel(input: {
  entryPoint: ForemanAiEstimateEntryPoint;
  estimate: GlobalEstimateResult | StructuredEstimatePayload;
  context: ForemanEstimateContext;
  estimateRevisionId?: string | null;
}): ForemanAiEstimateViewModel {
  const entry = buildForemanAiEstimateEntry(input.entryPoint);
  const shared = buildSharedAiEstimateViewModel({ estimate: input.estimate });
  const mapping = mapAiEstimateToForemanDraft({
    estimate: shared.payload,
    context: input.context,
    estimateRevisionId: input.estimateRevisionId,
  });
  const rows = rowsForEntry(entry, mapping.rows);

  return {
    entry,
    shared,
    mapping,
    rows,
    materialRows: mapping.rows.filter((row) => row.section === "materials"),
    workServiceEquipmentRows: mapping.rows.filter((row) =>
      row.section === "labor" || row.section === "equipment" || row.section === "delivery",
    ),
    buyerProcurementRows: mapApprovedForemanDraftToBuyerRows(mapping.rows),
    rowCount: mapping.rows.length,
    hiddenByFocusCount: 0,
    selectedWorkActiveInput: shared.originalText,
    userConfirmationRequiredBeforeSubmit: true,
    autoSubmitWithoutConfirmation: false,
    usesSharedAiEstimateViewModel: true,
    noScreenLocalCalculation: true,
    noSecondEstimateEngine: true,
    fakeGreenClaimed: false,
  };
}

export function validateForemanAiEstimateViewModel(
  viewModel: ForemanAiEstimateViewModel,
): ForemanAiEstimateViewModelValidation {
  const failures: string[] = [];
  const entryValidation = validateForemanAiEstimateEntry(viewModel.entry);
  const sharedValidation = validateSharedAiEstimateViewModel(viewModel.shared);
  const parity = verifyForemanAiEstimatePayloadParity(viewModel.mapping);

  if (!entryValidation.valid) failures.push(...entryValidation.failures.map((failure) => `entry:${failure}`));
  if (!sharedValidation.passed) failures.push(...sharedValidation.failures.map((failure) => `shared:${failure}`));
  if (!parity.ok) failures.push(...parity.issues.map((issue) => `parity:${issue.code}`));
  if (viewModel.rowCount !== viewModel.shared.rows.length) failures.push("shared_foreman_row_count_mismatch");
  if (viewModel.rows.length !== viewModel.mapping.rows.length) failures.push("focus_adapter_truncated_rows");
  if (viewModel.hiddenByFocusCount !== 0) failures.push("focus_adapter_hid_rows");
  if (viewModel.materialRows.length === 0) failures.push("material_rows_missing");
  if (viewModel.workServiceEquipmentRows.length === 0) failures.push("work_service_equipment_rows_missing");
  if (viewModel.buyerProcurementRows.length === 0) failures.push("buyer_procurement_rows_missing");
  if (viewModel.buyerProcurementRows.some((row) => row.kind !== "material")) failures.push("buyer_non_material_row_leaked");
  if (viewModel.userConfirmationRequiredBeforeSubmit !== true) failures.push("user_confirmation_not_required");
  if (viewModel.autoSubmitWithoutConfirmation !== false) failures.push("auto_submit_without_confirmation");
  if (viewModel.usesSharedAiEstimateViewModel !== true) failures.push("shared_view_model_not_used");
  if (viewModel.noScreenLocalCalculation !== true) failures.push("screen_local_calculation_detected");
  if (viewModel.noSecondEstimateEngine !== true) failures.push("second_estimate_engine_detected");
  if (viewModel.fakeGreenClaimed !== false) failures.push("fake_green_claimed");

  return {
    passed: failures.length === 0,
    failures,
  };
}
