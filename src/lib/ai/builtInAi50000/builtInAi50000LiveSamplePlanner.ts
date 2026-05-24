import type { BuiltInAi50000Phase1Case } from "./builtInAi50000CaseTypes";
import { BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS } from "./builtInAi50000Ontology";
import { BUILT_IN_AI_50000_PHASE1_CASES } from "./builtInAi50000Phase1Manifest";

const MANDATORY_IDS = [
  "phase1_anchor_brick_masonry_74sqm",
  "phase1_anchor_gable_roof_installation_100sqm",
  "phase1_anchor_asphalt_paving_1000sqm",
  "phase1_anchor_carpet_laying_100sqm",
  "phase1_anchor_ceramic_tile_floor_laying_174sqm",
  "phase1_anchor_rebar_product_search_d14",
  "phase1_anchor_asphalt_supplier_search_10000sqm",
  "phase1_anchor_estimate_to_pdf",
] as const;

function uniqueById(cases: readonly BuiltInAi50000Phase1Case[]): BuiltInAi50000Phase1Case[] {
  const seen = new Set<string>();
  return cases.filter((testCase) => {
    if (seen.has(testCase.id)) return false;
    seen.add(testCase.id);
    return true;
  });
}

export function planBuiltInAi50000Phase1WebLiveSample(): readonly BuiltInAi50000Phase1Case[] {
  const mandatory = MANDATORY_IDS
    .map((id) => BUILT_IN_AI_50000_PHASE1_CASES.find((testCase) => testCase.id === id))
    .filter((testCase): testCase is BuiltInAi50000Phase1Case => Boolean(testCase));
  const perDomain = BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS.flatMap((macroDomainId) =>
    BUILT_IN_AI_50000_PHASE1_CASES.filter((testCase) => testCase.macroDomainId === macroDomainId).slice(0, 5),
  );
  return Object.freeze(uniqueById([...mandatory, ...perDomain]).slice(0, 125));
}

export function planBuiltInAi50000Phase1AndroidLiveSample(): readonly BuiltInAi50000Phase1Case[] {
  const mandatory = MANDATORY_IDS
    .map((id) => BUILT_IN_AI_50000_PHASE1_CASES.find((testCase) => testCase.id === id))
    .filter((testCase): testCase is BuiltInAi50000Phase1Case => Boolean(testCase));
  const perDomain = BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS.flatMap((macroDomainId) =>
    BUILT_IN_AI_50000_PHASE1_CASES.filter((testCase) => testCase.macroDomainId === macroDomainId).slice(0, 2),
  );
  return Object.freeze(uniqueById([...mandatory, ...perDomain]).slice(0, 50));
}
