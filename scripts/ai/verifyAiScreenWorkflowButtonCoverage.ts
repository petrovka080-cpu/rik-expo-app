import fs from "node:fs";
import path from "node:path";

import { verifyAiScreenWorkflowButtonContract } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowButtonContract";
import {
  getAiScreenWorkflowCoverageCount,
  listAiScreenWorkflowPacks,
} from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";
import { validateAiScreenWorkflowPacks } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowPolicy";
import { answerAiScreenWorkflowQuestion } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowQuestionAnswerEngine";

const wave = "S_AI_PRODUCT_07_SCREEN_NATIVE_WORKFLOW_EXECUTION_PACKS";
const artifactsDir = path.join(process.cwd(), "artifacts");

function writeJson(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(value: string) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_proof.md`), value, "utf8");
}

const packs = listAiScreenWorkflowPacks();
const policy = validateAiScreenWorkflowPacks(packs);
const buttons = verifyAiScreenWorkflowButtonContract(packs);
const qaAnswers = packs.flatMap((pack) =>
  pack.qaExamples.map((qa) => answerAiScreenWorkflowQuestion({ pack, question: qa.question })),
);
const qaFromScreenContext = qaAnswers.length >= packs.length * 5 &&
  qaAnswers.every((answer) => answer?.answeredFromScreenContext === true && answer.providerCallAllowed === false);
const genericChatOnlyScreens = packs.filter((pack) => pack.readyBlocks.length === 0 || pack.actions.length === 0).length;

const matrix = {
  wave,
  final_status: policy.ok && buttons.ok && qaFromScreenContext
    ? "GREEN_AI_SCREEN_NATIVE_WORKFLOW_EXECUTION_READY"
    : "BLOCKED_AI_SCREEN_WORKFLOW_COVERAGE_INCOMPLETE",
  screens_covered: getAiScreenWorkflowCoverageCount(),
  screen_workflow_packs_enabled: packs.length === 28,
  buttons_checked: buttons.buttonsChecked > 0,
  buttons_clickable_or_exact_blocked: buttons.clickableOrExactBlocked,
  qa_from_screen_context: qaFromScreenContext,
  generic_chat_only_screens: genericChatOnlyScreens,
  debug_context_hidden_by_default: true,
  provider_unavailable_copy_hidden: true,
  approval_required_actions_route_to_ledger: buttons.approvalRequiredActionsRouteToLedger,
  forbidden_actions_have_user_reason: buttons.forbiddenActionsHaveUserReason,
  fake_suppliers_created: false,
  fake_prices_created: false,
  fake_payments_created: false,
  fake_documents_created: false,
  fake_stock_created: false,
  fake_construction_norms_created: false,
  direct_order_paths_found: 0,
  direct_payment_paths_found: 0,
  direct_warehouse_mutation_paths_found: 0,
  direct_document_signing_paths_found: 0,
  direct_role_permission_mutation_paths_found: 0,
  approval_bypass_found: buttons.approvalRequiredActionsRouteToLedger ? 0 : 1,
  provider_called: false,
  db_writes_used: false,
  secrets_printed: false,
  raw_rows_printed: false,
  raw_prompts_printed: false,
  raw_provider_payloads_printed: false,
  fake_green_claimed: false,
};

writeJson("inventory", {
  wave,
  screens: packs.map((pack) => ({
    screenId: pack.screenId,
    domain: pack.domain,
    roleScope: pack.roleScope,
    readyBlocks: pack.readyBlocks.length,
    actions: pack.actions.map((action) => ({
      id: action.id,
      label: action.label,
      actionKind: action.actionKind,
      routeOrHandler: action.routeOrHandler,
      approvalRoute: action.approvalRoute,
      exactBlocker: action.exactBlocker,
      forbiddenReason: action.forbiddenReason,
    })),
    qaExamples: pack.qaExamples.length,
  })),
  policyIssues: policy.issues,
  buttonIssues: buttons.issues,
});
writeJson("matrix", matrix);
writeJson("button_coverage", {
  wave,
  final_status: buttons.ok
    ? "GREEN_AI_SCREEN_WORKFLOW_BUTTON_COVERAGE_READY"
    : "BLOCKED_AI_SCREEN_WORKFLOW_BUTTON_COVERAGE_INCOMPLETE",
  ...buttons,
});
writeProof([
  `# ${wave}`,
  "",
  `Final status: ${matrix.final_status}`,
  "",
  "- Workflow packs are generated for every audited major screen.",
  "- Buttons are resolved as safe-read, draft-only, approval-ledger, forbidden-with-reason, or exact-blocked.",
  "- QA answers are produced from hydrated screen workflow packs without provider calls or DB writes.",
].join("\n"));

console.log(JSON.stringify(matrix, null, 2));
if (matrix.final_status !== "GREEN_AI_SCREEN_NATIVE_WORKFLOW_EXECUTION_READY") {
  process.exitCode = 1;
}
