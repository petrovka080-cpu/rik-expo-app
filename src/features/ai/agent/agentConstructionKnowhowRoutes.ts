import type { AiUserRole } from "../policy/aiRolePolicy";
import { buildConstructionDecisionCard } from "../constructionKnowhow/constructionDecisionCardEngine";
import {
  listConstructionKnowhowDomains,
  isConstructionDomainId,
  isConstructionKnowhowRoleId,
} from "../constructionKnowhow/constructionKnowhowRegistry";
import {
  describeConstructionRoleBoundary,
  getConstructionRoleProfile,
  listConstructionRoleProfiles,
  toConstructionKnowhowRoleId,
} from "../constructionKnowhow/constructionRoleAdvisor";
import { resolveConstructionExternalIntelPolicy } from "../constructionKnowhow/constructionExternalIntelPolicy";
import { composeConstructionEvidence } from "../constructionKnowhow/constructionEvidenceComposer";
import { classifyConstructionRisk } from "../constructionKnowhow/constructionRiskClassifier";
import { buildConstructionProfessionalSafetyBoundary } from "../constructionKnowhow/constructionProfessionalSafetyBoundary";
import type {
  ConstructionAnalyzeInput,
  ConstructionDecisionCard,
  ConstructionDecisionCardInput,
  ConstructionDomainId,
  ConstructionExternalIntelPolicyDecision,
  ConstructionKnowhowRoleId,
  ConstructionRecommendedActions,
  ConstructionRoleProfile,
} from "../constructionKnowhow/constructionKnowhowTypes";
import { AGENT_CONSTRUCTION_KNOWHOW_BFF_CONTRACT } from "./agentConstructionKnowhowContracts";

export type AgentConstructionKnowhowAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentConstructionKnowhowDomainsRequest = {
  auth: AgentConstructionKnowhowAuthContext | null;
};

export type AgentConstructionKnowhowRoleProfileRequest = {
  auth: AgentConstructionKnowhowAuthContext | null;
  roleId: ConstructionKnowhowRoleId | AiUserRole;
};

export type AgentConstructionKnowhowAnalyzeRequest = {
  auth: AgentConstructionKnowhowAuthContext | null;
  input: ConstructionAnalyzeInput;
};

export type AgentConstructionKnowhowDecisionCardRequest = {
  auth: AgentConstructionKnowhowAuthContext | null;
  input: ConstructionDecisionCardInput;
};

export type AgentConstructionKnowhowActionPlanRequest = AgentConstructionKnowhowDecisionCardRequest;
export type AgentConstructionKnowhowExternalPreviewRequest = AgentConstructionKnowhowAnalyzeRequest;

type AgentConstructionKnowhowBaseDto = {
  contractId: "agent_construction_knowhow_bff_v1";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  internalFirst: true;
  mutation_count: 0;
  db_writes: 0;
  mutationCount: 0;
  dbWrites: 0;
  direct_supabase_from_ui: false;
  mobile_external_fetch: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  provider_payload_returned: false;
  secrets_printed: false;
  directSupabaseFromUi: false;
  mobileExternalFetch: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  providerPayloadReturned: false;
  secretsPrinted: false;
  providerCalled: false;
  externalLiveFetch: false;
  finalExecution: 0;
  source: "bff:agent_construction_knowhow_v1";
};

export type AgentConstructionKnowhowDto =
  | (AgentConstructionKnowhowBaseDto & {
      documentType: "agent_construction_knowhow_domains";
      endpoint: "GET /agent/construction-knowhow/domains";
      result: {
        domains: ReturnType<typeof listConstructionKnowhowDomains>;
        roles: ReturnType<typeof listConstructionRoleProfiles>;
      };
    })
  | (AgentConstructionKnowhowBaseDto & {
      documentType: "agent_construction_knowhow_role_profile";
      endpoint: "GET /agent/construction-knowhow/role-profile/:roleId";
      result: ConstructionRoleProfile;
      boundarySummary: string;
    })
  | (AgentConstructionKnowhowBaseDto & {
      documentType: "agent_construction_knowhow_analysis";
      endpoint: "POST /agent/construction-knowhow/analyze";
      result: {
        roleId: ConstructionKnowhowRoleId;
        domainId: ConstructionDomainId;
        evidenceRefs: ConstructionDecisionCard["evidenceRefs"];
        riskLevel: ConstructionDecisionCard["riskLevel"];
        urgency: ConstructionDecisionCard["urgency"];
        internalFirstStatus: ConstructionDecisionCard["internalFirstStatus"];
        approvalRequired: boolean;
      };
    })
  | (AgentConstructionKnowhowBaseDto & {
      documentType: "agent_construction_knowhow_decision_card";
      endpoint: "POST /agent/construction-knowhow/decision-card";
      result: ConstructionDecisionCard;
    })
  | (AgentConstructionKnowhowBaseDto & {
      documentType: "agent_construction_knowhow_action_plan";
      endpoint: "POST /agent/construction-knowhow/action-plan";
      result: ConstructionRecommendedActions;
    })
  | (AgentConstructionKnowhowBaseDto & {
      documentType: "agent_construction_knowhow_external_preview";
      endpoint: "POST /agent/construction-knowhow/external-preview";
      result: ConstructionExternalIntelPolicyDecision;
    });

