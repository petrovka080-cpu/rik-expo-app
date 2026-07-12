import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const GREEN_PRODUCTION_CANDIDATE_STATIC_GUARDS_READY =
  "GREEN_PRODUCTION_CANDIDATE_STATIC_GUARDS_READY" as const;
export const STOP_PRODUCTION_CANDIDATE_STATIC_GUARDS_NOT_READY =
  "STOP_PRODUCTION_CANDIDATE_STATIC_GUARDS_NOT_READY" as const;

type Finding = {
  file: string;
  rule: string;
  match: string;
};

function gitOutput(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function normalize(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), "utf8");
}

function exists(filePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

function trackedFiles(): string[] {
  return gitOutput(["ls-files"])
    .split(/\r?\n/)
    .map(normalize)
    .filter(Boolean);
}

function isCodeText(file: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs|yml|yaml|json|md)$/i.test(file);
}

function isTestFile(file: string): boolean {
  return /\.(test|spec|contract)\.(ts|tsx|js|jsx)$/.test(file) || file.startsWith("tests/");
}

function isProductionClientCode(file: string): boolean {
  return /^(src|app)\//.test(file) && /\.(ts|tsx)$/.test(file) && !isTestFile(file);
}

function isClientSecretExposurePath(file: string): boolean {
  return (
    /^(app|components|features|screens)\//.test(file) ||
    /^src\/(components|features|screens)\//.test(file)
  ) && /\.(ts|tsx)$/.test(file) && !isTestFile(file);
}

function addPatternFindings(params: {
  findings: Finding[];
  file: string;
  source: string;
  rule: string;
  pattern: RegExp;
}): void {
  for (const match of params.source.matchAll(params.pattern)) {
    params.findings.push({
      file: params.file,
      rule: params.rule,
      match: match[0].slice(0, 120),
    });
  }
}

export function buildProductionCandidateStaticGuardSummary() {
  const findings: Finding[] = [];
  const files = trackedFiles().filter(isCodeText);

  for (const file of files) {
    const source = read(file);
    if (/^(tests|src|scripts|app)\//.test(file)) {
      addPatternFindings({
        findings,
        file,
        source,
        rule: "focused_or_skipped_test",
        pattern: /\b(?:it|test|describe)\.(?:only|skip)\s*\(|\.only\s*\(/g,
      });
    }
    if (isProductionClientCode(file)) {
      addPatternFindings({
        findings,
        file,
        source,
        rule: "production_client_as_any",
        pattern: /\bas\s+any\b/g,
      });
      addPatternFindings({
        findings,
        file,
        source,
        rule: "production_client_empty_catch",
        pattern: /\bcatch\s*(?:\([^)]*\))?\s*{\s*}/g,
      });
    }
    if (isClientSecretExposurePath(file)) {
      addPatternFindings({
        findings,
        file,
        source,
        rule: "service_role_in_client_source",
        pattern: /\b(?:SUPABASE_SERVICE_ROLE_KEY|serviceRoleKey|service_role_key)\b/g,
      });
    }
  }

  const requiredFiles = [
    ".github/workflows/production-candidate-baseline.yml",
    ".github/workflows/production-candidate-heavy-seal.yml",
    "docs/release/PRODUCTION_SOURCE_OF_TRUTH.md",
    "scripts/release/auditProductionCandidateSourceOfTruth.ts",
    "scripts/release/assertProductionCandidateStaticGuards.ts",
  ];
  for (const file of requiredFiles) {
    if (!exists(file)) {
      findings.push({ file, rule: "required_release_source_file_missing", match: file });
    }
  }

  for (const workflow of [
    ".github/workflows/production-candidate-baseline.yml",
    ".github/workflows/production-candidate-heavy-seal.yml",
  ]) {
    if (!exists(workflow)) continue;
    const source = read(workflow);
    const requiredNeedles = [
      "permissions:",
      "contents: read",
      "release/production-candidate",
    ];
    for (const needle of requiredNeedles) {
      if (!source.includes(needle)) {
        findings.push({ file: workflow, rule: "workflow_required_guard_missing", match: needle });
      }
    }
    const banned = [
      ["pull_request_target", /pull_request_target/g],
      ["continue_on_error", /continue-on-error\s*:\s*true/g],
      ["shell_true_bypass", /\|\|\s*true/g],
      ["staging_deploy_confirm_in_ci", /--confirm-staging-deploy/g],
      ["eas_build_or_submit", /\beas\s+(?:build|submit)\b/g],
      ["production_deploy", /\bproduction\b.*\bdeploy\b/gi],
    ] as const;
    for (const [rule, pattern] of banned) {
      addPatternFindings({ findings, file: workflow, source, rule, pattern });
    }
  }

  if (exists(".github/workflows/production-candidate-baseline.yml")) {
    const source = read(".github/workflows/production-candidate-baseline.yml");
    for (const needle of [
      "auditProductionCandidateSourceOfTruth.ts",
      "assertProductionCandidateStaticGuards.ts",
      "deployRenderStagingAndWaitForLineage.ts",
      "release:verify:core",
      "verify:web-public-smoke",
      "ci:office-market",
    ]) {
      if (!source.includes(needle)) {
        findings.push({
          file: ".github/workflows/production-candidate-baseline.yml",
          rule: "baseline_ci_step_missing",
          match: needle,
        });
      }
    }
  }

  if (exists("render.yaml")) {
    const renderYaml = read("render.yaml");
    if (!renderYaml.includes("branch: release/production-candidate")) {
      findings.push({ file: "render.yaml", rule: "render_branch_not_candidate", match: "branch:" });
    }
    if (!renderYaml.includes("autoDeploy: false")) {
      findings.push({ file: "render.yaml", rule: "render_autodeploy_not_disabled", match: "autoDeploy" });
    }
  }

  if (exists("docs/release/PRODUCTION_SOURCE_OF_TRUTH.md")) {
    const doc = read("docs/release/PRODUCTION_SOURCE_OF_TRUTH.md");
    for (const needle of [
      "release/production-candidate",
      "No production deploy",
      "No release",
      "BLOCKED_OWNER_RENDER_DEPLOY_HOOK_ROTATION_REQUIRED",
    ]) {
      if (!doc.includes(needle)) {
        findings.push({
          file: "docs/release/PRODUCTION_SOURCE_OF_TRUTH.md",
          rule: "source_of_truth_doc_contract_missing",
          match: needle,
        });
      }
    }
  }

  return {
    final_status: findings.length === 0
      ? GREEN_PRODUCTION_CANDIDATE_STATIC_GUARDS_READY
      : STOP_PRODUCTION_CANDIDATE_STATIC_GUARDS_NOT_READY,
    scanned_files: files.length,
    findings,
    production_deploy_started: false,
    staging_deploy_started: false,
    native_build_started: false,
    fake_green_claimed: false,
  };
}

if (require.main === module) {
  const summary = buildProductionCandidateStaticGuardSummary();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== GREEN_PRODUCTION_CANDIDATE_STATIC_GUARDS_READY) {
    process.exitCode = 1;
  }
}
