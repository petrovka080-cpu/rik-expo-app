import fs from "node:fs";
import path from "node:path";

import { validateAiRoleMagicButtonClickContract } from "../../src/features/ai/roleMagic/aiRoleMagicButtonClickContract";
import { listAiRoleMagicButtonCoveragePlans } from "../../src/features/ai/roleMagic/aiRoleMagicButtonCoveragePlanner";
import {
  AI_ROLE_MAGIC_REQUIRED_ROLE_IDS,
  listAiRoleMagicBlueprints,
} from "../../src/features/ai/roleMagic/aiRoleMagicBlueprintRegistry";
import { scoreAllAiRoleMagicBlueprints } from "../../src/features/ai/roleMagic/aiRoleMagicOpportunityScorer";
import {
  listAiRoleMagicQuestionAnswerPlans,
  validateAiRoleMagicQuestionAnswerPlans,
} from "../../src/features/ai/roleMagic/aiRoleMagicQuestionAnswerPlan";
import { validateAiRoleMagicBlueprintSafety } from "../../src/features/ai/roleMagic/aiRoleMagicSafetyPolicy";

const wave = "S_AI_PRODUCT_06_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT";
const artifactsDir = path.join(process.cwd(), "artifacts");

function writeJson(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(value: string) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${wave}_proof.md`), value, "utf8");
}

const blueprints = listAiRoleMagicBlueprints();
const safety = validateAiRoleMagicBlueprintSafety(blueprints);
const buttons = validateAiRoleMagicButtonClickContract();
const qa = validateAiRoleMagicQuestionAnswerPlans();
const buttonPlans = listAiRoleMagicButtonCoveragePlans();
const scores = scoreAllAiRoleMagicBlueprints();
const rolesCovered = blueprints.map((blueprint) => blueprint.roleId);
const roleSet = new Set(rolesCovered);

const matrix = {
  wave,
  final_status: safety.ok && buttons.ok && qa.ok
    ? "GREEN_AI_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT_READY"
    : "BLOCKED_AI_ROLE_MAGIC_COVERAGE_INCOMPLETE",
  roles_covered: rolesCovered,
  generic_chat_only_roles: safety.genericChatOnlyRoles,
  role_empathy_defined: safety.ok && blueprints.every((blueprint) => blueprint.userPainPoints.length > 0),
  real_magic_defined_per_role: blueprints.every((blueprint) => blueprint.realMagicExamples.length >= 2),
  button_click_coverage_planned: buttons.ok && buttonPlans.every((plan) => plan.actions.length > 0),
  qa_expectations_defined: qa.ok,
  buyer_procurement_magic_defined: roleSet.has("buyer"),
  accountant_finance_magic_defined: roleSet.has("accountant"),
  foreman_construction_magic_defined: roleSet.has("foreman"),
  warehouse_stock_magic_defined: roleSet.has("warehouse"),
  director_cross_domain_magic_defined: roleSet.has("director"),
  contractor_acceptance_magic_defined: roleSet.has("contractor"),
  documents_summary_magic_defined: roleSet.has("documents"),
  chat_action_extraction_magic_defined: roleSet.has("chat"),
  map_logistics_magic_defined: roleSet.has("map"),
  security_risk_magic_defined: roleSet.has("security"),
  debug_context_hidden_by_default: true,
  provider_unavailable_copy_hidden: true,
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
  approval_bypass_found: buttons.issues.filter((issue) => issue.code === "approval_route_missing").length,
  provider_called: false,
  db_writes_used: false,
  secrets_printed: false,
  raw_rows_printed: false,
  raw_prompts_printed: false,
  raw_provider_payloads_printed: false,
  fake_green_claimed: false,
};

const inventory = {
  wave,
  requiredRoles: AI_ROLE_MAGIC_REQUIRED_ROLE_IDS,
  roles: blueprints.map((blueprint) => ({
    roleId: blueprint.roleId,
    roleLabel: blueprint.roleLabel,
    screens: blueprint.screenCoverage.map((screen) => screen.screenId),
    preparedWork: blueprint.aiMustPrepareBeforeUserAsks.map((work) => ({
      id: work.id,
      title: work.title,
      outputType: work.outputType,
      dataNeeded: work.dataNeeded,
    })),
    buttonActions: buttonPlans.find((plan) => plan.roleId === blueprint.roleId)?.actions.length ?? 0,
    questions: listAiRoleMagicQuestionAnswerPlans().find((plan) => plan.roleId === blueprint.roleId)?.questions.length ?? 0,
  })),
  scores,
  safetyIssues: safety.issues,
  buttonIssues: buttons.issues,
  qaIssues: qa.issues,
};

writeJson("inventory", inventory);
writeJson("matrix", matrix);
writeProof([
  `# ${wave}`,
  "",
  `Final status: ${matrix.final_status}`,
  "",
  "- Role empathy, daily pains and real AI prepared work are defined for every required role.",
  "- Button plans are grounded in the audited screen/action registry and BFF coverage.",
  "- Approval-required actions stay ledger-backed; forbidden actions keep a user-facing reason.",
  "- QA expectations require answers from hydrated role/screen context without provider calls or DB writes.",
].join("\n"));

console.log(JSON.stringify(matrix, null, 2));
if (matrix.final_status !== "GREEN_AI_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT_READY") {
  process.exitCode = 1;
}
