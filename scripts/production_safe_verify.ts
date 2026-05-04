import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactJsonPath = path.join(projectRoot, "artifacts", "production-safe-verification.json");
const artifactMdPath = path.join(projectRoot, "artifacts", "production-safe-verification.md");
const childProofArtifactPaths = [
  "artifacts/web-public-smoke.json",
  "artifacts/web-public-smoke.md",
  "artifacts/maestro-infra/report.xml",
  "artifacts/maestro-foundation/report.xml",
];
const forbiddenProofArtifactPatterns = [
  /(?:redis|rediss|postgres|postgresql):\/\//i,
  /\bDATABASE_URL\b/i,
  /\bREDIS_URL\b/i,
  new RegExp("\\bSUPABASE_" + "SERVICE_ROLE_KEY\\b", "i"),
  /\bSERVICE_ROLE\b/i,
  /\bANTHROPIC_API_KEY\b/i,
  /\bSENTRY_AUTH_TOKEN\b/i,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
];

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

type ArtifactEvidence = {
  id: string;
  path: string;
  status: StepStatus;
  summary: Record<string, boolean | number | string | null>;
  blocker: string | null;
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

function readJson(fullPath: string): unknown {
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function readXmlAttributes(fragment: string) {
  const attributes: Record<string, string> = {};
  for (const match of fragment.matchAll(/\s([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function toNumber(value: string | undefined) {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateWebSmokeArtifact(): ArtifactEvidence {
  const relativePath = "artifacts/web-public-smoke.json";
  const fullPath = path.join(projectRoot, relativePath);
  try {
    const payload = readJson(fullPath) as {
      status?: unknown;
      loginRouteOpened?: unknown;
      registerRouteOpened?: unknown;
      pageErrorCount?: unknown;
      consoleErrorCount?: unknown;
      badResponseCount?: unknown;
    };
    const summary = {
      status: typeof payload.status === "string" ? payload.status : null,
      loginRouteOpened: payload.loginRouteOpened === true,
      registerRouteOpened: payload.registerRouteOpened === true,
      pageErrorCount: typeof payload.pageErrorCount === "number" ? payload.pageErrorCount : null,
      consoleErrorCount: typeof payload.consoleErrorCount === "number" ? payload.consoleErrorCount : null,
      badResponseCount: typeof payload.badResponseCount === "number" ? payload.badResponseCount : null,
    };
    const ok =
      summary.status === "GREEN" &&
      summary.loginRouteOpened &&
      summary.registerRouteOpened &&
      summary.pageErrorCount === 0 &&
      summary.consoleErrorCount === 0 &&
      summary.badResponseCount === 0;

    return {
      id: "web-public-smoke-artifact",
      path: relativePath,
      status: ok ? "passed" : "failed",
      summary,
      blocker: ok ? null : "web-public-smoke-artifact-not-green",
    };
  } catch {
    return {
      id: "web-public-smoke-artifact",
      path: relativePath,
      status: "failed",
      summary: {
        status: null,
        loginRouteOpened: false,
        registerRouteOpened: false,
        pageErrorCount: null,
        consoleErrorCount: null,
        badResponseCount: null,
      },
      blocker: "web-public-smoke-artifact-unreadable",
    };
  }
}

function validateMaestroArtifact(id: string, relativePath: string): ArtifactEvidence {
  const fullPath = path.join(projectRoot, relativePath);
  try {
    const xml = fs.readFileSync(fullPath, "utf8");
    const suite = xml.match(/<testsuite\b([^>]*)>/);
    const attributes = suite ? readXmlAttributes(suite[1]) : {};
    const tests = toNumber(attributes.tests);
    const failures = toNumber(attributes.failures);
    const errors = toNumber(attributes.errors) ?? 0;
    const skipped = toNumber(attributes.skipped) ?? 0;
    const time = toNumber(attributes.time);
    const ok = tests != null && tests > 0 && failures === 0 && errors === 0;

    return {
      id,
      path: relativePath,
      status: ok ? "passed" : "failed",
      summary: {
        tests,
        failures,
        errors,
        skipped,
        time,
      },
      blocker: ok ? null : `${id}-artifact-not-passing`,
    };
  } catch {
    return {
      id,
      path: relativePath,
      status: "failed",
      summary: {
        tests: null,
        failures: null,
        errors: null,
        skipped: null,
        time: null,
      },
      blocker: `${id}-artifact-unreadable`,
    };
  }
}

function validateEvidenceArtifacts() {
  return [
    validateWebSmokeArtifact(),
    validateMaestroArtifact("maestro-infra-artifact", "artifacts/maestro-infra/report.xml"),
    validateMaestroArtifact("maestro-foundation-artifact", "artifacts/maestro-foundation/report.xml"),
    validateChildProofArtifactSecretBoundary(),
    validateEmulatorEvidence(),
  ];
}

function validateChildProofArtifactSecretBoundary(): ArtifactEvidence {
  let readablePathCount = 0;
  let unreadablePathCount = 0;
  let matchingPathCount = 0;
  let forbiddenPatternHitCount = 0;

  for (const relativePath of childProofArtifactPaths) {
    const fullPath = path.join(projectRoot, relativePath);
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      readablePathCount += 1;
      let matchedThisPath = false;
      for (const pattern of forbiddenProofArtifactPatterns) {
        if (pattern.test(content)) {
          forbiddenPatternHitCount += 1;
          matchedThisPath = true;
        }
      }
      if (matchedThisPath) matchingPathCount += 1;
    } catch {
      unreadablePathCount += 1;
    }
  }

  const ok = readablePathCount === childProofArtifactPaths.length && forbiddenPatternHitCount === 0;

  return {
    id: "child-proof-artifact-secret-boundary",
    path: "artifacts/{web-public-smoke,maestro-*}",
    status: ok ? "passed" : "failed",
    summary: {
      checkedPathCount: childProofArtifactPaths.length,
      readablePathCount,
      unreadablePathCount,
      matchingPathCount,
      forbiddenPatternHitCount,
    },
    blocker: ok ? null : "child-proof-artifact-secret-boundary-failed",
  };
}

function validateEmulatorEvidence(): ArtifactEvidence {
  const devices = readCommand("adb", ["devices", "-l"]);
  const emulator5554Connected = /\bemulator-5554\s+device\b/.test(devices);
  const windowDump = emulator5554Connected
    ? readCommand("adb", ["-s", "emulator-5554", "shell", "dumpsys", "window"])
    : "";
  const anrSignalFound = /Application Not Responding/i.test(windowDump);
  const currentFocus = windowDump.match(/mCurrentFocus=([^\r\n]+)/)?.[1]?.trim() ?? null;
  const focusedApp = windowDump.match(/mFocusedApp=([^\r\n]+)/)?.[1]?.trim() ?? null;
  const ok = emulator5554Connected && !anrSignalFound;

  return {
    id: "emulator-adb-evidence",
    path: "adb:emulator-5554",
    status: ok ? "passed" : "failed",
    summary: {
      emulator5554Connected,
      anrSignalFound,
      currentFocus: currentFocus ? currentFocus.slice(0, 120) : null,
      focusedApp: focusedApp ? focusedApp.slice(0, 120) : null,
    },
    blocker: ok ? null : "emulator-adb-evidence-failed",
  };
}

function buildReport(results: StepResult[]) {
  const failed = results.filter((step) => step.status !== "passed");
  const evidenceArtifacts = validateEvidenceArtifacts();
  const artifactBlockers = evidenceArtifacts
    .map((artifact) => artifact.blocker)
    .filter((blocker): blocker is string => Boolean(blocker));
  const head = readCommand("git", ["rev-parse", "HEAD"]);
  const originMain = readCommand("git", ["rev-parse", "origin/main"]);
  const worktreeShort = readCommand("git", ["status", "--short"]);
  const headEqualsOriginMain = Boolean(head) && head === originMain;
  const trackedWorktreeClean = worktreeShort.length === 0;
  const releaseStateBlockers = [
    ...(trackedWorktreeClean ? [] : ["release-state-not-clean"]),
    ...(headEqualsOriginMain ? [] : ["release-state-head-not-origin-main"]),
  ];
  const blockers = [...failed.map((step) => step.id), ...artifactBlockers, ...releaseStateBlockers];

  return {
    checkedAt: new Date().toISOString(),
    status: blockers.length === 0 ? "GREEN" : "NOT_GREEN",
    head,
    originMain,
    headEqualsOriginMain,
    trackedWorktreeClean,
    releaseStateOk: releaseStateBlockers.length === 0,
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
    evidenceArtifacts,
    blockers,
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
      `- releaseStateOk: ${String(report.releaseStateOk)}`,
      "",
      "## Steps",
      ...report.steps.map((step) => `- ${step.label}: ${step.status} (${step.durationMs}ms)`),
      "",
      "## Evidence Artifacts",
      ...report.evidenceArtifacts.map(
        (artifact) => `- ${artifact.id}: ${artifact.status} (${artifact.path})`,
      ),
      "",
      "## Release State",
      "- GREEN requires a clean tracked worktree.",
      "- GREEN requires HEAD to match origin/main.",
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
