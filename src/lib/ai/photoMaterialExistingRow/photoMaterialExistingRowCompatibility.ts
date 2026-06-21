import type { EditableEstimateRow } from "../editableEstimate";
import type {
  PhotoMaterialCandidate,
  PhotoMaterialCompatibilityResult,
} from "./photoMaterialExistingRowTypes";

function normalized(value: string | null | undefined): string {
  return (value ?? "").toLocaleLowerCase("ru-RU").replace(/[^a-zа-я0-9]+/giu, " ").trim();
}

function rowRequirementKeys(row: EditableEstimateRow): string[] {
  return [
    row.materialKey ?? "",
    row.rateKey ?? "",
    row.category ?? "",
    row.titleRu,
  ].map(normalized).filter(Boolean);
}

export function checkPhotoMaterialCandidateCompatibility(input: {
  row: EditableEstimateRow;
  candidate: PhotoMaterialCandidate;
  minConfidence?: number;
}): PhotoMaterialCompatibilityResult {
  if (input.row.rowType !== "material") {
    return {
      status: "PRODUCT_INCOMPATIBLE_WITH_ESTIMATE_ROW",
      compatible: false,
      targetRowId: input.row.rowId,
      candidateId: input.candidate.candidateId,
      reasonCodes: ["TARGET_ROW_NOT_MATERIAL"],
    };
  }
  if (input.candidate.confidence < (input.minConfidence ?? 0.55)) {
    return {
      status: "LOW_CONFIDENCE_RESCAN_REQUIRED",
      compatible: false,
      targetRowId: input.row.rowId,
      candidateId: input.candidate.candidateId,
      reasonCodes: ["LOW_CONFIDENCE"],
    };
  }
  const keys = rowRequirementKeys(input.row);
  const candidateKey = normalized(input.candidate.materialKey);
  const visibleName = normalized(input.candidate.visibleName);
  const packageLabel = normalized(input.candidate.packageLabel);
  const exactKeyMatch = Boolean(input.row.materialKey && input.row.materialKey === input.candidate.materialKey);
  const semanticMatch = keys.some((key) =>
    key === candidateKey ||
    visibleName.includes(key) ||
    key.includes(candidateKey) ||
    packageLabel.includes(key)
  );
  if (!exactKeyMatch && !semanticMatch) {
    return {
      status: "PRODUCT_INCOMPATIBLE_WITH_ESTIMATE_ROW",
      compatible: false,
      targetRowId: input.row.rowId,
      candidateId: input.candidate.candidateId,
      reasonCodes: ["MATERIAL_REQUIREMENT_MISMATCH"],
    };
  }
  return {
    status: "COMPATIBLE",
    compatible: true,
    targetRowId: input.row.rowId,
    candidateId: input.candidate.candidateId,
    reasonCodes: [],
  };
}
