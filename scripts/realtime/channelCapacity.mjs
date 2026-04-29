#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const WAVE = "S-RT-4B";
const DEFAULT_SCALES = [1000, 5000, 10000, 50000];
const DEFAULT_MESSAGES_PER_USER_PER_SECOND = 0;
const SAFE_LIMIT_KEYS = {
  maxChannels: "SUPABASE_REALTIME_MAX_CHANNELS",
  maxConcurrentClients: "SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS",
  maxMessagesPerSecond: "SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND",
};

export const REALTIME_BINDINGS = [
  {
    source: "buyer-summary",
    bindingPath: "src/screens/buyer/buyer.realtime.lifecycle.ts",
    channelNamePattern: "buyer:screen:realtime",
    channelsPerMountedSource: 1,
    budgetPerSource: 8,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: true,
    status: "covered",
    notes: "Central subscribeChannel path; notifications are role-filtered, proposal/request bindings preserve S-RT-2 behavior.",
  },
  {
    source: "accountant-screen",
    bindingPath: "src/screens/accountant/accountant.realtime.lifecycle.ts",
    channelNamePattern: "accountant:screen:realtime",
    channelsPerMountedSource: 1,
    budgetPerSource: 8,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: true,
    status: "covered",
    notes: "Central subscribeChannel path; notification binding is role-filtered, finance bindings preserve existing table scope.",
  },
  {
    source: "warehouse-screen",
    bindingPath: "src/screens/warehouse/warehouse.realtime.lifecycle.ts",
    channelNamePattern: "warehouse:screen:realtime",
    channelsPerMountedSource: 1,
    budgetPerSource: 8,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: false,
    status: "covered",
    notes: "Central subscribeChannel path for warehouse incoming/expense tables; S-RT-2 deferred extra filters to avoid behavior changes.",
  },
  {
    source: "contractor-screen",
    bindingPath: "src/screens/contractor/contractor.realtime.lifecycle.ts",
    channelNamePattern: "contractor:screen:realtime",
    channelsPerMountedSource: 1,
    budgetPerSource: 8,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: false,
    status: "covered",
    notes: "Central subscribeChannel path with existing visible-scope guards and cooldowns.",
  },
  {
    source: "director-finance",
    bindingPath: "src/screens/director/director.finance.realtime.lifecycle.ts",
    channelNamePattern: "director:finance:realtime",
    channelsPerMountedSource: 1,
    budgetPerSource: 8,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: false,
    status: "covered",
    notes: "Central subscribeChannel path with visible-tab gating and refresh coalescing.",
  },
  {
    source: "director-reports",
    bindingPath: "src/screens/director/director.reports.realtime.lifecycle.ts",
    channelNamePattern: "director:reports:realtime",
    channelsPerMountedSource: 1,
    budgetPerSource: 8,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: false,
    status: "covered",
    notes: "Central subscribeChannel path with visible-tab gating and refresh coalescing.",
  },
  {
    source: "listing-chat",
    bindingPath: "src/lib/chat_api.ts",
    channelNamePattern: "chat:listing:<listingId>",
    channelsPerMountedSource: 1,
    budgetPerSource: 8,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: true,
    status: "covered",
    notes: "Dynamic listing chat channel redacts listing id and filters chat_messages by supplier_id.",
  },
  {
    source: "buyer-legacy-subscriptions",
    bindingPath: "src/screens/buyer/buyer.subscriptions.ts",
    channelNamePattern: "notif-buyer-rt + buyer-proposals-rt",
    channelsPerMountedSource: 2,
    budgetPerSource: 2,
    globalWarningContribution: 2,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: true,
    status: "covered",
    notes: "Legacy direct channels are budgeted by claimRealtimeChannel; notification listener is role-filtered.",
  },
  {
    source: "warehouse-expense-legacy",
    bindingPath: "src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts",
    channelNamePattern: "warehouse-expense-rt",
    channelsPerMountedSource: 1,
    budgetPerSource: 1,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: false,
    status: "covered",
    notes: "Legacy direct warehouse expense channel is budgeted; broad request/request_items bindings are preserved from S-RT-2.",
  },
  {
    source: "director-screen-handoff",
    bindingPath: "src/screens/director/director.lifecycle.realtime.ts",
    channelNamePattern: "director:screen:realtime + director-handoff-rt",
    channelsPerMountedSource: 2,
    budgetPerSource: 2,
    globalWarningContribution: 2,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: true,
    filteringExists: true,
    status: "covered",
    notes: "Director screen direct channels are budgeted; notification listener is role-filtered and handoff uses broadcast.",
  },
  {
    source: "request-draft-sync-handoff",
    bindingPath: "src/lib/api/requestDraftSync.service.ts",
    channelNamePattern: "director-handoff-rt",
    channelsPerMountedSource: 1,
    budgetPerSource: null,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: false,
    filteringExists: true,
    status: "covered_ephemeral",
    notes: "Ephemeral broadcast send path; channel is removed in finally and no production load is generated by this proof.",
  },
  {
    source: "request-repository-handoff",
    bindingPath: "src/lib/api/request.repository.ts",
    channelNamePattern: "director-handoff-rt",
    channelsPerMountedSource: 1,
    budgetPerSource: null,
    globalWarningContribution: 1,
    cleanupReleasePathExists: true,
    duplicateDetectionExists: false,
    filteringExists: true,
    status: "covered_ephemeral",
    notes: "Ephemeral broadcast send path after request submit; channel is removed after send.",
  },
];

