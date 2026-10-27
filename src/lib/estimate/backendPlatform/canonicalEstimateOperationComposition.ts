import type {CanonicalPublicResourceKindV1} from './canonicalPublicResourcePresentationV1';
import legacyDisplayBindings from '../../../../data/estimate-benchmarks/source-packs/legacy-operation-display-five-saved-v1.json';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import { groupCanonicalScopeRequirementsV1, type CanonicalScopeRequirementDecisionV1,
  type CanonicalScopeRequirementGroupV1 } from './canonicalScopeRequirementV1';
export type CanonicalEstimateOperationReference = {
  contractVersion: "canonical-operation-resource/v1";
  groupId: string;
  groupTitleRu: string;
  operationId: string;
  operationTitleRu: string;
  completionCriterionRu: string;
  processOrdinal?: number;
  processRole?: "PROCESS" | "REFERENCE_ONLY" | "COST_SUMMARY";
  whenResourcePresent?: readonly string[];
  additionalOperations?: readonly {
    operationId: string;
    operationTitleRu: string;
    completionCriterionRu: string;
    processOrdinal?: number;
    processRole?: "PROCESS" | "REFERENCE_ONLY" | "COST_SUMMARY";
    whenResourcePresent?: readonly string[];
  }[];
};

export function canonicalEstimateOperationReference(value: unknown): CanonicalEstimateOperationReference | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const keys = ["groupId", "groupTitleRu", "operationId", "operationTitleRu", "completionCriterionRu"] as const;
  if (candidate.contractVersion !== "canonical-operation-resource/v1"
    || keys.some(key => typeof candidate[key] !== "string" || !String(candidate[key]).trim())) return null;
  if (candidate.whenResourcePresent != null && (!Array.isArray(candidate.whenResourcePresent)
    || candidate.whenResourcePresent.length === 0 || candidate.whenResourcePresent.length > 64
    || candidate.whenResourcePresent.some(id => typeof id !== 'string' || !id.trim())
    || new Set(candidate.whenResourcePresent).size !== candidate.whenResourcePresent.length)) return null;
  return candidate as CanonicalEstimateOperationReference;
}

/** References share the primary operation's instance; they do not create
 * resource rows, quantities, or another cost owner. Legacy references remain
 * singular, and malformed related operations are ignored. */
export function canonicalEstimateOperationReferences(value: unknown): CanonicalEstimateOperationReference[] {
  const primary = canonicalEstimateOperationReference(value);
  if (!primary) return [];
  const references = [primary];
  const seen = new Set([primary.operationId]);
  if (Array.isArray(primary.additionalOperations)) for (const related of primary.additionalOperations) {
    if (!related || typeof related !== 'object' || Array.isArray(related)) continue;
    const relatedGroupId = (related as unknown as Record<string, unknown>).groupId;
    if (relatedGroupId != null && relatedGroupId !== primary.groupId) continue;
    const reference = canonicalEstimateOperationReference({
      contractVersion: primary.contractVersion, groupId: primary.groupId, groupTitleRu: primary.groupTitleRu,
      operationId: related.operationId, operationTitleRu: related.operationTitleRu,
      completionCriterionRu: related.completionCriterionRu,
      ...(related.processOrdinal !== undefined ? { processOrdinal: related.processOrdinal } : {}),
      ...(related.processRole !== undefined ? { processRole: related.processRole } : {}),
      ...(related.whenResourcePresent !== undefined ? { whenResourcePresent: related.whenResourcePresent } : {}),
    });
    if (!reference || seen.has(reference.operationId)) continue;
    references.push(reference); seen.add(reference.operationId);
  }
  return references;
}

export type CanonicalLegacyOperationDisplayResourceV1 = {
  rowId: string; sourceRowId?: string; operation: unknown;
};
export type CanonicalLegacyOperationDisplayContextV1 = {
  revisionId: string;
  releaseId: string;
  checksumSha256: string;
  /** Complete immutable saved rows plus preliminary needs, before display filters. */
  savedResources: readonly CanonicalLegacyOperationDisplayResourceV1[];
};
export const CANONICAL_LEGACY_OPERATION_DISPLAY_VERSION_V1 = 'fan-five-saved-v2';

