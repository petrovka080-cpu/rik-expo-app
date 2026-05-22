import type { AiDomainContextBundle, AiDomainQueryResult } from "../domainDataGateway/aiDomainContextBundle";
import { getAiDomainRoleAllowlistEntry, isAiDomainGatewayRole, type AiDomainGatewayRole } from "../domainDataGateway/aiDomainRoleAllowlist";

export type AiContextBudget = {
  role: AiDomainGatewayRole;
  maxFacts: 20;
  maxNumericFacts: 20;
  maxDomainFacts: 20;
};

const DEFAULT_BUDGET: Omit<AiContextBudget, "role"> = {
  maxFacts: 20,
  maxNumericFacts: 20,
  maxDomainFacts: 20,
};

export const AI_CONTEXT_BUDGET_BY_ROLE: Record<AiDomainGatewayRole, AiContextBudget> = {
  director: { role: "director", ...DEFAULT_BUDGET },
  foreman: { role: "foreman", ...DEFAULT_BUDGET },
  buyer: { role: "buyer", ...DEFAULT_BUDGET },
  accountant: { role: "accountant", ...DEFAULT_BUDGET },
  warehouse: { role: "warehouse", ...DEFAULT_BUDGET },
  contractor: { role: "contractor", ...DEFAULT_BUDGET },
  marketplace: { role: "marketplace", ...DEFAULT_BUDGET },
  consumer: { role: "consumer", ...DEFAULT_BUDGET },
};

function getBudgetRole(role: string): AiDomainGatewayRole {
  return isAiDomainGatewayRole(role) ? role : "director";
}

export function getAiContextBudgetForRole(role: string): AiContextBudget {
  return AI_CONTEXT_BUDGET_BY_ROLE[getBudgetRole(role)];
}

function trimDomainResult(result: AiDomainQueryResult, budget: AiContextBudget): AiDomainQueryResult {
  return {
    ...result,
    facts: result.facts.slice(0, budget.maxDomainFacts),
    numericFacts: result.numericFacts.slice(0, budget.maxDomainFacts),
  };
}

const NUMERIC_FACT_PRIORITY: Record<string, number> = {
  invoice_45_amount: 0,
  payment_77_amount: 1,
  payments_missing_docs_sum: 2,
  gkl_shortage: 3,
  gkl_issued: 4,
  gkl_remaining: 5,
  request_124_required_gkl: 6,
  first_floor_issues: 7,
};

function limitNumericFacts(bundle: AiDomainContextBundle, budget: AiContextBudget) {
  return [...bundle.mergedNumericFacts]
    .sort((a, b) => {
      const priorityA = NUMERIC_FACT_PRIORITY[a.key] ?? 1000;
      const priorityB = NUMERIC_FACT_PRIORITY[b.key] ?? 1000;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return 0;
    })
    .slice(0, budget.maxNumericFacts);
}

export function applyAiContextBudgetToBundle(bundle: AiDomainContextBundle): AiDomainContextBundle {
  const budget = getAiContextBudgetForRole(bundle.role);
  const allowlistEntry = getAiDomainRoleAllowlistEntry(bundle.role);
  const domainResults = bundle.domainResults.map((result) => trimDomainResult(result, budget));

  return {
    ...bundle,
    domainResults,
    mergedFacts: domainResults
      .flatMap((result) =>
        result.facts.map((fact) => ({
          textRu: fact.textRu,
          sourceRefIds: fact.sourceRefIds,
          status: fact.status === "draft" ? "found" : fact.status,
        })),
      )
      .slice(0, budget.maxFacts),
    mergedNumericFacts: limitNumericFacts(bundle, budget),
    nextRetrievalHints: allowlistEntry
      ? bundle.nextRetrievalHints.filter((hint) => allowlistEntry.allowedDomains.includes(hint.domain))
      : bundle.nextRetrievalHints,
  };
}

export function evaluateAiContextBudget(bundle: AiDomainContextBundle) {
  const budget = getAiContextBudgetForRole(bundle.role);
  const domainFactMax = Math.max(0, ...bundle.domainResults.map((result) => result.facts.length));
  const domainNumericFactMax = Math.max(0, ...bundle.domainResults.map((result) => result.numericFacts.length));

  return {
    role: bundle.role,
    maxFacts: budget.maxFacts,
    maxNumericFacts: budget.maxNumericFacts,
    maxDomainFacts: budget.maxDomainFacts,
    mergedFacts: bundle.mergedFacts.length,
    mergedNumericFacts: bundle.mergedNumericFacts.length,
    maxFactsInSingleDomain: domainFactMax,
    maxNumericFactsInSingleDomain: domainNumericFactMax,
    passed:
      bundle.mergedFacts.length <= budget.maxFacts &&
      bundle.mergedNumericFacts.length <= budget.maxNumericFacts &&
      domainFactMax <= budget.maxDomainFacts &&
      domainNumericFactMax <= budget.maxDomainFacts,
  };
}