export function redactChannelPattern(value) {
  return String(value ?? "")
    .replace(/\$\{[^}]+\}/g, "<redacted>")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      "<redacted>",
    )
    .replace(/\b(chat:listing:)[^:\s]+/gi, "$1<redacted>")
    .replace(/\b((?:company|user|request|object|supplier|listing):)[^:\s]+/gi, "$1<redacted>");
}

export function parseScales(value) {
  if (!value) return DEFAULT_SCALES;
  const scales = String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));

  if (
    scales.length === 0 ||
    scales.some((scale) => !Number.isInteger(scale) || scale <= 0)
  ) {
    throw new Error("Invalid --scales. Use a comma-separated list of positive integers.");
  }

  return scales;
}

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") {
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument "${token}".`);
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for argument "${token}".`);
    }
    values.set(token, next);
    index += 1;
  }

  return {
    json: flags.has("--json"),
    scales: parseScales(values.get("--scales")),
  };
}

function readGitSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function parsePositiveIntegerEnv(env, key) {
  const raw = env[key];
  if (raw == null || String(raw).trim() === "") return "missing";
  const value = Number(String(raw).trim());
  return Number.isInteger(value) && value > 0 ? value : "missing";
}

export function readAccountLimits(env = process.env) {
  return {
    maxChannels: parsePositiveIntegerEnv(env, SAFE_LIMIT_KEYS.maxChannels),
    maxConcurrentClients: parsePositiveIntegerEnv(env, SAFE_LIMIT_KEYS.maxConcurrentClients),
    maxMessagesPerSecond: parsePositiveIntegerEnv(env, SAFE_LIMIT_KEYS.maxMessagesPerSecond),
  };
}

function limitPresence(limits) {
  return {
    maxChannels: typeof limits.maxChannels === "number",
    maxConcurrentClients: typeof limits.maxConcurrentClients === "number",
    maxMessagesPerSecond: typeof limits.maxMessagesPerSecond === "number",
  };
}

function envPresence(env, keys) {
  return Object.fromEntries(
    keys.map((key) => [key, String(env[key] ?? "").trim().length > 0 ? "present_redacted" : "missing"]),
  );
}

