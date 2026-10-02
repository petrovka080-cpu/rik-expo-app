import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { computeReleaseFingerprints } from "../release/computeReleaseFingerprints";
import { buildAndroidDeepLinkLaunchArgs } from "./androidDeepLinkLaunchContract";
import { loadOfficeMarketLiveEnv } from "./officeMarketLiveHarnessContracts";
import {
  buildDevClientUri,
  setupAndroidRuntime,
  sleep,
} from "./androidRouteBootstrapHarness";
import {
  bounds,
  dumpUi,
  nodeById,
  nodeHasId,
  replaceField,
  seekNode,
  tapById,
  tapNode,
  waitForSnapshot,
  type UiNode,
} from "./r4A6AndroidAcceptedUiRuntime";

const PROJECT_ROOT = process.cwd();
loadOfficeMarketLiveEnv(PROJECT_ROOT);
const DEVICE_ID = String(process.env.OFFICE_E2E_ANDROID_DEVICE_ID ?? "emulator-5554").trim();
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const EXPECTED_PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const runStartedAt = new Date().toISOString();
const runId = runStartedAt.replace(/[:.]/gu, "-");
const artifactDir = path.join(
  PROJECT_ROOT,
  ".release-runtime",
  "office-ai-market-live-native-actions",
  runId,
);
const summaryPath = path.join(artifactDir, "summary.json");
const progressPath = path.join(artifactDir, "progress.log");
const PHOTO_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

type RoleKey = "BUYER" | "FOREMAN";

type WebSummary = {
  final_status?: string;
  source_sha?: string;
  office?: {
    manual_request_id?: string;
    foreman_manual_draft_summary_after_add?: string;
  };
  role_auth?: { same_company_for_required_roles?: boolean };
};

type SmokeSummary = {
  final_status?: string;
  source_sha?: string;
  android_api?: number;
  device_id?: string;
  all_six_native_role_sessions_passed?: boolean;
  role_isolation?: boolean;
  app_data_cleared?: boolean;
  roles?: { role?: string; signed_out_via_native_ui?: boolean }[];
};

type ActionsSummary = {
  contract?: string;
  final_status?: string;
  source_sha?: string;
  product_source_hash?: string;
  android_api?: number;
  buyer_rfq?: Record<string, unknown>;
  market?: Record<string, unknown>;
};

type ActionsResumeState = {
  buyerResumed: boolean;
  marketResumed: boolean;
  marketListingId: string | null;
  marketTitle: string | null;
};

const result: Record<string, unknown> & {
  final_status: string;
  buyer_rfq: Record<string, unknown>;
  market: Record<string, unknown>;
  error_step: string | null;
  error_message: string | null;
} = {
  contract: "rik-expo-app.s27-6.office-market-live.native-actions.v1",
  final_status: "STOP_OFFICE_MARKET_NATIVE_ACTIONS_NOT_FINISHED",
  run_started_at: runStartedAt,
  artifact_dir: path.relative(PROJECT_ROOT, artifactDir).replace(/\\/gu, "/"),
  device_id: DEVICE_ID,
  android_api: null,
  package_name: PACKAGE_NAME,
  source_sha: null,
  product_source_hash: null,
  dirty_fingerprint: null,
  linked_web_summary: null,
  linked_role_smoke_summary: null,
  resumed_from_actions_summary: null,
  native_app_used: true,
  chrome_used: false,
  app_data_cleared: false,
  apk_built: false,
  apk_installed: false,
  emulator_wiped: false,
  service_role_used: false,
  developer_role_override_used: false,
  production_touched: false,
  buyer_rfq: {
    native_ui_published: false,
    request_id: null,
    request_item_id: null,
    tender_id: null,
    persisted_readback: false,
    exact_item_linked: false,
    native_reopen: false,
  },
  market: {
    native_ui_created: false,
    draft_photo_uploaded: false,
    draft_photo_replaced: false,
    draft_photo_removed: false,
    draft_photo_readded: false,
    listing_id: null,
    persisted_readback: false,
    media_link_readback: false,
    public_image_fetch_ok: false,
    native_detail_reopen: false,
    native_owner_history_reopen: false,
  },
  error_step: null,
  error_message: null,
};

let currentStep = "bootstrap";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/gu, "")) as T;
}

function writeSummary(): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

function mark(step: string, details: Record<string, unknown> = {}): void {
  currentStep = step;
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.appendFileSync(progressPath, `${new Date().toISOString()} ${JSON.stringify({ step, ...details })}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ step, ...details })}\n`);
}

