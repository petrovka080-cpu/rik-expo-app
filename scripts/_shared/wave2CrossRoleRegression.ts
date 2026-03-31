export type Gate = "GREEN" | "NOT GREEN";

export type CrossRoleComponentOutputs = {
  requestLifecycle: Record<string, unknown>;
  proposalAtomic: Record<string, unknown>;
  directorCanonical: Record<string, unknown>;
  accountingCanonical: Record<string, unknown>;
  attachmentEvidence: Record<string, unknown>;
  attachmentParity: Record<string, unknown>;
  pdfRuntime: Record<string, unknown>;
  pdfSummary: Record<string, unknown>;
};

export type ChainResult = {
  id: string;
  label: string;
  status: Gate;
  invariants: Record<string, boolean>;
  failedStep: string | null;
  failureClass: string | null;
  componentSources: string[];
};

export type CrossRoleGateSummary = {
  status: Gate;
  chains: ChainResult[];
  exactFailedChain: string | null;
  exactFailedStep: string | null;
  exactFailureClass: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readBoolean = (value: unknown) => value === true;

export function normalizeGate(value: unknown): Gate {
  const text = String(value ?? "").trim().toUpperCase().replace(/_/g, " ");
  return text === "GREEN" ? "GREEN" : "NOT GREEN";
}

function firstFailure(
  order: Array<{ key: string; failedStep: string; failureClass: string }>,
  invariants: Record<string, boolean>,
) {
  const failed = order.find((entry) => invariants[entry.key] !== true);
  if (!failed) {
    return { failedStep: null, failureClass: null };
  }
  return { failedStep: failed.failedStep, failureClass: failed.failureClass };
}

export function evaluateCrossRoleGate(outputs: CrossRoleComponentOutputs): CrossRoleGateSummary {
  const requestLifecycle = asRecord(outputs.requestLifecycle);
  const proposalAtomic = asRecord(outputs.proposalAtomic);
  const directorCanonical = asRecord(outputs.directorCanonical);
  const accountingCanonical = asRecord(outputs.accountingCanonical);
  const attachmentEvidence = asRecord(outputs.attachmentEvidence);
  const attachmentParity = asRecord(outputs.attachmentParity);
  const pdfRuntime = asRecord(outputs.pdfRuntime);
  const pdfSummary = asRecord(outputs.pdfSummary);

  const pdfChecks = asRecord(pdfSummary.checks);
  const pdfRuntimeChecks = asRecord(pdfChecks.runtimeChecks);

  const chain1Invariants = {
    requestLifecycleGreen: normalizeGate(requestLifecycle.status) === "GREEN",
    proposalAtomicGreen: normalizeGate(proposalAtomic.status) === "GREEN",
    proposalDirectorVisible: readBoolean(asRecord(proposalAtomic.successPath).directorVisible),
    directorCanonicalGreen:
      normalizeGate(directorCanonical.finalStatus ?? directorCanonical.status) === "GREEN",
    accountingCanonicalGreen:
      normalizeGate(accountingCanonical.finalStatus ?? accountingCanonical.status) === "GREEN",
    attachmentEvidenceGreen:
      normalizeGate(attachmentEvidence.finalStatus ?? attachmentEvidence.status) === "GREEN",
    attachmentParityGreen: readBoolean(attachmentParity.safeSwitchVerdict),
    pdfRuntimeGreen: normalizeGate(pdfSummary.gate ?? pdfRuntime.gate) === "GREEN",
    pdfNoFatalCrash: readBoolean(pdfRuntimeChecks.noFatalCrash),
    pdfProcessAliveAfterOpen: readBoolean(pdfRuntimeChecks.processAliveAfterOpen),
  };

  const chain2Invariants = {
    requestLifecycleGreen: normalizeGate(requestLifecycle.status) === "GREEN",
    postSubmitEditBlocked: readBoolean(asRecord(requestLifecycle.postSubmitEditAttemptResult).blocked),
    postSubmitDeleteBlocked: readBoolean(asRecord(requestLifecycle.postSubmitDeleteAttemptResult).blocked),
    staleSyncBlocked: readBoolean(asRecord(requestLifecycle.staleSyncAttemptResult).blocked),
    secondDeviceOverwriteBlocked:
      readBoolean(asRecord(requestLifecycle.secondDeviceMutationAttemptResult).syncBlocked) &&
      readBoolean(asRecord(requestLifecycle.secondDeviceMutationAttemptResult).directItemUpdateBlocked),
    canonicalReopenSucceeded: readBoolean(asRecord(requestLifecycle.explicitReopenResult).succeeded),
    headItemConsistency: Object.values(asRecord(requestLifecycle.headItemStatusConsistencyResult)).every(readBoolean),
  };

  const chain3Invariants = {
    attachmentEvidenceGreen:
      normalizeGate(attachmentEvidence.finalStatus ?? attachmentEvidence.status) === "GREEN",
    canonicalEntityLinked: asRecord(attachmentEvidence.linkedEntitySummary).entityType === "proposal",
    accountantBasisVisible:
      Number(asRecord(attachmentEvidence.retrievalResult).accountantBasisVisibleCount ?? 0) > 0,
    invalidContextRejected:
      readBoolean(asRecord(attachmentEvidence.orphanInvalidLinkageAttemptResult).invalidStorageContextRejected) &&
      readBoolean(asRecord(attachmentEvidence.orphanInvalidLinkageAttemptResult).invalidEntityContextRejected),
    unboundBlobInvisible:
      readBoolean(attachmentParity.safeSwitchVerdict) ||
      readBoolean(asRecord(attachmentEvidence.orphanInvalidLinkageAttemptResult).unboundBlobVisible) === false,
  };

  const chain4Invariants = {
    pdfGateGreen: normalizeGate(pdfSummary.gate ?? pdfRuntime.gate) === "GREEN",
    directorPdfOpen: readBoolean(pdfRuntimeChecks.directorPdfOpen),
    accountantPaymentPdfOpen: readBoolean(pdfRuntimeChecks.accountantPaymentPdfOpen),
    warehousePdfOpen: readBoolean(pdfRuntimeChecks.warehousePdfOpen),
    attachmentPdfOpen: readBoolean(pdfRuntimeChecks.attachmentPdfOpen),
    invalidSourceControlled: readBoolean(pdfRuntimeChecks.invalidSourceControlled),
    noFatalCrash: readBoolean(pdfRuntimeChecks.noFatalCrash),
    processAliveAfterOpen: readBoolean(pdfRuntimeChecks.processAliveAfterOpen),
  };

  const chain1Failure = firstFailure(
    [
      { key: "requestLifecycleGreen", failedStep: "foreman_submit", failureClass: "request_lifecycle_regression" },
      { key: "proposalAtomicGreen", failedStep: "buyer_proposal_submit", failureClass: "proposal_atomicity_regression" },
      { key: "proposalDirectorVisible", failedStep: "director_visibility", failureClass: "proposal_atomicity_regression" },
      { key: "attachmentEvidenceGreen", failedStep: "buyer_attachment_evidence", failureClass: "attachment_evidence_regression" },
      { key: "attachmentParityGreen", failedStep: "evidence_visibility", failureClass: "attachment_evidence_regression" },
      { key: "directorCanonicalGreen", failedStep: "director_finance_truth", failureClass: "director_fact_regression" },
      { key: "accountingCanonicalGreen", failedStep: "accountant_finance_chain", failureClass: "finance_chain_regression" },
      { key: "pdfRuntimeGreen", failedStep: "pdf_open_runtime", failureClass: "pdf_runtime_regression" },
      { key: "pdfNoFatalCrash", failedStep: "pdf_open_runtime", failureClass: "pdf_runtime_regression" },
      { key: "pdfProcessAliveAfterOpen", failedStep: "pdf_open_runtime", failureClass: "pdf_runtime_regression" },
    ],
    chain1Invariants,
  );

  const chain2Failure = firstFailure(
    [
      { key: "requestLifecycleGreen", failedStep: "submit_boundary", failureClass: "request_lifecycle_regression" },
      { key: "postSubmitEditBlocked", failedStep: "post_submit_edit_guard", failureClass: "lifecycle_mutability_regression" },
      { key: "postSubmitDeleteBlocked", failedStep: "post_submit_delete_guard", failureClass: "lifecycle_mutability_regression" },
      { key: "staleSyncBlocked", failedStep: "stale_sync_guard", failureClass: "stale_guard_violation" },
      { key: "secondDeviceOverwriteBlocked", failedStep: "second_device_guard", failureClass: "stale_guard_violation" },
      { key: "canonicalReopenSucceeded", failedStep: "canonical_reopen", failureClass: "request_lifecycle_regression" },
      { key: "headItemConsistency", failedStep: "head_item_consistency", failureClass: "lifecycle_mutability_regression" },
    ],
    chain2Invariants,
  );

  const chain3Failure = firstFailure(
    [
      { key: "attachmentEvidenceGreen", failedStep: "canonical_evidence_bind", failureClass: "attachment_evidence_regression" },
      { key: "canonicalEntityLinked", failedStep: "business_entity_linkage", failureClass: "attachment_evidence_regression" },
      { key: "accountantBasisVisible", failedStep: "finance_basis_visibility", failureClass: "visibility_mismatch" },
      { key: "invalidContextRejected", failedStep: "invalid_context_guard", failureClass: "attachment_evidence_regression" },
      { key: "unboundBlobInvisible", failedStep: "orphan_blob_visibility", failureClass: "orphan_evidence_leak" },
    ],
    chain3Invariants,
  );

  const chain4Failure = firstFailure(
    [
      { key: "pdfGateGreen", failedStep: "pdf_runtime_gate", failureClass: "pdf_runtime_regression" },
      { key: "directorPdfOpen", failedStep: "director_pdf_open", failureClass: "pdf_runtime_regression" },
      { key: "accountantPaymentPdfOpen", failedStep: "accountant_pdf_open", failureClass: "pdf_runtime_regression" },
      { key: "warehousePdfOpen", failedStep: "warehouse_pdf_open", failureClass: "pdf_runtime_regression" },
      { key: "attachmentPdfOpen", failedStep: "attachment_pdf_open", failureClass: "pdf_runtime_regression" },
      { key: "invalidSourceControlled", failedStep: "invalid_source_guard", failureClass: "pdf_runtime_regression" },
      { key: "noFatalCrash", failedStep: "runtime_process_crash", failureClass: "runtime_failure" },
      { key: "processAliveAfterOpen", failedStep: "process_alive_after_open", failureClass: "runtime_failure" },
    ],
    chain4Invariants,
  );

  const chains: ChainResult[] = [
    {
      id: "request-proposal-director-accountant",
      label: "Request -> Proposal -> Director -> Accountant",
      status: Object.values(chain1Invariants).every(Boolean) ? "GREEN" : "NOT GREEN",
      invariants: chain1Invariants,
      failedStep: chain1Failure.failedStep,
      failureClass: chain1Failure.failureClass,
      componentSources: [
        "artifacts/request-lifecycle-boundary-smoke.json",
        "artifacts/proposal-atomic-boundary-smoke.json",
        "artifacts/director-canonical-fact-smoke.json",
        "artifacts/accounting-canonical-finance-smoke.json",
        "artifacts/attachment-evidence-boundary-smoke.json",
        "artifacts/pdf-open-crash-regression-summary.json",
      ],
    },
    {
      id: "request-lifecycle-safety",
      label: "Request lifecycle safety",
      status: Object.values(chain2Invariants).every(Boolean) ? "GREEN" : "NOT GREEN",
      invariants: chain2Invariants,
      failedStep: chain2Failure.failedStep,
      failureClass: chain2Failure.failureClass,
      componentSources: ["artifacts/request-lifecycle-boundary-smoke.json"],
    },
    {
      id: "attachment-evidence-visibility",
      label: "Attachment / commercial evidence visibility",
      status: Object.values(chain3Invariants).every(Boolean) ? "GREEN" : "NOT GREEN",
      invariants: chain3Invariants,
      failedStep: chain3Failure.failedStep,
      failureClass: chain3Failure.failureClass,
      componentSources: [
        "artifacts/attachment-evidence-boundary-smoke.json",
        "artifacts/attachment-evidence-parity.json",
      ],
    },
    {
      id: "pdf-open-runtime-safety",
      label: "PDF open runtime safety",
      status: Object.values(chain4Invariants).every(Boolean) ? "GREEN" : "NOT GREEN",
      invariants: chain4Invariants,
      failedStep: chain4Failure.failedStep,
      failureClass: chain4Failure.failureClass,
      componentSources: [
        "artifacts/pdf-open-runtime-proof.json",
        "artifacts/pdf-open-crash-regression-summary.json",
      ],
    },
  ];

  const failedChain = chains.find((entry) => entry.status !== "GREEN") ?? null;
  return {
    status: failedChain ? "NOT GREEN" : "GREEN",
    chains,
    exactFailedChain: failedChain?.id ?? null,
    exactFailedStep: failedChain?.failedStep ?? null,
    exactFailureClass: failedChain?.failureClass ?? null,
  };
}
