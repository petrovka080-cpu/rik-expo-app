import fs from "node:fs";
import path from "node:path";

import {
  ACCOUNTANT_REALTIME_BINDINGS,
  ACCOUNTANT_REALTIME_CHANNEL_NAME,
  BUYER_REALTIME_BINDINGS,
  BUYER_REALTIME_CHANNEL_NAME,
} from "../src/lib/realtime/realtime.channels";

type SummaryFile = {
  status?: string;
  webPassed?: boolean;
  androidPassed?: boolean;
  runtimeVerified?: boolean;
  subscriptionStarted?: boolean;
  subscriptionConnected?: boolean;
  eventReceived?: boolean;
  refreshTriggered?: boolean;
  backendOwnerPreserved?: boolean;
  uiUpdated?: boolean;
  inflightGuardWorked?: boolean;
  recentGuardWorked?: boolean;
  doubleFetchDetected?: boolean;
  fetchCountAfterRealtime?: { web?: number; android?: number };
  platformSpecificIssues?: Array<unknown>;
  failureStage?: string;
  web?: {
    subscriptionStarted?: boolean;
    subscriptionConnected?: boolean;
    refreshTriggered?: boolean;
  };
  android?: {
    subscriptionStarted?: boolean;
    subscriptionConnected?: boolean;
    refreshTriggered?: boolean;
  };
};

type RuntimeEvent = {
  screen?: string | null;
  event?: string | null;
  extra?: Record<string, unknown> | null;
};

type RuntimeFile = {
  events?: RuntimeEvent[];
};

const projectRoot = process.cwd();
const lifecycleEvents = new Set([
  "channel_created",
  "subscription_started",
  "subscription_connected",
  "realtime_event_received",
  "realtime_refresh_triggered",
  "realtime_refresh_skipped_recent",
  "realtime_refresh_skipped_inflight",
  "subscription_stopped",
  "channel_closed",
]);

const readJson = <T,>(relativePath: string): T =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8")) as T;

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const writeText = (relativePath: string, text: string) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
};

const normalizeEvents = (file: RuntimeFile): RuntimeEvent[] =>
  Array.isArray(file.events) ? file.events.filter((event) => event && typeof event === "object") : [];

const countEvents = (events: RuntimeEvent[], eventName: string) =>
  events.filter((event) => event.event === eventName).length;

const withSummaryFallback = (count: number, flag?: boolean) => (count > 0 ? count : flag ? 1 : 0);

