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
  waitForBodyContains,
  waitForObservability,
  writeArtifact,
} from "./_shared/realtimeWebRuntime";

const artifactBase = "artifacts/buyer-realtime";
const screenshotPath = `${artifactBase}.png`;
const webRuntimePath = `${artifactBase}.web.json`;
const role = process.env.BUYER_WEB_ROLE || "buyer";

async function waitForBuyerSurface(page: Page) {
  await waitForBodyContains(page, [/Снабженец/i, /Вход/i, /Контроль/i], 45_000);
}

async function resolveApprovedRequestStatus() {
  const inbox = await admin.rpc("buyer_summary_inbox_scope_v1", {
    p_offset: 0,
    p_limit: 1,
    p_search: null,
    p_company_id: null,
  });
  if (inbox.error) throw inbox.error;
  const first = Array.isArray((inbox.data as { rows?: Array<{ request_id?: string }> } | null)?.rows)
    ? (inbox.data as { rows: Array<{ request_id?: string }> }).rows[0]
    : null;
  if (!first?.request_id) {
    throw new Error("Buyer inbox scope returned no request row to clone approved status");
  }
  const statusResult = await admin
    .from("requests")
    .select("status")
    .eq("id", first.request_id)
    .single();
  if (statusResult.error) throw statusResult.error;
  return String(statusResult.data.status ?? "").trim();
}

async function createBuyerRealtimeRow(marker: string) {
  const approvedStatus = await resolveApprovedRequestStatus();
  const requestResult = await admin
    .from("requests")
    .insert({
      status: "pending",
      display_no: marker,
      object_name: marker,
      note: marker,
    })
    .select("id")
    .single();
  if (requestResult.error) throw requestResult.error;

  const itemResult = await admin
    .from("request_items")
    .insert({
      request_id: requestResult.data.id,
      name_human: marker,
      qty: 1,
      uom: "шт",
      rik_code: marker,
      status: "approved",
    })
    .select("id")
    .single();
  if (itemResult.error) throw itemResult.error;

  return {
    approvedStatus,
    requestId: requestResult.data.id,
    cleanup: async () => {
      await admin.from("request_items").delete().eq("id", itemResult.data.id);
      await admin.from("requests").delete().eq("id", requestResult.data.id);
    },
  };
}

