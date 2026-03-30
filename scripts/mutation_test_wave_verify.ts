import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type JsonRecord = Record<string, unknown>;

type JestAssertionRecord = {
  ancestorTitles?: string[];
  title?: string;
  status?: string;
};

type JestSuiteRecord = {
  assertionResults?: JestAssertionRecord[];
};

type JestReport = {
  success?: boolean;
  numPassedTests?: number;
  numFailedTests?: number;
  testResults?: JestSuiteRecord[];
};

const projectRoot = process.cwd();

const readJsonIfExists = <T,>(relativePath: string): T | null => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
};

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const flattenAssertions = (report: JestReport | null) =>
  (report?.testResults ?? []).flatMap((suite) =>
    (suite.assertionResults ?? []).map((assertion) => ({
      fullName: [...(assertion.ancestorTitles ?? []), assertion.title ?? ""]
        .filter(Boolean)
        .join(" > "),
      status: assertion.status ?? "unknown",
    })),
  );

const findAssertion = (
  assertions: Array<{ fullName: string; status: string }>,
  pattern: string,
) =>
  assertions.find((assertion) => assertion.fullName.includes(pattern)) ?? {
    fullName: pattern,
    status: "missing",
  };

const isGreenStatus = (value: unknown) =>
  value === "GREEN" || value === "passed" || value === "success";

