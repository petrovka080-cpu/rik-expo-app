import type { Page } from "playwright";

import {
  admin,
  baseUrl,
  cleanupTempUser,
  countEvents,
  createTempUser,
  findEvent,
  getObservabilityEvents,
  hasBlockingConsoleErrors,
  launchRolePage,
  loginWithTempUser,
  maybeConfirmFio,
  maybeConfirmWarehouseRecipient,
  poll,
  waitForObservability,
  writeArtifact,
} from "./_shared/realtimeWebRuntime";
import { createRealtimeAndroidRuntime } from "./_shared/realtimeAndroidRuntime";

const artifactBase = "artifacts/warehouse-realtime";
const screenshotPath = `${artifactBase}.png`;
const webRuntimePath = `${artifactBase}.web.json`;
const androidRuntimePath = `${artifactBase}.android.json`;
const androidRuntime = createRealtimeAndroidRuntime({
  projectRoot: process.cwd(),
  devClientPort: Number(process.env.WAREHOUSE_ANDROID_DEV_PORT ?? "8081"),
});
const role = process.env.WAREHOUSE_WAVE1_ROLE || "warehouse";
const EXPENSE_LABELS = ["Расход", "Р Р°СЃС…РѕРґ"] as const;
const RECIPIENT_PROMPTS = ["Кто получает?", "РљС‚Рѕ РїРѕР»СѓС‡Р°РµС‚?"] as const;
const EMPTY_LABELS = ["Нет записей в очереди склада.", "РќРµС‚ Р·Р°РїРёСЃРµР№ РІ РѕС‡РµСЂРµРґРё СЃРєР»Р°РґР°."] as const;

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
  fetchCountAfterRealtime: number;
  failureStage: "subscribe_failed" | "event_not_received" | "refresh_not_triggered" | "ui_not_updated" | "unknown";
  platformSpecificIssues: string[];
  screenshot?: string;
  preflight?: unknown;
  recovery?: Record<string, boolean>;
  fioConfirmed?: boolean;
};

type AndroidNode = {
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  bounds: string;
};

const matchesAny = (value: string, labels: readonly string[]) => labels.some((label) => value.includes(label));

async function waitForWarehouseSurface(page: Page) {
  await waitForObservability(
    page,
    "warehouse:surface_ready",
    (event) =>
      event.screen === "warehouse" &&
      ((event.event === "fetch_incoming" && event.result === "success") ||
        (event.event === "content_ready" && event.surface === "incoming_list")),
    45_000,
  );
}

async function openExpenseTab(page: Page) {
  await page.getByText(/Расход/i).first().click();
  await waitForObservability(
    page,
    "warehouse:expense_ready",
    (event) =>
      event.screen === "warehouse" &&
      ((event.event === "fetch_req_heads" && event.result === "success") ||
        (event.event === "content_ready" && event.surface === "req_heads_list")),
    20_000,
  );
}

function readExpenseTotal(events: Array<{ screen?: string | null; event?: string | null; result?: string | null; surface?: string | null; rowCount?: number | null; extra?: Record<string, unknown> | null; category?: string | null }>) {
  const match = [...events].reverse().find(
    (event) =>
      event.screen === "warehouse" &&
      (((event as { category?: string }).category === "fetch" && event.event === "fetch_req_heads" && event.result === "success") ||
        ((event as { category?: string }).category === "ui" && event.event === "content_ready" && event.surface === "req_heads_list") ||
        (event.event === "fetch_req_heads" && event.result === "success") ||
        (event.event === "content_ready" && event.surface === "req_heads_list")),
  );
  if (!match) return null;
  if (typeof match.rowCount === "number") return match.rowCount;
  const value = match.extra?.totalRowCount;
  return typeof value === "number" ? value : null;
}

function sliceRealtimeWindow<T extends { screen?: string | null; event?: string | null }>(events: T[]) {
  const startIndex = events.findIndex((event) => event.screen === "warehouse" && event.event === "realtime_refresh_triggered");
  return startIndex >= 0 ? events.slice(startIndex) : events;
}

function slicePrimaryRefreshWindow<T extends { screen?: string | null; event?: string | null }>(events: T[]) {
  const realtimeWindow = sliceRealtimeWindow(events);
  const nextTriggerIndex = realtimeWindow.findIndex(
    (event, index) => index > 0 && event.screen === "warehouse" && event.event === "realtime_refresh_triggered",
  );
  return nextTriggerIndex >= 0 ? realtimeWindow.slice(0, nextTriggerIndex) : realtimeWindow;
}