function run(command: string, args: string[], timeoutMs = 30_000): { ok: boolean; output: string } {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: timeoutMs,
      }).trim(),
    };
  } catch (error) {
    const record = error as { stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
    return {
      ok: false,
      output: `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim(),
    };
  }
}

function adb(args: string[], timeoutMs = 30_000): { ok: boolean; output: string } {
  return run("adb", ["-s", DEVICE_ID, ...args], timeoutMs);
}

function git(args: string[]): string {
  const command = run("git", args, 30_000);
  invariant(command.ok, `STOP_GIT_${args.join("_").toUpperCase()}_FAILED`);
  return command.output;
}

function roleCredentials(key: RoleKey): { email: string; password: string } {
  const email = clean(process.env[`E2E_${key}_EMAIL`]);
  const password = clean(process.env[`E2E_${key}_PASSWORD`]);
  invariant(email && password, `STOP_${key}_CREDENTIALS_MISSING`);
  return { email, password };
}

function assertRuntimeConfig(): void {
  invariant(clean(process.env.LIVE_E2E) === "1", "STOP_LIVE_E2E_ENV_REQUIRED");
  const target = clean(process.env.OFFICE_E2E_TARGET_ENV || process.env.APP_ENV || "staging").toLowerCase();
  const projectRef = clean(process.env.STAGING_SUPABASE_PROJECT_REF || EXPECTED_PROJECT_REF);
  const url = clean(process.env.STAGING_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL);
  invariant(target !== "production" && clean(process.env.APP_ENV).toLowerCase() !== "production", "STOP_PRODUCTION_NOT_ALLOWED");
  invariant(!/^(1|true|yes)$/iu.test(clean(process.env.ALLOW_PRODUCTION)), "STOP_PRODUCTION_NOT_ALLOWED");
  invariant(projectRef === EXPECTED_PROJECT_REF && url.includes(EXPECTED_PROJECT_REF), "STOP_STAGING_PROJECT_REF_MISMATCH");
  invariant(Boolean(clean(process.env.OFFICE_E2E_COMPANY_ID)), "STOP_OFFICE_E2E_COMPANY_ID_MISSING");
  roleCredentials("BUYER");
  roleCredentials("FOREMAN");
}

function resolveEvidence(): { web: WebSummary; smoke: SmokeSummary } {
  const webPath = path.resolve(clean(process.env.OFFICE_E2E_SOURCE_WEB_SUMMARY));
  const smokePath = path.resolve(clean(process.env.OFFICE_E2E_SOURCE_NATIVE_SMOKE_SUMMARY));
  invariant(fs.existsSync(webPath), "STOP_LINKED_WEB_SUMMARY_MISSING");
  invariant(fs.existsSync(smokePath), "STOP_LINKED_NATIVE_SMOKE_SUMMARY_MISSING");
  const web = readJson<WebSummary>(webPath);
  const smoke = readJson<SmokeSummary>(smokePath);
  invariant(web.final_status === "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS", "STOP_LINKED_WEB_NOT_GREEN");
  invariant(web.role_auth?.same_company_for_required_roles === true, "STOP_LINKED_WEB_COMPANY_PROOF_MISSING");
  invariant(Boolean(web.office?.manual_request_id), "STOP_LINKED_WEB_REQUEST_MISSING");
  invariant(
    smoke.final_status === "GREEN_OFFICE_AI_MARKET_NATIVE_ROLE_GUARD_READ_SMOKE_NO_BUILD_NO_APP_DATA_CLEAR",
    "STOP_LINKED_NATIVE_SMOKE_NOT_GREEN",
  );
  invariant(
    smoke.android_api === 34 &&
      smoke.device_id === DEVICE_ID &&
      smoke.all_six_native_role_sessions_passed === true &&
      smoke.role_isolation === true &&
      smoke.app_data_cleared === false &&
      smoke.roles?.length === 6 &&
      smoke.roles.every((role) => role.signed_out_via_native_ui === true),
    "STOP_LINKED_NATIVE_SMOKE_SCOPE_INVALID",
  );
  result.linked_web_summary = path.relative(PROJECT_ROOT, webPath).replace(/\\/gu, "/");
  result.linked_role_smoke_summary = path.relative(PROJECT_ROOT, smokePath).replace(/\\/gu, "/");
  return { web, smoke };
}

function assertDeviceReady(): void {
  const devices = run("adb", ["devices"], 15_000);
  invariant(devices.ok && devices.output.includes(`${DEVICE_ID}\tdevice`), "STOP_ANDROID_DEVICE_NOT_READY");
  const api = adb(["shell", "getprop", "ro.build.version.sdk"], 10_000);
  invariant(api.ok && api.output === "34", "STOP_ANDROID_API_34_REQUIRED");
  const installed = adb(["shell", "pm", "path", PACKAGE_NAME], 20_000);
  invariant(installed.ok && installed.output.startsWith("package:"), "STOP_NATIVE_APP_NOT_INSTALLED");
  result.android_api = 34;
}

function snapshotHasId(id: string): boolean {
  return Boolean(nodeById(dumpUi("adb", DEVICE_ID), id));
}

async function openRoute(route: string, label: string): Promise<void> {
  const url = new URL(`rik:///${route.replace(/^\//u, "")}`);
  url.searchParams.set("nativeActionRun", runId);
  mark("native_route_open", { label, route });
  const launched = run(
    "adb",
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, url.toString(), PACKAGE_NAME),
    60_000,
  );
  invariant(launched.ok, `STOP_NATIVE_ROUTE_LAUNCH_FAILED:${label}`);
  await sleep(750);
}

async function bootstrapDevClient(): Promise<void> {
  mark("native_dev_client_bootstrap_start", { metroPort: 8_081 });
  const launched = run(
    "adb",
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, buildDevClientUri(8_081), PACKAGE_NAME),
    60_000,
  );
  invariant(launched.ok, "STOP_NATIVE_DEV_CLIENT_LAUNCH_FAILED");
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = dumpUi("adb", DEVICE_ID);
    invariant(!nodeById(snapshot, "config-recovery-state"), "STOP_NATIVE_CONFIG_RECOVERY_VISIBLE");
    if (
      nodeById(snapshot, "auth.login.screen") ||
      nodeById(snapshot, "app-bottom-nav") ||
      nodeById(snapshot, "profile.logout.button")
    ) {
      mark("native_dev_client_bootstrap_done");
      return;
    }
    const server = snapshot.nodes.find((node) =>
      node.enabled &&
      (node.text.includes("127.0.0.1:8081") || node.text.includes("10.0.2.2:8081") ||
        node.contentDesc.includes("127.0.0.1:8081") || node.contentDesc.includes("10.0.2.2:8081")),
    );
    if (server) tapNode("adb", DEVICE_ID, server);
    const resume = snapshot.nodes.find((node) => node.enabled && /^(?:Continue|Reload)$/iu.test(node.text.trim()));
    if (resume) tapNode("adb", DEVICE_ID, resume);
    await sleep(900);
  }
  throw new Error("STOP_NATIVE_DEV_CLIENT_BOOTSTRAP_TIMEOUT");
}

