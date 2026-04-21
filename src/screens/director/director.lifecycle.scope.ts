import { isProposalDirectorVisibleRow } from "../../lib/api/proposals";
import { REQUEST_PENDING_EN, REQUEST_PENDING_STATUS, normalizeStatus } from "../../lib/api/requests.status";

import type { DirectorLifecycleScopeSnapshot } from "./director.lifecycle.contract";

export const DIRECTOR_TAB_REQUESTS = "\u0417\u0430\u044f\u0432\u043a\u0438";
export const DIRECTOR_TAB_FINANCE = "\u0424\u0438\u043d\u0430\u043d\u0441\u044b";
export const DIRECTOR_TAB_REPORTS = "\u041e\u0442\u0447\u0451\u0442\u044b";
export const DIRECTOR_REQUEST_TAB_BUYER = "buyer";
export const DIRECTOR_LIFECYCLE_REFRESH_MIN_INTERVAL_MS = 1200;
export const DIRECTOR_WEB_RESUME_MIN_INTERVAL_MS = 750;

const DIRECTOR_LIVE_REQUEST_STATUSES = new Set([
  normalizeStatus(REQUEST_PENDING_STATUS),
  normalizeStatus(REQUEST_PENDING_EN),
]);

const DIRECTOR_LIVE_ITEM_STATUSES = new Set([
  normalizeStatus(REQUEST_PENDING_STATUS),
  normalizeStatus("\u0423 \u0434\u0438\u0440\u0435\u043a\u0442\u043e\u0440\u0430"),
  normalizeStatus(REQUEST_PENDING_EN),
]);

export type DirectorVisibleRefreshPlan =
  | { kind: "request_props"; reason: string; force: boolean }
  | { kind: "request_rows"; reason: string; force: boolean }
  | { kind: "finance"; reason: string }
  | { kind: "reports"; reason: string }
  | { kind: "none" };

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const getRecordValue = (value: unknown, key: string): unknown => asRecord(value)?.[key] ?? null;

export const getOptionalRecordString = (value: unknown, key: string): string | undefined => {
  const entry = getRecordValue(value, key);
  return typeof entry === "string" ? entry : undefined;
};

export const buildRequestsScopeKey = (requestTab: string) => `${DIRECTOR_TAB_REQUESTS}:${requestTab}`;

export const buildDirectorRowsScopeKey = (requestTab: string) => `requests:${requestTab}:rows`;

export const buildDirectorPropsScopeKey = (requestTab: string) => `requests:${requestTab}:buyer_props`;

export const buildDirectorFinanceScopeKey = (finFrom: string | null, finTo: string | null) =>
  `finance:${finFrom ?? ""}:${finTo ?? ""}`;

export const buildDirectorReportsScopeKey = (repFrom: string | null, repTo: string | null) =>
  `reports:${repFrom ?? ""}:${repTo ?? ""}`;

export const buildDirectorPeriodKey = (
  scope: Pick<DirectorLifecycleScopeSnapshot, "finFrom" | "finTo" | "repFrom" | "repTo">,
) => `${scope.finFrom}-${scope.finTo}-${scope.repFrom}-${scope.repTo}`;

export const buildDirectorVisibleScopeKey = (scope: Pick<DirectorLifecycleScopeSnapshot, "dirTab" | "requestTab">) =>
  scope.dirTab === DIRECTOR_TAB_REQUESTS ? buildRequestsScopeKey(scope.requestTab) : scope.dirTab;

export const resolveDirectorVisibleRefreshPlan = (
  scope: Pick<DirectorLifecycleScopeSnapshot, "dirTab" | "requestTab">,
  reasonBase: string,
  force = false,
): DirectorVisibleRefreshPlan => {
  if (scope.dirTab === DIRECTOR_TAB_REQUESTS) {
    if (scope.requestTab === DIRECTOR_REQUEST_TAB_BUYER) {
      return {
        kind: "request_props",
        reason: `${reasonBase}:requests:buyer`,
        force,
      };
    }

    return {
      kind: "request_rows",
      reason: `${reasonBase}:requests:foreman`,
      force,
    };
  }

  if (scope.dirTab === DIRECTOR_TAB_FINANCE) {
    return {
      kind: "finance",
      reason: `${reasonBase}:finance`,
    };
  }

  if (scope.dirTab === DIRECTOR_TAB_REPORTS) {
    return {
      kind: "reports",
      reason: `${reasonBase}:reports`,
    };
  }

  return { kind: "none" };
};

type DirectorRealtimePayload = {
  new?: unknown;
  old?: unknown;
};

export const shouldRefreshDirectorRowsForRequestChange = (payload: DirectorRealtimePayload) => {
  const nextStatus = normalizeStatus(getRecordValue(payload.new, "status"));
  const prevStatus = normalizeStatus(getRecordValue(payload.old, "status"));
  const nextSubmittedAt = String(getRecordValue(payload.new, "submitted_at") ?? "").trim();
  const prevSubmittedAt = String(getRecordValue(payload.old, "submitted_at") ?? "").trim();
  return (
    !!nextSubmittedAt ||
    !!prevSubmittedAt ||
    DIRECTOR_LIVE_REQUEST_STATUSES.has(nextStatus) ||
    DIRECTOR_LIVE_REQUEST_STATUSES.has(prevStatus)
  );
};

export const shouldRefreshDirectorRowsForItemChange = (payload: DirectorRealtimePayload) => {
  const nextStatus = normalizeStatus(getRecordValue(payload.new, "status"));
  const prevStatus = normalizeStatus(getRecordValue(payload.old, "status"));
  return DIRECTOR_LIVE_ITEM_STATUSES.has(nextStatus) || DIRECTOR_LIVE_ITEM_STATUSES.has(prevStatus);
};

const asProposalVisibilityRow = (value: unknown) => {
  const record = asRecord(value);
  if (!record) return null;
  return {
    status: record.status,
    submitted_at: record.submitted_at,
    sent_to_accountant_at: record.sent_to_accountant_at,
  };
};

export const shouldRefreshDirectorPropsForProposalChange = (payload: DirectorRealtimePayload) => {
  const nextVisible = isProposalDirectorVisibleRow(asProposalVisibilityRow(payload.new));
  const prevVisible = isProposalDirectorVisibleRow(asProposalVisibilityRow(payload.old));
  if (nextVisible || prevVisible) return true;
  const nextSubmittedAt = String(getRecordValue(payload.new, "submitted_at") ?? "").trim();
  const prevSubmittedAt = String(getRecordValue(payload.old, "submitted_at") ?? "").trim();
  return !!nextSubmittedAt || !!prevSubmittedAt;
};