function hasWarehouseUiRefreshWindow(
  events: Array<{
    screen?: string | null;
    category?: string | null;
    event?: string | null;
    result?: string | null;
    surface?: string | null;
    sourceKind?: string | null;
  }>,
) {
  const realtimeWindow = sliceRealtimeWindow(events);
  return (
    findEvent(
      realtimeWindow,
      (event) =>
        event.screen === "warehouse" &&
        event.event === "content_ready" &&
        event.surface === "req_heads_list" &&
        event.result === "success" &&
        event.sourceKind === "rpc:warehouse_issue_queue_scope_v4",
    ) != null ||
    findEvent(
      realtimeWindow,
      (event) =>
        event.screen === "warehouse" &&
        event.event === "fetch_req_heads" &&
        event.result === "success" &&
        event.sourceKind === "rpc:warehouse_issue_queue_scope_v4",
    ) != null
  );
}

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
      if (events.length > 0 && events.length === lastCount) {
        return events;
      }
      lastCount = events.length;
      return null;
    },
    timeoutMs,
    delayMs,
  );
}

async function resolveWarehouseVisibleStatus() {
  const inbox = await admin.rpc("buyer_summary_inbox_scope_v1", { p_offset: 0, p_limit: 1, p_search: null, p_company_id: null });
  if (inbox.error) throw inbox.error;
  const first = Array.isArray((inbox.data as { rows?: Array<{ request_id?: string }> } | null)?.rows) ? (inbox.data as { rows: Array<{ request_id?: string }> }).rows[0] : null;
  if (!first?.request_id) throw new Error("No request row available to clone warehouse-visible status");
  const statusResult = await admin.from("requests").select("status").eq("id", first.request_id).single();
  if (statusResult.error) throw statusResult.error;
  return String(statusResult.data.status ?? "").trim();
}

async function createWarehouseExpenseEvent(marker: string) {
  const status = await resolveWarehouseVisibleStatus();
  const requestResult = await admin.from("requests").insert({
    status,
    display_no: `REQ-${marker}/2026`,
    object_name: marker,
    note: marker,
  }).select("id").single();
  if (requestResult.error) throw requestResult.error;
  const itemResult = await admin.from("request_items").insert({
    request_id: requestResult.data.id,
    name_human: marker,
    qty: 1,
    uom: "шт",
    rik_code: marker,
    status: "approved",
  }).select("id").single();
  if (itemResult.error) throw itemResult.error;
  return {
    requestId: requestResult.data.id,
    cleanup: async () => {
      await admin.from("request_items").delete().eq("id", itemResult.data.id);
      await admin.from("requests").delete().eq("id", requestResult.data.id);
    },
  };
}

function findExpenseTab(nodes: AndroidNode[]) {
  return nodes.find((node) => node.clickable && node.enabled && matchesAny(`${node.contentDesc} ${node.text}`, EXPENSE_LABELS)) ?? null;
}

function findRecipientCandidate(nodes: AndroidNode[]) {
  return nodes.find((node) => {
    const label = `${node.contentDesc || ""} ${node.text || ""}`.trim();
    return node.clickable && node.enabled && label.length > 0 && !label.includes("REQ-") && !matchesAny(label, EXPENSE_LABELS);
  }) ?? null;
}

const isExpenseSurface = (xml: string) => /REQ-[A-Z0-9_-]+\/\d{4}/i.test(xml) || matchesAny(xml, EMPTY_LABELS) || matchesAny(xml, RECIPIENT_PROMPTS);

