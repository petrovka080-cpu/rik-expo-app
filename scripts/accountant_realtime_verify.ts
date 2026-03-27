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
  resetObservabilityEvents,
  waitForObservability,
  writeArtifact,
} from "./_shared/realtimeWebRuntime";

const artifactBase = "artifacts/accountant-realtime";
const screenshotPath = `${artifactBase}.png`;
const webRuntimePath = `${artifactBase}.web.json`;
const role = process.env.ACCOUNTANT_WEB_ROLE || "accountant";

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

function readAccountantInboxTotal(events: Awaited<ReturnType<typeof getObservabilityEvents>>) {
  const match = [...events]
    .reverse()
    .find(
      (event) =>
        event.screen === "accountant" &&
        ((event.category === "fetch" && event.event === "load_inbox" && event.result === "success") ||
          (event.category === "ui" && event.event === "content_ready" && event.surface === "inbox_list")),
    );
  const value = match?.extra?.totalRowCount;
  return typeof value === "number" ? value : null;
}

function sliceAccountantRealtimeWindow(events: Awaited<ReturnType<typeof getObservabilityEvents>>) {
  const startIndex = events.findIndex(
    (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered",
  );
  return startIndex >= 0 ? events.slice(startIndex) : events;
}

async function createAccountantInboxEvent(marker: string) {
  const proposalResult = await admin
    .from("proposals")
    .insert({
      supplier: marker,
      invoice_number: marker,
      invoice_amount: 321,
      payment_status: "\u041a \u043e\u043f\u043b\u0430\u0442\u0435",
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

async function main() {
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
  const platformSpecificIssues: string[] = [];
  let webPassed = false;
  let failureStage:
    | "subscribe_failed"
    | "event_not_received"
    | "filter_rejected"
    | "guard_skipped"
    | "refresh_not_triggered"
    | "ui_not_updated"
    | "unknown" = "unknown";

  try {
    user = await createTempUser(role, "Accountant Realtime Verify");
    await loginWithTempUser(page, "/accountant", user);
    await waitForAccountantSurface(page);
    await maybeConfirmFio(page, "Accountant Realtime Verify");
    await waitForAccountantSurface(page);
    const baselineEvents = await getObservabilityEvents(page);
    const baselineTotal = readAccountantInboxTotal(baselineEvents) ?? 0;

    const subscriptionEvents = await waitForObservability(
      page,
      "accountant:subscription_started",
      (event) => event.screen === "accountant" && event.event === "subscription_started",
      45_000,
    );
    const subscriptionObserved =
      findEvent(
        subscriptionEvents,
        (event) => event.screen === "accountant" && event.event === "subscription_started",
      ) != null;
    subscriptionStarted = subscriptionObserved;
    const connectedEvents = await waitForObservability(
      page,
      "accountant:subscription_connected",
      (event) => event.screen === "accountant" && event.event === "subscription_connected",
      45_000,
    );
    subscriptionConnected =
      findEvent(
        connectedEvents,
        (event) => event.screen === "accountant" && event.event === "subscription_connected",
      ) != null;

    await resetObservabilityEvents(page);
    marker = `RTACCT${Date.now()}`;
    const inboxEvent = await createAccountantInboxEvent(marker);
    cleanupRealtimeRow = inboxEvent.cleanup;

    const sentResult = await admin
      .from("proposals")
      .update({ sent_to_accountant_at: new Date().toISOString() })
      .eq("id", inboxEvent.proposalId);
    if (sentResult.error) throw sentResult.error;

    const afterRefresh = await waitForObservability(
      page,
      "accountant:realtime_refresh",
      (event) =>
        event.screen === "accountant" &&
        (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
      45_000,
    );

    allEvents = await poll(
      "accountant:ui_updated",
      async () => {
        const events = await getObservabilityEvents(page);
        return (readAccountantInboxTotal(events) ?? 0) > baselineTotal ? events : null;
      },
      45_000,
      250,
    );
    uiUpdated = (readAccountantInboxTotal(allEvents) ?? 0) > baselineTotal;

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

    allEvents = await poll(
      "accountant:guard_events",
      async () => {
        const events = await getObservabilityEvents(page);
        const hasGuard =
          events.some((event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_recent") ||
          events.some((event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_inflight");
        return hasGuard ? events : null;
      },
      20_000,
      250,
    ).catch(async () => await getObservabilityEvents(page));

    await page.screenshot({ path: screenshotPath, fullPage: true });

    eventReceived =
      findEvent(
        afterRefresh,
        (event) =>
          event.screen === "accountant" &&
          event.event === "realtime_event_received" &&
          event.extra?.table === "proposals",
      ) != null;
    refreshTriggered =
      findEvent(
        afterRefresh,
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
    const realtimeWindow = sliceAccountantRealtimeWindow(allEvents);
    backendOwnerPreserved =
      findEvent(
        realtimeWindow,
        (event) =>
          event.screen === "accountant" &&
          event.category === "fetch" &&
          event.event === "load_inbox" &&
          event.result === "success" &&
          event.sourceKind === "rpc:accountant_inbox_scope_v1",
      ) != null;
    const realtimeFetchCount = countEvents(
      realtimeWindow,
      (event) =>
        event.screen === "accountant" &&
        event.category === "fetch" &&
        event.event === "load_inbox" &&
        event.result === "success",
    );
    fetchCountAfterRealtime = realtimeFetchCount;
    doubleFetchDetected = realtimeFetchCount > 1;
    webPassed =
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
    failureStage = webPassed
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
    allEvents = await getObservabilityEvents(page).catch(() => allEvents);
    if (!subscriptionStarted) {
      subscriptionStarted =
        findEvent(
          allEvents,
          (event) => event.screen === "accountant" && event.event === "subscription_started",
        ) != null;
    }
    if (!subscriptionConnected) {
      subscriptionConnected =
        findEvent(
          allEvents,
          (event) => event.screen === "accountant" && event.event === "subscription_connected",
        ) != null;
    }
    if (!eventReceived) {
      eventReceived =
        findEvent(
          allEvents,
          (event) =>
            event.screen === "accountant" &&
            event.event === "realtime_event_received" &&
            event.extra?.table === "proposals",
        ) != null;
    }
    if (!refreshTriggered) {
      refreshTriggered =
        findEvent(
          allEvents,
          (event) => event.screen === "accountant" && event.event === "realtime_refresh_triggered",
        ) != null;
    }
    if (!recentGuardWorked) {
      recentGuardWorked =
        findEvent(
          allEvents,
          (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_recent",
        ) != null;
    }
    if (!inflightGuardWorked) {
      inflightGuardWorked =
        findEvent(
          allEvents,
          (event) => event.screen === "accountant" && event.event === "realtime_refresh_skipped_inflight",
        ) != null;
    }
    if (!backendOwnerPreserved) {
      backendOwnerPreserved =
        findEvent(
          allEvents,
          (event) =>
            event.screen === "accountant" &&
            event.category === "fetch" &&
            event.event === "load_inbox" &&
            event.result === "success" &&
            event.sourceKind === "rpc:accountant_inbox_scope_v1",
        ) != null;
    }
    if (!fetchCountAfterRealtime) {
      fetchCountAfterRealtime = countEvents(
        allEvents,
        (event) =>
          event.screen === "accountant" &&
          event.category === "fetch" &&
          event.event === "load_inbox" &&
          event.result === "success",
      );
      doubleFetchDetected = fetchCountAfterRealtime > 1;
    }
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
    const summary = {
      gate: "V12.3 selective realtime accountant",
      status: webPassed ? "passed" : "failed",
      webPassed,
      androidPassed: false,
      iosPassed: false,
      runtimeVerified: webPassed,
      iosResidual: "Android/iOS realtime runtime proof not executed in this verifier on this host",
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
        ...(hasBlockingConsoleErrors(runtime.console) ? ["Blocking console errors detected"] : []),
        ...platformSpecificIssues,
        ...runtime.pageErrors,
        ...runtime.badResponses
          .filter((entry) => !entry.url.includes("/favicon"))
          .map((entry) => `${entry.method} ${entry.status} ${entry.url}`),
      ],
    };

    writeArtifact(webRuntimePath, {
      marker,
      baseUrl,
      runtime,
      events: allEvents,
      summary,
    });
    writeArtifact(`${artifactBase}.summary.json`, summary);
    writeArtifact(`${artifactBase}.json`, {
      marker,
      webRuntime: webRuntimePath,
      summary,
    });

    console.log(JSON.stringify(summary, null, 2));
    if (!webPassed) {
      process.exitCode = 1;
    }
    if (cleanupRealtimeRow) {
      await cleanupRealtimeRow().catch(() => {});
    }
    await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
