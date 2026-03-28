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
  poll,
  waitForObservability,
  writeArtifact,
} from "./_shared/realtimeWebRuntime";
import { createRealtimeAndroidRuntime } from "./_shared/realtimeAndroidRuntime";

const artifactBase = "artifacts/accountant-realtime";
const screenshotPath = `${artifactBase}.png`;
const webRuntimePath = `${artifactBase}.web.json`;
const androidRuntimePath = `${artifactBase}.android.json`;
const androidDevClientPort = Number(process.env.ACCOUNTANT_ANDROID_DEV_PORT ?? "8081");
const role = process.env.ACCOUNTANT_WEB_ROLE || "accountant";
const androidRuntime = createRealtimeAndroidRuntime({
  projectRoot: process.cwd(),
  devClientPort: androidDevClientPort,
});

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
  failureStage:
    | "subscribe_failed"
    | "event_not_received"
    | "filter_rejected"
    | "guard_skipped"
    | "refresh_not_triggered"
    | "ui_not_updated"
    | "unknown";
  platformSpecificIssues: string[];
  screenshot?: string;
  artifacts?: Record<string, unknown>;
  preflight?: unknown;
  recovery?: Record<string, boolean>;
  fioConfirmed?: boolean;
};

async function waitForAccountantSurface(page: Page) {
  await waitForObservability(
    page,
    "accountant:surface_ready",
    (event) =>
      event.screen === "accountant" &&
      ((event.event === "load_inbox" && event.result === "success") ||
        (event.event === "content_ready" &&
          (event.surface === "inbox_list" || event.surface === "history_list"))),
    45_000,
  );
}

function readAccountantInboxTotal(
  events: Array<{
    screen?: string | null;
    category?: string | null;
    event?: string | null;
    result?: string | null;
    surface?: string | null;
    rowCount?: number | null;
    extra?: Record<string, unknown> | null;
  }>,
) {
  const match = [...events]
    .reverse()
    .find(
      (event) =>
        event.screen === "accountant" &&
        (((event as { category?: string }).category === "fetch" &&
          event.event === "load_inbox" &&
          event.result === "success") ||
          ((event as { category?: string }).category === "ui" &&
            event.event === "content_ready" &&
            event.surface === "inbox_list") ||
          (event.event === "load_inbox" && event.result === "success") ||
          (event.event === "content_ready" && event.surface === "inbox_list")),
    );
  if (!match) return null;
  if (typeof match.rowCount === "number") return match.rowCount;
  const value = match.extra?.totalRowCount;
  return typeof value === "number" ? value : null;
}

