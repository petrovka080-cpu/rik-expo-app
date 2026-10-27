import { logger } from "../../lib/logger";
export const FOREMAN_CONTEXT_DEBUG = String(process.env.EXPO_PUBLIC_FOREMAN_DEBUG_CONTEXT ?? "").trim() === "1";

export function debugForemanLog(tag: string, payload: unknown) {
  if (!__DEV__ || !FOREMAN_CONTEXT_DEBUG) return;
  // Keep single logger to make disabling diagnostics deterministic.
  logger.info("log", tag, payload);
}

export function debugForemanLogLazy(tag: string, payloadFactory: () => unknown) {
  if (!__DEV__ || !FOREMAN_CONTEXT_DEBUG) return;
  logger.info("log", tag, payloadFactory());
}
