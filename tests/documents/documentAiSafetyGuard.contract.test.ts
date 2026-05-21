import { guardDocumentAiEvidence } from "../../src/lib/documents/evidenceIntelligence";
import { documentProof } from "./documentTestFixtures";

test("document AI safety guard blocks leaks and final facts", () => {
  const proof = documentProof();
  expect(proof.safety.passed).toBe(true);
  expect(
    guardDocumentAiEvidence({
      document: proof.document,
      extraction: proof.extraction,
      sourceRefs: proof.sourceRefs,
      linkSuggestions: proof.linkSuggestions,
      answerTextRu: "signedUrl показан",
    }).failureReason,
  ).toBe("signed_url_leaked");
});
