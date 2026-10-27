import type {
  ConstructionDomainId,
  ConstructionDomainPlaybook,
  ConstructionInternalFirstStatus,
  ConstructionKnowhowRoleId,
  EvidenceRef,
} from "./constructionKnowhowTypes";
import { getConstructionDomainPlaybook } from "./constructionDomainPlaybooks";
import { getConstructionRoleProfile } from "./constructionRoleAdvisor";

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function sanitizeEvidenceRef(ref: EvidenceRef): EvidenceRef {
  return {
    refId: ref.refId.trim(),
    sourceType: ref.sourceType,
    label: ref.label.trim(),
    sourceIdHash: ref.sourceIdHash.trim() || stableHash(ref.refId),
    redacted: true,
    rawRowsReturned: false,
  };
}

function policyEvidence(pack: ConstructionDomainPlaybook): EvidenceRef[] {
  return pack.internalDataSources.slice(0, 3).map((sourceName, index) => ({
    refId: `policy:${pack.domainId}:${sourceName}`,
    sourceType: "policy_contract",
    label: `Internal ${sourceName} evidence required`,
    sourceIdHash: stableHash(`${pack.domainId}:${sourceName}:${index}`),
    redacted: true,
    rawRowsReturned: false,
  }));
}

export function composeConstructionEvidence(params: {
  roleId: ConstructionKnowhowRoleId;
  domainId: ConstructionDomainId;
  evidenceRefs?: readonly EvidenceRef[];
}): {
  evidenceRefs: EvidenceRef[];
  internalFirstStatus: ConstructionInternalFirstStatus;
  evidenceRequired: true;
  rawRowsReturned: false;
  fakeEvidence: false;
  findings: string[];
} {
  const pack = getConstructionDomainPlaybook(params.domainId);
  const profile = getConstructionRoleProfile(params.roleId);
  const provided = (params.evidenceRefs ?? [])
    .map(sanitizeEvidenceRef)
    .filter((ref) => ref.refId.length > 0 && ref.label.length > 0);
  const roleScopeRef: EvidenceRef = {
    refId: `role_scope:${params.roleId}:${params.domainId}`,
    sourceType: "role_scope",
    label: profile
      ? `${profile.title} boundary applied`
      : "Construction role boundary missing",
    sourceIdHash: stableHash(`${params.roleId}:${params.domainId}`),
    redacted: true,
    rawRowsReturned: false,
  };
  const refs = pack ? [...provided, roleScopeRef, ...policyEvidence(pack)] : [roleScopeRef];
  const internalRuntimeEvidenceCount = provided.filter((ref) => ref.sourceType === "internal_runtime").length;
  const internalFirstStatus: ConstructionInternalFirstStatus =
    internalRuntimeEvidenceCount >= 2 ? "complete" : internalRuntimeEvidenceCount === 1 ? "partial" : "insufficient";

  return {
    evidenceRefs: refs,
    internalFirstStatus,
    evidenceRequired: true,
    rawRowsReturned: false,
    fakeEvidence: false,
    findings: [
      ...(pack ? [] : [`domain_playbook_missing:${params.domainId}`]),
      ...(profile ? [] : [`role_profile_missing:${params.roleId}`]),
      ...(internalRuntimeEvidenceCount > 0 ? [] : ["internal_runtime_evidence_missing"]),
    ],
  };
}
