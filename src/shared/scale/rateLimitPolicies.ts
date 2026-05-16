import type { BffMutationOperation } from "./bffMutationHandlers";
import type { BffReadOperation } from "./bffReadHandlers";
import type { JobType } from "./jobPolicies";
import {
  RATE_LIMIT_OBSERVABILITY_EVENT_MAP,
  type RateLimitObservabilityMetadata,
} from "./scaleObservabilityEvents";

export type RateLimitPolicyScope = "actor" | "company" | "route" | "ip_or_device" | "global";

export type RateLimitPolicySeverity = "low" | "medium" | "high" | "critical";

export type RateLimitPolicyCategory = "read" | "mutation" | "job" | "realtime" | "ai";

export type RateLimitEnforcementOperation =
  | BffReadOperation
  | "warehouse.issue.queue"
  | "buyer.summary.inbox"
  | "warehouse.stock.page"
  | BffMutationOperation
  | "notification.fanout"
  | "cache.readmodel.refresh"
  | "offline.replay.bridge"
  | "realtime.channel.setup"
  | "realtime.subscription.refresh"
  | "ai.workflow.action";

export type RateEnforcementPolicy = {
  operation: RateLimitEnforcementOperation;
  category: RateLimitPolicyCategory;
  scope: RateLimitPolicyScope;
  secondaryScopes: readonly RateLimitPolicyScope[];
  windowMs: number;
  maxRequests: number;
  burst: number;
  cooldownMs: number;
  severity: RateLimitPolicySeverity;
  actorKeyRequired: boolean;
  companyKeyRequired: boolean;
  idempotencyKeyRequiredForMutations: boolean;
  piiSafeKey: true;
  defaultEnabled: false;
  enforcementEnabledByDefault: false;
  externalStoreRequiredForLiveEnforcement: true;
  observability: RateLimitObservabilityMetadata;
};

const MINUTE_MS = 60_000;

export const BFF_READ_RATE_LIMIT_OPERATIONS: readonly BffReadOperation[] = Object.freeze([
  "request.proposal.list",
  "marketplace.catalog.search",
  "warehouse.ledger.list",
  "accountant.invoice.list",
  "director.pending.list",
]);

export const LOAD_HOTSPOT_RATE_LIMIT_OPERATIONS = Object.freeze([
  "warehouse.issue.queue",
  "buyer.summary.inbox",
  "warehouse.stock.page",
] as const);

export const BFF_MUTATION_RATE_LIMIT_OPERATIONS: readonly BffMutationOperation[] = Object.freeze([
  "proposal.submit",
  "warehouse.receive.apply",
  "accountant.payment.apply",
  "director.approval.apply",
  "request.item.update",
  "catalog.request.meta.update",
  "catalog.request.item.cancel",
]);

export const JOB_RATE_LIMIT_OPERATIONS = Object.freeze([
  "notification.fanout",
  "cache.readmodel.refresh",
  "offline.replay.bridge",
] as const);

export const REALTIME_RATE_LIMIT_OPERATIONS = Object.freeze([
  "realtime.channel.setup",
  "realtime.subscription.refresh",
] as const);

export const AI_RATE_LIMIT_OPERATIONS = Object.freeze(["ai.workflow.action"] as const);

const policy = (value: Omit<RateEnforcementPolicy, "piiSafeKey" | "defaultEnabled" | "enforcementEnabledByDefault" | "externalStoreRequiredForLiveEnforcement" | "observability">): RateEnforcementPolicy =>
  Object.freeze({
    ...value,
    piiSafeKey: true,
    defaultEnabled: false,
    enforcementEnabledByDefault: false,
    externalStoreRequiredForLiveEnforcement: true,
    observability: RATE_LIMIT_OBSERVABILITY_EVENT_MAP[value.operation],
  });

