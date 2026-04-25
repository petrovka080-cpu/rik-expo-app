import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactJsonPath = path.join(projectRoot, "artifacts", "wave2-platform-verify.json");
const artifactMarkdownPath = path.join(projectRoot, "artifacts", "wave2-platform-verify.md");
const npmBinary = process.platform === "win32" ? "npm.cmd" : "npm";
const npxBinary = process.platform === "win32" ? "npx.cmd" : "npx";
const includeExternalAi = process.env.WAVE2_INCLUDE_EXTERNAL_AI === "1";

type StepStatus = "passed" | "failed" | "skipped" | "warning";

type VerifyStep = {
  id: string;
  label: string;
  command: string;
  args: string[];
  required: boolean;
  env?: Record<string, string>;
};

type VerifyStepResult = {
  id: string;
  label: string;
  command: string;
  required: boolean;
  status: StepStatus;
  exitCode: number | null;
  durationMs: number;
};

type VerifyReport = {
  checkedAt: string;
  status: "GREEN" | "NOT_GREEN" | "GREEN_WITH_EXTERNAL_WARN";
  includeExternalAi: boolean;
  blockingStepId: string | null;
  steps: VerifyStepResult[];
};

function writeArtifact(fullPath: string, payload: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload, "utf8");
}

function runStep(step: VerifyStep): VerifyStepResult {
  const startedAt = Date.now();
  console.info(`\n[wave2-platform] ${step.label}`);
  console.info(`> ${step.command} ${step.args.join(" ")}`.trim());
  const requiresShell =
    process.platform === "win32" && /\.(bat|cmd)$/i.test(step.command);

  const result = spawnSync(step.command, step.args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: requiresShell,
    env: {
      ...process.env,
      ...step.env,
    },
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    process.stderr.write(`${String(result.error.message ?? result.error)}\n`);
  }

  return {
    id: step.id,
    label: step.label,
    command: `${step.command} ${step.args.join(" ")}`.trim(),
    required: step.required,
    status: !result.error && result.status === 0 ? "passed" : "failed",
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
  };
}

function buildSteps(): VerifyStep[] {
  const requiredSteps: VerifyStep[] = [
    {
      id: "contract",
      label: "Maestro contract test",
      command: npmBinary,
      args: ["test", "--", "--runInBand", "tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts"],
      required: true,
    },
    {
      id: "tsc",
      label: "TypeScript noEmit",
      command: npxBinary,
      args: ["tsc", "--noEmit", "--pretty", "false"],
      required: true,
    },
    {
      id: "expo-lint",
      label: "Expo lint",
      command: npxBinary,
      args: ["expo", "lint"],
      required: true,
    },
    {
      id: "warehouse-runtime",
      label: "Warehouse request runtime verifier",
      command: npmBinary,
      args: ["run", "verify:warehouse-issue-request-runtime"],
      required: true,
    },
    {
      id: "critical",
      label: "Maestro critical deterministic suite",
      command: npmBinary,
      args: ["run", "e2e:maestro:critical"],
      required: true,
      env: {
        MAESTRO_SKIP_WAREHOUSE_ISSUE_RUNTIME_VERIFY: "1",
      },
    },
    {
      id: "git-diff-check",
      label: "Git diff check",
      command: "git",
      args: ["diff", "--check"],
      required: true,
    },
  ];

  if (!includeExternalAi) {
    return requiredSteps;
  }

  return [
    ...requiredSteps,
    {
      id: "external-ai",
      label: "Maestro external AI suite",
      command: npmBinary,
      args: ["run", "e2e:maestro:external-ai"],
      required: false,
    },
  ];
}

function buildReport(stepResults: VerifyStepResult[]): VerifyReport {
  const blockingStep = stepResults.find((step) => step.required && step.status === "failed") ?? null;
  const externalAiStep = stepResults.find((step) => step.id === "external-ai");
  const hasExternalWarning = !!externalAiStep && externalAiStep.status === "failed";

  return {
    checkedAt: new Date().toISOString(),
    status: blockingStep
      ? "NOT_GREEN"
      : hasExternalWarning
        ? "GREEN_WITH_EXTERNAL_WARN"
        : "GREEN",
    includeExternalAi,
    blockingStepId: blockingStep?.id ?? null,
    steps: stepResults,
  };
}

function writeReport(report: VerifyReport) {
  writeArtifact(artifactJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    "# Wave 2 Platform Verify",
    "",
    `- checkedAt: ${report.checkedAt}`,
    `- status: ${report.status}`,
    `- includeExternalAi: ${String(report.includeExternalAi)}`,
    `- blockingStepId: ${report.blockingStepId ?? "none"}`,
    "",
    "## Steps",
    ...report.steps.map(
      (step) =>
        `- ${step.label}: ${step.status} (${step.durationMs}ms)${step.required ? "" : " [soft]"}`,
    ),
  ];

  writeArtifact(artifactMarkdownPath, `${lines.join("\n")}\n`);
}

function main() {
  const steps = buildSteps();
  const results: VerifyStepResult[] = [];

  for (const step of steps) {
    if (results.some((result) => result.required && result.status === "failed")) {
      results.push({
        id: step.id,
        label: step.label,
        command: `${step.command} ${step.args.join(" ")}`.trim(),
        required: step.required,
        status: "skipped",
        exitCode: null,
        durationMs: 0,
      });
      continue;
    }

    const result = runStep(step);
    if (!step.required && result.status === "failed") {
      results.push({ ...result, status: "warning" });
      continue;
    }
    results.push(result);
  }

  const report = buildReport(results);
  writeReport(report);

  console.info(`\n[wave2-platform] Final status: ${report.status}`);
  if (report.blockingStepId) {
    console.info(`[wave2-platform] Blocking step: ${report.blockingStepId}`);
  }

  if (report.status === "NOT_GREEN") {
    process.exitCode = 1;
  }
}

main();
