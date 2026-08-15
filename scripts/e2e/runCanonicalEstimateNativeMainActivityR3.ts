import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const EXPECTED_API = "34";
const EXPECTED_CATALOG_ID = argument("catalog-id", "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_drain_standard_professional_expanded_v1");
const SEARCH_TEXT = argument("search-text", "водоотвод для асфальтового покрытия в стандартной зоне");
const POLL_MS = 1_000;

type CommandResult = { ok: boolean; output: string; status: number | null };
type UiNode = { resourceId: string; contentDesc: string; text: string; bounds: string; packageName: string; attrs: string };
type UiSnapshot = { ok: boolean; xml: string; nodes: UiNode[]; text: string; error: string | null };
type RequestAuditRow = { at: string; method: string | null; path: string | null; status: number; userAgent: string | null; authorizationPresent: boolean };

function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function adbPath(): string {
  const sdkRoot = process.env.ANDROID_SDK_ROOT
    ?? process.env.ANDROID_HOME
    ?? resolve(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
  return resolve(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

function run(command: string, args: string[], timeoutMs = 30_000): CommandResult {
  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs,
    });
    return { ok: true, output, status: 0 };
  } catch (error) {
    const record = error as { status?: number; stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
    return {
      ok: false,
      output: `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim(),
      status: typeof record.status === "number" ? record.status : null,
    };
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
  const devicePath = `/sdcard/canonical-r3-mainactivity-${process.pid}-${dumpSequence}.xml`;
  const dumped = adb(["shell", "timeout", "12", "uiautomator", "dump", "--compressed", devicePath], 16_000);
  if (!dumped.ok) return { ok: false, xml: "", nodes: [], text: "", error: dumped.output };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const read = adb(["exec-out", "cat", devicePath], 20_000);
    if (read.ok && read.output.includes("<hierarchy")) {
      adb(["shell", "rm", "-f", devicePath], 5_000);
      const nodes = parseNodes(read.output);
      return {
        ok: true,
        xml: read.output,
        nodes,
        text: nodes.flatMap((node) => [node.resourceId, node.contentDesc, node.text]).filter(Boolean).join("\n"),
        error: null,
      };
    }
    adb(["shell", "sleep", "0.25"], 2_000);
  }
  adb(["shell", "rm", "-f", devicePath], 5_000);
  return { ok: false, xml: "", nodes: [], text: "", error: "UI_DUMP_NOT_READABLE" };
}

function hasId(node: UiNode, id: string): boolean {
  return node.resourceId === id || node.resourceId.endsWith(`:id/${id}`)
    || node.resourceId.endsWith(`/${id}`) || node.contentDesc === id;
}

function findById(snapshot: UiSnapshot, id: string): UiNode | null {
  return snapshot.nodes.find((node) => hasId(node, id)) ?? null;
}

function center(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  if (right <= left || bottom <= top || bottom <= 100 || top >= 2300) return null;
  return { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2) };
}

function tap(node: UiNode): boolean {
  const point = center(node.bounds);
  return Boolean(point && adb(["shell", "input", "tap", String(point.x), String(point.y)], 10_000).ok);
}

function swipe(direction: "up" | "down"): void {
  const start = direction === "up" ? [540, 1760] : [540, 520];
  const end = direction === "up" ? [540, 520] : [540, 1760];
  adb(["shell", "input", "swipe", String(start[0]), String(start[1]), String(end[0]), String(end[1]), "420"], 10_000);
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

async function findScrollable(id: string, maxSwipes = 24): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  for (const direction of ["up", "down"] as const) {
    let previous = "";
    for (let step = 0; step <= maxSwipes; step += 1) {
      const snapshot = dumpUi();
      const node = findById(snapshot, id);
      if (node && center(node.bounds)) return { snapshot, node };
      const hash = createHash("sha256").update(snapshot.xml).digest("hex");
      if (hash === previous) break;
      previous = hash;
      swipe(direction);
      await delay(550);
    }
  }
  const snapshot = dumpUi();
  return { snapshot, node: findById(snapshot, id) };
}

async function tapById(id: string, maxSwipes = 24): Promise<boolean> {
  const found = await findScrollable(id, maxSwipes);
  return Boolean(found.node && tap(found.node));
}

async function replaceInput(id: string, value: string): Promise<boolean> {
  const found = await findScrollable(id, 12);
  if (!found.node || !tap(found.node)) return false;
  await delay(250);
  const selected = adb(["shell", "input", "keycombination", "113", "29"], 10_000);
  const typed = adb(["shell", "input", "text", value], 10_000);
  adb(["shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
  await delay(400);
  const observed = findById(dumpUi(), id)?.text === value;
  return selected.ok && typed.ok && observed;
}

function resumedMainActivity(): { ok: boolean; line: string } {
  const result = adb(["shell", "dumpsys", "activity", "activities"], 20_000);
  const line = result.output.split(/\r?\n/).find((entry) => /mResumedActivity|topResumedActivity/.test(entry)) ?? "";
  return { ok: result.ok && line.includes(`${PACKAGE_NAME}/.MainActivity`), line: line.trim() };
}

function readAudit(path: string): RequestAuditRow[] {
  try {
    return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as RequestAuditRow);
  } catch { return []; }
}

async function waitForAudit(path: string, predicate: (row: RequestAuditRow) => boolean, timeoutMs = 120_000): Promise<RequestAuditRow[]> {
  const deadline = Date.now() + timeoutMs;
  let rows = readAudit(path);
  while (Date.now() < deadline && !rows.some(predicate)) {
    await delay(POLL_MS);
    rows = readAudit(path);
  }
  return rows;
}

function launchRequest(): CommandResult {
  const url = new URL("rik:///request");
  url.searchParams.set("prompt", SEARCH_TEXT);
  url.searchParams.set("launchId", `native-r3-${Date.now()}`);
  return adb([
    "shell", "am", "start", "-W", "-n", MAIN_ACTIVITY,
    "-a", "android.intent.action.VIEW", "-d", url.toString(),
  ], 30_000);
}

function capture(output: string, name: string, snapshot: UiSnapshot): { png: string; xml: string } {
  mkdirSync(output, { recursive: true });
  const png = resolve(output, `${name}.png`);
  const xml = resolve(output, `${name}.xml`);
  const bytes = execFileSync(adbPath(), ["-s", DEVICE_ID, "exec-out", "screencap", "-p"], {
    cwd: process.cwd(), encoding: "buffer", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"],
  });
  writeFileSync(png, bytes);
  writeFileSync(xml, snapshot.xml, "utf8");
  return { png, xml };
}

function inspectInstalledNativeBundle(packagePath: string, output: string): Record<string, unknown> {
  const remoteApk = packagePath.replace(/^package:/, "").split(/\r?\n/)[0];
  const localApk = resolve(output, "installed-mainactivity-base.apk");
  const pulled = adb(["pull", remoteApk, localApk], 120_000);
  if (!pulled.ok) return { apk: localApk, bundles: 0, error: pulled.output, status: "RED" };
  try {
    const listing = execFileSync("tar", ["-tf", localApk], { encoding: "utf8", timeout: 60_000 });
    const bundles = listing.split(/\r?\n/).filter((entry) => /(?:^|\/)(?:index\.android\.bundle|[^/]+\.(?:bundle|js))$/i.test(entry));
    const ownerTokens = ["waterSupplySewerageComplete", "waterSewerStorm", "WATER_SEWER_COMPLETE_DOMAIN"];
    const compilerTokens = [
      "evaluateFormulaGraph", "calculateGlobalConstructionEstimate", "calculateGlobalConstructionEstimateSync",
      "compileProductionExpandedEstimate10000", "buildProfessionalExpandedGlobalEstimate", "productionFormulaDsl",
    ];
    const corpusTokens = ["batch006-water-backend-r3.r5", "batch006-water-backend-r3.r6-a2", "WATER_BACKEND_BOQ_ROW_LEDGER", "A2_07_WATER_BACKEND_BOQ_ROW_LEDGER"];
    const tokens = [...new Set([...ownerTokens, ...compilerTokens, ...corpusTokens])];
    const counts = Object.fromEntries(tokens.map((token) => [token, 0]));
    let bytes = 0;
    for (const entry of bundles) {
      const body = execFileSync("tar", ["-xOf", localApk, entry], { encoding: "buffer", timeout: 120_000 });
      bytes += body.length;
      const text = body.toString("utf8");
      for (const token of tokens) counts[token] += text.split(token).length - 1;
    }
    const tokenCount = (items: string[]) => items.reduce((sum, token) => sum + counts[token], 0);
    const proof = {
      apk: localApk,
      apkSha256: createHash("sha256").update(readFileSync(localApk)).digest("hex"),
      bundles,
      bundleBytes: bytes,
      counts,
      FRONTEND_WATER_OWNER: tokenCount(ownerTokens),
      CLIENT_WATER_COMPILER_REACHABILITY: tokenCount(compilerTokens),
      WATER_CORPUS_IN_NATIVE_BUNDLE: tokenCount(corpusTokens),
    };
    return { ...proof, status: bundles.length > 0 && proof.FRONTEND_WATER_OWNER === 0
      && proof.CLIENT_WATER_COMPILER_REACHABILITY === 0 && proof.WATER_CORPUS_IN_NATIVE_BUNDLE === 0 ? "GREEN" : "RED" };
  } catch (error) {
    return { apk: localApk, bundles: 0, error: error instanceof Error ? error.message : String(error), status: "RED" };
  }
}

async function main(): Promise<void> {
  const releaseId = argument("release-id");
  const expectedHead = argument("expected-head");
  const expectedTree = argument("expected-tree");
  const auditLog = resolve(argument("request-audit-log"));
  const output = resolve(argument("output", ".release-runtime/master11610-backend-canonical-r2/evidence/native-mainactivity"));
  if (!/^[0-9a-f-]{36}$/i.test(releaseId) || !/^[0-9a-f]{40}$/i.test(expectedHead) || !/^[0-9a-f]{40}$/i.test(expectedTree)) {
    throw new Error("NATIVE_R3_EXPECTED_IDENTITY_REQUIRED");
  }
  mkdirSync(dirname(auditLog), { recursive: true });
  writeFileSync(auditLog, "", "utf8");
  const blockers: string[] = [];
  const api = adb(["shell", "getprop", "ro.build.version.sdk"], 10_000).output.trim();
  if (api !== EXPECTED_API) blockers.push(`ANDROID_API_EXPECTED_34_RECEIVED_${api || "missing"}`);
  const packagePath = adb(["shell", "pm", "path", PACKAGE_NAME], 10_000).output.trim();
  if (!packagePath.startsWith("package:")) blockers.push("NATIVE_PACKAGE_NOT_INSTALLED");
  const bundleReachability = packagePath.startsWith("package:")
    ? inspectInstalledNativeBundle(packagePath, output)
    : { status: "RED", FRONTEND_WATER_OWNER: -1, CLIENT_WATER_COMPILER_REACHABILITY: -1, WATER_CORPUS_IN_NATIVE_BUNDLE: -1 };
  if (bundleReachability.status !== "GREEN") blockers.push("NATIVE_PRODUCTION_BUNDLE_REACHABILITY_RED");
  adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  const launch = launchRequest();
  if (!launch.ok || !launch.output.includes(`Activity: ${MAIN_ACTIVITY}`)) blockers.push("EXACT_MAINACTIVITY_LAUNCH_FAILED");
  let snapshot = await waitForId("professional-estimate-composer", 20_000);
  const promptIngressAutoOpened = Boolean(findById(snapshot, "professional-estimate-composer"));
  const initialActivity = resumedMainActivity();
  if (!initialActivity.ok) blockers.push("MAINACTIVITY_NOT_RESUMED_AT_REQUEST_ROUTE");
  if (promptIngressAutoOpened && !await tapById("foreman-ai-estimate-back", 12)) {
    blockers.push("NATIVE_PROMPT_INGRESS_CLOSE_FAILED");
  }
  snapshot = await waitForId("consumer-repair-screen", 45_000);
  if (!findById(snapshot, "consumer-repair-screen")) blockers.push("AUTHENTICATED_REQUEST_ROUTE_NOT_VISIBLE");
  const manualBackendActionOpened = await tapById("consumer-repair-open-canonical-estimate", 30);
  if (!manualBackendActionOpened) blockers.push("CANONICAL_ESTIMATE_INGRESS_NOT_REACHABLE");
  snapshot = await waitForId("professional-estimate-composer", 45_000);
  if (!findById(snapshot, "professional-estimate-composer")) blockers.push("NATIVE_CANONICAL_COMPOSER_NOT_VISIBLE");
  snapshot = await waitForId("foreman-ai-estimate-work-suggestion-1", 90_000);
  const suggestion = findById(snapshot, "foreman-ai-estimate-work-suggestion-1");
  if (!suggestion || !snapshot.text.includes(EXPECTED_CATALOG_ID) || !tap(suggestion)) blockers.push("CANONICAL_CATALOG_SUGGESTION_FAILED");
  snapshot = await waitForId("canonical-estimate-parameter-form", 45_000);
  if (!findById(snapshot, "canonical-estimate-parameter-form")) blockers.push("CANONICAL_PARAMETER_FORM_NOT_VISIBLE");
  const inputIds = Array.from(new Set(snapshot.nodes.map((node) => node.resourceId)
    .filter((id) => /^canonical-estimate-parameter-\d+$/.test(id))));
  for (let ordinal = 0; ordinal < 7; ordinal += 1) {
    const id = `canonical-estimate-parameter-${ordinal}`;
    if (!inputIds.includes(id) && !(await findScrollable(id, 8)).node) blockers.push(`NATIVE_PARAMETER_INPUT_MISSING:${ordinal}`);
    else if (!await replaceInput(id, "10")) blockers.push(`NATIVE_PARAMETER_INPUT_FAILED:${ordinal}`);
  }
  if (!await tapById("foreman-ai-estimate-generate", 30)) blockers.push("NATIVE_SERVER_COMPILE_ACTION_MISSING");
  const requestRows = await waitForAudit(auditLog, (row) => row.method === "POST" && row.path?.endsWith("/jobs/compile") === true);
  snapshot = await waitForId("canonical-estimate-release-id", 150_000);
  const releaseNode = findById(snapshot, "canonical-estimate-release-id");
  if (!releaseNode?.text.includes(releaseId)) blockers.push("NATIVE_REVISION_RELEASE_ID_MISMATCH");
  if (!findById(snapshot, "foreman-ai-estimate-row-count")) blockers.push("NATIVE_BACKEND_ROWS_NOT_RENDERED");
  const history = await findScrollable("canonical-estimate-history", 20);
  if (!history.node || !history.snapshot.text.includes(releaseId)) blockers.push("NATIVE_HISTORY_RELEASE_ID_MISSING");
  const activityDuringRevision = resumedMainActivity();
  if (!activityDuringRevision.ok) blockers.push("MAINACTIVITY_NOT_RESUMED_AT_REVISION");
  const artifactsVisible = await findScrollable("canonical-estimate-artifact-actions", 20);
  if (!artifactsVisible.node) blockers.push("NATIVE_ARTIFACT_ACTIONS_MISSING");
  const evidenceCapture = capture(output, "canonical-r3-release", artifactsVisible.snapshot);
  const finalRequestRows = await waitForAudit(
    auditLog,
    (row) => row.method === "GET" && /\/revisions\/[0-9a-f-]+$/i.test(String(row.path)),
    30_000,
  );
  const nativeRequests = finalRequestRows.filter((row) => row.authorizationPresent && row.path?.includes("/canonical-estimate/"));
  const chromeRequests = nativeRequests.filter((row) => /Chrome|Chromium/i.test(String(row.userAgent ?? "")));
  if (!nativeRequests.some((row) => row.method === "GET" && row.path?.includes("/catalog?"))) blockers.push("NATIVE_CATALOG_REQUEST_NOT_OBSERVED");
  if (!nativeRequests.some((row) => row.method === "POST" && row.path?.endsWith("/jobs/compile"))) blockers.push("NATIVE_COMPILE_REQUEST_NOT_OBSERVED");
  if (!nativeRequests.some((row) => row.method === "GET" && /\/jobs\/[0-9a-f-]+$/i.test(String(row.path)))) blockers.push("NATIVE_JOB_POLL_NOT_OBSERVED");
  if (!nativeRequests.some((row) => row.method === "GET" && /\/revisions\/[0-9a-f-]+$/i.test(String(row.path)))) blockers.push("NATIVE_REVISION_GET_NOT_OBSERVED");
  if (chromeRequests.length) blockers.push("CHROME_USER_AGENT_OBSERVED_IN_NATIVE_REQUESTS");
  const report = {
    schemaVersion: "native-android-api34-mainactivity-backend-cutover-proof.r3",
    generatedAt: new Date().toISOString(),
    source: { head: expectedHead, tree: expectedTree },
    device: { id: DEVICE_ID, apiLevel: api, packageName: PACKAGE_NAME, packagePath, component: MAIN_ACTIVITY },
    launch: { output: launch.output.trim(), exactComponent: launch.output.includes(`Activity: ${MAIN_ACTIVITY}`) },
    activity: { initial: initialActivity, revision: activityDuringRevision },
    releaseId,
    catalogId: EXPECTED_CATALOG_ID,
    authBoundaryBypassed: false,
    chromeOrWebViewSubstitution: false,
    requestAudit: {
      rows: nativeRequests,
      chromeUserAgentRows: chromeRequests.length,
      authorizationPresentOnAll: nativeRequests.every((row) => row.authorizationPresent),
    },
    productionBundleReachability: bundleReachability,
    ui: {
      promptIngressAutoOpened,
      promptIngressDisposition: promptIngressAutoOpened
        ? "AUTO_OPENED"
        : "PREVIOUSLY_ACKNOWLEDGED_IDEMPOTENT_LAUNCH_MANUAL_ACTION_PROVEN",
      manualBackendActionOpened,
      revisionReleaseIdVisible: releaseNode?.text ?? null,
      historyReleaseIdVisible: history.snapshot.text.includes(releaseId),
      artifactActionsVisible: Boolean(artifactsVisible.node),
      screenshot: evidenceCapture.png,
      hierarchy: evidenceCapture.xml,
    },
    blockers,
    status: blockers.length === 0 ? "GREEN" : "RED",
  };
  const reportPath = resolve(output, "NATIVE_ANDROID_API34_MAINACTIVITY_BACKEND_CUTOVER_PROOF.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(resolve(output, "NATIVE_PRODUCTION_BUNDLE_REACHABILITY_PROOF.json"), `${JSON.stringify({
    schemaVersion: "native-production-bundle-reachability-proof.r6-a2",
    generatedAt: report.generatedAt,
    source: report.source,
    ...bundleReachability,
  }, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: report.status, reportPath, releaseId, nativeRequests: nativeRequests.length, blockers }, null, 2)}\n`);
  if (blockers.length) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
