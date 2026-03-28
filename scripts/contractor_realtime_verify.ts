import { randomUUID } from "node:crypto";

import {
  admin,
  baseUrl,
  bodyText,
  cleanupTempUser,
  countEvents,
  createTempUser,
  findEvent,
  getObservabilityEvents,
  hasBlockingConsoleErrors,
  launchRolePage,
  maybeConfirmFio,
  poll,
  waitForObservability,
  writeArtifact,
} from "./_shared/realtimeWebRuntime";
import { createRealtimeAndroidRuntime } from "./_shared/realtimeAndroidRuntime";

const artifactBase = "artifacts/contractor-realtime";
const webRuntimePath = `${artifactBase}.web.json`;
const androidRuntimePath = `${artifactBase}.android.json`;
const screenshotPath = `${artifactBase}.png`;
const tempUserRole = process.env.CONTRACTOR_WAVE2_ROLE || "foreman";
const androidRuntime = createRealtimeAndroidRuntime({
  projectRoot: process.cwd(),
  devClientPort: Number(process.env.CONTRACTOR_ANDROID_DEV_PORT ?? "8081"),
});

type RuntimeEvent = {
  screen?: string | null;
  category?: string | null;
  event?: string | null;
  result?: string | null;
  sourceKind?: string | null;
  extra?: Record<string, unknown> | null;
};

type PlatformResult = {
  passed: boolean;
  subscriptionStarted: boolean;
  subscriptionConnected: boolean;
  eventReceived: boolean;
  refreshTriggered: boolean;
  doubleFetchDetected: boolean;
  inflightGuardWorked: boolean;
  recentGuardWorked: boolean;
  backendOwnerPreserved: boolean;
  uiUpdated: boolean;
  detailUpdated: boolean;
  fetchCountAfterRealtime: number;
  failureStage:
    | "subscribe_failed"
    | "event_not_received"
    | "refresh_not_triggered"
    | "ui_not_updated"
    | "detail_not_updated"
    | "unknown";
  platformSpecificIssues: string[];
  screenshot?: string;
  preflight?: unknown;
  recovery?: Record<string, boolean>;
  fioConfirmed?: boolean;
};

type SeededScope = {
  contractorId: string;
  contractorOrg: string;
  updatedContractorOrg: string;
  subcontractId: string;
  requestId: string;
  requestItemId: string;
  purchaseId: string;
  purchaseItemId: string;
  progressId: string;
  initialObjectName: string;
  initialWorkName: string;
  updatedObjectName: string;
  updatedWorkName: string;
};

type AndroidNode = {
  text: string;
  contentDesc: string;
  clickable: boolean;
  enabled: boolean;
  bounds: string;
};

const tableMatches = new Set(["contractors", "requests", "request_items", "work_progress", "subcontracts", "purchase_items"]);
const CONTRACTOR_HOME_LABEL_RE = /Подрядчик|РџРѕРґСЂСЏРґС‡РёРє/i;
const CONTRACTOR_ACTIVATION_LABEL_RE = /Активац|РђРєС‚РёРІР°С†/i;

const normalizeSurfaceText = (value: string) => value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const isContractorSurfaceText = (text: string, scope: SeededScope) =>
  text.includes(scope.contractorOrg) ||
  text.includes(scope.initialWorkName) ||
  CONTRACTOR_ACTIVATION_LABEL_RE.test(text);
const isContractorSurfaceXml = (xml: string, scope: SeededScope) =>
  xml.includes(scope.contractorOrg) ||
  xml.includes(scope.initialWorkName) ||
  CONTRACTOR_ACTIVATION_LABEL_RE.test(xml);

const findContractorTabNode = (nodes: AndroidNode[]) =>
  nodes.find(
    (node) =>
      node.clickable &&
      node.enabled &&
      CONTRACTOR_HOME_LABEL_RE.test(`${node.text} ${node.contentDesc}`),
  ) ?? null;

const sliceRealtimeWindow = (events: RuntimeEvent[]) => {
  const startIndex = events.findIndex(
    (event) => event.screen === "contractor" && event.event === "realtime_refresh_triggered",
  );
  return startIndex >= 0 ? events.slice(startIndex) : events;
};

const slicePrimaryRefreshWindow = (events: RuntimeEvent[]) => {
  const realtimeWindow = sliceRealtimeWindow(events);
  const nextTriggerIndex = realtimeWindow.findIndex(
    (event, index) =>
      index > 0 && event.screen === "contractor" && event.event === "realtime_refresh_triggered",
  );
  return nextTriggerIndex >= 0 ? realtimeWindow.slice(0, nextTriggerIndex) : realtimeWindow;
};

