import type { AiUserRole } from "../policy/aiRolePolicy";
import { getAiDomainEntityEntry } from "./aiDomainEntityRegistry";
import { listAiDomainRelationshipsForEntity } from "./aiDomainRelationshipRegistry";
import type { AiDomainEntityEntry, AiDomainGraphResolveResult } from "./aiDomainEntityTypes";

export function resolveAiDomainGraphEntity(params: {
  role: AiUserRole;
  entity: AiDomainEntityEntry["entity"];
}): AiDomainGraphResolveResult {
  const entity = getAiDomainEntityEntry(params.entity);
  if (!entity) {
    return {
      entity: null,
      relationships: [],
      allowed: false,
      roleScoped: true,
      evidenceRequired: true,
      rawRowsAllowed: false,
      reason: "Domain entity is not registered.",
    };
  }

  if (params.role === "unknown" || !entity.readableByRoles.includes(params.role)) {
    return {
      entity,
      relationships: [],
      allowed: false,
      roleScoped: true,
      evidenceRequired: true,
      rawRowsAllowed: false,
      reason: "Role cannot read this domain entity.",
    };
  }

  return {
    entity,
    relationships: listAiDomainRelationshipsForEntity(entity.entity),
    allowed: true,
    roleScoped: true,
    evidenceRequired: true,
    rawRowsAllowed: false,
    reason: "Domain entity graph resolved with role-scoped metadata only.",
  };
}
