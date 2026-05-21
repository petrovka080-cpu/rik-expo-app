import { readFile, readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live semantic AI proof architecture: no dangerous mutation", () => {
  it("does not add direct payment, order, stock, work, role, security, or approval mutations", () => {
    const source = [
      readLiveUiSource(),
      readFile("scripts/e2e/runAiLiveSemanticAnswerProof.ts"),
      readFile("scripts/e2e/runAiLiveSemanticAnswerMaestroProof.ts"),
    ].join("\n");

    expect(source).not.toMatch(/executePayment\s*\(|createPayment\s*\(|createOrder\s*\(|mutateStock\s*\(|closeWork\s*\(|signAct\s*\(/);
    expect(source).not.toMatch(/changeApprovalStatus\s*\(|approveDirect\s*\(|rejectDirect\s*\(|bypassApproval\s*\(/);
    expect(source).not.toMatch(/mutateRole\s*\(|grantAdmin\s*\(|securityOverride\s*\(/);
  });
});
