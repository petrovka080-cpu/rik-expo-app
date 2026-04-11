export type PdfNativeHandoffGuardDecision =
  | "start"
  | "skip_in_flight"
  | "skip_settled";

export type PdfNativeHandoffGuardState = {
  inFlightKey: string;
  settledKey: string;
};

export function createPdfNativeHandoffGuardState(): PdfNativeHandoffGuardState {
  return {
    inFlightKey: "",
    settledKey: "",
  };
}

export function createPdfNativeHandoffKey(params: {
  assetId: string;
  sessionId?: string | null;
  uri: string;
}): string {
  return `${params.sessionId || "direct"}:${params.assetId}:${params.uri}`;
}

export function beginPdfNativeHandoff(
  state: PdfNativeHandoffGuardState,
  handoffKey: string,
): PdfNativeHandoffGuardDecision {
  if (state.settledKey === handoffKey) return "skip_settled";
  if (state.inFlightKey === handoffKey) return "skip_in_flight";
  state.inFlightKey = handoffKey;
  return "start";
}

export function completePdfNativeHandoff(
  state: PdfNativeHandoffGuardState,
  handoffKey: string,
  result: "success" | "failure",
): boolean {
  if (state.inFlightKey !== handoffKey) return false;

  state.inFlightKey = "";
  if (result === "success") {
    state.settledKey = handoffKey;
  }
  return true;
}

export function resetPdfNativeHandoffGuard(
  state: PdfNativeHandoffGuardState,
) {
  state.inFlightKey = "";
  state.settledKey = "";
}
