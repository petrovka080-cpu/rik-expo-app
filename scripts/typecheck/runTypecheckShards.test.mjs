import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { requiredTypecheckShards, r4a13TypecheckProjects, typecheckExecutionProjects, runRequiredTypecheckShards, typecheckRootCoverage, typecheckR4a13PartitionCoverage, classifyR4a13SourceContext, captureCurrentR4a13Context, physicalR4a13ContextError } from "./runTypecheckShards.mjs";

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
  assert.deepEqual(calls, requiredTypecheckShards.flatMap(typecheckExecutionProjects));
  assert.equal(outcome.results.length, 15);
  assert.equal(outcome.results[6].subprojects.length, 4);
  assert.equal(outcome.executedCompilerProjects, 18);
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


test("r4a13 physical parts retain the independent former logical root set and shared context", () => {
  const coverage = typecheckR4a13PartitionCoverage();
  assert.ok(coverage.referenceRoots > 0);
  assert.ok(coverage.actualRoots >= coverage.referenceRoots);
  assert.deepEqual(coverage.missingFiles, []);
  assert.deepEqual(coverage.unexpectedFiles, []);
  assert.deepEqual(coverage.missingSharedRoots, []);
  assert.deepEqual(coverage.contextOrderMismatches, []);
  assert.deepEqual(coverage.compilerOptionMismatches, []);
});

test("an error in an r4a13 subproject keeps its logical obligation RED without skipping later parts", async () => {
  const calls = [];
  const outcome = await runRequiredTypecheckShards(async project => {
    calls.push(project);
    return result(project, project === r4a13TypecheckProjects[1] ? 2 : 0,
      project === r4a13TypecheckProjects[1] ? "error TS2322: cross-module mismatch" : "");
  });
  assert.equal(outcome.results.length, 15);
  assert.equal(outcome.results[6].exitCode, 2);
  assert.equal(outcome.results[6].subprojects.length, 4);
  assert.ok(calls.includes(r4a13TypecheckProjects[3]));
  assert.ok(calls.includes(requiredTypecheckShards[14]));
  assert.equal(outcome.green, false);
});

test("heap exhaustion in a physical part reports pending physical and logical coverage", async () => {
  const outcome = await runRequiredTypecheckShards(async project => result(project,
    project === r4a13TypecheckProjects[0] ? 134 : 0,
    project === r4a13TypecheckProjects[0] ? "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory" : ""));
  assert.equal(outcome.results.length, 7);
  assert.deepEqual(outcome.pendingSubprojects, r4a13TypecheckProjects.slice(1));
  assert.deepEqual(outcome.pendingProjects, requiredTypecheckShards.slice(7));
  assert.equal(outcome.green, false);
});

async function withR4a13Fixture(action) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gox-r4a13-context-"));
  const prefix = "scripts/estimate/r4a13/";
  const write = (name, text) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
  const global = prefix + "sharedGlobal.ts";
  const otherGlobal = prefix + "sharedGlobalZ.ts";
  try {
    write("tsconfig.json", JSON.stringify({ compilerOptions: { strict: true, noEmit: true, incremental: true, moduleDetection: "force", module: "ESNext", moduleResolution: "Bundler", types: [], lib: ["ES2020"] } }));
    write("tsconfig.typecheck.r4a13-scripts.json", JSON.stringify({ extends: "./tsconfig.json", include: [prefix + "**/*.ts"] }));
    write(global, 'export {}; declare /* keep augmentation context */ global { interface ScopeFacts { id: string } }\n');
    write(otherGlobal, 'export {}; declare global { interface SecondScopeFacts { id: string } }\n');
    write(prefix + "shared.ts", 'export const value = "text";\n');
    write(prefix + "a.ts", 'import { value } from "./shared"; const check: number = value; const facts: ScopeFacts = { id: "a" };\n');
    write(prefix + "b.ts", 'export {}; const facts: ScopeFacts = { id: "b" };\n');
    const lists = [[global, otherGlobal, prefix + "a.ts"], [global, otherGlobal, prefix + "b.ts"], [global, otherGlobal, prefix + "shared.ts"], [global, otherGlobal]];
    r4a13TypecheckProjects.forEach((project, i) => write(project, JSON.stringify({ extends: "./tsconfig.typecheck.r4a13-scripts.json", compilerOptions: { tsBuildInfoFile: `.cache/part-${i}.tsbuildinfo` }, files: lists[i], include: [] })));
    return await action({ root, prefix, global, otherGlobal, write });
  } finally {
    const fixturePath = path.resolve(fs.realpathSync(root));
    const tempPath = path.resolve(fs.realpathSync(os.tmpdir()));
    const boundary = tempPath.endsWith(path.sep) ? tempPath : tempPath + path.sep;
    const key = value => process.platform === "win32" ? value.toLowerCase() : value;
    assert.ok(path.isAbsolute(fixturePath) && key(fixturePath).startsWith(key(boundary)) && path.basename(fixturePath).startsWith("gox-r4a13-context-"), "FIXTURE_DELETE_OUTSIDE_OWNED_TEMP_BOUNDARY");
    fs.rmSync(fixturePath, { recursive: true, force: true });
  }
}

