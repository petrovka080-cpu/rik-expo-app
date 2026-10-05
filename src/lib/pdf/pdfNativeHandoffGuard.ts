export type PdfNativeHandoffGuardDecision =
  | "start"
  | "skip_in_flight"
  | "skip_settled";

export type PdfNativeHandoffGuardState = {
  inFlightKey: string;
  settledKey: string;
  generation: number;
};

export function createPdfNativeHandoffGuardState(): PdfNativeHandoffGuardState {
  return {
    inFlightKey: "",
    settledKey: "",
    generation: 0,
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
  allowSettledReopen = false,
): PdfNativeHandoffGuardDecision {
  if (state.inFlightKey === handoffKey) return "skip_in_flight";
  if (!allowSettledReopen && state.settledKey === handoffKey) return "skip_settled";
  state.generation += 1;
  state.inFlightKey = handoffKey;
  state.settledKey = "";
  return "start";
}

export function isPdfNativeHandoffCurrent(
  state: PdfNativeHandoffGuardState,
  handoffKey: string,
  generation: number,
): boolean {
  return state.inFlightKey === handoffKey && state.generation === generation;
}

export function completePdfNativeHandoff(
  state: PdfNativeHandoffGuardState,
  handoffKey: string,
  result: "success" | "failure",
  generation?: number,
): boolean {
  if (state.inFlightKey !== handoffKey) return false;
  if (generation !== undefined && !isPdfNativeHandoffCurrent(state, handoffKey, generation)) return false;

  state.inFlightKey = "";
  if (result === "success") {
    state.settledKey = handoffKey;
  }
  return true;
}

export function resetPdfNativeHandoffGuard(
  state: PdfNativeHandoffGuardState,
  options?: { preserveSettled?: boolean },
) {
  state.generation += 1;
  state.inFlightKey = "";
  if (!options?.preserveSettled) state.settledKey = "";
}