export type AgentConstructionKnowhowEnvelope =
  | {
      ok: true;
      data: AgentConstructionKnowhowDto;
    }
  | {
      ok: false;
      error: {
        code:
          | "AGENT_CONSTRUCTION_KNOWHOW_AUTH_REQUIRED"
          | "AGENT_CONSTRUCTION_KNOWHOW_INVALID_INPUT"
          | "AGENT_CONSTRUCTION_KNOWHOW_ROLE_BLOCKED";
        message: string;
      };
    };

function authenticated(
  auth: AgentConstructionKnowhowAuthContext | null,
): auth is AgentConstructionKnowhowAuthContext {
  return Boolean(auth?.userId.trim()) && auth?.role !== "unknown";
}

function authError(): AgentConstructionKnowhowEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_CONSTRUCTION_KNOWHOW_AUTH_REQUIRED",
      message: "Construction know-how route requires authenticated role context.",
    },
  };
}

function baseDto(): AgentConstructionKnowhowBaseDto {
  return {
    contractId: AGENT_CONSTRUCTION_KNOWHOW_BFF_CONTRACT.contractId,
    roleScoped: true,
    readOnly: true,
    evidenceBacked: true,
    internalFirst: true,
    mutation_count: 0,
    db_writes: 0,
    mutationCount: 0,
    dbWrites: 0,
    direct_supabase_from_ui: false,
    mobile_external_fetch: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    provider_payload_returned: false,
    secrets_printed: false,
    directSupabaseFromUi: false,
    mobileExternalFetch: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    providerPayloadReturned: false,
    secretsPrinted: false,
    providerCalled: false,
    externalLiveFetch: false,
    finalExecution: 0,
    source: "bff:agent_construction_knowhow_v1",
  };
}

function resolveRouteRole(
  auth: AgentConstructionKnowhowAuthContext,
  requested?: ConstructionKnowhowRoleId | AiUserRole,
): ConstructionKnowhowRoleId {
  if (requested && isConstructionKnowhowRoleId(requested)) return requested;
  return toConstructionKnowhowRoleId(auth.role);
}

function normalizeDecisionInput(
  auth: AgentConstructionKnowhowAuthContext,
  input: ConstructionDecisionCardInput,
): ConstructionDecisionCardInput | null {
  if (!isConstructionDomainId(input.domainId)) return null;
  const roleId = resolveRouteRole(auth, input.roleId);
  return {
    ...input,
    roleId,
  };
}

export function getAgentConstructionKnowhowDomains(
  request: AgentConstructionKnowhowDomainsRequest,
): AgentConstructionKnowhowEnvelope {
  if (!authenticated(request.auth)) return authError();

  return {
    ok: true,
    data: {
      ...baseDto(),
      documentType: "agent_construction_knowhow_domains",
      endpoint: "GET /agent/construction-knowhow/domains",
      result: {
        domains: listConstructionKnowhowDomains(),
        roles: listConstructionRoleProfiles(),
      },
    },
  };
}

export function getAgentConstructionKnowhowRoleProfile(
  request: AgentConstructionKnowhowRoleProfileRequest,
): AgentConstructionKnowhowEnvelope {
  if (!authenticated(request.auth)) return authError();
  const roleId = resolveRouteRole(request.auth, request.roleId);
  const profile = getConstructionRoleProfile(roleId);
  if (!profile) {
    return {
      ok: false,
      error: {
        code: "AGENT_CONSTRUCTION_KNOWHOW_ROLE_BLOCKED",
        message: "Construction role profile is not registered.",
      },
    };
  }

  return {
    ok: true,
    data: {
      ...baseDto(),
      documentType: "agent_construction_knowhow_role_profile",
      endpoint: "GET /agent/construction-knowhow/role-profile/:roleId",
      result: profile,
      boundarySummary: describeConstructionRoleBoundary(roleId),
    },
  };
}

