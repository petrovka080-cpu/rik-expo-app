import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type Gate = "GREEN" | "NOT_GREEN";
type Status = "passed" | "failed";

type RootStructureMap = {
  productionRootFiles: string[];
  productionDirectories: string[];
  buildOutputs: string[];
  diagnosticsAndProofs: string[];
  tempAndLocal: string[];
  archiveHistorical: string[];
  rootLegacyScriptCount: number;
  notes: string[];
};

type GitignoreProof = {
  requiredRules: Record<string, boolean>;
  trackedBuildOutputs: Record<string, number>;
  trackedBuildPaths: string[];
};

type Summary = {
  status: Status;
  gate: Gate;
  rootCauseMap: {
    trackedBuildOutputsBeforeCleanup: {
      distAndroidTrackedCount: number;
      testResultsTrackedCount: number;
    };
    currentResidualRisk: string[];
    migratedClassification: "historical_archive";
  };
  rootEntries: string[];
  structureChecks: {
    rootMigratedRemoved: boolean;
    archiveMigratedExists: boolean;
    noTrackedBuildOutputs: boolean;
    noLooseRootLegacyScripts: boolean;
    criticalBoundariesPresent: boolean;
  };
  buildOutputProof: GitignoreProof;
  rootStructureMapPath: string;
  gitignoreBuildOutputProofPath: string;
};

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactsDir, "repo-hygiene-phase2-summary.json");
const structureMapPath = path.join(artifactsDir, "root-structure-map.json");
const gitignoreProofPath = path.join(artifactsDir, "gitignore-build-output-proof.json");

const BUILD_OUTPUT_PREFIXES = [
  "dist/",
  "dist-android/",
  "dist-preview/",
  "dist-production/",
  "build/",
  "test-results/",
];

const REQUIRED_GITIGNORE_RULES = [
  "dist/",
  "dist-android/",
  "dist-preview/",
  "dist-production/",
  "dist-stale-*/",
  "build/",
  "test-results/",
  "tmp/",
];

const PRODUCTION_ROOT_FILES = [
  ".editorconfig",
  ".env.example",
  ".gitattributes",
  ".gitignore",
  "App.tsx",
  "README.md",
  "app.json",
  "babel.config.js",
  "deno.lock",
  "eas.json",
  "eslint.config.js",
  "expo-env.d.ts",
  "jest.config.js",
  "package-lock.json",
  "package.json",
  "tsconfig.json",
];

const PRODUCTION_DIRECTORIES = [
  "android",
  "app",
  "artifacts",
  "assets",
  "db",
  "diagnostics",
  "docs",
  "public",
  "scripts",
  "src",
  "supabase",
  "types",
];

const TEMP_AND_LOCAL = [".expo", ".idea", ".vscode", "node_modules", "tmp"];
const DIAGNOSTICS_AND_PROOFS = ["artifacts", "diagnostics", "scripts/diagnostics/root-legacy"];
const ARCHIVE_HISTORICAL = ["diagnostics/archive/migrated"];

