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

const artifactBase = "artifacts/accountant-realtime";
const screenshotPath = `${artifactBase}.png`;
const webRuntimePath = `${artifactBase}.web.json`;
const role = process.env.ACCOUNTANT_WEB_ROLE || "accountant";

async function waitForAccountantSurface(page: Page) {
  await waitForBodyContains(page, [/Бухгалтер/i, /К оплате/i, /История/i], 45_000);
}

async function openHistoryTab(page: Page) {
  await page.getByText(/История/i).first().click();
  await waitForBodyContains(page, /История/i, 15_000);
}

async function createAccountantHistoryEvent(marker: string) {
  const proposalResult = await admin
    .from("proposals")
    .insert({
      supplier: marker,
      invoice_number: marker,
      invoice_amount: 321,
    })
    .select("id")
    .single();
  if (proposalResult.error) throw proposalResult.error;

  const paymentResult = await admin
    .from("proposal_payments")
    .insert({
      proposal_id: proposalResult.data.id,
      amount: 321,
      note: marker,
      method: "verify",
    })
    .select("id")
    .single();
  if (paymentResult.error) throw paymentResult.error;

  return {
    proposalId: proposalResult.data.id,
    paymentId: paymentResult.data.id,
    cleanup: async () => {
      await admin.from("proposal_payments").delete().eq("id", paymentResult.data.id);
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
    user = await createTempUser(role, "Accountant Realtime Verify");
    await loginWithTempUser(page, "/accountant", user);
    await waitForAccountantSurface(page);
    await maybeConfirmFio(page, "Accountant Realtime Verify");
    await waitForAccountantSurface(page);
    await openHistoryTab(page);

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

    await resetObservabilityEvents(page);
    marker = `RTHIST${Date.now()}`;
    const historyEvent = await createAccountantHistoryEvent(marker);
    cleanupRealtimeRow = historyEvent.cleanup;

    const afterRefresh = await waitForObservability(
      page,
      "accountant:realtime_refresh",
      (event) =>
        event.screen === "accountant" &&
        (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
      45_000,
    );

    await waitForBodyContains(page, marker, 45_000);
    markerVisible = true;

    const secondPayment = await admin
      .from("proposal_payments")
      .insert({
        proposal_id: historyEvent.proposalId,
        amount: 11,
        note: `${marker}-burst`,
        method: "verify",
      })
      .select("id")
      .single();
    if (secondPayment.error) throw secondPayment.error;
    const secondPaymentId = secondPayment.data.id;
    const cleanupOriginal = cleanupRealtimeRow;
    cleanupRealtimeRow = async () => {
      await admin.from("proposal_payments").delete().eq("id", secondPaymentId);
      await cleanupOriginal();
    };

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
          event.extra?.table === "proposal_payments",
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
    backendOwnerPreserved =
      findEvent(
        allEvents,
        (event) =>
          event.screen === "accountant" &&
          event.category === "fetch" &&
          event.event === "load_history" &&
          event.trigger === "realtime" &&
          event.sourceKind === "rpc:accountant_history_scope_v1",
      ) != null;
    const realtimeFetchCount = countEvents(
      allEvents,
      (event) =>
        event.screen === "accountant" &&
        event.category === "fetch" &&
        event.event === "load_history" &&
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
          (event) => event.screen === "accountant" && event.event === "subscription_started",
        ) != null;
    }
    if (!eventReceived) {
      eventReceived =
        findEvent(
          allEvents,
          (event) =>
            event.screen === "accountant" &&
            event.event === "realtime_event_received" &&
            event.extra?.table === "proposal_payments",
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
            event.event === "load_history" &&
            event.trigger === "realtime" &&
            event.sourceKind === "rpc:accountant_history_scope_v1",
        ) != null;
    }
    if (!fetchCountAfterRealtime) {
      fetchCountAfterRealtime = countEvents(
        allEvents,
        (event) =>
          event.screen === "accountant" &&
          event.category === "fetch" &&
          event.event === "load_history" &&
          event.trigger === "realtime" &&
          event.result === "success",
      );
      doubleFetchDetected = fetchCountAfterRealtime > 1;
    }
  } finally {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    const summary = {
      gate: "V12.3 selective realtime accountant",
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
