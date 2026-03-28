import fs from "node:fs";
import path from "node:path";

import {
  CONTRACTOR_REALTIME_BINDINGS,
  CONTRACTOR_REALTIME_CHANNEL_NAME,
  WAREHOUSE_REALTIME_BINDINGS,
  WAREHOUSE_REALTIME_CHANNEL_NAME,
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
  failureStage?: string;
  detailUpdated?: boolean;
  platformSpecificIssues?: Array<unknown>;
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
  role: "warehouse" | "contractor";
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
      web: withSummaryFallback(countEvents(params.webEvents, "subscription_started"), params.summary.webPassed),
      android: withSummaryFallback(countEvents(params.androidEvents, "subscription_started"), params.summary.androidPassed),
      total:
        withSummaryFallback(countEvents(params.webEvents, "subscription_started"), params.summary.webPassed) +
        withSummaryFallback(countEvents(params.androidEvents, "subscription_started"), params.summary.androidPassed),
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
    detailUpdated: params.role === "contractor" ? params.summary.detailUpdated === true : null,
    fetchCountAfterRealtime: params.summary.fetchCountAfterRealtime ?? { web: null, android: null },
    doubleFetchDetected: params.summary.doubleFetchDetected === true,
    failureStage: params.summary.failureStage ?? "unknown",
    platformSpecificIssues: params.summary.platformSpecificIssues ?? [],
  };
};

function main() {
  const warehouseSummary = readJson<SummaryFile>("artifacts/warehouse-realtime.summary.json");
  const contractorSummary = readJson<SummaryFile>("artifacts/contractor-realtime.summary.json");
  const warehouseWebEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/warehouse-realtime.web.json"));
  const warehouseAndroidEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/warehouse-realtime.android.json"));
  const contractorWebEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/contractor-realtime.web.json"));
  const contractorAndroidEvents = normalizeEvents(readJson<RuntimeFile>("artifacts/contractor-realtime.android.json"));

  const warehouseSmoke = buildRoleSmoke({
    role: "warehouse",
    channelName: WAREHOUSE_REALTIME_CHANNEL_NAME,
    bindings: WAREHOUSE_REALTIME_BINDINGS,
    summary: warehouseSummary,
    webEvents: warehouseWebEvents,
    androidEvents: warehouseAndroidEvents,
  });
  const contractorSmoke = buildRoleSmoke({
    role: "contractor",
    channelName: CONTRACTOR_REALTIME_CHANNEL_NAME,
    bindings: CONTRACTOR_REALTIME_BINDINGS,
    summary: contractorSummary,
    webEvents: contractorWebEvents,
    androidEvents: contractorAndroidEvents,
  });

  writeJson("artifacts/realtime-wave2-warehouse-smoke.json", warehouseSmoke);
  writeJson("artifacts/realtime-wave2-contractor-smoke.json", contractorSmoke);

  const lifecycleLog = [
    ...filterLifecycleLines("warehouse", "web", warehouseWebEvents),
    ...filterLifecycleLines("warehouse", "android", warehouseAndroidEvents),
    ...filterLifecycleLines("contractor", "web", contractorWebEvents),
    ...filterLifecycleLines("contractor", "android", contractorAndroidEvents),
  ];
  writeText("artifacts/realtime-wave2-lifecycle-log.txt", `${lifecycleLog.join("\n")}\n`);

  const summary = {
    gate: "Realtime Lifecycle Hardening - Wave 2 (Warehouse + Contractor)",
    status:
      warehouseSmoke.runtimeVerified &&
      contractorSmoke.runtimeVerified &&
      !warehouseSmoke.doubleFetchDetected &&
      !contractorSmoke.doubleFetchDetected
        ? "GREEN"
        : "NOT GREEN",
    warehouse: warehouseSmoke,
    contractor: contractorSmoke,
    channelsRaised: {
      warehouse: WAREHOUSE_REALTIME_CHANNEL_NAME,
      contractor: CONTRACTOR_REALTIME_CHANNEL_NAME,
    },
    lifecycleLogPath: "artifacts/realtime-wave2-lifecycle-log.txt",
  };

  writeJson("artifacts/realtime-wave2-warehouse-contractor-summary.json", summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

main();