async function ensureLoginScreen(): Promise<void> {
  if (snapshotHasId("auth.login.screen")) return;
  await openRoute("/profile", "profile_for_logout");
  const ready = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) =>
      Boolean(nodeById(snapshot, "auth.login.screen")) ||
      Boolean(nodeById(snapshot, "app-bottom-nav")) ||
      Boolean(nodeById(snapshot, "profile.logout.button")),
    90_000,
  );
  if (nodeById(ready, "auth.login.screen")) return;
  const found = await seekNode(
    "adb",
    DEVICE_ID,
    (node) => nodeHasId(node, "profile.logout.button") && node.enabled,
    55,
    "fine",
  );
  invariant(found.node && tapNode("adb", DEVICE_ID, found.node), "STOP_NATIVE_SIGN_OUT_TAP_FAILED");
  const confirmation = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some((node) =>
      node.enabled && node.clickable &&
      (nodeHasId(node, "android:id/button1") || node.text.trim().toLocaleLowerCase("ru-RU") === "выйти")),
    15_000,
  );
  const confirmNode = confirmation.nodes.find((node) =>
    node.enabled && node.clickable &&
    (nodeHasId(node, "android:id/button1") || node.text.trim().toLocaleLowerCase("ru-RU") === "выйти"));
  invariant(confirmNode && tapNode("adb", DEVICE_ID, confirmNode), "STOP_NATIVE_SIGN_OUT_CONFIRM_FAILED");
  const login = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => Boolean(nodeById(snapshot, "auth.login.screen")),
    60_000,
  );
  invariant(nodeById(login, "auth.login.screen"), "STOP_NATIVE_LOGIN_SCREEN_NOT_RESTORED");
}

async function loginRole(key: RoleKey): Promise<void> {
  await ensureLoginScreen();
  const credentials = roleCredentials(key);
  mark("native_role_login_start", { role: key.toLowerCase() });
  invariant(await replaceField("adb", DEVICE_ID, "auth.login.email", credentials.email), `STOP_${key}_EMAIL_INPUT_FAILED`);
  invariant(await replaceField("adb", DEVICE_ID, "auth.login.password", credentials.password), `STOP_${key}_PASSWORD_INPUT_FAILED`);
  invariant(await tapById("adb", DEVICE_ID, "auth.login.submit", 8), `STOP_${key}_LOGIN_SUBMIT_FAILED`);
  const signedIn = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => Boolean(nodeById(snapshot, "app-bottom-nav")),
    90_000,
  );
  invariant(nodeById(signedIn, "app-bottom-nav"), `STOP_${key}_NATIVE_LOGIN_FAILED`);
  mark("native_role_login_done", { role: key.toLowerCase() });
}

async function passFioIfRequired(role: "buyer" | "foreman"): Promise<void> {
  let snapshot = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (candidate) =>
      Boolean(nodeById(candidate, `office-role-auth-context-${role}`)) ||
      Boolean(nodeById(candidate, "warehouse-fio-confirm")),
    90_000,
  );
  if (nodeById(snapshot, `office-role-auth-context-${role}`)) {
    // The role shell can render just before the daily FIO modal opens.
    await sleep(2_500);
    snapshot = dumpUi("adb", DEVICE_ID);
    if (!nodeById(snapshot, "warehouse-fio-confirm")) return;
  }
  const input = nodeById(snapshot, "warehouse-fio-input");
  const text = input?.text.trim() ?? "";
  if (!text || text === "Фамилия Имя Отчество") {
    invariant(
      await replaceField("adb", DEVICE_ID, "warehouse-fio-input", `Office E2E ${role}`),
      `STOP_${role.toUpperCase()}_FIO_INPUT_FAILED`,
    );
  }
  const enabled = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (candidate) => candidate.nodes.some((node) =>
      nodeHasId(node, "warehouse-fio-confirm") && node.enabled),
    15_000,
  );
  const confirm = enabled.nodes.find((node) => nodeHasId(node, "warehouse-fio-confirm") && node.enabled);
  invariant(confirm && tapNode("adb", DEVICE_ID, confirm), `STOP_${role.toUpperCase()}_FIO_CONFIRM_FAILED`);
  const restored = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (candidate) => Boolean(nodeById(candidate, `office-role-auth-context-${role}`)),
    60_000,
  );
  invariant(nodeById(restored, `office-role-auth-context-${role}`), `STOP_${role.toUpperCase()}_ROLE_SHELL_AFTER_FIO_MISSING`);
}

