import type {
  ConstructionDomainId,
  ConstructionInternalFirstStatus,
  ConstructionRiskLevel,
  ConstructionUrgency,
  RiskRule,
} from "./constructionKnowhowTypes";
import { getConstructionDomainPlaybook } from "./constructionDomainPlaybooks";

const RISK_ORDER: Record<ConstructionRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const URGENCY_ORDER: Record<ConstructionUrgency, number> = {
  watch: 1,
  week: 2,
  today: 3,
  now: 4,
};

function highestRisk(left: ConstructionRiskLevel, right: ConstructionRiskLevel): ConstructionRiskLevel {
  return RISK_ORDER[right] > RISK_ORDER[left] ? right : left;
}

function highestUrgency(left: ConstructionUrgency, right: ConstructionUrgency): ConstructionUrgency {
  return URGENCY_ORDER[right] > URGENCY_ORDER[left] ? right : left;
}

function ruleMatches(rule: RiskRule, observedSignals: readonly string[]): boolean {
  const signal = rule.signal.toLowerCase();
  return observedSignals.some((observed) => {
    const normalized = observed.toLowerCase();
    return normalized.includes(signal) || signal.includes(normalized);
  });
}

export function classifyConstructionRisk(params: {
  domainId: ConstructionDomainId;
  internalFirstStatus: ConstructionInternalFirstStatus;
  observedSignals?: readonly string[];
}): {
  riskLevel: ConstructionRiskLevel;
  urgency: ConstructionUrgency;
  matchedRules: RiskRule[];
  approvalRequired: boolean;
} {
  const playbook = getConstructionDomainPlaybook(params.domainId);
  const observedSignals = params.observedSignals ?? [];
  const matchedRules = (playbook?.riskRules ?? []).filter((rule) => ruleMatches(rule, observedSignals));
  let riskLevel: ConstructionRiskLevel =
    params.internalFirstStatus === "complete" ? "low" : params.internalFirstStatus === "partial" ? "medium" : "medium";
  let urgency: ConstructionUrgency = params.internalFirstStatus === "complete" ? "watch" : "today";

  for (const rule of matchedRules) {
    riskLevel = highestRisk(riskLevel, rule.riskLevel);
    urgency = highestUrgency(urgency, rule.urgency);
  }

  return {
    riskLevel,
    urgency,
    matchedRules,
    approvalRequired:
      riskLevel === "high" ||
      matchedRules.some((rule) => rule.approvalRequired) ||
      params.internalFirstStatus !== "complete",
  };
}