async function runWebRuntime() {
  let user = null as Awaited<ReturnType<typeof createTempUser>> | null;
  let cleanupRealtimeRow: (() => Promise<void>) | null = null;
  const { browser, page, runtime } = await launchRolePage();
  let marker: string | null = null;
  let allEvents: Awaited<ReturnType<typeof getObservabilityEvents>> = [];
  let baselineCount = 0;
  let summary: PlatformResult = {
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
    fetchCountAfterRealtime: 0,
    failureStage: "unknown",
    platformSpecificIssues: [],
    screenshot: screenshotPath,
  };
  try {
    user = await createTempUser(role, "Warehouse Realtime Verify");
    await loginWithTempUser(page, "/warehouse", user);
    await waitForWarehouseSurface(page);
    await maybeConfirmFio(page, "Warehouse Realtime Verify");
    await waitForWarehouseSurface(page);
    await openExpenseTab(page);
    await maybeConfirmWarehouseRecipient(page, "Warehouse Realtime Recipient");
    await waitForObservability(page, "warehouse:expense_visible", (event) => event.screen === "warehouse" && ((event.event === "fetch_req_heads" && event.result === "success") || (event.event === "content_ready" && event.surface === "req_heads_list")), 30_000);
    const baselineEvents = await getObservabilityEvents(page);
    const baselineTotal = readExpenseTotal(baselineEvents) ?? 0;
    baselineCount = baselineEvents.length;
    summary.subscriptionStarted = (await waitForObservability(page, "warehouse:subscription_started", (event) => event.screen === "warehouse" && event.event === "subscription_started", 45_000)).some((event) => event.screen === "warehouse" && event.event === "subscription_started");
    summary.subscriptionConnected = (await waitForObservability(page, "warehouse:subscription_connected", (event) => event.screen === "warehouse" && event.event === "subscription_connected", 45_000)).some((event) => event.screen === "warehouse" && event.event === "subscription_connected");
    await waitForStableEventCount(
      "warehouse:web_idle_before_realtime",
      async () => (await getObservabilityEvents(page)).slice(baselineCount),
      8_000,
      500,
    ).catch(() => []);
    marker = `RTWH${Date.now().toString(36).toUpperCase()}`;
    const realtimeRow = await createWarehouseExpenseEvent(marker);
    cleanupRealtimeRow = realtimeRow.cleanup;
    const afterRefresh = await poll(
      "warehouse:realtime_refresh",
      async () => {
        const events = (await getObservabilityEvents(page)).slice(baselineCount);
        return events.some(
          (event) =>
            event.screen === "warehouse" &&
            (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
        )
          ? events
          : null;
      },
      45_000,
      250,
    );
    await poll("warehouse:ui_updated", async () => {
      const events = (await getObservabilityEvents(page)).slice(baselineCount);
      return hasWarehouseUiRefreshWindow(events) || (readExpenseTotal(events) ?? 0) > baselineTotal ? events : null;
    }, 45_000, 250);
    allEvents = (await getObservabilityEvents(page)).slice(baselineCount);
    summary.uiUpdated = hasWarehouseUiRefreshWindow(allEvents) || (readExpenseTotal(allEvents) ?? 0) > baselineTotal;
    await admin.from("requests").update({ note: `${marker}-burst-1` }).eq("id", realtimeRow.requestId);
    await admin.from("requests").update({ note: `${marker}-burst-2` }).eq("id", realtimeRow.requestId);
    await poll("warehouse:guard_events", async () => {
      const events = (await getObservabilityEvents(page)).slice(baselineCount);
      return events.some((event) => event.screen === "warehouse" && (event.event === "realtime_refresh_skipped_recent" || event.event === "realtime_refresh_skipped_inflight")) ? events : null;
    }, 20_000, 250).catch(async () => (await getObservabilityEvents(page)).slice(baselineCount));
    allEvents = (await getObservabilityEvents(page)).slice(baselineCount);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    summary.eventReceived = findEvent(afterRefresh, (event) => event.screen === "warehouse" && event.event === "realtime_event_received" && (event.extra?.table === "requests" || event.extra?.table === "request_items")) != null;
    summary.refreshTriggered = findEvent(afterRefresh, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_triggered") != null;
    summary.recentGuardWorked = findEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_skipped_recent") != null;
    summary.inflightGuardWorked = findEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_skipped_inflight") != null;
    const realtimeWindow = slicePrimaryRefreshWindow(allEvents);
    summary.backendOwnerPreserved = findEvent(realtimeWindow, (event) => event.screen === "warehouse" && event.category === "fetch" && event.event === "fetch_req_heads" && event.result === "success" && event.sourceKind === "rpc:warehouse_issue_queue_scope_v4") != null;
    summary.fetchCountAfterRealtime = countEvents(realtimeWindow, (event) => event.screen === "warehouse" && event.category === "fetch" && event.event === "fetch_req_heads" && event.result === "success");
    summary.doubleFetchDetected = summary.fetchCountAfterRealtime > 1;
    summary.passed = summary.subscriptionStarted && summary.subscriptionConnected && summary.eventReceived && summary.refreshTriggered && summary.uiUpdated && summary.backendOwnerPreserved && !summary.doubleFetchDetected && !hasBlockingConsoleErrors(runtime.console) && runtime.pageErrors.length === 0 && runtime.badResponses.filter((entry) => !entry.url.includes("/favicon")).length === 0;
    summary.failureStage = summary.passed ? "unknown" : !summary.subscriptionConnected ? "subscribe_failed" : !summary.eventReceived ? "event_not_received" : !summary.refreshTriggered ? "refresh_not_triggered" : !summary.uiUpdated ? "ui_not_updated" : "unknown";
  } catch (error) {
    summary.platformSpecificIssues.push(error instanceof Error ? error.message : String(error));
    allEvents = await getObservabilityEvents(page).then((events) => events.slice(baselineCount)).catch(() => allEvents);
    summary.subscriptionStarted ||= findEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "subscription_started") != null;
    summary.subscriptionConnected ||= findEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "subscription_connected") != null;
    summary.eventReceived ||= findEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_event_received") != null;
    summary.refreshTriggered ||= findEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_triggered") != null;
    summary.recentGuardWorked ||= findEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_skipped_recent") != null;
    summary.inflightGuardWorked ||= findEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_skipped_inflight") != null;
    summary.backendOwnerPreserved ||= findEvent(slicePrimaryRefreshWindow(allEvents), (event) => event.screen === "warehouse" && event.event === "fetch_req_heads" && event.result === "success" && event.sourceKind === "rpc:warehouse_issue_queue_scope_v4") != null;
    summary.uiUpdated ||= hasWarehouseUiRefreshWindow(allEvents);
    summary.failureStage = !summary.subscriptionConnected ? "subscribe_failed" : !summary.eventReceived ? "event_not_received" : !summary.refreshTriggered ? "refresh_not_triggered" : !summary.uiUpdated ? "ui_not_updated" : "unknown";
  } finally {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    if (cleanupRealtimeRow) await cleanupRealtimeRow().catch(() => {});
    await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }
  return { ...summary, marker, runtime, events: allEvents };
}

