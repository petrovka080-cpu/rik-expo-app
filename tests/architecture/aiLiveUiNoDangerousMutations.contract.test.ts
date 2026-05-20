import { readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live AI UI architecture: no dangerous mutations", () => {
  it("does not call stock, payment, order, work close or signing mutations", () => {
    const source = readLiveUiSource();
    expect(source).not.toMatch(/executePayment\s*\(|createPayment\s*\(|createOrder\s*\(|mutateStock\s*\(|closeWork\s*\(|signAct\s*\(/);
    expect(source).not.toMatch(/finalReminderSend\s*\(|linkDocumentFinal\s*\(|closeTask\s*\(|changeApprovalStatus\s*\(/);
  });
});
