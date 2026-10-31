import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const projectRoot = process.cwd();
const compiler = path.join(
  projectRoot,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);
export const requiredTypecheckShards = Object.freeze([
  "tsconfig.typecheck.product.json",
  "tsconfig.typecheck.estimate-implementation.json",
  "tsconfig.typecheck.features-implementation.json",
  "tsconfig.typecheck.source-implementation.json",
  "tsconfig.typecheck.scripts.json",
  "tsconfig.typecheck.estimate-scripts.json",
  "tsconfig.typecheck.r4a13-scripts.json",
  "tsconfig.typecheck.tests-heavy.json",
  "tsconfig.typecheck.tests-rest.json",
  "tsconfig.typecheck.tests-a-f.json",
  "tsconfig.typecheck.tests-g-p.json",
  "tsconfig.typecheck.estimate-tests.json",
  "tsconfig.typecheck.estimate-norm-tests.json",
  "tsconfig.typecheck.source-tests.json",
  "tsconfig.typecheck.estimate-source-tests.json",
]);


// These are physical compiler invocations for the same seventh logical obligation.
export const r4a13TypecheckProjects = Object.freeze([
  "tsconfig.typecheck.r4a13-scripts.part-1.json",
  "tsconfig.typecheck.r4a13-scripts.part-2.json",
  "tsconfig.typecheck.r4a13-scripts.part-3.json",
  "tsconfig.typecheck.r4a13-scripts.part-4.json",
]);
const r4a13LogicalProject = "tsconfig.typecheck.r4a13-scripts.json";
export function typecheckExecutionProjects(project) {
  return project === r4a13LogicalProject ? r4a13TypecheckProjects : [project];
}
function readTypecheckProject(root, name) {
  const result = ts.readConfigFile(path.join(root, name), ts.sys.readFile);
  if (result.error) throw new Error(`TYPECHECK_CONFIG_INVALID:${name}`);
  const parsed = ts.parseJsonConfigFileContent(result.config, ts.sys, root);
  if (parsed.errors.length) throw new Error(`TYPECHECK_CONFIG_PARSE_INVALID:${name}`);
  return parsed;
}
const fileKey = file => ts.sys.useCaseSensitiveFileNames ? path.resolve(file) : path.resolve(file).toLowerCase();
function isSharedContextRoot(file, options) {
  if (/\.d\.tsx?$/i.test(file)) return true;
  const text = ts.sys.readFile(file);
  if (text == null) throw new Error(`TYPECHECK_SHARED_ROOT_UNREADABLE:${file}`);
  if (text.includes("declare")) {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
    let afterDeclare = false;
    for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
      if (afterDeclare && (token === ts.SyntaxKind.ModuleKeyword || scanner.getTokenText() === "global")) return true;
      afterDeclare = token === ts.SyntaxKind.DeclareKeyword;
    }
  }
  // Force module detection makes ordinary implementation roots modules. If that
  // policy changes, non-module scripts must be shared rather than silently split.
  return options.moduleDetection !== ts.ModuleDetectionKind.Force && !ts.isExternalModule(
    ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true,
      /\.tsx$/i.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
}
function semanticCompilerOptions(options) {
  return JSON.stringify(Object.fromEntries(Object.entries(options)
    .filter(([key]) => key !== "configFilePath" && key !== "tsBuildInfoFile")
    .sort(([a], [b]) => a.localeCompare(b))));
}
// Physical/configuration context checks are cheap and run before any child.
// The current original Program then supplies live resolved ambient authority;
// no permanent source-body hash lock, cached Program or second resolver exists.
export function typecheckR4a13PartitionCoverage(root = projectRoot) {
  const reference = readTypecheckProject(root, r4a13LogicalProject);
  const expected = new Map(reference.fileNames.map(file => [fileKey(file), file]));
  const parts = r4a13TypecheckProjects.map(project => ({ project, ...readTypecheckProject(root, project) }));
  const common = new Set(parts[0].fileNames.map(fileKey));
  for (const part of parts.slice(1)) {
    const keys = new Set(part.fileNames.map(fileKey));
    for (const key of common) if (!keys.has(key)) common.delete(key);
  }
  const shared = parts[0].fileNames.filter(file => common.has(fileKey(file)));
  const sharedOrder = shared.map(fileKey);
  const explicitShared = reference.fileNames.filter(file => isSharedContextRoot(file, reference.options));
  const actual = new Set();
  const missingSharedRoots = [];
  const contextOrderMismatches = [];
  const compilerOptionMismatches = [];
  const unexpectedFiles = [];
  for (const part of parts) {
    const keys = new Set(part.fileNames.map(fileKey));
    for (const file of explicitShared) if (!keys.has(fileKey(file))) missingSharedRoots.push({ project: part.project, file });
    const prefix = part.fileNames.slice(0, shared.length).map(fileKey);
    const order = part.fileNames.filter(file => common.has(fileKey(file))).map(fileKey);
    if (JSON.stringify(prefix) !== JSON.stringify(sharedOrder) || JSON.stringify(order) !== JSON.stringify(sharedOrder)) contextOrderMismatches.push(part.project);
    for (const file of part.fileNames) {
      const key = fileKey(file);
      actual.add(key);
      if (!expected.has(key) && !common.has(key)) unexpectedFiles.push({ project: part.project, file });
    }
    if (semanticCompilerOptions(reference.options) !== semanticCompilerOptions(part.options)) compilerOptionMismatches.push(part.project);
  }
  return { referenceRoots: expected.size, actualRoots: actual.size, sharedRoots: shared,
    missingFiles: [...expected].filter(([key]) => !actual.has(key)).map(([, file]) => file),
    unexpectedFiles, missingSharedRoots, contextOrderMismatches, compilerOptionMismatches };
}

