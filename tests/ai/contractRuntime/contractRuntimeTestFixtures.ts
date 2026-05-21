import {
  createAiContractTraceFromDomainBundle,
  getAiContractTraceExpectedFacts,
  scanAiContractRuntimePatchPatterns,
  type AiContractTrace,
} from "../../../src/lib/ai/contractRuntime";
import {
  createDomainGatewayProofRequest,
  executeAiDomainGatewayRequest,
} from "../../../src/lib/ai/domainDataGateway";

export async function createContractRuntimeTraceFixture(): Promise<AiContractTrace> {
  const request = createDomainGatewayProofRequest({ requestId: "contract-runtime-test" });
  const bundle = await executeAiDomainGatewayRequest(request);
  return createAiContractTraceFromDomainBundle({
    request,
    bundle,
    traceId: "contract-runtime-test-trace",
  });
}

export function expectedContractRuntimeNumericFacts() {
  return getAiContractTraceExpectedFacts();
}

export const cleanContractRuntimePatchScan = scanAiContractRuntimePatchPatterns({
  inlineSources: [{ file: "src/lib/ai/contractRuntime/test-clean.ts", text: "export const ok = true;" }],
});
