import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;

const ROOT = resolve(".");
const EVIDENCE = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/ui-bottom-actions-android-api34-r1",
);
const OUTPUT_JSON = resolve(EVIDENCE, "UI_BOTTOM_ACTIONS_ANDROID_API34_R1.json");
const OUTPUT_MD = resolve(EVIDENCE, "UI_BOTTOM_ACTIONS_ANDROID_API34_R1.md");
const PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const DEVICE = "emulator-5554";
const REVISION_ID = "34a579e0-ce4b-45f7-88fb-f910bcbdefee";
const ACCEPTED_RELEASE_ID = "b28fdda9-e55f-4629-bba8-24ff15e7d8b6";
const PRODUCT_SOURCE_MANIFEST_SHA256 = "eb67a1c81eca262899b31059c3da57e44144e849b9f90db786380b38e3d40576";
const PRODUCT_SOURCE_FILE_COUNT = 3_758;
const SOURCE_HEAD = "6b8e612cba45884c0dce88f333dfb3d10a054ae6";
const SOURCE_HEAD_TREE = "f9754a1d7939cfdf12035345de502c8d712e6737";
const EXPECTED_APK_SHA256 = "6ecc06663d6188ba43edf08c811e739e1b376f381a8d55460f18bbbec772284b";
const EXPECTED_BUNDLE_SHA256 = "782f764ee45b61617636c80da44c226503428a46d8ece5952706df8ac327c74a";

const PATHS = {
  apk: resolve("android/app/build/outputs/apk/waterProof/app-waterProof.apk"),
  bundle: resolve("android/app/build/generated/assets/createBundleWaterProofJsAndAssets/index.android.bundle"),
  buildLog: resolve(EVIDENCE, "fresh_assemble_waterproof_inline_actions_attempt3_envbound.log"),
  installLog: resolve(EVIDENCE, "adb_install_inline_actions_envbound_api34.log"),
  targetedJest: resolve(EVIDENCE, "ui_targeted_contracts_r4.log"),
  productTypecheck: resolve(EVIDENCE, "typecheck_product_after_ui_runtime_fix_r3.log"),
  diffCheck: resolve(EVIDENCE, "git_diff_check_after_ui_runtime_fix_r2.log"),
  scriptsTypecheckRed: resolve(EVIDENCE, "typecheck_after_ui_runtime_fix_8gb.log"),
  backendAudit: resolve(EVIDENCE, "backend_http_audit.jsonl"),
  authAudit: resolve(
    ".release-runtime/real-professional-estimates-r4/evidence/05-web/batch002/runtime/local_supabase_audit.jsonl",
  ),
  startXml: resolve(EVIDENCE, "18_inline_cold_reopen.xml"),
  startPng: resolve(EVIDENCE, "18_inline_cold_reopen.png"),
  startLaunch: resolve(EVIDENCE, "18_inline_cold_reopen_launch.txt"),
  middleXml: resolve(EVIDENCE, "14_inline_middle.xml"),
  middlePng: resolve(EVIDENCE, "14_inline_middle.png"),
  keyboardXml: resolve(EVIDENCE, "19_inline_keyboard_recheck.xml"),
  keyboardPng: resolve(EVIDENCE, "19_inline_keyboard_recheck.png"),
  keyboardIme: resolve(EVIDENCE, "19_inline_keyboard_input_method.txt"),
  bottomXml: resolve(EVIDENCE, "17_inline_bottom_full.xml"),
  bottomPng: resolve(EVIDENCE, "17_inline_bottom_full.png"),
};

type Bounds = { left: number; top: number; right: number; bottom: number };
type AndroidNode = {
  id: string;
  text: string;
  description: string;
  focused: boolean;
  enabled: boolean;
  bounds: Bounds;
};

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(path: string): string {
  return sha256(readFileSync(path));
}

function readText(path: string): string {
  const bytes = readFileSync(path);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString("utf16le");
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.allocUnsafe(bytes.length - 2);
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      swapped[index - 2] = bytes[index + 1];
      swapped[index - 1] = bytes[index];
    }
    return swapped.toString("utf16le");
  }
  return bytes.toString("utf8").replace(/^\ufeff/u, "");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Json)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