function stagingClient() {
  const url = clean(process.env.STAGING_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL);
  const key = clean(process.env.STAGING_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  invariant(url && key, "STOP_STAGING_SUPABASE_CONFIG_MISSING");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signInReadbackRole(key: RoleKey) {
  const client = stagingClient();
  const credentials = roleCredentials(key);
  const auth = await client.auth.signInWithPassword(credentials);
  invariant(!auth.error && auth.data.user, `STOP_${key}_READBACK_LOGIN_FAILED`);
  return { client, userId: auth.data.user.id };
}

async function poll<T>(label: string, fn: () => Promise<T | null>, timeoutMs = 60_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(800);
  }
  throw new Error(`STOP_POLL_TIMEOUT:${label}:${lastError instanceof Error ? lastError.message : "no_result"}`);
}

async function readbackMarketMedia(
  client: ReturnType<typeof stagingClient>,
  listingId: string,
): Promise<boolean> {
  const links = await client
    .from("media_links")
    .select("media_asset_id,target_type,target_id,purpose,link_status,final_linked_by_human,marketplace_visible")
    .eq("target_type", "marketplace_product")
    .eq("target_id", listingId)
    .eq("purpose", "product_photo");
  invariant(!links.error && links.data?.length === 1, "STOP_MARKET_MEDIA_LINK_READBACK_FAILED");
  const link = links.data[0];
  const media = await client
    .from("media_assets")
    .select("id,storage_bucket,storage_key,mime_type,byte_size,public_marketplace_visible,final_linked_by_human")
    .eq("id", link.media_asset_id)
    .maybeSingle();
  invariant(!media.error && media.data, "STOP_MARKET_MEDIA_ASSET_READBACK_FAILED");
  const linked =
    link.link_status === "human_confirmed" &&
    link.final_linked_by_human === true &&
    link.marketplace_visible === true &&
    media.data.storage_bucket === "public-marketplace-media" &&
    media.data.public_marketplace_visible === true &&
    media.data.final_linked_by_human === true &&
    Number(media.data.byte_size) > 0 &&
    clean(media.data.mime_type).startsWith("image/");
  const publicUrl = `${clean(process.env.STAGING_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL)}/storage/v1/object/public/${media.data.storage_bucket}/${media.data.storage_key}`;
  const image = await fetch(publicUrl, { signal: AbortSignal.timeout(30_000) });
  const body = image.ok ? Buffer.from(await image.arrayBuffer()) : Buffer.alloc(0);
  result.market.media_link_readback = linked;
  result.market.public_image_fetch_ok =
    image.ok && body.length > 0 && clean(image.headers.get("content-type")).startsWith("image/");
  return linked && result.market.public_image_fetch_ok === true;
}

async function resumeActionsIfRequested(
  web: WebSummary,
  sourceSha: string,
  productSourceHash: string,
): Promise<ActionsResumeState> {
  const configuredPath = clean(process.env.OFFICE_E2E_NATIVE_ACTIONS_RESUME_SUMMARY);
  if (!configuredPath) {
    return { buyerResumed: false, marketResumed: false, marketListingId: null, marketTitle: null };
  }
  const resumePath = path.resolve(configuredPath);
  invariant(fs.existsSync(resumePath), "STOP_NATIVE_ACTIONS_RESUME_SUMMARY_MISSING");
  const resume = readJson<ActionsSummary>(resumePath);
  invariant(resume.contract === result.contract, "STOP_NATIVE_ACTIONS_RESUME_CONTRACT_MISMATCH");
  invariant(resume.source_sha === sourceSha, "STOP_NATIVE_ACTIONS_RESUME_SOURCE_SHA_MISMATCH");
  invariant(resume.product_source_hash === productSourceHash, "STOP_NATIVE_ACTIONS_RESUME_PRODUCT_HASH_MISMATCH");
  invariant(resume.android_api === 34, "STOP_NATIVE_ACTIONS_RESUME_API_MISMATCH");
  const buyer = resume.buyer_rfq ?? {};
  const requestId = clean(buyer.request_id);
  const requestItemId = clean(buyer.request_item_id);
  const tenderId = clean(buyer.tender_id);
  invariant(
    requestId === clean(web.office?.manual_request_id) &&
      requestItemId &&
      tenderId &&
      buyer.native_ui_published === true &&
      buyer.persisted_readback === true &&
      buyer.exact_item_linked === true &&
      buyer.native_reopen === true,
    "STOP_NATIVE_ACTIONS_RESUME_BUYER_PROOF_RED",
  );
  const readback = await signInReadbackRole("BUYER");
  const tender = await readback.client
    .from("tenders")
    .select("id,status,created_by")
    .eq("id", tenderId)
    .eq("created_by", readback.userId)
    .maybeSingle();
  const item = await readback.client
    .from("tender_items")
    .select("id,tender_id,request_item_id")
    .eq("tender_id", tenderId)
    .eq("request_item_id", requestItemId)
    .maybeSingle();
  await readback.client.auth.signOut();
  invariant(
    !tender.error && tender.data?.status === "published" &&
      !item.error && item.data?.request_item_id === requestItemId,
    "STOP_NATIVE_ACTIONS_RESUME_BUYER_READBACK_RED",
  );
  result.buyer_rfq = {
    native_ui_published: true,
    request_id: requestId,
    request_item_id: requestItemId,
    tender_id: tenderId,
    persisted_readback: true,
    exact_item_linked: true,
    native_reopen: true,
  };
  result.resumed_from_actions_summary = path.relative(PROJECT_ROOT, resumePath).replace(/\\/gu, "/");
  mark("native_buyer_rfq_resume_verified", { tenderIdHash: sha256(tenderId).slice(0, 16) });

  const resumedMarket = resume.market ?? {};
  const marketListingId = clean(resumedMarket.listing_id);
  if (!marketListingId) {
    invariant(resumedMarket.native_ui_created !== true, "STOP_NATIVE_ACTIONS_RESUME_MARKET_PROOF_INCONSISTENT");
    return { buyerResumed: true, marketResumed: false, marketListingId: null, marketTitle: null };
  }
  invariant(
    resumedMarket.native_ui_created === true &&
      resumedMarket.draft_photo_uploaded === true &&
      resumedMarket.draft_photo_replaced === true &&
      resumedMarket.draft_photo_removed === true &&
      resumedMarket.draft_photo_readded === true &&
      resumedMarket.persisted_readback === true,
    "STOP_NATIVE_ACTIONS_RESUME_MARKET_PROOF_RED",
  );
  const marketReadback = await signInReadbackRole("FOREMAN");
  const listing = await marketReadback.client
    .from("market_listings")
    .select("id,title,user_id,status,kind,price,city")
    .eq("id", marketListingId)
    .eq("user_id", marketReadback.userId)
    .maybeSingle();
  invariant(
    !listing.error && listing.data && listing.data.status === "active" &&
      listing.data.kind === "service" && listing.data.price === 427,
    "STOP_NATIVE_ACTIONS_RESUME_MARKET_LISTING_READBACK_RED",
  );
  result.market = {
    native_ui_created: true,
    draft_photo_uploaded: true,
    draft_photo_replaced: true,
    draft_photo_removed: true,
    draft_photo_readded: true,
    listing_id: marketListingId,
    persisted_readback: true,
    media_link_readback: false,
    public_image_fetch_ok: false,
    native_detail_reopen: false,
    native_owner_history_reopen: false,
  };
  invariant(
    await readbackMarketMedia(marketReadback.client, marketListingId),
    "STOP_NATIVE_ACTIONS_RESUME_MARKET_MEDIA_READBACK_RED",
  );
  await marketReadback.client.auth.signOut();
  mark("native_market_resume_readback_verified", { listingIdHash: sha256(marketListingId).slice(0, 16) });
  return {
    buyerResumed: true,
    marketResumed: true,
    marketListingId,
    marketTitle: clean(listing.data.title),
  };
}

async function runBuyerRfq(web: WebSummary): Promise<void> {
  const requestId = clean(web.office?.manual_request_id);
  const marker = `s27-6-native-rfq-${runId}`;
  const readback = await signInReadbackRole("BUYER");
  const inbox = await readback.client.rpc("list_buyer_inbox", { p_company_id: null });
  invariant(!inbox.error && Array.isArray(inbox.data), "STOP_BUYER_INBOX_READBACK_FAILED");
  const requestRows = inbox.data.filter((row) => clean(row.request_id) === requestId);
  invariant(requestRows.length > 0, "STOP_BUYER_LINKED_REQUEST_ITEM_MISSING");
  const requestNumber = clean(requestRows[0]?.request_id_old);
  invariant(requestNumber, "STOP_BUYER_LINKED_REQUEST_NUMBER_MISSING");
  const allowedItemIds = new Set(requestRows.map((row) => clean(row.request_item_id)).filter(Boolean));
  result.buyer_rfq.request_id = requestId;

  await loginRole("BUYER");
  await openRoute("/office/buyer", "buyer_rfq_action");
  await passFioIfRequired("buyer");
  invariant(await replaceField("adb", DEVICE_ID, "buyer-search-input", requestNumber), "STOP_BUYER_REQUEST_SEARCH_FAILED");
  invariant(
    await tapById("adb", DEVICE_ID, `buyer-group-open-${requestId}`, 24),
    "STOP_BUYER_REQUEST_OPEN_FAILED",
  );
  mark("native_buyer_request_opened", { requestNumber });
  const foundItem = await seekNode(
    "adb",
    DEVICE_ID,
    (node) =>
      node.resourceId.startsWith("buyer-item-toggle-") &&
      allowedItemIds.has(node.resourceId.slice("buyer-item-toggle-".length)) &&
      node.enabled,
    24,
  );
  const itemNode = foundItem.node;
  invariant(itemNode && tapNode("adb", DEVICE_ID, itemNode), "STOP_BUYER_ITEM_TOGGLE_FAILED");
  const itemId = itemNode.resourceId.slice("buyer-item-toggle-".length);
  const item = requestRows.find((row) => clean(row.request_item_id) === itemId);
  invariant(item, "STOP_BUYER_SELECTED_ITEM_READBACK_MISSING");
  result.buyer_rfq.request_item_id = itemId;
  invariant(await tapById("adb", DEVICE_ID, "buyer-rfq-open", 36), "STOP_BUYER_RFQ_OPEN_FAILED");
  invariant(await replaceField("adb", DEVICE_ID, "buyer-rfq-delivery-days", "2"), "STOP_BUYER_RFQ_DAYS_FAILED");
  invariant(await replaceField("adb", DEVICE_ID, "buyer-rfq-city", "Bishkek"), "STOP_BUYER_RFQ_CITY_FAILED");
  invariant(await replaceField("adb", DEVICE_ID, "buyer-rfq-address", "S27-6 isolated staging point"), "STOP_BUYER_RFQ_ADDRESS_FAILED");
  invariant(await replaceField("adb", DEVICE_ID, "buyer-rfq-window", "09:00-18:00"), "STOP_BUYER_RFQ_WINDOW_FAILED");
  invariant(await replaceField("adb", DEVICE_ID, "buyer-rfq-phone", "700000111"), "STOP_BUYER_RFQ_PHONE_FAILED");
  invariant(await replaceField("adb", DEVICE_ID, "buyer-rfq-email", "buyer-native-s276@example.test"), "STOP_BUYER_RFQ_EMAIL_FAILED");
  invariant(await replaceField("adb", DEVICE_ID, "buyer-rfq-note", marker), "STOP_BUYER_RFQ_NOTE_FAILED");
  invariant(await tapById("adb", DEVICE_ID, "buyer-rfq-publish", 55), "STOP_BUYER_RFQ_PUBLISH_TAP_FAILED");
  const alert = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => snapshot.text.includes("Торги опубликованы"),
    90_000,
  );
  invariant(alert.text.includes("Торги опубликованы"), "STOP_BUYER_RFQ_SUCCESS_ALERT_MISSING");
  const ok = alert.nodes.find((node) => node.enabled && node.clickable && nodeHasId(node, "android:id/button1"));
  if (ok) tapNode("adb", DEVICE_ID, ok);
  result.buyer_rfq.native_ui_published = true;

  const tender = await poll("buyer_rfq_persisted", async () => {
    const query = await readback.client
      .from("tenders")
      .select("id,created_by,status,note,city,address_text,contact_email,contact_phone,deadline_at")
      .eq("created_by", readback.userId)
      .eq("note", marker)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (query.error) throw query.error;
    return query.data;
  }, 90_000);
  const tenderItems = await readback.client
    .from("tender_items")
    .select("id,tender_id,request_item_id,name_human,qty,uom")
    .eq("tender_id", tender.id)
    .eq("request_item_id", itemId);
  invariant(!tenderItems.error && tenderItems.data?.length === 1, "STOP_BUYER_RFQ_ITEM_READBACK_FAILED");
  result.buyer_rfq.tender_id = tender.id;
  result.buyer_rfq.persisted_readback = tender.status === "published" && tender.note === marker;
  result.buyer_rfq.exact_item_linked = tenderItems.data[0]?.request_item_id === itemId;
  invariant(result.buyer_rfq.persisted_readback && result.buyer_rfq.exact_item_linked, "STOP_BUYER_RFQ_PERSISTED_STATE_RED");

  await openRoute(`/auction/${tender.id}`, "buyer_rfq_native_reopen");
  const reopened = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => snapshot.text.includes(marker) && snapshot.text.includes(clean(item.name_human)),
    60_000,
  );
  result.buyer_rfq.native_reopen = reopened.text.includes(marker) && reopened.text.includes(clean(item.name_human));
  invariant(result.buyer_rfq.native_reopen, "STOP_BUYER_RFQ_NATIVE_REOPEN_FAILED");
  await readback.client.auth.signOut();
  await ensureLoginScreen();
  mark("native_buyer_rfq_done", { tenderIdHash: sha256(tender.id).slice(0, 16) });
}

