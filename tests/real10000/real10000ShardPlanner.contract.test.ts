import {
  REAL_10000_ACCEPTANCE_CONTRACT,
  REAL_10000_CORPUS_VERSION,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import {
  buildReal10000ArtifactIdentity,
  REAL10000_ARTIFACT_SCHEMA_VERSION,
  REAL10000_COMPILER_VERSION,
  REAL10000_FORMULA_GRAPH_VERSION,
} from "../../scripts/e2e/real10000AcceptanceCore";

test("real 10000 shard planner defines 100 shards of 100 cases", () => {
  expect(REAL_10000_ACCEPTANCE_CONTRACT.requiredShards).toBe(100);
  expect(REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard).toBe(100);
  expect(REAL_DIVERSE_10000_CONSTRUCTION_WORKS.length / REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard).toBe(100);
});

test("real 10000 shard evidence binds corpus, compiler, formula graph, runtime and exact SHA", () => {
  const identity = buildReal10000ArtifactIdentity();
  expect(identity).toMatchObject({
    artifact_schema_version: REAL10000_ARTIFACT_SCHEMA_VERSION,
    corpus_version: REAL_10000_CORPUS_VERSION,
    compiler_version: REAL10000_COMPILER_VERSION,
    formula_graph_version: REAL10000_FORMULA_GRAPH_VERSION,
    runtime_version: process.version,
  });
  expect(identity.subject_sha).toMatch(/^[0-9a-f]{40}$/);
  expect(identity.corpus_fingerprint).toMatch(/^[0-9a-f]{64}$/);
  expect(identity.compiler_source_fingerprint).toMatch(/^[0-9a-f]{64}$/);
  expect(identity.formula_graph_fingerprint).toMatch(/^[0-9a-f]{64}$/);
});
