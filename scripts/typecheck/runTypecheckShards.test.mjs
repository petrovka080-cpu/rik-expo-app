import assert from "node:assert/strict";
import test from "node:test";
import { requiredTypecheckShards, runRequiredTypecheckShards } from "./runTypecheckShards.mjs";

const result = (project, exitCode = 0, stderr = "") => ({ project, exitCode, stderr, stdout: "", durationMs: 1 });

test("retains all four required projects and executes them sequentially before GREEN", async () => {
  assert.deepEqual(requiredTypecheckShards, ["tsconfig.typecheck.product.json", "tsconfig.typecheck.scripts.json",
    "tsconfig.typecheck.tests-heavy.json", "tsconfig.typecheck.tests-rest.json"]);
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
  assert.equal(outcome.results.length, 4);
  assert.equal(outcome.stoppedForHeapLimit, false);
  assert.equal(outcome.green, false);
});
test("an unrelated aborted compiler is not mislabeled as heap exhaustion", async () => {
  const outcome = await runRequiredTypecheckShards(async project => result(project, 134, "unrelated native abort"));
  assert.equal(outcome.results.length, 4);
  assert.equal(outcome.stoppedForHeapLimit, false);
  assert.equal(outcome.green, false);
});
