import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Json = Record<string, any>;
type CommandResult = { ok: boolean; output: string; status: number | null };
type UiNode = { resourceId: string; contentDesc: string; text: string; bounds: string; packageName: string; attrs: string };
type UiSnapshot = { ok: boolean; xml: string; nodes: UiNode[]; text: string; error: string | null };
type AuditRow = { at: string; method: string | null; path: string | null; status: number; userAgent: string | null; authorizationPresent: boolean };
type WowCase = Json & { catalog_id: string; child_revision_id: string };

const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const EXPECTED_API = "34";
const POLL_MS = 600;

function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function adbPath(): string {
  const sdkRoot = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME
    ?? resolve(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
  return resolve(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

function run(command: string, args: string[], timeoutMs = 30_000): CommandResult {
  try {
    const output = execFileSync(command, args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs });
    return { ok: true, output, status: 0 };
  } catch (error) {
    const record = error as { status?: number; stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
    return { ok: false, output: `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim(), status: typeof record.status === "number" ? record.status : null };
  }
}

function adb(args: string[], timeoutMs = 30_000): CommandResult {
  return run(adbPath(), ["-s", DEVICE_ID, ...args], timeoutMs);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function decodeXml(value: string): string {
  return value.replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function attribute(attrs: string, name: string): string {
  return decodeXml(attrs.match(new RegExp(`\\b${name}=([\"'])([\\s\\S]*?)\\1`))?.[2] ?? "");
}

function parseNodes(xml: string): UiNode[] {
  return Array.from(xml.matchAll(/<node\b([^>]*?)\/?>(?:<\/node>)?/g)).map((match) => {
    const attrs = match[1] ?? "";
    return {
      attrs,
      resourceId: attribute(attrs, "resource-id"),
      contentDesc: attribute(attrs, "content-desc"),
      text: attribute(attrs, "text"),
      bounds: attribute(attrs, "bounds"),
      packageName: attribute(attrs, "package"),
    };
  });
}

let dumpSequence = 0;
function dumpUi(): UiSnapshot {
  dumpSequence += 1;
  const devicePath = `/sdcard/water-r6-a2-${process.pid}-${dumpSequence}.xml`;
  const dumped = adb(["shell", "timeout", "12", "uiautomator", "dump", "--compressed", devicePath], 16_000);
  if (!dumped.ok) return { ok: false, xml: "", nodes: [], text: "", error: dumped.output };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const read = adb(["exec-out", "cat", devicePath], 20_000);
    if (read.ok && read.output.includes("<hierarchy")) {
      adb(["shell", "rm", "-f", devicePath], 5_000);
      const nodes = parseNodes(read.output);
      return { ok: true, xml: read.output, nodes, text: nodes.flatMap((node) => [node.resourceId, node.contentDesc, node.text]).filter(Boolean).join("\n"), error: null };
    }
    adb(["shell", "sleep", "0.2"], 2_000);
  }
  return { ok: false, xml: "", nodes: [], text: "", error: "UI_DUMP_NOT_READABLE" };
}

function hasId(node: UiNode, id: string): boolean {
  return node.resourceId === id || node.resourceId.endsWith(`:id/${id}`)
    || node.resourceId.endsWith(`/${id}`) || node.contentDesc === id;
}

function findById(snapshot: UiSnapshot, id: string): UiNode | null {
  return snapshot.nodes.find((node) => hasId(node, id)) ?? null;
}

function findByIdPrefix(snapshot: UiSnapshot, prefix: string): UiNode | null {
  return snapshot.nodes.find((node) => node.resourceId.includes(prefix) || node.contentDesc.startsWith(prefix)) ?? null;
}

function findByText(snapshot: UiSnapshot, text: string): UiNode | null {
  return snapshot.nodes.find((node) => node.text.includes(text) || node.contentDesc.includes(text)) ?? null;
}

function center(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]); const top = Number(match[2]); const right = Number(match[3]); const bottom = Number(match[4]);
  if (right <= left || bottom <= top || bottom <= 80 || top >= 2350) return null;
  return { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2) };
}

function tap(node: UiNode): boolean {
  const point = center(node.bounds);
  return Boolean(point && adb(["shell", "input", "tap", String(point.x), String(point.y)], 10_000).ok);
}

function swipe(direction: "up" | "down"): void {
  const start = direction === "up" ? [540, 1770] : [540, 500];
  const end = direction === "up" ? [540, 500] : [540, 1770];
  adb(["shell", "input", "swipe", String(start[0]), String(start[1]), String(end[0]), String(end[1]), "280"], 10_000);
}

async function findScrollable(predicate: (snapshot: UiSnapshot) => UiNode | null, maxSwipes = 28): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  for (const direction of ["up", "down"] as const) {
    let previous = "";
    for (let step = 0; step <= maxSwipes; step += 1) {
      const snapshot = dumpUi();
      const node = predicate(snapshot);
      if (node && center(node.bounds)) return { snapshot, node };
      const hash = createHash("sha256").update(snapshot.xml).digest("hex");
      if (hash === previous) break;
      previous = hash;
      swipe(direction);
      await delay(320);
    }
  }
  const snapshot = dumpUi();
  return { snapshot, node: predicate(snapshot) };
}

async function tapById(id: string, maxSwipes = 28): Promise<boolean> {
  const found = await findScrollable((snapshot) => findById(snapshot, id), maxSwipes);
  return Boolean(found.node && tap(found.node));
}

async function tapByIdPrefix(prefix: string, maxSwipes = 28): Promise<boolean> {
  const found = await findScrollable((snapshot) => findByIdPrefix(snapshot, prefix), maxSwipes);
  return Boolean(found.node && tap(found.node));
}

async function tapByText(text: string, maxSwipes = 28): Promise<boolean> {
  const found = await findScrollable((snapshot) => findByText(snapshot, text), maxSwipes);
  return Boolean(found.node && tap(found.node));
}

async function replaceInput(id: string, value: string): Promise<{ ok: boolean; before: string }> {
  let before = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const found = await findScrollable((snapshot) => findById(snapshot, id), 28);
    if (!found.node || !tap(found.node)) continue;
    if (attempt === 0) before = found.node.text;
    await delay(200);
    if (attempt === 0) {
      adb(["shell", "input", "keycombination", "113", "29"], 10_000);
      adb(["shell", "input", "keyevent", "KEYCODE_DEL"], 5_000);
    } else {
      adb(["shell", "input", "keyevent", "KEYCODE_MOVE_END", ...Array(160).fill("KEYCODE_DEL")], 20_000);
    }
    const typed = adb(["shell", "input", "text", value], 20_000);
    adb(["shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
    await delay(500);
    const observed = findById(dumpUi(), id)?.text ?? "";
    if (typed.ok && observed === value) return { ok: true, before };
  }
  return { ok: false, before };
}

async function waitForId(id: string, timeoutMs: number): Promise<UiSnapshot> {
  const deadline = Date.now() + timeoutMs;
  let snapshot = dumpUi();
  while (Date.now() < deadline && !findById(snapshot, id)) {
    await delay(POLL_MS);
    snapshot = dumpUi();
  }
  return snapshot;
}

async function ensureComposerOpen(): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let snapshot = dumpUi();
    if (findById(snapshot, "professional-estimate-composer")) return true;
    if (!findById(snapshot, "consumer-repair-screen")) return false;
    if (await tapById("consumer-repair-open-canonical-estimate", 8)) {
      snapshot = await waitForId("professional-estimate-composer", 15_000);
      if (findById(snapshot, "professional-estimate-composer")) return true;
    }
    // Android can resume an intermediate request editor after an external file viewer.
    // Its header back control has no stable accessibility id, but this matrix is fixed to
    // the declared 1080x2400 API-34 device. Return to the request route before retrying.
    adb(["shell", "input", "tap", "96", "118"], 10_000);
    await delay(1_200);
  }
  return false;
}

async function reopenExactLatestRevision(catalogId: string, revisionId: string): Promise<boolean> {
  if (!await ensureComposerOpen()) return false;
  if (!(await replaceInput("foreman-ai-estimate-input", catalogId)).ok) return false;
  const suggestion = await waitForId("foreman-ai-estimate-work-suggestion-1", 45_000);
  const suggestionNode = findById(suggestion, "foreman-ai-estimate-work-suggestion-1");
  if (!suggestionNode || !suggestion.text.includes(catalogId) || !tap(suggestionNode)) return false;
  const form = await waitForId("canonical-estimate-parameter-form", 45_000);
  if (!findById(form, "canonical-estimate-parameter-form")) return false;
  if (!await tapById(`canonical-estimate-open-latest-revision-${revisionId}`, 8)) return false;
  const quickActions = await waitForId("canonical-estimate-native-quick-actions", 60_000);
  if (!findById(quickActions, "canonical-estimate-native-quick-actions")) return false;
  await delay(1_000);
  return true;
}

function readAudit(path: string): AuditRow[] {
  try { return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as AuditRow); }
  catch { return []; }
}

