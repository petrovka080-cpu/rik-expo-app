import { documentProof } from "./documentTestFixtures";

test("document workflow bridge stays draft and approval-aware", () => {
  const { workflowBridge } = documentProof();
  expect(workflowBridge.workflowIds).toContain("document_pdf_evidence_linking");
  expect(workflowBridge.finalSubmit).toBe(false);
  expect(workflowBridge.approvalRequired).toBe(true);
});
