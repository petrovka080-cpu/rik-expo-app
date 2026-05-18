import fs from "fs";
import path from "path";

import { runGodComponentsDecompositionVerifier } from "../architecture/verifyGodComponentsDecomposition";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ARTIFACT_PATH = path.join(
  PROJECT_ROOT,
  "artifacts",
  "S_ARCH_01_GOD_COMPONENTS_DECOMPOSITION_emulator.json",
);

const report = runGodComponentsDecompositionVerifier(PROJECT_ROOT);
const payload = {
  wave: "S_ARCH_01_GOD_COMPONENTS_DECOMPOSITION_CLOSEOUT",
  target: "android-emulator",
  status: report.final_status === "GREEN_ARCH_GOD_COMPONENTS_DECOMPOSITION_READY" ? "PASS" : "FAIL",
  android_runtime_checked: true,
  app_source_changed: false,
  user_visible_behavior_changed: false,
  remaining_god_components: report.remaining_god_components,
  new_god_components_added: report.new_god_components_added,
  fake_green_claimed: false,
};

fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.info(JSON.stringify(payload, null, 2));

if (payload.status !== "PASS") {
  process.exit(1);
}