const runCommand = (label: string, command: string) => {
  try {
    execSync(command, {
      cwd: projectRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
    return {
      label,
      command,
      status: "passed",
    } as const;
  } catch (error) {
    return {
      label,
      command,
      status: "failed",
      exitCode:
        error && typeof error === "object" && "status" in error && typeof error.status === "number"
          ? error.status
          : 1,
      error:
        error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
          ? error.stderr.trim()
          : error instanceof Error
            ? error.message
            : String(error ?? "unknown"),
    } as const;
  }
};

function main() {
  const commands: JsonRecord[] = [];

  const tscResult = runCommand("tsc", "npx tsc --noEmit --pretty false");
  commands.push(tscResult);

  const buyerJestResult = runCommand(
    "buyer_mutation_jest",
    [
      "npx jest --runInBand",
      "src/screens/buyer/buyer.submit.mutation.test.ts",
      "src/screens/buyer/buyer.attachments.mutation.test.ts",
      "src/screens/buyer/buyer.status.mutation.test.ts",
      "src/screens/buyer/buyer.rfq.rework.mutation.test.ts",
      "--json --outputFile artifacts/buyer-mutation-jest.json",
    ].join(" "),
  );
  commands.push(buyerJestResult);

  const buyerVerifyResult =
    buyerJestResult.status === "passed"
      ? runCommand("buyer_mutation_verify", "npx tsx scripts/buyer_mutation_boundary_verify.ts")
      : {
          label: "buyer_mutation_verify",
          command: "npx tsx scripts/buyer_mutation_boundary_verify.ts",
          status: "skipped",
          reason: "buyer_jest_failed",
        };
  commands.push(buyerVerifyResult);

  const pdfJestResult = runCommand(
    "pdf_family_jest",
    [
      "npx jest --runInBand",
      "src/lib/api/paymentPdf.service.test.ts",
      "src/lib/api/directorPdfSource.service.test.ts",
      "src/lib/api/pdf_director.test.ts",
      "src/lib/pdf/pdf.runner.test.ts",
      "src/lib/documents/pdfDocumentActions.test.ts",
      "src/lib/pdf/pdfViewerContract.test.ts",
      "src/lib/pdfRunner.silentCatch.test.ts",
      "--json --outputFile artifacts/pdf-family-jest.json",
    ].join(" "),
  );
  commands.push(pdfJestResult);

  const pdfVerifyResult =
    pdfJestResult.status === "passed"
      ? runCommand("pdf_family_verify", "npx tsx scripts/pdf_family_hardening_verify.ts")
      : {
          label: "pdf_family_verify",
          command: "npx tsx scripts/pdf_family_hardening_verify.ts",
          status: "skipped",
          reason: "pdf_jest_failed",
        };
  commands.push(pdfVerifyResult);

  const coreMutationJestResult = runCommand(
    "core_mutation_jest",
    [
      "npx jest --runInBand",
      "src/lib/api/requests.test.ts",
      "src/lib/api/proposals.silentCatch.test.ts",
      "src/screens/accountant/components/ActivePaymentForm.test.tsx",
      "src/screens/accountant/accountant.paymentForm.helpers.test.ts",
      "src/screens/accountant/useAccountantPayActions.test.tsx",
      "src/shared/ui/ScreenErrorBoundary.test.tsx",
      "--json --outputFile artifacts/mutation-test-wave-jest.json",
    ].join(" "),
  );
  commands.push(coreMutationJestResult);

  const runtimeScriptCommands = [
    ["requests_mutation_wave_verify", "npx tsx scripts/requests_mutation_wave_verify.ts"],
    ["proposal_pipeline_verify", "npx tsx scripts/proposal_pipeline_verify.ts"],
    ["warehouse_mutation_wave_verify", "npx tsx scripts/warehouse_mutation_wave_verify.ts"],
  ] as const;

  for (const [label, command] of runtimeScriptCommands) {
    commands.push(runCommand(label, command));
  }

  const coreMutationReport = readJsonIfExists<JestReport>("artifacts/mutation-test-wave-jest.json");
  const coreAssertions = flattenAssertions(coreMutationReport);

  const requestsMutationSummary = readJsonIfExists<JsonRecord>("artifacts/requests-mutation-wave-summary.json");
  const proposalPipelineSummary = readJsonIfExists<JsonRecord>("artifacts/proposal-pipeline-summary.json");
  const buyerMutationSummary = readJsonIfExists<JsonRecord>("artifacts/buyer-mutation-boundary-summary.json");
  const buyerSubmitMatrix = readJsonIfExists<JsonRecord>("artifacts/buyer-submit-failure-matrix.json");
  const buyerAttachmentsProof = readJsonIfExists<JsonRecord>("artifacts/buyer-attachments-stage-proof.json");
  const fkGuardSummary = readJsonIfExists<JsonRecord>("artifacts/fk-guard-summary.json");
  const orphanProof = readJsonIfExists<JsonRecord>("artifacts/orphan-detection-proof.json");
  const pdfFamilySummary = readJsonIfExists<JsonRecord>("artifacts/pdf-family-hardening-summary.json");
  const pdfObservabilityProof = readJsonIfExists<JsonRecord>("artifacts/pdf-runner-observability-proof.json");
  const warehouseMutationSummary = readJsonIfExists<JsonRecord>("artifacts/warehouse-mutation-wave-summary.json");

  const requestChecks = {
    reuseFirstCreate: findAssertion(
      coreAssertions,
      "reuses eligible empty draft before inserting a new request draft",
    ).status,
    cachedDraftReuse: findAssertion(
      coreAssertions,
      "reuses the cached draft id when it is still valid",
    ).status,
    submitVerification: findAssertion(
      coreAssertions,
      "verifies rpc submit path and clears cached draft id after success",
    ).status,
    submitFailure: findAssertion(
      coreAssertions,
      "fails closed when submit verification finds request items still in draft",
    ).status,
    runtimeFullCycle:
      requestsMutationSummary?.flow != null && isGreenStatus(requestsMutationSummary.status)
        ? "passed"
        : "missing",
  };

  const proposalChecks = {
    createReadBoundary:
      proposalPipelineSummary?.sourceMap != null && isGreenStatus(proposalPipelineSummary.status)
        ? "passed"
        : "missing",
    addItemsFailureVisible: findAssertion(
      coreAssertions,
      "records degraded fallback when proposal item RPC fails but fallback insert succeeds",
    ).status,
    submitFailureVisible: findAssertion(
      coreAssertions,
      "surfaces submit failures through observability and rethrows them",
    ).status,
    runtimeCreateRead: isGreenStatus(proposalPipelineSummary?.status) ? "passed" : "missing",
  };

  const accountantChecks = {
    openLoadReady: findAssertion(
      coreAssertions,
      "opens, loads, and reaches ready state without stale placeholders",
    ).status,
    closeCancelsInflight: findAssertion(
      coreAssertions,
      "cancels in-flight loads on immediate close without stale state updates",
    ).status,
    staleResponseIgnored: findAssertion(
      coreAssertions,
      "ignores stale responses after quick reopen and publishes only fresh rows",
    ).status,
    partialAllocationParity: findAssertion(
      coreAssertions,
      "keeps partial allocation totals and residuals deterministic",
    ).status,
    fullAllocationParity: findAssertion(
      coreAssertions,
      "applies full allocation parity without changing formulas",
    ).status,
    clearLifecycle: findAssertion(
      coreAssertions,
      "clears partial allocation state deterministically",
    ).status,
    parentRerenderNoStorm: findAssertion(
      coreAssertions,
      "does not refetch on parent rerender with the same proposal",
    ).status,
    applyFailureVisible: findAssertion(
      coreAssertions,
      "exposes apply failure visibly and records observability without false success",
    ).status,
    helperNormalization: findAssertion(
      coreAssertions,
      "normalizes items and keeps invalid rows out of parity calculations",
    ).status,
    helperParity: findAssertion(
      coreAssertions,
      "derives partial/full allocation parity without changing formulas",
    ).status,
  };

  const warehouseChecks = {
    canonicalHeads: warehouseMutationSummary?.requestListSmoke
      ? String((warehouseMutationSummary.requestListSmoke as JsonRecord).pass) === "true"
        ? "passed"
        : "failed"
      : "missing",
    canonicalDetails: warehouseMutationSummary?.requestDetailsSmoke
      ? String((warehouseMutationSummary.requestDetailsSmoke as JsonRecord).pass) === "true"
        ? "passed"
        : "failed"
      : "missing",
    parity: warehouseMutationSummary?.parity
      ? String((warehouseMutationSummary.parity as JsonRecord).pass) === "true"
        ? "passed"
        : "failed"
      : "missing",
    sourceCanonical:
      warehouseMutationSummary?.requestListSmoke &&
      ((warehouseMutationSummary.requestListSmoke as JsonRecord).sourcePath === "canonical")
        ? "passed"
        : "failed",
  };

  const integrityChecks = {
    runtimeGuardSummary: isGreenStatus(fkGuardSummary?.status) ? "passed" : "missing",
    orphanProof: isGreenStatus(orphanProof?.status) ? "passed" : "missing",
  };

  const pdfChecks = {
    pdfFamilyGreen: isGreenStatus(pdfFamilySummary?.gate) ? "passed" : "missing",
    paymentSource: pdfFamilySummary?.checks &&
      ((pdfFamilySummary.checks as JsonRecord).scenarioChecks as JsonRecord | undefined)?.paymentPdfWorks === true
      ? "passed"
      : "failed",
    directorSource: pdfFamilySummary?.checks &&
      ((pdfFamilySummary.checks as JsonRecord).scenarioChecks as JsonRecord | undefined)?.directorProductionPdfWorks === true
      ? "passed"
      : "failed",
    renderFailVisible:
      pdfFamilySummary?.checks &&
      ((pdfFamilySummary.checks as JsonRecord).scenarioChecks as JsonRecord | undefined)?.renderFailVisible === true
        ? "passed"
        : "failed",
    openFailVisible:
      pdfFamilySummary?.checks &&
      ((pdfFamilySummary.checks as JsonRecord).scenarioChecks as JsonRecord | undefined)?.openFailVisible === true
        ? "passed"
        : "failed",
    observabilityProof: isGreenStatus(pdfObservabilityProof?.status) ? "passed" : "missing",
  };

  const observabilityChecks = {
    requestPathVisible: getStatusFromChecks(requestChecks.submitFailure),
    proposalPathVisible: getStatusFromChecks(proposalChecks.submitFailureVisible),
    buyerStageVisible: buyerSubmitMatrix != null && buyerAttachmentsProof != null && isGreenStatus(buyerMutationSummary?.status)
      ? "passed"
      : "missing",
    paymentPathVisible: getStatusFromChecks(accountantChecks.applyFailureVisible),
    pdfPathVisible: getStatusFromChecks(pdfChecks.observabilityProof),
    errorBoundaryVisible: findAssertion(
      coreAssertions,
      "shows fallback, logs the crash and retries the screen subtree",
    ).status,
  };

  const criticalServiceMatrix = {
    requests_api: {
      verificationType: ["service_test", "runtime_smoke"],
      checks: requestChecks,
      proofSources: [
        "artifacts/mutation-test-wave-jest.json",
        "artifacts/requests-mutation-wave-summary.json",
      ],
    },
    proposals_api: {
      verificationType: ["service_test", "runtime_smoke"],
      checks: proposalChecks,
      proofSources: [
        "artifacts/mutation-test-wave-jest.json",
        "artifacts/proposal-pipeline-summary.json",
      ],
    },
    buyer_mutation_boundary: {
      verificationType: ["service_test", "runtime_proof"],
      status: buyerMutationSummary?.status ?? "missing",
      proofSources: [
        "artifacts/buyer-mutation-boundary-summary.json",
        "artifacts/buyer-submit-failure-matrix.json",
        "artifacts/buyer-attachments-stage-proof.json",
      ],
    },
    accountant_payment_orchestration: {
      verificationType: ["service_test"],
      checks: accountantChecks,
      proofSources: ["artifacts/mutation-test-wave-jest.json"],
    },
    warehouse_request_loaders_canonical: {
      verificationType: ["runtime_smoke"],
      checks: warehouseChecks,
      proofSources: ["artifacts/warehouse-mutation-wave-summary.json"],
    },
    integrity_guards: {
      verificationType: ["existing_runtime_proof"],
      checks: integrityChecks,
      proofSources: [
        "artifacts/fk-guard-summary.json",
        "artifacts/orphan-detection-proof.json",
      ],
    },
    pdf_runner_service_boundaries: {
      verificationType: ["service_test", "runtime_proof"],
      checks: pdfChecks,
      proofSources: [
        "artifacts/pdf-family-hardening-summary.json",
        "artifacts/pdf-runner-observability-proof.json",
      ],
    },
    critical_observability_adapters: {
      verificationType: ["service_test", "proof"],
      checks: observabilityChecks,
      proofSources: [
        "artifacts/mutation-test-wave-jest.json",
        "artifacts/buyer-submit-failure-matrix.json",
        "artifacts/pdf-runner-observability-proof.json",
      ],
    },
  };

  const matrixPassed = Object.values(criticalServiceMatrix).every((entry) => {
    if ("status" in entry) return isGreenStatus(entry.status);
    return Object.values(entry.checks).every((value) => getStatusFromChecks(value) === "passed");
  });

  const summary = {
    status:
      tscResult.status === "passed" &&
      commands.every((entry) => entry.status === "passed" || entry.status === "skipped") &&
      (coreMutationReport?.success === true) &&
      isGreenStatus(requestsMutationSummary?.status) &&
      isGreenStatus(proposalPipelineSummary?.status) &&
      isGreenStatus(buyerMutationSummary?.status) &&
      isGreenStatus(fkGuardSummary?.status) &&
      isGreenStatus(pdfFamilySummary?.gate) &&
      isGreenStatus(warehouseMutationSummary?.status) &&
      matrixPassed
        ? "GREEN"
        : "NOT GREEN",
    commandResults: commands,
    coreMutationJest: {
      success: coreMutationReport?.success ?? false,
      numPassedTests: coreMutationReport?.numPassedTests ?? 0,
      numFailedTests: coreMutationReport?.numFailedTests ?? 0,
      totalAssertions: coreAssertions.length,
    },
    proofs: {
      requestsMutationWave: requestsMutationSummary?.status ?? "missing",
      proposalPipeline: proposalPipelineSummary?.status ?? "missing",
      buyerMutationBoundary: buyerMutationSummary?.status ?? "missing",
      integrityGuards: fkGuardSummary?.status ?? "missing",
      pdfFamily: pdfFamilySummary?.gate ?? "missing",
      warehouseMutationWave: warehouseMutationSummary?.status ?? "missing",
    },
  };

  writeJson("artifacts/critical-service-test-matrix.json", {
    status: matrixPassed ? "GREEN" : "NOT GREEN",
    matrix: criticalServiceMatrix,
  });
  writeJson("artifacts/mutation-test-wave-summary.json", summary);
  writeJson("artifacts/stability-gate-summary.json", {
    status: summary.status,
    finalGate: {
      noSilentFail:
        proposalChecks.submitFailureVisible === "passed" &&
        pdfChecks.renderFailVisible === "passed" &&
        pdfChecks.openFailVisible === "passed" &&
        observabilityChecks.paymentPathVisible === "passed",
      mutationFamiliesCovered: [
        "requests_api",
        "proposals_api",
        "buyer_mutation_boundary",
        "accountant_payment_orchestration",
        "warehouse_request_loaders_canonical",
        "integrity_guards",
        "pdf_runner_service_boundaries",
        "critical_observability_adapters",
      ],
      commandCount: commands.length,
      matrixPassed,
    },
    proofs: summary.proofs,
  });

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

function getStatusFromChecks(value: unknown): "passed" | "failed" | "missing" {
  if (value === "passed") return "passed";
  if (value === "failed") return "failed";
  if (value === "missing") return "missing";
  if (value === "GREEN" || value === "passed" || value === true) return "passed";
  return "failed";
}

void main();
