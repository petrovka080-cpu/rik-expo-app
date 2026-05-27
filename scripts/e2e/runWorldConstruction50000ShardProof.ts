import {
  WORLD_50000_SHARDS_TOTAL,
  writeWorld50000ShardArtifacts,
} from "./worldConstruction50000RealityProof.shared";

type Args = {
  shard: number;
  allShards: boolean;
};

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv.filter((arg) => arg.startsWith("--") && !arg.includes("=")));
  const values = new Map<string, string>();
  for (const token of argv) {
    const match = token.match(/^--([^=]+)=(.+)$/);
    if (match) values.set(match[1], match[2]);
  }
  return {
    shard: Number(values.get("shard") ?? 0),
    allShards: flags.has("--all-shards"),
  };
}

function runShard(shardId: number): boolean {
  const artifacts = writeWorld50000ShardArtifacts(shardId);
  console.info(`${artifacts.matrix.final_status}: shard ${shardId} ${artifacts.matrix.cases_passed}/${artifacts.matrix.cases_total}`);
  return artifacts.failures.length === 0;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  let passed = true;
  if (args.allShards) {
    for (let shardId = 0; shardId < WORLD_50000_SHARDS_TOTAL; shardId += 1) {
      passed = runShard(shardId) && passed;
    }
  } else {
    passed = runShard(args.shard);
  }
  if (!passed) process.exitCode = 1;
}

main();