async function runAndroidRuntime() {
  let user = null as Awaited<ReturnType<typeof createTempUser>> | null;
  let cleanupRealtimeRow: (() => Promise<void>) | null = null;
  let devClientCleanup: (() => void) | null = null;
  let marker: string | null = null;
  let allEvents: ReturnType<typeof androidRuntime.readObservabilityEvents> = [];
  let summary: PlatformResult = {
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
    fetchCountAfterRealtime: 0,
    failureStage: "unknown",
    platformSpecificIssues: [],
  };
  try {
    user = await createTempUser(role, "Warehouse Realtime Verify Android");
    const prepared = await androidRuntime.prepareRoleRuntime({
      user: { ...user, displayLabel: "WarehouseRT" },
      route: "rik://warehouse",
      artifactBase: "android-warehouse-realtime",
    });
    devClientCleanup = prepared.cleanup;
    summary.preflight = prepared.preflight;
    summary.recovery = androidRuntime.harness.getRecoverySummary();
    summary.fioConfirmed = prepared.fioConfirmed;
    let screen = prepared.screen;
    let nodes = androidRuntime.harness.parseAndroidNodes(screen.xml) as AndroidNode[];
    const expenseTab = findExpenseTab(nodes);
    if (expenseTab) {
      androidRuntime.harness.tapAndroidBounds(expenseTab.bounds);
      screen = await poll("warehouse:android_expense", async () => {
        const next = androidRuntime.harness.dumpAndroidScreen("android-warehouse-realtime-expense");
        return isExpenseSurface(next.xml) ? next : null;
      }, 25_000, 1000).catch(() => androidRuntime.harness.dumpAndroidScreen("android-warehouse-realtime-expense-timeout"));
    } else {
      summary.platformSpecificIssues.push("Warehouse expense tab was not found on Android");
    }
    if (matchesAny(screen.xml, RECIPIENT_PROMPTS)) {
      nodes = androidRuntime.harness.parseAndroidNodes(screen.xml) as AndroidNode[];
      const candidate = findRecipientCandidate(nodes);
      if (candidate) {
        androidRuntime.harness.tapAndroidBounds(candidate.bounds);
        screen = await poll("warehouse:android_recipient", async () => {
          const next = androidRuntime.harness.dumpAndroidScreen("android-warehouse-realtime-recipient");
          return isExpenseSurface(next.xml) && !matchesAny(next.xml, RECIPIENT_PROMPTS) ? next : null;
        }, 20_000, 1000).catch(() => androidRuntime.harness.dumpAndroidScreen("android-warehouse-realtime-recipient-timeout"));
      } else {
        summary.platformSpecificIssues.push("Warehouse recipient candidate was not found on Android");
      }
    }
    allEvents = await androidRuntime.waitForObservability("warehouse:android_surface_ready", (event) => event.screen === "warehouse" && ((event.event === "fetch_req_heads" && event.result === "success") || (event.event === "content_ready" && event.surface === "req_heads_list")), 60_000);
    const baselineTotal = readExpenseTotal(allEvents) ?? 0;
    summary.subscriptionStarted = (await androidRuntime.waitForObservability("warehouse:android_subscription_started", (event) => event.screen === "warehouse" && event.event === "subscription_started", 45_000)).some((event) => event.screen === "warehouse" && event.event === "subscription_started");
    summary.subscriptionConnected = (await androidRuntime.waitForObservability("warehouse:android_subscription_connected", (event) => event.screen === "warehouse" && event.event === "subscription_connected", 45_000)).some((event) => event.screen === "warehouse" && event.event === "subscription_connected");
    await waitForStableEventCount(
      "warehouse:android_idle_before_realtime",
      () => androidRuntime.readObservabilityEvents(),
      8_000,
      750,
    ).catch(() => []);
    await androidRuntime.settleIdleObservability(1_500, 4);
    marker = `RTWH${Date.now().toString(36).toUpperCase()}`;
    const realtimeRow = await createWarehouseExpenseEvent(marker);
    cleanupRealtimeRow = realtimeRow.cleanup;
    const afterRefresh = await androidRuntime.waitForObservability("warehouse:android_realtime_refresh", (event) => event.screen === "warehouse" && (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"), 45_000);
    await poll("warehouse:android_ui_updated", async () => {
      const events = androidRuntime.readObservabilityEvents();
      return hasWarehouseUiRefreshWindow(events) || (readExpenseTotal(events) ?? 0) > baselineTotal ? events : null;
    }, 45_000, 750);
    allEvents = androidRuntime.readObservabilityEvents();
    summary.uiUpdated = hasWarehouseUiRefreshWindow(allEvents) || (readExpenseTotal(allEvents) ?? 0) > baselineTotal;
    await admin.from("requests").update({ note: `${marker}-burst-1` }).eq("id", realtimeRow.requestId);
    await admin.from("requests").update({ note: `${marker}-burst-2` }).eq("id", realtimeRow.requestId);
    await poll("warehouse:android_guard_events", async () => {
      const events = androidRuntime.readObservabilityEvents();
      return events.some((event) => event.screen === "warehouse" && (event.event === "realtime_refresh_skipped_recent" || event.event === "realtime_refresh_skipped_inflight")) ? events : null;
    }, 20_000, 750).catch(() => androidRuntime.readObservabilityEvents());
    allEvents = androidRuntime.readObservabilityEvents();
    const finalScreen = androidRuntime.harness.dumpAndroidScreen("android-warehouse-realtime-final");
    summary.screenshot = finalScreen.pngPath;
    summary.eventReceived = androidRuntime.findObservabilityEvent(afterRefresh, (event) => event.screen === "warehouse" && event.event === "realtime_event_received") != null;
    summary.refreshTriggered = androidRuntime.findObservabilityEvent(afterRefresh, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_triggered") != null;
    summary.recentGuardWorked = androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_skipped_recent") != null;
    summary.inflightGuardWorked = androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_skipped_inflight") != null;
    const realtimeWindow = slicePrimaryRefreshWindow(allEvents);
    summary.backendOwnerPreserved = androidRuntime.findObservabilityEvent(realtimeWindow, (event) => event.screen === "warehouse" && event.event === "fetch_req_heads" && event.result === "success" && event.sourceKind === "rpc:warehouse_issue_queue_scope_v4") != null;
    summary.fetchCountAfterRealtime = countEvents(realtimeWindow, (event) => event.screen === "warehouse" && event.event === "fetch_req_heads" && event.result === "success");
    summary.doubleFetchDetected = summary.fetchCountAfterRealtime > 1;
    summary.passed = summary.subscriptionStarted && summary.subscriptionConnected && summary.eventReceived && summary.refreshTriggered && summary.uiUpdated && summary.backendOwnerPreserved && !summary.doubleFetchDetected && summary.platformSpecificIssues.length === 0;
    summary.failureStage = summary.passed ? "unknown" : !summary.subscriptionConnected ? "subscribe_failed" : !summary.eventReceived ? "event_not_received" : !summary.refreshTriggered ? "refresh_not_triggered" : !summary.uiUpdated ? "ui_not_updated" : "unknown";
  } catch (error) {
    summary.platformSpecificIssues.push(error instanceof Error ? error.message : String(error));
    allEvents = androidRuntime.readObservabilityEvents();
    summary.subscriptionStarted ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "subscription_started") != null;
    summary.subscriptionConnected ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "subscription_connected") != null;
    summary.eventReceived ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_event_received") != null;
    summary.refreshTriggered ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_triggered") != null;
    summary.recentGuardWorked ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_skipped_recent") != null;
    summary.inflightGuardWorked ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "warehouse" && event.event === "realtime_refresh_skipped_inflight") != null;
    summary.backendOwnerPreserved ||= androidRuntime.findObservabilityEvent(slicePrimaryRefreshWindow(allEvents), (event) => event.screen === "warehouse" && event.event === "fetch_req_heads" && event.result === "success" && event.sourceKind === "rpc:warehouse_issue_queue_scope_v4") != null;
    summary.uiUpdated ||= hasWarehouseUiRefreshWindow(allEvents);
    summary.failureStage = !summary.subscriptionConnected ? "subscribe_failed" : !summary.eventReceived ? "event_not_received" : !summary.refreshTriggered ? "refresh_not_triggered" : !summary.uiUpdated ? "ui_not_updated" : "unknown";
    if (!summary.screenshot) {
      const failure = androidRuntime.harness.captureFailureArtifacts("android-warehouse-realtime-failure");
      summary.screenshot = failure.pngPath ?? "";
      summary.platformSpecificIssues.push(...[failure.stdoutTail, failure.stderrTail].filter(Boolean));
    }
  } finally {
    if (cleanupRealtimeRow) await cleanupRealtimeRow().catch(() => {});
    await cleanupTempUser(user);
    devClientCleanup?.();
  }
  return { ...summary, marker, events: allEvents };
}

