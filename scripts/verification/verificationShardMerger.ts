export type ShardResult = {
  shard_id: number;
  subject_sha: string;
  manifest_hash: string;
  exit_code: number;
  suites: string[];
  item_indices?: number[];
  failed_assertions?: string[];
};

export function mergeVerificationShards(params: {
  expectedShardIds: readonly number[];
  expectedSuites: readonly string[];
  expectedItemCount?: number;
  subjectSha: string;
  manifestHash: string;
  results: readonly ShardResult[];
}) {
  const expectedIds = new Set(params.expectedShardIds);
  const idCounts = new Map<number, number>();
  for (const result of params.results) idCounts.set(result.shard_id, (idCounts.get(result.shard_id) ?? 0) + 1);
  const missingShards = params.expectedShardIds.filter((id) => !idCounts.has(id));
  const duplicateShards = [...idCounts].filter(([, count]) => count > 1).map(([id]) => id).sort((a, b) => a - b);
  const unexpectedShards = [...idCounts.keys()].filter((id) => !expectedIds.has(id)).sort((a, b) => a - b);
  const suiteCounts = new Map<string, number>();
  for (const suite of params.results.flatMap((result) => result.suites)) suiteCounts.set(suite, (suiteCounts.get(suite) ?? 0) + 1);
  const missingSuites = [...new Set(params.expectedSuites)].filter((suite) => !suiteCounts.has(suite)).sort();
  const duplicateSuites = [...suiteCounts].filter(([, count]) => count > 1).map(([suite]) => suite).sort();
  const unexpectedSuites = [...suiteCounts.keys()].filter((suite) => !params.expectedSuites.includes(suite)).sort();
  const itemCounts = new Map<number, number>();
  for (const index of params.results.flatMap((result) => result.item_indices ?? [])) itemCounts.set(index, (itemCounts.get(index) ?? 0) + 1);
  const expectedItems = params.expectedItemCount === undefined ? [] : Array.from({ length: params.expectedItemCount }, (_, index) => index);
  const missingItems = expectedItems.filter((index) => !itemCounts.has(index));
  const duplicateItems = [...itemCounts].filter(([, count]) => count > 1).map(([index]) => index).sort((a, b) => a - b);
  const unexpectedItems = [...itemCounts.keys()].filter((index) => index < 0 || params.expectedItemCount !== undefined && index >= params.expectedItemCount).sort((a, b) => a - b);
  const lineageMismatch = params.results.filter((result) => result.subject_sha !== params.subjectSha || result.manifest_hash !== params.manifestHash).map((result) => result.shard_id);
  const failedShards = params.results.filter((result) => result.exit_code !== 0 || (result.failed_assertions?.length ?? 0) > 0).map((result) => result.shard_id);
  const green = [missingShards, duplicateShards, unexpectedShards, missingSuites, duplicateSuites, unexpectedSuites, missingItems, duplicateItems, unexpectedItems, lineageMismatch, failedShards].every((items) => items.length === 0);
  return {
    schema: "verification-shard-merge/v1",
    final_status: green ? "GREEN_COMPLETE_SHARD_FANIN" : "RED_INCOMPLETE_OR_FAILED_SHARD_FANIN",
    subject_sha: params.subjectSha,
    manifest_hash: params.manifestHash,
    expected_shards: params.expectedShardIds.length,
    received_shards: params.results.length,
    missing_shards: missingShards,
    duplicate_shards: duplicateShards,
    unexpected_shards: unexpectedShards,
    missing_suites: missingSuites,
    duplicate_suites: duplicateSuites,
    unexpected_suites: unexpectedSuites,
    item_coverage: params.expectedItemCount === undefined ? null : `${itemCounts.size}/${params.expectedItemCount}`,
    missing_items: missingItems,
    duplicate_items: duplicateItems,
    unexpected_items: unexpectedItems,
    lineage_mismatch_shards: lineageMismatch,
    failed_shards: failedShards,
    failed_assertions: params.results.flatMap((result) => result.failed_assertions ?? []),
    exit_code: green ? 0 : 1,
  };
}
