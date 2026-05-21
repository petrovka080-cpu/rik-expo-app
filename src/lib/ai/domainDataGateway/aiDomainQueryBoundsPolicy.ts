import type { AiDomainQuery } from "./aiDomainQueryTypes";

export type AiDomainQueryBoundsPolicyResult = {
  passed: boolean;
  failures: string[];
};

export function validateAiDomainQueryBounds(query: AiDomainQuery): AiDomainQueryBoundsPolicyResult {
  const failures: string[] = [];

  if (!query.orgId) failures.push("missing_org_scope");
  if (!query.userId) failures.push("missing_user_scope");
  if (!query.role) failures.push("missing_role_scope");
  if (query.bounds.requireOrgScope !== true) failures.push("org_scope_not_required");
  if (query.bounds.requireRoleScope !== true) failures.push("role_scope_not_required");
  if (!Number.isFinite(query.bounds.limit) || query.bounds.limit < 1) failures.push("missing_limit");
  if (query.bounds.limit > 100) failures.push("limit_too_large");
  if (!query.reasonRu) failures.push("missing_reason");

  if (query.kind === "count" && !query.bounds.requireCountQuery) {
    failures.push("count_query_not_explicit");
  }

  if (query.kind === "trace") {
    const hasTraceFilter = Boolean(
      query.filters.requestId ||
      query.filters.workId ||
      query.filters.paymentId ||
      query.filters.documentId ||
      query.filters.mediaAssetId ||
      query.filters.materialNameRu,
    );
    if (!hasTraceFilter) failures.push("trace_without_specific_entity");
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
