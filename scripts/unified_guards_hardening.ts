import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  getPlatformObservabilityEvents,
  recordPlatformObservability,
  resetPlatformObservabilityEvents,
  summarizePlatformObservabilityEvents,
} from "../src/lib/observability/platformObservability";
import { recordPlatformGuardSkip } from "../src/lib/observability/platformGuardDiscipline";

type CheckResult = {
  passed: boolean;
  details: Record<string, unknown>;
};

const artifactDir = path.join(process.cwd(), "artifacts");
const summaryPath = path.join(artifactDir, "unified-guards-hardening.summary.json");
const fullPath = path.join(artifactDir, "unified-guards-hardening.json");

const readSource = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

const guardHelperSource = readSource("src/lib/observability/platformGuardDiscipline.ts");
const observabilitySource = readSource("src/lib/observability/platformObservability.ts");
const buyerSource = readSource("src/screens/buyer/hooks/useBuyerLoadingController.ts");
const accountantSource = readSource("src/screens/accountant/useAccountantScreenController.ts");
const warehouseLifecycleSource = readSource("src/screens/warehouse/hooks/useWarehouseLifecycle.ts");
const warehouseReqHeadsSource = readSource("src/screens/warehouse/hooks/useWarehouseReqHeads.ts");
const warehouseStockSource = readSource("src/screens/warehouse/hooks/useWarehouseStockData.ts");
const contractorRefreshSource = readSource("src/screens/contractor/hooks/useContractorRefreshLifecycle.ts");
const contractorScreenDataSource = readSource("src/screens/contractor/hooks/useContractorScreenData.ts");
const directorLifecycleSource = readSource("src/screens/director/director.lifecycle.ts");

const guardContractCheck: CheckResult = {
  passed:
    guardHelperSource.includes("PlatformGuardDecision") &&
    guardHelperSource.includes("createPlatformGuardDecision") &&
    guardHelperSource.includes("recordPlatformGuardDecision") &&
    guardHelperSource.includes('"network_known_offline"'),
  details: {
    decisionTypePresent: guardHelperSource.includes("PlatformGuardDecision"),
    decisionFactoryPresent: guardHelperSource.includes("createPlatformGuardDecision"),
    decisionRecorderPresent: guardHelperSource.includes("recordPlatformGuardDecision"),
    networkGuardReasonPresent: guardHelperSource.includes('"network_known_offline"'),
  },
};

const rolloutCheck: CheckResult = {
  passed:
    buyerSource.includes("getPlatformNetworkSnapshot") &&
    accountantSource.includes("getPlatformNetworkSnapshot") &&
    warehouseLifecycleSource.includes("getPlatformNetworkSnapshot") &&
    warehouseReqHeadsSource.includes("getPlatformNetworkSnapshot") &&
    warehouseStockSource.includes("getPlatformNetworkSnapshot") &&
    contractorRefreshSource.includes("recordPlatformGuardSkip") &&
    contractorRefreshSource.includes("isPlatformGuardCoolingDown") &&
    contractorScreenDataSource.includes("auth.getSession") &&
    contractorScreenDataSource.includes('"network_known_offline"') &&
    directorLifecycleSource.includes("ensureSignedIn") &&
    directorLifecycleSource.includes("recordPlatformGuardSkip") &&
    directorLifecycleSource.includes("getPlatformNetworkSnapshot") &&
    directorLifecycleSource.includes("recordPlatformObservability"),
  details: {
    buyerNetworkGuard: buyerSource.includes("getPlatformNetworkSnapshot"),
    accountantNetworkGuard: accountantSource.includes("getPlatformNetworkSnapshot"),
    warehouseLifecycleNetworkGuard: warehouseLifecycleSource.includes("getPlatformNetworkSnapshot"),
    warehouseReqHeadsNetworkGuard: warehouseReqHeadsSource.includes("getPlatformNetworkSnapshot"),
    warehouseStockNetworkGuard: warehouseStockSource.includes("getPlatformNetworkSnapshot"),
    contractorFocusGuard: contractorRefreshSource.includes("isPlatformGuardCoolingDown"),
    contractorAuthGuard: contractorScreenDataSource.includes("auth.getSession"),
    contractorNetworkGuard: contractorScreenDataSource.includes('"network_known_offline"'),
    directorAuthGuard: directorLifecycleSource.includes("ensureSignedIn"),
    directorNetworkGuard: directorLifecycleSource.includes("getPlatformNetworkSnapshot"),
    directorInflightTelemetry: directorLifecycleSource.includes("recordPlatformObservability"),
  },
};

