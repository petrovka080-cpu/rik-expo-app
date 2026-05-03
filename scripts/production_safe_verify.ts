import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactJsonPath = path.join(projectRoot, "artifacts", "production-safe-verification.json");
const artifactMdPath = path.join(projectRoot, "artifacts", "production-safe-verification.md");

type StepStatus = "passed" | "failed";

type VerificationStep = {
  id: string;
  label: string;
  command: string;
  args: string[];
};

type StepResult = VerificationStep & {
  status: StepStatus;
  exitCode: number | null;
  durationMs: number;
};

const steps: VerificationStep[] = [
  {
    id: "typescript",
    label: "TypeScript noEmit",
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["tsc", "--noEmit", "--pretty", "false"],
  },
  {
    id: "expo-lint",
    label: "Expo lint",
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["expo", "lint"],
  },
  {
    id: "public-web-smoke-contract",
    label: "Public web smoke safety contract",
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["jest", "tests/e2e/publicWebSmokeSafety.contract.test.ts", "--runInBand"],
  },
  {
    id: "production-safe-verification-contract",
    label: "Production-safe verification contract",
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["jest", "tests/e2e/productionSafeVerification.contract.test.ts", "--runInBand"],
  },
  {
    id: "public-web-smoke",
    label: "Public web smoke",
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "verify:web-public-smoke"],
  },
  {
    id: "maestro-infra",
    label: "Maestro infra emulator smoke",
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "e2e:maestro:infra"],
  },
  {
    id: "maestro-foundation",
    label: "Maestro foundation emulator smoke",
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "e2e:maestro:foundation"],
  },
  {
    id: "git-diff-check",
    label: "Git diff whitespace check",
    command: "git",
    args: ["diff", "--check"],
  },
];

function writeText(fullPath: string, payload: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload, "utf8");
}

function runStep(step: VerificationStep): StepResult {
  const startedAt = Date.now();
  console.info(`\n[production-safe] ${step.label}`);
  console.info(`> ${step.command} ${step.args.join(" ")}`);

  const result = spawnSync(step.command, step.args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(step.command),
    env: {
      ...process.env,
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
    },
  });

  return {
    ...step,
    status: !result.error && result.status === 0 ? "passed" : "failed",
    exitCode: result.status ?? (result.error ? 1 : null),
    durationMs: Date.now() - startedAt,
  };
}

function readCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) return "";
  return String(result.stdout ?? "").trim();
}

function buildReport(results: StepResult[]) {
  const failed = results.filter((step) => step.status !== "passed");
  const head = readCommand("git", ["rev-parse", "HEAD"]);
  const originMain = readCommand("git", ["rev-parse", "origin/main"]);
  const worktreeShort = readCommand("git", ["status", "--short"]);

  return {
    checkedAt: new Date().toISOString(),
    status: failed.length === 0 ? "GREEN" : "NOT_GREEN",
    head,
    originMain,
    headEqualsOriginMain: Boolean(head) && head === originMain,
    trackedWorktreeClean: worktreeShort.length === 0,
    productionSafety: {
      publicRoutesOnly: true,
      authSubmitExecuted: false,
      registrationSubmitExecuted: false,
      authMutationSuitesRun: false,
      criticalBusinessSuitesRun: false,
      productionDbTouched: false,
      productionDbWritesExecuted: false,
      productionBusinessCallsExecuted: false,
      productionDeployTriggered: false,
      renderRedeployTriggered: false,
      otaPublished: false,
      easUpdateTriggered: false,
      easBuildTriggered: false,
      easSubmitTriggered: false,
      appStoreTouched: false,
      playMarketTouched: false,
      secretsPrinted: false,
      envValuesPrinted: false,
    },
    steps: results.map((step) => ({
      id: step.id,
      label: step.label,
      status: step.status,
      exitCode: step.exitCode,
      durationMs: step.durationMs,
    })),
    blockers: failed.map((step) => step.id),
  };
}

function writeReport(report: ReturnType<typeof buildReport>) {
  writeText(artifactJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeText(
    artifactMdPath,
    [
      "# Production-Safe Verification",
      "",
      `- status: ${report.status}`,
      `- checkedAt: ${report.checkedAt}`,
      `- head: ${report.head}`,
      `- originMain: ${report.originMain}`,
      `- headEqualsOriginMain: ${String(report.headEqualsOriginMain)}`,
      `- trackedWorktreeClean: ${String(report.trackedWorktreeClean)}`,
      "",
      "## Steps",
      ...report.steps.map((step) => `- ${step.label}: ${step.status} (${step.durationMs}ms)`),
      "",
      "## Production Safety",
      "- Public web routes only.",
      "- No auth submit or registration submit.",
      "- No auth/critical/business mutation Maestro suites.",
      "- No production DB access.",
      "- No deploy, redeploy, OTA publish, EAS build, or store action.",
      "- No secrets or env values printed by this verifier.",
    ].join("\n"),
  );
}

function main() {
  const results = steps.map(runStep);
  const report = buildReport(results);
  writeReport(report);
  console.info(`\n[production-safe] Final status: ${report.status}`);

  if (report.status !== "GREEN") {
    process.exitCode = 1;
  }
}

main();
