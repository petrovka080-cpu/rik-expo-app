import { expectFileNotToContain, expectFileToContain, expectFileToMatch } from "./releasePipelineContractUtils";

describe("live BOQ product gate runtime writes", () => {
  it("writes attempts and final evidence only under the candidate runtime tree", () => {
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "candidateRuntimeDir");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", `"product-gates", "live-boq"`);
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", `"attempt-1"`);
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", `"live_boq.json"`);
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "assertInsideRuntime");
    expectFileToContain("scripts/release/runLiveBoqProductGate.ts", "atomicWriteJson(paths.finalReportPath");
    expectFileToMatch("scripts/release/runLiveBoqProductGate.ts", /if \(failures\.length > 0\)[\s\S]*process\.exit\(1\);[\s\S]*atomicWriteJson\(paths\.finalReportPath/);
    expectFileNotToContain("scripts/release/runLiveBoqProductGate.ts", "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG");
  });
});
