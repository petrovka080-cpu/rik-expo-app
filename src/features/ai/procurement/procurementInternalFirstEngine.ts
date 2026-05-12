import { resolveExternalIntelPolicy } from "../externalIntel/externalIntelPolicy";
import {
  resolveInternalFirstDecision,
  validateInternalFirstSequence,
} from "../intelligence/internalFirstPolicy";
import type {
  ProcurementInternalFirstPlan,
  ProcurementRequestContext,
} from "./procurementContextTypes";
import { evidenceRefIds } from "./procurementEvidenceBuilder";
import { uniqueProcurementRefs } from "./procurementRedaction";

export function buildProcurementInternalFirstPlan(params: {
  context: ProcurementRequestContext;
  marketplaceEvidenceRefs?: readonly string[];
  externalRequested?: boolean;
  externalSourcePolicyIds?: readonly string[];
}): ProcurementInternalFirstPlan {
  const internalEvidenceRefs = evidenceRefIds(params.context.internalEvidenceRefs);
  const marketplaceEvidenceRefs = uniqueProcurementRefs([...(params.marketplaceEvidenceRefs ?? [])]);
  const externalPolicy = resolveExternalIntelPolicy({
    domain: "procurement",
    sourcePolicyIds: params.externalSourcePolicyIds ?? [],
  });
  const externalRequested = params.externalRequested === true;
  const decision = resolveInternalFirstDecision({
    internalEvidenceRefs,
    marketplaceEvidenceRefs,
    externalPolicyAllowed: externalPolicy.allowed,
    externalRequested,
    externalLiveFetchEnabled: false,
  });
  const externalStatus =
    externalRequested && !externalPolicy.allowed
      ? "external_policy_blocked"
      : externalRequested
        ? "external_policy_not_enabled"
        : "not_requested";
  const violations = validateInternalFirstSequence({
    decision,
    finalActionFromExternalOnly: false,
    citations: [],
  });

  return {
    status: params.context.status,
    sourceOrder: ["internal_app", "marketplace", "external_policy"],
    internalDataChecked: true,
    marketplaceChecked: marketplaceEvidenceRefs.length > 0,
    externalChecked: false,
    externalStatus,
    evidenceRefs: decision.evidenceRefs,
    missingData: params.context.missingFields,
    violations: [...violations],
    recommendationAllowed: violations.length === 0 && params.context.status !== "blocked",
    finalMutationAllowed: false,
  };
}