test("independent partition guard detects lost roots, missing shared augmentation and changed compiler options", () => withR4a13Fixture(({ root, prefix, global, write }) => {
  assert.deepEqual(typecheckR4a13PartitionCoverage(root).missingFiles, []);
  const file = path.join(root, r4a13TypecheckProjects[1]);
  const original = JSON.parse(fs.readFileSync(file, "utf8"));
  write(r4a13TypecheckProjects[1], JSON.stringify({ ...original, files: [global] }));
  assert.ok(typecheckR4a13PartitionCoverage(root).missingFiles.some(name => name.endsWith("b.ts")));
  write(r4a13TypecheckProjects[1], JSON.stringify({ ...original, files: [prefix + "b.ts"] }));
  assert.ok(typecheckR4a13PartitionCoverage(root).missingSharedRoots.some(item => item.project === r4a13TypecheckProjects[1]));
  write(r4a13TypecheckProjects[1], JSON.stringify({ ...original, compilerOptions: { ...original.compilerOptions, strictNullChecks: false } }));
  assert.ok(typecheckR4a13PartitionCoverage(root).compilerOptionMismatches.includes(r4a13TypecheckProjects[1]));
}));

test("ordinary TypeScript keeps cross-module diagnostics and shared augmentation in every part", () => withR4a13Fixture(({ root }) => {
  for (const project of r4a13TypecheckProjects) {
    const config = ts.readConfigFile(path.join(root, project), ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.some(item => item.code === 2304), false, "shared ScopeFacts must remain available");
    if (project === r4a13TypecheckProjects[0]) assert.ok(diagnostics.some(item => item.code === 2322), "imported string-to-number mismatch must be checked");
    else assert.deepEqual(diagnostics, []);
  }
}));


