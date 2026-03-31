import { evaluateCrossRoleGate } from "./_shared/wave2CrossRoleRegression";

const greenOutputs = {
  requestLifecycle: {
    status: "GREEN",
    postSubmitEditAttemptResult: { blocked: true },
    postSubmitDeleteAttemptResult: { blocked: true },
    staleSyncAttemptResult: { blocked: true },
    secondDeviceMutationAttemptResult: { syncBlocked: true, directItemUpdateBlocked: true },
    explicitReopenResult: { succeeded: true },
    headItemStatusConsistencyResult: {
      headIsNonDraft: true,
      headHasSubmittedAt: true,
      itemCountStable: true,
      itemStatusesNotDraftOrCancelled: true,
    },
  },
  proposalAtomic: {
    status: "GREEN",
    successPath: { directorVisible: true },
  },
  directorCanonical: {
    finalStatus: "GREEN",
  },
  accountingCanonical: {
    finalStatus: "GREEN",
  },
  attachmentEvidence: {
    finalStatus: "GREEN",
    linkedEntitySummary: { entityType: "proposal" },
    retrievalResult: { accountantBasisVisibleCount: 1 },
    orphanInvalidLinkageAttemptResult: {
      invalidStorageContextRejected: true,
      invalidEntityContextRejected: true,
      unboundBlobVisible: false,
    },
  },
  attachmentParity: {
    safeSwitchVerdict: true,
  },
  pdfRuntime: {
    gate: "GREEN",
  },
  pdfSummary: {
    gate: "GREEN",
    checks: {
      runtimeChecks: {
        directorPdfOpen: true,
        accountantPaymentPdfOpen: true,
        warehousePdfOpen: true,
        attachmentPdfOpen: true,
        invalidSourceControlled: true,
        noFatalCrash: true,
        processAliveAfterOpen: true,
      },
    },
  },
};

describe("wave2 cross-role regression evaluation", () => {
  it("returns GREEN when all four chains are satisfied", () => {
    const summary = evaluateCrossRoleGate(greenOutputs);
    expect(summary.status).toBe("GREEN");
    expect(summary.exactFailedChain).toBeNull();
    expect(summary.chains).toHaveLength(4);
  });

  it("returns exact failed chain and failure class for PDF regression", () => {
    const summary = evaluateCrossRoleGate({
      ...greenOutputs,
      pdfSummary: {
        gate: "NOT_GREEN",
        checks: {
          runtimeChecks: {
            directorPdfOpen: true,
            accountantPaymentPdfOpen: false,
            warehousePdfOpen: true,
            attachmentPdfOpen: true,
            invalidSourceControlled: true,
            noFatalCrash: true,
            processAliveAfterOpen: true,
          },
        },
      },
    });

    expect(summary.status).toBe("NOT GREEN");
    expect(summary.exactFailedChain).toBe("request-proposal-director-accountant");
    expect(summary.exactFailedStep).toBe("pdf_open_runtime");
    expect(summary.exactFailureClass).toBe("pdf_runtime_regression");
  });
});
