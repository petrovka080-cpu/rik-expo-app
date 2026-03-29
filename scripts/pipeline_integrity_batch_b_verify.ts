import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  deriveRequestHeadExpectationFromItemStatuses,
  matchesRequestHeadExpectation,
  REQUEST_APPROVED_STATUS,
  REQUEST_DRAFT_STATUS,
  REQUEST_PENDING_STATUS,
  REQUEST_REJECTED_STATUS,
} from "../src/lib/api/requests.status";
import {
  ACCOUNTANT_REALTIME_BINDINGS,
  ACCOUNTANT_REALTIME_CHANNEL_NAME,
  BUYER_REALTIME_BINDINGS,
  BUYER_REALTIME_CHANNEL_NAME,
  WAREHOUSE_REALTIME_BINDINGS,
  WAREHOUSE_REALTIME_CHANNEL_NAME,
} from "../src/lib/realtime/realtime.channels";

const root = process.cwd();
const artifactsDir = resolve(root, "artifacts");

const readJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(resolve(root, relativePath), "utf8")) as T;

const readText = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

type RuntimeEvent = {
  screen?: string | null;
  event?: string | null;
  extra?: Record<string, unknown> | null;
};

type RuntimeFile = {
  events?: RuntimeEvent[];
};

type RealtimeSummary = {
  status?: string;
  runtimeVerified?: boolean;
  subscriptionStarted?: boolean;
  subscriptionConnected?: boolean;
  eventReceived?: boolean;
  refreshTriggered?: boolean;
  recentGuardWorked?: boolean;
  inflightGuardWorked?: boolean;
  doubleFetchDetected?: boolean;
  fetchCountAfterRealtime?: { web?: number; android?: number };
  web?: {
    subscriptionStarted?: boolean;
    subscriptionConnected?: boolean;
  };
  android?: {
    subscriptionStarted?: boolean;
    subscriptionConnected?: boolean;
  };
};

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

const filterLifecycleEvents = (role: string, events: RuntimeEvent[]) =>
  events.filter((event) => event.screen === role && event.event && lifecycleEvents.has(event.event));