/** Exact historical display links only. The saved graph and all row fields stay
 * untouched. Missing identity, membership or source relation returns the input. */
export function resolveCanonicalLegacyOperationDisplayV1<T extends CanonicalLegacyOperationDisplayResourceV1>(
  resources: readonly T[], context?: CanonicalLegacyOperationDisplayContextV1,
): readonly T[] {
  if (!context || !Array.isArray(context.savedResources) || legacyDisplayBindings.contractVersion !== 'canonical-legacy-operation-display/v1'
    || legacyDisplayBindings.version !== CANONICAL_LEGACY_OPERATION_DISPLAY_VERSION_V1) return resources;
  const binding = legacyDisplayBindings.entries.find(entry => entry.revisionId === context.revisionId
    && entry.releaseId === context.releaseId && entry.checksumSha256 === context.checksumSha256);
  if (!binding || context.savedResources.length !== binding.expectedResources.length
    || resources.length > binding.expectedResources.length) return resources;
  const validResource = (resource: CanonicalLegacyOperationDisplayResourceV1) => resource != null
    && typeof resource === 'object' && !Array.isArray(resource) && typeof resource.rowId === 'string'
    && resource.rowId.length > 0 && (resource.sourceRowId === undefined
      || typeof resource.sourceRowId === 'string' && resource.sourceRowId.length > 0);
  if (!context.savedResources.every(validResource) || !resources.every(validResource)) return resources;
  const id = (resource: CanonicalLegacyOperationDisplayResourceV1) => resource.sourceRowId ?? resource.rowId;
  const saved = new Map(context.savedResources.map(resource => [id(resource), resource]));
  if (saved.size !== context.savedResources.length) return resources;
  const same = (a: unknown, b: unknown) => canonicalEstimateStableJson(a ?? null) === canonicalEstimateStableJson(b ?? null);
  for (const expected of binding.expectedResources) {
    const resource = saved.get(expected.rowId);
    if (!resource || !same(resource.operation, expected.operation)) return resources;
  }
  const target = canonicalEstimateOperationReference(binding.target);
  if (!target || !context.savedResources.some(resource => canonicalEstimateOperationReferences(resource.operation)
    .some(reference => same(reference, target)))) return resources;
  // Also bind every requested display record to its verified original relation.
  // A filtered view may omit rows, but may not substitute or duplicate them.
  if (new Set(resources.map(id)).size !== resources.length
    || resources.some(resource => !saved.has(id(resource))
      || !same(resource.operation, saved.get(id(resource))?.operation))) return resources;
  const replacements = new Set<string>(binding.replacementRowIds);
  return resources.map(resource => replacements.has(id(resource)) ? { ...resource, operation: { ...target } } : resource);
}

/** Optional display-only kind override; the original descriptor is never edited.
 * Reuse the operation resolver's complete identity and membership admission. */
export function canonicalLegacyResourceKindV1(
  rowId: string, context?: CanonicalLegacyOperationDisplayContextV1,
): CanonicalPublicResourceKindV1 | null {
  if (!context || !Array.isArray(context.savedResources)) return null;
  const resources = context.savedResources;
  if (resolveCanonicalLegacyOperationDisplayV1(resources, context) === resources) return null;
  const binding = legacyDisplayBindings.entries.find(entry => entry.revisionId === context.revisionId
    && entry.releaseId === context.releaseId && entry.checksumSha256 === context.checksumSha256);
  if (!binding || !Object.hasOwn(binding.resourceKindsByRowId, rowId)) return null;
  const kinds: Readonly<Record<string, unknown>> = binding.resourceKindsByRowId;
  const kind = kinds[rowId];
  switch (kind) {
    case 'MATERIAL': case 'CONSUMABLE': case 'TOOL': case 'ACCESSORY': case 'EQUIPMENT':
    case 'MECHANISM': case 'LABOR': case 'SERVICE': case 'TRANSPORT': case 'PPE': return kind;
    default: return null;
  }
}

