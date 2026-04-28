import type { BffClientConfig, BffFlow, BffResponseEnvelope } from "./bffContracts";
import { buildBffError, isBffEnabled } from "./bffSafety";

export type BffRequestPlan = {
  flow: BffFlow;
  enabled: boolean;
  baseUrlConfigured: boolean;
  networkExecutionAllowed: false;
};

export function buildBffRequestPlan(config: BffClientConfig, flow: BffFlow): BffRequestPlan {
  return {
    flow,
    enabled: isBffEnabled(config),
    baseUrlConfigured: typeof config.baseUrl === "string" && config.baseUrl.trim().length > 0,
    networkExecutionAllowed: false,
  };
}

export async function callBffDisabled<T>(): Promise<BffResponseEnvelope<T>> {
  return {
    ok: false,
    error: buildBffError("BFF_DISABLED", "Server API boundary is disabled"),
  };
}

export async function callBffContractOnly<T>(
  config: BffClientConfig,
  flow: BffFlow,
): Promise<BffResponseEnvelope<T>> {
  const plan = buildBffRequestPlan(config, flow);
  if (!plan.enabled) {
    return callBffDisabled<T>();
  }

  return {
    ok: false,
    error: buildBffError(
      "BFF_CONTRACT_ONLY",
      "Server API boundary contract exists but traffic migration is disabled",
    ),
  };
}
