import { recordPlatformObservability } from "../observability/platformObservability";

export type RealtimeScope = "buyer" | "accountant" | "warehouse" | "contractor" | "director";
type RealtimeBudgetScreen = RealtimeScope | "market";

export type RealtimeChannelBinding = {
  key: string;
  table: string;
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  schema?: "public";
  owner: string;
};

export const BUYER_REALTIME_CHANNEL_NAME = "buyer:screen:realtime";
export const ACCOUNTANT_REALTIME_CHANNEL_NAME = "accountant:screen:realtime";
export const WAREHOUSE_REALTIME_CHANNEL_NAME = "warehouse:screen:realtime";
export const CONTRACTOR_REALTIME_CHANNEL_NAME = "contractor:screen:realtime";
export const DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME = "director:screen:realtime";
export const DIRECTOR_FINANCE_REALTIME_CHANNEL_NAME = "director:finance:realtime";
export const DIRECTOR_REPORTS_REALTIME_CHANNEL_NAME = "director:reports:realtime";
export const DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME = DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME;
export const DIRECTOR_HANDOFF_BROADCAST_EVENT = "foreman_request_submitted";

export type RealtimeChannelBudgetOptions = {
  key: string;
  source: string;
  screen: RealtimeBudgetScreen;
  surface: string;
  route?: string;
  maxChannelsForSource?: number;
  log?: boolean;
};

export type RealtimeBudgetClaim =
  | { status: "claimed"; release: () => void }
  | { status: "duplicate"; release: () => void }
  | { status: "over_budget"; release: () => void };

type ActiveBudgetEntry = {
  source: string;
};

export const DEFAULT_REALTIME_SOURCE_CHANNEL_BUDGET = 2;
export const REALTIME_GLOBAL_CHANNEL_WARNING_THRESHOLD = 10;

const activeBudgetEntries = new Map<string, ActiveBudgetEntry>();

const recordBudgetSignal = (
  options: RealtimeChannelBudgetOptions,
  status: RealtimeBudgetClaim["status"],
  activeForSource: number,
) => {
  if (options.log === false || status === "claimed") return;

  recordPlatformObservability({
    screen: options.screen,
    surface: options.surface,
    category: "reload",
    event:
      status === "duplicate"
        ? "realtime_channel_duplicate_detected"
        : "realtime_channel_budget_warning",
    result: status === "duplicate" ? "skipped" : "error",
    trigger: "realtime",
    sourceKind: "supabase:realtime",
    extra: {
      key: options.key,
      source: options.source,
      route: options.route ?? null,
      activeForSource,
      maxChannelsForSource:
        options.maxChannelsForSource ?? DEFAULT_REALTIME_SOURCE_CHANNEL_BUDGET,
      activeTotal: activeBudgetEntries.size,
      globalWarningThreshold: REALTIME_GLOBAL_CHANNEL_WARNING_THRESHOLD,
      owner: "realtime_channel_budget",
    },
  });
};

export function claimRealtimeChannel(options: RealtimeChannelBudgetOptions): RealtimeBudgetClaim {
  const existing = activeBudgetEntries.get(options.key);
  const activeForSource = [...activeBudgetEntries.values()].filter(
    (entry) => entry.source === options.source,
  ).length;

  if (existing) {
    recordBudgetSignal(options, "duplicate", activeForSource);
    return {
      status: "duplicate",
      release: () => undefined,
    };
  }

  const maxChannelsForSource =
    options.maxChannelsForSource ?? DEFAULT_REALTIME_SOURCE_CHANNEL_BUDGET;
  const status: RealtimeBudgetClaim["status"] =
    activeForSource >= maxChannelsForSource ? "over_budget" : "claimed";

  activeBudgetEntries.set(options.key, {
    source: options.source,
  });
  recordBudgetSignal(options, status, activeForSource + 1);

  let released = false;
  return {
    status,
    release: () => {
      if (released) return;
      released = true;
      const current = activeBudgetEntries.get(options.key);
      if (current?.source === options.source) {
        activeBudgetEntries.delete(options.key);
      }
    },
  };
}

