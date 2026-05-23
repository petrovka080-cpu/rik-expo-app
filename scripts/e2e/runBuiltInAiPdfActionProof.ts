import { writeBuiltInAiProofArtifacts } from "./builtInAiProofShared";

const artifacts = writeBuiltInAiProofArtifacts();
console.log(JSON.stringify({
  final_status: "GREEN_BUILT_IN_AI_PDF_ACTION_PROOF_READY",
  make_pdf_action_visible: artifacts.architectureMatrix.make_pdf_action_visible,
  pdf_uses_structured_payload: artifacts.architectureMatrix.pdf_uses_structured_payload,
}, null, 2));
if (!artifacts.architectureMatrix.make_pdf_action_visible || !artifacts.architectureMatrix.pdf_uses_structured_payload) process.exit(1);