const collectRefreshReasons = (events: RuntimeEvent[]) => {
  const result: Record<string, number> = {};
  for (const event of events) {
    if (event.event !== "realtime_refresh_triggered") continue;
    const scopes = Array.isArray(event.extra?.scopes)
      ? event.extra?.scopes
          .map((scope) => String(scope ?? "").trim())
          .filter(Boolean)
          .join(",")
      : "";
    const scopeKey = String(event.extra?.scopeKey ?? "").trim();
    const key = scopes || scopeKey || "unknown_scope";
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
};

const filterLifecycleLines = (role: string, platform: "web" | "android", events: RuntimeEvent[]) =>
  events
    .filter((event) => event.screen === role && event.event && lifecycleEvents.has(event.event))
    .map((event) => {
      const bindingKey = String(event.extra?.bindingKey ?? "").trim();
      const table = String(event.extra?.table ?? "").trim();
      const scopes = Array.isArray(event.extra?.scopes)
        ? event.extra?.scopes
            .map((scope) => String(scope ?? "").trim())
            .filter(Boolean)
            .join(",")
        : "";
      const scopeKey = String(event.extra?.scopeKey ?? "").trim();
      const details = [bindingKey, table, scopes || scopeKey].filter(Boolean).join(" | ");
      return `${role}/${platform} ${event.event}${details ? ` :: ${details}` : ""}`;
    });

const buildRoleSmoke = (params: {
  role: "buyer" | "accountant";
  channelName: string;
  bindings: readonly { key: string; table: string; event: string; filter?: string }[];
  summary: SummaryFile;
  webEvents: RuntimeEvent[];
  androidEvents: RuntimeEvent[];
}) => {
  const combinedEvents = [...params.webEvents, ...params.androidEvents];
  return {
    role: params.role,
    status: params.summary.status ?? "failed",
    runtimeVerified: params.summary.runtimeVerified === true,
    webPassed: params.summary.webPassed === true,
    androidPassed: params.summary.androidPassed === true,
    channel: {
      name: params.channelName,
      bindings: params.bindings.map((binding) => ({
        key: binding.key,
        table: binding.table,
        event: binding.event,
        filter: binding.filter ?? null,
      })),
    },
    subscriptionsCreated: {
      web: withSummaryFallback(
        countEvents(params.webEvents, "subscription_started"),
        params.summary.web?.subscriptionStarted,
      ),
      android: withSummaryFallback(
        countEvents(params.androidEvents, "subscription_started"),
        params.summary.android?.subscriptionStarted,
      ),
      total:
        withSummaryFallback(countEvents(params.webEvents, "subscription_started"), params.summary.web?.subscriptionStarted) +
        withSummaryFallback(
          countEvents(params.androidEvents, "subscription_started"),
          params.summary.android?.subscriptionStarted,
        ),
    },
    channelsCreated: {
      web: withSummaryFallback(countEvents(params.webEvents, "channel_created"), params.summary.web?.subscriptionStarted),
      android: withSummaryFallback(
        countEvents(params.androidEvents, "channel_created"),
        params.summary.android?.subscriptionStarted,
      ),
      total:
        withSummaryFallback(countEvents(params.webEvents, "channel_created"), params.summary.web?.subscriptionStarted) +
        withSummaryFallback(
          countEvents(params.androidEvents, "channel_created"),
          params.summary.android?.subscriptionStarted,
        ),
    },
    refreshReasons: {
      web: collectRefreshReasons(params.webEvents),
      android: collectRefreshReasons(params.androidEvents),
    },
    coalescing: {
      recentGuardWorked: params.summary.recentGuardWorked === true,
      inflightGuardWorked: params.summary.inflightGuardWorked === true,
      skippedRecentEvents: countEvents(combinedEvents, "realtime_refresh_skipped_recent"),
      skippedInflightEvents: countEvents(combinedEvents, "realtime_refresh_skipped_inflight"),
    },
    subscriptionStarted: params.summary.subscriptionStarted === true,
    subscriptionConnected: params.summary.subscriptionConnected === true,
    eventReceived: params.summary.eventReceived === true,
    refreshTriggered: params.summary.refreshTriggered === true,
    backendOwnerPreserved: params.summary.backendOwnerPreserved === true,
    uiUpdated: params.summary.uiUpdated === true,
    fetchCountAfterRealtime: params.summary.fetchCountAfterRealtime ?? { web: null, android: null },
    doubleFetchDetected: params.summary.doubleFetchDetected === true,
    failureStage: params.summary.failureStage ?? "unknown",
    platformSpecificIssues: params.summary.platformSpecificIssues ?? [],
  };
};

function main() {
  const buyerSummary = readJson<SummaryFile>("artifacts/buyer-realtime.summary.json");
  const accountantSummary = readJson<SummaryFile>("artifacts/accountant-realtime.summary.json");
  const buyerWebEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/buyer-realtime.web.json"));
  const buyerAndroidEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/buyer-realtime.android.json"));
  const accountantWebEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/accountant-realtime.web.json"));
  const accountantAndroidEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/accountant-realtime.android.json"));

  const buyerSmoke = buildRoleSmoke({
    role: "buyer",
    channelName: BUYER_REALTIME_CHANNEL_NAME,
    bindings: BUYER_REALTIME_BINDINGS,
    summary: buyerSummary,
    webEvents: buyerWebEvents,
    androidEvents: buyerAndroidEvents,
  });
  const accountantSmoke = buildRoleSmoke({
    role: "accountant",
    channelName: ACCOUNTANT_REALTIME_CHANNEL_NAME,
    bindings: ACCOUNTANT_REALTIME_BINDINGS,
    summary: accountantSummary,
    webEvents: accountantWebEvents,
    androidEvents: accountantAndroidEvents,
  });

  writeJson("artifacts/realtime-wave1-buyer-smoke.json", buyerSmoke);
  writeJson("artifacts/realtime-wave1-accountant-smoke.json", accountantSmoke);

  const lifecycleLog = [
    ...filterLifecycleLines("buyer", "web", buyerWebEvents),
    ...filterLifecycleLines("buyer", "android", buyerAndroidEvents),
    ...filterLifecycleLines("accountant", "web", accountantWebEvents),
    ...filterLifecycleLines("accountant", "android", accountantAndroidEvents),
  ];
  writeText("artifacts/realtime-wave1-lifecycle-log.txt", `${lifecycleLog.join("\n")}\n`);

  const summary = {
    gate: "Realtime Lifecycle Hardening — Buyer + Accountant (Wave 1)",
    status:
      buyerSmoke.runtimeVerified &&
      accountantSmoke.runtimeVerified &&
      !buyerSmoke.doubleFetchDetected &&
      !accountantSmoke.doubleFetchDetected
        ? "GREEN"
        : "NOT GREEN",
    buyer: buyerSmoke,
    accountant: accountantSmoke,
    channelsRaised: {
      buyer: BUYER_REALTIME_CHANNEL_NAME,
      accountant: ACCOUNTANT_REALTIME_CHANNEL_NAME,
    },
    lifecycleLogPath: "artifacts/realtime-wave1-lifecycle-log.txt",
  };

  writeJson("artifacts/realtime-wave1-buyer-accountant-summary.json", summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

main();