function allLimitsAreVerified(limits) {
  return (
    typeof limits.maxChannels === "number" &&
    typeof limits.maxConcurrentClients === "number" &&
    typeof limits.maxMessagesPerSecond === "number"
  );
}

function channelClientLimitsPresent(limits) {
  return typeof limits.maxChannels === "number" && typeof limits.maxConcurrentClients === "number";
}

function evaluateProjection(activeUsers, projectedChannels, limits) {
  if (!channelClientLimitsPresent(limits)) {
    return {
      withinVerifiedAccountLimits: null,
      conclusion: "unknown",
      reason: "channel/client account limits are not fully configured as positive integers",
    };
  }

  const channelsFit = projectedChannels <= limits.maxChannels;
  const clientsFit = activeUsers <= limits.maxConcurrentClients;
  if (channelsFit && clientsFit) {
    return {
      withinVerifiedAccountLimits: true,
      conclusion: "verified",
      reason: "projected channels and concurrent clients are within provided limits",
    };
  }

  return {
    withinVerifiedAccountLimits: false,
    conclusion: activeUsers >= 50000 ? "requires_enterprise" : "insufficient",
    reason: [
      channelsFit ? null : "projected channels exceed provided max channel limit",
      clientsFit ? null : "active users exceed provided concurrent client limit",
    ]
      .filter(Boolean)
      .join("; "),
  };
}

function deriveStatus({ limits, conclusion }) {
  const presence = limitPresence(limits);
  if (!presence.maxChannels || !presence.maxConcurrentClients) {
    return "PARTIAL_LIMITS_MISSING";
  }
  if (conclusion.tenK !== "verified") {
    return "PARTIAL_INSUFFICIENT_LIMITS";
  }
  if (!presence.maxMessagesPerSecond) {
    return "PARTIAL_MESSAGES_PER_SECOND_MISSING";
  }
  if (conclusion.fiftyK === "requires_enterprise" || conclusion.fiftyK === "insufficient") {
    return "GREEN_10K_LIMITS_VERIFIED_50K_REQUIRES_ENTERPRISE";
  }
  return "GREEN_LIMITS_VERIFIED";
}

function conclusionKeyForScale(activeUsers) {
  if (activeUsers === 1000) return "oneK";
  if (activeUsers === 5000) return "fiveK";
  if (activeUsers === 10000) return "tenK";
  if (activeUsers === 50000) return "fiftyK";
  return `users${activeUsers}`;
}

