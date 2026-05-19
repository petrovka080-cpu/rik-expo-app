import {
  buildAiGroundedButtonTrace,
  buildAiGroundedFreeTextTrace,
  buildAiGroundedQaMatrix,
} from "../../scripts/ai/aiGroundedButtonsAndFreeTextProof";

export function groundedButtonTrace() {
  return buildAiGroundedButtonTrace();
}

export function groundedFreeTextTrace() {
  return buildAiGroundedFreeTextTrace();
}

export function groundedQaMatrix() {
  return buildAiGroundedQaMatrix({
    webProofPass: true,
    androidProofPass: true,
  });
}