function atomicWrite(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}

function decodeXml(value: string): string {
  return value
    .replace(/&#(\d+);/gu, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/gu, "\"")
    .replace(/&apos;/gu, "'")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&amp;/gu, "&");
}

function xmlAttribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`${name}=(?:\"([^\"]*)\"|'([^']*)')`, "u"));
  return decodeXml(match?.[1] ?? match?.[2] ?? "");
}

function parseBounds(value: string): Bounds {
  const match = value.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/u);
  if (!match) throw new Error(`INVALID_ANDROID_BOUNDS:${value}`);
  return {
    left: Number(match[1]),
    top: Number(match[2]),
    right: Number(match[3]),
    bottom: Number(match[4]),
  };
}

function parseAndroidNodes(path: string): AndroidNode[] {
  const xml = readText(path);
  return [...xml.matchAll(/<node\b[^>]*>/gu)].map((match) => {
    const tag = match[0];
    return {
      id: xmlAttribute(tag, "resource-id"),
      text: xmlAttribute(tag, "text"),
      description: xmlAttribute(tag, "content-desc"),
      focused: xmlAttribute(tag, "focused") === "true",
      enabled: xmlAttribute(tag, "enabled") === "true",
      bounds: parseBounds(xmlAttribute(tag, "bounds")),
    };
  });
}

function nodesById(nodes: AndroidNode[], id: string): AndroidNode[] {
  return nodes.filter((node) => node.id === id);
}

function exactNode(nodes: AndroidNode[], id: string): AndroidNode {
  const matches = nodesById(nodes, id);
  if (matches.length !== 1) throw new Error(`EXPECTED_EXACTLY_ONE_NODE:${id}:${matches.length}`);
  return matches[0];
}

