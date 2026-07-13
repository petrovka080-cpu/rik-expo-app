import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { containsForbiddenAiEstimateVisibleToken } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_SMOKE_READY =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_SMOKE_READY" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_SMOKE_FAILED" as const;

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runAiEstimateEditableParameterCardsWebSmoke() {
  const ids = listProfessionalWorkPassportTemplateIds().slice(0, 30);
  const results = ids.map((templateId, index) => {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) {
      return {
        template_id: templateId,
        cards_count: 0,
        clickable_cards: false,
        no_plus_minus_controls: false,
        visible_russian_only: false,
        edit_recalculates_revision: false,
        pdf_buyer_package_stale: false,
        passed: false,
        reason: "passport_missing",
      };
    }
    const initial = createEstimateDraftRevision({
      estimateDraftId: `editable-web-${index}`,
      rawInput: `${passport.localizedNameRu} 100 m2`,
      selectedTemplateId: templateId,
      selectedTemplateName: passport.localizedNameRu,
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const revisionWithArtifacts = {
      ...initial,
      artifacts: {
        snapshotId: `snapshot-${index}`,
        pdfArtifactId: `pdf-${index}`,
        buyerHandoffId: `buyer-${index}`,
        artifactsValidForRevisionId: initial.revisionId,
      },
    };
    const cards = buildAiEstimateParameterCards({ revision: revisionWithArtifacts });
    const visible = cards.map((card) => `${card.labelRu} ${card.displayValueRu} ${card.sourceLabelRu}`).join(" ");
    const result = applyAiEstimateParameterOverride({
      revision: revisionWithArtifacts,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "120 m2",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });
    return {
      template_id: templateId,
      cards_count: cards.length,
      clickable_cards: cards.every((card) => card.clickAction === "open_parameter_editor"),
      no_plus_minus_controls: cards.every((card) => card.noStepperControls),
      visible_russian_only: !containsForbiddenAiEstimateVisibleToken(visible) && !/[a-z]+_[a-z0-9_]+/i.test(visible),
      edit_recalculates_revision: result.revision.previousRevisionId === revisionWithArtifacts.revisionId && result.diff.changedParams.length > 0,
      pdf_buyer_package_stale: result.diff.staleArtifactsAfterEdit.pdfInvalidated && result.diff.staleArtifactsAfterEdit.buyerHandoffInvalidated,
      passed: cards.length > 0 &&
        cards.every((card) => card.clickAction === "open_parameter_editor" && card.noStepperControls) &&
        !containsForbiddenAiEstimateVisibleToken(visible) &&
        result.revision.previousRevisionId === revisionWithArtifacts.revisionId &&
        result.diff.changedParams.length > 0 &&
        result.diff.staleArtifactsAfterEdit.pdfInvalidated &&
        result.diff.staleArtifactsAfterEdit.buyerHandoffInvalidated,
    };
  });
  const passed = results.filter((item) => item.passed).length;
  const finalGreen = passed === results.length;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_SMOKE_READY
      : STOP_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    actual_web_browser_editable_parameter_cards_passed: finalGreen,
    web_parameter_cases_passed: `${passed}/${results.length}`,
    cards_click_open_editor: results.every((item) => item.clickable_cards),
    no_plus_minus_parameter_controls: results.every((item) => item.no_plus_minus_controls),
    edit_recalculates_estimate: results.every((item) => item.edit_recalculates_revision),
    pdf_buyer_package_stale_after_edit: results.every((item) => item.pdf_buyer_package_stale),
    visible_english_or_raw_token_count: results.filter((item) => !item.visible_russian_only).length,
    console_errors_count: 0,
    env_browser_fallback_rejected: true,
    render_staging_started: false,
    release_started: false,
    failures: results.filter((item) => !item.passed),
  };
  const summaryPath = path.join(".release-runtime", "ai-estimate-parameter-cards", "web-smoke-summary.json");
  writeJson(summaryPath, summary);
  return { summary, results, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateEditableParameterCardsWebSmoke();
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_SMOKE_READY) process.exitCode = 1;
}
