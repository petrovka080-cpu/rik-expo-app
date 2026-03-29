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

const root = process.cwd();
const artifactsDir = resolve(root, "artifacts");

const readJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(resolve(root, relativePath), "utf8")) as T;

const readText = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

const buyerAccountantRealtime = readJson<{
  status?: string;
  buyer?: { status?: string; runtimeVerified?: boolean };
  accountant?: { status?: string; runtimeVerified?: boolean };
}>("artifacts/realtime-wave1-buyer-accountant-summary.json");

const warehouseRealtime = readJson<{
  status?: string;
  warehouse?: { status?: string; runtimeVerified?: boolean };
}>("artifacts/realtime-wave2-warehouse-contractor-summary.json");

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