const ROOT_LEGACY_SCRIPT_PATTERN = /^(fix-.*|diag_.*|test_.*|.*\.ps1)$/i;

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function writeJson(targetPath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function listTrackedFiles() {
  return run("git", ["ls-files"])
    .split(/\r?\n/)
    .filter(Boolean);
}

function getTrackedBuildPaths(trackedFiles: string[]) {
  return trackedFiles.filter((entry) =>
    BUILD_OUTPUT_PREFIXES.some((prefix) => entry.startsWith(prefix)),
  );
}

function countTrackedInPath(target: string, trackedFiles: string[]) {
  return trackedFiles.filter((entry) => entry.startsWith(`${target}/`)).length;
}

function main() {
  const rootEntries = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const trackedFiles = listTrackedFiles();
  const trackedBuildPaths = getTrackedBuildPaths(trackedFiles);
  const rootLooseLegacyScripts = rootEntries.filter(
    (entry) => fs.statSync(path.join(projectRoot, entry)).isFile() && ROOT_LEGACY_SCRIPT_PATTERN.test(entry),
  );

  const gitignore = fs.readFileSync(path.join(projectRoot, ".gitignore"), "utf8");
  const requiredRules = Object.fromEntries(
    REQUIRED_GITIGNORE_RULES.map((rule) => [rule, gitignore.includes(rule)]),
  );

  const structureMap: RootStructureMap = {
    productionRootFiles: PRODUCTION_ROOT_FILES,
    productionDirectories: PRODUCTION_DIRECTORIES,
    buildOutputs: ["dist", "dist-android", "dist-preview", "dist-production", "dist-stale-*", "build", "test-results"],
    diagnosticsAndProofs: DIAGNOSTICS_AND_PROOFS,
    tempAndLocal: TEMP_AND_LOCAL,
    archiveHistorical: ARCHIVE_HISTORICAL,
    rootLegacyScriptCount: rootLooseLegacyScripts.length,
    notes: [
      "`dist-preview/` and `dist-production/` remain allowed as ignored local export outputs, not tracked source.",
      "`diagnostics/archive/migrated/` is classified as historical archive and excluded from active type-check ownership.",
      "`scripts/diagnostics/root-legacy/` remains the canonical home for legacy root diagnostics/fix scripts.",
    ],
  };

  const gitignoreProof: GitignoreProof = {
    requiredRules,
    trackedBuildOutputs: {
      dist: countTrackedInPath("dist", trackedFiles),
      distAndroid: countTrackedInPath("dist-android", trackedFiles),
      distPreview: countTrackedInPath("dist-preview", trackedFiles),
      distProduction: countTrackedInPath("dist-production", trackedFiles),
      build: countTrackedInPath("build", trackedFiles),
      testResults: countTrackedInPath("test-results", trackedFiles),
    },
    trackedBuildPaths,
  };

  const summary: Summary = {
    status: "failed",
    gate: "NOT_GREEN",
    rootCauseMap: {
      trackedBuildOutputsBeforeCleanup: {
        distAndroidTrackedCount: 47,
        testResultsTrackedCount: 1,
      },
      currentResidualRisk: [],
      migratedClassification: "historical_archive",
    },
    rootEntries,
    structureChecks: {
      rootMigratedRemoved: !fs.existsSync(path.join(projectRoot, "migrated")),
      archiveMigratedExists: fs.existsSync(path.join(projectRoot, "diagnostics", "archive", "migrated")),
      noTrackedBuildOutputs: trackedBuildPaths.length === 0,
      noLooseRootLegacyScripts: rootLooseLegacyScripts.length === 0,
      criticalBoundariesPresent:
        fs.existsSync(path.join(projectRoot, "scripts", "diagnostics", "root-legacy")) &&
        fs.existsSync(path.join(projectRoot, "diagnostics", "root-legacy")) &&
        fs.existsSync(path.join(projectRoot, "diagnostics", "archive")),
    },
    buildOutputProof: gitignoreProof,
    rootStructureMapPath: path.relative(projectRoot, structureMapPath).replace(/\\/g, "/"),
    gitignoreBuildOutputProofPath: path.relative(projectRoot, gitignoreProofPath).replace(/\\/g, "/"),
  };

  if (!summary.structureChecks.noTrackedBuildOutputs) {
    summary.rootCauseMap.currentResidualRisk.push("tracked_build_outputs_remaining");
  }
  if (!summary.structureChecks.rootMigratedRemoved || !summary.structureChecks.archiveMigratedExists) {
    summary.rootCauseMap.currentResidualRisk.push("migrated_archive_boundary_incomplete");
  }
  if (!summary.structureChecks.noLooseRootLegacyScripts) {
    summary.rootCauseMap.currentResidualRisk.push("loose_root_legacy_scripts_present");
  }
  if (!Object.values(requiredRules).every(Boolean)) {
    summary.rootCauseMap.currentResidualRisk.push("gitignore_rule_gap");
  }

  summary.status =
    summary.rootCauseMap.currentResidualRisk.length === 0 &&
    summary.structureChecks.criticalBoundariesPresent
      ? "passed"
      : "failed";
  summary.gate = summary.status === "passed" ? "GREEN" : "NOT_GREEN";

  writeJson(structureMapPath, structureMap);
  writeJson(gitignoreProofPath, gitignoreProof);
  writeJson(summaryPath, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
}

main();