export function typecheckListedSourceFiles(stdout) {
  return stdout.split(/\r?\n/).map(line => line.trim().replace(/^\uFEFF/, ""))
    .filter(file => path.isAbsolute(file) && /\.(?:[cm]?tsx?|[cm]?jsx?|json)$/i.test(file) && fs.existsSync(file))
    .map(file => path.resolve(file));
}

// This function is executed in an owned child mode of this same driver.
// It reads the actual ordinary tsc --listFilesOnly output, performs only AST
// classification, and never creates a Program or requests a TypeChecker.
export function classifyR4a13SourceContext(sourceFiles, root = projectRoot) {
  const reference = readTypecheckProject(root, r4a13LogicalProject);
  const sharedRoots = [];
  const parseErrors = [];
  for (const file of sourceFiles) {
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`TYPECHECK_R4A13_CONTEXT_OUTSIDE_ROOT:${file}`);
    if (/\.json$/i.test(file)) continue;
    const text = ts.sys.readFile(file);
    if (text == null) throw new Error(`TYPECHECK_R4A13_CONTEXT_UNREADABLE:${file}`);
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    let shared = source.isDeclarationFile;
    function visit(node) {
      if (ts.isModuleDeclaration(node) && ((node.flags & ts.NodeFlags.GlobalAugmentation) || ts.isStringLiteral(node.name))) shared = true;
      ts.forEachChild(node, visit);
    }
    visit(source);
    const external = ts.isExternalModule(source) || (!source.isDeclarationFile && reference.options.moduleDetection === ts.ModuleDetectionKind.Force);
    if (shared || !external) sharedRoots.push(file);
    for (const error of source.parseDiagnostics ?? []) parseErrors.push({ file, code: error.code, start: error.start });
  }
  return { sourceFiles, sharedRoots, parseErrors, typeCheckerUsed: false, typePassClaimed: false };
}

function classifyR4a13InChild(sourceFiles) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--inspect-r4a13-context"], {
      cwd: projectRoot, env: process.env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", chunk => { stdout += String(chunk); });
    child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.on("error", reject);
    child.stdin.on("error", reject);
    child.on("close", code => {
      if (code !== 0) return reject(new Error(`TYPECHECK_R4A13_CONTEXT_AST_FAILED:${stderr}`));
      try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); }
    });
    child.stdin.end(JSON.stringify(sourceFiles));
  });
}