async function main() {
  const web = await runWebRuntime();
  writeArtifact(webRuntimePath, { marker: web.marker, baseUrl, runtime: web.runtime, events: web.events });
  const android = await runAndroidRuntime();
  writeArtifact(androidRuntimePath, { marker: android.marker, events: android.events, preflight: android.preflight, recovery: android.recovery, fioConfirmed: android.fioConfirmed, screenshot: android.screenshot });
  const summary = {
    gate: "V12.3 selective realtime warehouse",
    status: web.passed && android.passed ? "passed" : "failed",
    webPassed: web.passed,
    androidPassed: android.passed,
    iosPassed: false,
    runtimeVerified: web.passed && android.passed,
    iosResidual: "iOS realtime runtime proof not executed on this Windows host",
    subscriptionStarted: web.subscriptionStarted && android.subscriptionStarted,
    subscriptionConnected: web.subscriptionConnected && android.subscriptionConnected,
    eventReceived: web.eventReceived && android.eventReceived,
    refreshTriggered: web.refreshTriggered && android.refreshTriggered,
    doubleFetchDetected: web.doubleFetchDetected || android.doubleFetchDetected,
    inflightGuardWorked: web.inflightGuardWorked || android.inflightGuardWorked,
    recentGuardWorked: web.recentGuardWorked || android.recentGuardWorked,
    backendOwnerPreserved: web.backendOwnerPreserved && android.backendOwnerPreserved,
    uiUpdated: web.uiUpdated && android.uiUpdated,
    fetchCountAfterRealtime: { web: web.fetchCountAfterRealtime, android: android.fetchCountAfterRealtime },
    failureStage: !web.passed ? `web:${web.failureStage}` : !android.passed ? `android:${android.failureStage}` : "unknown",
    screenshot: screenshotPath,
    platformSpecificIssues: [...web.platformSpecificIssues.map((issue) => ({ platform: "web", issue })), ...android.platformSpecificIssues.map((issue) => ({ platform: "android", issue }))],
    artifacts: { webRuntime: webRuntimePath, androidRuntime: androidRuntimePath, webScreenshot: web.screenshot ?? null, androidScreenshot: android.screenshot ?? null },
    web,
    android,
  };
  writeArtifact(`${artifactBase}.summary.json`, summary);
  writeArtifact(`${artifactBase}.json`, { marker: { web: web.marker, android: android.marker }, webRuntime: webRuntimePath, androidRuntime: androidRuntimePath, summary });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
