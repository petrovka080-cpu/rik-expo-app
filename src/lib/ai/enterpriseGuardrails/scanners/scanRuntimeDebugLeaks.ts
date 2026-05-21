import { listAiLiveScreenButtons, listAiLiveScreenManifests } from "../../liveScreenCopilot";
import { createScanResult, type AiEnterpriseScanFinding } from "../aiEnterpriseForbiddenPatterns";

const FORBIDDEN_USER_TEXT = [
  "provider unavailable",
  "runtime",
  "debug",
  "trace",
  "intent",
  "entity",
  "source planner",
  "raw payload",
  "semantic guard",
  "service_role",
  "fallback",
];

function scanText(owner: string, text: string): AiEnterpriseScanFinding[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_USER_TEXT
    .filter((signal) => lower.includes(signal))
    .map((signal) => ({
      file: owner,
      line: 1,
      pattern: signal,
      matchedText: signal,
      reason: "Normal user-facing AI copy must hide runtime/debug/provider internals.",
    }));
}

export function scanRuntimeDebugLeaks() {
  const findings = [
    ...listAiLiveScreenButtons().flatMap((button) => scanText(`button:${button.id}`, button.labelRu)),
    ...listAiLiveScreenButtons().flatMap((button) => scanText(`button-question:${button.id}`, button.concreteQuestionRu)),
    ...listAiLiveScreenManifests().flatMap((manifest) => scanText(`manifest:${manifest.screenId}`, manifest.titleRu)),
    ...listAiLiveScreenManifests().flatMap((manifest) => scanText(`manifest-goal:${manifest.screenId}`, manifest.userGoalRu)),
  ];
  return createScanResult("scanRuntimeDebugLeaks", findings);
}