export type CanonicalEstimateResourceOperationSection = {
  key: string;
  operation: CanonicalEstimateOperationReference | null;
  resourceIds: string[];
  sharedResources: { rowId: string; titleRu: string; ownerOperationTitleRu: string }[];
  scopeRequirements?: CanonicalScopeRequirementGroupV1[];
  physicallyExcluded?: boolean;
};

/** UI and documents use only the immutable revision's declared relationships.
 * Related operations get a reference to the primary owner, never a second row. */
export function canonicalEstimateResourceOperationSections(
  resources: readonly { rowId: string; sourceRowId?: string; operation: unknown; titleRu: string; sourceOperation?: unknown; excludedOperationKeys?: readonly string[] }[],
  scopeDecisions: readonly CanonicalScopeRequirementDecisionV1[] = [],
  scopeResourceOperations: readonly {rowId:string;operation:unknown}[] = [],
  legacyDisplayContext?: CanonicalLegacyOperationDisplayContextV1,
): CanonicalEstimateResourceOperationSection[] {
  resources = resolveCanonicalLegacyOperationDisplayV1(resources, legacyDisplayContext);
  const sections = new Map<string, CanonicalEstimateResourceOperationSection>();
  const presentResourceIds = new Set(resources.flatMap(resource => [resource.rowId,...(resource.sourceRowId?[resource.sourceRowId]:[])]));
  const keyOf = (reference: CanonicalEstimateOperationReference | null) => reference
    ? JSON.stringify([reference.groupId, reference.operationId]) : 'general';
  const obtain = (operation: CanonicalEstimateOperationReference | null) => {
    const key = keyOf(operation);
    let section = sections.get(key);
    if (!section) {
      section = { key, operation, resourceIds: [], sharedResources: [] };
      sections.set(key, section);
    }
    return section;
  };
  for (const resource of resources) {
    const [primary, ...related] = canonicalEstimateOperationReferences(resource.operation);
    const owner = obtain(primary ?? null);
    if (!owner.resourceIds.includes(resource.rowId)) owner.resourceIds.push(resource.rowId);
    for (const reference of related) {
      if (reference.whenResourcePresent && !reference.whenResourcePresent.some(id => presentResourceIds.has(id))) continue;
      const section = obtain(reference);
      if (!section.sharedResources.some(shared => shared.rowId === resource.rowId)) {
        section.sharedResources.push({ rowId: resource.rowId, titleRu: resource.titleRu,
          ownerOperationTitleRu: primary.operationTitleRu });
      }
    }
    for(const reference of canonicalEstimateOperationReferences(resource.sourceOperation)) {
      if(resource.excludedOperationKeys?.includes(keyOf(reference))) obtain(reference).physicallyExcluded=true;
    }
  }
  // Saved obligations live beside their resources in the BOQ. They do not
  // become quantity rows or new cost owners. Completed preparation remains
  // visible at its own stage, with no repeated execution charge.
  const resourceOwner = new Map(resources.map(resource => [resource.rowId,
    canonicalEstimateOperationReference(resource.operation)]));
  const scopeSourceOwners=new Map(scopeResourceOperations.map(resource=>[resource.rowId,
    canonicalEstimateOperationReference(resource.operation)]));
  for (const group of groupCanonicalScopeRequirementsV1(scopeDecisions)) {
    if (group.statuses.every(status => status === 'NOT_APPLICABLE')) continue;
    const decisions = scopeDecisions.filter(decision => decision.groupId === group.groupId);
    const covering = decisions.flatMap(decision => decision.coveringRowIds);
    const coveredOwner = group.statuses.every(status => status === 'INCLUDED')
      || (decisions.every(decision=>decision.kind==='INCLUDED')
        && group.statuses.every(status=>['USER_EXCLUDED','REQUIRED_RESOURCE_EXCLUDED','OBJECT_FACT_REQUIRED'].includes(status)))
      ? covering.map(id => resourceOwner.get(id)).find(Boolean) : null;
    // A source-declared group can have applicability and cost-coverage checks
    // together. Attach them to its unambiguous existing owner, using stable
    // IDs; do not emit a second empty stage merely because a check completed.
    const declaredOwners=[...new Map(resources.flatMap(resource=>{
      const owner=resourceOwner.get(resource.rowId);
      return owner?.groupId===group.groupId?[[keyOf(owner),owner] as const]:[];
    })).values()];
    const coveringOwners=[...new Map(covering.flatMap(id=>{
      const owner=resourceOwner.get(id);return owner?.groupId===group.groupId?[[keyOf(owner),owner] as const]:[];
    })).values()];
    const declaredOwner=coveringOwners.length===1?coveringOwners[0]:declaredOwners.length===1?declaredOwners[0]:null;
    // Scope rows are omitted from quantity rows, but retain their own authored
    // operation. Use it only when every obligation in this group declares the
    // same operation; ambiguity must never borrow an unrelated stage.
    const sourceDeclarations=decisions.map(decision=>scopeSourceOwners.get(decision.rowId));
    const sourceOwners=[...new Map(sourceDeclarations.flatMap(owner=>owner?[[keyOf(owner),owner] as const]:[])).values()];
    const sourceOwner=sourceDeclarations.length>0&&sourceDeclarations.every(Boolean)&&sourceOwners.length===1?sourceOwners[0]:null;
    const operation: CanonicalEstimateOperationReference = coveredOwner ?? sourceOwner ?? declaredOwner ?? {
      contractVersion: 'canonical-operation-resource/v1', groupId: 'saved-scope-stages',
      groupTitleRu: 'Подработы и ресурсы выбранной работы', operationId: group.groupId,
      operationTitleRu: group.titleRu, completionCriterionRu: group.detailsRu.join(' '),
      processRole: group.statuses.every(status => status === 'FINANCIAL_POLICY') ? 'COST_SUMMARY' : 'PROCESS',
    };
    const section = obtain(operation);
    section.scopeRequirements = [...(section.scopeRequirements ?? []), group];
  }
  const groupOrder = new Map<string, number>();
  for (const section of sections.values()) {
    const groupId = section.operation?.groupId ?? 'general';
    if (!groupOrder.has(groupId)) groupOrder.set(groupId, groupOrder.size);
  }
  // These source-owned companion stages declare the same roof sequence.
  // Storage order keeps old immutable row identities; presentation shows the
  // planned primer before torching. Other groups retain their existing slots:
  // ordinals from unrelated work groups are not a global construction sequence.
  const roofIds=new Set(['roof:cement-screed15:krer12-017-01', 'roof:metal-trim:krer12-010-01','roof:vapor:krer12-015-03','roof:clay-insulation:krer12-014-02','roof:hanging-gutters:krer12-009-02','roof:prime-ready-emulsion:krer12-016-02','roof:torch-two:krer12-002-09','roof:valley-torch-two:krer12-005-03']);
  const roofSequence=new Map<string,number>();
  for(const id of groupOrder.keys())if(roofIds.has(id)){
    const operations=[...sections.values()].filter(s=>s.operation?.groupId===id).map(s=>s.operation!).concat(
      resources.flatMap(resource=>[...canonicalEstimateOperationReferences(resource.operation),
        ...canonicalEstimateOperationReferences(resource.sourceOperation)]).filter(operation=>operation.groupId===id));
    if(operations.every(operation=>operation.operationId===id+':installation'
      &&typeof operation.processOrdinal==='number'&&Number.isFinite(operation.processOrdinal)&&operation.processOrdinal>=0)
      &&new Set(operations.map(operation=>operation.processOrdinal)).size===1)
      roofSequence.set(id,operations[0]!.processOrdinal!);
  }
  const roofGroups=[...roofSequence.keys()];
  if(roofGroups.includes('roof:torch-two:krer12-002-09')){
    const slots=roofGroups.map(id=>groupOrder.get(id)!).sort((a,b)=>a-b);
    roofGroups.sort((a,b)=>roofSequence.get(a)!-roofSequence.get(b)!);
    roofGroups.forEach((id,index)=>groupOrder.set(id,slots[index]!));
  }
  return [...sections.values()].map((section, index) => ({ section, index }))
    .sort((a, b) => {
      const ordinal = (entry: typeof a) => typeof entry.section.operation?.processOrdinal === 'number'
        && Number.isFinite(entry.section.operation.processOrdinal) ? entry.section.operation.processOrdinal : entry.index;
      return groupOrder.get(a.section.operation?.groupId ?? 'general')! - groupOrder.get(b.section.operation?.groupId ?? 'general')!
        || ordinal(a) - ordinal(b) || a.index - b.index;
    }).map(entry => entry.section);
}