function intersects(left: Bounds, right: Bounds): boolean {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

function contains(outer: Bounds, inner: Bounds): boolean {
  return inner.left >= outer.left
    && inner.right <= outer.right
    && inner.top >= outer.top
    && inner.bottom <= outer.bottom;
}

function relativePath(path: string): string {
  return relative(ROOT, path).replace(/\\/gu, "/");
}

function artifact(path: string): Json {
  return {
    path: relativePath(path),
    size_bytes: statSync(path).size,
    sha256: fileSha256(path),
  };
}

function adb(args: string[]): string {
  return execFileSync("adb", ["-s", DEVICE, ...args], { encoding: "utf8", timeout: 30_000 }).trim();
}

function publicCopyViolations(nodes: AndroidNode[]): Json[] {
  const forbidden = /(?:\bbackend\b|\brevision\b|\brelease\b|\bchild\b|\bserver\b|\bbatch[-_ ]?\d*\b|ппр|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b|\b[0-9a-f]{64}\b)/iu;
  return nodes.flatMap((node) => {
    const exposedCopy = `${node.text} ${node.description}`.trim();
    return exposedCopy && forbidden.test(exposedCopy)
      ? [{ id: node.id, exposed_copy: exposedCopy }]
      : [];
  });
}

function main(): void {
  const start = parseAndroidNodes(PATHS.startXml);
  const middle = parseAndroidNodes(PATHS.middleXml);
  const keyboard = parseAndroidNodes(PATHS.keyboardXml);
  const bottom = parseAndroidNodes(PATHS.bottomXml);
  const allAcceptedStates = [start, middle, keyboard, bottom];

  const footer = exactNode(bottom, "consumer-repair-bottom-actions");
  const delivery = exactNode(bottom, "consumer-repair-delivery-card");
  const history = exactNode(bottom, "consumer-repair-history");
  const bottomNavigation = exactNode(bottom, "app-bottom-nav");
  const pdf = exactNode(bottom, "consumer-estimate-make-pdf");
  const approve = exactNode(bottom, "consumer-repair-approve");
  const deleteDraft = exactNode(bottom, "consumer-repair-delete-draft");
  const actionNodes = [pdf, approve, deleteDraft];
  const keyboardIme = readText(PATHS.keyboardIme);
  const buildLog = readText(PATHS.buildLog);
  const bundle = readFileSync(PATHS.bundle);
  const targetedJest = readText(PATHS.targetedJest);
  const productTypecheck = readText(PATHS.productTypecheck);
  const diffCheck = readText(PATHS.diffCheck);
  const chromeSource = readText(resolve("src/features/consumerRepair/ConsumerRepairRequestChrome.tsx"));
  const viewSource = readText(resolve("src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx"));
  const backendRows = readText(PATHS.backendAudit)
    .split(/\r?\n/gu).filter(Boolean).map((line) => JSON.parse(line) as Json);
  const authRows = readText(PATHS.authAudit)
    .split(/\r?\n/gu).filter(Boolean).map((line) => JSON.parse(line) as Json);

  const installedPath = adb(["shell", "pm", "path", PACKAGE])
    .split(/\r?\n/gu).find((line) => line.startsWith("package:"))?.slice(8).trim() ?? "";
  const installedSha256 = adb(["shell", "sha256sum", installedPath]).split(/\s+/u)[0];
  const apiLevel = Number(adb(["shell", "getprop", "ro.build.version.sdk"]));
  const displaySize = adb(["shell", "wm", "size"]);
  const packageDump = adb(["shell", "dumpsys", "package", PACKAGE]);
  const lastUpdateTime = packageDump.match(/lastUpdateTime=([^\r\n]+)/u)?.[1]?.trim() ?? "";

  const targetBackendRows = backendRows.filter((row) => String(row.path).includes(REVISION_ID));
  const targetCatalogRows = backendRows.filter((row) => row.path === `/canonical-estimate/catalog/drywall_ceiling_interior_sound_partition_repair_technical_room?releaseId=${ACCEPTED_RELEASE_ID}`);
  const uiRunBackendMutations = backendRows.filter((row) => String(row.at) >= "2026-08-21T08:38:00.000Z" && row.method !== "GET");
  const recentAuthSessionRows = authRows.filter((row) => String(row.at) >= "2026-08-21T08:38:00.000Z");
  const visibleCopyViolations = allAcceptedStates.flatMap((nodes, index) =>
    publicCopyViolations(nodes).map((violation) => ({ state_index: index, ...violation })));
  const focusedQuantityInputs = keyboard.filter((node) =>
    node.focused && node.id.startsWith("consumer-repair-item-quantity-input-"));

  const assertions = [
    { name: "fresh_gradle_build_successful", passed: buildLog.includes("BUILD SUCCESSFUL in 5m 51s") && buildLog.includes("956 actionable tasks: 956 executed") },
    { name: "fresh_build_forced_without_cache", passed: buildLog.includes(":app:assembleWaterProof --rerun-tasks --no-build-cache --console=plain") },
    { name: "apk_sha256_exact", passed: fileSha256(PATHS.apk) === EXPECTED_APK_SHA256, details: fileSha256(PATHS.apk) },
    { name: "bundle_sha256_exact", passed: fileSha256(PATHS.bundle) === EXPECTED_BUNDLE_SHA256, details: fileSha256(PATHS.bundle) },
    { name: "installed_apk_sha256_exact", passed: installedSha256 === EXPECTED_APK_SHA256, details: installedSha256 },
    { name: "api_level_34", passed: apiLevel === 34, details: apiLevel },
    { name: "physical_display_1080x2400", passed: displaySize.includes("1080x2400"), details: displaySize },
    { name: "source_manifest_embedded_in_bundle", passed: bundle.includes(Buffer.from(PRODUCT_SOURCE_MANIFEST_SHA256)) },
    { name: "local_auth_origin_embedded", passed: bundle.includes(Buffer.from("http://10.0.2.2:8173")) },
    { name: "local_backend_origin_embedded", passed: bundle.includes(Buffer.from("http://10.0.2.2:8767/canonical-estimate")) },
    { name: "target_revision_loaded_200", passed: targetBackendRows.some((row) => row.status === 200 && row.authorizationPresent === true), details: targetBackendRows.length },
    { name: "accepted_catalog_fixture_loaded_200", passed: targetCatalogRows.some((row) => row.status === 200 && row.authorizationPresent === true), details: targetCatalogRows.length },
    { name: "ui_capture_backend_mutations_zero", passed: uiRunBackendMutations.length === 0, details: uiRunBackendMutations.length },
    { name: "local_auth_session_verified", passed: recentAuthSessionRows.some((row) => row.method === "GET" && row.path === "/auth/v1/user" && row.authorizationPresent === true && row.apikeyPresent === true) },
    { name: "cold_reopen_exact_screen", passed: nodesById(start, "consumer-repair-screen").length === 1 && nodesById(start, "consumer-repair-auth-required").length === 0 },
    { name: "cold_reopen_launch_was_cold", passed: readText(PATHS.startLaunch).includes("LaunchState: COLD") },
    { name: "actions_absent_at_start", passed: nodesById(start, "consumer-repair-bottom-actions").length === 0 },
    { name: "actions_absent_in_middle", passed: nodesById(middle, "consumer-repair-bottom-actions").length === 0 },
    { name: "actions_absent_with_keyboard", passed: nodesById(keyboard, "consumer-repair-bottom-actions").length === 0 },
    { name: "quantity_input_focused_with_keyboard", passed: focusedQuantityInputs.length === 1, details: focusedQuantityInputs.length },
    { name: "numeric_ime_visible", passed: keyboardIme.includes("mInputShown=true") && /mServedView=.*ReactEditText/u.test(keyboardIme) },
    { name: "exactly_one_inline_action_owner_at_bottom", passed: nodesById(bottom, "consumer-repair-bottom-actions").length === 1 },
    { name: "exactly_three_expected_actions", passed: actionNodes.length === 3 && actionNodes.every((node) => node.enabled) },
    { name: "exact_public_action_labels", passed: pdf.description === "PDF" && approve.description === "Подтвердить смету" && deleteDraft.description === "Удалить черновик" },
    { name: "delivery_before_history_before_actions", passed: delivery.bounds.bottom < history.bounds.top && history.bounds.bottom < footer.bounds.top },
    { name: "actions_after_last_content", passed: footer.bounds.top > history.bounds.bottom, details: { actions_top: footer.bounds.top, last_content_bottom: history.bounds.bottom } },
    { name: "actions_above_bottom_navigation", passed: footer.bounds.bottom < bottomNavigation.bounds.top, details: { actions_bottom: footer.bounds.bottom, bottom_navigation_top: bottomNavigation.bounds.top } },
    { name: "actions_do_not_intersect_delivery_or_history", passed: !intersects(footer.bounds, delivery.bounds) && !intersects(footer.bounds, history.bounds) },
    { name: "all_action_buttons_inside_footer", passed: actionNodes.every((node) => contains(footer.bounds, node.bounds)) },
    { name: "all_action_buttons_clear_bottom_navigation", passed: actionNodes.every((node) => node.bounds.bottom < bottomNavigation.bounds.top && !intersects(node.bounds, bottomNavigation.bounds)) },
    { name: "forbidden_public_copy_zero", passed: visibleCopyViolations.length === 0, details: visibleCopyViolations },
    { name: "request_route_does_not_import_sticky_bar", passed: !chromeSource.includes("AppStickyActionBar") },
    { name: "inline_actions_render_after_content_inside_scroll", passed: viewSource.indexOf("<ConsumerRepairRequestContent") >= 0 && viewSource.indexOf("<ConsumerRepairRequestStickyActions") > viewSource.indexOf("<ConsumerRepairRequestContent") },
    { name: "targeted_jest_5_suites_9_tests", passed: targetedJest.includes("Test Suites: 5 passed, 5 total") && targetedJest.includes("Tests:       9 passed, 9 total") },
    { name: "product_typecheck_green", passed: productTypecheck.includes("TYPECHECK_PRODUCT_EXIT=0") },
    { name: "git_diff_check_green", passed: diffCheck.includes("GIT_DIFF_CHECK_EXIT=0") },
  ];
  const blockers = assertions.filter((entry) => !entry.passed).map((entry) => entry.name);

  const acceptedStates = {
    cold_reopen_start: {
      xml: artifact(PATHS.startXml),
      png: artifact(PATHS.startPng),
      launch: artifact(PATHS.startLaunch),
      footer_count: nodesById(start, "consumer-repair-bottom-actions").length,
    },
    middle: {
      xml: artifact(PATHS.middleXml),
      png: artifact(PATHS.middlePng),
      footer_count: nodesById(middle, "consumer-repair-bottom-actions").length,
    },
    keyboard: {
      xml: artifact(PATHS.keyboardXml),
      png: artifact(PATHS.keyboardPng),
      input_method: artifact(PATHS.keyboardIme),
      footer_count: nodesById(keyboard, "consumer-repair-bottom-actions").length,
      focused_quantity_input_count: focusedQuantityInputs.length,
    },
    bottom: {
      xml: artifact(PATHS.bottomXml),
      png: artifact(PATHS.bottomPng),
      footer_count: nodesById(bottom, "consumer-repair-bottom-actions").length,
      coordinates: {
        delivery: delivery.bounds,
        history: history.bounds,
        actions: footer.bounds,
        pdf: pdf.bounds,
        approve: approve.bounds,
        delete: deleteDraft.bounds,
        bottom_navigation: bottomNavigation.bounds,
      },
    },
  };

  const base = {
    schema_version: "real-useful-estimates.ui-bottom-actions-android-api34-r1.v1",
    generated_at: new Date().toISOString(),
    scope_status: blockers.length === 0
      ? "GREEN_UI_BOTTOM_ACTIONS_ANDROID_API34_R1_NO_RELEASE"
      : "RED_UI_BOTTOM_ACTIONS_ANDROID_API34_R1",
    overall_program_status: "RED_NOT_PRODUCTION_READY",
    scope: "ConsumerRepairRequestScreen inline bottom estimate actions on real Android API 34",
    source: {
      head: SOURCE_HEAD,
      head_tree: SOURCE_HEAD_TREE,
      branch: "codex/p0-one-monolith-r5",
      product_source_manifest_sha256: PRODUCT_SOURCE_MANIFEST_SHA256,
      product_source_file_count: PRODUCT_SOURCE_FILE_COUNT,
    },
    build: {
      command: "android\\gradlew.bat :app:assembleWaterProof --rerun-tasks --no-build-cache --console=plain",
      apk: artifact(PATHS.apk),
      js_bundle: artifact(PATHS.bundle),
      log: artifact(PATHS.buildLog),
      install_log: artifact(PATHS.installLog),
      installed_path: installedPath,
      installed_sha256: installedSha256,
      package_last_update_time: lastUpdateTime,
      rejected_apks: [
        { sha256: "7dc75cb21616f13662491e3aea01364f70de08778b81c48537985e3730cb8910", reason: "OLD_STICKY_ACTIONS_RED_PROOF" },
        { sha256: "ccaa8f2aa65869e6ecf54695a09981ce5cb33597845eb62ce96507a4adf6e767", reason: "MISSING_LOCAL_AUTH_ENV_RED_PROOF" },
      ],
    },
    device: {
      id: DEVICE,
      api_level: apiLevel,
      display: displaySize,
      package_name: PACKAGE,
    },
    fixture_identity: {
      revision_id: REVISION_ID,
      accepted_release_id: ACCEPTED_RELEASE_ID,
      purpose: "UI fixture only",
      identity_claim: "Previously accepted content identity reused only to render the UI; no new content release was created or accepted.",
      backend_target_rows_200: targetBackendRows.filter((row) => row.status === 200).length,
      catalog_rows_200: targetCatalogRows.filter((row) => row.status === 200).length,
      backend_mutations_during_capture: uiRunBackendMutations.length,
    },
    accepted_states: acceptedStates,
    verification: {
      targeted_jest: artifact(PATHS.targetedJest),
      product_typecheck: artifact(PATHS.productTypecheck),
      git_diff_check: artifact(PATHS.diffCheck),
      known_scripts_shard_red: artifact(PATHS.scriptsTypecheckRed),
      backend_audit: artifact(PATHS.backendAudit),
      auth_audit: artifact(PATHS.authAudit),
      diagnostic_build_identity_nodes_excluded_from_public_copy_scan: true,
      public_copy_violations: visibleCopyViolations,
    },
    assertions,
    blockers,
    remaining_program_blockers: [
      "BATCH001_AFTER_16_REAL_COMPOSITIONS_R1 not yet closed with human engineer acceptance",
      "BATCH002 claim-to-source matrix not yet closed",
      "BATCH003 and later work must not start before earlier gates close",
      "repository-wide scripts typecheck shard remains RED and is not represented as UI GREEN",
    ],
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
  };
  const result = { ...base, content_sha256: sha256(canonical(base)) };
  atomicWrite(OUTPUT_JSON, `${JSON.stringify(result, null, 2)}\n`);

  const checkLines = assertions.map((entry) => `| ${entry.passed ? "PASS" : "FAIL"} | ${entry.name} |`).join("\n");
  const md = `# UI_BOTTOM_ACTIONS_ANDROID_API34_R1

Статус узкого UI-гейта: **${result.scope_status}**. Общий статус программы: **${result.overall_program_status}**.

Новый env-bound APK имеет SHA-256 \`${EXPECTED_APK_SHA256}\`, установленный APK имеет тот же SHA. Старые APK \`7dc…8910\` и \`ccaa…e767\` оставлены только как RED-доказательства и не участвуют в GREEN.

## Runtime-результат

- Cold reopen и верх формы: action-footer отсутствует.
- Середина формы: action-footer отсутствует.
- Открытая цифровая клавиатура: поле количества сфокусировано, IME показана, action-footer отсутствует.
- Низ формы: ровно один inline-footer после доставки и истории; видны ровно три действия — «PDF», «Подтвердить смету», «Удалить черновик».
- Координаты: история заканчивается на y=${history.bounds.bottom}, footer начинается на y=${footer.bounds.top}; footer заканчивается на y=${footer.bounds.bottom}, нижняя навигация начинается на y=${bottomNavigation.bounds.top}.
- Запрещённые технические слова, UUID и SHA в пользовательских text/content-desc: ${visibleCopyViolations.length}.
- Build identity передаётся только через внешний evidence log; UI-узла и исключений из copy-scan нет.

## Identity и границы

Revision \`${REVISION_ID}\` и ранее принятый release \`${ACCEPTED_RELEASE_ID}\` использованы только как неизменяемая UI-фикстура. Во время съёмки backend mutations: ${uiRunBackendMutations.length}. Новый content release не создавался и не принимался.

Не выполнялись merge, push, deploy, OTA, release или BATCH-009.

## Проверки

| Результат | Проверка |
|---|---|
${checkLines}

## Честный общий статус

Этот документ закрывает только Android API 34 UI-gate кнопок. Вся программа остаётся RED / NOT_PRODUCTION_READY до закрытия BATCH-001, BATCH-002 и последующих обязательных этапов; repository-wide scripts typecheck также остаётся RED и не маскируется этим UI-GREEN.

JSON content SHA-256: \`${result.content_sha256}\`.
`;
  atomicWrite(OUTPUT_MD, md);

  if (blockers.length > 0) {
    throw new Error(`UI_BOTTOM_ACTIONS_ANDROID_API34_R1_BLOCKED:${blockers.join(",")}`);
  }
  process.stdout.write(`${JSON.stringify({
    status: result.scope_status,
    overall_program_status: result.overall_program_status,
    json: relativePath(OUTPUT_JSON),
    json_sha256: fileSha256(OUTPUT_JSON),
    markdown: relativePath(OUTPUT_MD),
    markdown_sha256: fileSha256(OUTPUT_MD),
    content_sha256: result.content_sha256,
    assertions: assertions.length,
    blockers,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
