import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";

import {
  admin,
  cleanupTempUser,
  createTempUser,
  findEvent,
  getObservabilityEvents,
  hasBlockingConsoleErrors,
  launchRolePage,
  loginWithTempUser,
  maybeConfirmFio,
  poll,
  writeArtifact,
} from "./_shared/realtimeWebRuntime";
import {
  DIRECTOR_FINANCE_REALTIME_BINDINGS,
  DIRECTOR_FINANCE_REALTIME_CHANNEL_NAME,
  DIRECTOR_REPORTS_REALTIME_BINDINGS,
  DIRECTOR_REPORTS_REALTIME_CHANNEL_NAME,
} from "../src/lib/realtime/realtime.channels";

type RuntimeEvent = {
  screen?: string | null;
  surface?: string | null;
  category?: string | null;
  event?: string | null;
  result?: string | null;
  sourceKind?: string | null;
  extra?: Record<string, unknown> | null;
};

type ScopeSmoke = {
  scope: "finance" | "reports";
  status: "passed" | "failed";
  channelName: string;
  bindings: {
    key: string;
    table: string;
    event: string;
    filter: string | null;
  }[];
  subscriptionStarted: boolean;
  subscriptionConnected: boolean;
  eventReceived: boolean;
  refreshTriggered: boolean;
  canonicalFetchPreserved: boolean;
  uiSurfaceReady: boolean;
  noCrossScopeReload: boolean;
  doubleFetchDetected: boolean;
  coalescedObserved: boolean;
  fetchCountAfterRealtime: number;
  failureStage: string;
};

const projectRoot = process.cwd();
const lifecycleLogPath = "artifacts/director-realtime-lifecycle-log.txt";
const summaryPath = "artifacts/director-realtime-wave3-summary.json";
const financeSmokePath = "artifacts/director-finance-realtime-smoke.json";
const reportsSmokePath = "artifacts/director-reports-realtime-smoke.json";
const publicationMigrationPath =
  "supabase/migrations/20260329073000_director_realtime_wave3_publication.sql";

const DIRECTOR_TAB_FINANCE = ["\u0424\u0438\u043d\u0430\u043d\u0441\u044b", "\u0420\u201e\u0420\u0451\u0420\u045a\u0420\u00b0\u0420\u045a\u0421\u2039"];
const DIRECTOR_TAB_REPORTS = ["\u041e\u0442\u0447\u0451\u0442\u044b", "\u0420\u045e\u0421\u201a\u0421\u2021\u0451\u0421\u201a\u0421\u2039"];
const DIRECTOR_REPORT_CARD_TITLE = [
  "\u0424\u0430\u043a\u0442 \u0432\u044b\u0434\u0430\u0447\u0438 (\u0441\u043a\u043b\u0430\u0434)",
  "\u0420\u201e\u0420\u00b0\u0420\u0454\u0421\u201a \u0420\u0406\u0421\u2039\u0420\u0491\u0420\u00b0\u0421\u2021\u0420\u0458 (\u0421\u0401\u0420\u0454\u0420\u00bb\u0420\u00b0\u0420\u0491)",
];
const DIRECTOR_OPEN_LABEL = ["\u041e\u0442\u043a\u0440\u044b\u0442\u044c", "\u0420\u045e\u0421\u201a\u0420\u0454\u0421\u0402\u0421\u2039\u0421\u201a\u0421\u040c"];
const DIRECTOR_REPORTS_MATERIALS_LABELS = [
  "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  "\u0420\u045c\u0420\u00b0\u0421\u201a\u0420\u00b5\u0421\u0402\u0420\u0458\u0420\u00b0\u0420\u00bb\u0421\u2039",
];
const DIRECTOR_REPORTS_WORKS_LABELS = [
  "\u0420\u0430\u0431\u043e\u0442\u044b",
  "\u0420\u00a0\u0420\u00b0\u0420\u00b1\u0420\u0455\u0421\u201a\u0421\u2039",
];
const DIRECTOR_FINANCE_SURFACE_MARKERS = [
  "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430",
  "\u0420\u045e\u0420\u00b1\u0421\u040f\u0420\u00b7\u0420\u00b0\u0421\u201a\u0420\u00b5\u0420\u00bb\u0421\u040c\u0421\u0401\u0421\u201a\u0420\u0406\u0420\u00b0",
  "\u0420\u0430\u0441\u0445\u043e\u0434\u044b",
  "\u0420\u00a0\u0420\u00b0\u0421\u0401\u0421\u2026\u0420\u0455\u0420\u00b4\u0421\u2039",
];