async function waitForStableEventCount<T>(
  label: string,
  readEvents: () => Promise<T[]> | T[],
  timeoutMs = 10_000,
  delayMs = 750,
) {
  let lastCount = -1;
  return poll(
    label,
    async () => {
      const events = await readEvents();
      if (events.length > 0 && events.length === lastCount) return events;
      lastCount = events.length;
      return null;
    },
    timeoutMs,
    delayMs,
  );
}

async function settleAndroidContractorSurface(
  scope: SeededScope,
  packageName: string | null,
  initialXml: string,
) {
  if (isContractorSurfaceXml(initialXml, scope)) {
    return androidRuntime.harness.dumpAndroidScreen("android-contractor-realtime-surface-ready");
  }

  const initialNodes = androidRuntime.harness.parseAndroidNodes(initialXml) as AndroidNode[];
  const tabNode = findContractorTabNode(initialNodes);
  if (tabNode) {
    androidRuntime.harness.tapAndroidBounds(tabNode.bounds);
    const tappedSurface = await androidRuntime.waitForScreenText(
      "contractor:android_tab_settled",
      (xml) => isContractorSurfaceXml(xml, scope),
      30_000,
    ).catch(() => null);
    if (tappedSurface) return tappedSurface;
  }

  return androidRuntime.harness.openAndroidRoute({
    packageName,
    routes: ["rik://contractor", "rik:///contractor", "rik:///%28tabs%29/contractor"],
    artifactBase: "android-contractor-realtime",
    predicate: (xml) => isContractorSurfaceXml(xml, scope),
    renderablePredicate: (xml) => isContractorSurfaceXml(xml, scope),
    timeoutMs: 30_000,
    delayMs: 1200,
  });
}

async function ensureContractorRealtimeUser(user: Awaited<ReturnType<typeof createTempUser>>) {
  const userProfileResult = await admin
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: "Contractor Realtime Verify",
        is_contractor: true,
      },
      { onConflict: "user_id" },
    );
  if (userProfileResult.error) throw userProfileResult.error;
}