export function analyzeAgentConstructionKnowhow(
  request: AgentConstructionKnowhowAnalyzeRequest,
): AgentConstructionKnowhowEnvelope {
  if (!authenticated(request.auth)) return authError();
  const input = normalizeDecisionInput(request.auth, request.input);
  if (!input) {
    return {
      ok: false,
      error: {
        code: "AGENT_CONSTRUCTION_KNOWHOW_INVALID_INPUT",
        message: "Construction know-how analysis requires a registered domain.",
      },
    };
  }

  const evidence = composeConstructionEvidence({
    roleId: input.roleId,
    domainId: input.domainId,
    evidenceRefs: request.input.evidenceRefs,
  });
  const risk = classifyConstructionRisk({
    domainId: input.domainId,
    internalFirstStatus: evidence.internalFirstStatus,
    observedSignals: input.observedSignals,
  });

  return {
    ok: true,
    data: {
      ...baseDto(),
      documentType: "agent_construction_knowhow_analysis",
      endpoint: "POST /agent/construction-knowhow/analyze",
      result: {
        roleId: input.roleId,
        domainId: input.domainId,
        evidenceRefs: evidence.evidenceRefs,
        riskLevel: risk.riskLevel,
        urgency: risk.urgency,
        internalFirstStatus: evidence.internalFirstStatus,
        approvalRequired: risk.approvalRequired,
      },
    },
  };
}

export function createAgentConstructionDecisionCard(
  request: AgentConstructionKnowhowDecisionCardRequest,
): AgentConstructionKnowhowEnvelope {
  if (!authenticated(request.auth)) return authError();
  const input = normalizeDecisionInput(request.auth, request.input);
  if (!input) {
    return {
      ok: false,
      error: {
        code: "AGENT_CONSTRUCTION_KNOWHOW_INVALID_INPUT",
        message: "Construction decision card requires a registered domain.",
      },
    };
  }

  return {
    ok: true,
    data: {
      ...baseDto(),
      documentType: "agent_construction_knowhow_decision_card",
      endpoint: "POST /agent/construction-knowhow/decision-card",
      result: buildConstructionDecisionCard(input),
    },
  };
}

export function planAgentConstructionKnowhowAction(
  request: AgentConstructionKnowhowActionPlanRequest,
): AgentConstructionKnowhowEnvelope {
  if (!authenticated(request.auth)) return authError();
  const input = normalizeDecisionInput(request.auth, request.input);
  if (!input) {
    return {
      ok: false,
      error: {
        code: "AGENT_CONSTRUCTION_KNOWHOW_INVALID_INPUT",
        message: "Construction action plan requires a registered domain.",
      },
    };
  }

  const card = buildConstructionDecisionCard(input);
  const boundary = buildConstructionProfessionalSafetyBoundary({
    roleId: input.roleId,
    domainId: input.domainId,
    evidenceRefs: card.evidenceRefs,
    approvalRequired: card.riskLevel === "high" || card.internalFirstStatus !== "complete",
  });

  return {
    ok: true,
    data: {
      ...baseDto(),
      documentType: "agent_construction_knowhow_action_plan",
      endpoint: "POST /agent/construction-knowhow/action-plan",
      result: boundary.recommendedActions,
    },
  };
}

export function previewAgentConstructionExternalIntel(
  request: AgentConstructionKnowhowExternalPreviewRequest,
): AgentConstructionKnowhowEnvelope {
  if (!authenticated(request.auth)) return authError();
  const input = normalizeDecisionInput(request.auth, request.input);
  if (!input) {
    return {
      ok: false,
      error: {
        code: "AGENT_CONSTRUCTION_KNOWHOW_INVALID_INPUT",
        message: "Construction external preview requires a registered domain.",
      },
    };
  }

  const evidence = composeConstructionEvidence({
    roleId: input.roleId,
    domainId: input.domainId,
    evidenceRefs: request.input.evidenceRefs,
  });

  return {
    ok: true,
    data: {
      ...baseDto(),
      documentType: "agent_construction_knowhow_external_preview",
      endpoint: "POST /agent/construction-knowhow/external-preview",
      result: resolveConstructionExternalIntelPolicy({
        domainId: input.domainId,
        internalFirstStatus: evidence.internalFirstStatus,
        externalPreviewRequested: true,
      }),
    },
  };
}

export { AGENT_CONSTRUCTION_KNOWHOW_BFF_CONTRACT };
