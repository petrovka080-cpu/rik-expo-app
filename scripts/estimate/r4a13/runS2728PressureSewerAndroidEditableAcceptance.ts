import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { dumpUi, nodeHasId, seekNode, tapNode, type UiSnapshot } from "../../e2e/r4A6AndroidAcceptedUiRuntime";
import { PRESSURE_SEWER_PIPELINE_PARAMETERS } from "../../../src/lib/estimate/v4/pressureSewerPipelineR1";

// Drive only the already-created, verification-owned pressure-sewer draft.
// No sign-in, account provisioning, APK installation, data clear or approval.
const device = "emulator-5554";
const adb = resolve(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const output = resolve(".release-runtime/r568/s27-28/android-editable-pressure-sewer");
const fixture: Record<string, string> = {
  psp_pipe_designation: "PE100 SDR17 PN10 DN110",
  psp_pipe_outside_diameter_mm: "110",
  psp_average_trench_depth_m: "1.8",
  psp_fitting_quantity_piece: "4",
  psp_isolation_valve_quantity_piece: "2",
  psp_air_valve_quantity_piece: "1",
  psp_washout_quantity_piece: "1",
};
const allowedActions = new Set([
  "consumer-estimate-open-full-estimate", "request-estimate-parameters-toggle",
  "editable-param-batch-apply", "editable-param-batch-cancel",
  "request-estimate-show-more-parameters", "request-estimate-filled-parameters-toggle",
  "request-estimate-derived-parameters-toggle", "consumer-estimate-make-pdf",
  "consumer-estimate-open-procurement", "request-estimate-technical-details-toggle",
]);
function input(args: string[]) {
  execFileSync(adb, ["-s", device, "shell", "input", ...args], { timeout: 20_000, windowsHide: true });
}
function capture(step: string, snapshot: UiSnapshot, evidence: Record<string, unknown> = {}) {
  if (!snapshot.ok || !snapshot.nodes.some(n => nodeHasId(n, "consumer-repair-screen"))) {
    throw new Error("S2728_REQUEST_SCREEN_NOT_OBSERVED");
  }
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, `${step}.xml`), snapshot.xml);
  const identity = JSON.parse(readFileSync(resolve(".release-runtime/r568/runtime/whole-app-developer-current/backend.json"), "utf8"));
  const receipt = {
    contract: "rik-expo-app.s27-28.android-editable-pressure-sewer.v1",
    capturedAt: new Date().toISOString(), step, device,
    expectedRuntimeTuple: identity.compatibility_tuple,
    sessionScope: "EXISTING_ANDROID_SESSION_ERP_PROFILE_NOT_ORDINARY_CONSUMER_ACCEPTANCE",
    observed: snapshot.nodes.filter(n => n.text || n.contentDesc || n.resourceId),
    ...evidence,
    masterAccepted: false,
  };
  writeFileSync(resolve(output, `${step}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({step, capturedAt: receipt.capturedAt, ...evidence})}\n`);
}
async function replace(parameterId: string, value: string) {
  const parameter = PRESSURE_SEWER_PIPELINE_PARAMETERS.find(p => p.parameter_id === parameterId);
  if (!parameter || !/^[a-zA-Z0-9 .-]+$/u.test(value)) throw new Error("S2728_UNKNOWN_OR_UNSUPPORTED_INPUT");
  const found = await seekNode(adb, device, n => n.resourceId === "editable-param-popover-input" && n.contentDesc === parameter.title_ru, 20, "fine");
  if (!found.node || !tapNode(adb, device, found.node)) throw new Error(`S2728_INPUT_NOT_OBSERVED:${parameterId}`);
  input(["keycombination", "113", "29"]);
  input(["keyevent", "KEYCODE_DEL"]);
  input(["text", value.replace(/ /gu, "%s")]);
  input(["keyevent", "KEYCODE_BACK"]);
  const after = dumpUi(adb, device);
  const field = after.nodes.find(n => n.resourceId === "editable-param-popover-input" && n.contentDesc === parameter.title_ru);
  capture(`field-${parameterId}-${Date.now()}`, after, { parameterId, requestedValue: value, observedValue: field?.text ?? null });
  if (field?.text !== value) throw new Error(`S2728_INPUT_VALUE_NOT_CONFIRMED:${parameterId}`);
}
async function main() {
const [command, argument, value] = process.argv.slice(2);
if (command === "--capture") {
  if (!argument || !/^[a-z0-9-]+$/u.test(argument)) throw new Error("S2728_STEP_NAME_REQUIRED");
  capture(argument, dumpUi(adb, device));
} else if (command === "--fill-primary") {
  capture("before-primary-fixture", dumpUi(adb, device), { fixtureNotUserProjectFacts: true });
  for (const [parameterId, fixtureValue] of Object.entries(fixture)) await replace(parameterId, fixtureValue);
} else if (command === "--field" && argument && value) {
  await replace(argument, value);
} else if (command === "--tap" && argument && allowedActions.has(argument)) {
  const found = await seekNode(adb, device, n => nodeHasId(n, argument) && n.enabled, 25, "fine");
  if (!found.node) throw new Error(`S2728_ACTION_NOT_OBSERVED:${argument}`);
  const startedAt = Date.now();
  if (!tapNode(adb, device, found.node)) throw new Error(`S2728_ACTION_FAILED:${argument}`);
  capture(`tap-${argument}-${startedAt}`, dumpUi(adb, device), { actionId: argument, startedAt, elapsedMs: Date.now() - startedAt });
} else throw new Error("Use --capture STEP | --fill-primary | --field PARAM VALUE | --tap OBSERVED_ID");
}
void main().catch(error => { process.stderr.write(`${String(error)}\n`); process.exitCode = 1; });
