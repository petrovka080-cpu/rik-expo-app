import {
  getRateEnforcementPolicy,
  getSupabaseRpcRateLimitPolicy,
  type RateEnforcementPolicy,
  type RateLimitEnforcementOperation,
  type SupabaseRpcRateLimitClassification,
  type SupabaseRpcRateLimitPolicy,
} from "../../shared/scale/rateLimitPolicies";

export type RpcRuntimePolicyClass =
  | "list_like_read"
  | "detail_read"
  | "scalar_status"
  | "mutation_requires_approval"
  | "internal_job"
  | "dynamic_boundary"
  | "admin_forbidden";

export type RpcRuntimeLimit = {
  concurrency: number;
  windowMs: number;
  maxRequests: number;
  cooldownMs: number;
};

export type SupabaseRpcRuntimePolicy = {
  rpcName: string;
  classification: SupabaseRpcRateLimitClassification | "admin_forbidden";
  runtimeClass: RpcRuntimePolicyClass;
  rateEnforcementOperation: RateLimitEnforcementOperation | null;
  sourcePolicy: SupabaseRpcRateLimitPolicy | null;
  enforcementPolicy: RateEnforcementPolicy | null;
  boundedArgsRequired: boolean;
  boundedArgsSatisfied: boolean;
  runtimeEnforcementEnabled: true;
  blocked: boolean;
  limit: RpcRuntimeLimit;
  reason: string;
};

const MINUTE_MS = 60_000;

const BOUNDED_ARG_RE =
  /^(?:limit|pageSize|page_size|offset|from|to|start|end|maxRows|max_rows|p_limit(?:_\w+)?|p_page_size|p_offset(?:_\w+)?|p_from|p_to|p_start|p_end|p_date_from|p_date_to)$/i;

const LIST_LIKE_CLASSIFICATIONS = new Set<SupabaseRpcRateLimitClassification>([
  "bounded_list",
  "bounded_search",
  "legacy_list_migration_guard",
  "parent_scoped_read",
  "aggregate_read",
]);

const SCALAR_STATUS_RPC_NAMES = new Set([
  "ensure_my_profile",
  "get_my_role",
  "developer_override_context_v1",
  "developer_set_effective_role_v1",
  "developer_clear_effective_role_v1",
]);

const forbiddenAdminRpcRe = new RegExp(
  `(?:^|_)(?:admin|${["service", "role"].join("_")}|list_users|auth_admin|bypass_rls)(?:_|$)`,
  "i",
);

function runtimeClassForPolicy(
  policy: SupabaseRpcRateLimitPolicy,
): RpcRuntimePolicyClass {
  if (policy.classification === "compat_transport") return "dynamic_boundary";
  if (policy.classification === "internal_job") return "internal_job";
  if (policy.classification === "mutation_or_side_effect") {
    return "mutation_requires_approval";
  }
  if (policy.classification === "ai_action_ledger") {
    return "mutation_requires_approval";
  }
  if (LIST_LIKE_CLASSIFICATIONS.has(policy.classification)) {
    return "list_like_read";
  }
  if (SCALAR_STATUS_RPC_NAMES.has(policy.rpcName)) return "scalar_status";
  return "detail_read";
}

