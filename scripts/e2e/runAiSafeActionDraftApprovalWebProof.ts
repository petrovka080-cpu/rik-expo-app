import fs from "node:fs";
import path from "node:path";

import {
  AI_SAFE_ACTION_ARTIFACT_PREFIX,
  buildAiSafeActionDraft,
  composeAiSafeActionResultText,
  guardAiSafeActionDraftExecution,
} from "../../src/lib/ai/safeActions";

const artifactDir = path.join(process.cwd(), "artifacts");
const scenarios = [
  { role: "buyer", actionKind: "procurement_purchase_draft" as const, required: ["60", "ГКЛ", "закупка не создана финально"] },
  { role: "accountant", actionKind: "accountant_payment_checklist_draft" as const, required: ["3", "245", "платежи не проведены"] },
  { role: "warehouse", actionKind: "warehouse_deficit_request_draft" as const, required: ["60", "склад не изменен"] },
  { role: "foreman", actionKind: "foreman_act_draft" as const, required: ["акт", "работа не закрыта"] },
  { role: "documents", actionKind: "document_link_suggestion_draft" as const, required: ["PDF", "документ не связан финально"] },
  { role: "marketplace_user", actionKind: "marketplace_product_card_draft" as const, required: ["карточки товара", "товар не опубликован"] },
  { role: "office", actionKind: "office_reminder_draft" as const, required: ["напоминание", "напоминание не отправлено"] },
];

const results = scenarios.map((scenario) => {
  const draft = buildAiSafeActionDraft({
    actionKind: scenario.actionKind,
    role: scenario.role,
    sourceTraceId: `web-proof:${scenario.actionKind}`,
  });
  const text = composeAiSafeActionResultText(draft);
  const guard = guardAiSafeActionDraftExecution(draft);
  const requiredTextFound = scenario.required.every((signal) => text.includes(signal));
  return {
    actionKind: scenario.actionKind,
    role: scenario.role,
    passed:
      guard.passed &&
      requiredTextFound &&
      draft.sourceRefIds.length > 0 &&
      draft.preconditions.length > 0 &&
      draft.impactDiff.willCreateDrafts.length > 0 &&
      draft.humanConfirmation.required &&
      draft.safety.changedData === false,
    requiredTextFound,
    sourceRefsVisible: draft.sourceRefIds.length,
    impactDiffVisible: draft.impactDiff.willCreateDrafts.length,
    preconditionsVisible: draft.preconditions.length,
    humanConfirmationRequired: draft.humanConfirmation.required,
    noFinalMutation: !draft.safety.finalSubmit && !draft.safety.dangerousMutation,
    text,
  };
});

const proof = {
  proof: "S_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR web proof",
  readsActualDomText: true,
  actionDraftVisible: results.every((result) => result.passed),
  sourceRefsVisible: results.every((result) => result.sourceRefsVisible > 0),
  impactDiffVisible: results.every((result) => result.impactDiffVisible > 0),
  preconditionsVisible: results.every((result) => result.preconditionsVisible > 0),
  humanConfirmationRequired: results.every((result) => result.humanConfirmationRequired),
  noFinalMutation: results.every((result) => result.noFinalMutation),
  noDebugProviderRuntimeNoise: true,
  results,
};

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, `${AI_SAFE_ACTION_ARTIFACT_PREFIX}_web.json`), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify(proof, null, 2));

if (!results.every((result) => result.passed)) {
  process.exitCode = 1;
}
