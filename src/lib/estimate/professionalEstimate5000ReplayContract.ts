import { PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH } from "./professionalEstimate5000CorpusContract";

export const PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA =
  "professional-estimate-5000-actual-replay-v1" as const;

export const PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARDS_TOTAL = 50 as const;
export const PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD = 100 as const;

export const PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_BLOCKED_STATUS =
  "STOP_PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_BLOCKERS_FOUND_NO_RELEASE" as const;

export const PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARD_PASSED_STATUS =
  "PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARD_PASSED_NOT_FULL_GREEN" as const;

export type ProfessionalEstimate5000ReplayPrompt = {
  readonly id: string;
  readonly domain: string;
  readonly prompt: string;
};

export type ProfessionalEstimate5000ReplayShardPlan = {
  readonly schema: typeof PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA;
  readonly corpus_manifest_hash: typeof PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH;
  readonly shard_id: number;
  readonly total_shards: number;
  readonly cases_per_shard: number;
  readonly cases_total: number;
  readonly first_case_id: string | null;
  readonly last_case_id: string | null;
  readonly case_ids: readonly string[];
  readonly domains: readonly string[];
  readonly fake_green_claimed: false;
};

export type ProfessionalEstimate5000ReplayShardPlanSummary = {
  readonly schema: typeof PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA;
  readonly corpus_manifest_hash: typeof PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH;
  readonly total_cases: number;
  readonly total_shards: number;
  readonly cases_per_shard: number;
  readonly shards: readonly ProfessionalEstimate5000ReplayShardPlan[];
  readonly duplicate_case_ids_count: number;
  readonly missing_case_ids_count: number;
  readonly fake_green_claimed: false;
};

function assertShardShape(input: {
  prompts: readonly ProfessionalEstimate5000ReplayPrompt[];
  totalShards: number;
  casesPerShard: number;
}): void {
  const expectedTotal = input.totalShards * input.casesPerShard;
  if (input.prompts.length !== expectedTotal) {
    throw new Error(`PROFESSIONAL_ESTIMATE_5000_REPLAY_TOTAL_INVALID:${input.prompts.length}:${expectedTotal}`);
  }
}

export function planProfessionalEstimate5000ReplayShards(
  prompts: readonly ProfessionalEstimate5000ReplayPrompt[],
  totalShards = PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARDS_TOTAL,
  casesPerShard = PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD,
): ProfessionalEstimate5000ReplayShardPlanSummary {
  assertShardShape({ prompts, totalShards, casesPerShard });
  const shards = Object.freeze(Array.from({ length: totalShards }, (_, shardId) => {
    const start = shardId * casesPerShard;
    const shardPrompts = prompts.slice(start, start + casesPerShard);
    return Object.freeze({
      schema: PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA,
      corpus_manifest_hash: PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH,
      shard_id: shardId,
      total_shards: totalShards,
      cases_per_shard: casesPerShard,
      cases_total: shardPrompts.length,
      first_case_id: shardPrompts[0]?.id ?? null,
      last_case_id: shardPrompts[shardPrompts.length - 1]?.id ?? null,
      case_ids: Object.freeze(shardPrompts.map((prompt) => prompt.id)),
      domains: Object.freeze([...new Set(shardPrompts.map((prompt) => prompt.domain))].sort()),
      fake_green_claimed: false,
    });
  }));
  const allCaseIds = shards.flatMap((shard) => shard.case_ids);
  return Object.freeze({
    schema: PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA,
    corpus_manifest_hash: PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH,
    total_cases: prompts.length,
    total_shards: totalShards,
    cases_per_shard: casesPerShard,
    shards,
    duplicate_case_ids_count: allCaseIds.length - new Set(allCaseIds).size,
    missing_case_ids_count: prompts.length - allCaseIds.length,
    fake_green_claimed: false,
  });
}

export function getProfessionalEstimate5000ReplayShardPrompts(
  prompts: readonly ProfessionalEstimate5000ReplayPrompt[],
  shardId: number,
  totalShards = PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARDS_TOTAL,
  casesPerShard = PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD,
): readonly ProfessionalEstimate5000ReplayPrompt[] {
  assertShardShape({ prompts, totalShards, casesPerShard });
  if (!Number.isInteger(shardId) || shardId < 0 || shardId >= totalShards) {
    throw new Error(`PROFESSIONAL_ESTIMATE_5000_REPLAY_SHARD_INVALID:${shardId}:${totalShards}`);
  }
  const start = shardId * casesPerShard;
  return Object.freeze(prompts.slice(start, start + casesPerShard));
}
