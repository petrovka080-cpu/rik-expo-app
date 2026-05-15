import type { AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiScreenAuditPrimaryDomain,
  AiScreenButtonActionKind,
  AiScreenMutationRisk,
  AiScreenRouteStatus,
} from "../screenAudit/aiScreenButtonRoleActionTypes";

export const AI_BFF_ROUTE_COVERAGE_WAVE =
  "S_AI_BFF_01_MISSING_ROUTE_COVERAGE_CLOSEOUT" as const;

export type AiBffRouteCoverageClassification =
  | "covered"
  | "missing_but_documented"
  | "forbidden";

export type AiBffRouteCoverageDomain =
  | "procurement"
  | "warehouse"
  | "finance"
  | "director"
  | "foreman"
  | "contractor"
  | "documents"
  | "approval"
  | "market_external_intel";

export type AiBffRouteCoverageRouteDisposition =
  | "mounted_existing"
  | "documented_missing"
  | "forbidden_no_route_allowed";

export type AiBffRouteCoverageEntry = {
  wave: typeof AI_BFF_ROUTE_COVERAGE_WAVE;
  screenId: string;
  routeStatus: AiScreenRouteStatus;
  actionId: string;
  actionKind: AiScreenButtonActionKind;
  roleScope: readonly AiUserRole[];
  auditPrimaryDomain: AiScreenAuditPrimaryDomain;
  coverageDomain: AiBffRouteCoverageDomain;
  mutationRisk: AiScreenMutationRisk;
  classification: AiBffRouteCoverageClassification;
  existingBffRoutes: readonly string[];
  mountedBffRoutes: readonly string[];
  unmountedExistingBffRoutes: readonly string[];
  documentedMissingBffRoutes: readonly string[];
  forbiddenRouteSentinels: readonly string[];
  noDirectClientAccess: boolean;
  evidenceSources: readonly string[];
  rationale: string;
};

export type AiBffDirectClientAccessFinding = {
  screenId: string;
  actionId: string;
  actionKind: AiScreenButtonActionKind;
  matchedPattern: string;
  sourceField: "currentDataSources" | "onPressHandlers";
  matchedValue: string;
};

export type AiBffRouteCoverageDomainSummary = {
  domain: AiBffRouteCoverageDomain;
  actions: number;
  covered: number;
  missingButDocumented: number;
  forbidden: number;
  documentedMissingRoutes: number;
  forbiddenRouteSentinels: number;
};

export type AiBffRouteCoverageFinalStatus =
  | "GREEN_AI_BFF_ROUTE_COVERAGE_MAP_READY"
  | "BLOCKED_AI_BFF_ROUTE_COVERAGE_INCOMPLETE"
  | "BLOCKED_AI_BFF_DIRECT_CLIENT_ACCESS_FOUND";

export type AiBffRouteCoverageSummary = {
  wave: typeof AI_BFF_ROUTE_COVERAGE_WAVE;
  finalStatus: AiBffRouteCoverageFinalStatus;
  exactReason: string | null;
  actionsAudited: number;
  safeReadActions: number;
  draftOnlyActions: number;
  approvalRequiredActions: number;
  forbiddenActions: number;
  coveredActions: number;
  missingButDocumentedActions: number;
  documentedMissingRoutes: number;
  forbiddenRouteSentinels: number;
  auditedMissingRoutes: number;
  unmountedExistingRoutes: number;
  directClientAccessFindings: number;
  actionsMissingClassification: readonly string[];
  coverageByDomain: readonly AiBffRouteCoverageDomainSummary[];
  noSecrets: true;
  noRawRows: true;
  noDbWrites: true;
  noProviderCalls: true;
  noUiChanges: true;
  noFakeGreen: true;
};