function sliceAccountantRealtimeWindow<T extends { screen?: string | null; event?: string | null }>(events: T[]) {
  const startIndex = events.findIndex(
    (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered",
  );
  return startIndex >= 0 ? events.slice(startIndex) : events;
}

function sliceAccountantPrimaryRefreshWindow<T extends { screen?: string | null; event?: string | null }>(
  events: T[],
) {
  const realtimeWindow = sliceAccountantRealtimeWindow(events);
  const nextTriggerIndex = realtimeWindow.findIndex(
    (event, index) => index > 0 && event.screen === "accountant" && event.event === "realtime_refresh_triggered",
  );
  return nextTriggerIndex >= 0 ? realtimeWindow.slice(0, nextTriggerIndex) : realtimeWindow;
}

function markerVisibleInText(value: string, marker: string | null) {
  if (!marker) return false;
  return value.includes(marker);
}

function hasAccountantUiRefreshWindow(
  events: Array<{
    screen?: string | null;
    category?: string | null;
    event?: string | null;
    result?: string | null;
    surface?: string | null;
    sourceKind?: string | null;
  }>,
) {
  const realtimeWindow = sliceAccountantRealtimeWindow(events);
  return (
    findEvent(
      realtimeWindow,
      (event) =>
        event.screen === "accountant" &&
        event.event === "content_ready" &&
        event.surface === "inbox_list" &&
        event.result === "success" &&
        event.sourceKind === "rpc:accountant_inbox_scope_v1",
    ) != null ||
    findEvent(
      realtimeWindow,
      (event) =>
        event.screen === "accountant" &&
        event.event === "load_inbox" &&
        event.result === "success" &&
        event.sourceKind === "rpc:accountant_inbox_scope_v1",
    ) != null
  );
}

function isAccountantCanonicalFetchEvent(
  event: {
    screen?: string | null;
    category?: string | null;
    event?: string | null;
    result?: string | null;
    surface?: string | null;
    sourceKind?: string | null;
  },
) {
  return (
    event.screen === "accountant" &&
    event.category === "fetch" &&
    event.event === "load_inbox" &&
    event.result === "success" &&
    event.sourceKind === "rpc:accountant_inbox_scope_v1" &&
    event.surface === "inbox_window"
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

async function createAccountantInboxEvent(marker: string) {
  const proposalResult = await admin
    .from("proposals")
    .insert({
      supplier: marker,
      invoice_number: marker,
      invoice_amount: 321,
      payment_status: "К оплате",
    })
    .select("id")
    .single();
  if (proposalResult.error) throw proposalResult.error;

  return {
    proposalId: proposalResult.data.id,
    cleanup: async () => {
      await admin.from("proposals").delete().eq("id", proposalResult.data.id);
    },
  };
}

async function runWebRuntime(): Promise<PlatformResult & { marker: string | null; runtime: Record<string, unknown>; events: unknown[] }> {
  let user = null as Awaited<ReturnType<typeof createTempUser>> | null;
  let cleanupRealtimeRow: (() => Promise<void>) | null = null;
  const { browser, page, runtime } = await launchRolePage();
  let marker: string | null = null;
  let subscriptionStarted = false;
  let subscriptionConnected = false;
  let eventReceived = false;
  let refreshTriggered = false;
  let doubleFetchDetected = false;
  let inflightGuardWorked = false;
  let recentGuardWorked = false;
  let backendOwnerPreserved = false;
  let uiUpdated = false;
  let fetchCountAfterRealtime = 0;
  let allEvents: Awaited<ReturnType<typeof getObservabilityEvents>> = [];
  let baselineCount = 0;
  const platformSpecificIssues: string[] = [];
  let passed = false;
  let failureStage: PlatformResult["failureStage"] = "unknown";

  try {
    user = await createTempUser(role, "Accountant Realtime Verify");
    await loginWithTempUser(page, "/accountant", user);
    await maybeConfirmFio(page, "Accountant Realtime Verify");
    await page.goto(`${baseUrl}/accountant`, { waitUntil: "networkidle" });
    await waitForAccountantSurface(page);
    const baselineEvents = await getObservabilityEvents(page);
    const baselineTotal = readAccountantInboxTotal(baselineEvents) ?? 0;
    baselineCount = baselineEvents.length;

    subscriptionStarted =
      (
        await waitForObservability(
          page,
          "accountant:subscription_started",
          (event) => event.screen === "accountant" && event.event === "subscription_started",
          45_000,
        )
      ).some((event) => event.screen === "accountant" && event.event === "subscription_started");
    subscriptionConnected =
      (
        await waitForObservability(
          page,
          "accountant:subscription_connected",
          (event) => event.screen === "accountant" && event.event === "subscription_connected",
          45_000,
        )
      ).some((event) => event.screen === "accountant" && event.event === "subscription_connected");

    await waitForStableEventCount(
      "accountant:web_idle_before_realtime",
      async () => (await getObservabilityEvents(page)).slice(baselineCount),
      8_000,
      500,
    ).catch(() => []);
    marker = `RTACCT${Date.now()}`;
    const inboxEvent = await createAccountantInboxEvent(marker);
    cleanupRealtimeRow = inboxEvent.cleanup;

    const sentResult = await admin
      .from("proposals")
      .update({ sent_to_accountant_at: new Date().toISOString() })
      .eq("id", inboxEvent.proposalId);
    if (sentResult.error) throw sentResult.error;

    const afterRefresh = await poll(
      "accountant:realtime_refresh",
      async () => {
        const events = (await getObservabilityEvents(page)).slice(baselineCount);
        return events.some(
          (event) =>
            event.screen === "accountant" &&
            (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
        )
          ? events
          : null;
      },
      45_000,
      250,
    );

    await poll(
      "accountant:ui_updated",
      async () => {
        const events = (await getObservabilityEvents(page)).slice(baselineCount);
        const text = await page.locator("body").innerText().catch(() => "");
        return hasAccountantUiRefreshWindow(events) ||
          (readAccountantInboxTotal(events) ?? 0) > baselineTotal ||
          markerVisibleInText(text, marker)
          ? events
          : null;
      },
      45_000,
      250,
    );
    allEvents = (await getObservabilityEvents(page)).slice(baselineCount);
    const finalText = await page.locator("body").innerText().catch(() => "");
    uiUpdated =
      hasAccountantUiRefreshWindow(allEvents) ||
      (readAccountantInboxTotal(allEvents) ?? 0) > baselineTotal ||
      markerVisibleInText(finalText, marker);

    const burstOne = await admin
      .from("proposals")
      .update({ supplier: `${marker}-burst-1` })
      .eq("id", inboxEvent.proposalId);
    if (burstOne.error) throw burstOne.error;
    const burstTwo = await admin
      .from("proposals")
      .update({ supplier: `${marker}-burst-2` })
      .eq("id", inboxEvent.proposalId);
    if (burstTwo.error) throw burstTwo.error;

    await poll(
      "accountant:guard_events",
      async () => {
        const events = (await getObservabilityEvents(page)).slice(baselineCount);
        const hasGuard =
          events.some((event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_recent") ||
          events.some((event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_inflight");
        return hasGuard ? events : null;
      },
      20_000,
      250,
    ).catch(async () => (await getObservabilityEvents(page)).slice(baselineCount));
    allEvents = (await getObservabilityEvents(page)).slice(baselineCount);

    await page.screenshot({ path: screenshotPath, fullPage: true });

    eventReceived =
      findEvent(
        afterRefresh,
        (event) =>
          event.screen === "accountant" &&
          event.event === "realtime_event_received" &&
          event.extra?.table === "proposals",
      ) != null ||
      findEvent(
        allEvents,
        (event) =>
          event.screen === "accountant" &&
          event.event === "realtime_event_received" &&
          event.extra?.table === "proposals",
      ) != null;
    refreshTriggered =
      findEvent(
        afterRefresh,
        (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered",
      ) != null ||
      findEvent(
        allEvents,
        (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered",
      ) != null;
    recentGuardWorked =
      findEvent(
        allEvents,
        (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_recent",
      ) != null;
    inflightGuardWorked =
      findEvent(
        allEvents,
        (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_inflight",
      ) != null;
    const realtimeWindow = sliceAccountantPrimaryRefreshWindow(allEvents);
    backendOwnerPreserved =
      findEvent(
        realtimeWindow,
        (event) => isAccountantCanonicalFetchEvent(event),
      ) != null;
    fetchCountAfterRealtime = countEvents(
      realtimeWindow,
      (event) => isAccountantCanonicalFetchEvent(event),
    );
    doubleFetchDetected = fetchCountAfterRealtime > 1;
    passed =
      subscriptionStarted &&
      subscriptionConnected &&
      eventReceived &&
      refreshTriggered &&
      uiUpdated &&
      backendOwnerPreserved &&
      !doubleFetchDetected &&
      !hasBlockingConsoleErrors(runtime.console) &&
      runtime.pageErrors.length === 0 &&
      runtime.badResponses.filter((entry) => !entry.url.includes("/favicon")).length === 0;
    failureStage = passed
      ? "unknown"
      : !subscriptionConnected
        ? "subscribe_failed"
        : !eventReceived
          ? "event_not_received"
          : !refreshTriggered
            ? "refresh_not_triggered"
            : !uiUpdated
              ? "ui_not_updated"
              : "unknown";
  } catch (error) {
    platformSpecificIssues.push(error instanceof Error ? error.message : String(error));
    allEvents = await getObservabilityEvents(page).then((events) => events.slice(baselineCount)).catch(() => allEvents);
    subscriptionStarted ||= findEvent(allEvents, (event) => event.screen === "accountant" && event.event === "subscription_started") != null;
    subscriptionConnected ||= findEvent(allEvents, (event) => event.screen === "accountant" && event.event === "subscription_connected") != null;
    eventReceived ||=
      findEvent(
        allEvents,
        (event) =>
          event.screen === "accountant" &&
          event.event === "realtime_event_received" &&
          event.extra?.table === "proposals",
      ) != null;
    refreshTriggered ||= findEvent(allEvents, (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered") != null;
    recentGuardWorked ||= findEvent(allEvents, (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_recent") != null;
    inflightGuardWorked ||= findEvent(allEvents, (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_inflight") != null;
    backendOwnerPreserved ||=
      findEvent(
        sliceAccountantPrimaryRefreshWindow(allEvents),
        (event) => isAccountantCanonicalFetchEvent(event),
      ) != null;
    if (!fetchCountAfterRealtime) {
      fetchCountAfterRealtime = countEvents(
        sliceAccountantPrimaryRefreshWindow(allEvents),
        (event) => isAccountantCanonicalFetchEvent(event),
      );
      doubleFetchDetected = fetchCountAfterRealtime > 1;
    }
    uiUpdated ||= hasAccountantUiRefreshWindow(allEvents);
    failureStage = !subscriptionConnected
      ? "subscribe_failed"
      : !eventReceived
        ? "event_not_received"
        : !refreshTriggered
          ? "refresh_not_triggered"
          : !uiUpdated
            ? "ui_not_updated"
            : "unknown";
  } finally {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    if (cleanupRealtimeRow) {
      await cleanupRealtimeRow().catch(() => {});
    }
    await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }

  return {
    passed,
    subscriptionStarted,
    subscriptionConnected,
    eventReceived,
    refreshTriggered,
    doubleFetchDetected,
    inflightGuardWorked,
    recentGuardWorked,
    backendOwnerPreserved,
    uiUpdated,
    fetchCountAfterRealtime,
    failureStage,
    screenshot: screenshotPath,
    platformSpecificIssues: [
      ...(hasBlockingConsoleErrors((runtime as { console: { type: string; text: string }[] }).console)
        ? ["Blocking console errors detected"]
        : []),
      ...platformSpecificIssues,
      ...((runtime as { pageErrors: string[] }).pageErrors ?? []),
      ...(((runtime as { badResponses: { url: string; status: number; method: string }[] }).badResponses ?? [])
        .filter((entry) => !entry.url.includes("/favicon"))
        .map((entry) => `${entry.method} ${entry.status} ${entry.url}`)),
    ],
    marker,
    runtime,
    events: allEvents,
  };
}

async function runAndroidRuntime(): Promise<PlatformResult & { marker: string | null; events: unknown[] }> {
  let user = null as Awaited<ReturnType<typeof createTempUser>> | null;
  let devClientCleanup: (() => void) | null = null;
  let cleanupRealtimeRow: (() => Promise<void>) | null = null;
  let marker: string | null = null;
  let allEvents: ReturnType<typeof androidRuntime.readObservabilityEvents> = [];
  let subscriptionStarted = false;
  let subscriptionConnected = false;
  let eventReceived = false;
  let refreshTriggered = false;
  let doubleFetchDetected = false;
  let inflightGuardWorked = false;
  let recentGuardWorked = false;
  let backendOwnerPreserved = false;
  let uiUpdated = false;
  let fetchCountAfterRealtime = 0;
  let failureStage: PlatformResult["failureStage"] = "unknown";
  let screenshot = "";
  let preflight: unknown = null;
  let recovery: Record<string, boolean> = {};
  let fioConfirmed = false;
  const platformSpecificIssues: string[] = [];

  try {
    user = await createTempUser(role, "Accountant Realtime Verify Android");
    const prepared = await androidRuntime.prepareRoleRuntime({
      user: { ...user, displayLabel: "Accountant Realtime Verify Android" },
      route: "rik://accountant",
      artifactBase: "android-accountant-realtime",
    });
    devClientCleanup = prepared.cleanup;
    preflight = prepared.preflight;
    recovery = androidRuntime.harness.getRecoverySummary();
    fioConfirmed = prepared.fioConfirmed;

    allEvents = await androidRuntime.waitForObservability(
      "accountant:android_surface_ready",
      (event) =>
        event.screen === "accountant" &&
        ((event.event === "load_inbox" && event.result === "success") ||
          (event.event === "content_ready" &&
            (event.surface === "inbox_list" || event.surface === "history_list"))),
      60_000,
    );
    const baselineTotal = readAccountantInboxTotal(allEvents) ?? 0;

    subscriptionStarted =
      (
        await androidRuntime.waitForObservability(
          "accountant:android_subscription_started",
          (event) => event.screen === "accountant" && event.event === "subscription_started",
          45_000,
        )
      ).some((event) => event.screen === "accountant" && event.event === "subscription_started");
    subscriptionConnected =
      (
        await androidRuntime.waitForObservability(
          "accountant:android_subscription_connected",
          (event) => event.screen === "accountant" && event.event === "subscription_connected",
          45_000,
        )
      ).some((event) => event.screen === "accountant" && event.event === "subscription_connected");

    await waitForStableEventCount(
      "accountant:android_idle_before_realtime",
      () => androidRuntime.readObservabilityEvents(),
      8_000,
      750,
    ).catch(() => []);
    await androidRuntime.settleIdleObservability(1_500, 4);
    marker = `RTACCT${Date.now()}`;
    const inboxEvent = await createAccountantInboxEvent(marker);
    cleanupRealtimeRow = inboxEvent.cleanup;

    const sentResult = await admin
      .from("proposals")
      .update({ sent_to_accountant_at: new Date().toISOString() })
      .eq("id", inboxEvent.proposalId);
    if (sentResult.error) throw sentResult.error;

    const afterRefresh = await androidRuntime.waitForObservability(
      "accountant:android_realtime_refresh",
      (event) =>
        event.screen === "accountant" &&
        (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
      45_000,
    );

    await poll(
      "accountant:android_ui_updated",
      async () => {
        const events = androidRuntime.readObservabilityEvents();
        if (hasAccountantUiRefreshWindow(events) || (readAccountantInboxTotal(events) ?? 0) > baselineTotal) {
          return events;
        }
        const screen = await androidRuntime.waitForScreenText(
          "accountant-android-ui-marker",
          (xml) => markerVisibleInText(xml, marker),
          1_500,
        ).catch(() => null);
        return screen ? events : null;
      },
      45_000,
      750,
    );
    allEvents = androidRuntime.readObservabilityEvents();
    const markerScreen = await androidRuntime.waitForScreenText(
      "accountant-android-final-marker",
      (xml) => markerVisibleInText(xml, marker),
      2_000,
    ).catch(() => null);
    uiUpdated =
      hasAccountantUiRefreshWindow(allEvents) ||
      (readAccountantInboxTotal(allEvents) ?? 0) > baselineTotal ||
      markerScreen != null;

    const burstOne = await admin
      .from("proposals")
      .update({ supplier: `${marker}-burst-1` })
      .eq("id", inboxEvent.proposalId);
    if (burstOne.error) throw burstOne.error;
    const burstTwo = await admin
      .from("proposals")
      .update({ supplier: `${marker}-burst-2` })
      .eq("id", inboxEvent.proposalId);
    if (burstTwo.error) throw burstTwo.error;

    await poll(
      "accountant:android_guard_events",
      async () => {
        const events = androidRuntime.readObservabilityEvents();
        const hasGuard =
          events.some((event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_recent") ||
          events.some((event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_inflight");
        return hasGuard ? events : null;
      },
      20_000,
      750,
    ).catch(() => androidRuntime.readObservabilityEvents());
    allEvents = androidRuntime.readObservabilityEvents();

    const finalScreen = androidRuntime.harness.dumpAndroidScreen("android-accountant-realtime-final");
    screenshot = finalScreen.pngPath;

    eventReceived =
      androidRuntime.findObservabilityEvent(
        afterRefresh,
        (event) => event.screen === "accountant" && event.event === "realtime_event_received",
      ) != null ||
      androidRuntime.findObservabilityEvent(
        allEvents,
        (event) => event.screen === "accountant" && event.event === "realtime_event_received",
      ) != null;
    refreshTriggered =
      androidRuntime.findObservabilityEvent(
        afterRefresh,
        (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered",
      ) != null ||
      androidRuntime.findObservabilityEvent(
        allEvents,
        (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered",
      ) != null;
    recentGuardWorked =
      androidRuntime.findObservabilityEvent(
        allEvents,
        (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_recent",
      ) != null;
    inflightGuardWorked =
      androidRuntime.findObservabilityEvent(
        allEvents,
        (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_inflight",
      ) != null;
    const realtimeWindow = sliceAccountantPrimaryRefreshWindow(allEvents);
    backendOwnerPreserved =
      androidRuntime.findObservabilityEvent(
        realtimeWindow,
        (event) =>
          event.screen === "accountant" &&
          event.event === "load_inbox" &&
          event.result === "success" &&
          event.sourceKind === "rpc:accountant_inbox_scope_v1" &&
          event.surface === "inbox_window",
      ) != null;
    fetchCountAfterRealtime = countEvents(
      realtimeWindow,
      (event) =>
        event.screen === "accountant" &&
        event.event === "load_inbox" &&
        event.result === "success" &&
        event.surface === "inbox_window",
    );
    doubleFetchDetected = fetchCountAfterRealtime > 1;
    failureStage =
      subscriptionStarted &&
      subscriptionConnected &&
      eventReceived &&
      refreshTriggered &&
      uiUpdated &&
      backendOwnerPreserved &&
      !doubleFetchDetected
        ? "unknown"
        : !subscriptionConnected
          ? "subscribe_failed"
          : !eventReceived
            ? "event_not_received"
            : !refreshTriggered
              ? "refresh_not_triggered"
              : !uiUpdated
                ? "ui_not_updated"
                : "unknown";
  } catch (error) {
    platformSpecificIssues.push(error instanceof Error ? error.message : String(error));
    allEvents = androidRuntime.readObservabilityEvents();
    subscriptionStarted ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "accountant" && event.event === "subscription_started") != null;
    subscriptionConnected ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "accountant" && event.event === "subscription_connected") != null;
    eventReceived ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "accountant" && event.event === "realtime_event_received") != null;
    refreshTriggered ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered") != null;
    recentGuardWorked ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_recent") != null;
    inflightGuardWorked ||= androidRuntime.findObservabilityEvent(allEvents, (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_inflight") != null;
    backendOwnerPreserved ||= androidRuntime.findObservabilityEvent(
      sliceAccountantPrimaryRefreshWindow(allEvents),
      (event) =>
        event.screen === "accountant" &&
        event.event === "load_inbox" &&
        event.result === "success" &&
        event.sourceKind === "rpc:accountant_inbox_scope_v1" &&
        event.surface === "inbox_window",
    ) != null;
    if (!fetchCountAfterRealtime) {
      fetchCountAfterRealtime = countEvents(
        sliceAccountantPrimaryRefreshWindow(allEvents),
        (event) =>
          event.screen === "accountant" &&
          event.event === "load_inbox" &&
          event.result === "success" &&
          event.surface === "inbox_window",
      );
      doubleFetchDetected = fetchCountAfterRealtime > 1;
    }
    uiUpdated ||= hasAccountantUiRefreshWindow(allEvents);
    failureStage = !subscriptionConnected
      ? "subscribe_failed"
      : !eventReceived
        ? "event_not_received"
        : !refreshTriggered
          ? "refresh_not_triggered"
          : !uiUpdated
            ? "ui_not_updated"
            : "unknown";
    if (!screenshot) {
      const failure = androidRuntime.harness.captureFailureArtifacts("android-accountant-realtime-failure");
      screenshot = failure.pngPath ?? "";
      platformSpecificIssues.push(...[failure.stdoutTail, failure.stderrTail].filter(Boolean));
    }
  } finally {
    if (cleanupRealtimeRow) {
      await cleanupRealtimeRow().catch(() => {});
    }
    await cleanupTempUser(user);
    devClientCleanup?.();
  }

  const passed =
    subscriptionStarted &&
    subscriptionConnected &&
    eventReceived &&
    refreshTriggered &&
    uiUpdated &&
    backendOwnerPreserved &&
    !doubleFetchDetected &&
    platformSpecificIssues.length === 0;

  return {
    passed,
    subscriptionStarted,
    subscriptionConnected,
    eventReceived,
    refreshTriggered,
    doubleFetchDetected,
    inflightGuardWorked,
    recentGuardWorked,
    backendOwnerPreserved,
    uiUpdated,
    fetchCountAfterRealtime,
    failureStage,
    screenshot,
    platformSpecificIssues,
    artifacts: {
      screenshot,
    },
    preflight,
    recovery,
    fioConfirmed,
    marker,
    events: allEvents,
  };
}

async function main() {
  const web = await runWebRuntime();
  writeArtifact(webRuntimePath, {
    marker: web.marker,
    baseUrl,
    runtime: web.runtime,
    events: web.events,
  });

  const android = await runAndroidRuntime();
  writeArtifact(androidRuntimePath, {
    marker: android.marker,
    events: android.events,
    preflight: android.preflight,
    recovery: android.recovery,
    fioConfirmed: android.fioConfirmed,
    artifacts: android.artifacts,
  });

  const summary = {
    gate: "V12.3 selective realtime accountant",
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
    fetchCountAfterRealtime: {
      web: web.fetchCountAfterRealtime,
      android: android.fetchCountAfterRealtime,
    },
    failureStage: !web.passed ? `web:${web.failureStage}` : !android.passed ? `android:${android.failureStage}` : "unknown",
    screenshot: screenshotPath,
    platformSpecificIssues: [
      ...web.platformSpecificIssues.map((issue) => ({ platform: "web", issue })),
      ...android.platformSpecificIssues.map((issue) => ({ platform: "android", issue })),
    ],
    artifacts: {
      webRuntime: webRuntimePath,
      androidRuntime: androidRuntimePath,
      webScreenshot: web.screenshot ?? null,
      androidScreenshot: android.screenshot ?? null,
    },
    web: {
      subscriptionStarted: web.subscriptionStarted,
      subscriptionConnected: web.subscriptionConnected,
      eventReceived: web.eventReceived,
      refreshTriggered: web.refreshTriggered,
      doubleFetchDetected: web.doubleFetchDetected,
      inflightGuardWorked: web.inflightGuardWorked,
      recentGuardWorked: web.recentGuardWorked,
      backendOwnerPreserved: web.backendOwnerPreserved,
      uiUpdated: web.uiUpdated,
      fetchCountAfterRealtime: web.fetchCountAfterRealtime,
      failureStage: web.failureStage,
    },
    android: {
      subscriptionStarted: android.subscriptionStarted,
      subscriptionConnected: android.subscriptionConnected,
      eventReceived: android.eventReceived,
      refreshTriggered: android.refreshTriggered,
      doubleFetchDetected: android.doubleFetchDetected,
      inflightGuardWorked: android.inflightGuardWorked,
      recentGuardWorked: android.recentGuardWorked,
      backendOwnerPreserved: android.backendOwnerPreserved,
      uiUpdated: android.uiUpdated,
      fetchCountAfterRealtime: android.fetchCountAfterRealtime,
      failureStage: android.failureStage,
      preflight: android.preflight,
      recovery: android.recovery,
      fioConfirmed: android.fioConfirmed,
    },
  };

  writeArtifact(`${artifactBase}.summary.json`, summary);
  writeArtifact(`${artifactBase}.json`, {
    marker: {
      web: web.marker,
      android: android.marker,
    },
    webRuntime: webRuntimePath,
    androidRuntime: androidRuntimePath,
    summary,
  });

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
