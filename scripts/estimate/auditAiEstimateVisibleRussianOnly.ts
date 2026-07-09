import { execFileSync } from "node:child_process";

import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import {
  aiEstimateRequiredForRuLabel,
  containsForbiddenAiEstimateVisibleToken,
} from "../../src/lib/estimate/aiEstimateRuParameterDictionary";

export const GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY =
  "GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY" as const;
export const STOP_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_FAILED =
  "STOP_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_FAILED" as const;

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function visibleStrings(): string[] {
  const revision = createEstimateDraftRevision({
    rawInput: "вентфасад под ключ 1500 кв метров",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  return [
    ...buildAiEstimateParameterCards({ revision, includeMissing: true }).flatMap((card) => [
      card.labelRu,
      card.displayValueRu,
      card.sourceLabelRu,
      card.requiredForLabelRu,
    ]),
    ...revision.missingInputs.flatMap((input) => [
      input.label,
      aiEstimateRequiredForRuLabel(input.requiredFor),
    ]),
    "PDF и пакет закупки нужно пересоздать",
    "Источник цен не выбран",
  ];
}

export function auditAiEstimateVisibleRussianOnly() {
  const strings = visibleStrings();
  const offenders = strings.filter((item) =>
    containsForbiddenAiEstimateVisibleToken(item) || /[a-z]+_[a-z0-9_]+/i.test(item)
  );
  const finalGreen = offenders.length === 0;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY
      : STOP_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    visible_strings_checked: strings.length,
    visible_english_or_raw_token_count: offenders.length,
    offenders,
  };
  return { summary, strings };
}

if (require.main === module) {
  const result = auditAiEstimateVisibleRussianOnly();
  console.log(JSON.stringify(result.summary, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY) process.exitCode = 1;
}