function pickerMediaNode(nodes: UiNode[]): UiNode | null {
  return nodes.find((node) =>
    node.packageName === "com.google.android.providers.media.module" &&
    node.clickable &&
    Boolean(bounds(node) && (bounds(node)?.top ?? 0) >= 300 && (bounds(node)?.bottom ?? 2_401) <= 2_300) &&
    /Photo taken|Image|Photo/iu.test(node.contentDesc),
  ) ?? null;
}

async function choosePreparedPhoto(): Promise<void> {
  const picker = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => Boolean(pickerMediaNode(snapshot.nodes)),
    45_000,
  );
  const media = pickerMediaNode(picker.nodes);
  invariant(media && tapNode("adb", DEVICE_ID, media), "STOP_MARKET_SYSTEM_PHOTO_PICK_FAILED");
  let review = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) =>
      Boolean(nodeById(snapshot, "mobile-photo-use")) ||
      Boolean(nodeById(snapshot, "marketplace.media.entrypoints.thumbnail.upload-status.0")) ||
      Boolean(nodeById(snapshot, "button_add")),
    45_000,
  );
  const pickerAdd = nodeById(review, "button_add");
  if (pickerAdd) {
    invariant(tapNode("adb", DEVICE_ID, pickerAdd), "STOP_MARKET_SYSTEM_PHOTO_ADD_FAILED");
    review = await waitForSnapshot(
      "adb",
      DEVICE_ID,
      (snapshot) =>
        Boolean(nodeById(snapshot, "mobile-photo-use")) ||
        Boolean(nodeById(snapshot, "marketplace.media.entrypoints.thumbnail.upload-status.0")),
      45_000,
    );
  }
  const usePhoto = nodeById(review, "mobile-photo-use");
  if (usePhoto) {
    invariant(tapNode("adb", DEVICE_ID, usePhoto), "STOP_MARKET_PHOTO_REVIEW_CONFIRM_FAILED");
  }
  const uploaded = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => {
      const status = nodeById(snapshot, "marketplace.media.entrypoints.thumbnail.upload-status.0");
      const settledSuggestion = Boolean(
        nodeById(snapshot, "marketplace.media.entrypoints.suggestion.change") &&
        !snapshot.text.includes("Проверяю товар...") &&
        !snapshot.text.includes("Не удалось загрузить фото.") &&
        !snapshot.text.includes("Не удалось заменить фото."),
      );
      return status?.text.trim() === "Загружено" || settledSuggestion;
    },
    120_000,
  );
  const settledSuggestion = Boolean(
    nodeById(uploaded, "marketplace.media.entrypoints.suggestion.change") &&
    !uploaded.text.includes("Проверяю товар...") &&
    !uploaded.text.includes("Не удалось загрузить фото.") &&
    !uploaded.text.includes("Не удалось заменить фото."),
  );
  invariant(
    nodeById(uploaded, "marketplace.media.entrypoints.thumbnail.upload-status.0")?.text.trim() === "Загружено" ||
      settledSuggestion,
    "STOP_MARKET_PHOTO_UPLOAD_NOT_COMPLETE",
  );
}

