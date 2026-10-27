import type { BuiltInAi50000Case, BuiltInAi50000Phase1Case, BuiltInAi50000Shard } from "./builtInAi50000CaseTypes";
import {
  BUILT_IN_AI_50000_PHASE1_CASES_PER_SHARD,
  BUILT_IN_AI_50000_PHASE1_SHARDS_TOTAL,
  BUILT_IN_AI_50000_TARGET_CASES_PER_SHARD,
  BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL,
} from "./builtInAi50000Ontology";
import { BUILT_IN_AI_50000_FULL_CASES } from "./builtInAi50000FullManifest";
import { BUILT_IN_AI_50000_PHASE1_CASES } from "./builtInAi50000Phase1Manifest";

export function planBuiltInAi50000Phase1Shards(
  cases: readonly BuiltInAi50000Phase1Case[] = BUILT_IN_AI_50000_PHASE1_CASES,
  totalShards = BUILT_IN_AI_50000_PHASE1_SHARDS_TOTAL,
): readonly BuiltInAi50000Shard[] {
  return Object.freeze(Array.from({ length: totalShards }, (_, shardId) => {
    const shardCases = cases.filter((testCase) => testCase.shardId === shardId);
    return {
      shardId,
      totalShards,
      caseIds: shardCases.map((testCase) => testCase.id),
      macroDomainIds: [...new Set(shardCases.map((testCase) => testCase.macroDomainId))],
      casesTotal: shardCases.length,
    };
  }));
}

export function getBuiltInAi50000Phase1ShardCases(
  shardId: number,
  totalShards = BUILT_IN_AI_50000_PHASE1_SHARDS_TOTAL,
): readonly BuiltInAi50000Phase1Case[] {
  if (!Number.isInteger(shardId) || shardId < 0 || shardId >= totalShards) {
    throw new Error(`BUILT_IN_AI_50000_PHASE1_SHARD_INVALID:${shardId}:${totalShards}`);
  }
  return BUILT_IN_AI_50000_PHASE1_CASES.filter((testCase) => testCase.shardId === shardId);
}

export const BUILT_IN_AI_50000_PHASE1_SHARD_PLAN = planBuiltInAi50000Phase1Shards();

for (const shard of BUILT_IN_AI_50000_PHASE1_SHARD_PLAN) {
  if (shard.casesTotal !== BUILT_IN_AI_50000_PHASE1_CASES_PER_SHARD) {
    throw new Error(`BUILT_IN_AI_50000_PHASE1_SHARD_SIZE_INVALID:${shard.shardId}:${shard.casesTotal}`);
  }
}

export function planBuiltInAi50000FullShards(
  cases: readonly BuiltInAi50000Case[] = BUILT_IN_AI_50000_FULL_CASES,
  totalShards = BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL,
): readonly BuiltInAi50000Shard[] {
  return Object.freeze(Array.from({ length: totalShards }, (_, shardId) => {
    const shardCases = cases.filter((testCase) => testCase.shardId === shardId);
    return {
      shardId,
      totalShards,
      caseIds: shardCases.map((testCase) => testCase.id),
      macroDomainIds: [...new Set(shardCases.map((testCase) => testCase.macroDomainId))],
      casesTotal: shardCases.length,
    };
  }));
}

export function getBuiltInAi50000FullShardCases(
  shardId: number,
  totalShards = BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL,
): readonly BuiltInAi50000Case[] {
  if (!Number.isInteger(shardId) || shardId < 0 || shardId >= totalShards) {
    throw new Error(`BUILT_IN_AI_50000_PHASE2_SHARD_INVALID:${shardId}:${totalShards}`);
  }
  return BUILT_IN_AI_50000_FULL_CASES.filter((testCase) => testCase.shardId === shardId);
}

export const BUILT_IN_AI_50000_FULL_SHARD_PLAN = planBuiltInAi50000FullShards();

for (const shard of BUILT_IN_AI_50000_FULL_SHARD_PLAN) {
  if (shard.casesTotal !== BUILT_IN_AI_50000_TARGET_CASES_PER_SHARD) {
    throw new Error(`BUILT_IN_AI_50000_PHASE2_SHARD_SIZE_INVALID:${shard.shardId}:${shard.casesTotal}`);
  }
}
