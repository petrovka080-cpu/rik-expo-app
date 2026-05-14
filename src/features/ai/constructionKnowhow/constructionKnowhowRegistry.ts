import {
  CONSTRUCTION_DOMAIN_IDS,
  CONSTRUCTION_KNOWHOW_ROLE_IDS,
  type ConstructionDomainId,
  type ConstructionDomainPlaybook,
  type ConstructionKnowhowRoleId,
} from "./constructionKnowhowTypes";
import {
  CONSTRUCTION_DOMAIN_PLAYBOOKS,
  getConstructionDomainPlaybook,
  listConstructionDomainPlaybooks,
} from "./constructionDomainPlaybooks";

export const CONSTRUCTION_KNOWHOW_REGISTRY_CONTRACT = Object.freeze({
  contractId: "construction_knowhow_registry_v1",
  documentType: "construction_knowhow_registry",
  domains: CONSTRUCTION_DOMAIN_IDS,
  roles: CONSTRUCTION_KNOWHOW_ROLE_IDS,
  evidenceRequired: true,
  roleScopeRequired: true,
  internalFirstRequired: true,
  externalPreviewOnly: true,
  citationsRequiredForExternalPreview: true,
  highRiskRequiresApproval: true,
  mutationCount: 0,
  dbWrites: 0,
  directExecution: false,
  domainMutation: false,
  mobileExternalFetch: false,
  directSupabaseFromUi: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  providerPayloadReturned: false,
  fakeEvidence: false,
  fakeSuppliers: false,
  fakeDocuments: false,
} as const);

export function listConstructionKnowhowDomains(): ConstructionDomainPlaybook[] {
  return listConstructionDomainPlaybooks();
}

export function resolveConstructionKnowhowDomain(
  domainId: ConstructionDomainId,
): ConstructionDomainPlaybook | null {
  return getConstructionDomainPlaybook(domainId);
}

export function listConstructionKnowhowRoleIds(): ConstructionKnowhowRoleId[] {
  return [...CONSTRUCTION_KNOWHOW_ROLE_IDS];
}

export function isConstructionKnowhowRoleId(
  value: string,
): value is ConstructionKnowhowRoleId {
  return (CONSTRUCTION_KNOWHOW_ROLE_IDS as readonly string[]).includes(value);
}

export function isConstructionDomainId(value: string): value is ConstructionDomainId {
  return (CONSTRUCTION_DOMAIN_IDS as readonly string[]).includes(value);
}

export function validateConstructionKnowhowRegistry(): {
  ok: boolean;
  missingDomains: ConstructionDomainId[];
  domainsWithoutEvidence: ConstructionDomainId[];
  domainsWithoutRiskRules: ConstructionDomainId[];
  domainsWithoutInternalSources: ConstructionDomainId[];
  rolesWithoutDomain: ConstructionKnowhowRoleId[];
} {
  const registeredDomainIds = new Set(CONSTRUCTION_DOMAIN_PLAYBOOKS.map((pack) => pack.domainId));
  const rolesWithDomain = new Set<ConstructionKnowhowRoleId>();
  for (const pack of CONSTRUCTION_DOMAIN_PLAYBOOKS) {
    pack.roleScopes.forEach((role) => rolesWithDomain.add(role));
  }

  const missingDomains = CONSTRUCTION_DOMAIN_IDS.filter((domainId) => !registeredDomainIds.has(domainId));
  const domainsWithoutEvidence = CONSTRUCTION_DOMAIN_PLAYBOOKS
    .filter((pack) => pack.evidenceRequired !== true)
    .map((pack) => pack.domainId);
  const domainsWithoutRiskRules = CONSTRUCTION_DOMAIN_PLAYBOOKS
    .filter((pack) => pack.riskRules.length === 0)
    .map((pack) => pack.domainId);
  const domainsWithoutInternalSources = CONSTRUCTION_DOMAIN_PLAYBOOKS
    .filter((pack) => pack.internalDataSources.length === 0)
    .map((pack) => pack.domainId);
  const rolesWithoutDomain = CONSTRUCTION_KNOWHOW_ROLE_IDS.filter((role) => !rolesWithDomain.has(role));

  return {
    ok:
      missingDomains.length === 0 &&
      domainsWithoutEvidence.length === 0 &&
      domainsWithoutRiskRules.length === 0 &&
      domainsWithoutInternalSources.length === 0 &&
      rolesWithoutDomain.length === 0,
    missingDomains,
    domainsWithoutEvidence,
    domainsWithoutRiskRules,
    domainsWithoutInternalSources,
    rolesWithoutDomain,
  };
}