async function main() {
  let user = null as Awaited<ReturnType<typeof createTempUser>> | null;
  let cleanupRealtimeRow: (() => Promise<void>) | null = null;
  const { browser, page, runtime } = await launchRolePage();
  let marker: string | null = null;
  let subscriptionStarted = false;
  let eventReceived = false;
  let refreshTriggered = false;
  let doubleFetchDetected = false;
  let inflightGuardWorked = false;
  let recentGuardWorked = false;
  let backendOwnerPreserved = false;
  let markerVisible = false;
  let fetchCountAfterRealtime = 0;
  let allEvents: Awaited<ReturnType<typeof getObservabilityEvents>> = [];
  const platformSpecificIssues: string[] = [];
  let webPassed = false;

  try {
    user = await createTempUser(role, "Buyer Realtime Verify");
    await loginWithTempUser(page, "/buyer", user);
    await waitForBuyerSurface(page);
    await maybeConfirmFio(page, "Buyer Realtime Verify");
    await waitForBuyerSurface(page);

    const subscriptionEvents = await waitForObservability(
      page,
      "buyer:subscription_started",
      (event) => event.screen === "buyer" && event.event === "subscription_started",
      45_000,
    );
    const subscriptionObserved =
      findEvent(
        subscriptionEvents,
        (event) => event.screen === "buyer" && event.event === "subscription_started",
      ) != null;
    subscriptionStarted = subscriptionObserved;

    await resetObservabilityEvents(page);
    marker = `RTBUY${Date.now()}`;
    const realtimeRow = await createBuyerRealtimeRow(marker);
    cleanupRealtimeRow = realtimeRow.cleanup;

    const updateResult = await admin
      .from("requests")
      .update({ status: realtimeRow.approvedStatus })
      .eq("id", realtimeRow.requestId);
    if (updateResult.error) throw updateResult.error;

    const afterRefresh = await waitForObservability(
      page,
      "buyer:realtime_refresh",
      (event) =>
        event.screen === "buyer" &&
        (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
      45_000,
    );

    await waitForBodyContains(page, marker, 45_000);
    markerVisible = true;

    const burstOne = await admin
      .from("requests")
      .update({ note: `${marker}-burst-1` })
      .eq("id", realtimeRow.requestId);
    if (burstOne.error) throw burstOne.error;
    const burstTwo = await admin
      .from("requests")
      .update({ note: `${marker}-burst-2` })
      .eq("id", realtimeRow.requestId);
    if (burstTwo.error) throw burstTwo.error;

    allEvents = await poll(
      "buyer:guard_events",
      async () => {
        const events = await getObservabilityEvents(page);
        const hasGuard =
          events.some((event) => event.screen === "buyer" && event.event === "realtime_refresh_skipped_recent") ||
          events.some((event) => event.screen === "buyer" && event.event === "realtime_refresh_skipped_inflight");
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
          event.screen === "buyer" &&
          event.event === "realtime_event_received" &&
          event.extra?.table === "requests",
      ) != null;
    refreshTriggered =
      findEvent(
        afterRefresh,
        (event) => event.screen === "buyer" && event.event === "realtime_refresh_triggered",
      ) != null;
    recentGuardWorked =
      findEvent(
        allEvents,
        (event) => event.screen === "buyer" && event.event === "realtime_refresh_skipped_recent",
      ) != null;
    inflightGuardWorked =
      findEvent(
        allEvents,
        (event) => event.screen === "buyer" && event.event === "realtime_refresh_skipped_inflight",
      ) != null;
    backendOwnerPreserved =
      findEvent(
        allEvents,
        (event) =>
          event.screen === "buyer" &&
          event.category === "fetch" &&
          event.event === "load_inbox" &&
          event.trigger === "realtime" &&
          event.sourceKind === "rpc:buyer_summary_inbox_scope_v1",
      ) != null;
    const realtimeFetchCount = countEvents(
      allEvents,
      (event) =>
        event.screen === "buyer" &&
        event.category === "fetch" &&
        event.event === "load_inbox" &&
        event.trigger === "realtime" &&
        event.result === "success",
    );
    fetchCountAfterRealtime = realtimeFetchCount;
    doubleFetchDetected = realtimeFetchCount > 1;
    webPassed =
      subscriptionStarted &&
      eventReceived &&
      refreshTriggered &&
      backendOwnerPreserved &&
      !doubleFetchDetected &&
      !hasBlockingConsoleErrors(runtime.console) &&
      runtime.pageErrors.length === 0 &&
      runtime.badResponses.filter((entry) => !entry.url.includes("/favicon")).length === 0;
  } catch (error) {
    platformSpecificIssues.push(error instanceof Error ? error.message : String(error));
    allEvents = await getObservabilityEvents(page).catch(() => allEvents);
    if (!subscriptionStarted) {
      subscriptionStarted =
        findEvent(
          allEvents,
          (event) => event.screen === "buyer" && event.event === "subscription_started",
        ) != null;
    }
    if (!eventReceived) {
      eventReceived =
        findEvent(
          allEvents,
          (event) =>
            event.screen === "buyer" &&
            event.event === "realtime_event_received" &&
            event.extra?.table === "requests",
        ) != null;
    }
    if (!refreshTriggered) {
      refreshTriggered =
        findEvent(
          allEvents,
          (event) => event.screen === "buyer" && event.event === "realtime_refresh_triggered",
        ) != null;
    }
    if (!recentGuardWorked) {
      recentGuardWorked =
        findEvent(
          allEvents,
          (event) => event.screen === "buyer" && event.event === "realtime_refresh_skipped_recent",
        ) != null;
    }
    if (!inflightGuardWorked) {
      inflightGuardWorked =
        findEvent(
          allEvents,
          (event) => event.screen === "buyer" && event.event === "realtime_refresh_skipped_inflight",
        ) != null;
    }
    if (!backendOwnerPreserved) {
      backendOwnerPreserved =
        findEvent(
          allEvents,
          (event) =>
            event.screen === "buyer" &&
            event.category === "fetch" &&
            event.event === "load_inbox" &&
            event.trigger === "realtime" &&
            event.sourceKind === "rpc:buyer_summary_inbox_scope_v1",
        ) != null;
    }
    if (!fetchCountAfterRealtime) {
      fetchCountAfterRealtime = countEvents(
        allEvents,
        (event) =>
          event.screen === "buyer" &&
          event.category === "fetch" &&
          event.event === "load_inbox" &&
          event.trigger === "realtime" &&
          event.result === "success",
      );
      doubleFetchDetected = fetchCountAfterRealtime > 1;
    }
  } finally {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    const summary = {
      gate: "V12.3 selective realtime buyer",
      status: webPassed ? "passed" : "failed",
      webPassed,
      androidPassed: false,
      iosPassed: false,
      iosResidual: "Android/iOS realtime runtime proof not executed in this verifier on this host",
      subscriptionStarted,
      eventReceived,
      refreshTriggered,
      doubleFetchDetected,
      inflightGuardWorked,
      recentGuardWorked,
      backendOwnerPreserved,
      markerVisible,
      fetchCountAfterRealtime,
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
