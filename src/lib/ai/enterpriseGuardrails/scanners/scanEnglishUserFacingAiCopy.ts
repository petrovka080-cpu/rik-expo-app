import { listAiLiveScreenButtons, listAiLiveScreenManifests, validateAiLiveScreenRussianCopy } from "../../liveScreenCopilot";
import { createScanResult, type AiEnterpriseScanFinding } from "../aiEnterpriseForbiddenPatterns";

export function scanEnglishUserFacingAiCopy() {
  const texts = [
    ...listAiLiveScreenButtons().map((button) => button.labelRu),
    ...listAiLiveScreenButtons().map((button) => button.concreteQuestionRu),
    ...listAiLiveScreenManifests().map((manifest) => manifest.titleRu),
    ...listAiLiveScreenManifests().map((manifest) => manifest.userGoalRu),
    ...listAiLiveScreenManifests().map((manifest) => manifest.defaultQuestionRu),
  ];
  const audit = validateAiLiveScreenRussianCopy({ texts });
  const findings: AiEnterpriseScanFinding[] = audit.englishSignals.map((signal, index) => ({
    file: "liveScreenCopilot:user-facing-copy",
    line: index + 1,
    pattern: signal,
    matchedText: signal,
    reason: "AI buttons, prompts, statuses, and normal user copy must be Russian.",
  }));
  return createScanResult("scanEnglishUserFacingAiCopy", findings);
}