async function openGalleryAndChoosePreparedPhoto(
  buttonId: string,
  fallbackButtonId?: string,
): Promise<void> {
  const button = await seekMarketFormNode(buttonId, 0)
    ?? (fallbackButtonId ? await seekMarketFormNode(fallbackButtonId, 0) : null)
    ?? await seekMarketFormNode(buttonId)
    ?? (fallbackButtonId ? await seekMarketFormNode(fallbackButtonId) : null);
  invariant(button && tapNode("adb", DEVICE_ID, button), `STOP_MARKET_GALLERY_ACTION_FAILED:${buttonId}`);
  await choosePreparedPhoto();
}

function marketNodeInsideFormViewport(node: UiNode): boolean {
  const box = bounds(node);
  return Boolean(box && box.top >= 300 && box.bottom <= 1_850);
}

async function seekMarketFormNode(id: string, maxSwipes = 24): Promise<UiNode | null> {
  const visibleNode = (): UiNode | null => {
    const snapshot = dumpUi("adb", DEVICE_ID);
    return snapshot.nodes.find((candidate) =>
      nodeHasId(candidate, id) && candidate.enabled && marketNodeInsideFormViewport(candidate)) ?? null;
  };

  const current = visibleNode();
  if (current) return current;

  // Media analysis can move the ScrollView while keeping the thumbnail mounted
  // just above the accessibility viewport. Rewind first, then scan the whole
  // form from top to bottom so replace/remove controls cannot be skipped.
  const rewindSwipes = Math.min(maxSwipes, 8);
  for (let index = 0; index < rewindSwipes; index += 1) {
    adb(["shell", "input", "swipe", "540", "700", "540", "1750", "280"], 10_000);
    await sleep(450);
    const node = visibleNode();
    if (node) return node;
  }

  for (let index = 0; index <= maxSwipes; index += 1) {
    const node = visibleNode();
    if (node) return node;
    if (index === maxSwipes) break;
    adb(["shell", "input", "swipe", "540", "1700", "540", "650", "280"], 10_000);
    await sleep(450);
  }
  return null;
}

