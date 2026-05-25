import type {
  RequestEstimateDraft,
  RequestEstimateDraftItem,
  RequestEstimateDraftValidation,
} from "./requestEstimateDraftTypes";

function isBlank(value: string | null | undefined): boolean {
  return (value ?? "").trim().length === 0;
}

function invalidQuantity(item: RequestEstimateDraftItem): boolean {
  return !Number.isFinite(item.quantity) || item.quantity <= 0;
}

export function validateRequestEstimateDraft(draft: RequestEstimateDraft): RequestEstimateDraftValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (isBlank(draft.draftId)) blockers.push("DRAFT_ID_REQUIRED");
  if (isBlank(draft.estimateId)) blockers.push("ESTIMATE_ID_REQUIRED");
  if (isBlank(draft.workKey)) blockers.push("WORK_KEY_REQUIRED");
  if (isBlank(draft.title)) blockers.push("TITLE_REQUIRED");
  if (isBlank(draft.description)) blockers.push("DESCRIPTION_REQUIRED");
  if (draft.items.length === 0) blockers.push("ITEMS_REQUIRED");

  draft.items.forEach((item) => {
    if (isBlank(item.rowId)) blockers.push("ROW_ID_REQUIRED");
    if (isBlank(item.name)) blockers.push(`ITEM_NAME_REQUIRED:${item.rowId}`);
    if (invalidQuantity(item)) blockers.push(`INVALID_QUANTITY:${item.rowId}`);
    if (item.source === "catalog_item" && isBlank(item.catalogItemId)) {
      blockers.push(`CATALOG_ITEM_ID_REQUIRED:${item.rowId}`);
    }
    if (item.source === "custom" && item.confidence !== "low") {
      blockers.push(`CUSTOM_ITEM_LOW_CONFIDENCE_REQUIRED:${item.rowId}`);
    }
    if (item.source === "estimate" && item.materialKey && !item.catalogItemId) {
      warnings.push(`CATALOG_SELECTION_RECOMMENDED:${item.rowId}`);
    }
    if (item.unitPrice == null || item.total == null) {
      warnings.push(`UNPRICED_ITEM:${item.rowId}`);
    }
  });

  return {
    canSave: blockers.length === 0,
    canSend: blockers.length === 0 && draft.items.length > 0,
    blockers,
    warnings,
  };
}

export function requestEstimateDraftWithValidation(draft: RequestEstimateDraft): RequestEstimateDraft {
  return {
    ...draft,
    validation: validateRequestEstimateDraft(draft),
  };
}
