import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  AI_DOMAIN_GATEWAY_ROLE_NAMES,
  createDefaultAiDomainProviderRegistry,
  executeAiDomainGatewayRequest,
  getAiDomainRoleAllowlist,
  type AiDomainGatewayRole,
  type AiDomainGatewayRequest,
  type AiDomainName,
} from "../../src/lib/ai/domainDataGateway/index.ts";
import { evaluateAiContextBudget, getAiContextBudgetForRole } from "../../src/lib/ai/contextBudget/index.ts";
import { findAiSourceSanitizerLeaks } from "../../src/lib/ai/sourceSanitizer/index.ts";

export const AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_WAVE =
  "S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_BUDGET_CLOSEOUT" as const;
export const AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_PREFIX =
  "S_AI_DOMAIN_GATEWAY" as const;
export const AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_GREEN_STATUS =
  "GREEN_AI_DOMAIN_DATA_GATEWAY_CONTEXT_BUDGET_READY" as const;

const root = process.cwd();
const artifactDir = path.join(root, "artifacts");

const roleQuestionByRole: Record<AiDomainGatewayRole, string> = {
  director: "company summary, blockers, approvals, money, risks",
  foreman: "work, materials, evidence, today blockers",
  buyer: "approved procurement, stock, marketplace options",
  accountant: "payments, invoices, debts, documents",
  warehouse: "stock, movements, issue, receive, deficits",
  contractor: "own assigned work, evidence, act, pdf",
  marketplace: "listing, product, media, missing fields",
  consumer: "own repair request, draft, pdf, marketplace send",
};

const entityByRole: Record<AiDomainGatewayRole, string> = {
  director: "procurement_request",
  foreman: "work",
  buyer: "procurement_request",
  accountant: "payment",
  warehouse: "warehouse_stock",
  contractor: "work",
  marketplace: "marketplace_product",
  consumer: "consumer_repair_request",
};

export type AiDomainGatewayRoleFactSnapshot = {
  role: AiDomainGatewayRole;
  screen_id: string;
  allowed_domains: readonly AiDomainName[];
  returned_domains: AiDomainName[];
  status: string;
  elapsed_ms: number;
  merged_fact_count: number;
  merged_numeric_fact_count: number;
  max_context_budget: number;
  budget_passed: boolean;
  sanitizer_leaks: string[];
  facts: string[];
  numeric_fact_keys: string[];
  permission_limits: string[];
  source_ref_count: number;
};

export type AiDomainGatewayContextBudgetReport = {
  providerMatrix: {
    roles: Array<{
      role: AiDomainGatewayRole;
      allowed_domains: readonly AiDomainName[];
      registered_domains: AiDomainName[];
      missing_registered_domains: AiDomainName[];
      max_context_budget: number;
      provider_registered_for_every_allowed_domain: boolean;
    }>;
    role_providers_registered: boolean;
    role_allowlists_complete: boolean;
  };
  contextBudget: {
    roles: Array<{
      role: AiDomainGatewayRole;
      max_facts: number;
      max_numeric_facts: number;
      merged_facts: number;
      merged_numeric_facts: number;
      max_facts_in_single_domain: number;
      max_numeric_facts_in_single_domain: number;
      passed: boolean;
    }>;
    context_budget_enforced: boolean;
    p95_ms: number;
    ai_context_p95_lte_1000ms: boolean;
  };
  sanitizer: {
    source_sanitizer_enabled: boolean;
    forbidden_tokens_checked: true;
    leaks: Record<AiDomainGatewayRole, string[]>;
    raw_db_dump_found: boolean;
    debug_provider_payload_visible: boolean;
  };
  roleFacts: AiDomainGatewayRoleFactSnapshot[];
  matrix: Record<string, unknown>;
  proofMd: string;
};