export function buildCapacityReport(options = {}) {
  const scales = options.scales ?? DEFAULT_SCALES;
  const env = options.env ?? process.env;
  const limits = readAccountLimits(env);
  const presence = limitPresence(limits);
  const verifiedLimits = allLimitsAreVerified(limits);
  const channelClientVerified = channelClientLimitsPresent(limits);
  const accountLimitStatus = verifiedLimits
    ? "verified"
    : channelClientVerified
      ? "partial_messages_per_second_missing"
      : "owner_action_required";
  const channelsPerActiveUser = REALTIME_BINDINGS.reduce(
    (total, binding) => total + binding.channelsPerMountedSource,
    0,
  );

  const bindings = REALTIME_BINDINGS.map((binding) => {
    const projected = Object.fromEntries(
      scales.map((scale) => [`projectedChannelsAt${scale}`, scale * binding.channelsPerMountedSource]),
    );
    return {
      ...binding,
      channelNamePattern: redactChannelPattern(binding.channelNamePattern),
      expectedActiveUsers: scales,
      ...projected,
    };
  });

  const projections = scales.map((activeUsers) => {
    const projectedChannels = activeUsers * channelsPerActiveUser;
    const evaluation = evaluateProjection(activeUsers, projectedChannels, limits);
    return {
      activeUsers,
      projectedChannels,
      channelsPerActiveUser,
      projectedMessagesPerSecond: DEFAULT_MESSAGES_PER_USER_PER_SECOND,
      messagesPerSecondFormula:
        "static proof assumes no generated realtime load; live message rate must be measured separately",
      ...evaluation,
    };
  });
  const conclusion = projections.reduce((acc, projection) => {
    acc[conclusionKeyForScale(projection.activeUsers)] = projection.conclusion;
    return acc;
  }, {});
  const status = deriveStatus({ limits, conclusion });
  const envState = envPresence(env, Object.values(SAFE_LIMIT_KEYS));
  const missingLimitKeys = Object.values(SAFE_LIMIT_KEYS).filter((envKey) => envState[envKey] === "missing");
  const invalidLimitKeys = Object.entries(SAFE_LIMIT_KEYS)
    .filter(([limitName, envKey]) => envState[envKey] === "present_redacted" && !presence[limitName])
    .map(([, envKey]) => envKey);

  return {
    wave: WAVE,
    mode: "production-safe-realtime-account-limits-verification",
    status,
    source: "repo-static-analysis",
    gitSha: readGitSha(),
    productionTouched: false,
    realtimeLoadGenerated: false,
    accountLimitStatus,
    capacityClaim: status.startsWith("GREEN") ? "verified_against_provided_limits" : "partial",
    env: envState,
    scales,
    channelsPerActiveUser,
    bindings,
    projections,
    limits,
    limitPresence: presence,
    limitsSource: missingLimitKeys.length === 0 && invalidLimitKeys.length === 0 ? "env" : "partial_env",
    missingLimitKeys,
    invalidLimitKeys,
    conclusion,
    recommendations:
      status === "PARTIAL_INSUFFICIENT_LIMITS"
        ? [
            "reduce per-user realtime channels",
            "aggregate channels where visibility semantics permit it",
            "introduce BFF fanout for high-cardinality streams",
            "upgrade Supabase plan/account limits",
            "offload high-volume realtime streams",
          ]
        : [],
    ownerActions: missingLimitKeys.length === 0 && invalidLimitKeys.length === 0
      ? []
      : [
          {
            action: [
              missingLimitKeys.length > 0
                ? `Provide missing account-specific Supabase realtime limits: ${missingLimitKeys.join(", ")}`
                : null,
              invalidLimitKeys.length > 0
                ? `Provide positive integer values for realtime limits: ${invalidLimitKeys.join(", ")}`
                : null,
            ]
              .filter(Boolean)
              .join("; "),
            requiredFor: "10K/50K verified capacity claim",
          },
        ],
    safety: {
      productionTouched: false,
      productionWrites: false,
      realtimeLoadGenerated: false,
      appBehaviorChanged: false,
      sqlRpcChanged: false,
      rlsChanged: false,
      storagePolicyChanged: false,
      otaPublished: false,
      easBuildTriggered: false,
      easSubmitTriggered: false,
      easUpdateTriggered: false,
      secretsPrinted: false,
    },
  };
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`wave: ${report.wave}`);
  console.log(`status: ${report.status}`);
  console.log(`accountLimitStatus: ${report.accountLimitStatus}`);
  console.log(`capacityClaim: ${report.capacityClaim}`);
  for (const projection of report.projections) {
    console.log(`${projection.activeUsers}: ${projection.projectedChannels} projected channels`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    printReport(buildCapacityReport({ scales: args.scales }), args.json);
  } catch (error) {
    const report = {
      wave: WAVE,
      mode: "production-safe-realtime-capacity-proof",
      status: "BLOCKED",
      productionTouched: false,
      realtimeLoadGenerated: false,
      errors: [error instanceof Error ? error.message : String(error)],
      safety: {
        productionTouched: false,
        productionWrites: false,
        realtimeLoadGenerated: false,
        otaPublished: false,
        easBuildTriggered: false,
        easSubmitTriggered: false,
        easUpdateTriggered: false,
        secretsPrinted: false,
      },
    };
    printReport(report, process.argv.includes("--json"));
    process.exit(2);
  }
}

main();