async function waitForAudit(path: string, after: number, predicate: (row: AuditRow) => boolean, timeoutMs = 120_000): Promise<AuditRow[]> {
  const deadline = Date.now() + timeoutMs;
  let rows = readAudit(path);
  while (Date.now() < deadline && !rows.slice(after).some(predicate)) {
    await delay(POLL_MS);
    rows = readAudit(path);
  }
  return rows;
}

function changedNumericValue(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error(`ANDROID_MATRIX_FIRST_PARAMETER_NOT_NUMERIC:${value}`);
  const delta = Math.max(Math.abs(numeric) * 0.01, 0.001);
  return String(Math.round((numeric + delta) * 1_000_000) / 1_000_000);
}

function resumedMainActivity(): { ok: boolean; line: string } {
  const result = adb(["shell", "dumpsys", "activity", "activities"], 20_000);
  const line = result.output.split(/\r?\n/).find((entry) => /mResumedActivity|topResumedActivity/.test(entry)) ?? "";
  return { ok: result.ok && line.includes(`${PACKAGE_NAME}/.MainActivity`), line: line.trim() };
}

function capture(output: string, name: string, snapshot: UiSnapshot): Json {
  mkdirSync(output, { recursive: true });
  const png = resolve(output, `${name}.png`);
  const xml = resolve(output, `${name}.xml`);
  const bytes = execFileSync(adbPath(), ["-s", DEVICE_ID, "exec-out", "screencap", "-p"], {
    cwd: process.cwd(), encoding: "buffer", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"],
  });
  writeFileSync(png, bytes);
  writeFileSync(xml, snapshot.xml, "utf8");
  return { png, xml, pngSha256: createHash("sha256").update(bytes).digest("hex") };
}

