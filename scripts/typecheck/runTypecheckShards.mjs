import { spawn } from "node:child_process";
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
  const actual = new Set(projects.flatMap(name => parse(load(name))));
  return { referenceRoots: reference.size, actualRoots: actual.size, missingFiles: [...reference].filter(file => !actual.has(file)) };
}

export function runTypecheckShard(project) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(
      process.execPath,
      [compiler, "--project", project, "--noEmit", "--pretty", "false",
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
      resolve({
        project,
        exitCode: exitCode ?? 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

// Keep all source, tooling and test roots while bounding each compiler graph.
// Only one TypeScript process runs at a time; root coverage is checked first.
export async function runRequiredTypecheckShards(executeShard, reportResult = () => {}) {
  const results = [];
  let stoppedForHeapLimit = false;
  for (const project of requiredTypecheckShards) {
    const result = await executeShard(project);
    results.push(result);
    reportResult(result);
    if (result.exitCode !== 0 && /(?:heap out of memory|reached heap limit|allocation failed[^\n]*heap)/iu.test(`${result.stdout}${result.stderr}`)) {
      stoppedForHeapLimit = true;
      break;
    }
  }
  return { results, stoppedForHeapLimit, pendingProjects: requiredTypecheckShards.slice(results.length),
    green: results.length === requiredTypecheckShards.length && results.every(result => result.exitCode === 0) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const startedAt = Date.now();
  const coverage = typecheckRootCoverage();
  if (coverage.missingFiles.length) throw new Error(`TYPECHECK_REQUIRED_ROOTS_LOST:${coverage.missingFiles.join(",")}`);
  process.stdout.write(`[typecheck] rootCoverage reference=${coverage.referenceRoots} actual=${coverage.actualRoots} missing=0\n`);
  const outcome = await runRequiredTypecheckShards(runTypecheckShard, result => {
    const output = `${result.stdout}${result.stderr}`.trim();
    if (output) process.stderr.write(`${output}\n`);
    process.stdout.write(`[typecheck] ${result.project} exit=${result.exitCode} durationMs=${result.durationMs}\n`);
  });
  if (outcome.stoppedForHeapLimit) process.stderr.write(`[typecheck] stopped after heap limit; pending=${outcome.pendingProjects.join(",")}; resource diagnosis required before retry\n`);
  process.stdout.write(`[typecheck] shards=${outcome.results.length} requiredShards=${requiredTypecheckShards.length} totalDurationMs=${Date.now() - startedAt} status=${outcome.green ? "GREEN" : "RED"}\n`);
  if (!outcome.green) process.exitCode = 1;
}
