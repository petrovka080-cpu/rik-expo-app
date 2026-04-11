export type DirectorReportsInFlightEntry = {
  reqId: number;
  promise: Promise<void>;
};

export type DirectorReportsInFlightDecision =
  | { action: "none" }
  | { action: "join"; reqId: number; promise: Promise<void> }
  | { action: "drop_stale"; staleReqId: number; currentReqId: number };

export function resolveDirectorReportsInFlight(
  entries: Map<string, DirectorReportsInFlightEntry>,
  key: string,
  currentReqId: number,
): DirectorReportsInFlightDecision {
  const entry = entries.get(key);
  if (!entry) return { action: "none" };
  if (entry.reqId === currentReqId) {
    return { action: "join", reqId: entry.reqId, promise: entry.promise };
  }
  entries.delete(key);
  return {
    action: "drop_stale",
    staleReqId: entry.reqId,
    currentReqId,
  };
}

export function clearDirectorReportsInFlight(
  entries: Map<string, DirectorReportsInFlightEntry>,
  key: string,
  reqId: number,
) {
  const entry = entries.get(key);
  if (!entry || entry.reqId !== reqId) return false;
  entries.delete(key);
  return true;
}