async function seedContractorRealtimeScope(
  user: Awaited<ReturnType<typeof createTempUser>>,
): Promise<SeededScope> {
  await ensureContractorRealtimeUser(user);

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const contractorOrg = `RT Contractor ${suffix}`;
  const contractorInn = `7700${suffix.replace(/\D/g, "7").slice(-8).padStart(8, "7")}`;
  const initialObjectName = `RTOBJ-${suffix}`;
  const initialWorkName = `RTWORK-${suffix}`;
  const updatedContractorOrg = `${contractorOrg} UPD`;
  const updatedObjectName = `${initialObjectName}-UPD`;
  const updatedWorkName = `${initialWorkName}-UPD`;

  const contractorResult = await admin
    .from("contractors")
    .insert({
      user_id: user.id,
      full_name: "Contractor Realtime Verify",
      company_name: contractorOrg,
      phone: "+996555123456",
      email: user.email,
      inn: contractorInn,
    })
    .select("id")
    .single();
  if (contractorResult.error) throw contractorResult.error;
  const contractorId = String(contractorResult.data.id);

  const subcontractResult = await admin
    .from("subcontracts")
    .insert({
      created_by: user.id,
      status: "approved",
      foreman_name: "Realtime Foreman",
      contractor_org: contractorOrg,
      contractor_inn: contractorInn,
      contractor_rep: "Realtime Rep",
      contractor_phone: "+996555123456",
      contract_number: `CTR-${suffix}`,
      contract_date: new Date().toISOString().slice(0, 10),
      object_name: initialObjectName,
      work_zone: "LVL-01",
      work_type: initialWorkName,
      qty_planned: 10,
      uom: "pcs",
      date_start: new Date().toISOString().slice(0, 10),
      date_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      work_mode: "labor_only",
      price_per_unit: 100,
      total_price: 1000,
      price_type: "by_volume",
      foreman_comment: "Contractor realtime verify",
      approved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (subcontractResult.error) throw subcontractResult.error;
  const subcontractId = String(subcontractResult.data.id);

  const requestResult = await admin
    .from("requests")
    .insert({
      created_by: user.id,
      role: "foreman",
      name: initialWorkName,
      object_name: initialObjectName,
      subcontract_id: subcontractId,
      contractor_job_id: subcontractId,
      company_name_snapshot: contractorOrg,
      company_inn_snapshot: contractorInn,
      status: "Утверждено",
      submitted_at: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (requestResult.error) throw requestResult.error;
  const requestId = String(requestResult.data.id);

  const requestItemResult = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: initialWorkName,
      qty: 1,
      rik_code: `RT-${suffix}`,
      uom: "pcs",
      row_no: 1,
      position_order: 1,
      kind: "work",
    })
    .select("id")
    .single();
  if (requestItemResult.error) throw requestItemResult.error;
  const requestItemId = String(requestItemResult.data.id);

  const purchaseResult = await admin
    .from("purchases")
    .insert({
      created_by: user.id,
      request_id: requestId,
      object_name: initialObjectName,
      supplier: contractorOrg,
      currency: "KGS",
    })
    .select("id")
    .single();
  if (purchaseResult.error) throw purchaseResult.error;
  const purchaseId = String(purchaseResult.data.id);

  const purchaseItemResult = await admin
    .from("purchase_items")
    .insert({
      purchase_id: purchaseId,
      request_item_id: requestItemId,
      name_human: initialWorkName,
      qty: 1,
      uom: "pcs",
      price_per_unit: 100,
    })
    .select("id")
    .single();
  if (purchaseItemResult.error) throw purchaseItemResult.error;
  const purchaseItemId = String(purchaseItemResult.data.id);

  const progressId = randomUUID();
  const workProgressResult = await admin
    .from("work_progress")
    .insert({
      id: progressId,
      purchase_item_id: purchaseItemId,
      contractor_id: contractorId,
      contractor_name: contractorOrg,
      qty_planned: 1,
      qty_done: 0,
      qty_left: 1,
      status: "active",
      uom: "pcs",
      work_dt: new Date().toISOString().slice(0, 10),
      location: initialObjectName,
    })
    .select("id")
    .single();
  if (workProgressResult.error) throw workProgressResult.error;

  await poll(
    "contractor_realtime_seed_visible",
    async () => {
      const { data, error } = await admin.rpc("contractor_inbox_scope_v1" as never, {
        p_my_contractor_id: contractorId,
        p_is_staff: false,
      } as never);
      if (error) throw error;
      const rows = Array.isArray((data as { rows?: unknown[] } | null)?.rows)
        ? ((data as { rows: Array<Record<string, unknown>> }).rows)
        : [];
      return rows.some(
        (row) =>
          String(row.progressId ?? "").trim() === progressId ||
          String(row.workItemId ?? "").trim() === `progress:${progressId}`,
      )
        ? true
        : null;
    },
    30_000,
    500,
  );

  return {
    contractorId,
    contractorOrg,
    updatedContractorOrg,
    subcontractId,
    requestId,
    requestItemId,
    purchaseId,
    purchaseItemId,
    progressId,
    initialObjectName,
    initialWorkName,
    updatedObjectName,
    updatedWorkName,
  };
}

async function cleanupSeededScope(scope: SeededScope | null) {
  if (!scope) return;
  try {
    await admin.from("work_progress_log_materials").delete().eq("log_id", scope.progressId);
  } catch {}
  try {
    await admin.from("work_progress_log").delete().eq("progress_id", scope.progressId);
  } catch {}
  try {
    await admin.from("work_progress").delete().eq("id", scope.progressId);
  } catch {}
  try {
    await admin.from("purchase_items").delete().eq("id", scope.purchaseItemId);
  } catch {}
  try {
    await admin.from("purchases").delete().eq("id", scope.purchaseId);
  } catch {}
  try {
    await admin.from("request_items").delete().eq("id", scope.requestItemId);
  } catch {}
  try {
    await admin.from("requests").delete().eq("id", scope.requestId);
  } catch {}
  try {
    await admin.from("subcontracts").delete().eq("id", scope.subcontractId);
  } catch {}
  try {
    await admin.from("contractors").delete().eq("id", scope.contractorId);
  } catch {}
}

async function applyVisibleRealtimeUpdate(scope: SeededScope) {
  const contractorResult = await admin
    .from("contractors")
    .update({ company_name: scope.updatedContractorOrg })
    .eq("id", scope.contractorId)
    .select("id")
    .single();
  if (contractorResult.error) throw contractorResult.error;
}

async function emitRealtimeBurst(scope: SeededScope) {
  const firstUpdate = await admin
    .from("work_progress")
    .update({ qty_done: 0.25, qty_left: 0.75 })
    .eq("id", scope.progressId)
    .select("id")
    .single();
  if (firstUpdate.error) throw firstUpdate.error;

  const secondUpdate = await admin
    .from("work_progress")
    .update({ qty_done: 0.5, qty_left: 0.5 })
    .eq("id", scope.progressId)
    .select("id")
    .single();
  if (secondUpdate.error) throw secondUpdate.error;
}

async function waitForContractorSurface(scope: SeededScope, page: Parameters<typeof bodyText>[0]) {
  await waitForObservability(
    page,
    "contractor:surface_ready",
    (event) => event.screen === "contractor" && event.event === "content_ready" && event.result === "success",
    45_000,
  );
  await poll(
      "contractor:home_card_visible",
      async () => {
      const text = normalizeSurfaceText(await bodyText(page));
      return text.includes(scope.contractorOrg) && text.includes(scope.initialWorkName) ? text : null;
    },
    30_000,
    250,
  );
}

async function settleWebContractorRoute(
  page: Parameters<typeof bodyText>[0],
  scope: SeededScope,
  fullName: string,
  user: Awaited<ReturnType<typeof createTempUser>>,
) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await isWebLoginVisible(page)) {
      await loginContractorWeb(page, user);
    }
    await page.goto(`${baseUrl}/contractor`, { waitUntil: "networkidle" }).catch(() => {});
    await maybeConfirmFio(page, fullName).catch(() => false);
    const text = normalizeSurfaceText(await bodyText(page));
    if (isContractorSurfaceText(text, scope)) return;
    await page.goto(`${baseUrl}/foreman`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(500);
  }

  await poll(
    "contractor:web_route_settled",
    async () => {
      const text = normalizeSurfaceText(await bodyText(page));
      return isContractorSurfaceText(text, scope) ? text : null;
    },
    20_000,
    500,
  );
}

