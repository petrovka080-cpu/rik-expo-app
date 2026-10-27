import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantRussianUiNoDebugNoise(trace: AiContractTrace) {
  const passed =
    trace.ui.language === "ru" &&
    !trace.ui.debugNoiseVisible &&
    !trace.ui.providerNoiseVisible &&
    !trace.ui.runtimeNoiseVisible &&
    !trace.ui.rawPayloadVisible;
  return createAiInvariantCheck(
    "RUSSIAN_UI_NO_DEBUG_NOISE",
    passed,
    passed ? undefined : "UI language/noise contract failed.",
  );
}
