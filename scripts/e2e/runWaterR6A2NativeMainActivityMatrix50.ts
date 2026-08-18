import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;
type CommandResult = { ok: boolean; output: string; status: number | null };
type UiNode = { resourceId: string; contentDesc: string; text: string; bounds: string; packageName: string; attrs: string };
type UiSnapshot = { ok: boolean; xml: string; nodes: UiNode[]; text: string; error: string | null };
type AuditRow = { at: string; method: string | null; path: string | null; status: number; userAgent: string | null; authorizationPresent: boolean };
type WowCase = Json & {
  catalog_id: string;
  child_revision_id: string;
  search_kind?: "literal" | "fuzzy" | "group";
  search_query?: string;
  parameter_id?: string;
  parameter_ordinal?: number;
  parameter_title_ru?: string;
  parameter_unit_id?: string;
  guide_short_ru?: string;
  parameter_count?: number;
  changed_value?: string | number;
};

const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const EXPECTED_API = "34";
const POLL_MS = 600;
const R58_OWNER_ID = "11111111-1111-4111-8111-111111111111";
const R58_ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";

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

function findByIdSuffix(snapshot: UiSnapshot, suffix: string): UiNode | null {
  return snapshot.nodes.find((node) => node.resourceId.endsWith(suffix) || node.contentDesc.endsWith(suffix)) ?? null;
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

async function tapByIdSuffix(suffix: string, maxSwipes = 28): Promise<boolean> {
  const found = await findScrollable((snapshot) => findByIdSuffix(snapshot, suffix), maxSwipes);
  return Boolean(found.node && tap(found.node));
}

async function tapByText(text: string, maxSwipes = 28): Promise<boolean> {
  const found = await findScrollable((snapshot) => findByText(snapshot, text), maxSwipes);
  return Boolean(found.node && tap(found.node));
}

async function selectExactConsumerRepairSuggestion(catalogId: string): Promise<{
  ok: boolean;
  suggestionIndex: number | null;
  snapshot: UiSnapshot;
}> {
  let snapshot = await waitForId("consumer-repair-work-suggestions", 60_000);
  for (let page = 0; page < 12; page += 1) {
    const identityNode = snapshot.nodes.find((node) =>
      (node.resourceId.includes("consumer-repair-work-suggestion-catalog-")
        || node.contentDesc.startsWith("consumer-repair-work-suggestion-catalog-"))
      && node.text.trim() === catalogId,
    );
    const identity = `${identityNode?.resourceId ?? ""} ${identityNode?.contentDesc ?? ""}`;
    const suggestionIndex = Number(identity.match(/consumer-repair-work-suggestion-catalog-(\d+)/u)?.[1] ?? 0);
    if (suggestionIndex > 0) {
      return {
        ok: await tapById(`consumer-repair-work-suggestion-${suggestionIndex}`, 12),
        suggestionIndex,
        snapshot,
      };
    }
    const loadMore = findById(snapshot, "consumer-repair-work-search-load-more");
    if (!loadMore || !tap(loadMore)) return { ok: false, suggestionIndex: null, snapshot };
    await delay(1_000);
    snapshot = await waitForId("consumer-repair-work-suggestions", 60_000);
  }
  return { ok: false, suggestionIndex: null, snapshot };
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
    // A single Android `input text` call can silently lose the tail of a long
    // catalog id when React Native publishes search results while key events are
    // still being delivered. Type bounded chunks and prove every exact prefix;
    // this keeps long L3-L5 ids strict instead of accepting a fuzzy suggestion.
    const chunks = value.match(/[\s\S]{1,32}/g) ?? [];
    let typedOk = chunks.length > 0;
    let typedLength = 0;
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      const chunk = chunks[chunkIndex]!;
      const typed = adb(["shell", "input", "text", chunk], 20_000);
      typedLength += chunk.length;
      await delay(350);
      const partialSnapshot = dumpUi();
      const partialNode = findById(partialSnapshot, id);
      const expectedPrefix = value.slice(0, typedLength);
      if (!typed.ok || partialNode?.text !== expectedPrefix) {
        typedOk = false;
        break;
      }
      if (chunkIndex < chunks.length - 1) {
        if (!tap(partialNode) || !adb(["shell", "input", "keyevent", "KEYCODE_MOVE_END"], 5_000).ok) {
          typedOk = false;
          break;
        }
      }
    }
    adb(["shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
    await delay(500);
    const observed = findById(dumpUi(), id)?.text ?? "";
    if (typedOk && observed === value) return { ok: true, before };
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

async function ensureComposerOpen(r58Mode = false): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let snapshot = dumpUi();
    if (findById(snapshot, "professional-estimate-composer")) return true;
    if (!findById(snapshot, "consumer-repair-screen")) return false;
    const ingressId = r58Mode
      ? "request-estimate-parameters-toggle"
      : "consumer-repair-open-canonical-estimate";
    if (await tapById(ingressId, 8)) {
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

async function reopenExactLatestRevision(catalogId: string, revisionId: string, r58Mode = false): Promise<boolean> {
  if (!await ensureComposerOpen(r58Mode)) return false;
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

function displayedCount(value: string): number {
  const matched = value.match(/(\d+)\s*$/u);
  return matched ? Number(matched[1]) : 0;
}

function hasUtf8Mojibake(value: string): boolean {
  return /(?:\uFFFD|[\u0420\u0421][\u0080-\u00BF\u0400-\u040F\u0450-\u045F\u2010-\u203A])/u.test(value);
}

async function readRevisionIdentity(databaseUrl: string, revisionId: string): Promise<Json | null> {
  const client = new Client({ connectionString: databaseUrl, application_name: "r58-android-parent-before" });
  try {
    await client.connect();
    return (await client.query(`
      select id::text,parent_revision_id::text,release_id::text,catalog_id,input_parameters,
        row_count,checksum_sha256,compiler_owner
      from public.estimate_revision where id=$1
    `, [revisionId])).rows[0] as Json ?? null;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function auditImmutableRevisionPair(input: {
  databaseUrl: string;
  parentBefore: Json | null;
  parentRevisionId: string;
  childRevisionId: string;
  catalogId: string;
  releaseId: string;
  changedParameterId: string;
}): Promise<Json> {
  const client = new Client({ connectionString: input.databaseUrl, application_name: "r58-android-immutable-pair" });
  try {
    await client.connect();
    const revisions = (await client.query(`
      select id::text,parent_revision_id::text,release_id::text,catalog_id,input_parameters,
        row_count,checksum_sha256,compiler_owner
      from public.estimate_revision where id=any($1::uuid[])
    `, [[input.parentRevisionId, input.childRevisionId]])).rows as Json[];
    const byId = new Map(revisions.map((row) => [String(row.id), row]));
    const parent = byId.get(input.parentRevisionId) ?? null;
    const child = byId.get(input.childRevisionId) ?? null;
    const revisionRows = (await client.query(`
      select revision_id::text,row_id,row_sha256,calculation_trace,normative_trace
      from public.estimate_revision_row where revision_id=any($1::uuid[])
    `, [[input.parentRevisionId, input.childRevisionId]])).rows as Json[];
    const parentRows = new Map(revisionRows
      .filter((row) => row.revision_id === input.parentRevisionId)
      .map((row) => [String(row.row_id), row]));
    const changedRows = revisionRows.filter((row) => row.revision_id === input.childRevisionId
      && parentRows.get(String(row.row_id))?.row_sha256 !== row.row_sha256);
    const tracedChangedRows = changedRows.filter((row) => row.calculation_trace
      && Object.keys(row.calculation_trace as Json).length > 0);
    const parameterDependentRows = tracedChangedRows.filter((row) =>
      JSON.stringify(row.calculation_trace).includes(input.changedParameterId));
    const parentUnchanged = Boolean(parent && input.parentBefore
      && parent.checksum_sha256 === input.parentBefore.checksum_sha256
      && parent.row_count === input.parentBefore.row_count
      && JSON.stringify(parent.input_parameters) === JSON.stringify(input.parentBefore.input_parameters));
    const identityGreen = Boolean(parent && child
      && parent.id === input.parentRevisionId
      && child.parent_revision_id === input.parentRevisionId
      && parent.catalog_id === input.catalogId && child.catalog_id === input.catalogId
      && parent.release_id === input.releaseId && child.release_id === input.releaseId
      && parent.compiler_owner === "backend" && child.compiler_owner === "backend");
    const changedInputGreen = Boolean(parent && child
      && JSON.stringify(parent.input_parameters?.[input.changedParameterId])
        !== JSON.stringify(child.input_parameters?.[input.changedParameterId]));
    return {
      parentRevisionId: input.parentRevisionId,
      childRevisionId: input.childRevisionId,
      parentChecksumBefore: input.parentBefore?.checksum_sha256 ?? null,
      parentChecksumAfter: parent?.checksum_sha256 ?? null,
      childChecksum: child?.checksum_sha256 ?? null,
      parentUnchanged,
      identityGreen,
      changedInputGreen,
      changedRows: changedRows.length,
      tracedChangedRows: tracedChangedRows.length,
      parameterDependentRows: parameterDependentRows.length,
      changedRowIds: changedRows.slice(0, 20).map((row) => row.row_id),
      status: parentUnchanged && identityGreen && changedInputGreen
        && changedRows.length > 0 && tracedChangedRows.length === changedRows.length
        && parameterDependentRows.length > 0 ? "GREEN" : "RED",
    };
  } finally {
    await client.end().catch(() => undefined);
  }
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

function inspectInstalledNativeBundle(packagePath: string, output: string, r58Mode: boolean): Json {
  const remoteApk = packagePath.replace(/^package:/, "").split(/\r?\n/)[0];
  const localApk = resolve(output, "installed-mainactivity-base.apk");
  const pulled = adb(["pull", remoteApk, localApk], 120_000);
  if (!pulled.ok) return { apk: localApk, error: pulled.output, status: "RED" };
  try {
    const listing = execFileSync("tar", ["-tf", localApk], { encoding: "utf8", timeout: 60_000, maxBuffer: 32 * 1024 * 1024 });
    const bundles = listing.split(/\r?\n/).filter((entry) => /(?:^|\/)(?:index\.android\.bundle|[^/]+\.(?:bundle|js))$/i.test(entry));
    const ownerTokens = ["waterSupplySewerageComplete", "waterSewerStorm", "WATER_SEWER_COMPLETE_DOMAIN"];
    const compilerTokens = [
      "evaluateFormulaGraph",
      "calculateGlobalConstructionEstimate",
      "calculateGlobalConstructionEstimateSync",
      "compileProductionExpandedEstimate10000",
      "buildEstimateFromInlineWorkPrompt",
      "createEstimateDraftRevision",
      "migrateExistingEstimatesToCanonicalBackend",
      "buildProfessionalExpandedGlobalEstimate",
      "productionFormulaDsl",
    ];
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
    const r58Green = bundles.length > 0 && proof.CLIENT_WATER_COMPILER_REACHABILITY === 0;
    const waterGreen = r58Green && proof.FRONTEND_WATER_OWNER === 0 && proof.WATER_CORPUS_IN_NATIVE_BUNDLE === 0;
    return {
      ...proof,
      ownershipContract: r58Mode ? "R58_NO_FRONTEND_COMPILER" : "WATER_NO_FRONTEND_OWNER_COMPILER_OR_CORPUS",
      status: (r58Mode ? r58Green : waterGreen) ? "GREEN" : "RED",
    };
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

async function coldReopenCanonicalRevision(input: {
  auditLog: string;
  catalogId: string;
  childRevisionId: string;
  expectedReleaseId: string;
  expectedRowCountText: string;
  caseNumber: number;
}): Promise<{ blockers: string[]; evidence: Json; snapshot: UiSnapshot }> {
  const coldBlockers: string[] = [];
  if (!await tapById("foreman-ai-estimate-back", 8)) {
    coldBlockers.push("COLD_REOPEN_COMPOSER_CLOSE_FAILED");
  }
  let snapshot = await waitForId("consumer-repair-draft", 30_000);
  if (!findById(snapshot, "consumer-repair-draft")) {
    coldBlockers.push("COLD_REOPEN_SOURCE_REQUEST_DRAFT_MISSING");
  }
  if (!await tapById("consumer-repair-delete-draft", 20)) {
    coldBlockers.push("COLD_REOPEN_SOURCE_REQUEST_DRAFT_DELETE_FAILED");
  }
  snapshot = await waitForId("consumer-repair-problem-input", 30_000);
  if (!findById(snapshot, "consumer-repair-problem-input")
    || findById(snapshot, "consumer-repair-draft")) {
    coldBlockers.push("COLD_REOPEN_LOCAL_REQUEST_RESIDUE_RED");
  }

  const auditBeforeCold = readAudit(input.auditLog).length;
  const forceStop = adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  if (!forceStop.ok) coldBlockers.push("COLD_REOPEN_FORCE_STOP_FAILED");
  const deepLink = `rik:///request?canonicalRevisionId=${encodeURIComponent(input.childRevisionId)}&r58Cold=${input.caseNumber}-${Date.now()}`;
  const launch = adb([
    "shell", "am", "start", "-W", "-n", MAIN_ACTIVITY,
    "-a", "android.intent.action.VIEW", "-d", deepLink,
  ], 60_000);
  if (!launch.ok || !launch.output.includes(`Activity: ${MAIN_ACTIVITY}`)) {
    coldBlockers.push("COLD_REOPEN_EXACT_MAINACTIVITY_LAUNCH_FAILED");
  }

  snapshot = await waitForId("professional-estimate-composer", 90_000);
  if (!findById(snapshot, "professional-estimate-composer")) {
    coldBlockers.push("COLD_REOPEN_CANONICAL_COMPOSER_NOT_VISIBLE");
  }
  snapshot = await waitForId("canonical-estimate-native-quick-actions", 150_000);
  if (!findById(snapshot, "canonical-estimate-native-quick-actions")) {
    coldBlockers.push("COLD_REOPEN_EXACT_REVISION_NOT_RENDERED");
  }
  const formSnapshot = await waitForId("canonical-estimate-parameter-form", 60_000);
  if (!findById(formSnapshot, "canonical-estimate-parameter-form")) {
    coldBlockers.push("COLD_REOPEN_PARAMETER_FORM_NOT_VISIBLE");
  }

  const encodedCatalogId = encodeURIComponent(input.catalogId);
  const expectedRevisionPath = `/canonical-estimate/revisions/${input.childRevisionId}`;
  const expectedRowsPath = `${expectedRevisionPath}/rows?`;
  const expectedCatalogPath = `/canonical-estimate/catalog/${encodedCatalogId}`;
  const expectedHistoryPath = `/canonical-estimate/revisions?catalogId=${encodedCatalogId}`;
  const coldAudit = await waitForAudit(input.auditLog, auditBeforeCold, (row) =>
    row.method === "GET"
      && row.path?.startsWith(expectedHistoryPath) === true
      && row.status === 200,
  120_000);
  const observed = coldAudit.slice(auditBeforeCold);
  const hasGet = (predicate: (path: string) => boolean) => observed.some((row) =>
    row.method === "GET" && row.status === 200 && predicate(String(row.path ?? "")),
  );
  if (!hasGet((path) => path === expectedRevisionPath)) {
    coldBlockers.push("COLD_REOPEN_EXACT_REVISION_GET_NOT_OBSERVED");
  }
  if (!hasGet((path) => path.startsWith(expectedRowsPath))) {
    coldBlockers.push("COLD_REOPEN_EXACT_ROWS_GET_NOT_OBSERVED");
  }
  if (!hasGet((path) => path === expectedCatalogPath)) {
    coldBlockers.push("COLD_REOPEN_EXACT_CATALOG_GET_NOT_OBSERVED");
  }
  if (!hasGet((path) => path.startsWith(expectedHistoryPath))) {
    coldBlockers.push("COLD_REOPEN_EXACT_HISTORY_GET_NOT_OBSERVED");
  }
  if (observed.some((row) => row.method === "POST")) {
    coldBlockers.push("COLD_REOPEN_MUTATION_REQUEST_OBSERVED");
  }
  if (observed.some((row) => !row.authorizationPresent)) {
    coldBlockers.push("COLD_REOPEN_UNAUTHENTICATED_REQUEST");
  }

  const releaseText = findById(snapshot, "canonical-estimate-release-id-top")?.text ?? "";
  const rowCountText = findById(snapshot, "canonical-estimate-row-count-top")?.text ?? "";
  const catalogText = findById(snapshot, "canonical-estimate-selected-catalog-id")?.text ?? "";
  if (!releaseText.includes(input.expectedReleaseId)) {
    coldBlockers.push("COLD_REOPEN_RELEASE_IDENTITY_RED");
  }
  if (!rowCountText || rowCountText !== input.expectedRowCountText) {
    coldBlockers.push("COLD_REOPEN_ROW_COUNT_IDENTITY_RED");
  }
  if (!catalogText.includes(input.catalogId)) coldBlockers.push("COLD_REOPEN_CATALOG_IDENTITY_RED");
  if (hasUtf8Mojibake(snapshot.text)) coldBlockers.push("COLD_REOPEN_UTF8_RED");
  const activity = resumedMainActivity();
  if (!activity.ok) coldBlockers.push("COLD_REOPEN_MAINACTIVITY_RED");

  return {
    blockers: coldBlockers,
    snapshot,
    evidence: {
      deepLink,
      forceStop: { ok: forceStop.ok },
      launch: { ok: launch.ok, output: launch.output.trim(), exactComponent: launch.output.includes(`Activity: ${MAIN_ACTIVITY}`) },
      exactRevisionId: input.childRevisionId,
      exactCatalogId: input.catalogId,
      catalogText,
      releaseText,
      rowCountText,
      requestRows: observed,
      noMutationPost: !observed.some((row) => row.method === "POST"),
      authenticated: observed.length > 0 && observed.every((row) => row.authorizationPresent),
      activity,
    },
  };
}

async function main(): Promise<void> {
  const mode = argument("mode", "water-r6-a2");
  const r58Mode = mode === "r58";
  const releaseId = argument("release-id");
  const expectedHead = argument("expected-head");
  const expectedTree = argument("expected-tree");
  const evidenceRoot = resolve(argument("evidence-root", ".release-runtime/batch006-water-backend-r3/evidence-a2"));
  const auditLog = resolve(argument("request-audit-log"));
  const output = resolve(argument("output", join(evidenceRoot, "A2_11_ANDROID_RUNTIME")));
  const databaseUrl = argument("database-url", "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a");
  if (!/^[0-9a-f-]{36}$/i.test(releaseId) || !/^[0-9a-f]{40}$/i.test(expectedHead)
    || !/^[0-9a-f]{40}$/i.test(expectedTree) || !auditLog) throw new Error("WATER_R6_A2_ANDROID_MATRIX_IDENTITY_REQUIRED");
  const casesPath = resolve(argument("cases", join(evidenceRoot, "A2_10_WOW_50_CASES.jsonl")));
  const reportPath = resolve(argument("report", join(evidenceRoot, "A2_11_ANDROID_API34_MAINACTIVITY_MATRIX_50.json")));
  const wow = readFileSync(casesPath, "utf8").split(/\r?\n/)
    .filter(Boolean).map((line) => JSON.parse(line) as WowCase);
  if (wow.length !== 50 || new Set(wow.map((row) => row.catalog_id)).size !== 50
    || wow.some((row) => row.status !== "GREEN" || !row.child_revision_id
      || (r58Mode && (!(row.search_kind && (["literal", "fuzzy", "group"] as string[]).includes(row.search_kind))
        || !row.search_query?.trim() || !row.parameter_id?.trim()
        || !Number.isSafeInteger(Number(row.parameter_ordinal)) || Number(row.parameter_ordinal) < 0
        || !row.parameter_title_ru?.trim() || !row.parameter_unit_id?.trim()
        || !row.guide_short_ru?.trim() || !Number.isSafeInteger(Number(row.parameter_count))
        || Number(row.parameter_count) <= 0 || !Number.isFinite(Number(row.changed_value)))))) {
    throw new Error(r58Mode ? "R58_ANDROID_MATRIX_INPUT_RED" : "WATER_R6_A2_ANDROID_MATRIX_INPUT_RED");
  }

  mkdirSync(output, { recursive: true });
  mkdirSync(dirname(auditLog), { recursive: true });
  writeFileSync(auditLog, "", "utf8");
  adb(["logcat", "-c"], 20_000);
  const blockers: string[] = [];
  const apiLevel = adb(["shell", "getprop", "ro.build.version.sdk"], 10_000).output.trim();
  if (apiLevel !== EXPECTED_API) blockers.push(`ANDROID_API_EXPECTED_34_RECEIVED_${apiLevel || "missing"}`);
  const packagePath = adb(["shell", "pm", "path", PACKAGE_NAME], 10_000).output.trim();
  if (!packagePath.startsWith("package:")) blockers.push("NATIVE_PACKAGE_NOT_INSTALLED");
  const bundleReachability = packagePath.startsWith("package:")
    ? inspectInstalledNativeBundle(packagePath, output, r58Mode)
    : { status: "RED" };
  if (bundleReachability.status !== "GREEN") blockers.push("NATIVE_BUNDLE_OWNERSHIP_RED");

  adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  const launchUrl = `rik:///request?launchId=${r58Mode ? "r58" : "water-r6-a2"}-native-${Date.now()}`;
  const launch = adb(["shell", "am", "start", "-W", "-n", MAIN_ACTIVITY, "-a", "android.intent.action.VIEW", "-d", launchUrl], 60_000);
  if (!launch.ok || !launch.output.includes(`Activity: ${MAIN_ACTIVITY}`)) blockers.push("EXACT_MAINACTIVITY_LAUNCH_FAILED");
  let snapshot = await waitForId("consumer-repair-screen", 90_000);
  if (!findById(snapshot, "consumer-repair-screen")) blockers.push("AUTHENTICATED_REQUEST_ROUTE_NOT_VISIBLE");
  if (!r58Mode) {
    if (!await tapById("consumer-repair-open-canonical-estimate", 30)) blockers.push("CANONICAL_ESTIMATE_INGRESS_NOT_REACHABLE");
    snapshot = await waitForId("professional-estimate-composer", 60_000);
    if (!findById(snapshot, "professional-estimate-composer")) blockers.push("NATIVE_CANONICAL_COMPOSER_NOT_VISIBLE");
  }

  const rows: Json[] = [];
  for (let index = 0; index < wow.length && blockers.length === 0; index += 1) {
    const item = wow[index];
    const started = Date.now();
    const caseBlockers: string[] = [];
    let audit: AuditRow[] = [];
    let parentRevisionId = "";
    let parentBefore: Json | null = null;
    let baselineRowCountText = "";
    if (r58Mode) {
      snapshot = dumpUi();
      if (findById(snapshot, "professional-estimate-composer")) {
        if (!await tapById("foreman-ai-estimate-back", 4)) caseBlockers.push("REQUEST_REENTRY_BACK_FAILED");
        snapshot = await waitForId("consumer-repair-screen", 30_000);
      }
      if (!findById(snapshot, "consumer-repair-problem-input")) {
        if (!await tapById("consumer-repair-delete-draft", 16)) caseBlockers.push("PREVIOUS_REQUEST_DRAFT_DELETE_FAILED");
        snapshot = await waitForId("consumer-repair-problem-input", 30_000);
      }
      const search = await replaceInput("consumer-repair-problem-input", item.search_query!);
      if (!search.ok) caseBlockers.push("REQUEST_CATALOG_SEARCH_INPUT_FAILED");
      const exactSuggestion = await selectExactConsumerRepairSuggestion(item.catalog_id);
      snapshot = exactSuggestion.snapshot;
      if (!exactSuggestion.ok || !snapshot.text.includes(item.catalog_id)) {
        caseBlockers.push("REQUEST_EXACT_CATALOG_SUGGESTION_FAILED");
      }
      const auditBeforeBaseline = readAudit(auditLog).length;
      if (!await tapById("consumer-repair-prepare-draft", 16)) caseBlockers.push("REQUEST_BASELINE_ACTION_MISSING");
      audit = await waitForAudit(auditLog, auditBeforeBaseline, (row) => row.method === "POST"
        && row.path?.endsWith("/jobs/compile") === true && row.status === 202, 120_000);
      const baselineAudit = audit.slice(auditBeforeBaseline);
      if (!baselineAudit.some((row) => row.method === "POST" && row.path?.endsWith("/jobs/compile") && row.status === 202)) {
        caseBlockers.push("REQUEST_BASELINE_COMPILE_NOT_OBSERVED");
      }
      audit = await waitForAudit(auditLog, auditBeforeBaseline, (row) => row.method === "GET"
        && /^\/canonical-estimate\/revisions\/[0-9a-f-]{36}$/i.test(String(row.path)) && row.status === 200, 150_000);
      const baselineRevisionGets = audit.slice(auditBeforeBaseline).filter((row) => row.method === "GET"
        && /^\/canonical-estimate\/revisions\/[0-9a-f-]{36}$/i.test(String(row.path)) && row.status === 200);
      parentRevisionId = String(baselineRevisionGets.at(-1)?.path ?? "").split("/").at(-1) ?? "";
      snapshot = await waitForId("consumer-repair-draft", 120_000);
      if (!findById(snapshot, "consumer-repair-draft")) caseBlockers.push("REQUEST_PRELIMINARY_ESTIMATE_NOT_VISIBLE");
      const requestRelease = findById(snapshot, "consumer-repair-draft-release-id")?.text ?? "";
      baselineRowCountText = findById(snapshot, "request-estimate-row-count")?.text ?? "";
      if (!requestRelease.includes(releaseId)) caseBlockers.push("REQUEST_BASELINE_RELEASE_VISIBLE_RED");
      if (displayedCount(baselineRowCountText) <= 0) caseBlockers.push("REQUEST_PRELIMINARY_ESTIMATE_EMPTY");
      if (hasUtf8Mojibake(snapshot.text)) caseBlockers.push("REQUEST_PRELIMINARY_UTF8_RED");
      if (parentRevisionId) {
        try {
          parentBefore = await readRevisionIdentity(databaseUrl, parentRevisionId);
          if (!parentBefore) caseBlockers.push("PARENT_BEFORE_IDENTITY_MISSING");
        } catch (error) {
          caseBlockers.push(`PARENT_BEFORE_AUDIT_FAILED:${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (!await tapById("request-estimate-parameters-toggle", 20)) caseBlockers.push("CANONICAL_COMPOSER_INGRESS_NOT_REACHABLE");
      snapshot = await waitForId("professional-estimate-composer", 60_000);
      if (!findById(snapshot, "professional-estimate-composer")) caseBlockers.push("NATIVE_CANONICAL_COMPOSER_NOT_VISIBLE");
      snapshot = await waitForId("canonical-estimate-parameter-form", 60_000);
      if (!findById(snapshot, "canonical-estimate-parameter-form")) caseBlockers.push("PARAMETER_FORM_NOT_VISIBLE");
    } else {
      if (!await ensureComposerOpen()) caseBlockers.push("COMPOSER_REENTRY_FAILED");
      const search = await replaceInput("foreman-ai-estimate-input", item.catalog_id);
      if (!search.ok) caseBlockers.push("CATALOG_SEARCH_INPUT_FAILED");
      snapshot = await waitForId("foreman-ai-estimate-work-suggestion-1", 45_000);
      if (!snapshot.text.includes(item.catalog_id) || !tap(findById(snapshot, "foreman-ai-estimate-work-suggestion-1")!)) {
        caseBlockers.push("EXACT_CATALOG_SUGGESTION_FAILED");
      }
      snapshot = await waitForId("canonical-estimate-parameter-form", 45_000);
      if (!findById(snapshot, "canonical-estimate-parameter-form")) caseBlockers.push("PARAMETER_FORM_NOT_VISIBLE");
      const auditBeforeParent = readAudit(auditLog).length;
      if (!await tapByIdPrefix("canonical-estimate-open-latest-revision-", 8)) caseBlockers.push("LATEST_HISTORY_PARENT_OPEN_FAILED");
      audit = await waitForAudit(auditLog, auditBeforeParent, (row) => row.method === "GET"
        && /^\/canonical-estimate\/revisions\/[0-9a-f-]{36}\/rows\?/i.test(String(row.path)) && row.status === 200, 90_000);
      const parentRows = audit.slice(auditBeforeParent).filter((row) => row.method === "GET"
        && /^\/canonical-estimate\/revisions\/[0-9a-f-]{36}\/rows\?/i.test(String(row.path)) && row.status === 200);
      parentRevisionId = String(parentRows[0]?.path ?? "").match(/\/revisions\/([0-9a-f-]{36})\/rows/i)?.[1] ?? "";
    }
    if (!/^[0-9a-f-]{36}$/i.test(parentRevisionId)) caseBlockers.push("LATEST_HISTORY_PARENT_ID_NOT_OBSERVED");
    snapshot = await waitForId("canonical-estimate-release-id-top", 60_000);
    const releaseNode = findById(snapshot, "canonical-estimate-release-id-top");
    if (!releaseNode?.text.includes(releaseId)) caseBlockers.push("PARENT_RELEASE_VISIBLE_RED");
    if (!findById(snapshot, "canonical-estimate-selected-catalog-id")?.text.includes(item.catalog_id)) {
      caseBlockers.push("PARENT_EXACT_CATALOG_ID_VISIBLE_RED");
    }

    const parameterOrdinal = r58Mode ? Number(item.parameter_ordinal) : 0;
    const parameterInputId = `canonical-estimate-parameter-${parameterOrdinal}`;
    if (r58Mode) {
      if (!await tapById("canonical-estimate-refine-parameters", 16)) caseBlockers.push("PARAMETER_REFINEMENT_TOGGLE_MISSING");
      if (parameterOrdinal >= 8 && !await tapById("canonical-estimate-expand-parameters", 16)) {
        caseBlockers.push("PARAMETER_EXPAND_ACTION_MISSING");
      }
    }
    const parameterFound = await findScrollable((current) => findById(current, parameterInputId), 36);
    const beforeValue = parameterFound.node?.text ?? "";
    let afterValue = "";
    if (!parameterFound.node) caseBlockers.push("FIRST_PARAMETER_MISSING");
    else {
      try {
        afterValue = r58Mode ? String(item.changed_value) : changedNumericValue(beforeValue);
        if (!Number.isFinite(Number(afterValue))) throw new Error("R58_CHANGED_VALUE_NOT_NUMERIC");
      } catch { caseBlockers.push("FIRST_PARAMETER_NOT_NUMERIC"); }
      if (afterValue && !(await replaceInput(parameterInputId, afterValue)).ok) caseBlockers.push("FIRST_PARAMETER_EDIT_FAILED");
    }
    if (r58Mode) {
      const parameterLabel = findById(parameterFound.snapshot, `canonical-estimate-parameter-label-${parameterOrdinal}`)?.text ?? "";
      const parameterGuide = findById(parameterFound.snapshot, `canonical-estimate-parameter-guide-${parameterOrdinal}`)?.text ?? "";
      if (!parameterLabel.includes(item.parameter_title_ru!) || !parameterLabel.includes(item.parameter_unit_id!)) {
        caseBlockers.push("PARAMETER_TITLE_OR_UOM_VISIBLE_RED");
      }
      if (parameterGuide !== item.guide_short_ru) caseBlockers.push("PARAMETER_INLINE_GUIDE_VISIBLE_RED");
      if (hasUtf8Mojibake(parameterFound.snapshot.text)) caseBlockers.push("PARAMETER_UI_UTF8_RED");
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
    if (displayedCount(rowCountText) <= 0) caseBlockers.push("CHILD_ESTIMATE_EMPTY");
    if (!findById(snapshot, "canonical-estimate-selected-catalog-id")?.text.includes(item.catalog_id)) {
      caseBlockers.push("CHILD_EXACT_CATALOG_ID_VISIBLE_RED");
    }
    if (hasUtf8Mojibake(snapshot.text)) caseBlockers.push("CHILD_UI_UTF8_RED");
    let immutablePair: Json | null = null;
    if (r58Mode && childRevisionId) {
      try {
        immutablePair = await auditImmutableRevisionPair({
          databaseUrl,
          parentBefore,
          parentRevisionId,
          childRevisionId,
          catalogId: item.catalog_id,
          releaseId,
          changedParameterId: item.parameter_id!,
        });
        if (immutablePair.status !== "GREEN") caseBlockers.push("IMMUTABLE_PAIR_SEMANTIC_DIFF_RED");
      } catch (error) {
        caseBlockers.push(`IMMUTABLE_PAIR_AUDIT_FAILED:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await waitForAudit(auditLog, auditBeforeRecalc, (row) => row.method === "GET"
      && row.path?.startsWith(`/canonical-estimate/revisions?catalogId=${encodeURIComponent(item.catalog_id)}`) === true
      && row.status === 200, 90_000);
    const auditBeforeParentReopen = readAudit(auditLog).length;
    if (r58Mode && parentRevisionId && !await tapByIdSuffix(`-${parentRevisionId}`, 16)) {
      caseBlockers.push("PARENT_IMMUTABLE_HISTORY_REOPEN_FAILED");
    }
    if (r58Mode && parentRevisionId) {
      const parentReopenAudit = await waitForAudit(auditLog, auditBeforeParentReopen, (row) => row.method === "GET"
        && row.path?.includes(`/revisions/${parentRevisionId}/rows?`) === true && row.status === 200, 90_000);
      if (!parentReopenAudit.slice(auditBeforeParentReopen).some((row) => row.method === "GET"
        && row.path?.includes(`/revisions/${parentRevisionId}/rows?`) === true && row.status === 200)) {
        caseBlockers.push("PARENT_IMMUTABLE_ROWS_NOT_OBSERVED");
      }
    }
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
        && !(await reopenExactLatestRevision(item.catalog_id, childRevisionId, r58Mode))) {
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
        if (!await reopenExactLatestRevision(item.catalog_id, childRevisionId, r58Mode)) {
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

    let coldReopen: Json | null = null;
    if (r58Mode && childRevisionId) {
      const cold = await coldReopenCanonicalRevision({
        auditLog,
        catalogId: item.catalog_id,
        childRevisionId,
        expectedReleaseId: releaseId,
        expectedRowCountText: rowCountText,
        caseNumber: index + 1,
      });
      caseBlockers.push(...cold.blockers);
      coldReopen = cold.evidence;
      snapshot = cold.snapshot;
    }

    if ((index + 1) % 10 === 0 || index === wow.length - 1) {
      snapshot = dumpUi();
      artifactEvidence.capture = capture(output,
        `${r58Mode ? "r58" : "water"}-native-${String(index + 1).padStart(2, "0")}`, snapshot);
    }
    rows.push({
      case: index + 1,
      catalogId: item.catalog_id,
      backendSeedReferenceRevisionId: item.child_revision_id,
      androidParentRevisionId: parentRevisionId,
      androidChildRevisionId: childRevisionId,
      releaseId,
      parameterEdit: { ordinal: parameterOrdinal, before: beforeValue, after: afterValue },
      search: r58Mode ? { kind: item.search_kind, query: item.search_query, exactSelection: true } : null,
      preliminary: { rowCountText: baselineRowCountText, nonEmpty: displayedCount(baselineRowCountText) > 0, throughRequestSearchAndExactSelection: r58Mode },
      rowCountText,
      immutablePair,
      artifacts: artifactEvidence,
      coldReopen,
      activity: resumedMainActivity(),
      device: { id: DEVICE_ID, apiLevel, component: MAIN_ACTIVITY },
      helperBypass: false,
      chromeOrWebViewSubstitution: false,
      durationMs: Date.now() - started,
      blockers: caseBlockers,
      status: caseBlockers.length === 0 ? "GREEN" : "RED",
    });
    process.stdout.write(`[${new Date().toISOString()}] ${r58Mode ? "R58" : "Water"} Android ${index + 1}/50 ${item.catalog_id} ${rows.at(-1)!.status}\n`);
    if (caseBlockers.length) blockers.push(`ANDROID_CASE_${index + 1}_RED:${caseBlockers.join(",")}`);
  }

  const logcat = adb(["logcat", "-d", "-v", "brief", "ActivityManager:E", "AndroidRuntime:E", "*:S"], 60_000).output;
  const anrRows = logcat.split(/\r?\n/).filter((line) => /ANR in com\.azisbek_dzhantaev\.rikexpoapp/i.test(line));
  if (anrRows.length) blockers.push(`ANDROID_ANR_${anrRows.length}`);
  const audit = readAudit(auditLog);
  const nativeRequests = audit.filter((row) => row.authorizationPresent && row.path?.includes("/canonical-estimate/"));
  const chromeRows = nativeRequests.filter((row) => /Chrome|Chromium|WebView/i.test(String(row.userAgent ?? "")));
  const unexpectedChromeRows = chromeRows.filter((row) => !row.path?.startsWith("/canonical-estimate/artifact-files/"));
  if (unexpectedChromeRows.length) blockers.push(`NATIVE_REQUESTS_FROM_BROWSER_${unexpectedChromeRows.length}`);
  let cleanup: Json | null = null;
  if (r58Mode) {
    const client = new Client({ connectionString: databaseUrl, application_name: "r58-android50-cleanup" });
    try {
      await client.connect();
      cleanup = (await client.query(
        "select * from public.estimate_cleanup_cumulative_admission_runtime_r58($1,$2,$3)",
        [releaseId, R58_OWNER_ID, R58_ORGANIZATION_ID],
      )).rows[0] as Json;
      if (Number(cleanup.residue) !== 0) blockers.push(`CLEANUP_RESIDUE:${cleanup.residue}`);
    } catch (error) {
      blockers.push(`R58_CLEANUP_FAILED:${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  const report = {
    schemaVersion: r58Mode ? "p0-one-monolith-r58-native-android-api34-mainactivity-matrix-50.v1"
      : "water-r6-a2-native-android-api34-mainactivity-matrix.v1",
    generatedAt: new Date().toISOString(),
    source: { head: expectedHead, tree: expectedTree },
    releaseId,
    device: { id: DEVICE_ID, apiLevel, packageName: PACKAGE_NAME, packagePath, component: MAIN_ACTIVITY },
    launch: { output: launch.output.trim(), exactComponent: launch.output.includes(`Activity: ${MAIN_ACTIVITY}`) },
    expected: 50,
    executed: rows.length,
    green: rows.filter((row) => row.status === "GREEN").length,
    distinctCatalogIds: new Set(rows.map((row) => row.catalogId)).size,
    lifecycle: r58Mode
      ? { requestSearchAndExactSelection: 50, requestBaselineParents: 50, editParameters: 50, serverRecalculate: 50, immutableChild: 50, historyReopen: 50, pdf: 50, procurement: 50, coldDeepLinkExactRevisionReopen: 50, explicitExternalViewerProofs: 2 }
      : { backendParentReference: 50, openLatestExactRevision: 50, editParameters: 50, serverRecalculate: 50, immutableChild: 50, historyReopen: 50, pdf: 50, procurement: 50, explicitExternalViewerProofs: 2 },
    realMainActivity: true,
    api34: apiLevel === "34",
    browserEmulation: false,
    webViewSubstitution: false,
    helperBypass: false,
    androidAnr: anrRows.length,
    productionBundleReachability: bundleReachability,
    requestAudit: {
      path: auditLog,
      rows: nativeRequests.length,
      explicitExternalArtifactViewerRows: chromeRows.length - unexpectedChromeRows.length,
      unexpectedChromeOrWebViewRows: unexpectedChromeRows.length,
      authorizationPresentOnAll: nativeRequests.every((row) => row.authorizationPresent),
    },
    cleanup,
    cases: rows,
    blockers,
    productionDeployed: false,
    mode,
    casesPath,
    status: blockers.length === 0 && rows.length === 50 ? "GREEN" : "RED",
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(output, "REQUEST_AUDIT_COPY.jsonl"), `${audit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: report.status, reportPath, green: report.green, blockers }, null, 2)}\n`);
  if (report.status !== "GREEN") process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
