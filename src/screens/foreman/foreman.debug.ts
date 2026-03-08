export const FOREMAN_CONTEXT_DEBUG = String(process.env.EXPO_PUBLIC_FOREMAN_DEBUG_CONTEXT ?? "").trim() === "1";

export function debugForemanLog(tag: string, payload: unknown) {
  if (!FOREMAN_CONTEXT_DEBUG) return;
  // Keep single logger to make disabling diagnostics deterministic.
  console.log(tag, payload);
}

export function debugForemanLogLazy(tag: string, payloadFactory: () => unknown) {
  if (!FOREMAN_CONTEXT_DEBUG) return;
  console.log(tag, payloadFactory());
}
