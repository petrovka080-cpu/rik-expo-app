import { getAiContractTraceExpectedFacts, createAiGoldenContractTrace } from "../aiContractTrace";
import { buildAiContractRuntimeMatrix } from "../aiContractRuntimeMatrix";
import { buildAiContractRuntimeReport } from "../aiContractRuntimeReport";
import { validateAiContractRuntimeTrace } from "../aiContractRuntimeValidator";
import { scanAiContractRuntimePatchPatterns } from "../aiNoSymptomPatchPolicy";

export async function buildAiContractRuntimeProof(params: {
  rootDir?: string;
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
} = {}) {
  const trace = await createAiGoldenContractTrace();
  const patchScan = scanAiContractRuntimePatchPatterns({ rootDir: params.rootDir });
  const validation = validateAiContractRuntimeTrace({
    trace,
    expectedNumericFacts: getAiContractTraceExpectedFacts(),
    patchScan,
  });
  const report = buildAiContractRuntimeReport({ trace, validation, patchScan });
  const matrix = buildAiContractRuntimeMatrix({
    trace,
    validation,
    patchScan,
    rootDir: params.rootDir,
    webProofPassed: params.webProofPassed,
    androidProofPassed: params.androidProofPassed,
  });

  return {
    trace,
    patchScan,
    validation,
    report,
    matrix,
  };
}
