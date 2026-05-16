import fs from "node:fs";
import path from "node:path";

import { validateAiRoleMagicButtonClickContract } from "../../src/features/ai/roleMagic/aiRoleMagicButtonClickContract";
import { listAiRoleMagicButtonCoveragePlans } from "../../src/features/ai/roleMagic/aiRoleMagicButtonCoveragePlanner";

const wave = "S_AI_PRODUCT_06_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT";
const artifactPath = path.join(process.cwd(), "artifacts", `${wave}_button_coverage.json`);

const plans = listAiRoleMagicButtonCoveragePlans();
const result = validateAiRoleMagicButtonClickContract(plans);
const artifact = {
  wave,
  final_status: result.ok
    ? "GREEN_AI_ROLE_MAGIC_BUTTON_CLICK_COVERAGE_READY"
    : "BLOCKED_AI_ROLE_MAGIC_BUTTON_COVERAGE_INCOMPLETE",
  actions_checked: result.actionsChecked,
  approval_actions_checked: result.approvalActionsChecked,
  plans,
  issues: result.issues,
  provider_called: false,
  db_writes_used: false,
  fake_green_claimed: false,
};

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify(artifact, null, 2));
if (!result.ok) process.exitCode = 1;
