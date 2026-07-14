import {
  runProfessionalBoq11610FormulaInvariantMatrixShard,
  runProfessionalBoq11610GeneratedPromptMatrixShard,
} from "./professionalBoq11610RegressionSealCore";

const kind = process.argv[2];
const start = Number(process.argv[3] ?? 0);
const count = Number(process.argv[4] ?? 0);

if (!Number.isInteger(start) || start < 0 || !Number.isInteger(count) || count <= 0) {
  throw new Error(`INVALID_11610_SHARD_ARGS:${start}:${count}`);
}

if (kind === "generated") {
  console.log(JSON.stringify(runProfessionalBoq11610GeneratedPromptMatrixShard(start, count)));
} else if (kind === "invariant") {
  console.log(JSON.stringify(runProfessionalBoq11610FormulaInvariantMatrixShard(start, count)));
} else {
  throw new Error(`UNKNOWN_11610_SHARD_KIND:${kind}`);
}