export type CanonicalEstimateWorkProcessGroup = {
  groupId: string;
  groupTitleRu: string;
  sequenceUnspecified?: boolean;
  operations: {
    operationId: string;
    operationTitleRu: string;
    completionCriterionRu: string;
    resourceIds: string[];
    sharedResources?: { rowId: string; titleRu: string }[];
  }[];
};

/** A presentation of saved operation ownership, with no new rows or costs. */
export function canonicalEstimateWorkProcess(
  resources: readonly { rowId: string; sourceRowId?: string; operation: unknown; titleRu?: string; category?: string; costTreatment?: string }[],
  _mainWorkTitleRu = "Основная работа",
  legacyDisplayContext?: CanonicalLegacyOperationDisplayContextV1,
): CanonicalEstimateWorkProcessGroup[] {
  resources = resolveCanonicalLegacyOperationDisplayV1(resources, legacyDisplayContext);
  const presentResourceIds = new Set(resources.flatMap(resource => [resource.rowId,...(resource.sourceRowId?[resource.sourceRowId]:[])]));
  const groups = new Map<string, {
    group: CanonicalEstimateWorkProcessGroup;
    operations: Map<string, { value: CanonicalEstimateWorkProcessGroup["operations"][number]; ordinal: number; firstSeen: number }>;
  }>();
  for (const resource of resources) {
    // Only the saved source relationship declares a process step. An unbound
    // work row remains a resource in the general section, not a new operation.
    for (const reference of canonicalEstimateOperationReferences(resource.operation)) {
      if (reference.whenResourcePresent && !reference.whenResourcePresent.some(id => presentResourceIds.has(id))) continue;
      if (reference.processRole === "REFERENCE_ONLY" || reference.processRole === "COST_SUMMARY") continue;
      let entry = groups.get(reference.groupId);
      const sequenceUnspecified = reference.processRole !== 'PROCESS'
        || typeof reference.processOrdinal !== 'number' || !Number.isFinite(reference.processOrdinal);
      if (!entry) {
        entry = { group: { groupId: reference.groupId, groupTitleRu: reference.groupTitleRu,
          ...(sequenceUnspecified ? { sequenceUnspecified: true } : {}), operations: [] }, operations: new Map() };
        groups.set(reference.groupId, entry);
      }
      if (sequenceUnspecified) entry.group.sequenceUnspecified = true;
      let operation = entry.operations.get(reference.operationId);
      if (!operation) {
        operation = {
          value: { operationId: reference.operationId, operationTitleRu: reference.operationTitleRu,
            completionCriterionRu: reference.completionCriterionRu, resourceIds: [] },
          ordinal: typeof reference.processOrdinal === "number" && Number.isFinite(reference.processOrdinal)
            ? reference.processOrdinal : entry.operations.size,
          firstSeen: entry.operations.size,
        };
        entry.operations.set(reference.operationId, operation);
      }
      if (!operation.value.resourceIds.includes(resource.rowId)) operation.value.resourceIds.push(resource.rowId);
    }
  }
  const titles = new Map(resources.map(resource => [resource.rowId, resource.titleRu?.trim()]));
  return [...groups.values()].map(entry => {
    const uses = new Map<string, number>();
    for (const operation of entry.operations.values()) for (const id of operation.value.resourceIds) uses.set(id, (uses.get(id) ?? 0) + 1);
    return { ...entry.group,
      operations: [...entry.operations.values()].sort((a, b) => a.ordinal - b.ordinal || a.firstSeen - b.firstSeen).map(operation => {
        const sharedResources = operation.value.resourceIds.flatMap(rowId => {
          const titleRu = titles.get(rowId);
          return (uses.get(rowId) ?? 0) > 1 && titleRu ? [{ rowId, titleRu }] : [];
        });
        return { ...operation.value, ...(sharedResources.length ? { sharedResources } : {}) };
      }),
    };
  });
}
