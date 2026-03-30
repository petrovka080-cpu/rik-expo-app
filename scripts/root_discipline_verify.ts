import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type Summary = {
  status: "passed" | "failed";
  gate: "GREEN" | "NOT_GREEN";
  rootFiles: string[];
  rootDirectories: string[];
  trackedRootFiles: string[];
  unexpectedTrackedRootFiles: string[];
  unexpectedLooseRootFiles: string[];
  movedScriptCount: number;
  movedDiagnosticCount: number;
  boundaries: {
    scriptsDiagnosticsExists: boolean;
    diagnosticsRootLegacyExists: boolean;
    tmpRootLocalExists: boolean;
  };
  ignoreRules: Record<string, boolean>;
};

const projectRoot = process.cwd();
const summaryOutPath = path.join(projectRoot, "artifacts", "root-discipline-summary.json");

const movedScripts = [
  "auto-ignore.js",
  "diagnose.js",
  "diag_db.ts",
  "diag_db2.ts",
  "diag_enum.ts",
  "diag_enum2.ts",
  "diag_rpcs.ts",
  "diag_rpcs_json.ts",
  "diag_sql.ts",
  "diag_trig.ts",
  "diag_triggers.ts",
  "fetch_rpc.ts",
  "fetch_rpc2.ts",
  "probe.js",
  "probe2.js",
  "schema_check.ts",
  "test_keys.ts",
  "test_reports.ts",
  "test_rpc_error.ts",
  "fix-accountant-cast.js",
  "fix-accountant-imports.js",
  "fix-foreman-props.js",
  "fix-incoming-items.js",
  "fix-lists.js",
  "fix-rik-api.js",
  "fix-stars.js",
  "fix-syntax.js",
  "fix-ts-hard.js",
  "fix-ts-ignore.js",
  "fix-ts.js",
  "fix-ts2.js",
  "fix-ts3.js",
  "fix_deprecated.ps1",
  "run_ws5.ps1",
];

const movedDiagnostics = [
  "app.json.bak",
  "buyer-supplier-selection-ux-diagnostic-v1.md",
  "diag_db.json",
  "diag_out.txt",
  "diag_rpcs.json",
  "diag_rpcs_out.txt",
  "diagnostic_canon_sync_run.json",
  "diagnostic_code_alignment_apply_result.json",
  "diagnostic_code_mismatch_foreman.json",
  "diagnostic_smeta_report.md",
  "diff.txt",
  "director_diff.txt",
  "director_diff8.txt",
  "director_diff_current.txt",
  "director_diff_current8.txt",
  "director_history.txt",
  "director_history8.txt",
  "openapi.json",
  "test_output.json",
  "test_payload.json",
  "tmp_foreman.txt",
  "tmp_foreman_lists.txt",
  "tmp_from_calls.txt",
  "tunnel_err.txt",
];

const allowedTrackedRootFiles = new Set([
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
  "jest.config.js",
  "package-lock.json",
  "package.json",
  "tsconfig.json",
]);

const allowedLooseRootFiles = new Set([...allowedTrackedRootFiles, ".env.local", "expo-env.d.ts"]);

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const gitRootFiles = (): string[] => {
  const result = spawnSync("git", ["ls-files"], { cwd: projectRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || "git ls-files failed");
  }
  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((entry) => !entry.includes("/"));
};

const main = () => {
  const rootEntries = fs.readdirSync(projectRoot, { withFileTypes: true });
  const rootFiles = rootEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const rootDirectories = rootEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const trackedRootFiles = gitRootFiles().sort((left, right) => left.localeCompare(right));
  const unexpectedTrackedRootFiles = trackedRootFiles.filter((file) => !allowedTrackedRootFiles.has(file));
  const unexpectedLooseRootFiles = rootFiles.filter((file) => !allowedLooseRootFiles.has(file));

  const scriptsDiagnosticsExists = movedScripts.every((file) =>
    fs.existsSync(path.join(projectRoot, "scripts", "diagnostics", "root-legacy", file)),
  );
  const diagnosticsRootLegacyExists = movedDiagnostics.every((file) =>
    fs.existsSync(path.join(projectRoot, "diagnostics", "root-legacy", file)),
  );
  const tmpRootLocalExists = fs.existsSync(path.join(projectRoot, "tmp", "root-local"));

  const gitignore = readText(".gitignore");
  const ignoreRules = {
    tmp: gitignore.includes("tmp/"),
    distStale: gitignore.includes("dist-stale-*/"),
    codexLogs: gitignore.includes(".codex-*.log"),
    expoSmokeLog: gitignore.includes(".expo-web-smoke.log"),
    tmpExpoLogs: gitignore.includes(".tmp-expo-*.log"),
    queueWorkerLog: gitignore.includes("queue-worker-smoke.log"),
    tempHttpLog: gitignore.includes("temp-http.log"),
  };

  const summary: Summary = {
    status:
      unexpectedTrackedRootFiles.length === 0 &&
      unexpectedLooseRootFiles.length === 0 &&
      scriptsDiagnosticsExists &&
      diagnosticsRootLegacyExists &&
      tmpRootLocalExists &&
      Object.values(ignoreRules).every(Boolean)
        ? "passed"
        : "failed",
    gate: "NOT_GREEN",
    rootFiles,
    rootDirectories,
    trackedRootFiles,
    unexpectedTrackedRootFiles,
    unexpectedLooseRootFiles,
    movedScriptCount: movedScripts.length,
    movedDiagnosticCount: movedDiagnostics.length,
    boundaries: {
      scriptsDiagnosticsExists,
      diagnosticsRootLegacyExists,
      tmpRootLocalExists,
    },
    ignoreRules,
  };

  summary.gate = summary.status === "passed" ? "GREEN" : "NOT_GREEN";

  writeJson(summaryOutPath, summary);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
};

main();
