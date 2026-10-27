import type { AiAppActionDomain, AiAppBusinessEntity } from "../appGraph/aiAppActionTypes";
import type { AiUserRole } from "../policy/aiRolePolicy";

export type AiDomainEntityEntry = {
  entity: AiAppBusinessEntity | "project_estimate";
  domains: readonly AiAppActionDomain[];
  readableByRoles: readonly AiUserRole[];
  evidenceRequired: true;
  rawRowsAllowed: false;
  sensitive: "none" | "redact_ids" | "redact_finance" | "own_records_only";
};

export type AiDomainRelationshipEntry = {
  from: AiDomainEntityEntry["entity"];
  to: AiDomainEntityEntry["entity"];
  relationship: string;
  evidenceRequired: true;
};

export type AiDomainGraphResolveResult = {
  entity: AiDomainEntityEntry | null;
  relationships: readonly AiDomainRelationshipEntry[];
  allowed: boolean;
  roleScoped: true;
  evidenceRequired: true;
  rawRowsAllowed: false;
  reason: string;
};