async function isWebLoginVisible(page: Parameters<typeof bodyText>[0]) {
  const emailInput = page.locator('input[placeholder="Email"]').first();
  if ((await emailInput.count()) > 0) return true;
  const text = normalizeSurfaceText(await bodyText(page));
  return text.includes("Добро пожаловать") && text.includes("Пароль");
}

async function loginContractorWeb(
  page: Parameters<typeof bodyText>[0],
  user: Awaited<ReturnType<typeof createTempUser>>,
) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle" }).catch(() => {});
    const emailInput = page.locator('input[placeholder="Email"]').first();
    if ((await emailInput.count()) > 0) {
      await emailInput.fill(user.email);
      await page.locator('input[type="password"]').fill(user.password);
      const loginButton = page.getByText(/Войти|Login/i).first();
      if ((await loginButton.count()) > 0) {
        await loginButton.click();
      } else {
        await page.locator('input[type="password"]').first().press("Enter").catch(() => {});
      }
      await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
    }
    await page.goto(`${baseUrl}/contractor`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1000);
    if (!(await isWebLoginVisible(page))) {
      return;
    }
  }
  throw new Error("web contractor login did not settle");
}

async function runWebRuntime(
  scope: SeededScope,
  user: Awaited<ReturnType<typeof createTempUser>>,
): Promise<{ summary: PlatformResult; events: RuntimeEvent[] }> {
  const { browser, page, runtime } = await launchRolePage();
  let baselineCount = 0;
  let events: RuntimeEvent[] = [];
  const summary: PlatformResult = {
    passed: false,
    subscriptionStarted: false,
    subscriptionConnected: false,
    eventReceived: false,
    refreshTriggered: false,
    doubleFetchDetected: false,
    inflightGuardWorked: false,
    recentGuardWorked: false,
    backendOwnerPreserved: false,
    uiUpdated: false,
    detailUpdated: false,
    fetchCountAfterRealtime: 0,
    failureStage: "unknown",
    platformSpecificIssues: [],
    screenshot: screenshotPath,
  };

  try {
    await loginContractorWeb(page, user);
    await maybeConfirmFio(page, "Contractor Realtime Verify");
    await settleWebContractorRoute(page, scope, "Contractor Realtime Verify", user);
    await waitForContractorSurface(scope, page);

    const baselineEvents = await getObservabilityEvents(page);
    baselineCount = baselineEvents.length;
    summary.subscriptionStarted = (
      await waitForObservability(
        page,
        "contractor:subscription_started",
        (event) => event.screen === "contractor" && event.event === "subscription_started",
        45_000,
      )
    ).some((event) => event.screen === "contractor" && event.event === "subscription_started");
    summary.subscriptionConnected = (
      await waitForObservability(
        page,
        "contractor:subscription_connected",
        (event) => event.screen === "contractor" && event.event === "subscription_connected",
        45_000,
      )
    ).some((event) => event.screen === "contractor" && event.event === "subscription_connected");

    await waitForStableEventCount(
      "contractor:web_idle_before_realtime",
      async () => (await getObservabilityEvents(page)).slice(baselineCount) as RuntimeEvent[],
      8_000,
      500,
    ).catch(() => []);

    await applyVisibleRealtimeUpdate(scope);
    const afterRefresh = await poll(
      "contractor:realtime_refresh",
      async () => {
        const nextEvents = (await getObservabilityEvents(page)).slice(baselineCount) as RuntimeEvent[];
        return nextEvents.some(
          (event) =>
            event.screen === "contractor" &&
            (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
        )
          ? nextEvents
          : null;
      },
      45_000,
      250,
    );

    await poll(
      "contractor:web_ui_updated",
      async () => {
        const text = normalizeSurfaceText(await bodyText(page));
        return text.includes(scope.updatedContractorOrg) ? text : null;
      },
      45_000,
      250,
    );
    summary.uiUpdated = true;

    const card = page.getByText(scope.updatedContractorOrg, { exact: false }).first();
    if ((await card.count()) === 0) {
      throw new Error("Contractor realtime card was not rendered on web");
    }
    await card.click();
    await poll(
      "contractor:web_detail_updated",
      async () => {
        const text = normalizeSurfaceText(await bodyText(page));
        return text.includes(scope.updatedContractorOrg) ? text : null;
      },
      30_000,
      250,
    );
    summary.detailUpdated = true;

    await emitRealtimeBurst(scope);
    await poll(
      "contractor:web_guard_events",
      async () => {
        const nextEvents = (await getObservabilityEvents(page)).slice(baselineCount) as RuntimeEvent[];
        return nextEvents.some(
          (event) =>
            event.screen === "contractor" &&
            (event.event === "realtime_refresh_skipped_recent" ||
              event.event === "realtime_refresh_skipped_inflight"),
        )
          ? nextEvents
          : null;
      },
      20_000,
      250,
    ).catch(async () => (await getObservabilityEvents(page)).slice(baselineCount) as RuntimeEvent[]);

    events = (await getObservabilityEvents(page)).slice(baselineCount) as RuntimeEvent[];
    await page.screenshot({ path: screenshotPath, fullPage: true });

    summary.eventReceived =
      findEvent(
        afterRefresh as RuntimeEvent[],
        (event) =>
          event.screen === "contractor" &&
          event.event === "realtime_event_received" &&
          tableMatches.has(String(event.extra?.table ?? "").trim()),
      ) != null;
    summary.refreshTriggered =
      findEvent(
        afterRefresh as RuntimeEvent[],
        (event) => event.screen === "contractor" && event.event === "realtime_refresh_triggered",
      ) != null;
    summary.recentGuardWorked =
      findEvent(events, (event) => event.screen === "contractor" && event.event === "realtime_refresh_skipped_recent") !=
      null;
    summary.inflightGuardWorked =
      findEvent(events, (event) => event.screen === "contractor" && event.event === "realtime_refresh_skipped_inflight") !=
      null;
    const realtimeWindow = slicePrimaryRefreshWindow(events);
    summary.backendOwnerPreserved =
      findEvent(
        realtimeWindow,
        (event) =>
          event.screen === "contractor" &&
          event.category === "fetch" &&
          event.event === "load_inbox_scope" &&
          event.result === "success" &&
          event.sourceKind === "rpc:contractor_inbox_scope_v1",
      ) != null;
    summary.fetchCountAfterRealtime = countEvents(
      realtimeWindow,
      (event) =>
        event.screen === "contractor" &&
        event.category === "fetch" &&
        event.event === "load_inbox_scope" &&
        event.result === "success",
    );
    summary.doubleFetchDetected = summary.fetchCountAfterRealtime > 1;
    summary.passed =
      summary.subscriptionStarted &&
      summary.subscriptionConnected &&
      summary.eventReceived &&
      summary.refreshTriggered &&
      summary.uiUpdated &&
      summary.detailUpdated &&
      summary.backendOwnerPreserved &&
      !summary.doubleFetchDetected &&
      !hasBlockingConsoleErrors(runtime.console) &&
      runtime.pageErrors.length === 0 &&
      runtime.badResponses.filter((entry) => !entry.url.includes("/favicon")).length === 0;
  } catch (error) {
    summary.platformSpecificIssues.push(error instanceof Error ? error.message : String(error));
    events = ((await getObservabilityEvents(page).catch(() => [])) as RuntimeEvent[]).slice(baselineCount);
    summary.subscriptionStarted ||= findEvent(events, (event) => event.screen === "contractor" && event.event === "subscription_started") != null;
    summary.subscriptionConnected ||= findEvent(events, (event) => event.screen === "contractor" && event.event === "subscription_connected") != null;
    summary.eventReceived ||= findEvent(events, (event) => event.screen === "contractor" && event.event === "realtime_event_received") != null;
    summary.refreshTriggered ||= findEvent(events, (event) => event.screen === "contractor" && event.event === "realtime_refresh_triggered") != null;
    summary.recentGuardWorked ||= findEvent(events, (event) => event.screen === "contractor" && event.event === "realtime_refresh_skipped_recent") != null;
    summary.inflightGuardWorked ||= findEvent(events, (event) => event.screen === "contractor" && event.event === "realtime_refresh_skipped_inflight") != null;
    summary.backendOwnerPreserved ||= findEvent(
      slicePrimaryRefreshWindow(events),
      (event) =>
        event.screen === "contractor" &&
        event.event === "load_inbox_scope" &&
        event.result === "success" &&
        event.sourceKind === "rpc:contractor_inbox_scope_v1",
    ) != null;
  } finally {
    summary.failureStage = summary.passed
      ? "unknown"
      : !summary.subscriptionConnected
        ? "subscribe_failed"
        : !summary.eventReceived
          ? "event_not_received"
          : !summary.refreshTriggered
            ? "refresh_not_triggered"
            : !summary.uiUpdated
              ? "ui_not_updated"
              : !summary.detailUpdated
                ? "detail_not_updated"
                : "unknown";
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    await browser.close().catch(() => {});
  }

  return { summary, events };
}

async function runAndroidRuntime(
  scope: SeededScope,
  user: Awaited<ReturnType<typeof createTempUser>>,
): Promise<{ summary: PlatformResult; events: RuntimeEvent[] }> {
  let devClientCleanup: (() => void) | null = null;
  let events: RuntimeEvent[] = [];
  const summary: PlatformResult = {
    passed: false,
    subscriptionStarted: false,
    subscriptionConnected: false,
    eventReceived: false,
    refreshTriggered: false,
    doubleFetchDetected: false,
    inflightGuardWorked: false,
    recentGuardWorked: false,
    backendOwnerPreserved: false,
    uiUpdated: false,
    detailUpdated: false,
    fetchCountAfterRealtime: 0,
    failureStage: "unknown",
    platformSpecificIssues: [],
  };

  try {
    const prepared = await androidRuntime.prepareRoleRuntime({
      user: { ...user, displayLabel: "ContractorRT" },
      route: "rik://contractor",
      artifactBase: "android-contractor-realtime",
    });
    devClientCleanup = prepared.cleanup;
    summary.preflight = prepared.preflight;
    summary.recovery = androidRuntime.harness.getRecoverySummary();
    summary.fioConfirmed = prepared.fioConfirmed;

    await settleAndroidContractorSurface(scope, prepared.packageName, prepared.screen.xml);

    await androidRuntime.waitForObservability(
      "contractor:android_surface_ready",
      (event) => event.screen === "contractor" && event.event === "content_ready" && event.result === "success",
      60_000,
    );
    const homeScreen = await androidRuntime.waitForScreenText(
      "contractor:android_card_visible",
      (xml) => xml.includes(scope.contractorOrg) && xml.includes(scope.initialWorkName),
      45_000,
    );

    summary.subscriptionStarted = (
      await androidRuntime.waitForObservability(
        "contractor:android_subscription_started",
        (event) => event.screen === "contractor" && event.event === "subscription_started",
        45_000,
      )
    ).some((event) => event.screen === "contractor" && event.event === "subscription_started");
    summary.subscriptionConnected = (
      await androidRuntime.waitForObservability(
        "contractor:android_subscription_connected",
        (event) => event.screen === "contractor" && event.event === "subscription_connected",
        45_000,
      )
    ).some((event) => event.screen === "contractor" && event.event === "subscription_connected");

    await waitForStableEventCount(
      "contractor:android_idle_before_realtime",
      () => androidRuntime.readObservabilityEvents(),
      8_000,
      750,
    ).catch(() => []);
    await androidRuntime.settleIdleObservability(1_500, 4);

    await applyVisibleRealtimeUpdate(scope);
    const afterRefresh = await androidRuntime.waitForObservability(
      "contractor:android_realtime_refresh",
      (event) =>
        event.screen === "contractor" &&
        (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
      45_000,
    );

    const updatedScreen = await androidRuntime.waitForScreenText(
      "contractor:android_ui_updated",
      (xml) => xml.includes(scope.updatedContractorOrg),
      45_000,
    );
    summary.uiUpdated = true;

    const cardNode =
      (androidRuntime.harness.parseAndroidNodes(updatedScreen.xml) as AndroidNode[]).find(
        (node) =>
          node.clickable &&
          node.enabled &&
          `${node.text} ${node.contentDesc}`.includes(scope.contractorOrg),
      ) ??
      (androidRuntime.harness.parseAndroidNodes(homeScreen.xml) as AndroidNode[]).find(
        (node) =>
          node.clickable &&
          node.enabled &&
          `${node.text} ${node.contentDesc}`.includes(scope.contractorOrg),
      ) ??
      null;
    if (!cardNode) throw new Error("Contractor realtime card node was not found on Android");
    androidRuntime.harness.tapAndroidBounds(cardNode.bounds);
    await androidRuntime.waitForScreenText(
      "contractor:android_detail_updated",
      (xml) => xml.includes(scope.updatedContractorOrg),
      30_000,
    );
    summary.detailUpdated = true;

    await emitRealtimeBurst(scope);
    await poll(
      "contractor:android_guard_events",
      async () => {
        const nextEvents = androidRuntime.readObservabilityEvents();
        return nextEvents.some(
          (event) =>
            event.screen === "contractor" &&
            (event.event === "realtime_refresh_skipped_recent" ||
              event.event === "realtime_refresh_skipped_inflight"),
        )
          ? nextEvents
          : null;
      },
      20_000,
      750,
    ).catch(() => androidRuntime.readObservabilityEvents());

    events = androidRuntime.readObservabilityEvents() as RuntimeEvent[];
    const finalScreen = androidRuntime.harness.dumpAndroidScreen("android-contractor-realtime-final");
    summary.screenshot = finalScreen.pngPath;
    summary.eventReceived =
      androidRuntime.findObservabilityEvent(
        afterRefresh,
        (event) => event.screen === "contractor" && event.event === "realtime_event_received",
      ) != null;
    summary.refreshTriggered =
      androidRuntime.findObservabilityEvent(
        afterRefresh,
        (event) => event.screen === "contractor" && event.event === "realtime_refresh_triggered",
      ) != null;
    summary.recentGuardWorked ||= androidRuntime.findObservabilityEvent(
      events as ReturnType<typeof androidRuntime.readObservabilityEvents>,
      (event) => event.screen === "contractor" && event.event === "realtime_refresh_skipped_recent",
    ) != null;
    summary.inflightGuardWorked ||= androidRuntime.findObservabilityEvent(
      events as ReturnType<typeof androidRuntime.readObservabilityEvents>,
      (event) => event.screen === "contractor" && event.event === "realtime_refresh_skipped_inflight",
    ) != null;
    const realtimeWindow = slicePrimaryRefreshWindow(events);
    summary.backendOwnerPreserved =
      androidRuntime.findObservabilityEvent(
        realtimeWindow as ReturnType<typeof androidRuntime.readObservabilityEvents>,
        (event) =>
          event.screen === "contractor" &&
          event.event === "load_inbox_scope" &&
          event.result === "success" &&
          event.sourceKind === "rpc:contractor_inbox_scope_v1",
      ) != null;
    summary.fetchCountAfterRealtime = countEvents(
      realtimeWindow,
      (event) =>
        event.screen === "contractor" &&
        event.event === "load_inbox_scope" &&
        event.result === "success",
    );
    summary.doubleFetchDetected = summary.fetchCountAfterRealtime > 1;
    summary.passed =
      summary.subscriptionStarted &&
      summary.subscriptionConnected &&
      summary.eventReceived &&
      summary.refreshTriggered &&
      summary.uiUpdated &&
      summary.detailUpdated &&
      summary.backendOwnerPreserved &&
      !summary.doubleFetchDetected &&
      summary.platformSpecificIssues.length === 0;
  } catch (error) {
    summary.platformSpecificIssues.push(error instanceof Error ? error.message : String(error));
    events = androidRuntime.readObservabilityEvents() as RuntimeEvent[];
    summary.subscriptionStarted ||= androidRuntime.findObservabilityEvent(
      events as ReturnType<typeof androidRuntime.readObservabilityEvents>,
      (event) => event.screen === "contractor" && event.event === "subscription_started",
    ) != null;
    summary.subscriptionConnected ||= androidRuntime.findObservabilityEvent(
      events as ReturnType<typeof androidRuntime.readObservabilityEvents>,
      (event) => event.screen === "contractor" && event.event === "subscription_connected",
    ) != null;
    summary.eventReceived ||= androidRuntime.findObservabilityEvent(
      events as ReturnType<typeof androidRuntime.readObservabilityEvents>,
      (event) => event.screen === "contractor" && event.event === "realtime_event_received",
    ) != null;
    summary.refreshTriggered ||= androidRuntime.findObservabilityEvent(
      events as ReturnType<typeof androidRuntime.readObservabilityEvents>,
      (event) => event.screen === "contractor" && event.event === "realtime_refresh_triggered",
    ) != null;
    summary.recentGuardWorked ||= androidRuntime.findObservabilityEvent(
      events as ReturnType<typeof androidRuntime.readObservabilityEvents>,
      (event) => event.screen === "contractor" && event.event === "realtime_refresh_skipped_recent",
    ) != null;
    summary.inflightGuardWorked ||= androidRuntime.findObservabilityEvent(
      events as ReturnType<typeof androidRuntime.readObservabilityEvents>,
      (event) => event.screen === "contractor" && event.event === "realtime_refresh_skipped_inflight",
    ) != null;
    summary.backendOwnerPreserved ||= androidRuntime.findObservabilityEvent(
      slicePrimaryRefreshWindow(events) as ReturnType<typeof androidRuntime.readObservabilityEvents>,
      (event) =>
        event.screen === "contractor" &&
        event.event === "load_inbox_scope" &&
        event.result === "success" &&
        event.sourceKind === "rpc:contractor_inbox_scope_v1",
    ) != null;
    if (!summary.screenshot) {
      const failure = androidRuntime.harness.captureFailureArtifacts("android-contractor-realtime-failure");
      summary.screenshot = failure.pngPath ?? "";
      summary.platformSpecificIssues.push(...[failure.stdoutTail, failure.stderrTail].filter(Boolean));
    }
  } finally {
    summary.failureStage = summary.passed
      ? "unknown"
      : !summary.subscriptionConnected
        ? "subscribe_failed"
        : !summary.eventReceived
          ? "event_not_received"
          : !summary.refreshTriggered
            ? "refresh_not_triggered"
            : !summary.uiUpdated
              ? "ui_not_updated"
            : !summary.detailUpdated
              ? "detail_not_updated"
              : "unknown";
    devClientCleanup?.();
  }

  return { summary, events };
}

async function main() {
  let seedUser: Awaited<ReturnType<typeof createTempUser>> | null = null;
  let scope: SeededScope | null = null;

  try {
    seedUser = await createTempUser(tempUserRole, "Contractor Realtime Seed");
    scope = await seedContractorRealtimeScope(seedUser);

    const web = await runWebRuntime(scope, seedUser);
    const android = await runAndroidRuntime(scope, seedUser);

    writeArtifact(webRuntimePath, { baseUrl, events: web.events });
    writeArtifact(androidRuntimePath, { events: android.events });

    const summary = {
      gate: "Realtime Lifecycle Hardening - Contractor",
      status: web.summary.passed && android.summary.passed ? "passed" : "failed",
      webPassed: web.summary.passed,
      androidPassed: android.summary.passed,
      iosPassed: false,
      runtimeVerified: web.summary.passed && android.summary.passed,
      iosResidual: "iOS realtime runtime proof not executed on this Windows host",
      subscriptionStarted: web.summary.subscriptionStarted && android.summary.subscriptionStarted,
      subscriptionConnected: web.summary.subscriptionConnected && android.summary.subscriptionConnected,
      eventReceived: web.summary.eventReceived && android.summary.eventReceived,
      refreshTriggered: web.summary.refreshTriggered && android.summary.refreshTriggered,
      doubleFetchDetected: web.summary.doubleFetchDetected || android.summary.doubleFetchDetected,
      inflightGuardWorked: web.summary.inflightGuardWorked || android.summary.inflightGuardWorked,
      recentGuardWorked: web.summary.recentGuardWorked || android.summary.recentGuardWorked,
      backendOwnerPreserved: web.summary.backendOwnerPreserved && android.summary.backendOwnerPreserved,
      uiUpdated: web.summary.uiUpdated && android.summary.uiUpdated,
      detailUpdated: web.summary.detailUpdated && android.summary.detailUpdated,
      fetchCountAfterRealtime: {
        web: web.summary.fetchCountAfterRealtime,
        android: android.summary.fetchCountAfterRealtime,
      },
      failureStage: !web.summary.passed
        ? `web:${web.summary.failureStage}`
        : !android.summary.passed
          ? `android:${android.summary.failureStage}`
          : "unknown",
      screenshot: screenshotPath,
      platformSpecificIssues: [
        ...web.summary.platformSpecificIssues.map((issue) => ({ platform: "web", issue })),
        ...android.summary.platformSpecificIssues.map((issue) => ({ platform: "android", issue })),
      ],
      web: web.summary,
      android: android.summary,
    };

    writeArtifact(`${artifactBase}.summary.json`, summary);
    writeArtifact(`${artifactBase}.json`, { scope, summary });
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status !== "passed") process.exitCode = 1;
  } finally {
    await cleanupSeededScope(scope);
    await cleanupTempUser(seedUser);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
