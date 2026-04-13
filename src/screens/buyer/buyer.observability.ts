import { recordSwallowedError } from "../../lib/observability/swallowedError";

type BuyerBoundaryParams = {
  surface: string;
  event: string;
  error: unknown;
  sourceKind?: string;
  errorStage?: string;
  extra?: Record<string, unknown>;
};

export function reportBuyerBoundary(params: BuyerBoundaryParams) {
  return recordSwallowedError({
    screen: "buyer",
    surface: params.surface,
    event: params.event,
    error: params.error,
    sourceKind: params.sourceKind,
    errorStage: params.errorStage,
    extra: params.extra,
  });
}

export function reportBuyerTabsScrollToStartFailure(error: unknown) {
  return reportBuyerBoundary({
    surface: "buyer_tabs",
    event: "buyer_tabs_scroll_to_start_failed",
    error,
    sourceKind: "ui:tabs",
    errorStage: "scroll_to_start",
  });
}
