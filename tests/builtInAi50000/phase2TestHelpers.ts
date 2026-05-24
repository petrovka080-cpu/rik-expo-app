import {
  BUILT_IN_AI_50000_FULL_CASES,
  BUILT_IN_AI_50000_FULL_DOMAIN_SUMMARY,
  BUILT_IN_AI_50000_FULL_MACRO_DOMAIN_SUMMARY,
  BUILT_IN_AI_50000_FULL_SHARD_PLAN,
  BUILT_IN_AI_50000_PHASE2_CHOICE,
  BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN,
  BUILT_IN_AI_50000_TARGET_CASES_PER_SHARD,
  BUILT_IN_AI_50000_TARGET_CASES_TOTAL,
  BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL,
  BUILT_IN_AI_50000_TARGET_MACRO_DOMAINS_TOTAL,
  BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL,
  validateBuiltInAi50000FullManifest,
} from "../../src/lib/ai/builtInAi50000";

export const fullCases = BUILT_IN_AI_50000_FULL_CASES;
export const fullShardPlan = BUILT_IN_AI_50000_FULL_SHARD_PLAN;

export function expectPhase2FullManifestValid(): void {
  const validation = validateBuiltInAi50000FullManifest(fullCases);
  expect(validation).toMatchObject({ valid: true, issues: [] });
  expect(fullCases).toHaveLength(BUILT_IN_AI_50000_TARGET_CASES_TOTAL);
  expect(Object.keys(BUILT_IN_AI_50000_FULL_MACRO_DOMAIN_SUMMARY)).toHaveLength(
    BUILT_IN_AI_50000_TARGET_MACRO_DOMAINS_TOTAL,
  );
  expect(Object.keys(BUILT_IN_AI_50000_FULL_DOMAIN_SUMMARY)).toHaveLength(
    BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL,
  );
  expect(fullShardPlan).toHaveLength(BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL);
  expect(new Set(fullCases.map((testCase) => testCase.id)).size).toBe(fullCases.length);
  expect(BUILT_IN_AI_50000_PHASE2_CHOICE).toBe("OPTION_B_GENERATE_FULL_50K_FROM_GOVERNED_ONTOLOGY");
}

export function expectPhase2ShardPlanValid(): void {
  expect(fullShardPlan).toHaveLength(BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL);
  for (const shard of fullShardPlan) {
    expect(shard.casesTotal).toBe(BUILT_IN_AI_50000_TARGET_CASES_PER_SHARD);
  }
  const allIds = fullShardPlan.flatMap((shard) => shard.caseIds);
  expect(new Set(allIds).size).toBe(BUILT_IN_AI_50000_TARGET_CASES_TOTAL);
}

export function expectPhase2DomainCoverageValid(): void {
  expect(Object.values(BUILT_IN_AI_50000_FULL_DOMAIN_SUMMARY)).toEqual(
    Array.from({ length: BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL }, () => BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN),
  );
}
