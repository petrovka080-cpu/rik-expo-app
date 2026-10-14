import assert from "node:assert/strict";
import test from "node:test";
import { requiredTypecheckShards, runRequiredTypecheckShards, typecheckRootCoverage } from "./runTypecheckShards.mjs";

const result = (project, exitCode = 0, stderr = "") => ({ project, exitCode, stderr, stdout: "", durationMs: 1 });

test("retains all required projects and executes them sequentially before GREEN", async () => {
  assert.deepEqual(requiredTypecheckShards, ["tsconfig.typecheck.product.json", "tsconfig.typecheck.estimate-implementation.json", "tsconfig.typecheck.features-implementation.json", "tsconfig.typecheck.source-implementation.json", "tsconfig.typecheck.scripts.json",
    "tsconfig.typecheck.estimate-scripts.json", "tsconfig.typecheck.r4a13-scripts.json", "tsconfig.typecheck.tests-heavy.json", "tsconfig.typecheck.tests-rest.json", "tsconfig.typecheck.tests-a-f.json", "tsconfig.typecheck.tests-g-p.json", "tsconfig.typecheck.estimate-tests.json", "tsconfig.typecheck.estimate-norm-tests.json", "tsconfig.typecheck.source-tests.json", "tsconfig.typecheck.estimate-source-tests.json"]);
  let active = 0;
  const calls = [];
  const outcome = await runRequiredTypecheckShards(async project => {
    assert.equal(active++, 0);
    await Promise.resolve();
    calls.push(project);
    active--;
    return result(project);
  });
  assert.deepEqual(calls, requiredTypecheckShards);
  assert.equal(outcome.green, true);
  assert.deepEqual(outcome.pendingProjects, []);
});
test("heap OOM stops later compilers and exposes pending coverage, never GREEN", async () => {
  const calls = [];
  const outcome = await runRequiredTypecheckShards(async project => {
    calls.push(project);
    return result(project, 134, "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory");
  });
  assert.deepEqual(calls, [requiredTypecheckShards[0]]);
  assert.equal(outcome.stoppedForHeapLimit, true);
  assert.equal(outcome.green, false);
  assert.deepEqual(outcome.pendingProjects, requiredTypecheckShards.slice(1));
});
test("an ordinary TypeScript error still checks the other required projects and keeps RED", async () => {
  const outcome = await runRequiredTypecheckShards(async project => result(project,
    project === requiredTypecheckShards[0] ? 2 : 0, project === requiredTypecheckShards[0] ? "src/app.ts(4,1): error TS2322: incompatible value" : ""));
  assert.equal(outcome.results.length, requiredTypecheckShards.length);
  assert.equal(outcome.stoppedForHeapLimit, false);
  assert.equal(outcome.green, false);
});
test("an unrelated aborted compiler is not mislabeled as heap exhaustion", async () => {
  const outcome = await runRequiredTypecheckShards(async project => result(project, 134, "unrelated native abort"));
  assert.equal(outcome.results.length, requiredTypecheckShards.length);
  assert.equal(outcome.stoppedForHeapLimit, false);
  assert.equal(outcome.green, false);
});
test("source-test split preserves all former required roots and detects omission of its new project", () => {
  const full = typecheckRootCoverage();
  assert.equal(full.missingFiles.length, 0);
  assert.ok(full.actualRoots >= full.referenceRoots);
  const omitted = typecheckRootCoverage(process.cwd(), requiredTypecheckShards.filter(name => name !== 'tsconfig.typecheck.source-tests.json'));
  assert.ok(omitted.missingFiles.length > 0);
  assert.ok(omitted.missingFiles.every(file => file.includes('/src/') && /\.(test|spec)\.tsx?$/.test(file)));
});