resetPlatformObservabilityEvents();
recordPlatformGuardSkip("auth_not_ready", {
  screen: "accountant",
  surface: "inbox_list",
  event: "load_inbox",
  trigger: "focus",
});
recordPlatformGuardSkip("bootstrap_not_ready", {
  screen: "director",
  surface: "visible_scope",
  event: "refresh_scope",
  trigger: "app_active",
});
recordPlatformGuardSkip("network_known_offline", {
  screen: "buyer",
  surface: "summary_root",
  event: "refresh_summary",
  trigger: "manual",
  extra: {
    networkKnownOffline: true,
  },
});
recordPlatformGuardSkip("recent_same_scope", {
  screen: "warehouse",
  surface: "screen_root",
  event: "focus_refresh",
  trigger: "focus",
});
recordPlatformObservability({
  screen: "director",
  surface: "finance_panel",
  category: "reload",
  event: "refresh_scope",
  result: "queued_rerun",
  trigger: "app_active",
  extra: {
    scopeKey: "finance:2026-03-01:2026-03-26",
  },
});
recordPlatformObservability({
  screen: "contractor",
  surface: "screen_reload",
  category: "reload",
  event: "reload_screen",
  result: "joined_inflight",
  trigger: "manual",
  extra: {
    scopeKey: "contractor:screen_root",
  },
});

const observabilitySummary = summarizePlatformObservabilityEvents(getPlatformObservabilityEvents());

const observabilityCheck: CheckResult = {
  passed:
    observabilitySource.includes("skippedCount") &&
    observabilitySource.includes("guardReasons") &&
    observabilitySummary.skippedCount === 4 &&
    observabilitySummary.overlapCount === 2 &&
    observabilitySummary.guardReasons.some((entry) => entry.reason === "network_known_offline" && entry.count === 1) &&
    observabilitySummary.guardReasons.some((entry) => entry.reason === "bootstrap_not_ready" && entry.count === 1),
  details: {
    skippedCount: observabilitySummary.skippedCount,
    overlapCount: observabilitySummary.overlapCount,
    guardReasons: observabilitySummary.guardReasons,
  },
};

const result = {
  status: [guardContractCheck, rolloutCheck, observabilityCheck].every((check) => check.passed)
    ? "passed"
    : "failed",
  guard_contract: guardContractCheck,
  rollout: rolloutCheck,
  observability: observabilityCheck,
  summary: observabilitySummary,
};

mkdirSync(artifactDir, { recursive: true });
writeFileSync(fullPath, JSON.stringify(result, null, 2));
writeFileSync(
  summaryPath,
  JSON.stringify(
    {
      status: result.status,
      guardContractReady: guardContractCheck.passed,
      buyerAligned: buyerSource.includes("getPlatformNetworkSnapshot"),
      accountantAligned: accountantSource.includes("getPlatformNetworkSnapshot"),
      warehouseAligned:
        warehouseLifecycleSource.includes("getPlatformNetworkSnapshot") &&
        warehouseReqHeadsSource.includes("getPlatformNetworkSnapshot") &&
        warehouseStockSource.includes("getPlatformNetworkSnapshot"),
      contractorAligned:
        contractorRefreshSource.includes("recordPlatformGuardSkip") &&
        contractorScreenDataSource.includes("auth.getSession"),
      directorAligned:
        directorLifecycleSource.includes("recordPlatformGuardSkip") &&
        directorLifecycleSource.includes("getPlatformNetworkSnapshot"),
      skippedCount: observabilitySummary.skippedCount,
      overlapCount: observabilitySummary.overlapCount,
      guardReasons: observabilitySummary.guardReasons,
    },
    null,
    2,
  ),
);

if (result.status !== "passed") {
  process.exitCode = 1;
}