export async function captureCurrentR4a13Context(executeOriginal = runTypecheckShard, classify = classifyR4a13InChild, root = projectRoot, checkedPartition = null) {
  const partition = checkedPartition ?? typecheckR4a13PartitionCoverage(root);
  if (partition.missingFiles.length || partition.unexpectedFiles.length || partition.missingSharedRoots.length || partition.contextOrderMismatches.length || partition.compilerOptionMismatches.length) throw new Error("TYPECHECK_R4A13_PARTITION_CONTEXT_LOST_BEFORE_CAPTURE");
  const capture = await executeOriginal(r4a13LogicalProject, { listFilesOnly: true });
  if (capture.exitCode !== 0) throw new Error(`TYPECHECK_R4A13_CONTEXT_CAPTURE_FAILED:${capture.stdout}${capture.stderr}`);
  const sourceFiles = typecheckListedSourceFiles(capture.stdout);
  const context = await classify(sourceFiles, root);
  if (!sourceFiles.length || new Set(sourceFiles.map(fileKey)).size !== sourceFiles.length || context.parseErrors.length || context.typeCheckerUsed !== false || context.typePassClaimed !== false) throw new Error("TYPECHECK_R4A13_CONTEXT_CAPTURE_NOT_ACCEPTED");
  const reference = readTypecheckProject(root, r4a13LogicalProject);
  const captured = new Set(sourceFiles.map(fileKey));
  if (reference.fileNames.some(file => !captured.has(fileKey(file)))) throw new Error("TYPECHECK_R4A13_CONTEXT_ORIGINAL_ROOT_NOT_CAPTURED");
  // Configured roots are declaration entry inputs, not the native resolved
  // SourceFiles postorder. Default libraries keep ordinary automatic loading;
  // declaration cycles may require a different input traversal order. Every
  // physical compiler still must emit the exact original shared output order.
  const inputOrder = partition.sharedRoots.map(fileKey);
  const resolvedShared = new Set(context.sharedRoots.map(fileKey));
  if (inputOrder.some(file => !resolvedShared.has(file))) throw new Error("TYPECHECK_R4A13_CONFIGURED_CONTEXT_NOT_ORIGINAL_SHARED");
  for (const project of r4a13TypecheckProjects) {
    const part = readTypecheckProject(root, project);
    const prefix = part.fileNames.slice(0, inputOrder.length).map(fileKey);
    if (JSON.stringify(prefix) !== JSON.stringify(inputOrder)) throw new Error(`TYPECHECK_R4A13_CONTEXT_INPUT_ORDER_MISMATCH:${project}`);
    if (part.fileNames.some(file => !captured.has(fileKey(file)))) throw new Error(`TYPECHECK_R4A13_FOREIGN_CONTEXT_ROOT:${project}`);
  }
  return { ...context, inputSharedRoots: partition.sharedRoots };
}

export function physicalR4a13ContextError(stdout, context) {
  if (!context) return "TYPECHECK_R4A13_LIVE_CONTEXT_REQUIRED";
  const files = typecheckListedSourceFiles(stdout);
  const shared = new Set(context.sharedRoots.map(fileKey));
  const original = new Set(context.sourceFiles.map(fileKey));
  const projection = files.filter(file => shared.has(fileKey(file))).map(fileKey);
  if (JSON.stringify(projection) !== JSON.stringify(context.sharedRoots.map(fileKey))) return "TYPECHECK_R4A13_ACTUAL_SHARED_CONTEXT_ORDER_CHANGED";
  if (files.some(file => !original.has(fileKey(file)))) return "TYPECHECK_R4A13_ACTUAL_SOURCE_OUTSIDE_ORIGINAL_CONTEXT";
  return null;
}

/** Splitting a compiler must never remove a file from the required root set.
 * Compare against the former complete product roots plus the other unchanged
 * projects before executing any compiler. Imported dependencies remain under
 * TypeScript's ordinary resolver in every project. */
export function typecheckRootCoverage(root = projectRoot, projects = requiredTypecheckShards) {
  const load = name => {
    const result = ts.readConfigFile(path.join(root, name), ts.sys.readFile);
    if (result.error) throw new Error(`TYPECHECK_CONFIG_INVALID:${name}`);
    return result.config;
  };
  const parse = config => ts.parseJsonConfigFileContent(config, ts.sys, root).fileNames;
  // Exact former four-project root union. Keep this independent of each new
  // project's partition so changing a partition cannot redefine coverage.
  const reference = new Set(parse({ extends: './tsconfig.json', include: [
    'app/**/*.ts','app/**/*.tsx','src/**/*.ts','src/**/*.tsx','supabase/**/*.ts','supabase/**/*.tsx',
    'types/**/*.ts','types/**/*.tsx','.expo/types/**/*.ts','expo-env.d.ts','App.tsx','playwright.config.ts',
    'scripts/**/*.ts','scripts/**/*.tsx','tests/**/*.ts','tests/**/*.tsx',
  ] }));
  const actual = new Set(projects.flatMap(typecheckExecutionProjects).flatMap(name => parse(load(name))));
  return { referenceRoots: reference.size, actualRoots: actual.size, missingFiles: [...reference].filter(file => !actual.has(file)) };
}

export function runTypecheckShard(project, { listFilesOnly = false, sharedContext = null } = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(
      process.execPath,
      [compiler, "--project", project, "--noEmit", "--pretty", "false",
        ...(listFilesOnly ? ["--listFilesOnly"] : r4a13TypecheckProjects.includes(project) ? ["--listFiles"] : []),
        ...(process.argv.includes("--diagnostics") ? ["--extendedDiagnostics"] : [])],
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({
        project,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr: `${stderr}${error instanceof Error ? error.message : String(error)}`,
      });
    });
    child.on("close", (exitCode) => {
      const contextError = !listFilesOnly && r4a13TypecheckProjects.includes(project) ? physicalR4a13ContextError(stdout, sharedContext) : null;
      resolve({
        project,
        exitCode: contextError && exitCode === 0 ? 1 : exitCode ?? 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr: contextError ? `${stderr}\n${contextError}` : stderr,
        resolvedContextAccepted: !contextError,
      });
    });
  });
}