test("context input, future original roots and shared reference order fail in preflight", () => withR4a13Fixture(({ root, prefix, global, otherGlobal, write }) => {
  const file = path.join(root, r4a13TypecheckProjects[0]);
  const original = JSON.parse(fs.readFileSync(file, "utf8"));
  write(r4a13TypecheckProjects[0], JSON.stringify({ ...original, files: [otherGlobal, global, prefix + "a.ts"] }));
  assert.ok(typecheckR4a13PartitionCoverage(root).contextOrderMismatches.length > 0, "inconsistent cross-part order must fail; live original authority is checked separately");
  write(r4a13TypecheckProjects[0], JSON.stringify(original));
  write(prefix + "newOriginalRoot.ts", "export {};\n");
  assert.ok(typecheckR4a13PartitionCoverage(root).missingFiles.some(file => file.endsWith("newOriginalRoot.ts")));
  fs.unlinkSync(path.join(root, prefix + "newOriginalRoot.ts"));
  write(global, 'export {}; declare global { interface ScopeFacts { id: number } }\n');
  assert.deepEqual(typecheckR4a13PartitionCoverage(root).missingFiles, []);
  const config = ts.readConfigFile(path.join(root, r4a13TypecheckProjects[1]), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  assert.ok(ts.getPreEmitDiagnostics(program).some(error => error.code === 2322), "ordinary body changes are type checked, not blocked by a new raw hash policy");
}));


test("live ordinary context authority is required and actual physical projection order cannot be forged by config order", async () => withR4a13Fixture(async ({ root }) => {
  const config = ts.readConfigFile(path.join(root, "tsconfig.typecheck.r4a13-scripts.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const original = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  // Lib files live in the repository's TypeScript installation in this tiny
  // fixture; the test source list is synthetic, not a production capture PASS.
  const normalizedFixturePath = file => {
    const absolute = path.resolve(file);
    return process.platform === "win32" ? absolute.toLowerCase() : absolute;
  };
  const fixtureBoundary = normalizedFixturePath(root) + path.sep;
  const files = original.getSourceFiles().map(source => path.resolve(source.fileName)).filter(file => normalizedFixturePath(file).startsWith(fixtureBoundary));
  const shared = classifyR4a13SourceContext(files, root);
  const calls = [];
  const context = await captureCurrentR4a13Context(async (project, options) => {
    calls.push({ project, options });
    return { ...result(project), stdout: files.join("\n") };
  }, async sourceFiles => classifyR4a13SourceContext(sourceFiles, root), root);
  assert.deepEqual(calls, [{ project: "tsconfig.typecheck.r4a13-scripts.json", options: { listFilesOnly: true } }]);
  assert.deepEqual(context.sharedRoots, shared.sharedRoots);
  assert.equal(physicalR4a13ContextError(files.join("\n"), context), null);
  assert.equal(physicalR4a13ContextError(files.join("\n"), null), "TYPECHECK_R4A13_LIVE_CONTEXT_REQUIRED");
  const reversed = [...shared.sharedRoots].reverse();
  assert.equal(physicalR4a13ContextError([...reversed, ...files.filter(file => !shared.sharedRoots.includes(file))].join("\n"), context), "TYPECHECK_R4A13_ACTUAL_SHARED_CONTEXT_ORDER_CHANGED");
}));


test("declaration cycle input order may differ while native shared output order stays mandatory", async () => withR4a13Fixture(async ({ root, global, otherGlobal, write }) => {
  write(global, 'import "./sharedGlobalZ"; export {}; declare global { interface ScopeFacts { id: string } }\n');
  write(otherGlobal, 'import "./sharedGlobal"; export {}; declare global { interface SecondScopeFacts { id: string } }\n');
  const originalConfig = ts.readConfigFile(path.join(root, "tsconfig.typecheck.r4a13-scripts.json"), ts.sys.readFile);
  const originalParsed = ts.parseJsonConfigFileContent(originalConfig.config, ts.sys, root);
  const originalProgram = ts.createProgram({ rootNames: originalParsed.fileNames, options: originalParsed.options });
  const key = file => process.platform === "win32" ? path.resolve(file).toLowerCase() : path.resolve(file);
  const boundary = key(root) + path.sep;
  const files = program => program.getSourceFiles().map(source => path.resolve(source.fileName)).filter(file => key(file).startsWith(boundary));
  const sourceFiles = files(originalProgram);
  const context = await captureCurrentR4a13Context(async project => ({ ...result(project), stdout: sourceFiles.join("\n") }), async listed => classifyR4a13SourceContext(listed, root), root);
  assert.notDeepEqual(context.inputSharedRoots.map(key), context.sharedRoots.map(key), "native cyclic postorder is not its root input order");
  for (const project of r4a13TypecheckProjects) {
    const config = ts.readConfigFile(path.join(root, project), ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
    assert.equal(physicalR4a13ContextError(files(program).join("\n"), context), null);
  }
  const sharedKeys = new Set(context.sharedRoots.map(key));
  const forgedInputOrder = [...context.inputSharedRoots, ...sourceFiles.filter(file => !sharedKeys.has(key(file)))];
  assert.equal(physicalR4a13ContextError(forgedInputOrder.join("\n"), context), "TYPECHECK_R4A13_ACTUAL_SHARED_CONTEXT_ORDER_CHANGED", "same-set input order cannot replace actual native output order");
}));