function defaultLimitForRuntimeClass(
  runtimeClass: RpcRuntimePolicyClass,
  enforcementPolicy: RateEnforcementPolicy | null,
): RpcRuntimeLimit {
  if (enforcementPolicy) {
    const concurrencyByClass: Record<RpcRuntimePolicyClass, number> = {
      list_like_read: Math.max(1, Math.min(4, enforcementPolicy.burst)),
      detail_read: Math.max(1, Math.min(8, enforcementPolicy.burst)),
      scalar_status: Math.max(1, Math.min(10, enforcementPolicy.burst)),
      mutation_requires_approval: Math.max(1, Math.min(2, enforcementPolicy.burst)),
      internal_job: Math.max(1, Math.min(2, enforcementPolicy.burst)),
      dynamic_boundary: Math.max(1, Math.min(4, enforcementPolicy.burst)),
      admin_forbidden: 1,
    };
    const localWindowMinByClass: Record<RpcRuntimePolicyClass, number> = {
      list_like_read: 240,
      detail_read: 300,
      scalar_status: 360,
      mutation_requires_approval: 120,
      internal_job: 120,
      dynamic_boundary: 180,
      admin_forbidden: 0,
    };
    return {
      concurrency: concurrencyByClass[runtimeClass],
      windowMs: enforcementPolicy.windowMs,
      maxRequests: Math.max(
        enforcementPolicy.maxRequests,
        localWindowMinByClass[runtimeClass],
      ),
      cooldownMs: Math.min(enforcementPolicy.cooldownMs, 5_000),
    };
  }

  switch (runtimeClass) {
    case "scalar_status":
      return { concurrency: 10, windowMs: MINUTE_MS, maxRequests: 240, cooldownMs: 5_000 };
    case "detail_read":
      return { concurrency: 8, windowMs: MINUTE_MS, maxRequests: 180, cooldownMs: 5_000 };
    case "dynamic_boundary":
      return { concurrency: 4, windowMs: MINUTE_MS, maxRequests: 120, cooldownMs: 10_000 };
    case "admin_forbidden":
      return { concurrency: 1, windowMs: MINUTE_MS, maxRequests: 0, cooldownMs: MINUTE_MS };
    default:
      return { concurrency: 4, windowMs: MINUTE_MS, maxRequests: 90, cooldownMs: 10_000 };
  }
}

export function hasBoundedRpcArgs(args: unknown): boolean {
  if (!args || typeof args !== "object" || Array.isArray(args)) return false;
  return Object.keys(args).some((key) => BOUNDED_ARG_RE.test(key));
}

export function isAdminForbiddenRpcName(rpcName: string): boolean {
  return forbiddenAdminRpcRe.test(rpcName);
}

export function getSupabaseRpcRuntimePolicy(
  rpcName: string,
  args?: unknown,
): SupabaseRpcRuntimePolicy {
  const normalizedRpcName = String(rpcName ?? "").trim();
  const sourcePolicy = getSupabaseRpcRateLimitPolicy(normalizedRpcName);

  if (!sourcePolicy || isAdminForbiddenRpcName(normalizedRpcName)) {
    return {
      rpcName: normalizedRpcName || "unknown_rpc",
      classification: "admin_forbidden",
      runtimeClass: "admin_forbidden",
      rateEnforcementOperation: null,
      sourcePolicy: null,
      enforcementPolicy: null,
      boundedArgsRequired: false,
      boundedArgsSatisfied: false,
      runtimeEnforcementEnabled: true,
      blocked: true,
      limit: defaultLimitForRuntimeClass("admin_forbidden", null),
      reason: sourcePolicy
        ? "Admin/service-role RPC names are not allowed in app runtime."
        : "RPC name is not classified in the runtime rate-limit registry.",
    };
  }

  const runtimeClass = runtimeClassForPolicy(sourcePolicy);
  const enforcementPolicy = sourcePolicy.rateEnforcementOperation
    ? getRateEnforcementPolicy(sourcePolicy.rateEnforcementOperation)
    : null;
  const boundedArgsSatisfied =
    !sourcePolicy.boundedArgsRequired || hasBoundedRpcArgs(args);

  return {
    rpcName: sourcePolicy.rpcName,
    classification: sourcePolicy.classification,
    runtimeClass,
    rateEnforcementOperation: sourcePolicy.rateEnforcementOperation,
    sourcePolicy,
    enforcementPolicy,
    boundedArgsRequired: sourcePolicy.boundedArgsRequired,
    boundedArgsSatisfied,
    runtimeEnforcementEnabled: true,
    blocked: sourcePolicy.boundedArgsRequired && !boundedArgsSatisfied,
    limit: defaultLimitForRuntimeClass(runtimeClass, enforcementPolicy),
    reason: sourcePolicy.reason,
  };
}

export function isListLikeRpcRuntimePolicy(
  policy: SupabaseRpcRuntimePolicy,
): boolean {
  return policy.runtimeClass === "list_like_read";
}

export function isMutationRpcRuntimePolicy(
  policy: SupabaseRpcRuntimePolicy,
): boolean {
  return (
    policy.runtimeClass === "mutation_requires_approval" ||
    policy.runtimeClass === "internal_job"
  );
}
