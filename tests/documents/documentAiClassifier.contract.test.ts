import { classifyDocumentKind } from "../../src/lib/documents/evidenceIntelligence";
import { documentProof } from "./documentTestFixtures";

test("AI document classifier detects invoice without final fact", () => {
  const { chunks } = documentProof();
  const result = classifyDocumentKind(chunks);
  expect(result.detectedKind).toBe("invoice");
  expect(result.finalFact).toBe(false);
});