const hasReportsModalMarkers = (value: string) =>
  hasAnyLabel(value, DIRECTOR_REPORTS_MATERIALS_LABELS) &&
  hasAnyLabel(value, DIRECTOR_REPORTS_WORKS_LABELS);

const readBodyText = async (page: Page) =>
  page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim());

type DomTextTarget = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const normalizeText = (value: string) => value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const findDomTextTarget = async (
  page: Page,
  labels: readonly string[],
  options?: {
    exact?: boolean;
    minY?: number;
    maxY?: number;
  },
) =>
  page.locator("div,button").evaluateAll(
    (nodes, params) => {
      const normalizedLabels = params.labels.map((label) =>
        String(label).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim(),
      );
      const exact = params.exact !== false;
      const minY = typeof params.minY === "number" ? params.minY : null;
      const maxY = typeof params.maxY === "number" ? params.maxY : null;
      const candidates = nodes
        .map((node) => {
          const text = (node.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
          const rect = node.getBoundingClientRect();
          return {
            text,
            x: rect.left,
            y: rect.top,
            w: rect.width,
            h: rect.height,
          };
        })
        .filter((candidate) => {
          if (!candidate.text || candidate.w <= 0 || candidate.h <= 0) return false;
          if (minY != null && candidate.y < minY) return false;
          if (maxY != null && candidate.y > maxY) return false;
          return normalizedLabels.some((label) =>
            exact ? candidate.text === label : candidate.text === label || candidate.text.includes(label),
          );
        })
        .sort((left, right) => {
          const leftExact = normalizedLabels.some((label) => left.text === label) ? 1 : 0;
          const rightExact = normalizedLabels.some((label) => right.text === label) ? 1 : 0;
          if (leftExact !== rightExact) return rightExact - leftExact;
          const areaDiff = right.w * right.h - left.w * left.h;
          if (areaDiff !== 0) return areaDiff;
          if (left.y !== right.y) return left.y - right.y;
          return left.x - right.x;
        });
      return candidates[0] ?? null;
    },
    {
      labels: [...labels],
      exact: options?.exact ?? true,
      minY: options?.minY ?? null,
      maxY: options?.maxY ?? null,
    },
  ) as Promise<DomTextTarget | null>;

const clickDomText = async (
  page: Page,
  labels: readonly string[],
  options?: {
    exact?: boolean;
    minY?: number;
    maxY?: number;
  },
) => {
  const target = await findDomTextTarget(page, labels, options);
  if (!target) {
    throw new Error(`DOM text target not found: ${labels[0] ?? "unknown"}`);
  }
  await page.mouse.click(target.x + target.w / 2, target.y + target.h / 2);
};

const hasAnyLabel = (value: string, labels: readonly string[]) => labels.some((label) => value.includes(label));

const waitForStableEvents = async (page: Page, baselineCount: number, timeoutMs = 8_000) => {
  let lastCount = -1;
  await poll(
    "director:stable_observability",
    async () => {
      const events = (await getObservabilityEvents(page)) as RuntimeEvent[];
      const count = Math.max(events.length - baselineCount, 0);
      if (count > 0 && count === lastCount) return true;
      lastCount = count;
      return null;
    },
    timeoutMs,
    500,
  ).catch(() => false);
};

const sliceRealtimeWindow = (
  events: RuntimeEvent[],
  surface: "finance_realtime" | "reports_realtime",
) => {
  const startIndex = events.findIndex(
    (event) =>
      event.screen === "director" &&
      event.surface === surface &&
      event.event === "realtime_refresh_triggered",
  );
  return startIndex >= 0 ? events.slice(startIndex) : events;
};

const countEvents = (
  events: RuntimeEvent[],
  predicate: (event: RuntimeEvent) => boolean,
) => events.filter(predicate).length;

const lifecycleLines = (events: RuntimeEvent[]) =>
  events
    .filter(
      (event) =>
        event.screen === "director" &&
        [
          "channel_created",
          "subscription_started",
          "subscription_connected",
          "realtime_event_received",
          "realtime_refresh_triggered",
          "realtime_refresh_coalesced",
          "subscription_stopped",
          "channel_closed",
        ].includes(String(event.event ?? "")),
    )
    .map((event) => {
      const bindingKey = String(event.extra?.bindingKey ?? "").trim();
      const table = String(event.extra?.table ?? "").trim();
      const scopeKey = String(event.extra?.scopeKey ?? "").trim();
      const parts = [String(event.surface ?? "").trim(), String(event.event ?? "").trim(), bindingKey, table, scopeKey]
        .filter(Boolean)
        .join(" | ");
      return parts;
    });

const isFinanceFetchEvent = (event: RuntimeEvent) =>
  event.screen === "director" &&
  event.surface === "finance_panel" &&
  event.event === "load_finance_scope" &&
  event.result === "success" &&
  event.sourceKind === "rpc_v3";

const isReportsFetchEvent = (event: RuntimeEvent) =>
  event.screen === "director" &&
  event.surface === "reports_scope" &&
  event.event === "load_report_scope" &&
  event.result === "success";

async function waitForDirectorHome(page: Page) {
  await poll(
    "director:home_surface",
    async () => {
      const body = await readBodyText(page);
      return body.includes("\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c") || body.includes("\u0420\u0459\u0420\u0455\u0420\u045a\u0421\u201a\u0421\u201a\u0420\u0455\u0420\u00bb\u0421\u040a")
        ? body
        : null;
    },
    45_000,
    250,
  );
}

async function selectProposalMutationTarget() {
  const { data, error } = await admin
    .from("proposals")
    .select("id,supplier")
    .limit(1)
    .order("id", { ascending: true })
    .single();
  if (error) throw error;
  return {
    id: String(data.id),
    originalSupplier: String(data.supplier ?? ""),
  };
}

async function selectReportMutationTarget() {
  const { data, error } = await admin
    .from("request_items")
    .select("id,note")
    .limit(1)
    .order("id", { ascending: true })
    .single();
  if (error) throw error;
  return {
    id: String(data.id),
    originalNote: data.note == null ? null : String(data.note),
  };
}

async function runFinanceSmoke(page: Page): Promise<ScopeSmoke> {
  await clickDomText(page, DIRECTOR_TAB_FINANCE, { maxY: 220 });
  await poll(
    "director:finance_surface_ready",
    async () => {
      const body = await readBodyText(page);
      return hasAnyLabel(body, DIRECTOR_FINANCE_SURFACE_MARKERS) ? body : null;
    },
    30_000,
    250,
  );
  await poll(
    "director:finance_fetch_ready",
    async () => {
      const events = (await getObservabilityEvents(page)) as RuntimeEvent[];
      return events.some(isFinanceFetchEvent) ? events : null;
    },
    30_000,
    250,
  );
  const subscriptionStartedEvents = await poll(
    "director:finance_subscription_started",
    async () => {
      const events = (await getObservabilityEvents(page)) as RuntimeEvent[];
      return events.some(
        (event) =>
          event.screen === "director" &&
          event.surface === "finance_realtime" &&
          event.event === "subscription_started" &&
          String(event.extra?.channelName ?? "") === DIRECTOR_FINANCE_REALTIME_CHANNEL_NAME,
      )
        ? events
        : null;
    },
    30_000,
    250,
  );
  const subscriptionConnectedEvents = await poll(
    "director:finance_subscription_connected",
    async () => {
      const events = (await getObservabilityEvents(page)) as RuntimeEvent[];
      return events.some(
        (event) =>
          event.screen === "director" &&
          event.surface === "finance_realtime" &&
          event.event === "subscription_connected" &&
          String(event.extra?.channelName ?? "") === DIRECTOR_FINANCE_REALTIME_CHANNEL_NAME,
      )
        ? events
        : null;
    },
    30_000,
    250,
  );
  const baselineEvents = (subscriptionConnectedEvents as RuntimeEvent[]) ?? (subscriptionStartedEvents as RuntimeEvent[]);
  const baselineCount = baselineEvents.length;
  const proposal = await selectProposalMutationTarget();
  const marker = `RT-FIN-${Date.now()}`;

  try {
    const updateResult = await admin
      .from("proposals")
      .update({ supplier: `${proposal.originalSupplier}${proposal.originalSupplier ? " " : ""}${marker}` })
      .eq("id", proposal.id);
    if (updateResult.error) throw updateResult.error;

    await poll(
      "director:finance_realtime_refresh",
      async () => {
        const events = ((await getObservabilityEvents(page)) as RuntimeEvent[]).slice(baselineCount);
        return events.some(
          (event) =>
            event.screen === "director" &&
            event.surface === "finance_realtime" &&
            (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
        )
          ? events
          : null;
      },
      45_000,
      250,
    );

    await poll(
      "director:finance_canonical_fetch_after_realtime",
      async () => {
        const events = ((await getObservabilityEvents(page)) as RuntimeEvent[]).slice(baselineCount);
        return events.some(isFinanceFetchEvent) ? events : null;
      },
      45_000,
      250,
    );
    await waitForStableEvents(page, baselineCount);
  } finally {
    await admin.from("proposals").update({ supplier: proposal.originalSupplier }).eq("id", proposal.id);
  }

  const events = ((await getObservabilityEvents(page)) as RuntimeEvent[]).slice(baselineCount);
  const windowEvents = sliceRealtimeWindow(events, "finance_realtime");
  const body = await readBodyText(page);
  const fetchCountAfterRealtime = countEvents(windowEvents, isFinanceFetchEvent);
  const smoke: ScopeSmoke = {
    scope: "finance",
    status: "failed",
    channelName: DIRECTOR_FINANCE_REALTIME_CHANNEL_NAME,
    bindings: DIRECTOR_FINANCE_REALTIME_BINDINGS.map((binding) => ({
      key: binding.key,
      table: binding.table,
      event: binding.event,
      filter: binding.filter ?? null,
    })),
    subscriptionStarted:
      findEvent(
        baselineEvents,
        (event) =>
          event.screen === "director" &&
          event.surface === "finance_realtime" &&
          event.event === "subscription_started",
      ) != null,
    subscriptionConnected:
      findEvent(
        baselineEvents,
        (event) =>
          event.screen === "director" &&
          event.surface === "finance_realtime" &&
          event.event === "subscription_connected",
      ) != null,
    eventReceived:
      findEvent(
        events,
        (event) =>
          event.screen === "director" &&
          event.surface === "finance_realtime" &&
          event.event === "realtime_event_received",
      ) != null,
    refreshTriggered:
      findEvent(
        events,
        (event) =>
          event.screen === "director" &&
          event.surface === "finance_realtime" &&
          event.event === "realtime_refresh_triggered",
      ) != null,
    canonicalFetchPreserved: findEvent(windowEvents, isFinanceFetchEvent) != null,
    uiSurfaceReady: hasAnyLabel(body, DIRECTOR_FINANCE_SURFACE_MARKERS),
    noCrossScopeReload: findEvent(windowEvents, isReportsFetchEvent) == null,
    doubleFetchDetected: fetchCountAfterRealtime > 1,
    coalescedObserved:
      findEvent(
        events,
        (event) =>
          event.screen === "director" &&
          event.surface === "finance_realtime" &&
          event.event === "realtime_refresh_coalesced",
      ) != null,
    fetchCountAfterRealtime,
    failureStage: "unknown",
  };
  smoke.status =
    smoke.subscriptionStarted &&
    smoke.subscriptionConnected &&
    smoke.eventReceived &&
    smoke.refreshTriggered &&
    smoke.canonicalFetchPreserved &&
    smoke.uiSurfaceReady &&
    smoke.noCrossScopeReload &&
    !smoke.doubleFetchDetected
      ? "passed"
      : "failed";
  smoke.failureStage = !smoke.subscriptionStarted
    ? "subscribe_failed"
    : !smoke.subscriptionConnected
      ? "subscription_not_connected"
    : !smoke.eventReceived
      ? "event_not_received"
      : !smoke.refreshTriggered
        ? "refresh_not_triggered"
        : !smoke.canonicalFetchPreserved
          ? "canonical_fetch_missing"
          : !smoke.noCrossScopeReload
            ? "cross_scope_reload_detected"
            : !smoke.uiSurfaceReady
              ? "surface_not_ready"
              : smoke.doubleFetchDetected
                ? "double_fetch_detected"
                : "unknown";
  return smoke;
}

async function runReportsSmoke(page: Page): Promise<ScopeSmoke> {
  await clickDomText(page, DIRECTOR_TAB_REPORTS, { maxY: 220 });
  await poll(
    "director:reports_card_ready",
    async () => {
      const body = await readBodyText(page);
      return hasAnyLabel(body, DIRECTOR_REPORT_CARD_TITLE) ? body : null;
    },
    30_000,
    250,
  );
  await clickDomText(page, DIRECTOR_REPORT_CARD_TITLE, { exact: false, maxY: 520 });
  await poll(
    "director:reports_modal_ready",
    async () => {
      const body = await readBodyText(page);
      return hasReportsModalMarkers(body) ? body : null;
    },
    30_000,
    250,
  );
  await poll(
    "director:reports_fetch_ready",
    async () => {
      const events = (await getObservabilityEvents(page)) as RuntimeEvent[];
      return events.some(isReportsFetchEvent) ? events : null;
    },
    30_000,
    250,
  );
  const subscriptionStartedEvents = await poll(
    "director:reports_subscription_started",
    async () => {
      const events = (await getObservabilityEvents(page)) as RuntimeEvent[];
      return events.some(
        (event) =>
          event.screen === "director" &&
          event.surface === "reports_realtime" &&
          event.event === "subscription_started" &&
          String(event.extra?.channelName ?? "") === DIRECTOR_REPORTS_REALTIME_CHANNEL_NAME,
      )
        ? events
        : null;
    },
    30_000,
    250,
  );
  const subscriptionConnectedEvents = await poll(
    "director:reports_subscription_connected",
    async () => {
      const events = (await getObservabilityEvents(page)) as RuntimeEvent[];
      return events.some(
        (event) =>
          event.screen === "director" &&
          event.surface === "reports_realtime" &&
          event.event === "subscription_connected" &&
          String(event.extra?.channelName ?? "") === DIRECTOR_REPORTS_REALTIME_CHANNEL_NAME,
      )
        ? events
        : null;
    },
    30_000,
    250,
  );
  const baselineEvents = (subscriptionConnectedEvents as RuntimeEvent[]) ?? (subscriptionStartedEvents as RuntimeEvent[]);
  const baselineCount = baselineEvents.length;
  const requestItem = await selectReportMutationTarget();
  const marker = `RT-REP-${Date.now()}`;

  try {
    const updateResult = await admin
      .from("request_items")
      .update({ note: `${requestItem.originalNote ?? ""}${requestItem.originalNote ? " " : ""}${marker}` })
      .eq("id", requestItem.id);
    if (updateResult.error) throw updateResult.error;

    await poll(
      "director:reports_realtime_refresh",
      async () => {
        const events = ((await getObservabilityEvents(page)) as RuntimeEvent[]).slice(baselineCount);
        return events.some(
          (event) =>
            event.screen === "director" &&
            event.surface === "reports_realtime" &&
            (event.event === "realtime_event_received" || event.event === "realtime_refresh_triggered"),
        )
          ? events
          : null;
      },
      45_000,
      250,
    );

    await poll(
      "director:reports_canonical_fetch_after_realtime",
      async () => {
        const events = ((await getObservabilityEvents(page)) as RuntimeEvent[]).slice(baselineCount);
        return events.some(isReportsFetchEvent) ? events : null;
      },
      45_000,
      250,
    );
    await waitForStableEvents(page, baselineCount);
  } finally {
    await admin.from("request_items").update({ note: requestItem.originalNote }).eq("id", requestItem.id);
  }

  const events = ((await getObservabilityEvents(page)) as RuntimeEvent[]).slice(baselineCount);
  const windowEvents = sliceRealtimeWindow(events, "reports_realtime");
  const body = await readBodyText(page);
  const fetchCountAfterRealtime = countEvents(windowEvents, isReportsFetchEvent);
  const smoke: ScopeSmoke = {
    scope: "reports",
    status: "failed",
    channelName: DIRECTOR_REPORTS_REALTIME_CHANNEL_NAME,
    bindings: DIRECTOR_REPORTS_REALTIME_BINDINGS.map((binding) => ({
      key: binding.key,
      table: binding.table,
      event: binding.event,
      filter: binding.filter ?? null,
    })),
    subscriptionStarted:
      findEvent(
        baselineEvents,
        (event) =>
          event.screen === "director" &&
          event.surface === "reports_realtime" &&
          event.event === "subscription_started",
      ) != null,
    subscriptionConnected:
      findEvent(
        baselineEvents,
        (event) =>
          event.screen === "director" &&
          event.surface === "reports_realtime" &&
          event.event === "subscription_connected",
      ) != null,
    eventReceived:
      findEvent(
        events,
        (event) =>
          event.screen === "director" &&
          event.surface === "reports_realtime" &&
          event.event === "realtime_event_received",
      ) != null,
    refreshTriggered:
      findEvent(
        events,
        (event) =>
          event.screen === "director" &&
          event.surface === "reports_realtime" &&
          event.event === "realtime_refresh_triggered",
      ) != null,
    canonicalFetchPreserved: findEvent(windowEvents, isReportsFetchEvent) != null,
    uiSurfaceReady: hasReportsModalMarkers(body),
    noCrossScopeReload: findEvent(windowEvents, isFinanceFetchEvent) == null,
    doubleFetchDetected: fetchCountAfterRealtime > 1,
    coalescedObserved:
      findEvent(
        events,
        (event) =>
          event.screen === "director" &&
          event.surface === "reports_realtime" &&
          event.event === "realtime_refresh_coalesced",
      ) != null,
    fetchCountAfterRealtime,
    failureStage: "unknown",
  };
  smoke.status =
    smoke.subscriptionStarted &&
    smoke.subscriptionConnected &&
    smoke.eventReceived &&
    smoke.refreshTriggered &&
    smoke.canonicalFetchPreserved &&
    smoke.uiSurfaceReady &&
    smoke.noCrossScopeReload &&
    !smoke.doubleFetchDetected
      ? "passed"
      : "failed";
  smoke.failureStage = !smoke.subscriptionStarted
    ? "subscribe_failed"
    : !smoke.subscriptionConnected
      ? "subscription_not_connected"
    : !smoke.eventReceived
      ? "event_not_received"
      : !smoke.refreshTriggered
        ? "refresh_not_triggered"
        : !smoke.canonicalFetchPreserved
          ? "canonical_fetch_missing"
          : !smoke.noCrossScopeReload
            ? "cross_scope_reload_detected"
            : !smoke.uiSurfaceReady
              ? "surface_not_ready"
              : smoke.doubleFetchDetected
                ? "double_fetch_detected"
                : "unknown";
  return smoke;
}

async function main() {
  let user: Awaited<ReturnType<typeof createTempUser>> | null = null;
  const { browser, page, runtime } = await launchRolePage();
  let financeSmoke: ScopeSmoke | null = null;
  let reportsSmoke: ScopeSmoke | null = null;
  let observedEvents: RuntimeEvent[] = [];

  try {
    user = await createTempUser(process.env.DIRECTOR_WEB_ROLE || "director", "Director Realtime Wave3");
    await loginWithTempUser(page, "/director", user);
    await maybeConfirmFio(page, "Director Realtime Wave3");
    await page.goto("http://localhost:8081/director", { waitUntil: "networkidle" });
    await waitForDirectorHome(page);

    financeSmoke = await runFinanceSmoke(page);
    reportsSmoke = await runReportsSmoke(page);
    observedEvents = (await getObservabilityEvents(page)) as RuntimeEvent[];
  } finally {
    observedEvents = observedEvents.length ? observedEvents : (((await getObservabilityEvents(page).catch(() => [])) as RuntimeEvent[]) || []);
    await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }

  const blockingConsoleErrors = runtime.console.filter((entry) => hasBlockingConsoleErrors([entry]));
  const lifecycleLog = lifecycleLines(observedEvents);
  fs.mkdirSync(path.dirname(path.join(projectRoot, lifecycleLogPath)), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, lifecycleLogPath), `${lifecycleLog.join("\n")}\n`);

  const publicationMigrationPresent = fs.existsSync(path.join(projectRoot, publicationMigrationPath));

  writeArtifact(financeSmokePath, financeSmoke);
  writeArtifact(reportsSmokePath, reportsSmoke);

  const summary = {
    gate: "Director Realtime Wave 3 - Finance + Reports",
    status:
      financeSmoke?.status === "passed" &&
      reportsSmoke?.status === "passed" &&
      publicationMigrationPresent &&
      blockingConsoleErrors.length === 0 &&
      runtime.pageErrors.length === 0
        ? "GREEN"
        : "NOT GREEN",
    finance: financeSmoke,
    reports: reportsSmoke,
    channelsRaised: {
      finance: DIRECTOR_FINANCE_REALTIME_CHANNEL_NAME,
      reports: DIRECTOR_REPORTS_REALTIME_CHANNEL_NAME,
    },
    publicationMigrationPresent,
    lifecycleLogPath,
    consoleErrorsEmpty: blockingConsoleErrors.length === 0,
    pageErrorsEmpty: runtime.pageErrors.length === 0,
    badResponsesEmpty: runtime.badResponses.filter((entry) => !entry.url.includes("/favicon")).length === 0,
  };

  writeArtifact(summaryPath, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
