import {
  parseEstimateRuntimeBoolean,
  type EstimateRuntimeEnv,
} from "./estimateFeatureFlags";

export const ESTIMATE_KILL_SWITCH_NAMES = [
  "AI_ESTIMATE_DISABLE_ALL",
  "AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING",
  "AI_ESTIMATE_DISABLE_PDF",
  "AI_ESTIMATE_DISABLE_BUYER_HANDOFF",
  "AI_ESTIMATE_FORCE_QUANTITY_ONLY_MODE",
] as const;

export type EstimateKillSwitchName = typeof ESTIMATE_KILL_SWITCH_NAMES[number];
export type EstimateKillSwitches = Record<EstimateKillSwitchName, boolean>;

const DEFAULT_SWITCHES: EstimateKillSwitches = {
  AI_ESTIMATE_DISABLE_ALL: false,
  AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING: false,
  AI_ESTIMATE_DISABLE_PDF: false,
  AI_ESTIMATE_DISABLE_BUYER_HANDOFF: false,
  AI_ESTIMATE_FORCE_QUANTITY_ONLY_MODE: false,
};

function readRuntimeEnv(): EstimateRuntimeEnv {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env;
}

export function getEstimateKillSwitches(env: EstimateRuntimeEnv = readRuntimeEnv()): EstimateKillSwitches {
  return ESTIMATE_KILL_SWITCH_NAMES.reduce<EstimateKillSwitches>((switches, name) => {
    switches[name] = parseEstimateRuntimeBoolean(env[name], DEFAULT_SWITCHES[name]);
    return switches;
  }, { ...DEFAULT_SWITCHES });
}

export function activeEstimateKillSwitches(
  env: EstimateRuntimeEnv = readRuntimeEnv(),
): EstimateKillSwitchName[] {
  const switches = getEstimateKillSwitches(env);
  return ESTIMATE_KILL_SWITCH_NAMES.filter((name) => switches[name]);
}

export function hasActiveEstimateKillSwitch(env: EstimateRuntimeEnv = readRuntimeEnv()): boolean {
  return activeEstimateKillSwitches(env).length > 0;
}
