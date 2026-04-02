import {
  RELEASE_CHANGE_CLASSES,
  buildReleaseDecisionSummary,
  normalizeReleaseChangeClass,
} from "../../src/shared/release/releaseInfo";
import { loadReleaseConfigSummary } from "./releaseConfig.shared";

function readArg(name: string): string | null {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

const changeClassValue = readArg("--change-class") ?? "js-ui";
const targetChannel = readArg("--channel") ?? "production";
const jsonMode = process.argv.includes("--json");

const changeClass = normalizeReleaseChangeClass(changeClassValue);
if (!changeClass) {
  console.error(
    `Unknown --change-class "${changeClassValue}". Allowed: ${RELEASE_CHANGE_CLASSES.join(", ")}`,
  );
  process.exit(1);
}

const summary = loadReleaseConfigSummary();
const decisionSummary = buildReleaseDecisionSummary({
  changeClass,
  targetChannel,
  configWarnings: summary.risks,
});

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        config: summary,
        decision: decisionSummary,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`Target channel: ${decisionSummary.targetChannel}`);
  console.log(`Expected branch: ${decisionSummary.expectedBranch}`);
  console.log(`Change class: ${decisionSummary.decision.changeClass}`);
  console.log(`Delivery: ${decisionSummary.decision.delivery}`);
  console.log(`Reason: ${decisionSummary.decision.reason}`);
  console.log("Examples:");
  for (const example of decisionSummary.decision.examples) {
    console.log(`- ${example}`);
  }

  if (decisionSummary.configWarnings.length > 0) {
    console.log("");
    console.log("Config warnings:");
    for (const warning of decisionSummary.configWarnings) {
      console.log(`- ${warning}`);
    }
  }
}
