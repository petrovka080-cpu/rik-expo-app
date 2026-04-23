import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  evaluateCrossRoleGate,
  type CrossRoleComponentOutputs,
} from "./_shared/wave2CrossRoleRegression";

const projectRoot = process.cwd();

const readJson = <T,>(relativePath: string): T =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8")) as T;

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const writeText = (relativePath: string, payload: string) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload, "utf8");
};

function runCommand(command: string, args: string[]) {
  const executable = process.platform === "win32" && command === "npx" ? "npx.cmd" : command;
  const commandLine = [executable, ...args.map((entry) => (/\s/.test(entry) ? `"${entry}"` : entry))].join(" ");
  const result = spawnSync(commandLine, {
    cwd: projectRoot,
    encoding: "utf8",
    shell: true,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    command: `${command} ${args.join(" ")}`,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function requireCommandSuccess(result: ReturnType<typeof runCommand>) {
  if (!result.ok) {
    const error = [
      `Command failed: ${result.command}`,
      result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
      result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
    ].filter(Boolean).join("\n\n");
    throw new Error(error);
  }
}

async function main() {
  const steps = [
    {
      id: "request_lifecycle",
      command: ["npx", ["tsx", "scripts/request_lifecycle_boundary_verify.ts"]] as const,
    },
    {
      id: "proposal_atomic",
      command: ["npx", ["tsx", "scripts/proposal_atomic_boundary_verify.ts"]] as const,
    },
    {
      id: "director_canonical_fact",
      command: ["npx", ["tsx", "scripts/director_canonical_fact_verify.ts"]] as const,
    },
    {
      id: "accounting_canonical_finance",
      command: ["npx", ["tsx", "scripts/accounting_canonical_finance_verify.ts"]] as const,
    },
    {
      id: "attachment_evidence",
      command: ["npx", ["tsx", "scripts/attachment_evidence_boundary_verify.ts"]] as const,
    },
    {
      id: "pdf_targeted_jest",
      command: [
        "npx",
        [
          "jest",
          "--runInBand",
          "src/lib/pdf/pdfViewerContract.test.ts",
          "src/lib/pdfRunner.nativeOpen.test.ts",
          "src/lib/documents/pdfDocumentActions.test.ts",
          "src/lib/documents/attachmentOpener.test.ts",
          "--json",
          "--outputFile",
          "artifacts/pdf-open-regression-jest.json",
        ],
      ] as const,
    },
    {
      id: "pdf_runtime",
      command: ["npx", ["tsx", "scripts/pdf_open_crash_regression_verify.ts"]] as const,
    },
  ];

  const commandResults: Array<{
    id: string;
    command: string;
    ok: boolean;
    status: number | null;
  }> = [];
  try {
    for (const step of steps) {
      const result = runCommand(step.command[0], [...step.command[1]]);
      commandResults.push({
        id: step.id,
        command: result.command,
        ok: result.ok,
        status: result.status,
      });
      requireCommandSuccess(result);
    }

    const outputs: CrossRoleComponentOutputs = {
      requestLifecycle: readJson("artifacts/request-lifecycle-boundary-smoke.json"),
      proposalAtomic: readJson("artifacts/proposal-atomic-boundary-smoke.json"),
      directorCanonical: readJson("artifacts/director-canonical-fact-smoke.json"),
      accountingCanonical: readJson("artifacts/accounting-canonical-finance-smoke.json"),
      attachmentEvidence: readJson("artifacts/attachment-evidence-boundary-smoke.json"),
      attachmentParity: readJson("artifacts/attachment-evidence-parity.json"),
      pdfRuntime: readJson("artifacts/pdf-open-runtime-proof.json"),
      pdfSummary: readJson("artifacts/pdf-open-crash-regression-summary.json"),
    };

    const gate = evaluateCrossRoleGate(outputs);
    const summary = {
      generatedAt: new Date().toISOString(),
      status: gate.status,
      exactFailedChain: gate.exactFailedChain,
      exactFailedStep: gate.exactFailedStep,
      exactFailureClass: gate.exactFailureClass,
      commands: commandResults,
      chains: gate.chains,
    };

    writeJson(
      "artifacts/proposal-director-accountant-chain.json",
      gate.chains.find((entry) => entry.id === "request-proposal-director-accountant") ?? null,
    );
    writeJson(
      "artifacts/request-lifecycle-chain.json",
      gate.chains.find((entry) => entry.id === "request-lifecycle-safety") ?? null,
    );
    writeJson(
      "artifacts/attachment-evidence-chain.json",
      gate.chains.find((entry) => entry.id === "attachment-evidence-visibility") ?? null,
    );
    writeJson(
      "artifacts/pdf-runtime-chain.json",
      gate.chains.find((entry) => entry.id === "pdf-open-runtime-safety") ?? null,
    );
    writeJson("artifacts/cross-role-regression-summary.json", summary);
    writeText(
      "artifacts/cross-role-regression-proof.md",
      [
        "# Cross-Role Regression Proof",
        "",
        `- Final consolidated status: **${gate.status}**`,
        `- Exact failed chain: \`${gate.exactFailedChain ?? "none"}\``,
        `- Exact failed step: \`${gate.exactFailedStep ?? "none"}\``,
        `- Exact failure class: \`${gate.exactFailureClass ?? "none"}\``,
        "",
        "## Chains",
        ...gate.chains.flatMap((chain) => [
          `### ${chain.label}`,
          `- status: \`${chain.status}\``,
          `- failedStep: \`${chain.failedStep ?? "none"}\``,
          `- failureClass: \`${chain.failureClass ?? "none"}\``,
          `- componentSources: ${chain.componentSources.map((entry) => `\`${entry}\``).join(", ")}`,
        ]),
        "",
        "## Commands",
        ...commandResults.map((entry) => `- \`${entry.command}\` -> ${entry.ok ? "passed" : "failed"}`),
        "",
      ].join("\n"),
    );

    console.log(JSON.stringify(summary, null, 2));
    if (gate.status !== "GREEN") {
      process.exitCode = 1;
    }
  } catch (error) {
    const payload = {
      generatedAt: new Date().toISOString(),
      status: "NOT GREEN",
      exactFailedChain: null,
      exactFailedStep: null,
      exactFailureClass: "verifier_execution_failure",
      commands: commandResults,
      error: error instanceof Error ? error.message : String(error),
    };
    writeJson("artifacts/cross-role-regression-summary.json", payload);
    writeText(
      "artifacts/cross-role-regression-proof.md",
      `# Cross-Role Regression Proof\n\nVerifier execution failed.\n\n\`\`\`\n${payload.error}\n\`\`\`\n`,
    );
    console.error(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
  }
}

void main();