export const RATE_ENFORCEMENT_POLICY_REGISTRY: readonly RateEnforcementPolicy[] = Object.freeze([
  policy({
    operation: "request.proposal.list",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 90,
    burst: 20,
    cooldownMs: 15_000,
    severity: "medium",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "marketplace.catalog.search",
    category: "read",
    scope: "ip_or_device",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 120,
    burst: 25,
    cooldownMs: 10_000,
    severity: "medium",
    actorKeyRequired: false,
    companyKeyRequired: false,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "warehouse.ledger.list",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 70,
    burst: 15,
    cooldownMs: 20_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "accountant.invoice.list",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 50,
    burst: 10,
    cooldownMs: 30_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "director.pending.list",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 80,
    burst: 15,
    cooldownMs: 20_000,
    severity: "medium",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "warehouse.issue.queue",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 40,
    burst: 8,
    cooldownMs: 30_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "buyer.summary.inbox",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 60,
    burst: 12,
    cooldownMs: 20_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "warehouse.stock.page",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 45,
    burst: 8,
    cooldownMs: 15_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "proposal.submit",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 20,
    burst: 4,
    cooldownMs: 30_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "warehouse.receive.apply",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 20,
    burst: 4,
    cooldownMs: 30_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "accountant.payment.apply",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: 5 * MINUTE_MS,
    maxRequests: 8,
    burst: 1,
    cooldownMs: 120_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "director.approval.apply",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 20,
    burst: 4,
    cooldownMs: 30_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "request.item.update",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 25,
    burst: 5,
    cooldownMs: 30_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "catalog.request.meta.update",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 25,
    burst: 5,
    cooldownMs: 30_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "catalog.request.item.cancel",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 15,
    burst: 3,
    cooldownMs: 30_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "notification.fanout",
    category: "job",
    scope: "company",
    secondaryScopes: ["actor", "global"],
    windowMs: 5 * MINUTE_MS,
    maxRequests: 5,
    burst: 1,
    cooldownMs: 120_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "cache.readmodel.refresh",
    category: "job",
    scope: "global",
    secondaryScopes: ["route"],
    windowMs: 5 * MINUTE_MS,
    maxRequests: 10,
    burst: 2,
    cooldownMs: 60_000,
    severity: "high",
    actorKeyRequired: false,
    companyKeyRequired: false,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "offline.replay.bridge",
    category: "job",
    scope: "actor",
    secondaryScopes: ["ip_or_device", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 10,
    burst: 2,
    cooldownMs: 60_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: false,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "realtime.channel.setup",
    category: "realtime",
    scope: "actor",
    secondaryScopes: ["company", "ip_or_device"],
    windowMs: MINUTE_MS,
    maxRequests: 30,
    burst: 5,
    cooldownMs: 20_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "realtime.subscription.refresh",
    category: "realtime",
    scope: "actor",
    secondaryScopes: ["company", "ip_or_device"],
    windowMs: MINUTE_MS,
    maxRequests: 60,
    burst: 10,
    cooldownMs: 15_000,
    severity: "medium",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "ai.workflow.action",
    category: "ai",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: 5 * MINUTE_MS,
    maxRequests: 5,
    burst: 1,
    cooldownMs: 120_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
] as const);

export const BFF_READ_RATE_ENFORCEMENT_POLICY_MAP: Record<BffReadOperation, RateLimitEnforcementOperation> = Object.freeze({
  "request.proposal.list": "request.proposal.list",
  "marketplace.catalog.search": "marketplace.catalog.search",
  "warehouse.ledger.list": "warehouse.ledger.list",
  "accountant.invoice.list": "accountant.invoice.list",
  "director.pending.list": "director.pending.list",
});

export const BFF_MUTATION_RATE_ENFORCEMENT_POLICY_MAP: Record<BffMutationOperation, RateLimitEnforcementOperation> = Object.freeze({
  "proposal.submit": "proposal.submit",
  "warehouse.receive.apply": "warehouse.receive.apply",
  "accountant.payment.apply": "accountant.payment.apply",
  "director.approval.apply": "director.approval.apply",
  "request.item.update": "request.item.update",
  "catalog.request.meta.update": "catalog.request.meta.update",
  "catalog.request.item.cancel": "catalog.request.item.cancel",
});

export const JOB_RATE_ENFORCEMENT_POLICY_MAP: Partial<Record<JobType, RateLimitEnforcementOperation>> = Object.freeze({
  "proposal.submit.followup": "proposal.submit",
  "warehouse.receive.postprocess": "warehouse.receive.apply",
  "accountant.payment.postprocess": "accountant.payment.apply",
  "director.approval.postprocess": "director.approval.apply",
  "request.item.update.postprocess": "request.item.update",
  "notification.fanout": "notification.fanout",
  "cache.readmodel.refresh": "cache.readmodel.refresh",
  "offline.replay.bridge": "offline.replay.bridge",
});

export type SupabaseRpcRateLimitClassification =
  | "bounded_list"
  | "bounded_search"
  | "legacy_list_migration_guard"
  | "parent_scoped_read"
  | "aggregate_read"
  | "detail_or_status"
  | "mutation_or_side_effect"
  | "internal_job"
  | "ai_action_ledger"
  | "compat_transport";

export type SupabaseRpcRateLimitPolicy = {
  rpcName: string;
  classification: SupabaseRpcRateLimitClassification;
  rateEnforcementOperation: RateLimitEnforcementOperation | null;
  boundedArgsRequired: boolean;
  migrationTarget: string | null;
  reason: string;
  defaultEnabled: false;
  enforcementEnabledByDefault: false;
};

const rpcPolicy = (
  value: Omit<
    SupabaseRpcRateLimitPolicy,
    "defaultEnabled" | "enforcementEnabledByDefault"
  >,
): SupabaseRpcRateLimitPolicy =>
  Object.freeze({
    ...value,
    defaultEnabled: false,
    enforcementEnabledByDefault: false,
  });

const rpcPolicies = (
  rpcNames: readonly string[],
  value: Omit<
    SupabaseRpcRateLimitPolicy,
    "rpcName" | "defaultEnabled" | "enforcementEnabledByDefault"
  >,
): readonly SupabaseRpcRateLimitPolicy[] =>
  rpcNames.map((rpcName) => rpcPolicy({ ...value, rpcName }));

export const SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY: readonly SupabaseRpcRateLimitPolicy[] =
  Object.freeze([
    ...rpcPolicies(
      [
        "accountant_history_scope_v1",
        "accountant_inbox_scope_v1",
        "list_accountant_payments_history_v2",
      ],
      {
        classification: "bounded_list",
        rateEnforcementOperation: "accountant.invoice.list",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Accountant list RPC carries explicit offset/limit or page arguments.",
      },
    ),
    ...rpcPolicies(
      ["list_accountant_inbox", "list_accountant_inbox_fact"],
      {
        classification: "legacy_list_migration_guard",
        rateEnforcementOperation: "accountant.invoice.list",
        boundedArgsRequired: false,
        migrationTarget: "accountant_inbox_scope_v1",
        reason: "Legacy accountant inbox list RPC has no pagination args; migrated screens use the bounded scope RPC.",
      },
    ),
    ...rpcPolicies(
      [
        "accountant_proposal_financial_state_v1",
        "developer_override_context_v1",
        "ensure_my_profile",
        "get_my_role",
        "marketplace_item_scope_detail_v1",
        "proposal_request_item_integrity_v1",
        "request_find_reusable_empty_draft_v1",
        "resolve_catalog_synonym_v1",
        "resolve_packaging_v1",
        "resolve_req_pr_map",
        "rpc_calc_work_kit",
      ],
      {
        classification: "detail_or_status",
        rateEnforcementOperation: null,
        boundedArgsRequired: false,
        migrationTarget: null,
        reason: "Scalar, detail, status, or identity RPC; not a list-returning read.",
      },
    ),
    ...rpcPolicies(
      ["pdf_payment_source_v1"],
      {
        classification: "parent_scoped_read",
        rateEnforcementOperation: "accountant.invoice.list",
        boundedArgsRequired: false,
        migrationTarget: "pdf_payment_source_v2 with explicit document-row ceiling",
        reason: "Payment PDF source is keyed by one payment id and is not used as a list screen read.",
      },
    ),
    ...rpcPolicies(
      [
        "accounting_pay_invoice_v1",
        "acc_return_min_auto",
        "buyer_rfq_create_and_publish_v1",
        "proposal_return_to_buyer_min",
        "proposal_send_to_accountant_min",
      ],
      {
        classification: "mutation_or_side_effect",
        rateEnforcementOperation: "accountant.payment.apply",
        boundedArgsRequired: false,
        migrationTarget: null,
        reason: "Accountant mutation RPC is covered by the payment mutation rate policy.",
      },
    ),
    ...rpcPolicies(
      [
        "director_pending_proposals_scope_v1",
        "director_finance_fetch_summary_v1",
        "director_finance_summary_v2",
        "director_finance_panel_scope_v1",
        "director_finance_panel_scope_v2",
        "director_finance_panel_scope_v3",
        "director_finance_panel_scope_v4",
        "director_finance_supplier_scope_v1",
        "director_finance_supplier_scope_v2",
        "director_report_transport_scope_v1",
      ],
      {
        classification: "bounded_list",
        rateEnforcementOperation: "director.pending.list",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Director scope RPCs carry explicit period, filter, offset, or limit arguments.",
      },
    ),
    ...rpcPolicies(
      [
        "list_director_inbox",
        "list_director_items_stable",
        "list_director_proposals_pending",
        "list_pending",
        "list_pending_foreman_items",
        "listPending",
        "listpending",
      ],
      {
        classification: "legacy_list_migration_guard",
        rateEnforcementOperation: "director.pending.list",
        boundedArgsRequired: false,
        migrationTarget: "director_pending_proposals_scope_v1",
        reason: "Legacy director list RPC has no pagination args; bounded director scope RPC is the migration target.",
      },
    ),
    ...rpcPolicies(
      [
        "approve_one",
        "director_approve_pipeline_v1",
        "director_approve_request_v1",
        "director_decide_proposal_items",
        "director_return_min_auto",
        "reject_one",
        "reject_request_all",
        "reject_request_item",
      ],
      {
        classification: "mutation_or_side_effect",
        rateEnforcementOperation: "director.approval.apply",
        boundedArgsRequired: false,
        migrationTarget: null,
        reason: "Director approval/decision RPC is covered by the approval mutation rate policy.",
      },
    ),
    ...rpcPolicies(
      [
        "pdf_director_finance_source_v1",
        "pdf_director_production_source_v1",
        "pdf_director_subcontract_source_v1",
      ],
      {
        classification: "aggregate_read",
        rateEnforcementOperation: "director.pending.list",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Director PDF source RPCs are bounded by document filters and period arguments.",
      },
    ),
    ...rpcPolicies(
      [
        "director_report_fetch_acc_issue_lines_v1",
        "director_report_fetch_discipline_source_rows_v1",
        "director_report_fetch_issue_price_scope_v1",
        "director_report_fetch_materials_v1",
        "director_report_fetch_options_v1",
        "director_report_fetch_summary_v1",
        "director_report_fetch_works_v1",
        "wh_report_issued_summary_fast",
      ],
      {
        classification: "aggregate_read",
        rateEnforcementOperation: "director.pending.list",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Director report fallback RPCs are scoped by report filters and covered by director read rate policy.",
      },
    ),
    ...rpcPolicies(
      [
        "marketplace_items_scope_page_v1",
        "rik_quick_ru",
        "rik_quick_search",
        "rik_quick_search_typed",
      ],
      {
        classification: "bounded_search",
        rateEnforcementOperation: "marketplace.catalog.search",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Catalog and marketplace search RPCs carry explicit search/page bounds.",
      },
    ),
    ...rpcPolicies(
      ["catalog_search", "suppliers_list"],
      {
        classification: "legacy_list_migration_guard",
        rateEnforcementOperation: "marketplace.catalog.search",
        boundedArgsRequired: false,
        migrationTarget: "marketplace_items_scope_page_v1",
        reason: "Legacy catalog/supplier RPC has no limit argument; bounded marketplace scope RPC is the migration target.",
      },
    ),
    ...rpcPolicies(
      [
        "buyer_summary_inbox_scope_v1",
      ],
      {
        classification: "bounded_list",
        rateEnforcementOperation: "buyer.summary.inbox",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Buyer summary inbox scope RPC carries explicit offset and limit arguments.",
      },
    ),
    ...rpcPolicies(
      [
        "buyer_summary_buckets_scope_v1",
        "contractor_fact_scope_v1",
        "contractor_inbox_scope_v1",
        "contractor_works_bundle_scope_v1",
      ],
      {
        classification: "parent_scoped_read",
        rateEnforcementOperation: "buyer.summary.inbox",
        boundedArgsRequired: false,
        migrationTarget: "role scope RPC pagination when DB function contracts are revised",
        reason: "Role summary/fact scope RPC is constrained by actor or parent scope and tracked for explicit pagination.",
      },
    ),
    ...rpcPolicies(
      [
        "proposal_attachment_evidence_scope_v1",
        "proposal_items_for_web",
        "request_items_by_request",
      ],
      {
        classification: "parent_scoped_read",
        rateEnforcementOperation: "request.proposal.list",
        boundedArgsRequired: false,
        migrationTarget: "parent-scoped RPC pagination when DB function contracts are revised",
        reason: "Parent-scoped item RPC is keyed by one parent id; migration target is explicit DB-function pagination.",
      },
    ),
    ...rpcPolicies(
      [
        "proposal_add_items",
        "proposal_attachment_evidence_attach_v1",
        "proposal_create",
        "proposal_items_snapshot",
        "proposal_submit",
        "proposal_submit_text_v1",
        "rpc_proposal_submit_v3",
        "subcontract_create_draft",
        "subcontract_create_v1",
      ],
      {
        classification: "mutation_or_side_effect",
        rateEnforcementOperation: "proposal.submit",
        boundedArgsRequired: false,
        migrationTarget: null,
        reason: "Proposal/subcontract creation RPC is covered by the proposal submit mutation rate policy.",
      },
    ),
    ...rpcPolicies(
      [
        "request_item_add_or_inc",
        "request_items_set_status",
        "request_reopen_atomic_v1",
        "request_submit_atomic_v1",
        "request_sync_draft_v2",
        "send_request_to_director",
        "approve_or_decline_request_pending",
        "developer_set_effective_role_v1",
        "developer_clear_effective_role_v1",
        "subcontract_approve_v1",
        "subcontract_reject_v1",
      ],
      {
        classification: "mutation_or_side_effect",
        rateEnforcementOperation: "request.item.update",
        boundedArgsRequired: false,
        migrationTarget: null,
        reason: "Request/status mutation RPC is covered by the request item update mutation rate policy.",
      },
    ),
    ...rpcPolicies(
      [
        "acc_report_incoming_v2",
        "acc_report_movement",
        "acc_report_issues_v2",
        "wh_report_issued_by_object_fast",
        "wh_report_issued_materials_fast",
      ],
      {
        classification: "aggregate_read",
        rateEnforcementOperation: "warehouse.ledger.list",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Warehouse/report aggregate RPCs are scoped by period or report filters and rate-limited as ledger reads.",
      },
    ),
    ...rpcPolicies(
      [
        "list_report_stock_turnover",
        "list_report_costs_by_object",
        "list_report_ap_aging",
        "list_report_purchase_pipeline",
      ],
      {
        classification: "aggregate_read",
        rateEnforcementOperation: "warehouse.ledger.list",
        boundedArgsRequired: false,
        migrationTarget: "reports dashboard RPC pagination when DB function contracts are revised",
        reason: "Legacy reports dashboard aggregate RPCs are read-only report calls tracked for explicit DB pagination.",
      },
    ),
    ...rpcPolicies(
      ["acc_report_stock"],
      {
        classification: "legacy_list_migration_guard",
        rateEnforcementOperation: "warehouse.stock.page",
        boundedArgsRequired: false,
        migrationTarget: "warehouse_stock_scope_v2",
        reason: "Legacy stock aggregate RPC has no pagination args; bounded warehouse stock scope RPC is the migration target.",
      },
    ),
    ...rpcPolicies(
      [
        "acc_report_issue_lines",
        "pdf_contractor_work_source_v1",
        "pdf_warehouse_incoming_source_v1",
        "warehouse_incoming_items_scope_v1",
        "warehouse_issue_items_scope_v1",
      ],
      {
        classification: "parent_scoped_read",
        rateEnforcementOperation: "warehouse.ledger.list",
        boundedArgsRequired: false,
        migrationTarget: "parent-scoped warehouse report pagination when DB function contracts are revised",
        reason: "Warehouse/report child-row RPC is keyed by one parent id and tracked for explicit DB-function pagination.",
      },
    ),
    ...rpcPolicies(
      [
        "pdf_warehouse_day_materials_source_v1",
        "pdf_warehouse_incoming_materials_source_v1",
        "pdf_warehouse_object_work_source_v1",
      ],
      {
        classification: "aggregate_read",
        rateEnforcementOperation: "warehouse.ledger.list",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Warehouse PDF source RPCs are bounded by document filters and covered by ledger read policy.",
      },
    ),
    ...rpcPolicies(
      ["warehouse_incoming_queue_scope_v1"],
      {
        classification: "bounded_list",
        rateEnforcementOperation: "warehouse.ledger.list",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Warehouse incoming queue scope RPC carries explicit offset and limit arguments.",
      },
    ),
    ...rpcPolicies(
      ["warehouse_issue_queue_scope_v4"],
      {
        classification: "bounded_list",
        rateEnforcementOperation: "warehouse.issue.queue",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Warehouse issue queue scope RPC carries explicit offset and limit arguments.",
      },
    ),
    ...rpcPolicies(
      ["warehouse_stock_scope_v2"],
      {
        classification: "bounded_list",
        rateEnforcementOperation: "warehouse.stock.page",
        boundedArgsRequired: true,
        migrationTarget: null,
        reason: "Warehouse stock scope RPC carries explicit offset and limit arguments.",
      },
    ),
    ...rpcPolicies(
      [
        "warehouse_refresh_name_map_ui",
        "wh_incoming_ensure_items",
        "ensure_incoming_items",
        "wh_incoming_seed_from_purchase",
        "wh_issue_free_atomic_v5",
        "wh_issue_request_atomic_v1",
        "wh_receive_apply_ui",
        "work_seed_defaults_auto",
      ],
      {
        classification: "mutation_or_side_effect",
        rateEnforcementOperation: "warehouse.receive.apply",
        boundedArgsRequired: false,
        migrationTarget: null,
        reason: "Warehouse mutation/seed RPC is covered by the warehouse receive/apply rate policy.",
      },
    ),
    ...rpcPolicies(
      [
        "submit_jobs_claim",
        "submit_jobs_mark_completed",
        "submit_jobs_mark_failed",
        "submit_jobs_metrics",
        "submit_jobs_recover_stuck",
      ],
      {
        classification: "internal_job",
        rateEnforcementOperation: "offline.replay.bridge",
        boundedArgsRequired: false,
        migrationTarget: null,
        reason: "Background job queue RPC is internal worker traffic covered by offline replay bridge rate policy.",
      },
    ),
    ...rpcPolicies(
      [
        "ai_action_ledger_approve_v1",
        "ai_action_ledger_execute_approved_v1",
        "ai_action_ledger_find_by_idempotency_key_v1",
        "ai_action_ledger_get_status_v1",
        "ai_action_ledger_list_by_org_v1",
        "ai_action_ledger_reject_v1",
        "ai_action_ledger_submit_for_approval_v1",
        "ai_action_ledger_verify_apply_v1",
      ],
      {
        classification: "ai_action_ledger",
        rateEnforcementOperation: "ai.workflow.action",
        boundedArgsRequired: false,
        migrationTarget: null,
        reason: "AI action ledger RPCs are preview/control-plane calls covered by the AI workflow rate policy.",
      },
    ),
  ] as const);

export function getSupabaseRpcRateLimitPolicy(
  rpcName: string,
): SupabaseRpcRateLimitPolicy | null {
  return (
    SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY.find(
      (entry) => entry.rpcName === rpcName,
    ) ?? null
  );
}

export function getRateEnforcementPolicy(
  operation: RateLimitEnforcementOperation,
): RateEnforcementPolicy | null {
  return RATE_ENFORCEMENT_POLICY_REGISTRY.find((entry) => entry.operation === operation) ?? null;
}

export function getRateEnforcementPoliciesByCategory(
  category: RateLimitPolicyCategory,
): readonly RateEnforcementPolicy[] {
  return RATE_ENFORCEMENT_POLICY_REGISTRY.filter((entry) => entry.category === category);
}

export function getRateEnforcementPolicyForBffReadOperation(
  operation: BffReadOperation,
): RateEnforcementPolicy | null {
  return getRateEnforcementPolicy(BFF_READ_RATE_ENFORCEMENT_POLICY_MAP[operation]);
}

export function getRateEnforcementPolicyForBffMutationOperation(
  operation: BffMutationOperation,
): RateEnforcementPolicy | null {
  return getRateEnforcementPolicy(BFF_MUTATION_RATE_ENFORCEMENT_POLICY_MAP[operation]);
}

export function getRateEnforcementPolicyForJobType(jobType: JobType): RateEnforcementPolicy | null {
  const operation = JOB_RATE_ENFORCEMENT_POLICY_MAP[jobType];
  return operation ? getRateEnforcementPolicy(operation) : null;
}

export function validateRateEnforcementPolicy(policyToValidate: RateEnforcementPolicy): boolean {
  return (
    RATE_ENFORCEMENT_POLICY_REGISTRY.some((entry) => entry.operation === policyToValidate.operation) &&
    policyToValidate.windowMs > 0 &&
    Number.isInteger(policyToValidate.windowMs) &&
    policyToValidate.maxRequests > 0 &&
    Number.isInteger(policyToValidate.maxRequests) &&
    policyToValidate.burst > 0 &&
    Number.isInteger(policyToValidate.burst) &&
    policyToValidate.burst <= policyToValidate.maxRequests &&
    policyToValidate.cooldownMs >= 0 &&
    Number.isInteger(policyToValidate.cooldownMs) &&
    policyToValidate.piiSafeKey === true &&
    policyToValidate.defaultEnabled === false &&
    policyToValidate.enforcementEnabledByDefault === false &&
    policyToValidate.externalStoreRequiredForLiveEnforcement === true &&
    (policyToValidate.category !== "mutation" || policyToValidate.idempotencyKeyRequiredForMutations === true)
  );
}