const buildRealtimeLifecycleArtifact = (params: {
  role: "buyer" | "accountant" | "warehouse";
  channelName: string;
  bindings: readonly {
    key: string;
    table: string;
    event: string;
    filter?: string;
    owner: string;
  }[];
  summary: RealtimeSummary;
  webEvents: RuntimeEvent[];
  androidEvents: RuntimeEvent[];
}) => {
  const webLifecycleEvents = filterLifecycleEvents(params.role, params.webEvents);
  const androidLifecycleEvents = filterLifecycleEvents(params.role, params.androidEvents);
  const combinedEvents = [...params.webEvents, ...params.androidEvents];

  return {
    role: params.role,
    status: params.summary.status ?? "unknown",
    runtimeVerified: params.summary.runtimeVerified === true,
    channel: {
      name: params.channelName,
      bindings: params.bindings.map((binding) => ({
        key: binding.key,
        table: binding.table,
        event: binding.event,
        filter: binding.filter ?? null,
        owner: binding.owner,
      })),
    },
    subscriptionsCreated: {
      web: withSummaryFallback(
        countEvents(webLifecycleEvents, "subscription_started"),
        params.summary.web?.subscriptionStarted,
      ),
      android: withSummaryFallback(
        countEvents(androidLifecycleEvents, "subscription_started"),
        params.summary.android?.subscriptionStarted,
      ),
    },
    channelsCreated: {
      web: withSummaryFallback(
        countEvents(webLifecycleEvents, "channel_created"),
        params.summary.web?.subscriptionStarted,
      ),
      android: withSummaryFallback(
        countEvents(androidLifecycleEvents, "channel_created"),
        params.summary.android?.subscriptionStarted,
      ),
    },
    lifecycleEventCounts: {
      web: Object.fromEntries([...lifecycleEvents].map((eventName) => [eventName, countEvents(webLifecycleEvents, eventName)])),
      android: Object.fromEntries(
        [...lifecycleEvents].map((eventName) => [eventName, countEvents(androidLifecycleEvents, eventName)]),
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
    doubleFetchDetected: params.summary.doubleFetchDetected === true,
    fetchCountAfterRealtime: params.summary.fetchCountAfterRealtime ?? { web: null, android: null },
  };
};

const buyerAccountantRealtime = readJson<{
  status?: string;
  buyer?: { status?: string; runtimeVerified?: boolean };
  accountant?: { status?: string; runtimeVerified?: boolean };
}>("artifacts/realtime-wave1-buyer-accountant-summary.json");

const warehouseRealtime = readJson<{
  status?: string;
  warehouse?: { status?: string; runtimeVerified?: boolean };
}>("artifacts/realtime-wave2-warehouse-contractor-summary.json");
const buyerRealtimeSummary = readJson<RealtimeSummary>("artifacts/buyer-realtime.summary.json");
const accountantRealtimeSummary = readJson<RealtimeSummary>("artifacts/accountant-realtime.summary.json");
const warehouseRealtimeSummary = readJson<RealtimeSummary>("artifacts/warehouse-realtime.summary.json");
const buyerWebEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/buyer-realtime.web.json"));
const buyerAndroidEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/buyer-realtime.android.json"));
const accountantWebEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/accountant-realtime.web.json"));
const accountantAndroidEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/accountant-realtime.android.json"));
const warehouseWebEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/warehouse-realtime.web.json"));
const warehouseAndroidEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/warehouse-realtime.android.json"));

const requestsText = readText("src/lib/api/requests.ts");
const requestsCapabilitiesText = readText("src/lib/api/requests.read-capabilities.ts");
const foremanRequestsText = readText("src/screens/foreman/foreman.requests.ts");
const directorNamingText = readText("src/lib/api/director_reports.naming.ts");

const realtimeMinimumRoles = {
  status:
    buyerAccountantRealtime.status === "GREEN" &&
    buyerAccountantRealtime.buyer?.status === "passed" &&
    buyerAccountantRealtime.accountant?.status === "passed" &&
    warehouseRealtime.status === "GREEN" &&
    warehouseRealtime.warehouse?.status === "passed"
      ? "GREEN"
      : "NOT_GREEN",
  buyer: {
    status: buyerAccountantRealtime.buyer?.status ?? "unknown",
    runtimeVerified: buyerAccountantRealtime.buyer?.runtimeVerified === true,
  },
  accountant: {
    status: buyerAccountantRealtime.accountant?.status ?? "unknown",
    runtimeVerified: buyerAccountantRealtime.accountant?.runtimeVerified === true,
  },
  warehouse: {
    status: warehouseRealtime.warehouse?.status ?? "unknown",
    runtimeVerified: warehouseRealtime.warehouse?.runtimeVerified === true,
  },
};

const reconcileCases = [
  {
    name: "all_draft",
    items: [REQUEST_DRAFT_STATUS, REQUEST_DRAFT_STATUS],
    expectedMode: "all_draft",
    matchingHead: REQUEST_DRAFT_STATUS,
  },
  {
    name: "mixed_with_inflight",
    items: [REQUEST_PENDING_STATUS, REQUEST_APPROVED_STATUS],
    expectedMode: "mixed_with_inflight",
    matchingHead: REQUEST_PENDING_STATUS,
  },
  {
    name: "all_approved",
    items: [REQUEST_APPROVED_STATUS],
    expectedMode: "all_approved",
    matchingHead: REQUEST_APPROVED_STATUS,
  },
  {
    name: "all_rejected",
    items: [REQUEST_REJECTED_STATUS],
    expectedMode: "all_rejected",
    matchingHead: REQUEST_REJECTED_STATUS,
  },
  {
    name: "mixed_terminal",
    items: [REQUEST_APPROVED_STATUS, REQUEST_REJECTED_STATUS],
    expectedMode: "mixed_terminal",
    matchingHead: REQUEST_APPROVED_STATUS,
  },
].map((entry) => {
  const expectation = deriveRequestHeadExpectationFromItemStatuses(entry.items);
  const matches = matchesRequestHeadExpectation(entry.matchingHead, expectation);
  return {
    ...entry,
    expectation,
    matches,
    passed: expectation.mode === entry.expectedMode && matches,
  };
});

const reconcileVerification = {
  status:
    reconcileCases.every((entry) => entry.passed) &&
    requestsText.includes("readRequestHeadStatus(") &&
    requestsText.includes("reconcile_plan_verified") &&
    requestsText.includes("reconcile_plan_no_effect") &&
    requestsText.includes("beforeHeadStatus") &&
    requestsText.includes("afterHeadStatus") &&
    !requestsText.includes("await run();\r\n      return true;") &&
    !requestsText.includes("await run();\n      return true;")
      ? "GREEN"
      : "NOT_GREEN",
  structural: {
    readBackPresent: requestsText.includes("readRequestHeadStatus("),
    verifiedEventPresent: requestsText.includes("reconcile_plan_verified"),
    noEffectEventPresent: requestsText.includes("reconcile_plan_no_effect"),
    beforeAfterTracked:
      requestsText.includes("beforeHeadStatus") &&
      requestsText.includes("afterHeadStatus"),
    oldBlindReturnRemoved:
      !requestsText.includes("await run();\r\n      return true;") &&
      !requestsText.includes("await run();\n      return true;"),
  },
  cases: reconcileCases,
};

const cacheDiscipline = {
  requestsReadCapabilities: {
    positiveTtlPresent: requestsCapabilitiesText.includes("REQUESTS_READ_CAPABILITY_POSITIVE_TTL_MS"),
    negativeTtlPresent: requestsCapabilitiesText.includes("REQUESTS_READ_CAPABILITY_NEGATIVE_TTL_MS"),
    invalidateExportPresent: requestsCapabilitiesText.includes("export function invalidateRequestsReadCapabilitiesCache()"),
    cacheModePresent: requestsCapabilitiesText.includes('type RequestsCapabilityCacheMode = "positive" | "negative";'),
  },
  foremanRequestNo: {
    positiveTtlPresent: foremanRequestsText.includes("REQUEST_NO_CAPABILITY_POSITIVE_TTL_MS"),
    negativeTtlPresent: foremanRequestsText.includes("REQUEST_NO_CAPABILITY_NEGATIVE_TTL_MS"),
    invalidateExportPresent: foremanRequestsText.includes("export function invalidateForemanRequestNoCapabilityCache()"),
    cacheModePresent: foremanRequestsText.includes('mode: "positive" | "negative";'),
  },
  directorNaming: {
    positiveTtlPresent: directorNamingText.includes("NAME_SOURCES_PROBE_POSITIVE_TTL_MS"),
    negativeTtlPresent: directorNamingText.includes("NAME_SOURCES_PROBE_NEGATIVE_TTL_MS"),
  },
};

const cacheDisciplineStatus =
  Object.values(cacheDiscipline.requestsReadCapabilities).every(Boolean) &&
  Object.values(cacheDiscipline.foremanRequestNo).every(Boolean) &&
  Object.values(cacheDiscipline.directorNaming).every(Boolean)
    ? "GREEN"
    : "NOT_GREEN";

mkdirSync(artifactsDir, { recursive: true });

writeFileSync(
  join(artifactsDir, "realtime-buyer-lifecycle.json"),
  `${JSON.stringify(
    buildRealtimeLifecycleArtifact({
      role: "buyer",
      channelName: BUYER_REALTIME_CHANNEL_NAME,
      bindings: BUYER_REALTIME_BINDINGS,
      summary: buyerRealtimeSummary,
      webEvents: buyerWebEvents,
      androidEvents: buyerAndroidEvents,
    }),
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "realtime-accountant-lifecycle.json"),
  `${JSON.stringify(
    buildRealtimeLifecycleArtifact({
      role: "accountant",
      channelName: ACCOUNTANT_REALTIME_CHANNEL_NAME,
      bindings: ACCOUNTANT_REALTIME_BINDINGS,
      summary: accountantRealtimeSummary,
      webEvents: accountantWebEvents,
      androidEvents: accountantAndroidEvents,
    }),
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "realtime-warehouse-lifecycle.json"),
  `${JSON.stringify(
    buildRealtimeLifecycleArtifact({
      role: "warehouse",
      channelName: WAREHOUSE_REALTIME_CHANNEL_NAME,
      bindings: WAREHOUSE_REALTIME_BINDINGS,
      summary: warehouseRealtimeSummary,
      webEvents: warehouseWebEvents,
      androidEvents: warehouseAndroidEvents,
    }),
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "realtime-minimum-roles-smoke.json"),
  `${JSON.stringify(realtimeMinimumRoles, null, 2)}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "reconcile-outcome-verification.json"),
  `${JSON.stringify(reconcileVerification, null, 2)}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "cache-discipline-summary.json"),
  `${JSON.stringify(
    {
      status: cacheDisciplineStatus,
      ...cacheDiscipline,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const status =
  realtimeMinimumRoles.status === "GREEN" &&
  reconcileVerification.status === "GREEN" &&
  cacheDisciplineStatus === "GREEN"
    ? "GREEN"
    : "NOT_GREEN";

writeFileSync(
  join(artifactsDir, "pipeline-batch-b-summary.json"),
  `${JSON.stringify(
    {
      status,
      realtimeMinimumRolesStatus: realtimeMinimumRoles.status,
      reconcileStatus: reconcileVerification.status,
      cacheDisciplineStatus,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      status,
      realtimeMinimumRolesStatus: realtimeMinimumRoles.status,
      reconcileStatus: reconcileVerification.status,
      cacheDisciplineStatus,
    },
    null,
    2,
  ),
);
