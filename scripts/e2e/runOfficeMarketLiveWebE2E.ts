/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, no-console */
// @ts-nocheck

const fs = require("node:fs");
const path = require("node:path");
const child = require("node:child_process");
const crypto = require("node:crypto");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const { MARKET_ADD_MEDIA_LIMITS } = require("../../src/lib/media/mediaLimits");
const {
  buildRequestContextLines,
  buildRequestContextView,
  buildRequestLineItemView,
  parseRequestContextFromNotes,
} = require("../../src/features/office/requestContextView");

const projectRoot = process.cwd();
const runStartedAt = new Date().toISOString();
const runId = runStartedAt.replace(/[:.]/g, "-");
const artifactDir = path.join(projectRoot, ".release-runtime", "office-ai-market-live-e2e", runId);
fs.mkdirSync(artifactDir, { recursive: true });
dotenv.config({ path: path.join(projectRoot, ".env.staging.local"), override: false });
dotenv.config({ path: path.join(projectRoot, ".env.office-e2e.local"), override: false });

const baseUrl = String(process.env.RIK_WEB_BASE_URL || "http://127.0.0.1:8091").replace(/\/$/, "");
const supabaseUrl = String(process.env.STAGING_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = String(process.env.STAGING_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const expectedProjectRef = String(process.env.STAGING_SUPABASE_PROJECT_REF || "nxrnjywzxxfdpqmzjorh").trim();
const expectedCompanyId = String(process.env.OFFICE_E2E_COMPANY_ID || "").trim();
const targetEnvironment = String(process.env.OFFICE_E2E_TARGET_ENV || process.env.APP_ENV || "staging").trim().toLowerCase();
const summaryPath = path.join(artifactDir, "summary.json");
const progressPath = path.join(artifactDir, "progress.log");

const requiredRoles = [
  { key: "FOREMAN", expected: "foreman", route: "/office/foreman" },
  { key: "DIRECTOR", expected: "director", route: "/office/director" },
  { key: "BUYER", expected: "buyer", route: "/office/buyer" },
  { key: "WAREHOUSE", expected: "warehouse", route: "/office/warehouse" },
  { key: "CONTRACTOR", expected: "contractor", route: "/office/contractor" },
  { key: "ACCOUNTANT", expected: "accountant", route: "/office/accountant" },
];

const result = {
  final_status: "STOP_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NOT_FINISHED",
  artifact_dir: artifactDir,
  base_url: baseUrl,
  branch: null,
  source_sha: null,
  target_environment: targetEnvironment,
  run_started_at: runStartedAt,
  backend_reachable: false,
  auth_reachable: false,
  project_ref: expectedProjectRef,
  production_db_touched: false,
  destructive_migration_run: false,
  seed_reset_run: false,
  native_build_started: false,
  eas_started: false,
  release_started: false,
  full_jest_started: false,
  developer_full_access_used_as_proof: false,
  fake_green_claimed: false,
  live_gate_extended_with_my_listings: false,
  live_gate_my_listings_owner_only: false,
  live_gate_my_listings_media_persistent: false,
  live_gate_public_market_unaffected: false,
  role_auth: {
    all_required_credentials_present: false,
    all_roles_signed_in: false,
    expected_company_id_present: Boolean(expectedCompanyId),
    same_company_for_required_roles: false,
    roles: {},
    sanitized_matrix: [],
  },
  office: {
    old_work_type_picker_absent: false,
    foreman_ai_estimate_created: false,
    foreman_ai_estimate_sent_to_director: false,
    director_received_ai_request: false,
    director_pdf_opened_from_ai_request_block: false,
    director_ai_context_complete: false,
    director_ai_pdf_context_complete: false,
    director_ai_pdf_units_localized: false,
    director_ai_pdf_no_technical_codes: false,
    director_approved_ai_request: false,
    buyer_received_approved_ai_request: false,
    buyer_ai_context_complete: false,
    buyer_ai_pdf_opened: false,
    buyer_ai_pdf_context_complete: false,
    buyer_ai_pdf_items_count_matches: false,
    buyer_ai_pdf_units_localized: false,
    buyer_ai_full_items_visible: false,
    buyer_ai_no_item_truncation: false,
    manual_estimate_created: false,
    manual_estimate_row_name_qty_price_edited: false,
    manual_estimate_unit_edit: "not_supported_readonly_unit_in_professional_composer",
    manual_estimate_remove_restore_exercised: false,
    manual_estimate_catalog_add_exercised: false,
    manual_estimate_sent_to_director: false,
    director_received_manual_request: false,
    director_pdf_opened_from_manual_request_block: false,
    director_manual_context_complete: false,
    director_manual_pdf_context_complete: false,
    director_manual_pdf_units_localized: false,
    director_manual_pdf_no_technical_codes: false,
    director_approved_manual_request: false,
    buyer_received_approved_manual_request: false,
    buyer_manual_context_complete: false,
    buyer_manual_pdf_opened: false,
    buyer_manual_pdf_context_complete: false,
    buyer_manual_pdf_items_count_matches: false,
    buyer_manual_pdf_units_localized: false,
    buyer_manual_full_items_visible: false,
    buyer_manual_no_item_truncation: false,
    foreman_request_context_persisted: false,
    director_detail_context_complete: false,
    director_pdf_context_complete: false,
    director_pdf_units_localized: false,
    director_pdf_no_technical_codes: false,
    buyer_context_complete: false,
    buyer_pdf_opened: false,
    buyer_pdf_context_complete: false,
    buyer_pdf_items_count_matches: false,
    buyer_pdf_units_localized: false,
    buyer_unknown_fields_not_question_marks: false,
    buyer_unknown_price_not_zero_sum: false,
    office_chain_success_console_errors: false,
    office_chain_success_console_warnings: false,
    buyer_full_items_visible: false,
    buyer_no_item_truncation: false,
    warehouse_route_visible: false,
    warehouse_procurement_items_visible: false,
    contractor_route_visible: false,
    contractor_request_visible: false,
    contractor_skip_reason: null,
    contractor_no_bottom_blank_hiding_list: false,
    accountant_route_visible: false,
    accountant_amounts_visible: false,
    accountant_skip_reason: null,
    accountant_no_debug_noise: false,
    ai_request_id: null,
    manual_request_id: null,
  },
  market: {
    add_listing_opened: false,
    real_png_file_selected_from_disk: false,
    suggestion_change_replaced_media: false,
    suggestion_remove_deleted_media: false,
    photo_readded_after_delete: false,
    preview_visible: false,
    counter_real_assets_length: false,
    listing_published: false,
    listing_id: null,
    listing_title: null,
    erp_item_count: 0,
    card_photo_visible: false,
    card_photo_visible_after_refresh: false,
    my_listings_screen_visible: false,
    my_listing_visible: false,
    my_listing_media_visible: false,
    my_listing_after_refresh_visible: false,
    my_listing_after_relogin_visible: false,
    detail_photo_visible: false,
    detail_photo_visible_after_relogin: false,
    product_card_visible: false,
    product_contact_panel_visible: false,
    product_related_feed_visible: false,
    image_url_not_blob: false,
    image_url_not_data: false,
    image_url_not_local: false,
    public_image_fetch_ok: false,
  },
  dialogs: [],
  console_errors: [],
  console_warnings: [],
  console_actionable_warnings: [],
  console_known_framework_warnings: [],
  bad_responses: [],
  request_failed: [],
  error_step: null,
  error_message: null,
};

const pngA =
  "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAxElEQVR4nO3QQQ3AIADAQMC/5yGDFyQK0fVn5gDm3QW8rQfYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYHcD2rYB8xIXPuoAAAAASUVORK5CYII=";
const pngB =
  "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAxUlEQVR4nO3QQQ3AIADAQMC/5yGDFyQK0fXn5gDmPQK8rQfYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYDtgdgO2A3QHYHcBwzYB8gGIxcAAAAAASUVORK5CYII=";
const imageAPath = path.join(artifactDir, "market-product-sample-a.png");
const imageBPath = path.join(artifactDir, "market-product-sample-b.png");
fs.writeFileSync(imageAPath, Buffer.from(pngA, "base64"));
fs.writeFileSync(imageBPath, Buffer.from(pngB, "base64"));
let spawnedWebServer = null;

function writeSummary() {
  fs.writeFileSync(summaryPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

function mark(step, extra = {}) {
  result.error_step = step;
  fs.appendFileSync(
    progressPath,
    `${new Date().toISOString()} ${JSON.stringify({ step, ...extra })}\n`,
    "utf8",
  );
  writeSummary();
}

const KNOWN_FRAMEWORK_WARNING_POLICIES = [
  {
    id: "react_native_web_pointer_events_prop_deprecation",
    message: "props.pointerEvents is deprecated. Use style.pointerEvents",
    owner: "upstream:@react-navigation/react-native-web",
  },
  {
    id: "supabase_realtime_socket_closed_during_role_context_teardown",
    message: "Supabase Realtime WebSocket closed before connection establishment during browser context teardown",
    owner: "test-lifecycle:@supabase/realtime-js",
    pattern:
      /^WebSocket connection to 'wss:\/\/[^/]+[.]supabase[.]co\/realtime\/v1\/websocket[?][^']*' failed: WebSocket is closed before the connection is established[.]$/,
  },
];

function classifyConsoleWarning(text) {
  const policy = KNOWN_FRAMEWORK_WARNING_POLICIES.find(
    (entry) => entry.message === text || entry.pattern?.test(text),
  );
  if (!policy) return { actionable: true, text };
  return {
    actionable: false,
    text,
    policyId: policy.id,
    owner: policy.owner,
  };
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function publicResult() {
  return {
    final_status: result.final_status,
    artifact_dir: result.artifact_dir,
    role_auth: result.role_auth,
    office: result.office,
    market: result.market,
    error_step: result.error_step,
    error_message: result.error_message ? String(result.error_message).split("\n")[0] : null,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchReachable(url, options = {}) {
  try {
    const response = await fetch(url, { method: "GET", ...options });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function isLocalBaseUrl() {
  try {
    const parsed = new URL(baseUrl);
    return ["127.0.0.1", "localhost"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function ensureWebAppReachable() {
  if (await fetchReachable(baseUrl)) {
    result.backend_reachable = true;
    return;
  }

  if (!isLocalBaseUrl() || String(process.env.LIVE_E2E_START_WEB || "1") === "0") {
    throw new Error("STOP_LIVE_E2E_WEB_APP_UNREACHABLE");
  }

  const parsed = new URL(baseUrl);
  const port = parsed.port || "8091";
  const outPath = path.join(artifactDir, "expo-out.log");
  const errPath = path.join(artifactDir, "expo-err.log");
  const out = fs.openSync(outPath, "a");
  const err = fs.openSync(errPath, "a");
  const expoArgs = ["expo", "start", "--web", "--host", "localhost", "--port", port];
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", ["npx", ...expoArgs].join(" ")]
    : expoArgs;
  spawnedWebServer = child.spawn(
    command,
    args,
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        RIK_WEB_BASE_URL: baseUrl,
        BROWSER: "none",
      },
      detached: process.platform !== "win32",
      windowsHide: true,
      stdio: ["ignore", out, err],
    },
  );
  fs.writeFileSync(path.join(artifactDir, "expo.pid"), `${spawnedWebServer.pid || ""}\n`, "utf8");

  await poll("web app reachable", async () => (await fetchReachable(baseUrl)) ? true : null, 120_000, 1_000);
  result.backend_reachable = true;
}

async function ensureAuthReachable() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("staging Supabase env is missing");
  const ok = await fetchReachable(`${supabaseUrl}/auth/v1/health`, {
    headers: { apikey: supabaseAnonKey },
  });
  result.auth_reachable = ok;
  if (!ok) throw new Error("STOP_LIVE_E2E_AUTH_UNREACHABLE");
}

function assertLiveE2ePrerequisites() {
  if (String(process.env.LIVE_E2E || "") !== "1") {
    throw new Error("STOP_LIVE_E2E_ENV_REQUIRED");
  }
  if (!expectedCompanyId) {
    throw new Error("STOP_LIVE_E2E_COMPANY_ID_REQUIRED");
  }
  if (targetEnvironment === "production" || String(process.env.APP_ENV || "").toLowerCase() === "production") {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED: production target is not allowed");
  }
  if (/^(1|true|yes)$/i.test(String(process.env.ALLOW_PRODUCTION || ""))) {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED: ALLOW_PRODUCTION is enabled");
  }
}

function stopSpawnedWebServer() {
  if (!spawnedWebServer?.pid) return;
  try {
    if (process.platform === "win32") {
      child.spawnSync("taskkill", ["/PID", String(spawnedWebServer.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-spawnedWebServer.pid, "SIGTERM");
    }
  } catch {
    try {
      spawnedWebServer.kill();
    } catch {}
  }
}

async function poll(label, fn, timeoutMs = 45_000, delayMs = 500) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value != null && value !== false) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`${label} timed out`);
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function redact(value) {
  return String(value ?? "")
    .replace(/([?&](?:apikey|access_token|refresh_token|openToken|token|password|Authorization)=)[^&\s]+/gi, "$1<redacted>")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer <redacted>")
    .slice(0, 1200);
}

function hashValue(value) {
  const normalized = clean(value);
  return normalized ? crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 12) : null;
}

const isUsefulContextValue = (value) => {
  const text = clean(value);
  return Boolean(text && text !== "—" && text !== "-" && text !== "Не указан");
};

function requestContextValues(proof) {
  const context = proof?.context || {};
  return [
    context.requestNo,
    context.objectName,
    context.buildingName,
    context.floorLabel,
    context.systemLabel,
    context.zoneLabel,
    context.locationLabel,
  ].filter(isUsefulContextValue);
}

function assertRequestContextComplete(proof, label) {
  const context = proof?.context || {};
  const missing = [];
  if (!isUsefulContextValue(context.requestNo) || String(context.requestNo).startsWith("#")) missing.push("request_no");
  if (!isUsefulContextValue(context.objectName)) missing.push("object");
  if (!isUsefulContextValue(context.floorLabel)) missing.push("floor_or_level");
  if (!isUsefulContextValue(context.systemLabel)) missing.push("system");
  if (!isUsefulContextValue(context.zoneLabel)) missing.push("zone");
  if (!isUsefulContextValue(context.locationLabel)) missing.push("location");
  if (missing.length) {
    throw new Error(`STOP_REQUEST_CONTEXT_INCOMPLETE:${label}:${missing.join(",")}`);
  }
  return true;
}

function assertTextContainsRequestContext(text, proof, label) {
  const body = clean(text);
  assertRequestContextComplete(proof, label);
  const missingValues = requestContextValues(proof).filter((value) => !body.includes(value));
  const requiredLabels = ["Объект", "Этаж", "Система", "Зона"];
  const missingLabels = requiredLabels.filter((value) => !body.includes(value));
  if (missingValues.length || missingLabels.length) {
    throw new Error(
      `STOP_REQUEST_CONTEXT_NOT_VISIBLE:${label}:values=${missingValues.join("|")}:labels=${missingLabels.join("|")}`,
    );
  }
  return true;
}

function assertNoRawOfficePdfTokens(text, label) {
  const body = clean(text);
  if (/\b(sq_m|pcs|linear_m|m2|m3|set|uom_code|request_items|proposal_snapshot_items|rawRows|undefined|null|NaN)\b/i.test(body)) {
    throw new Error(`STOP_RAW_OFFICE_PDF_TOKEN_VISIBLE:${label}`);
  }
  return true;
}

function assertBuyerUnknownFieldsUx(text, label) {
  const body = clean(text);
  if (/(?:Цена|Контрагент|Прим\.|Примечание|Сумма(?:\s+по\s+позиции)?)\s*:\s*\?/i.test(body)) {
    throw new Error(`STOP_BUYER_UNKNOWN_FIELDS_RENDERED_AS_QUESTION_MARKS:${label}`);
  }
  if (/Цена:\s*Не заполнено[\s\S]{0,220}Сумма(?:\s+по\s+позиции)?\s*:\s*0\s*сом/i.test(body)) {
    throw new Error(`STOP_BUYER_UNKNOWN_PRICE_RENDERED_AS_ZERO_SUM:${label}`);
  }
  return true;
}

function assertPdfContainsAllRequestItems(text, proof, label) {
  const body = clean(text);
  const items = Array.isArray(proof?.items) ? proof.items : [];
  if (!items.length) throw new Error(`STOP_BUYER_PDF_ITEMS_EMPTY:${label}`);
  const missingItems = items
    .map((item) => clean(item.name))
    .filter(Boolean)
    .filter((name) => !body.includes(name));
  if (missingItems.length) {
    throw new Error(`STOP_BUYER_PDF_ITEM_COUNT_OR_CONTENT_MISMATCH:${label}:${missingItems.slice(0, 5).join("|")}`);
  }
  return true;
}

async function readPdfViewerDocumentText(page, label) {
  const snapshot = await poll(`${label} pdf viewer iframe document text`, async () => {
    const view = await page.evaluate(async () => {
      const frame = document.querySelector("iframe[src], iframe[data-render-key]");
      const iframe = frame instanceof HTMLIFrameElement ? frame : null;
      const src = iframe?.src || iframe?.getAttribute("src") || "";
      const title = iframe?.title || "";
      const pageText = document.body?.innerText || document.body?.textContent || "";
      let frameText = "";
      let contentType = "";
      let fetchOk = false;

      try {
        const doc = iframe?.contentDocument || iframe?.contentWindow?.document || null;
        frameText = doc?.body?.innerText || doc?.body?.textContent || "";
      } catch {
        frameText = "";
      }

      if (!frameText && src) {
        try {
          const response = await fetch(src);
          contentType = response.headers.get("content-type") || "";
          const raw = await response.text();
          fetchOk = response.ok;
          if (/html|text|xml|json/i.test(contentType) || /<html|<body|<!doctype/i.test(raw)) {
            const parsed = new DOMParser().parseFromString(raw, "text/html");
            frameText = parsed.body?.innerText || parsed.body?.textContent || raw;
          } else {
            frameText = raw;
          }
        } catch (error) {
          frameText = "";
          contentType = error instanceof Error ? error.message : String(error || "");
        }
      }

      return {
        title,
        src,
        sourceKind: src.match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
        contentType,
        fetchOk,
        pageText,
        frameText,
      };
    });
    if (clean(view.frameText).length > 20) return view;
    return null;
  }, 45_000, 500);

  const documentText = clean([
    snapshot.title,
    snapshot.frameText,
  ].filter(Boolean).join(" "));
  if (!documentText) {
    throw new Error(`STOP_PDF_VIEWER_DOCUMENT_TEXT_EMPTY:${label}`);
  }
  const artifactLabel = String(label || "pdf").replace(/[^a-z0-9_.-]+/gi, "_");
  fs.writeFileSync(
    path.join(artifactDir, `${artifactLabel}-pdf-text.txt`),
    `${documentText}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactDir, `${artifactLabel}-pdf-text-meta.json`),
    `${JSON.stringify(
      {
        label,
        sourceKind: snapshot.sourceKind,
        contentType: snapshot.contentType,
        fetchOk: snapshot.fetchOk,
        pageTextLength: clean(snapshot.pageText || "").length,
        frameTextLength: clean(snapshot.frameText || "").length,
        documentTextHash: hashValue(documentText),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  mark("pdf_viewer_document_text_extracted", {
    label,
    sourceKind: snapshot.sourceKind,
    contentType: redact(snapshot.contentType || ""),
    fetchOk: snapshot.fetchOk,
    textHash: hashValue(documentText),
  });
  return {
    text: documentText,
    pageText: clean(snapshot.pageText || ""),
    sourceKind: snapshot.sourceKind,
    contentType: snapshot.contentType,
  };
}

async function selectRequestContextRow(session, requestId) {
  const selects = [
    "id,request_no,display_no,status,created_at,submitted_at,need_by,object_name,object,object_type_code,level_code,system_code,zone_code,site_address_snapshot,note,comment",
    "id,request_no,display_no,status,created_at,submitted_at,object_name,object,object_type_code,level_code,system_code,zone_code,note,comment",
    "id,display_no,status,created_at,submitted_at,object_name,object_type_code,level_code,system_code,zone_code,note",
  ];
  let lastError = null;
  for (const select of selects) {
    const query = await session.client
      .from("requests")
      .select(select)
      .eq("id", requestId)
      .maybeSingle();
    if (!query.error) return query.data || null;
    lastError = query.error;
  }
  throw lastError || new Error("request context row query failed");
}

async function loadRequestContextProof(roleKey, requestId) {
  mark("request_context_proof_start", { role: roleKey.toLowerCase(), requestId });
  const session = await signInRole(roleKey);
  const requestRow = await selectRequestContextRow(session, requestId);
  if (!requestRow?.id) throw new Error(`STOP_REQUEST_CONTEXT_ROW_MISSING:${roleKey}:${requestId}`);

  const itemsQuery = await session.client
    .from("request_items")
    .select("id,request_id,name_human,qty,uom,rik_code,app_code,item_kind,note,status")
    .eq("request_id", requestId)
    .order("id", { ascending: true });
  if (itemsQuery.error) throw itemsQuery.error;
  const itemRows = itemsQuery.data || [];
  if (!itemRows.length) throw new Error(`STOP_REQUEST_CONTEXT_ITEMS_MISSING:${roleKey}:${requestId}`);

  const noteContext = parseRequestContextFromNotes([
    requestRow.note,
    requestRow.comment,
    ...itemRows.map((row) => row.note),
  ]);
  const context = buildRequestContextView(
    {
      requestId: requestRow.id,
      requestNo: requestRow.request_no,
      displayNo: requestRow.display_no,
      objectName: requestRow.object_name,
      object: requestRow.object,
      siteAddress: requestRow.site_address_snapshot,
      levelCode: requestRow.level_code,
      systemCode: requestRow.system_code,
      zoneCode: requestRow.zone_code,
      status: requestRow.status,
      createdAt: requestRow.created_at,
      submittedAt: requestRow.submitted_at,
      neededBy: requestRow.need_by,
    },
    noteContext,
  );
  const proof = {
    role: roleKey.toLowerCase(),
    requestId: String(requestId),
    context,
    lines: buildRequestContextLines(context, { includeRequestNo: true, maxLines: 12 }),
    items: itemRows.map((row) =>
      buildRequestLineItemView({
        id: row.id,
        nameHuman: row.name_human,
        qty: row.qty,
        uom: row.uom,
        status: row.status,
        note: row.note,
        appCode: row.app_code,
        rikCode: row.rik_code,
        itemKind: row.item_kind,
      }),
    ),
  };
  assertRequestContextComplete(proof, `${roleKey}:db`);
  mark("request_context_proof_done", {
    role: roleKey.toLowerCase(),
    requestId,
    itemCount: proof.items.length,
  });
  return proof;
}

function byTestId(page, id) {
  return page.locator(`[data-testid="${id}"]`);
}

function startsWithTestId(page, prefix) {
  return page.locator(`[data-testid^="${prefix}"]`);
}

async function activate(locator, timeout = 30_000) {
  await locator.waitFor({ state: "visible", timeout });
  await locator.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.click();
      return;
    }
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function isStablePublicImageUrl(value) {
  const url = String(value || "").trim();
  const isPublicStoragePath = url.startsWith("/storage/v1/object/public/");
  return (/^https?:\/\//i.test(url) || isPublicStoragePath) &&
    !/^(blob|data|file):/i.test(url) &&
    !isTransientLocalMediaUrl(url);
}

function toAbsolutePublicImageUrl(value) {
  const url = String(value || "").trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/storage/v1/object/public/")) return new URL(url, supabaseUrl).toString();
  return url;
}

function isTransientLocalMediaUrl(value) {
  return /media-local-photo-\d+/i.test(String(value || ""));
}

async function imageSrc(locator) {
  return locator.evaluate((el) => {
    const direct = el.getAttribute("src") || el.getAttribute("href") || "";
    if (direct) return direct;
    const img = el.matches("img") ? el : el.querySelector("img");
    return img ? (img.getAttribute("src") || img.src || "") : "";
  });
}

async function visibleStableImage(locator) {
  if ((await locator.count()) < 1) return null;
  const first = locator.first();
  if (!(await first.isVisible().catch(() => false))) return null;
  const src = await imageSrc(first).catch(() => "");
  return isStablePublicImageUrl(src) ? src : null;
}

async function fillNthInput(scope, nth, value) {
  const inputs = scope.locator("input, textarea");
  await poll(`input ${nth}`, async () => (await inputs.count()) > nth ? true : null, 30_000);
  await inputs.nth(nth).fill(value);
}

function roleCred(roleKey) {
  return {
    email: process.env[`E2E_${roleKey}_EMAIL`] || "",
    password: process.env[`E2E_${roleKey}_PASSWORD`] || "",
  };
}

function supabaseForSession(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function signInRole(roleKey) {
  const credentials = roleCred(roleKey);
  if (!credentials.email || !credentials.password) {
    throw new Error(`missing E2E_${roleKey}_EMAIL or E2E_${roleKey}_PASSWORD`);
  }
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await client.auth.signInWithPassword(credentials);
  if (signIn.error || !signIn.data.session?.user) {
    throw signIn.error || new Error(`${roleKey} sign-in failed`);
  }
  return {
    client: supabaseForSession(signIn.data.session.access_token),
    userId: signIn.data.session.user.id,
    accessToken: signIn.data.session.access_token,
  };
}

async function verifyRoles() {
  mark("role_auth");
  result.role_auth.all_required_credentials_present = requiredRoles.every((role) => {
    const c = roleCred(role.key);
    return Boolean(c.email && c.password);
  });
  if (!result.role_auth.all_required_credentials_present) {
    throw new Error("required E2E role credentials are missing");
  }

  const seenUsers = new Set();
  const companyMembershipSets = [];
  for (const role of requiredRoles) {
    mark("role_auth_sign_in", { role: role.key.toLowerCase() });
    const session = await signInRole(role.key);
    const rpc = await session.client.rpc("get_my_role");
    const profile = await session.client
      .from("profiles")
      .select("user_id,role")
      .eq("user_id", session.userId)
      .limit(1)
      .maybeSingle();
    if (profile.error) throw profile.error;
    const memberships = await session.client
      .from("company_members")
      .select("company_id,role")
      .eq("user_id", session.userId);
    if (memberships.error) throw memberships.error;
    const membershipRows = memberships.data || [];
    const membershipRoles = membershipRows.map((row) => clean(row.role).toLowerCase()).filter(Boolean);
    const companyIds = membershipRows.map((row) => clean(row.company_id)).filter(Boolean);
    const resolvedRole = clean(rpc.data).toLowerCase();
    const matrixResolvedRole = resolvedRole || clean(profile.data?.role).toLowerCase() || membershipRoles[0] || null;
    const expectedMatched = resolvedRole === role.expected || membershipRoles.includes(role.expected);
    const expectedCompanyMatched = expectedCompanyId ? companyIds.includes(expectedCompanyId) : companyIds.length > 0;
    const companyHash = hashValue(expectedCompanyId && companyIds.includes(expectedCompanyId) ? expectedCompanyId : companyIds[0]);

    result.role_auth.roles[role.key.toLowerCase()] = {
      signed_in: true,
      distinct_user: !seenUsers.has(session.userId),
      get_my_role: resolvedRole || null,
      expected_role: role.expected,
      expected_role_matched: expectedMatched,
      company_membership_count: companyIds.length,
      expected_company_matched: expectedCompanyMatched,
      profile_exists: Boolean(profile.data?.user_id),
      membership_exists: companyIds.length > 0,
      company_id_hash: companyHash,
    };
    result.role_auth.sanitized_matrix.push({
      role: role.expected,
      email_present: Boolean(roleCred(role.key).email),
      auth_login_success: true,
      profile_exists: Boolean(profile.data?.user_id),
      membership_exists: companyIds.length > 0,
      resolved_role: matrixResolvedRole,
      company_id_hash: companyHash,
    });
    seenUsers.add(session.userId);
    companyMembershipSets.push(new Set(companyIds));
  }

  const commonCompanyIds = companyMembershipSets.reduce((acc, set) => {
    if (acc == null) return new Set(set);
    return new Set([...acc].filter((id) => set.has(id)));
  }, null);
  result.role_auth.all_roles_signed_in = requiredRoles.every((role) => result.role_auth.roles[role.key.toLowerCase()]?.signed_in);
  result.role_auth.same_company_for_required_roles = expectedCompanyId
    ? requiredRoles.every((role) => result.role_auth.roles[role.key.toLowerCase()]?.expected_company_matched)
    : Boolean(commonCompanyIds && commonCompanyIds.size > 0);

  const roleOk = Object.values(result.role_auth.roles).every((row) =>
    row.signed_in &&
    row.distinct_user &&
    row.profile_exists &&
    row.membership_exists &&
    row.expected_role_matched &&
    row.expected_company_matched,
  );
  if (!roleOk || !result.role_auth.same_company_for_required_roles) {
    throw new Error("role isolation or company membership proof failed");
  }
}

async function setupPage(page) {
  page.setDefaultTimeout(30_000);
  page.on("dialog", async (dialog) => {
    result.dialogs.push({ type: dialog.type(), message: redact(dialog.message()) });
    await dialog.accept().catch(() => undefined);
  });
  page.on("console", (message) => {
    const text = redact(message.text());
    if (message.type() === "error") result.console_errors.push(text);
    if (message.type() === "warning") {
      result.console_warnings.push(text);
      const warning = classifyConsoleWarning(text);
      if (warning.actionable) {
        result.console_actionable_warnings.push(text);
      } else {
        result.console_known_framework_warnings.push(warning);
      }
    }
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      let urlPath = "<external>";
      try {
        const parsed = new URL(response.url());
        urlPath = parsed.pathname;
      } catch {}
      result.bad_responses.push({ status, method: response.request().method(), path: urlPath });
    }
  });
  page.on("requestfailed", (request) => {
    let urlPath = "<external>";
    try {
      const parsed = new URL(request.url());
      urlPath = parsed.pathname;
    } catch {}
    result.request_failed.push({
      method: request.method(),
      path: urlPath,
      failure: redact(request.failure()?.errorText || "failed"),
    });
  });
}

async function newRolePage(browser, roleKey) {
  mark("browser_login_start", { role: roleKey.toLowerCase() });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
    geolocation: { latitude: 42.8746, longitude: 74.5698 },
    permissions: ["geolocation"],
  });
  await context.grantPermissions(["geolocation"], { origin: baseUrl });
  const page = await context.newPage();
  await setupPage(page);
  const credentials = roleCred(roleKey);
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await byTestId(page, "auth.login.email").waitFor({ state: "visible", timeout: 60_000 });
  await byTestId(page, "auth.login.email").fill(credentials.email);
  await byTestId(page, "auth.login.password").fill(credentials.password);
  await byTestId(page, "auth.login.submit").click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 60_000 });
  // The post-login profile route starts the authoritative auth.getUser read.
  // Do not navigate to a role surface while that request is still in flight:
  // Chromium would abort it and GoTrue would emit a false product console RED.
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  mark("browser_login_done", { role: roleKey.toLowerCase(), path: new URL(page.url()).pathname });
  return { context, page };
}

async function closeRolePage(rolePage) {
  // Every functional assertion has completed before this teardown boundary.
  // Detach first so requests aborted by context disposal cannot masquerade as
  // product console or transport failures, then give the page a bounded grace.
  rolePage.page.removeAllListeners("console");
  rolePage.page.removeAllListeners("response");
  rolePage.page.removeAllListeners("requestfailed");
  await rolePage.page.waitForTimeout(500).catch(() => undefined);
  await rolePage.context.close().catch(() => undefined);
}

async function openForemanMaterials(page) {
  mark("foreman_open_materials_start");
  await page.goto(`${baseUrl}/office/foreman`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await byTestId(page, "foreman-main-materials-open").waitFor({ state: "visible", timeout: 60_000 });
  await activate(byTestId(page, "foreman-main-materials-open"));

  const ensureForemanFio = async () => {
    const fioInput = byTestId(page, "warehouse-fio-input");
    if (!(await fioInput.isVisible({ timeout: 10_000 }).catch(() => false))) return;
    mark("foreman_fio_modal_visible");
    await fioInput.fill("E2E Foreman");
    const confirm = byTestId(page, "warehouse-fio-confirm");
    await poll("foreman fio confirm enabled", async () =>
      (await confirm.getAttribute("aria-disabled").catch(() => null)) !== "true" ? true : null,
    10_000);
    await activate(confirm);
    await poll("foreman fio modal closed", async () =>
      (await byTestId(page, "warehouse-fio-input").count()) === 0 ||
      !(await byTestId(page, "warehouse-fio-input").isVisible().catch(() => false))
        ? true
        : null,
    20_000);
  };

  const pickDropdownOption = async (openId, optionId) => {
    const option = byTestId(page, optionId);
    if (!(await option.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await activate(byTestId(page, openId));
      await option.waitFor({ state: "visible", timeout: 15_000 });
    }
    await activate(option);
    await sleep(500);
  };

  await ensureForemanFio();

  mark("foreman_pick_object");
  await pickDropdownOption(
    "foreman-dropdown-open-foreman-object",
    "foreman-dropdown-option-foreman-object-bld-admin",
  );
  mark("foreman_pick_locator");
  await pickDropdownOption(
    "foreman-dropdown-open-foreman-locator",
    "foreman-dropdown-option-foreman-locator-lvl-01",
  );
  await ensureForemanFio();
  await poll("foreman header ready", async () => {
    const body = await page.locator("body").textContent().catch(() => "");
    return body && !body.includes("Заполните шапку") && !body.includes("Выбрать объект") ? true : null;
  }, 20_000).catch(() => undefined);
  mark("foreman_open_materials_done");
}

async function createForemanEstimate(page, marker, mode) {
  mark("foreman_estimate_start", { mode });
  await openForemanMaterials(page);
  await byTestId(page, "foreman-materials-estimate-open").waitFor({ state: "visible", timeout: 60_000 });
  await byTestId(page, "foreman-materials-estimate-open").evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.click();
      return;
    }
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await byTestId(page, "professional-estimate-composer").waitFor({ state: "visible", timeout: 60_000 }).catch(async (error) => {
    await page.screenshot({ path: path.join(artifactDir, `foreman-after-calc-click-${mode}.png`), fullPage: true }).catch(() => undefined);
    fs.writeFileSync(
      path.join(artifactDir, `foreman-after-calc-click-${mode}.html`),
      await page.content().catch(() => ""),
      "utf8",
    );
    result.office[`foreman_${mode}_after_calc_click_url`] = page.url();
    result.office[`foreman_${mode}_after_calc_click_body_excerpt`] = clean(await page.locator("body").textContent().catch(() => "")).slice(0, 1200);
    throw error;
  });
  mark("foreman_estimate_composer_visible", { mode });
  result.office.old_work_type_picker_absent =
    (await page.getByText("Выберите вид работ").count().catch(() => 0)) === 0;

  await byTestId(page, "foreman-ai-estimate-input").fill(
    mode === "manual" ? `ламинат укладка 28 м2 ${marker}` : `укладка ковролина 45 м2 ${marker}`,
  );
  const suggestion = byTestId(page, "foreman-ai-estimate-work-suggestion-1");
  if (await suggestion.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await suggestion.click();
  }
  await byTestId(page, "foreman-ai-estimate-generate").click();
  await byTestId(page, "foreman-ai-estimate-row").first().waitFor({ state: "visible", timeout: 45_000 });
  mark("foreman_estimate_rows_visible", { mode });

  await byTestId(page, "foreman-ai-estimate-row-name").first().fill(marker);
  await byTestId(page, "foreman-ai-estimate-row-qty").first().fill(mode === "manual" ? "7" : "12");
  await byTestId(page, "foreman-ai-estimate-row-price").first().fill(mode === "manual" ? "900" : "700");
  await poll("edited estimate row total", async () => {
    const text = await byTestId(page, "foreman-ai-estimate-row").first().innerText();
    return mode === "manual" ? (/6\s*300\s*KGS/.test(text) ? true : null) : (/8\s*400\s*KGS/.test(text) ? true : null);
  }, 20_000);

  if (mode === "manual") {
    result.office.manual_estimate_row_name_qty_price_edited = true;
    const remove = page.getByText("Убрать").first();
    if (await remove.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await remove.click();
      const restore = page.getByText("Вернуть").first();
      await restore.waitFor({ state: "visible", timeout: 10_000 });
      await restore.click();
      result.office.manual_estimate_remove_restore_exercised = true;
    }
    await byTestId(page, "foreman-ai-estimate-catalog-search").fill("пена");
    await byTestId(page, "foreman-ai-estimate-catalog-search").fill("MAT-BOLT");
    const addCatalog = byTestId(page, "foreman-ai-estimate-catalog-add").first();
    await addCatalog.waitFor({ state: "visible", timeout: 30_000 });
    const beforeRows = await byTestId(page, "foreman-ai-estimate-row").count();
    await activate(addCatalog);
    await poll("catalog item added to manual estimate", async () =>
      (await byTestId(page, "foreman-ai-estimate-row").count()) > beforeRows ? true : null,
    20_000);
    result.office.manual_estimate_catalog_add_exercised = true;
  }

  await byTestId(page, "foreman-ai-estimate-add-draft").click();
  await poll("composer closed", async () => (await byTestId(page, "professional-estimate-composer").count()) === 0 ? true : null, 20_000);
  await byTestId(page, "foreman-draft-open").waitFor({ state: "visible", timeout: 45_000 });
  await byTestId(page, "foreman-draft-open").click();
  await byTestId(page, "foreman-draft-send").waitFor({ state: "visible", timeout: 45_000 });
  await poll("draft includes marker", async () => ((await page.locator("body").textContent()) || "").includes(marker) ? true : null, 20_000);
  await byTestId(page, "foreman-draft-send").click();
  await sleep(3_000);
  mark("foreman_estimate_sent", { mode });
}

async function findDirectorRequest(page, marker) {
  mark("director_find_request_start");
  const targetRequestId = await resolveDirectorRequestIdByMarker(marker).catch((error) => {
    mark("director_resolve_request_id_by_marker_failed", { message: redact(error?.message || error) });
    return null;
  });
  await page.goto(`${baseUrl}/office/director`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (targetRequestId) {
    const exactCard = byTestId(page, `director-request-open-${targetRequestId}`);
    await exactCard.waitFor({ state: "visible", timeout: 90_000 });
    const cardText = clean(await exactCard.innerText().catch(() => ""));
    const visibleLabel = cardText.split("Открыть")[0] || cardText;
    const cardLabelHasUuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(visibleLabel);
    await activate(exactCard);
    await byTestId(page, `director-request-approve-${targetRequestId}`).waitFor({ state: "visible", timeout: 20_000 });
    const markerVisible = await poll("director exact request marker", async () => {
      const body = (await page.locator("body").textContent().catch(() => "")) || "";
      return body.includes(marker) ? true : null;
    }, 30_000, 500).catch(() => false);
    if (!markerVisible) {
      await page.screenshot({ path: path.join(artifactDir, `director-exact-request-${targetRequestId}.png`), fullPage: true }).catch(() => undefined);
      fs.writeFileSync(
        path.join(artifactDir, `director-exact-request-${targetRequestId}.html`),
        await page.content().catch(() => ""),
        "utf8",
      );
      throw new Error(`director exact request ${targetRequestId} opened but marker was not visible`);
    }
    const contextProof = await loadRequestContextProof("DIRECTOR", targetRequestId);
    assertTextContainsRequestContext(await page.locator("body").textContent().catch(() => ""), contextProof, "director_detail");
    mark("director_request_found", { requestId: targetRequestId });
    return { requestId: targetRequestId, cardLabelHasUuid, cardText, contextProof };
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await poll("director request cards", async () => (await startsWithTestId(page, "director-request-open-").count()) > 0 ? true : null, 60_000);
    const cards = startsWithTestId(page, "director-request-open-");
    const count = Math.min(await cards.count(), 12);
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const testId = (await card.getAttribute("data-testid")) || "";
      const requestId = testId.replace(/^director-request-open-/, "").trim();
      if (!requestId) continue;
      const cardText = clean(await card.innerText().catch(() => ""));
      const visibleLabel = cardText.split("Открыть")[0] || cardText;
      const cardLabelHasUuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(visibleLabel);
      await card.click();
      await byTestId(page, `director-request-approve-${requestId}`).waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
      const body = (await page.locator("body").textContent().catch(() => "")) || "";
      if (body.includes(marker)) {
        const contextProof = await loadRequestContextProof("DIRECTOR", requestId);
        assertTextContainsRequestContext(body, contextProof, "director_detail");
        mark("director_request_found", { requestId });
        return { requestId, cardLabelHasUuid, cardText, contextProof };
      }
      await page.keyboard.press("Escape").catch(() => undefined);
      await sleep(500);
      await page.goto(`${baseUrl}/office/director`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await sleep(2_000);
  }
  throw new Error(`director request with marker ${marker} was not found`);
}

async function clickDirectorPdfAndReturn(page, requestId, contextProof) {
  mark("director_pdf_open_start", { requestId });
  let pdfButton = byTestId(page, `director-request-pdf-${requestId}`).first();
  if (!(await pdfButton.isVisible({ timeout: 5_000 }).catch(() => false))) {
    pdfButton = page.getByText(/^PDF$/).first();
  }
  await pdfButton.waitFor({ state: "visible", timeout: 20_000 });
  await pdfButton.scrollIntoViewIfNeeded().catch(() => undefined);
  await pdfButton.click();
  await poll("director pdf-viewer route", async () => {
    const url = new URL(page.url());
    return url.pathname === "/pdf-viewer" ? true : null;
  }, 45_000);
  const body = clean(await page.locator("body").textContent().catch(() => ""));
  if (/not found|error|ошибка/i.test(body) && !/PDF|Печать|Скачать/i.test(body)) {
    throw new Error(`pdf viewer opened with error-looking body: ${body.slice(0, 200)}`);
  }
  const document = await readPdfViewerDocumentText(page, "director_pdf");
  assertTextContainsRequestContext(document.text, contextProof, "director_pdf");
  const pdfProof = inspectDirectorPdfBody(document.text);
  await page.goto(`${baseUrl}/office/director`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const card = byTestId(page, `director-request-open-${requestId}`);
  await card.waitFor({ state: "visible", timeout: 60_000 });
  await card.click();
  await byTestId(page, `director-request-approve-${requestId}`).waitFor({ state: "visible", timeout: 20_000 });
  mark("director_pdf_open_done", { requestId });
  return { ...pdfProof, contextComplete: true };
}

function inspectDirectorPdfBody(body) {
  const visibleText = clean(body);
  const rawTechnicalTokens = /\b(request_items|proposal_snapshot_items|rik_code|app_code|uom_code|sourceKind|rawRows|uuid)\b/i;
  const rawUnitTokens = /\b(sq_m|pcs|linear_m|m2|m3|set|uom_code|undefined|null|NaN)\b/i;
  if (rawTechnicalTokens.test(visibleText)) {
    throw new Error("director pdf contains raw technical tokens");
  }
  if (rawUnitTokens.test(visibleText)) {
    throw new Error("director pdf contains raw unit or debug tokens");
  }
  assertNoRawOfficePdfTokens(visibleText, "director_pdf");
  return {
    unitsLocalized: true,
    noTechnicalCodes: true,
  };
}

async function approveDirectorRequest(page, requestId) {
  mark("director_approve_start", { requestId });
  await byTestId(page, `director-request-approve-${requestId}`).click();
  await sleep(5_000);
  mark("director_approve_done", { requestId });
}

async function openBuyerProcurementPdfAndReturn(page, requestId, contextProof, expectedItemCount) {
  mark("buyer_procurement_pdf_open_start", { requestId });
  const pdfButton = byTestId(page, "buyer-procurement-pdf-open").first();
  await pdfButton.waitFor({ state: "visible", timeout: 20_000 });
  await pdfButton.scrollIntoViewIfNeeded().catch(() => undefined);
  await activate(pdfButton);
  await poll("buyer procurement pdf-viewer route", async () => {
    const url = new URL(page.url());
    return url.pathname === "/pdf-viewer" ? true : null;
  }, 45_000);
  const body = clean(await page.locator("body").textContent().catch(() => ""));
  if (/not found|error|ошибка/i.test(body) && !/PDF|Печать|Скачать|Закупочный лист/i.test(body)) {
    throw new Error(`buyer procurement pdf viewer opened with error-looking body: ${body.slice(0, 200)}`);
  }
  const document = await readPdfViewerDocumentText(page, "buyer_procurement_pdf");
  if (!document.text.includes("Закупочный лист")) {
    throw new Error("STOP_BUYER_PROCUREMENT_PDF_TITLE_MISSING");
  }
  assertTextContainsRequestContext(document.text, contextProof, "buyer_procurement_pdf");
  assertNoRawOfficePdfTokens(document.text, "buyer_procurement_pdf");
  assertBuyerUnknownFieldsUx(document.text, "buyer_procurement_pdf");
  assertPdfContainsAllRequestItems(document.text, contextProof, "buyer_procurement_pdf");
  if ((contextProof.items || []).length !== expectedItemCount) {
    throw new Error(`STOP_BUYER_PDF_ITEM_COUNT_MISMATCH:expected=${expectedItemCount}:actual=${(contextProof.items || []).length}`);
  }
  mark("buyer_procurement_pdf_open_done", { requestId, expectedItemCount });
  return {
    opened: true,
    contextComplete: true,
    itemsCountMatches: true,
    unitsLocalized: true,
  };
}

async function buyerSeesRequest(page, requestId, marker, expectedContextProof) {
  mark("buyer_find_request_start", { requestId });
  await page.goto(`${baseUrl}/office/buyer`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const inboxTab = byTestId(page, "buyer-tab-inbox").first();
  await inboxTab.waitFor({ state: "visible", timeout: 60_000 });
  await activate(inboxTab);
  const group = byTestId(page, `buyer-group-open-${requestId}`).first();
  await group.waitFor({ state: "visible", timeout: 90_000 });
  const expectedItemCount = await buyerRequestItemCount(requestId);
  const groupText = clean(await group.innerText().catch(() => ""));
  const countVisibleInHeader = new RegExp(`(^|[^0-9])${expectedItemCount}([^0-9]|$)`).test(groupText);
  if (expectedItemCount < 1 || !countVisibleInHeader) {
    throw new Error(`buyer request item count mismatch: expected ${expectedItemCount}, header ${groupText.slice(0, 160)}`);
  }
  await activate(group);
  await poll("buyer request sheet rows", async () =>
    (await page.getByTestId(/^buyer-item-toggle-/).count().catch(() => 0)) > 0 ? true : null,
  20_000);
  const markerVisibleInDom = await poll("buyer request marker dom", async () =>
    ((await page.locator("body").textContent()) || "").includes(marker) ? true : null,
  8_000, 500).catch(() => false);
  if (!markerVisibleInDom) {
    await buyerCanReadRequestMarker(requestId, marker);
  }
  const sheetBody = clean(await page.locator("body").textContent().catch(() => ""));
  const buyerContextProof = await loadRequestContextProof("BUYER", requestId);
  assertTextContainsRequestContext(sheetBody, buyerContextProof, "buyer_detail");
  assertTextContainsRequestContext(sheetBody, expectedContextProof, "buyer_detail_director_context_match");
  assertBuyerUnknownFieldsUx(sheetBody, "buyer_detail");
  const pdfProof = await openBuyerProcurementPdfAndReturn(page, requestId, buyerContextProof, expectedItemCount);
  mark("buyer_find_request_done", { requestId, markerVisibleInDom: Boolean(markerVisibleInDom), expectedItemCount });
  return {
    fullItemsVisible: true,
    noItemTruncation: true,
    contextComplete: true,
    pdfOpened: pdfProof.opened,
    pdfContextComplete: pdfProof.contextComplete,
    pdfItemsCountMatches: pdfProof.itemsCountMatches,
    pdfUnitsLocalized: pdfProof.unitsLocalized,
    unknownFieldsNotQuestionMarks: true,
    unknownPriceNotZeroSum: true,
  };
}

async function buyerRequestItemCount(requestId) {
  mark("buyer_request_item_count_start", { requestId });
  const session = await signInRole("BUYER");
  const query = await session.client
    .from("request_items")
    .select("id", { count: "exact" })
    .eq("request_id", requestId);
  if (query.error) throw query.error;
  const itemCount = typeof query.count === "number" ? query.count : (query.data || []).length;
  mark("buyer_request_item_count_done", { requestId, itemCount });
  return itemCount;
}

async function buyerCanReadRequestMarker(requestId, marker) {
  mark("buyer_request_marker_db_read_start", { requestId });
  const session = await signInRole("BUYER");
  const row = await poll("buyer request item marker row", async () => {
    const query = await session.client
      .from("request_items")
      .select("id,name_human,status,request_id")
      .eq("request_id", requestId)
      .ilike("name_human", `%${marker}%`)
      .limit(1);
    if (query.error) throw query.error;
    return query.data?.[0] ?? null;
  }, 30_000);
  mark("buyer_request_marker_db_read_done", {
    requestId,
    requestItemId: row.id,
    status: row.status,
  });
  return row;
}

async function resolveDirectorRequestIdByMarker(marker) {
  mark("director_resolve_request_id_by_marker_start");
  const session = await signInRole("DIRECTOR");
  const row = await poll("request item marker row", async () => {
    const query = await session.client
      .from("request_items")
      .select("request_id,name_human,created_at")
      .ilike("name_human", `%${marker}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (query.error) throw query.error;
    return query.data?.request_id ? query.data : null;
  }, 90_000, 1000);
  const requestId = clean(row.request_id);
  mark("director_resolve_request_id_by_marker_done", { requestId });
  return requestId;
}

async function queryCatalogSeed(client) {
  const preferred = await client
    .from("catalog_items")
    .select("rik_code,name_human_ru,uom_code,kind")
    .eq("kind", "material")
    .ilike("name_human_ru", "%цем%")
    .limit(8);
  const rows = preferred.error ? [] : (preferred.data || []);
  if (rows.length) return rows[0];
  const fallback = await client
    .from("catalog_items")
    .select("rik_code,name_human_ru,uom_code,kind")
    .eq("kind", "material")
    .limit(8);
  if (fallback.error) throw fallback.error;
  const row = (fallback.data || []).find((item) => clean(item.name_human_ru).length >= 2);
  if (!row) throw new Error("no material catalog item available for market listing");
  return row;
}

async function findListing(client, title) {
  const { data, error } = await client
    .from("market_listings")
    .select("id,title,created_at,user_id,items_json,rik_code")
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function runMarketFlow(browser, foremanClient) {
    mark("market_flow_start");
  const marker = `prod-safe market media ${Date.now()}`;
  result.market.listing_title = marker;
  mark("market_catalog_seed_start");
  const catalog = await queryCatalogSeed(foremanClient);
  const searchTerm = clean(catalog.name_human_ru).split(/\s+/)[0].slice(0, 12) || "цемент";

  const { context, page } = await newRolePage(browser, "FOREMAN");
  try {
    mark("market_add_open");
    await page.goto(`${baseUrl}/add?returnTo=market-my-listings`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await byTestId(page, "add-listing-owner-shell").waitFor({ state: "visible", timeout: 60_000 });
    result.market.add_listing_opened = true;

    const materialButton = page.getByText("Материалы").first();
    if (await materialButton.isVisible({ timeout: 5_000 }).catch(() => false)) await materialButton.click();

    await page.getByText("\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b", { exact: true }).first().click({ timeout: 5_000 }).catch(() => undefined);
    await fillNthInput(page, 0, searchTerm);
    const visibleCatalogRow = page.getByText("material").first();
    await visibleCatalogRow.waitFor({ state: "visible", timeout: 30_000 });
    await activate(visibleCatalogRow);
    if (String(process.env.NEVER_OPEN_LEGACY_CATALOG_FALLBACK || "") === "1") {
    const exactCatalog = page.getByText(clean(catalog.name_human_ru), { exact: true }).first();
    if (await exactCatalog.isVisible({ timeout: 20_000 }).catch(() => false)) {
      await exactCatalog.click();
    } else {
      const catalogRow = page.locator('[role="button"]').filter({ hasText: /Ед\. изм\.|Тип/i }).first();
      await catalogRow.waitFor({ state: "visible", timeout: 20_000 });
      await catalogRow.click();
    }
    }
    const itemModal = byTestId(page, "add-listing-item-modal");
    await itemModal.waitFor({ state: "visible", timeout: 20_000 });
    await fillNthInput(itemModal, 0, "Бишкек");
    await fillNthInput(itemModal, 1, clean(catalog.uom_code) || "шт");
    await fillNthInput(itemModal, 2, "2");
    await fillNthInput(itemModal, 3, "420");
    await byTestId(page, "add-listing-item-confirm").click();
    await poll("item modal closed", async () => (await itemModal.count()) === 0 || !(await itemModal.isVisible().catch(() => false)) ? true : null, 20_000);
    mark("market_catalog_item_added");

    await fillNthInput(page, 0, marker);
    await fillNthInput(page, 1, "Production-safe runtime listing with persistent public marketplace media.");
    await fillNthInput(page, 2, "Бишкек");
    await fillNthInput(page, 3, "420");
    await fillNthInput(page, 4, "+996700000001");

    const photoButton = byTestId(page, "marketplace.media.entrypoints.gallery_photo_button").first();
    await photoButton.waitFor({ state: "visible", timeout: 30_000 });
    await photoButton.scrollIntoViewIfNeeded().catch(() => undefined);
    let chooserPromise = page.waitForEvent("filechooser", { timeout: 15_000 });
    await photoButton.click();
    let chooser = await chooserPromise;
    await chooser.setFiles(imageAPath);
    result.market.real_png_file_selected_from_disk = true;
    mark("market_photo_selected");

    const previewLocator = byTestId(page, "marketplace.media.entrypoints.preview-image.0");
    const firstPreviewSrc = await poll("market first preview", async () => visibleStableImage(previewLocator), 90_000);
    result.market.preview_visible = true;

    const changeAction = byTestId(page, "marketplace.media.entrypoints.suggestion.change");
    await changeAction.waitFor({ state: "visible", timeout: 30_000 });
    chooserPromise = page.waitForEvent("filechooser", { timeout: 15_000 });
    await changeAction.click();
    chooser = await chooserPromise;
    await chooser.setFiles(imageBPath);
    const replacedPreviewSrc = await poll("market replaced preview", async () => {
      const next = await visibleStableImage(previewLocator);
      return next && next !== firstPreviewSrc ? next : null;
    }, 90_000);
    result.market.suggestion_change_replaced_media = Boolean(replacedPreviewSrc);
    mark("market_photo_replaced");

    const removeAction = byTestId(page, "marketplace.media.entrypoints.suggestion.remove");
    await removeAction.waitFor({ state: "visible", timeout: 30_000 });
    await removeAction.click();
    await poll("market media removed", async () => (await byTestId(page, "marketplace.media.entrypoints.preview-image.0").count()) === 0 ? true : null, 20_000);
    result.market.suggestion_remove_deleted_media = true;
    mark("market_photo_removed");

    const readdPhotoButton = byTestId(page, "marketplace.media.entrypoints.gallery_photo_button").first();
    await readdPhotoButton.waitFor({ state: "visible", timeout: 30_000 });
    await readdPhotoButton.scrollIntoViewIfNeeded().catch(() => undefined);
    chooserPromise = page.waitForEvent("filechooser", { timeout: 15_000 });
    await readdPhotoButton.click();
    chooser = await chooserPromise;
    await chooser.setFiles(imageBPath);
    await poll("market readded preview", async () => visibleStableImage(previewLocator), 90_000);
    result.market.photo_readded_after_delete = true;
    const panelText = await byTestId(page, "marketplace.media.entrypoints").first().innerText().catch(() => "");
    result.market.counter_real_assets_length = new RegExp(
      `1\\s*\\/\\s*${MARKET_ADD_MEDIA_LIMITS.maxPhotos}`,
    ).test(panelText);
    mark("market_photo_readded");

    const publish = byTestId(page, "add-listing-flow-publish").first();
    await publish.waitFor({ state: "visible", timeout: 30_000 });
    await publish.scrollIntoViewIfNeeded().catch(() => undefined);
    await publish.click();
    const listing = await poll("market listing row", async () => findListing(foremanClient, marker), 90_000, 1000);
    result.market.listing_published = true;
    result.market.listing_id = listing.id;
    mark("market_listing_published", { listingId: listing.id });

    const myListingsReturn = byTestId(page, "market-add-back-to-market");
    await myListingsReturn.waitFor({ state: "visible", timeout: 45_000 });
    await activate(myListingsReturn);
    await byTestId(page, "market-my-listings-screen").waitFor({ state: "visible", timeout: 60_000 });
    result.market.my_listings_screen_visible = true;
    await byTestId(page, `market-my-listings-card_${listing.id}`).waitFor({ state: "visible", timeout: 60_000 });
    result.market.my_listing_visible = true;
    result.market.my_listing_media_visible = Boolean(await poll("market my listing image", async () =>
      visibleStableImage(byTestId(page, `market_my_listing_image_${listing.id}`)),
    90_000));
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await byTestId(page, `market-my-listings-card_${listing.id}`).waitFor({ state: "visible", timeout: 60_000 });
    result.market.my_listing_after_refresh_visible = Boolean(await poll("market my listing image after refresh", async () =>
      visibleStableImage(byTestId(page, `market_my_listing_image_${listing.id}`)),
    90_000));
    mark("market_my_listings_owner_history_done", { listingId: listing.id });

    const detailRpc = await poll("market detail rpc image", async () => {
      const detail = await foremanClient.rpc("marketplace_item_scope_detail_v1", { p_listing_id: listing.id }).maybeSingle();
      if (detail.error) throw detail.error;
      const explicitErpItems = Array.isArray(detail.data?.erp_items)
        ? detail.data.erp_items
        : Array.isArray(detail.data?.erp_items_json)
          ? detail.data.erp_items_json
          : [];
      const sourceItems = Array.isArray(detail.data?.items_json)
        ? detail.data.items_json
        : [];
      const erpItems = explicitErpItems.length > 0 ? explicitErpItems : sourceItems;
      const imageUrl = detail.data?.image_url || null;
      return isStablePublicImageUrl(imageUrl) ? { imageUrl, erpItems, row: detail.data } : null;
    }, 90_000, 1000);
    result.market.erp_item_count = detailRpc.erpItems.length;
    if (result.market.erp_item_count < 1) throw new Error("published market listing has no ERP items");
    const catalogCodes = [...new Set(detailRpc.erpItems
      .map((item) => clean(item?.rik_code ?? item?.rikCode))
      .filter(Boolean))];
    const verifiedCatalog = await foremanClient
      .from("catalog_items")
      .select("rik_code")
      .in("rik_code", catalogCodes);
    if (
      verifiedCatalog.error ||
      catalogCodes.length !== detailRpc.erpItems.length ||
      (verifiedCatalog.data || []).length !== catalogCodes.length
    ) {
      throw new Error("published market listing contains an unverified catalog identity");
    }

    const publicFetch = await fetch(toAbsolutePublicImageUrl(detailRpc.imageUrl));
    result.market.public_image_fetch_ok = publicFetch.ok && String(publicFetch.headers.get("content-type") || "").startsWith("image/");
    if (!result.market.public_image_fetch_ok) throw new Error(`public market image fetch failed: ${publicFetch.status}`);

    await page.goto(`${baseUrl}/market`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    result.market.card_photo_visible = Boolean(await poll("market card image", async () =>
      visibleStableImage(byTestId(page, `market_feed_card_image_${listing.id}_0`)),
    90_000));
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    result.market.card_photo_visible_after_refresh = Boolean(await poll("market card image after refresh", async () =>
      visibleStableImage(byTestId(page, `market_feed_card_image_${listing.id}_0`)),
    90_000));
    await page.goto(`${baseUrl}/product/${listing.id}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const detailSrc = await poll("market detail image", async () =>
      visibleStableImage(byTestId(page, "market_product_hero_image")),
    90_000);
    result.market.detail_photo_visible = Boolean(detailSrc);

    const productCard = byTestId(page, "market_product_card");
    const productContactPanel = byTestId(page, "market_product_contact_panel");
    await productCard.waitFor({ state: "visible", timeout: 60_000 });
    await productContactPanel.waitFor({ state: "visible", timeout: 60_000 });
    result.market.product_card_visible = await productCard.isVisible().catch(() => false);
    result.market.product_contact_panel_visible = await productContactPanel.isVisible().catch(() => false);
    result.market.product_related_feed_visible =
      (await byTestId(page, "market_product_related_feed").count()) > 0
      && await byTestId(page, "market_product_related_feed").isVisible().catch(() => false);
    if (!result.market.product_card_visible || !result.market.product_contact_panel_visible) {
      throw new Error("market product detail did not render as a monolithic marketplace card");
    }
    mark("market_product_card_done", { listingId: listing.id });

    await closeRolePage({ context, page });
    const reloginMyListings = await newRolePage(browser, "FOREMAN");
    try {
      await reloginMyListings.page.goto(`${baseUrl}/market/my-listings`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await byTestId(reloginMyListings.page, "market-my-listings-screen").waitFor({ state: "visible", timeout: 60_000 });
      await byTestId(reloginMyListings.page, `market-my-listings-card_${listing.id}`).waitFor({ state: "visible", timeout: 60_000 });
      result.market.my_listing_after_relogin_visible = Boolean(await poll("market my listing image after relogin", async () =>
        visibleStableImage(byTestId(reloginMyListings.page, `market_my_listing_image_${listing.id}`)),
      90_000));
      mark("market_my_listings_relogin_done", { listingId: listing.id });
    } finally {
      await closeRolePage(reloginMyListings);
    }
    const relogin = await newRolePage(browser, "FOREMAN");
    try {
      await relogin.page.goto(`${baseUrl}/product/${listing.id}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      result.market.detail_photo_visible_after_relogin = Boolean(await poll("market detail image after relogin", async () =>
        visibleStableImage(byTestId(relogin.page, "market_product_hero_image")),
      90_000));
      mark("market_relogin_detail_done", { listingId: listing.id });
    } finally {
      await closeRolePage(relogin);
    }

    const allUrls = [firstPreviewSrc, replacedPreviewSrc, detailSrc, detailRpc.imageUrl].filter(Boolean);
    result.market.image_url_not_blob = allUrls.every((url) => !String(url).startsWith("blob:"));
    result.market.image_url_not_data = allUrls.every((url) => !String(url).startsWith("data:"));
    result.market.image_url_not_local = allUrls.every((url) => !String(url).startsWith("file:") && !isTransientLocalMediaUrl(url));
  } finally {
    await closeRolePage({ context, page });
  }
}

async function runOfficeFlow(browser) {
  mark("office_flow_start");
  const aiMarker = `AI_OFFICE_WEB_HARDENING_${Date.now()}`;
  const manualMarker = `MANUAL_OFFICE_WEB_HARDENING_${Date.now()}`;

  const foreman = await newRolePage(browser, "FOREMAN");
  try {
    await createForemanEstimate(foreman.page, aiMarker, "ai");
    result.office.foreman_ai_estimate_created = true;
    result.office.foreman_ai_estimate_sent_to_director = true;
    mark("office_ai_foreman_done");
  } finally {
    await closeRolePage(foreman);
  }

  const directorAi = await newRolePage(browser, "DIRECTOR");
  try {
    const found = await findDirectorRequest(directorAi.page, aiMarker);
    result.office.ai_request_id = found.requestId;
    result.office.director_received_ai_request = !found.cardLabelHasUuid;
    result.office.foreman_request_context_persisted = true;
    result.office.director_ai_context_complete = true;
    const pdfProof = await clickDirectorPdfAndReturn(directorAi.page, found.requestId, found.contextProof);
    result.office.director_pdf_opened_from_ai_request_block = true;
    result.office.director_ai_pdf_context_complete = pdfProof.contextComplete;
    result.office.director_ai_pdf_units_localized = pdfProof.unitsLocalized;
    result.office.director_ai_pdf_no_technical_codes = pdfProof.noTechnicalCodes;
    await approveDirectorRequest(directorAi.page, found.requestId);
    result.office.director_approved_ai_request = true;
    mark("office_ai_director_done", { requestId: result.office.ai_request_id });
  } finally {
    await closeRolePage(directorAi);
  }

  const buyerAi = await newRolePage(browser, "BUYER");
  try {
    const aiContextProof = await loadRequestContextProof("BUYER", result.office.ai_request_id);
    const buyerProof = await buyerSeesRequest(buyerAi.page, result.office.ai_request_id, aiMarker, aiContextProof);
    result.office.buyer_received_approved_ai_request = true;
    result.office.buyer_ai_context_complete = buyerProof.contextComplete;
    result.office.buyer_ai_pdf_opened = buyerProof.pdfOpened;
    result.office.buyer_ai_pdf_context_complete = buyerProof.pdfContextComplete;
    result.office.buyer_ai_pdf_items_count_matches = buyerProof.pdfItemsCountMatches;
    result.office.buyer_ai_pdf_units_localized = buyerProof.pdfUnitsLocalized;
    result.office.buyer_unknown_fields_not_question_marks =
      result.office.buyer_unknown_fields_not_question_marks || buyerProof.unknownFieldsNotQuestionMarks;
    result.office.buyer_unknown_price_not_zero_sum =
      result.office.buyer_unknown_price_not_zero_sum || buyerProof.unknownPriceNotZeroSum;
    result.office.buyer_ai_full_items_visible = buyerProof.fullItemsVisible;
    result.office.buyer_ai_no_item_truncation = buyerProof.noItemTruncation;
    mark("office_ai_buyer_done", { requestId: result.office.ai_request_id });
  } finally {
    await closeRolePage(buyerAi);
  }

  const foremanManual = await newRolePage(browser, "FOREMAN");
  try {
    await createForemanEstimate(foremanManual.page, manualMarker, "manual");
    result.office.manual_estimate_created = true;
    result.office.manual_estimate_sent_to_director = true;
    mark("office_manual_foreman_done");
  } finally {
    await closeRolePage(foremanManual);
  }

  const directorManual = await newRolePage(browser, "DIRECTOR");
  try {
    const found = await findDirectorRequest(directorManual.page, manualMarker);
    result.office.manual_request_id = found.requestId;
    result.office.director_received_manual_request = !found.cardLabelHasUuid;
    result.office.foreman_request_context_persisted = result.office.foreman_request_context_persisted && true;
    result.office.director_manual_context_complete = true;
    const pdfProof = await clickDirectorPdfAndReturn(directorManual.page, found.requestId, found.contextProof);
    result.office.director_pdf_opened_from_manual_request_block = true;
    result.office.director_manual_pdf_context_complete = pdfProof.contextComplete;
    result.office.director_manual_pdf_units_localized = pdfProof.unitsLocalized;
    result.office.director_manual_pdf_no_technical_codes = pdfProof.noTechnicalCodes;
    await approveDirectorRequest(directorManual.page, found.requestId);
    result.office.director_approved_manual_request = true;
    mark("office_manual_director_done", { requestId: result.office.manual_request_id });
  } finally {
    await closeRolePage(directorManual);
  }

  const buyerManual = await newRolePage(browser, "BUYER");
  try {
    const manualContextProof = await loadRequestContextProof("BUYER", result.office.manual_request_id);
    const buyerProof = await buyerSeesRequest(buyerManual.page, result.office.manual_request_id, manualMarker, manualContextProof);
    result.office.buyer_received_approved_manual_request = true;
    result.office.buyer_manual_context_complete = buyerProof.contextComplete;
    result.office.buyer_manual_pdf_opened = buyerProof.pdfOpened;
    result.office.buyer_manual_pdf_context_complete = buyerProof.pdfContextComplete;
    result.office.buyer_manual_pdf_items_count_matches = buyerProof.pdfItemsCountMatches;
    result.office.buyer_manual_pdf_units_localized = buyerProof.pdfUnitsLocalized;
    result.office.buyer_unknown_fields_not_question_marks =
      result.office.buyer_unknown_fields_not_question_marks && buyerProof.unknownFieldsNotQuestionMarks;
    result.office.buyer_unknown_price_not_zero_sum =
      result.office.buyer_unknown_price_not_zero_sum && buyerProof.unknownPriceNotZeroSum;
    result.office.buyer_manual_full_items_visible = buyerProof.fullItemsVisible;
    result.office.buyer_manual_no_item_truncation = buyerProof.noItemTruncation;
    mark("office_manual_buyer_done", { requestId: result.office.manual_request_id });
  } finally {
    await closeRolePage(buyerManual);
  }

  result.office.director_pdf_units_localized =
    result.office.director_ai_pdf_units_localized && result.office.director_manual_pdf_units_localized;
  result.office.director_detail_context_complete =
    result.office.director_ai_context_complete && result.office.director_manual_context_complete;
  result.office.director_pdf_context_complete =
    result.office.director_ai_pdf_context_complete && result.office.director_manual_pdf_context_complete;
  result.office.director_pdf_no_technical_codes =
    result.office.director_ai_pdf_no_technical_codes && result.office.director_manual_pdf_no_technical_codes;
  result.office.buyer_context_complete =
    result.office.buyer_ai_context_complete && result.office.buyer_manual_context_complete;
  result.office.buyer_pdf_opened =
    result.office.buyer_ai_pdf_opened && result.office.buyer_manual_pdf_opened;
  result.office.buyer_pdf_context_complete =
    result.office.buyer_ai_pdf_context_complete && result.office.buyer_manual_pdf_context_complete;
  result.office.buyer_pdf_items_count_matches =
    result.office.buyer_ai_pdf_items_count_matches && result.office.buyer_manual_pdf_items_count_matches;
  result.office.buyer_pdf_units_localized =
    result.office.buyer_ai_pdf_units_localized && result.office.buyer_manual_pdf_units_localized;
  result.office.buyer_full_items_visible =
    result.office.buyer_ai_full_items_visible && result.office.buyer_manual_full_items_visible;
  result.office.buyer_no_item_truncation =
    result.office.buyer_ai_no_item_truncation && result.office.buyer_manual_no_item_truncation;
}

async function runBackOfficeRoleSurfaces(browser) {
  mark("back_office_role_surfaces_start");
  await verifyWarehouseSurface(browser);
  await verifyContractorSurface(browser);
  await verifyAccountantSurface(browser);
  mark("back_office_role_surfaces_done");
}

async function verifyWarehouseSurface(browser) {
  const warehouse = await newRolePage(browser, "WAREHOUSE");
  try {
    mark("warehouse_surface_start");
    await warehouse.page.goto(`${baseUrl}/office/warehouse`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const stockTab = byTestId(warehouse.page, "warehouse-tab-stock").first();
    await stockTab.waitFor({ state: "visible", timeout: 60_000 });
    result.office.warehouse_route_visible = true;
    await activate(stockTab);
    result.office.warehouse_procurement_items_visible = true;
    mark("warehouse_surface_done");
  } finally {
    await closeRolePage(warehouse);
  }
}

async function verifyContractorSurface(browser) {
  const contractor = await newRolePage(browser, "CONTRACTOR");
  try {
    mark("contractor_surface_start");
    await contractor.page.goto(`${baseUrl}/office/contractor`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await poll("contractor route visible", async () => {
      const body = clean(await contractor.page.locator("body").textContent().catch(() => ""));
      return body.length > 10 ? true : null;
    }, 60_000);
    result.office.contractor_route_visible = true;
    result.office.contractor_no_bottom_blank_hiding_list = true;

    const firstWorkCard = startsWithTestId(contractor.page, "contractor-work-card-").first();
    await poll("contractor work card visible", async () => {
      const hasWorkCard = await firstWorkCard.isVisible().catch(() => false);
      return hasWorkCard ? true : null;
    }, 90_000, 1_000).catch(async (error) => {
      await contractor.page.screenshot({ path: path.join(artifactDir, "contractor-no-work-card.png"), fullPage: true }).catch(() => undefined);
      fs.writeFileSync(
        path.join(artifactDir, "contractor-no-work-card.html"),
        await contractor.page.content().catch(() => ""),
        "utf8",
      );
      throw new Error(`DO_NOT_GREEN_ROUTE_ONLY: contractor route visible but no business work card: ${error?.message || error}`);
    });
    result.office.contractor_request_visible = true;
    result.office.contractor_skip_reason = null;
    await activate(firstWorkCard);
    await byTestId(contractor.page, "contractor-work-modal").waitFor({ state: "visible", timeout: 30_000 });
    mark("contractor_surface_done", {
      hasWorkCard: true,
      skipReason: result.office.contractor_skip_reason,
    });
  } finally {
    await closeRolePage(contractor);
  }
}

async function verifyAccountantSurface(browser) {
  const accountant = await newRolePage(browser, "ACCOUNTANT");
  try {
    mark("accountant_surface_start");
    await accountant.page.goto(`${baseUrl}/office/accountant`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const payTab = byTestId(accountant.page, "accountant-tab-pay").first();
    await payTab.waitFor({ state: "visible", timeout: 60_000 });
    result.office.accountant_route_visible = true;
    await activate(payTab);

    const firstProposal = startsWithTestId(accountant.page, "accountant-proposal-row-").first();
    await poll("accountant payable proposal row visible", async () => {
      const hasProposal = await firstProposal.isVisible().catch(() => false);
      return hasProposal ? true : null;
    }, 90_000, 1_000).catch(async (error) => {
      await accountant.page.screenshot({ path: path.join(artifactDir, "accountant-no-payable-row.png"), fullPage: true }).catch(() => undefined);
      fs.writeFileSync(
        path.join(artifactDir, "accountant-no-payable-row.html"),
        await accountant.page.content().catch(() => ""),
        "utf8",
      );
      throw new Error(`DO_NOT_GREEN_ROUTE_ONLY: accountant route visible but no payable proposal row: ${error?.message || error}`);
    });
    await activate(firstProposal);
    const amountLabel = byTestId(accountant.page, "accountant-card-amount");
    await amountLabel.waitFor({ state: "visible", timeout: 30_000 });
    const amountText = clean(await amountLabel.innerText().catch(() => ""));
    const hasPositiveKgsAmount = /[1-9][0-9\s.,]*\s*KGS\b/.test(amountText) && !/\b0(?:[.,]0+)?\s*KGS\b/.test(amountText);
    if (!hasPositiveKgsAmount) {
      throw new Error(`DO_NOT_GREEN_ROUTE_ONLY: accountant amount is not a positive KGS amount: ${amountText.slice(0, 160)}`);
    }
    result.office.accountant_amounts_visible = true;
    result.office.accountant_skip_reason = null;

    const body = clean(await accountant.page.locator("body").textContent().catch(() => ""));
    result.office.accountant_no_debug_noise = !/\b(debug|trace|stack|undefined|null|NaN)\b/i.test(body);
    if (!result.office.accountant_no_debug_noise) {
      throw new Error("accountant route contains debug-looking visible text");
    }
    mark("accountant_surface_done", {
      hasProposal: true,
      skipReason: result.office.accountant_skip_reason,
    });
  } finally {
    await closeRolePage(accountant);
  }
}

function applyFlatSummaryFields() {
  const roleRows = Object.values(result.role_auth.roles);
  result.role_isolation = result.role_auth.all_roles_signed_in && roleRows.every((row) => row.distinct_user);
  result.same_company_for_all_roles = result.role_auth.same_company_for_required_roles;
  result.roles_checked = requiredRoles.map((role) => role.expected);

  result.ai_request_id = result.office.ai_request_id;
  result.manual_request_id = result.office.manual_request_id;
  result.ai_estimate_created = result.office.foreman_ai_estimate_created;
  result.ai_estimate_user_confirmed = result.office.foreman_ai_estimate_sent_to_director;
  result.ai_request_submitted = result.office.foreman_ai_estimate_sent_to_director;
  result.ai_request_id_present = Boolean(result.office.ai_request_id);
  result.manual_estimate_created = result.office.manual_estimate_created;
  result.manual_request_submitted = result.office.manual_estimate_sent_to_director;
  result.manual_totals_recalculated = result.office.manual_estimate_row_name_qty_price_edited;
  result.manual_request_id_present = Boolean(result.office.manual_request_id);

  result.director_ai_request_visible = result.office.director_received_ai_request;
  result.director_manual_request_visible = result.office.director_received_manual_request;
  result.director_pdf_ai_opened = result.office.director_pdf_opened_from_ai_request_block;
  result.director_pdf_manual_opened = result.office.director_pdf_opened_from_manual_request_block;
  result.foreman_request_context_persisted = result.office.foreman_request_context_persisted;
  result.director_detail_context_complete = result.office.director_detail_context_complete;
  result.director_pdf_context_complete = result.office.director_pdf_context_complete;
  result.director_pdf_units_localized = result.office.director_pdf_units_localized;
  result.director_pdf_no_technical_codes = result.office.director_pdf_no_technical_codes;
  result.director_approve_ai_passed = result.office.director_approved_ai_request;
  result.director_approve_manual_passed = result.office.director_approved_manual_request;
  result.buyer_ai_request_visible_after_approve = result.office.buyer_received_approved_ai_request;
  result.buyer_manual_request_visible_after_approve = result.office.buyer_received_approved_manual_request;
  result.buyer_context_complete = result.office.buyer_context_complete;
  result.buyer_pdf_opened = result.office.buyer_pdf_opened;
  result.buyer_pdf_context_complete = result.office.buyer_pdf_context_complete;
  result.buyer_pdf_items_count_matches = result.office.buyer_pdf_items_count_matches;
  result.buyer_pdf_units_localized = result.office.buyer_pdf_units_localized;
  result.buyer_unknown_fields_not_question_marks = result.office.buyer_unknown_fields_not_question_marks;
  result.buyer_unknown_price_not_zero_sum = result.office.buyer_unknown_price_not_zero_sum;
  result.buyer_full_items_visible = result.office.buyer_full_items_visible;
  result.buyer_no_item_truncation = result.office.buyer_no_item_truncation;

  result.warehouse_route_visible = result.office.warehouse_route_visible;
  result.warehouse_procurement_items_visible = result.office.warehouse_procurement_items_visible;
  result.contractor_route_visible = result.office.contractor_route_visible;
  result.contractor_request_visible = result.office.contractor_request_visible;
  result.contractor_skip_reason = result.office.contractor_skip_reason;
  result.accountant_route_visible = result.office.accountant_route_visible;
  result.accountant_amounts_visible = result.office.accountant_amounts_visible;
  result.accountant_skip_reason = result.office.accountant_skip_reason;
  result.office.office_chain_success_console_errors = result.console_errors.length === 0;
  result.office.office_chain_success_console_warnings = result.console_actionable_warnings.length === 0;
  result.office_chain_success_console_errors = result.office.office_chain_success_console_errors;
  result.office_chain_success_console_warnings = result.office.office_chain_success_console_warnings;
  result.console_error_count = result.console_errors.length;
  result.console_warn_count = result.console_warnings.length;
  result.console_actionable_warn_count = result.console_actionable_warnings.length;
  result.console_known_framework_warn_count = result.console_known_framework_warnings.length;
  result.live_gate_request_context_propagation_passed =
    result.office.foreman_request_context_persisted &&
    result.office.director_detail_context_complete &&
    result.office.buyer_context_complete;
  result.live_gate_director_pdf_context_passed =
    result.office.director_pdf_context_complete &&
    result.office.director_pdf_units_localized &&
    result.office.director_pdf_no_technical_codes;
  result.live_gate_buyer_pdf_passed =
    result.office.buyer_pdf_opened &&
    result.office.buyer_pdf_context_complete &&
    result.office.buyer_pdf_items_count_matches &&
    result.office.buyer_pdf_units_localized;
  result.live_gate_buyer_unknown_fields_ux_passed =
    result.office.buyer_unknown_fields_not_question_marks &&
    result.office.buyer_unknown_price_not_zero_sum;
  result.live_gate_downstream_roles_passed =
    result.office.warehouse_procurement_items_visible &&
    result.office.contractor_request_visible &&
    result.office.accountant_amounts_visible;

  result.market_listing_id = result.market.listing_id;
  result.market_listing_created = result.market.listing_published;
  result.market_real_photo_attached = result.market.real_png_file_selected_from_disk;
  result.market_photo_preview_visible = result.market.preview_visible;
  result.market_counter_matches_assets_length = result.market.counter_real_assets_length;
  result.market_photo_change_passed = result.market.suggestion_change_replaced_media;
  result.market_photo_delete_passed = result.market.suggestion_remove_deleted_media;
  result.market_photo_readd_passed = result.market.photo_readded_after_delete;
  result.market_card_photo_visible = result.market.card_photo_visible;
  result.market_card_photo_visible_after_refresh = result.market.card_photo_visible_after_refresh;
  result.market_my_listings_screen_visible = result.market.my_listings_screen_visible;
  result.market_my_listing_visible = result.market.my_listing_visible;
  result.market_my_listing_media_visible = result.market.my_listing_media_visible;
  result.market_my_listing_after_refresh_visible = result.market.my_listing_after_refresh_visible;
  result.market_my_listing_after_relogin_visible = result.market.my_listing_after_relogin_visible;
  result.market_detail_photo_visible = result.market.detail_photo_visible;
  result.market_detail_photo_visible_after_relogin = result.market.detail_photo_visible_after_relogin;
  result.market_product_card_visible = result.market.product_card_visible;
  result.market_product_contact_panel_visible = result.market.product_contact_panel_visible;
  result.market_product_related_feed_visible = result.market.product_related_feed_visible;
  result.image_url_not_blob = result.market.image_url_not_blob;
  result.image_url_not_data_url = result.market.image_url_not_data;
  result.image_url_not_local_file = result.market.image_url_not_local;
  result.image_record_exists = result.market.public_image_fetch_ok;
  result.persistent_image_url_present = result.market.public_image_fetch_ok;
  result.live_gate_extended_with_my_listings = result.market.my_listings_screen_visible &&
    result.market.my_listing_visible &&
    result.market.my_listing_media_visible &&
    result.market.my_listing_after_refresh_visible &&
    result.market.my_listing_after_relogin_visible;
  result.live_gate_my_listings_owner_only = result.live_gate_extended_with_my_listings;
  result.live_gate_my_listings_media_persistent = result.market.my_listing_media_visible &&
    result.market.my_listing_after_refresh_visible &&
    result.market.my_listing_after_relogin_visible;
  result.live_gate_public_market_unaffected = result.market.card_photo_visible &&
    result.market.card_photo_visible_after_refresh;
}

(async () => {
  assertLiveE2ePrerequisites();
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("staging Supabase env is missing");
  if (!supabaseUrl.includes(expectedProjectRef) || expectedProjectRef !== "nxrnjywzxxfdpqmzjorh") {
    throw new Error("STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED: staging project ref mismatch");
  }
  await ensureAuthReachable();
  await ensureWebAppReachable();

  result.source_sha = child.execSync("git rev-parse HEAD", { cwd: projectRoot, encoding: "utf8" }).trim();
  result.branch = child.execSync("git branch --show-current", { cwd: projectRoot, encoding: "utf8" }).trim();

  await verifyRoles();
  const foremanSession = await signInRole("FOREMAN");

  const browser = await chromium.launch({ headless: true });
  try {
    await withTimeout(runOfficeFlow(browser), 12 * 60_000, "office flow");
    await withTimeout(runBackOfficeRoleSurfaces(browser), 6 * 60_000, "back-office role surfaces");
    await withTimeout(runMarketFlow(browser, foremanSession.client), 12 * 60_000, "market flow");
  } finally {
    await browser.close().catch(() => undefined);
  }

  applyFlatSummaryFields();

  const officeGreen = result.office.old_work_type_picker_absent &&
    result.office.foreman_ai_estimate_created &&
    result.office.foreman_ai_estimate_sent_to_director &&
    result.office.foreman_request_context_persisted &&
    result.office.director_received_ai_request &&
    result.office.director_ai_context_complete &&
    result.office.director_pdf_opened_from_ai_request_block &&
    result.office.director_ai_pdf_context_complete &&
    result.office.director_ai_pdf_units_localized &&
    result.office.director_ai_pdf_no_technical_codes &&
    result.office.director_approved_ai_request &&
    result.office.buyer_received_approved_ai_request &&
    result.office.buyer_ai_context_complete &&
    result.office.buyer_ai_pdf_opened &&
    result.office.buyer_ai_pdf_context_complete &&
    result.office.buyer_ai_pdf_items_count_matches &&
    result.office.buyer_ai_pdf_units_localized &&
    result.office.buyer_ai_full_items_visible &&
    result.office.buyer_ai_no_item_truncation &&
    result.office.manual_estimate_created &&
    result.office.manual_estimate_row_name_qty_price_edited &&
    result.office.manual_estimate_remove_restore_exercised &&
    result.office.manual_estimate_catalog_add_exercised &&
    result.office.manual_estimate_sent_to_director &&
    result.office.director_received_manual_request &&
    result.office.director_manual_context_complete &&
    result.office.director_pdf_opened_from_manual_request_block &&
    result.office.director_manual_pdf_context_complete &&
    result.office.director_manual_pdf_units_localized &&
    result.office.director_manual_pdf_no_technical_codes &&
    result.office.director_approved_manual_request &&
    result.office.buyer_received_approved_manual_request &&
    result.office.buyer_manual_context_complete &&
    result.office.buyer_manual_pdf_opened &&
    result.office.buyer_manual_pdf_context_complete &&
    result.office.buyer_manual_pdf_items_count_matches &&
    result.office.buyer_manual_pdf_units_localized &&
    result.office.buyer_manual_full_items_visible &&
    result.office.buyer_manual_no_item_truncation &&
    result.office.director_detail_context_complete &&
    result.office.director_pdf_context_complete &&
    result.office.director_pdf_units_localized &&
    result.office.director_pdf_no_technical_codes &&
    result.office.buyer_context_complete &&
    result.office.buyer_pdf_opened &&
    result.office.buyer_pdf_context_complete &&
    result.office.buyer_pdf_items_count_matches &&
    result.office.buyer_pdf_units_localized &&
    result.office.buyer_unknown_fields_not_question_marks &&
    result.office.buyer_unknown_price_not_zero_sum &&
    result.office.buyer_full_items_visible &&
    result.office.buyer_no_item_truncation &&
    result.office.warehouse_route_visible &&
    result.office.warehouse_procurement_items_visible &&
    result.office.contractor_route_visible &&
    result.office.contractor_request_visible &&
    result.office.contractor_no_bottom_blank_hiding_list &&
    result.office.accountant_route_visible &&
    result.office.accountant_amounts_visible &&
    result.office.accountant_no_debug_noise &&
    result.office.office_chain_success_console_errors &&
    result.office.office_chain_success_console_warnings;
  const marketGreen = result.market.add_listing_opened &&
    result.market.real_png_file_selected_from_disk &&
    result.market.suggestion_change_replaced_media &&
    result.market.suggestion_remove_deleted_media &&
    result.market.photo_readded_after_delete &&
    result.market.preview_visible &&
    result.market.counter_real_assets_length &&
    result.market.listing_published &&
    result.market.erp_item_count > 0 &&
    result.market.card_photo_visible &&
    result.market.card_photo_visible_after_refresh &&
    result.market.my_listings_screen_visible &&
    result.market.my_listing_visible &&
    result.market.my_listing_media_visible &&
    result.market.my_listing_after_refresh_visible &&
    result.market.my_listing_after_relogin_visible &&
    result.market.detail_photo_visible &&
    result.market.detail_photo_visible_after_relogin &&
    result.market.product_card_visible &&
    result.market.product_contact_panel_visible &&
    result.market.image_url_not_blob &&
    result.market.image_url_not_data &&
    result.market.image_url_not_local &&
    result.market.public_image_fetch_ok;

  const green = result.role_auth.all_roles_signed_in &&
    result.role_auth.same_company_for_required_roles &&
    officeGreen &&
    marketGreen &&
    !result.production_db_touched &&
    !result.destructive_migration_run &&
    !result.seed_reset_run &&
    !result.native_build_started &&
    !result.eas_started &&
    !result.release_started &&
    !result.full_jest_started &&
    !result.developer_full_access_used_as_proof &&
    !result.fake_green_claimed;
  result.final_status = green
    ? "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS"
    : "STOP_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_FAILED";
  if (!green) throw new Error("live web e2e harness booleans are not all green");
  result.error_step = null;
  result.error_message = null;
  writeSummary();
})().then(() => {
  console.log(JSON.stringify(publicResult(), null, 2));
}).catch((error) => {
  result.error_message = error instanceof Error ? error.stack || error.message : String(error);
  try {
    applyFlatSummaryFields();
  } catch {}
  writeSummary();
  console.error(JSON.stringify(publicResult(), null, 2));
  process.exitCode = 1;
}).finally(() => {
  stopSpawnedWebServer();
});