async function replaceMarketFormField(id: string, value: string): Promise<boolean> {
  const node = await seekMarketFormNode(id);
  if (!node || !tapNode("adb", DEVICE_ID, node)) return false;
  await sleep(200);
  adb(["shell", "input", "keycombination", "113", "29"], 5_000);
  adb(["shell", "input", "keyevent", "KEYCODE_DEL"], 5_000);
  const typed = adb(["shell", "input", "text", value.replace(/ /gu, "%s")], 20_000);
  adb(["shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
  await sleep(650);
  if (!typed.ok) return false;
  const verified = await seekMarketFormNode(id, 8);
  return clean(verified?.text) === value;
}

async function proveMarketNativeReopen(listingId: string, marker: string): Promise<void> {
  await openRoute(`/product/${listingId}`, "market_native_detail_reopen");
  const detail = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) =>
      snapshot.text.includes(marker) &&
      Boolean(nodeById(snapshot, "market_product_hero_image")),
    60_000,
  );
  result.market.native_detail_reopen =
    detail.text.includes(marker) && Boolean(nodeById(detail, "market_product_hero_image"));
  await openRoute("/market/my-listings", "market_native_owner_history_reopen");
  let history = dumpUi("adb", DEVICE_ID);
  for (let index = 0; index < 55; index += 1) {
    if (
      nodeById(history, `market-my-listings-card_${listingId}`) &&
      nodeById(history, `market_my_listing_image_${listingId}`)
    ) break;
    adb(["shell", "input", "swipe", "540", "1750", "540", "600", "280"], 10_000);
    await sleep(450);
    history = dumpUi("adb", DEVICE_ID);
  }
  result.market.native_owner_history_reopen =
    Boolean(nodeById(history, `market-my-listings-card_${listingId}`)) &&
    Boolean(nodeById(history, `market_my_listing_image_${listingId}`));
  invariant(
    result.market.native_detail_reopen && result.market.native_owner_history_reopen,
    "STOP_MARKET_NATIVE_REOPEN_FAILED",
  );
}

async function runResumedMarketReopen(listingId: string, marker: string): Promise<void> {
  await loginRole("FOREMAN");
  await proveMarketNativeReopen(listingId, marker);
  await ensureLoginScreen();
  mark("native_market_resume_reopen_done", { listingIdHash: sha256(listingId).slice(0, 16) });
}

async function runMarketCreate(): Promise<void> {
  const marker = `S27-6 native media ${runId}`;
  const readback = await signInReadbackRole("FOREMAN");
  const localPhoto = path.join(artifactDir, "s27-6-native-market.png");
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(localPhoto, Buffer.from(PHOTO_PNG_BASE64, "base64"));
  const devicePhoto = `/sdcard/Pictures/s27-6-native-market-${runId}.png`;
  invariant(adb(["push", localPhoto, devicePhoto], 30_000).ok, "STOP_MARKET_PHOTO_PUSH_FAILED");
  adb([
    "shell", "am", "broadcast", "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
    "-d", `file://${devicePhoto}`,
  ], 20_000);

  await loginRole("FOREMAN");
  await openRoute("/add?returnTo=market-my-listings", "market_native_create");
  const shell = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => Boolean(nodeById(snapshot, "add-listing-owner-shell")),
    60_000,
  );
  invariant(nodeById(shell, "add-listing-owner-shell"), "STOP_MARKET_ADD_SHELL_MISSING");
  invariant(await tapById("adb", DEVICE_ID, "market-add-kind-service", 12), "STOP_MARKET_KIND_SELECT_FAILED");
  await openGalleryAndChoosePreparedPhoto("marketplace.media.entrypoints.gallery_photo_button");
  result.market.draft_photo_uploaded = true;
  mark("native_market_photo_uploaded");
  await openGalleryAndChoosePreparedPhoto(
    "marketplace.media.entrypoints.thumbnail.replace.0",
    "marketplace.media.entrypoints.suggestion.change",
  );
  result.market.draft_photo_replaced = true;
  mark("native_market_photo_replaced");
  const removePhoto = await seekMarketFormNode("marketplace.media.entrypoints.thumbnail.remove.0", 0)
    ?? await seekMarketFormNode("marketplace.media.entrypoints.suggestion.remove", 0)
    ?? await seekMarketFormNode("marketplace.media.entrypoints.thumbnail.remove.0")
    ?? await seekMarketFormNode("marketplace.media.entrypoints.suggestion.remove");
  invariant(
    removePhoto && tapNode("adb", DEVICE_ID, removePhoto),
    "STOP_MARKET_PHOTO_REMOVE_FAILED",
  );
  const empty = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => Boolean(nodeById(snapshot, "marketplace.media.entrypoints.thumbnail-empty-strip")),
    30_000,
  );
  invariant(nodeById(empty, "marketplace.media.entrypoints.thumbnail-empty-strip"), "STOP_MARKET_PHOTO_REMOVE_READBACK_FAILED");
  result.market.draft_photo_removed = true;
  mark("native_market_photo_removed");
  await openGalleryAndChoosePreparedPhoto("marketplace.media.entrypoints.gallery_photo_button");
  result.market.draft_photo_readded = true;
  mark("native_market_photo_readded");

  invariant(await replaceMarketFormField("market-add-title", marker), "STOP_MARKET_TITLE_INPUT_FAILED");
  invariant(await replaceMarketFormField("market-add-description", "Isolated S27.6 native media listing for API 34 readback."), "STOP_MARKET_DESCRIPTION_INPUT_FAILED");
  invariant(await replaceMarketFormField("market-add-city", "Bishkek"), "STOP_MARKET_CITY_INPUT_FAILED");
  invariant(await replaceMarketFormField("market-add-price", "427"), "STOP_MARKET_PRICE_INPUT_FAILED");
  invariant(await replaceMarketFormField("market-add-phone", "+996700000222"), "STOP_MARKET_PHONE_INPUT_FAILED");

  invariant(await tapById("adb", DEVICE_ID, "add-listing-flow-publish", 55), "STOP_MARKET_PUBLISH_TAP_FAILED");
  const permissionOrSuccess = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) =>
      snapshot.text.includes("Объявление опубликовано") ||
      snapshot.nodes.some((node) => node.packageName.includes("permissioncontroller")),
    45_000,
  );
  const permissionAllow = permissionOrSuccess.nodes.find((node) =>
    node.enabled && node.clickable &&
    (/Разрешить только во время использования|While using the app/iu.test(node.text) || nodeHasId(node, "android:id/button1")),
  );
  if (permissionAllow && !permissionOrSuccess.text.includes("Объявление опубликовано")) {
    tapNode("adb", DEVICE_ID, permissionAllow);
  }
  const success = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (snapshot) => snapshot.text.includes("Объявление опубликовано"),
    120_000,
  );
  invariant(success.text.includes("Объявление опубликовано"), "STOP_MARKET_PUBLISH_SUCCESS_MISSING");
  const backButton = success.nodes.find((node) => node.enabled && node.clickable && nodeHasId(node, "android:id/button2"));
  const primaryButton = success.nodes.find((node) => node.enabled && node.clickable && nodeHasId(node, "android:id/button1"));
  if (backButton ?? primaryButton) tapNode("adb", DEVICE_ID, (backButton ?? primaryButton) as UiNode);
  result.market.native_ui_created = true;

  const listing = await poll("market_listing_persisted", async () => {
    const query = await readback.client
      .from("market_listings")
      .select("id,title,user_id,status,kind,price,city,created_at")
      .eq("user_id", readback.userId)
      .eq("title", marker)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (query.error) throw query.error;
    return query.data;
  }, 90_000);
  result.market.listing_id = listing.id;
  result.market.persisted_readback = listing.status === "active" && listing.kind === "service" && listing.price === 427;
  invariant(
    result.market.persisted_readback && await readbackMarketMedia(readback.client, listing.id),
    "STOP_MARKET_PERSISTED_MEDIA_STATE_RED",
  );
  await proveMarketNativeReopen(listing.id, marker);
  await readback.client.auth.signOut();
  await ensureLoginScreen();
  mark("native_market_create_done", { listingIdHash: sha256(listing.id).slice(0, 16) });
}