export function getRealtimeBudgetSnapshot() {
  return {
    activeCount: activeBudgetEntries.size,
    activeKeys: [...activeBudgetEntries.keys()].sort(),
    activeSources: [...activeBudgetEntries.values()]
      .map((entry) => entry.source)
      .sort(),
  };
}

export function resetRealtimeBudgetForTests() {
  activeBudgetEntries.clear();
}

export const BUYER_REALTIME_BINDINGS: readonly RealtimeChannelBinding[] = [
  {
    key: "buyer_notifications",
    table: "notifications",
    event: "INSERT",
    filter: "role=eq.buyer",
    schema: "public",
    owner: "table:notifications",
  },
  {
    key: "buyer_requests_approved",
    table: "requests",
    event: "UPDATE",
    schema: "public",
    owner: "table:requests",
  },
  {
    key: "buyer_proposals_terminal",
    table: "proposals",
    event: "UPDATE",
    schema: "public",
    owner: "table:proposals",
  },
];

export const ACCOUNTANT_REALTIME_BINDINGS: readonly RealtimeChannelBinding[] = [
  {
    key: "accountant_notifications",
    table: "notifications",
    event: "INSERT",
    filter: "role=eq.accountant",
    schema: "public",
    owner: "table:notifications",
  },
  {
    key: "accountant_proposals_sent",
    table: "proposals",
    event: "UPDATE",
    schema: "public",
    owner: "table:proposals",
  },
  {
    key: "accountant_payments_created",
    table: "proposal_payments",
    event: "INSERT",
    schema: "public",
    owner: "table:proposal_payments",
  },
  {
    key: "accountant_payments_updated",
    table: "proposal_payments",
    event: "UPDATE",
    schema: "public",
    owner: "table:proposal_payments",
  },
];

export const WAREHOUSE_REALTIME_BINDINGS: readonly RealtimeChannelBinding[] = [
  {
    key: "warehouse_incoming_items",
    table: "wh_incoming_items",
    event: "*",
    schema: "public",
    owner: "table:wh_incoming_items",
  },
  {
    key: "warehouse_requests",
    table: "requests",
    event: "*",
    schema: "public",
    owner: "table:requests",
  },
  {
    key: "warehouse_request_items",
    table: "request_items",
    event: "*",
    schema: "public",
    owner: "table:request_items",
  },
];

export const CONTRACTOR_REALTIME_BINDINGS: readonly RealtimeChannelBinding[] = [
  {
    key: "contractor_work_progress",
    table: "work_progress",
    event: "*",
    schema: "public",
    owner: "table:work_progress",
  },
  {
    key: "contractor_requests",
    table: "requests",
    event: "*",
    schema: "public",
    owner: "table:requests",
  },
  {
    key: "contractor_request_items",
    table: "request_items",
    event: "*",
    schema: "public",
    owner: "table:request_items",
  },
  {
    key: "contractor_purchase_items",
    table: "purchase_items",
    event: "*",
    schema: "public",
    owner: "table:purchase_items",
  },
  {
    key: "contractor_subcontracts",
    table: "subcontracts",
    event: "*",
    schema: "public",
    owner: "table:subcontracts",
  },
  {
    key: "contractor_registry",
    table: "contractors",
    event: "*",
    schema: "public",
    owner: "table:contractors",
  },
];

export const DIRECTOR_FINANCE_REALTIME_BINDINGS: readonly RealtimeChannelBinding[] = [
  {
    key: "director_finance_proposals",
    table: "proposals",
    event: "*",
    schema: "public",
    owner: "table:proposals",
  },
  {
    key: "director_finance_request_items",
    table: "request_items",
    event: "*",
    schema: "public",
    owner: "table:request_items",
  },
];

export const DIRECTOR_REPORTS_REALTIME_BINDINGS: readonly RealtimeChannelBinding[] = [
  {
    key: "director_reports_requests",
    table: "requests",
    event: "*",
    schema: "public",
    owner: "table:requests",
  },
  {
    key: "director_reports_request_items",
    table: "request_items",
    event: "*",
    schema: "public",
    owner: "table:request_items",
  },
];
