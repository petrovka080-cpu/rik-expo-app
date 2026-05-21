import type {
  AiContractRuntimePatchScanResult,
  AiContractRuntimeValidationResult,
  AiContractTrace,
  AiRootCauseReport,
} from "./aiContractRuntimeTypes";

export type AiContractRuntimeReport = {
  trace: AiContractTrace;
  validation: AiContractRuntimeValidationResult;
  patchScan: AiContractRuntimePatchScanResult;
  rootCauseReports: AiRootCauseReport[];
  releaseGateRequired: true;
};

export function buildAiContractRuntimeReport(params: {
  trace: AiContractTrace;
  validation: AiContractRuntimeValidationResult;
  patchScan: AiContractRuntimePatchScanResult;
}): AiContractRuntimeReport {
  return {
    trace: params.trace,
    validation: params.validation,
    patchScan: params.patchScan,
    rootCauseReports: params.validation.blockers.flatMap((blocker) =>
      blocker.rootCause ? [blocker.rootCause] : [],
    ),
    releaseGateRequired: true,
  };
}

export function assertAiContractRuntimeReportGreen(report: AiContractRuntimeReport): void {
  if (!report.validation.passed) {
    const blockers = report.validation.blockers
      .map((blocker) => `${blocker.invariantId}: ${blocker.reasonRu}`)
      .join("; ");
    throw new Error(`AI contract runtime invariant proof failed: ${blockers}`);
  }
}
