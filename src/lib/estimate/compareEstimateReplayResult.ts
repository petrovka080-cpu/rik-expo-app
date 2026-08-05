import type {
  EstimateReplayComparison,
  EstimateReplayDriftType,
  EstimateReplayHashSet,
  EstimateReplayMismatch,
  AnyEstimateReplayRecord,
} from "./replayableEstimateCoreContract";

const HASH_DRIFT_TYPES: Record<keyof EstimateReplayHashSet, EstimateReplayDriftType> = {
  prompt_hash: "prompt_or_param_change",
  params_hash: "prompt_or_param_change",
  boq_hash: "formula_or_catalog_update",
  material_quantity_hash: "norm_registry_update",
  snapshot_hash: "artifact_package_update",
  costing_hash: "pricebook_update",
  pdf_package_hash: "artifact_package_update",
  buyer_handoff_hash: "buyer_handoff_update",
};

const HASH_NAMES: (keyof EstimateReplayHashSet)[] = [
  "prompt_hash",
  "params_hash",
  "boq_hash",
  "material_quantity_hash",
  "snapshot_hash",
  "costing_hash",
  "pdf_package_hash",
  "buyer_handoff_hash",
];

function strongestDriftType(mismatches: readonly EstimateReplayMismatch[]): EstimateReplayDriftType {
  if (mismatches.length === 0) return "none";
  const priority: EstimateReplayDriftType[] = [
    "prompt_or_param_change",
    "formula_or_catalog_update",
    "norm_registry_update",
    "pricebook_update",
    "artifact_package_update",
    "buyer_handoff_update",
  ];
  return priority.find((candidate) => mismatches.some((item) => item.drift_type === candidate)) ?? "artifact_package_update";
}

export function compareEstimateReplayRecords(
  expected: AnyEstimateReplayRecord,
  actual: AnyEstimateReplayRecord,
): EstimateReplayComparison {
  const mismatches = HASH_NAMES
    .filter((name) => expected.hashes[name] !== actual.hashes[name])
    .map((name) => ({
      hash_name: name,
      expected_hash: expected.hashes[name],
      actual_hash: actual.hashes[name],
      drift_type: HASH_DRIFT_TYPES[name],
    }));
  const rowsCountMatch = expected.row_count === actual.row_count;
  const materialRowsCountMatch = expected.material_rows_count === actual.material_rows_count;
  const workRowsCountMatch = expected.work_rows_count === actual.work_rows_count;
  const snapshotRowsHashMatch = expected.snapshot_rows_hash === actual.snapshot_rows_hash;
  const snapshotTotalsHashMatch = expected.snapshot_totals_hash === actual.snapshot_totals_hash;
  const blockers = [
    mismatches.length === 0 ? "" : `hash_mismatch:${mismatches.map((item) => item.hash_name).join(",")}`,
    rowsCountMatch ? "" : "row_count_mismatch",
    materialRowsCountMatch ? "" : "material_rows_count_mismatch",
    workRowsCountMatch ? "" : "work_rows_count_mismatch",
    snapshotRowsHashMatch ? "" : "snapshot_rows_hash_mismatch",
    snapshotTotalsHashMatch ? "" : "snapshot_totals_hash_mismatch",
  ].filter(Boolean);
  return {
    status: blockers.length === 0 ? "passed" : "failed",
    drift_detected: blockers.length > 0,
    drift_type: strongestDriftType(mismatches),
    expected_record_id: expected.record_id,
    actual_record_id: actual.record_id,
    mismatches,
    mismatch_count: mismatches.length,
    rows_count_match: rowsCountMatch,
    material_rows_count_match: materialRowsCountMatch,
    work_rows_count_match: workRowsCountMatch,
    snapshot_rows_hash_match: snapshotRowsHashMatch,
    snapshot_totals_hash_match: snapshotTotalsHashMatch,
    blocking_reasons: blockers,
  };
}
