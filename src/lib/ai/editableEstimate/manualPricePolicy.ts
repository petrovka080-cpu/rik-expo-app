import type {
  EditableEstimatePriceSource,
  EditableEstimatePriceStatus,
  EditableEstimateRow,
} from "./editableEstimateTypes";

export function isEditableEstimateUserPriceStatus(status: EditableEstimatePriceStatus | null | undefined): boolean {
  return status === "USER_PRICE_OVERRIDE" || status === "USER_ENTERED_PRICE";
}

export function isEditableEstimateUserConfirmedMarketPriceStatus(
  status: EditableEstimatePriceStatus | null | undefined,
): boolean {
  return status === "USER_CONFIRMED_MARKET_PRICE";
}

export function resolveEditableEstimateInitialPricePolicy(input: {
  unitPrice?: number | null;
  rowSource?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  catalogItemId?: string | null;
  selectedCatalogItemId?: string | null;
  priceStatus?: EditableEstimatePriceStatus | null;
  priceSource?: EditableEstimatePriceSource | null;
  priceSourceId?: string | null;
  priceSourceLabel?: string | null;
}): {
  priceStatus: EditableEstimatePriceStatus;
  priceSource: EditableEstimatePriceSource;
  priceSourceId: string | null;
  priceSourceLabel: string | null;
} {
  if (input.priceStatus && input.priceSource && !(input.unitPrice != null && input.priceStatus === "PRICE_MISSING")) {
    return {
      priceStatus: input.priceStatus,
      priceSource: input.priceSource,
      priceSourceId: input.priceSourceId ?? null,
      priceSourceLabel: input.priceSourceLabel ?? null,
    };
  }

  if (input.unitPrice == null) {
    return {
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: null,
    };
  }

  if (input.rowSource === "catalog_item" || input.catalogItemId || input.selectedCatalogItemId) {
    return {
      priceStatus: "CATALOG_PRICE_VERIFIED",
      priceSource: "catalog_item",
      priceSourceId: input.sourceId ?? input.catalogItemId ?? input.selectedCatalogItemId ?? null,
      priceSourceLabel: input.sourceLabel ?? "catalog_items",
    };
  }

  if (input.rowSource === "reference_price_book") {
    return {
      priceStatus: "REFERENCE_PRICE_ESTIMATE",
      priceSource: "reference_price_book",
      priceSourceId: input.sourceId ?? null,
      priceSourceLabel: input.sourceLabel ?? null,
    };
  }

  return {
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: null,
  };
}

export function applyEditableEstimateManualPricePolicy(input: {
  row: EditableEstimateRow;
  unitPrice: number;
  actorUserId?: string | null;
  reason?: string | null;
  at: string;
}): EditableEstimateRow {
  const previousHadTrustedPrice =
    input.row.unitPrice != null &&
    input.row.priceStatus !== "PRICE_MISSING" &&
    !isEditableEstimateUserPriceStatus(input.row.priceStatus);
  const status = previousHadTrustedPrice ? "USER_PRICE_OVERRIDE" : "USER_ENTERED_PRICE";
  return {
    ...input.row,
    unitPrice: input.unitPrice,
    priceStatus: status,
    priceSource: "user",
    priceSourceId: null,
    priceSourceLabel: "user_entered_price",
    confidence: input.row.confidence ?? "medium",
    manualPrice: {
      unitPrice: input.unitPrice,
      currency: input.row.currency,
      status,
      actorUserId: input.actorUserId ?? null,
      reason: input.reason ?? null,
      updatedAt: input.at,
    },
  };
}

export function clearEditableEstimateManualPrice(row: EditableEstimateRow): EditableEstimateRow {
  return {
    ...row,
    unitPrice: null,
    totalPrice: null,
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: null,
    manualPrice: null,
  };
}