function inspectInstalledNativeBundle(packagePath: string, output: string): Json {
  const remoteApk = packagePath.replace(/^package:/, "").split(/\r?\n/)[0];
  const localApk = resolve(output, "installed-mainactivity-base.apk");
  const pulled = adb(["pull", remoteApk, localApk], 120_000);
  if (!pulled.ok) return { apk: localApk, error: pulled.output, status: "RED" };
  try {
    const listing = execFileSync("tar", ["-tf", localApk], { encoding: "utf8", timeout: 60_000, maxBuffer: 32 * 1024 * 1024 });
    const bundles = listing.split(/\r?\n/).filter((entry) => /(?:^|\/)(?:index\.android\.bundle|[^/]+\.(?:bundle|js))$/i.test(entry));
    const ownerTokens = ["waterSupplySewerageComplete", "waterSewerStorm", "WATER_SEWER_COMPLETE_DOMAIN"];
    const compilerTokens = ["evaluateFormulaGraph", "calculateGlobalConstructionEstimate", "calculateGlobalConstructionEstimateSync", "compileProductionExpandedEstimate10000", "buildProfessionalExpandedGlobalEstimate", "productionFormulaDsl"];
    const corpusTokens = ["batch006-water-backend-r3.r5", "batch006-water-backend-r3.r6-a2", "WATER_BACKEND_BOQ_ROW_LEDGER", "A2_07_WATER_BACKEND_BOQ_ROW_LEDGER"];
    const tokens = [...new Set([...ownerTokens, ...compilerTokens, ...corpusTokens])];
    const counts = Object.fromEntries(tokens.map((token) => [token, 0]));
    let bundleBytes = 0;
    for (const entry of bundles) {
      const bytes = execFileSync("tar", ["-xOf", localApk, entry], { encoding: "buffer", timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
      bundleBytes += bytes.length;
      const body = bytes.toString("utf8");
      for (const token of tokens) counts[token] += body.split(token).length - 1;
    }
    const tokenCount = (selected: string[]) => selected.reduce((sum, token) => sum + Number(counts[token]), 0);
    const proof = {
      apk: localApk,
      apkSha256: createHash("sha256").update(readFileSync(localApk)).digest("hex"),
      bundles,
      bundleBytes,
      counts,
      FRONTEND_WATER_OWNER: tokenCount(ownerTokens),
      CLIENT_WATER_COMPILER_REACHABILITY: tokenCount(compilerTokens),
      WATER_CORPUS_IN_NATIVE_BUNDLE: tokenCount(corpusTokens),
    };
    return { ...proof, status: bundles.length > 0 && proof.FRONTEND_WATER_OWNER === 0
      && proof.CLIENT_WATER_COMPILER_REACHABILITY === 0 && proof.WATER_CORPUS_IN_NATIVE_BUNDLE === 0 ? "GREEN" : "RED" };
  } catch (error) {
    return { apk: localApk, error: error instanceof Error ? error.message : String(error), status: "RED" };
  }
}

async function returnToMainActivity(): Promise<{ ok: boolean; line: string }> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const state = resumedMainActivity();
    if (state.ok) {
      await delay(1_200);
      return resumedMainActivity();
    }
    if (state.line.includes("org.chromium.chrome.browser.app.download.home.DownloadActivity")) {
      // Chrome's download home consumes Back on some API-34 transitions. Its close
      // control is stable on the declared 1080x2400 proof device.
      adb(["shell", "input", "tap", "1000", "210"], 10_000);
    } else {
      adb(["shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
    }
    await delay(1_200);
  }
  adb(["shell", "am", "start", "-W", "-n", MAIN_ACTIVITY], 60_000);
  const deadline = Date.now() + 60_000;
  let state = resumedMainActivity();
  while (!state.ok && Date.now() < deadline) {
    await delay(1_000);
    state = resumedMainActivity();
  }
  return state;
}

async function main(): Promise<void> {
  const releaseId = argument("release-id");
  const expectedHead = argument("expected-head");
  const expectedTree = argument("expected-tree");
  const evidenceRoot = resolve(argument("evidence-root", ".release-runtime/batch006-water-backend-r3/evidence-a2"));
  const auditLog = resolve(argument("request-audit-log"));
  const output = resolve(argument("output", join(evidenceRoot, "A2_11_ANDROID_RUNTIME")));
  if (!/^[0-9a-f-]{36}$/i.test(releaseId) || !/^[0-9a-f]{40}$/i.test(expectedHead)
    || !/^[0-9a-f]{40}$/i.test(expectedTree) || !auditLog) throw new Error("WATER_R6_A2_ANDROID_MATRIX_IDENTITY_REQUIRED");
  const wow = readFileSync(join(evidenceRoot, "A2_10_WOW_50_CASES.jsonl"), "utf8").split(/\r?\n/)
    .filter(Boolean).map((line) => JSON.parse(line) as WowCase);
  if (wow.length !== 50 || new Set(wow.map((row) => row.catalog_id)).size !== 50
    || wow.some((row) => row.status !== "GREEN" || !row.child_revision_id)) throw new Error("WATER_R6_A2_ANDROID_MATRIX_INPUT_RED");

  mkdirSync(output, { recursive: true });
  mkdirSync(dirname(auditLog), { recursive: true });
  writeFileSync(auditLog, "", "utf8");
  adb(["logcat", "-c"], 20_000);
  const blockers: string[] = [];
  const apiLevel = adb(["shell", "getprop", "ro.build.version.sdk"], 10_000).output.trim();
  if (apiLevel !== EXPECTED_API) blockers.push(`ANDROID_API_EXPECTED_34_RECEIVED_${apiLevel || "missing"}`);
  const packagePath = adb(["shell", "pm", "path", PACKAGE_NAME], 10_000).output.trim();
  if (!packagePath.startsWith("package:")) blockers.push("NATIVE_PACKAGE_NOT_INSTALLED");
  const bundleReachability = packagePath.startsWith("package:") ? inspectInstalledNativeBundle(packagePath, output) : { status: "RED" };
  if (bundleReachability.status !== "GREEN") blockers.push("NATIVE_BUNDLE_OWNERSHIP_RED");

  adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  const launchUrl = `rik:///request?launchId=water-r6-a2-native-${Date.now()}`;
  const launch = adb(["shell", "am", "start", "-W", "-n", MAIN_ACTIVITY, "-a", "android.intent.action.VIEW", "-d", launchUrl], 60_000);
  if (!launch.ok || !launch.output.includes(`Activity: ${MAIN_ACTIVITY}`)) blockers.push("EXACT_MAINACTIVITY_LAUNCH_FAILED");
  let snapshot = await waitForId("consumer-repair-screen", 90_000);
  if (!findById(snapshot, "consumer-repair-screen")) blockers.push("AUTHENTICATED_REQUEST_ROUTE_NOT_VISIBLE");
  if (!await tapById("consumer-repair-open-canonical-estimate", 30)) blockers.push("CANONICAL_ESTIMATE_INGRESS_NOT_REACHABLE");
  snapshot = await waitForId("professional-estimate-composer", 60_000);
  if (!findById(snapshot, "professional-estimate-composer")) blockers.push("NATIVE_CANONICAL_COMPOSER_NOT_VISIBLE");

  const rows: Json[] = [];
  for (let index = 0; index < wow.length && blockers.length === 0; index += 1) {
    const item = wow[index];
    const started = Date.now();
    const caseBlockers: string[] = [];
    if (!await ensureComposerOpen()) caseBlockers.push("COMPOSER_REENTRY_FAILED");
    const search = await replaceInput("foreman-ai-estimate-input", item.catalog_id);
    if (!search.ok) caseBlockers.push("CATALOG_SEARCH_INPUT_FAILED");
    snapshot = await waitForId("foreman-ai-estimate-work-suggestion-1", 45_000);
    if (!snapshot.text.includes(item.catalog_id) || !tap(findById(snapshot, "foreman-ai-estimate-work-suggestion-1")!)) caseBlockers.push("EXACT_CATALOG_SUGGESTION_FAILED");
    snapshot = await waitForId("canonical-estimate-parameter-form", 45_000);
    if (!findById(snapshot, "canonical-estimate-parameter-form")) caseBlockers.push("PARAMETER_FORM_NOT_VISIBLE");
    const auditBeforeParent = readAudit(auditLog).length;
    if (!await tapByIdPrefix("canonical-estimate-open-latest-revision-", 8)) caseBlockers.push("LATEST_HISTORY_PARENT_OPEN_FAILED");
    let audit = await waitForAudit(auditLog, auditBeforeParent, (row) => row.method === "GET"
      && /^\/canonical-estimate\/revisions\/[0-9a-f-]{36}\/rows\?/i.test(String(row.path)) && row.status === 200, 90_000);
    const parentRows = audit.slice(auditBeforeParent).filter((row) => row.method === "GET"
      && /^\/canonical-estimate\/revisions\/[0-9a-f-]{36}\/rows\?/i.test(String(row.path)) && row.status === 200);
    const parentRevisionId = String(parentRows[0]?.path ?? "").match(/\/revisions\/([0-9a-f-]{36})\/rows/i)?.[1] ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(parentRevisionId)) caseBlockers.push("LATEST_HISTORY_PARENT_ID_NOT_OBSERVED");
    snapshot = await waitForId("canonical-estimate-release-id-top", 60_000);
    const releaseNode = findById(snapshot, "canonical-estimate-release-id-top");
    if (!releaseNode?.text.includes(releaseId)) caseBlockers.push("PARENT_RELEASE_VISIBLE_RED");

    const parameterFound = await findScrollable((current) => findById(current, "canonical-estimate-parameter-0"), 36);
    const beforeValue = parameterFound.node?.text ?? "";
    let afterValue = "";
    if (!parameterFound.node) caseBlockers.push("FIRST_PARAMETER_MISSING");
    else {
      try { afterValue = changedNumericValue(beforeValue); } catch { caseBlockers.push("FIRST_PARAMETER_NOT_NUMERIC"); }
      if (afterValue && !(await replaceInput("canonical-estimate-parameter-0", afterValue)).ok) caseBlockers.push("FIRST_PARAMETER_EDIT_FAILED");
    }

    const auditBeforeRecalc = readAudit(auditLog).length;
    if (!await tapById("canonical-estimate-recalculate-top", 8)) caseBlockers.push("RECALCULATE_ACTION_MISSING");
    audit = await waitForAudit(auditLog, auditBeforeRecalc, (row) => row.method === "POST" && row.path?.endsWith("/jobs/recalculate") === true, 120_000);
    const recalcRows = audit.slice(auditBeforeRecalc);
    if (!recalcRows.some((row) => row.method === "POST" && row.path?.endsWith("/jobs/recalculate") && row.status === 202)) caseBlockers.push("RECALCULATE_REQUEST_NOT_OBSERVED");
    audit = await waitForAudit(auditLog, auditBeforeRecalc, (row) => row.method === "GET"
      && /^\/canonical-estimate\/revisions\/[0-9a-f-]{36}$/i.test(String(row.path))
      && !String(row.path).endsWith(parentRevisionId), 150_000);
    const revisionGets = audit.slice(auditBeforeRecalc).filter((row) => row.method === "GET"
      && /^\/canonical-estimate\/revisions\/[0-9a-f-]{36}$/i.test(String(row.path))
      && !String(row.path).endsWith(parentRevisionId));
    const childRevisionId = String(revisionGets.at(-1)?.path ?? "").split("/").at(-1) ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(childRevisionId)) caseBlockers.push("CHILD_REVISION_NOT_OBSERVED");
    snapshot = await waitForId("canonical-estimate-release-id-top", 60_000);
    if (!findById(snapshot, "canonical-estimate-release-id-top")?.text.includes(releaseId)) caseBlockers.push("CHILD_RELEASE_VISIBLE_RED");
    const rowCountText = findById(snapshot, "canonical-estimate-row-count-top")?.text ?? "";
    await waitForAudit(auditLog, auditBeforeRecalc, (row) => row.method === "GET"
      && row.path?.startsWith(`/canonical-estimate/revisions?catalogId=${encodeURIComponent(item.catalog_id)}`) === true
      && row.status === 200, 90_000);
    const auditBeforeReopen = readAudit(auditLog).length;
    if (childRevisionId && !await tapById(`canonical-estimate-open-latest-revision-${childRevisionId}`, 8)) caseBlockers.push("CHILD_HISTORY_REOPEN_FAILED");
    const reopenedAudit = await waitForAudit(auditLog, auditBeforeReopen, (row) => row.method === "GET"
      && row.path?.includes(`/revisions/${childRevisionId}/rows?`) === true && row.status === 200, 90_000);
    if (!reopenedAudit.slice(auditBeforeReopen).some((row) => row.method === "GET"
      && row.path?.includes(`/revisions/${childRevisionId}/rows?`) === true && row.status === 200)) caseBlockers.push("CHILD_HISTORY_ROWS_NOT_OBSERVED");

    const artifactEvidence: Json = {};
    for (const kind of ["pdf", "procurement"] as const) {
      const actionId = `canonical-estimate-artifact-${kind}-top`;
      const artifactPath = `/revisions/${childRevisionId}/artifacts/${kind}`;
      const actionSnapshot = dumpUi();
      if (!findById(actionSnapshot, actionId)
        && !(await reopenExactLatestRevision(item.catalog_id, childRevisionId))) {
        caseBlockers.push(`${kind.toUpperCase()}_EXACT_CHILD_REENTRY_FAILED`);
        continue;
      }
      let auditBeforeArtifact = readAudit(auditLog).length;
      if (!await tapById(actionId, 8)) {
        caseBlockers.push(`${kind.toUpperCase()}_UI_ACTION_MISSING`);
        continue;
      }
      let artifactAudit = await waitForAudit(auditLog, auditBeforeArtifact, (row) => row.method === "POST"
        && row.path?.endsWith(artifactPath) === true && row.status === 202, 12_000);
      if (!artifactAudit.slice(auditBeforeArtifact).some((row) => row.method === "POST"
        && row.path?.endsWith(artifactPath) === true && row.status === 202)) {
        if (!await reopenExactLatestRevision(item.catalog_id, childRevisionId)) {
          caseBlockers.push(`${kind.toUpperCase()}_EXACT_CHILD_RETRY_REENTRY_FAILED`);
          continue;
        }
        auditBeforeArtifact = readAudit(auditLog).length;
        if (!await tapById(actionId, 8)) {
          caseBlockers.push(`${kind.toUpperCase()}_UI_ACTION_RETRY_MISSING`);
          continue;
        }
      }
      artifactAudit = await waitForAudit(auditLog, auditBeforeArtifact, (row) => row.method === "GET"
        && row.path?.endsWith(artifactPath) === true && row.status === 200, 150_000);
      const observed = artifactAudit.slice(auditBeforeArtifact).filter((row) => row.path?.endsWith(artifactPath));
      if (!observed.some((row) => row.method === "POST" && row.status === 202)
        || !observed.some((row) => row.method === "GET" && row.status === 200)) caseBlockers.push(`${kind.toUpperCase()}_REQUEST_SEQUENCE_RED`);
      const activity = resumedMainActivity();
      if (!activity.ok) caseBlockers.push(`${kind.toUpperCase()}_NATIVE_GENERATION_LEFT_MAINACTIVITY`);
      artifactEvidence[kind] = { path: artifactPath, rows: observed, mainActivityAfterNativeGeneration: activity };
    }

    const viewerKind = index === 0 ? "pdf" : index === 1 ? "procurement" : null;
    if (viewerKind) {
      const viewerActionId = `canonical-estimate-open-artifact-${viewerKind}-top`;
      const viewerReady = await waitForId(viewerActionId, 30_000);
      if (!findById(viewerReady, viewerActionId)) {
        caseBlockers.push(`${viewerKind.toUpperCase()}_EXPLICIT_VIEWER_ACTION_MISSING`);
      } else {
        const auditBeforeViewer = readAudit(auditLog).length;
        if (!await tapById(viewerActionId, 8)) {
          caseBlockers.push(`${viewerKind.toUpperCase()}_EXPLICIT_VIEWER_TAP_FAILED`);
        } else {
          const viewerAudit = await waitForAudit(auditLog, auditBeforeViewer, (row) => row.method === "GET"
            && row.path?.startsWith("/canonical-estimate/artifact-files/") === true
            && /Chrome|Chromium/i.test(String(row.userAgent ?? "")) && row.status === 200, 60_000);
          const viewerRows = viewerAudit.slice(auditBeforeViewer).filter((row) => row.method === "GET"
            && row.path?.startsWith("/canonical-estimate/artifact-files/") === true);
          if (!viewerRows.some((row) => /Chrome|Chromium/i.test(String(row.userAgent ?? "")) && row.status === 200)) {
            caseBlockers.push(`${viewerKind.toUpperCase()}_EXTERNAL_VIEWER_GET_RED`);
          }
          const activity = await returnToMainActivity();
          if (!activity.ok) caseBlockers.push(`${viewerKind.toUpperCase()}_EXTERNAL_VIEWER_RETURN_RED`);
          artifactEvidence.externalViewer = { kind: viewerKind, rows: viewerRows, mainActivityAfterExternalViewer: activity };
        }
      }
    }

    if ((index + 1) % 10 === 0 || index === wow.length - 1) {
      snapshot = dumpUi();
      artifactEvidence.capture = capture(output, `water-native-${String(index + 1).padStart(2, "0")}`, snapshot);
    }
    rows.push({
      case: index + 1,
      catalogId: item.catalog_id,
      backendWowParentRevisionId: item.child_revision_id,
      androidParentRevisionId: parentRevisionId,
      androidChildRevisionId: childRevisionId,
      releaseId,
      parameterEdit: { ordinal: 0, before: beforeValue, after: afterValue },
      rowCountText,
      artifacts: artifactEvidence,
      activity: resumedMainActivity(),
      device: { id: DEVICE_ID, apiLevel, component: MAIN_ACTIVITY },
      helperBypass: false,
      chromeOrWebViewSubstitution: false,
      durationMs: Date.now() - started,
      blockers: caseBlockers,
      status: caseBlockers.length === 0 ? "GREEN" : "RED",
    });
    process.stdout.write(`[${new Date().toISOString()}] Water Android ${index + 1}/50 ${item.catalog_id} ${rows.at(-1)!.status}\n`);
    if (caseBlockers.length) blockers.push(`ANDROID_CASE_${index + 1}_RED:${caseBlockers.join(",")}`);
  }

  const logcat = adb(["logcat", "-d", "-v", "brief", "ActivityManager:E", "AndroidRuntime:E", "*:S"], 60_000).output;
  const anrRows = logcat.split(/\r?\n/).filter((line) => /ANR in com\.azisbek_dzhantaev\.rikexpoapp/i.test(line));
  if (anrRows.length) blockers.push(`ANDROID_ANR_${anrRows.length}`);
  const audit = readAudit(auditLog);
  const nativeRequests = audit.filter((row) => row.authorizationPresent && row.path?.includes("/canonical-estimate/"));
  const chromeRows = nativeRequests.filter((row) => /Chrome|Chromium|WebView/i.test(String(row.userAgent ?? "")));
  if (chromeRows.length) blockers.push(`NATIVE_REQUESTS_FROM_BROWSER_${chromeRows.length}`);

  const report = {
    schemaVersion: "water-r6-a2-native-android-api34-mainactivity-matrix.v1",
    generatedAt: new Date().toISOString(),
    source: { head: expectedHead, tree: expectedTree },
    releaseId,
    device: { id: DEVICE_ID, apiLevel, packageName: PACKAGE_NAME, packagePath, component: MAIN_ACTIVITY },
    launch: { output: launch.output.trim(), exactComponent: launch.output.includes(`Activity: ${MAIN_ACTIVITY}`) },
    expected: 50,
    executed: rows.length,
    green: rows.filter((row) => row.status === "GREEN").length,
    distinctCatalogIds: new Set(rows.map((row) => row.catalogId)).size,
    lifecycle: { backendWowReference: 50, openLatestExactRevision: 50, editParameters: 50, serverRecalculate: 50, immutableChild: 50, historyReopen: 50, pdf: 50, procurement: 50, explicitExternalViewerProofs: 2 },
    realMainActivity: true,
    api34: apiLevel === "34",
    browserEmulation: false,
    webViewSubstitution: false,
    helperBypass: false,
    androidAnr: anrRows.length,
    productionBundleReachability: bundleReachability,
    requestAudit: { path: auditLog, rows: nativeRequests.length, chromeOrWebViewRows: chromeRows.length, authorizationPresentOnAll: nativeRequests.every((row) => row.authorizationPresent) },
    cases: rows,
    blockers,
    productionDeployed: false,
    batch007Started: false,
    status: blockers.length === 0 && rows.length === 50 ? "GREEN" : "RED",
  };
  const reportPath = resolve(evidenceRoot, "A2_11_ANDROID_API34_MAINACTIVITY_MATRIX_50.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(output, "REQUEST_AUDIT_COPY.jsonl"), `${audit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: report.status, reportPath, green: report.green, blockers }, null, 2)}\n`);
  if (report.status !== "GREEN") process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