function createGatewayRequest(role: AiDomainGatewayRole): AiDomainGatewayRequest {
  return {
    requestId: `ai-domain-gateway-budget-${role}`,
    role,
    userId: `user_${role}`,
    orgId: "org_golden",
    projectId: "project_golden",
    screenId: `ai-${role}-context-budget`,
    normalizedQuestionRu: roleQuestionByRole[role],
    intent: "role_context_budget",
    entity: entityByRole[role],
    sourcePlanDomains: [...getAiDomainRoleAllowlist(role)],
    filters: {
      requestId: "req_124",
      paymentId: "payment_77",
      documentId: "pdf_invoice_45",
      workId: "work_31",
      materialNameRu: "GKL 12.5",
      status: role === "buyer" ? "approved" : undefined,
    },
    requiredQueryKinds: ["trace", "linked_objects", "risk_summary", "missing_data", "draft_context"],
    maxResultsPerDomain: 20,
    requireSourceRefs: true,
    requireOpenLinks: true,
    requireNumericFactsWhenAvailable: true,
    reasonRu: "Wave 06 role data gateway context budget proof.",
  };
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function hasAnyDomain(snapshot: AiDomainGatewayRoleFactSnapshot, domains: readonly AiDomainName[]): boolean {
  return snapshot.returned_domains.some((domain) => domains.includes(domain));
}

function hasFactToken(snapshot: AiDomainGatewayRoleFactSnapshot, tokens: readonly string[]): boolean {
  const text = JSON.stringify(snapshot).toLowerCase();
  return tokens.some((token) => text.includes(token.toLowerCase()));
}

export async function buildAiDomainGatewayContextBudgetReport(): Promise<AiDomainGatewayContextBudgetReport> {
  const registry = createDefaultAiDomainProviderRegistry();
  const registeredDomains = registry.providers.map((provider) => provider.domain);
  const roleFacts: AiDomainGatewayRoleFactSnapshot[] = [];
  const budgetRows: AiDomainGatewayContextBudgetReport["contextBudget"]["roles"] = [];
  const sanitizerLeaks = {} as Record<AiDomainGatewayRole, string[]>;
  const timings: number[] = [];

  for (const role of AI_DOMAIN_GATEWAY_ROLE_NAMES) {
    const started = performance.now();
    const bundle = await executeAiDomainGatewayRequest(createGatewayRequest(role), registry);
    const elapsed = performance.now() - started;
    timings.push(elapsed);

    const budget = evaluateAiContextBudget(bundle);
    budgetRows.push({
      role,
      max_facts: budget.maxFacts,
      max_numeric_facts: budget.maxNumericFacts,
      merged_facts: budget.mergedFacts,
      merged_numeric_facts: budget.mergedNumericFacts,
      max_facts_in_single_domain: budget.maxFactsInSingleDomain,
      max_numeric_facts_in_single_domain: budget.maxNumericFactsInSingleDomain,
      passed: budget.passed,
    });

    const leaks = findAiSourceSanitizerLeaks(bundle);
    sanitizerLeaks[role] = leaks;

    roleFacts.push({
      role,
      screen_id: bundle.screenId,
      allowed_domains: getAiDomainRoleAllowlist(role),
      returned_domains: bundle.domainResults.map((result) => result.domain),
      status: bundle.status,
      elapsed_ms: Math.round(elapsed * 100) / 100,
      merged_fact_count: bundle.mergedFacts.length,
      merged_numeric_fact_count: bundle.mergedNumericFacts.length,
      max_context_budget: getAiContextBudgetForRole(role).maxFacts,
      budget_passed: budget.passed,
      sanitizer_leaks: leaks,
      facts: bundle.mergedFacts.map((fact) => fact.textRu),
      numeric_fact_keys: bundle.mergedNumericFacts.map((fact) => fact.key),
      permission_limits: bundle.permissionLimits.map((limit) => `${limit.hiddenSourceType}:${limit.reasonRu}`),
      source_ref_count: bundle.mergedSourceRefs.length,
    });
  }

  const providerMatrixRoles = AI_DOMAIN_GATEWAY_ROLE_NAMES.map((role) => {
    const allowedDomains = getAiDomainRoleAllowlist(role);
    const missingRegisteredDomains = allowedDomains.filter((domain) => !registeredDomains.includes(domain));
    return {
      role,
      allowed_domains: allowedDomains,
      registered_domains: registeredDomains.filter((domain) => allowedDomains.includes(domain)),
      missing_registered_domains: missingRegisteredDomains,
      max_context_budget: getAiContextBudgetForRole(role).maxFacts,
      provider_registered_for_every_allowed_domain: missingRegisteredDomains.length === 0,
    };
  });

  const consumerSnapshot = roleFacts.find((snapshot) => snapshot.role === "consumer");
  const accountantSnapshot = roleFacts.find((snapshot) => snapshot.role === "accountant");
  const buyerSnapshot = roleFacts.find((snapshot) => snapshot.role === "buyer");
  const warehouseSnapshot = roleFacts.find((snapshot) => snapshot.role === "warehouse");
  const p95 = percentile95(timings);

  const consumerOfficeContextFound = consumerSnapshot
    ? hasAnyDomain(consumerSnapshot, ["office", "finance", "warehouse", "field", "documents", "procurement", "approvals"])
    : true;
  const accountantForemanContextMixFound = accountantSnapshot
    ? hasAnyDomain(accountantSnapshot, ["field", "contractors", "media"]) ||
      hasFactToken(accountantSnapshot, ["foreman checklist", "closable_today", "needs_photo", "needs_act"])
    : true;
  const buyerApprovedRequestsOnly = buyerSnapshot
    ? buyerSnapshot.returned_domains.includes("procurement") &&
      !hasAnyDomain(buyerSnapshot, ["finance", "office", "client", "approvals"]) &&
      hasFactToken(buyerSnapshot, ["утвержд", "procurement", "req_124"])
    : false;
  const warehouseMovementFactsReady = warehouseSnapshot
    ? warehouseSnapshot.returned_domains.includes("warehouse") &&
      ["gkl_issued", "gkl_remaining", "gkl_shortage"].every((key) => warehouseSnapshot.numeric_fact_keys.includes(key))
    : false;

  const providerMatrix = {
    roles: providerMatrixRoles,
    role_providers_registered: providerMatrixRoles.every((row) => row.provider_registered_for_every_allowed_domain),
    role_allowlists_complete: providerMatrixRoles.every((row) => row.allowed_domains.length > 0 && row.max_context_budget === 20),
  };
  const contextBudget = {
    roles: budgetRows,
    context_budget_enforced: budgetRows.every((row) => row.passed),
    p95_ms: p95,
    ai_context_p95_lte_1000ms: p95 <= 1000,
  };
  const sanitizer = {
    source_sanitizer_enabled: true,
    forbidden_tokens_checked: true as const,
    leaks: sanitizerLeaks,
    raw_db_dump_found: Object.values(sanitizerLeaks).some((leaks) =>
      leaks.some((token) => ["rawRows", "rawDb", "select(*)"].includes(token)),
    ),
    debug_provider_payload_visible: Object.values(sanitizerLeaks).some((leaks) =>
      leaks.some((token) => ["providerPayload", "debug_provider", "runtime_debug"].includes(token)),
    ),
  };

  const contentGreen =
    providerMatrix.role_providers_registered &&
    providerMatrix.role_allowlists_complete &&
    contextBudget.context_budget_enforced &&
    !sanitizer.raw_db_dump_found &&
    !consumerOfficeContextFound &&
    !accountantForemanContextMixFound &&
    !sanitizer.debug_provider_payload_visible &&
    sanitizer.source_sanitizer_enabled &&
    contextBudget.ai_context_p95_lte_1000ms &&
    buyerApprovedRequestsOnly &&
    warehouseMovementFactsReady;

  const fullJestPassed = process.env.AI_DOMAIN_GATEWAY_FULL_JEST_PASSED === "1";
  const releaseVerifyPassed = process.env.AI_DOMAIN_GATEWAY_RELEASE_VERIFY_PASSED === "1";
  const finalStatus = contentGreen && fullJestPassed && releaseVerifyPassed
    ? AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_GREEN_STATUS
    : "BLOCKED_AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_PENDING_GATES";

  const matrix = {
    wave: AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_WAVE,
    final_status: finalStatus,
    role_providers_registered: providerMatrix.role_providers_registered,
    role_allowlists_complete: providerMatrix.role_allowlists_complete,
    context_budget_enforced: contextBudget.context_budget_enforced,
    raw_db_dump_found: sanitizer.raw_db_dump_found,
    consumer_office_context_found: consumerOfficeContextFound,
    accountant_foreman_context_mix_found: accountantForemanContextMixFound,
    buyer_approved_requests_only: buyerApprovedRequestsOnly,
    warehouse_movement_facts_ready: warehouseMovementFactsReady,
    debug_provider_payload_visible: sanitizer.debug_provider_payload_visible,
    source_sanitizer_enabled: sanitizer.source_sanitizer_enabled,
    ai_context_p95_lte_1000ms: contextBudget.ai_context_p95_lte_1000ms,
    p95_ms: contextBudget.p95_ms,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };

  const proofMd = [
    `# ${AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_WAVE}`,
    "",
    `Final status: ${finalStatus}`,
    "",
    "## Roles",
    ...roleFacts.map((snapshot) =>
      `- ${snapshot.role}: domains=${snapshot.returned_domains.join(", ")} facts=${snapshot.merged_fact_count}/${snapshot.max_context_budget} numeric=${snapshot.merged_numeric_fact_count}/${snapshot.max_context_budget} elapsed=${snapshot.elapsed_ms}ms`,
    ),
    "",
    "## Safety",
    `- consumer_office_context_found: ${consumerOfficeContextFound}`,
    `- accountant_foreman_context_mix_found: ${accountantForemanContextMixFound}`,
    `- raw_db_dump_found: ${sanitizer.raw_db_dump_found}`,
    `- debug_provider_payload_visible: ${sanitizer.debug_provider_payload_visible}`,
    `- p95_ms: ${contextBudget.p95_ms}`,
  ].join("\n");

  return {
    providerMatrix,
    contextBudget,
    sanitizer,
    roleFacts,
    matrix,
    proofMd,
  };
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeAiDomainGatewayContextBudgetArtifacts(): Promise<AiDomainGatewayContextBudgetReport> {
  const report = await buildAiDomainGatewayContextBudgetReport();
  writeJson(`${AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_PREFIX}_provider_matrix.json`, report.providerMatrix);
  writeJson(`${AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_PREFIX}_context_budget.json`, report.contextBudget);
  writeJson(`${AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_PREFIX}_sanitizer.json`, report.sanitizer);
  writeJson(`${AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_PREFIX}_role_facts.json`, report.roleFacts);
  writeJson(`${AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_PREFIX}_matrix.json`, report.matrix);
  fs.writeFileSync(path.join(artifactDir, `${AI_DOMAIN_GATEWAY_CONTEXT_BUDGET_PREFIX}_proof.md`), report.proofMd, "utf8");
  return report;
}