function assertMainActivityResumed(): void {
  const activities = adb(["shell", "dumpsys", "activity", "activities"], 20_000);
  invariant(
    activities.ok && activities.output.split(/\r?\n/gu).some((line) =>
      /mResumedActivity|topResumedActivity/u.test(line) && line.includes(MAIN_ACTIVITY)),
    "STOP_NATIVE_MAIN_ACTIVITY_NOT_RESUMED",
  );
}

async function main(): Promise<void> {
  fs.mkdirSync(artifactDir, { recursive: true });
  assertRuntimeConfig();
  const evidence = resolveEvidence();
  const sourceSha = git(["rev-parse", "HEAD"]);
  const dirty = git(["status", "--porcelain=v1", "-z"]);
  const fingerprints = computeReleaseFingerprints();
  invariant(evidence.web.source_sha === sourceSha && evidence.smoke.source_sha === sourceSha, "STOP_LINKED_EVIDENCE_SOURCE_SHA_MISMATCH");
  result.source_sha = sourceSha;
  result.product_source_hash = fingerprints.productSourceHash;
  result.dirty_fingerprint = sha256(dirty);
  assertDeviceReady();
  setupAndroidRuntime(8_081, PACKAGE_NAME, { clearAppState: false, reversePorts: [8_081, 8_765] });
  mark("native_actions_start", { device: DEVICE_ID });
  await bootstrapDevClient();
  await ensureLoginScreen();
  const resumed = await resumeActionsIfRequested(
    evidence.web,
    sourceSha,
    fingerprints.productSourceHash,
  );
  if (!resumed.buyerResumed) await runBuyerRfq(evidence.web);
  writeSummary();
  if (resumed.marketResumed) {
    invariant(resumed.marketListingId && resumed.marketTitle, "STOP_NATIVE_ACTIONS_RESUME_MARKET_CONTEXT_MISSING");
    await runResumedMarketReopen(resumed.marketListingId, resumed.marketTitle);
  } else {
    await runMarketCreate();
  }
  assertMainActivityResumed();
  invariant(Object.values(result.buyer_rfq).every((value) => value !== false && value != null), "STOP_BUYER_RFQ_BOOLEAN_AGGREGATE_RED");
  invariant(Object.values(result.market).every((value) => value !== false && value != null), "STOP_MARKET_BOOLEAN_AGGREGATE_RED");
  result.final_status = "GREEN_OFFICE_MARKET_NATIVE_ACTIONS_AND_MEDIA_READBACK";
  result.error_step = null;
  result.error_message = null;
  writeSummary();
  process.stdout.write(`${JSON.stringify({
    final_status: result.final_status,
    artifact: result.artifact_dir,
    buyer_rfq: result.buyer_rfq,
    market: result.market,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  result.final_status = "STOP_OFFICE_MARKET_NATIVE_ACTIONS_FAILED";
  result.error_step = currentStep;
  result.error_message = error instanceof Error ? error.message : String(error);
  writeSummary();
  process.stderr.write(`${JSON.stringify({
    final_status: result.final_status,
    error_step: result.error_step,
    error_message: result.error_message,
    artifact: result.artifact_dir,
  }, null, 2)}\n`);
  process.exitCode = 1;
});
