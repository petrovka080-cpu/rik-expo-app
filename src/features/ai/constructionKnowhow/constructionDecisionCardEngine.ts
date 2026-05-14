import type {
  ConstructionDecisionCard,
  ConstructionDecisionCardDomain,
  ConstructionDecisionCardInput,
  ConstructionDomainId,
} from "./constructionKnowhowTypes";
import { getConstructionDomainPlaybook } from "./constructionDomainPlaybooks";
import { getConstructionRoleProfile } from "./constructionRoleAdvisor";
import { composeConstructionEvidence } from "./constructionEvidenceComposer";
import { resolveConstructionExternalIntelPolicy } from "./constructionExternalIntelPolicy";
import { buildConstructionProfessionalSafetyBoundary } from "./constructionProfessionalSafetyBoundary";
import { classifyConstructionRisk } from "./constructionRiskClassifier";

function toDecisionCardDomain(domainId: ConstructionDomainId): ConstructionDecisionCardDomain {
  if (domainId === "warehouse_material_flow") return "warehouse";
  if (domainId === "finance_cost_control" || domainId === "accounting") return "finance";
  if (domainId === "document_control" || domainId === "bim_information_management" || domainId === "approval_workflow") {
    return "documents";
  }
  if (domainId === "field_execution" || domainId === "project_planning" || domainId === "quality_control") {
    return "field_execution";
  }
  if (domainId === "contractor_management") return "contractor_management";
  if (domainId === "real_estate_due_diligence") return "real_estate_due_diligence";
  return "procurement";
}

function professionalAssessment(params: {
  domainId: ConstructionDomainId;
  internalFirstStatus: ConstructionDecisionCard["internalFirstStatus"];
  roleAllowed: boolean;
  approvalRequired: boolean;
}): string {
  if (!params.roleAllowed) {
    return "Role boundary blocks this domain; only a redacted safe-read explanation is available.";
  }

  if (params.internalFirstStatus === "insufficient") {
    return "Internal evidence is not sufficient for a final professional conclusion. The engine can prepare safe reads, draft questions, and approval-bound next steps only.";
  }

  if (params.approvalRequired) {
    return "The domain assessment is evidence-backed enough for a draft, but risky action stays behind the approval ledger.";
  }

  return "Internal evidence supports a low-risk professional preview with no mutation or external live fetch.";
}

export function buildConstructionDecisionCard(
  input: ConstructionDecisionCardInput,
): ConstructionDecisionCard {
  const playbook = getConstructionDomainPlaybook(input.domainId);
  const profile = getConstructionRoleProfile(input.roleId);
  const roleAllowed = Boolean(profile?.allowedDomains.includes(input.domainId));
  const evidence = composeConstructionEvidence({
    roleId: input.roleId,
    domainId: input.domainId,
    evidenceRefs: input.internalEvidenceRefs,
  });
  const risk = classifyConstructionRisk({
    domainId: input.domainId,
    internalFirstStatus: evidence.internalFirstStatus,
    observedSignals: input.observedSignals,
  });
  const externalPolicy = resolveConstructionExternalIntelPolicy({
    domainId: input.domainId,
    internalFirstStatus: evidence.internalFirstStatus,
    externalPreviewRequested: input.externalPreviewRequested,
  });
  const boundary = buildConstructionProfessionalSafetyBoundary({
    roleId: input.roleId,
    domainId: input.domainId,
    evidenceRefs: evidence.evidenceRefs,
    approvalRequired: risk.approvalRequired || !roleAllowed,
  });

  return {
    cardId: `construction_knowhow:${input.roleId}:${input.domainId}`,
    rolePerspective: input.roleId,
    domain: toDecisionCardDomain(input.domainId),
    situationSummary:
      input.situationSummary?.trim() ||
      `${playbook?.professionalGoal ?? "Construction domain requires registered playbook."}`,
    professionalAssessment: professionalAssessment({
      domainId: input.domainId,
      internalFirstStatus: evidence.internalFirstStatus,
      roleAllowed,
      approvalRequired: risk.approvalRequired,
    }),
    evidenceRefs: evidence.evidenceRefs,
    riskLevel: risk.riskLevel,
    urgency: risk.urgency,
    recommendedActions: boundary.recommendedActions,
    internalFirstStatus: evidence.internalFirstStatus,
    externalIntelStatus: externalPolicy.status,
    mutationCount: 0,
    dbWrites: 0,
  };
}

export function buildConstructionKnowhowPreviewCard(
  roleId: ConstructionDecisionCardInput["roleId"] = "director_control",
): ConstructionDecisionCard {
  return buildConstructionDecisionCard({
    roleId,
    domainId: "procurement",
    situationSummary:
      "Construction know-how preview: internal request, catalog, supplier, warehouse, finance, document, and approval context must be checked before any action.",
    observedSignals: ["requested material is not covered"],
    externalPreviewRequested: true,
  });
}
