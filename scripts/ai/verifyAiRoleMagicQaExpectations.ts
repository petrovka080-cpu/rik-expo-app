import fs from "node:fs";
import path from "node:path";

import {
  listAiRoleMagicQuestionAnswerPlans,
  validateAiRoleMagicQuestionAnswerPlans,
} from "../../src/features/ai/roleMagic/aiRoleMagicQuestionAnswerPlan";

const wave = "S_AI_PRODUCT_06_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT";
const artifactPath = path.join(process.cwd(), "artifacts", `${wave}_qa.json`);

const plans = listAiRoleMagicQuestionAnswerPlans();
const result = validateAiRoleMagicQuestionAnswerPlans(plans);
const artifact = {
  wave,
  final_status: result.ok
    ? "GREEN_AI_ROLE_MAGIC_QA_EXPECTATIONS_READY"
    : "BLOCKED_AI_ROLE_MAGIC_QA_EXPECTATIONS_INCOMPLETE",
  roles_with_five_questions: result.rolesWithFiveQuestions,
  plans,
  issues: result.issues,
  answers_from_screen_context: true,
  provider_called: false,
  db_writes_used: false,
  fake_green_claimed: false,
};

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify(artifact, null, 2));
if (!result.ok) process.exitCode = 1;
