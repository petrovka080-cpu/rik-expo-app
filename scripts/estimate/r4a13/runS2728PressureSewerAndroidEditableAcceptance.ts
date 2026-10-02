import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { dumpUi, nodeHasId, seekNode, tapNode, waitForSnapshot, type UiSnapshot } from "../../e2e/r4A6AndroidAcceptedUiRuntime";
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
  "request-estimate-items-editor", "request-estimate-row-batch-apply",
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
async function measureWarmPanelOpens(revisionId: string, expectedLength: string) {
  // The caller must name the saved revision and its actual primary value.
  // Never silently measure an earlier fixture after a manual/primary/reset cycle.
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u.test(revisionId)
    || !/^\d+(?:\.\d+)?$/u.test(expectedLength)
    || !Number.isFinite(Number(expectedLength)) || Number(expectedLength) <= 0) {
    throw new Error("S2728_CURRENT_REVISION_AND_LENGTH_REQUIRED");
  }
  const identity = JSON.parse(readFileSync(resolve(".release-runtime/r568/runtime/whole-app-developer-current/backend.json"), "utf8"));
  const auditPath = resolve(`.release-runtime/r568/runtime/whole-app-developer-current/runtime/backend-${String(identity.compatibility_tuple.sourceTree).slice(0, 12)}/request-audit.jsonl`);
  const auditRows = () => readFileSync(auditPath, "utf8").trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line) as {method: string; path: string});
  const memory = () => execFileSync(adb, ["-s", device, "shell", "dumpsys", "meminfo", "com.azisbek_dzhantaev.rikexpoapp"], {encoding: "utf8", timeout: 20_000, windowsHide: true})
    .split(/\r?\n/u).filter(line => /TOTAL PSS:|TOTAL RSS:|TOTAL SWAP PSS:|Java Heap:|Native Heap:/u.test(line)).map(line => line.trim());
  // Revision and toggle need not fit into the same native viewport.
  const revision = await seekNode(adb, device, n => n.resourceId.includes(`--revision-${revisionId}--`), 90, "coarse");
  if (!revision.node) throw new Error("S2728_OWNED_CURRENT_REVISION_NOT_VISIBLE");
  const before = await seekNode(adb, device, n => nodeHasId(n, "request-estimate-parameters-toggle") && n.enabled, 90, "coarse");
  if (!before.node) throw new Error("S2728_CURRENT_PARAMETER_TOGGLE_NOT_VISIBLE");
  if (before.snapshot.nodes.some(n => n.resourceId === "editable-param-batch-dirty-count"
    || n.resourceId === "request-estimate-row-batch-bar")) throw new Error("S2728_UNSAVED_INPUT_DO_NOT_TOGGLE");
  if (before.node.contentDesc.includes("Скрыть")) {
    tapNode(adb, device, before.node);
    const closed = dumpUi(adb, device);
    if (closed.nodes.some(n => n.resourceId === "request-estimate-parameter-panel")) throw new Error("S2728_PANEL_NOT_CLOSED");
  }
  const auditStart = auditRows().length;
  const memoryBefore = memory();
  const memorySamples = [{ completedOpens: 0, observedAt: new Date().toISOString(), lines: memoryBefore }];
  const durationsMs: number[] = [];
  for (let index = 0; index < 20; index += 1) {
    const closed = dumpUi(adb, device);
    const toggle = closed.nodes.find(n => n.resourceId === "request-estimate-parameters-toggle" && n.enabled);
    if (!toggle || toggle.contentDesc.includes("Скрыть")) throw new Error("S2728_CLOSED_TOGGLE_NOT_OBSERVED");
    const startedAt = Date.now();
    if (!tapNode(adb, device, toggle)) throw new Error("S2728_PANEL_OPEN_TAP_FAILED");
    const isInteractive = (snapshot: UiSnapshot) => snapshot.nodes.some(n => n.resourceId === "request-estimate-parameter-panel")
      && snapshot.nodes.some(n => n.resourceId === "editable-param-popover-input" && n.contentDesc === "Проектная длина напорного канализационного трубопровода" && n.text === expectedLength && n.enabled);
    const opened = await waitForSnapshot(adb, device, isInteractive, 10_000);
    if (!isInteractive(opened)) throw new Error("S2728_CURRENT_INPUT_NOT_INTERACTIVE");
    durationsMs.push(Date.now() - startedAt);
    const openToggle = opened.nodes.find(n => n.resourceId === "request-estimate-parameters-toggle" && n.enabled);
    if (!openToggle || !tapNode(adb, device, openToggle)) throw new Error("S2728_PANEL_CLOSE_TAP_FAILED");
    // Sampling is outside the measured opening interval. This is a sampled
    // high-water mark, not a claim to have observed every transient allocation.
    memorySamples.push({ completedOpens: index + 1, observedAt: new Date().toISOString(), lines: memory() });
    if ((index + 1) % 5 === 0) process.stdout.write(`${JSON.stringify({warmPanelMeasurements: index + 1, latestMs: durationsMs.at(-1)})}\n`);
  }
  const ordered = [...durationsMs].sort((a, b) => a - b);
  const p50Ms = ordered[Math.ceil(ordered.length * 0.5) - 1];
  const p95Ms = ordered[Math.ceil(ordered.length * 0.95) - 1];
  const requests = auditRows().slice(auditStart);
  const pssKiB = memorySamples.flatMap(sample => sample.lines.flatMap(line => {
    const match = /TOTAL PSS:\s+(\d+)/u.exec(line);
    return match ? [Number(match[1])] : [];
  }));
  capture(`warm-panel-measurements-${Date.now()}`, dumpUi(adb, device), {
    revisionId, expectedLength, operation: "open already-loaded current-revision parameter panel",
    method: "ADB tap to UIAutomator observing parameter panel and editable current length; includes automation overhead; excludes locator/close time",
    measurementScope: "20 warm opens and sampled memory only, not cold reopen, first-action frame or continuous peak-memory acceptance",
    durationsMs, p50Ms, p95Ms, maxMs: ordered.at(-1), budgetMs: 3_000,
    warmPanelBudgetMet: p95Ms <= 3_000,
    parameterSessionRequestCount: requests.filter(row => row.path.includes("/parameter-session")).length,
    calculationMutationRequestCount: requests.filter(row => row.method === "POST" && /\/jobs\/(?:compile|recalculate)/u.test(row.path)).length,
    memoryBefore, memoryAfter: memory(), memorySamples,
    sampledPeakPssKiB: pssKiB.length === memorySamples.length ? Math.max(...pssKiB) : null,
    retainedPssDeltaKiB: pssKiB.length === memorySamples.length ? pssKiB.at(-1)! - pssKiB[0] : null,
    memoryScope: "dumpsys meminfo at baseline and after each close; retained delta is not forced-GC/leak/continuous peak acceptance",
  });
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
} else if (command === "--measure-warm-panels" && argument && value) {
  await measureWarmPanelOpens(argument, value);
} else if (command === "--tap" && argument && allowedActions.has(argument)) {
  const found = await seekNode(adb, device, n => nodeHasId(n, argument) && n.enabled, 90, "coarse");
  if (!found.node) throw new Error(`S2728_ACTION_NOT_OBSERVED:${argument}`);
  const startedAt = Date.now();
  if (!tapNode(adb, device, found.node)) throw new Error(`S2728_ACTION_FAILED:${argument}`);
  capture(`tap-${argument}-${startedAt}`, dumpUi(adb, device), { actionId: argument, startedAt, elapsedMs: Date.now() - startedAt });
} else throw new Error("Use --capture STEP | --fill-primary | --field PARAM VALUE | --tap OBSERVED_ID | --measure-warm-panels SAVED_REVISION_ID CURRENT_LENGTH");
}
void main().catch(error => { process.stderr.write(`${String(error)}\n`); process.exitCode = 1; });
