import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantButtonResultMatchesButton(trace: AiContractTrace) {
  const isButton = trace.entrypoint.mode === "screen_button";
  const passed = !isButton || (Boolean(trace.entrypoint.buttonId) && trace.answerShape.hasShortAnswer);
  return createAiInvariantCheck(
    "BUTTON_RESULT_MATCHES_BUTTON",
    passed,
    passed ? undefined : "Screen button trace has no button id or matching answer.",
  );
}
