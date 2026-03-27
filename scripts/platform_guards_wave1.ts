import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
  summarizePlatformObservabilityEvents,
} from "../src/lib/observability/platformObservability";
import { recordPlatformGuardSkip } from "../src/lib/observability/platformGuardDiscipline";

type CheckResult = {
  passed: boolean;
  details: Record<string, unknown>;
};

const artifactDir = path.join(process.cwd(), "artifacts");
const summaryPath = path.join(artifactDir, "platform-guards-wave1.summary.json");
const fullPath = path.join(artifactDir, "platform-guards-wave1.json");

const readSource = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

const buyerControllerSource = readSource("src/screens/buyer/hooks/useBuyerLoadingController.ts");
const accountantControllerSource = readSource("src/screens/accountant/useAccountantScreenController.ts");
const warehouseLifecycleSource = readSource("src/screens/warehouse/hooks/useWarehouseLifecycle.ts");
const warehouseExpenseSource = readSource("src/screens/warehouse/hooks/useWarehouseExpenseQueueSlice.ts");
const warehouseReqHeadsSource = readSource("src/screens/warehouse/hooks/useWarehouseReqHeads.ts");
const observabilitySource = readSource("src/lib/observability/platformObservability.ts");

const guardWiringCheck: CheckResult = {
  passed:
    buyerControllerSource.includes("recordPlatformGuardSkip") &&
    buyerControllerSource.includes("isPlatformGuardCoolingDown") &&
    accountantControllerSource.includes("recordPlatformGuardSkip") &&
    accountantControllerSource.includes("isPlatformGuardCoolingDown") &&
    warehouseLifecycleSource.includes("recordPlatformGuardSkip") &&
    warehouseLifecycleSource.includes("isPlatformGuardCoolingDown") &&
    warehouseExpenseSource.includes("recordPlatformGuardSkip") &&
    warehouseExpenseSource.includes("isPlatformGuardCoolingDown") &&
    warehouseReqHeadsSource.includes('"recent_error"'),
  details: {
    buyerGuardHelper: buyerControllerSource.includes("recordPlatformGuardSkip"),
    buyerCooldownHelper: buyerControllerSource.includes("isPlatformGuardCoolingDown"),
    accountantGuardHelper: accountantControllerSource.includes("recordPlatformGuardSkip"),
    accountantCooldownHelper: accountantControllerSource.includes("isPlatformGuardCoolingDown"),
    warehouseLifecycleGuardHelper: warehouseLifecycleSource.includes("recordPlatformGuardSkip"),
    warehouseLifecycleCooldownHelper: warehouseLifecycleSource.includes("isPlatformGuardCoolingDown"),
    warehouseExpenseGuardHelper: warehouseExpenseSource.includes("recordPlatformGuardSkip"),
    warehouseExpenseCooldownHelper: warehouseExpenseSource.includes("isPlatformGuardCoolingDown"),
    warehouseRecentErrorGuard: warehouseReqHeadsSource.includes('"recent_error"'),
  },
};

resetPlatformObservabilityEvents();
recordPlatformGuardSkip("auth_not_ready", {
  screen: "accountant",
  surface: "inbox_list",
  event: "load_inbox",
  trigger: "focus",
});
recordPlatformGuardSkip("recent_same_scope", {
  screen: "buyer",
  surface: "summary_root",
  event: "refresh_summary",
  trigger: "focus",
});
recordPlatformGuardSkip("recent_same_scope", {
  screen: "warehouse",
  surface: "screen_root",
  event: "focus_refresh",
  trigger: "focus",
});
recordPlatformGuardSkip("inactive_tab", {
  screen: "warehouse",
  surface: "req_heads",
  event: "refresh_expense_queue",
  trigger: "tab",
});
recordPlatformGuardSkip("no_more_pages", {
  screen: "warehouse",
  surface: "req_heads",
  event: "fetch_req_heads",
  trigger: "scroll",
});
recordPlatformGuardSkip("recent_error", {
  screen: "warehouse",
  surface: "req_heads",
  event: "fetch_req_heads",
  trigger: "force_refresh",
});

const summary = summarizePlatformObservabilityEvents(getPlatformObservabilityEvents());

const observabilitySummaryCheck: CheckResult = {
  passed:
    observabilitySource.includes("skippedCount") &&
    observabilitySource.includes("guardReasons") &&
    summary.skippedCount === 6 &&
    summary.guardReasons.some((entry) => entry.reason === "recent_same_scope" && entry.count === 2) &&
    summary.guardReasons.some((entry) => entry.reason === "recent_error" && entry.count === 1),
  details: {
    skippedCount: summary.skippedCount,
    guardReasons: summary.guardReasons,
    reloadEvents: summary.reloadEvents,
  },
};

const result = {
  status: [guardWiringCheck, observabilitySummaryCheck].every((check) => check.passed)
    ? "passed"
    : "failed",
  guard_wiring: guardWiringCheck,
  observability_summary: observabilitySummaryCheck,
  summary,
};

mkdirSync(artifactDir, { recursive: true });
writeFileSync(fullPath, JSON.stringify(result, null, 2));
writeFileSync(
  summaryPath,
  JSON.stringify(
    {
      status: result.status,
      buyerAligned: buyerControllerSource.includes("recordPlatformGuardSkip"),
      accountantAligned: accountantControllerSource.includes("recordPlatformGuardSkip"),
      warehouseAligned:
        warehouseLifecycleSource.includes("recordPlatformGuardSkip") &&
        warehouseExpenseSource.includes("recordPlatformGuardSkip") &&
        warehouseReqHeadsSource.includes('"recent_error"'),
      skippedCount: summary.skippedCount,
      guardReasons: summary.guardReasons,
    },
    null,
    2,
  ),
);

if (result.status !== "passed") {
  process.exitCode = 1;
}