// Keep all source, tooling and test roots while bounding each compiler graph.
// Only one TypeScript process runs at a time; root coverage is checked first.
export async function runRequiredTypecheckShards(executeShard, reportResult = () => {}) {
  const results = [];
  let stoppedForHeapLimit = false;
  let executedCompilerProjects = 0;
  let pendingSubprojects = [];
  for (const project of requiredTypecheckShards) {
    const executionProjects = typecheckExecutionProjects(project);
    const partResults = [];
    for (const physicalProject of executionProjects) {
      const result = await executeShard(physicalProject);
      partResults.push(result);
      executedCompilerProjects++;
      reportResult(result);
      if (result.exitCode !== 0 && /(?:heap out of memory|reached heap limit|allocation failed[^\n]*heap)/iu.test(`${result.stdout}${result.stderr}`)) {
        stoppedForHeapLimit = true;
        pendingSubprojects = executionProjects.slice(partResults.length);
        break;
      }
    }
    const failed = partResults.find(result => result.exitCode !== 0);
    results.push(executionProjects.length === 1 ? partResults[0] : {
      project, exitCode: failed ? failed.exitCode : partResults.length === executionProjects.length ? 0 : 1,
      durationMs: partResults.reduce((total, result) => total + result.durationMs, 0),
      stdout: partResults.map(result => result.stdout).join("\n"),
      stderr: partResults.map(result => result.stderr).join("\n"),
      subprojects: partResults, expectedSubprojectCount: executionProjects.length,
    });
    if (stoppedForHeapLimit) break;
  }
  return { results, stoppedForHeapLimit, executedCompilerProjects, pendingSubprojects,
    pendingProjects: requiredTypecheckShards.slice(results.length),
    green: results.length === requiredTypecheckShards.length && !pendingSubprojects.length && results.every(result => result.exitCode === 0) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "--inspect-r4a13-context") {
    let input = "";
    for await (const chunk of process.stdin) { input += String(chunk); if (input.length > 16 * 1024 * 1024) throw new Error("TYPECHECK_CONTEXT_INPUT_BOUND"); }
    process.stdout.write(JSON.stringify(classifyR4a13SourceContext(JSON.parse(input))));
  } else {
  const startedAt = Date.now();
  const partitionCoverage = typecheckR4a13PartitionCoverage();
  if (partitionCoverage.missingFiles.length || partitionCoverage.unexpectedFiles.length || partitionCoverage.missingSharedRoots.length || partitionCoverage.contextOrderMismatches.length || partitionCoverage.compilerOptionMismatches.length) {
    throw new Error(`TYPECHECK_R4A13_PARTITION_CONTEXT_LOST:${JSON.stringify(partitionCoverage)}`);
  }
  process.stdout.write(`[typecheck] r4a13RootCoverage reference=${partitionCoverage.referenceRoots} actual=${partitionCoverage.actualRoots} shared=${partitionCoverage.sharedRoots.length} missing=0\n`);
  const coverage = typecheckRootCoverage();
  if (coverage.missingFiles.length) throw new Error(`TYPECHECK_REQUIRED_ROOTS_LOST:${coverage.missingFiles.join(",")}`);
  process.stdout.write(`[typecheck] rootCoverage reference=${coverage.referenceRoots} actual=${coverage.actualRoots} missing=0\n`);
  const sharedContext = await captureCurrentR4a13Context(runTypecheckShard, classifyR4a13InChild, projectRoot, partitionCoverage);
  process.stdout.write(`[typecheck] liveOriginalContext files=${sharedContext.sourceFiles.length} shared=${sharedContext.sharedRoots.length} typePassClaimed=false\n`);
  const outcome = await runRequiredTypecheckShards(project => runTypecheckShard(project, { sharedContext }), result => {
    const output = `${result.stdout}${result.stderr}`.trim();
    if (output) process.stderr.write(`${output}\n`);
    process.stdout.write(`[typecheck] ${result.project} exit=${result.exitCode} durationMs=${result.durationMs}\n`);
  });
  if (outcome.stoppedForHeapLimit) process.stderr.write(`[typecheck] stopped after heap limit; pending=${outcome.pendingProjects.join(",")}; pendingSubprojects=${outcome.pendingSubprojects.join(",")}; resource diagnosis required before retry\n`);
  process.stdout.write(`[typecheck] shards=${outcome.results.length} requiredShards=${requiredTypecheckShards.length} compilerProjects=${outcome.executedCompilerProjects} totalDurationMs=${Date.now() - startedAt} status=${outcome.green ? "GREEN" : "RED"}\n`);
  if (!outcome.green) process.exitCode = 1;
  }
}
