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
export const CANONICAL_LEGACY_OPERATION_DISPLAY_VERSION_V1 = 'fan-five-saved-v4';

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
  // Names are authored for exact historical source IDs, never inferred from titles.
  const names: Readonly<Record<string, unknown>> = binding.resourceNamesByRowId;
  for (const [rowId, name] of Object.entries(names)) {
    if (!saved.has(rowId) || typeof name !== 'string' || name.trim().length === 0
      || name.length > 180) return resources;
  }
  const replacements = new Set<string>(binding.replacementRowIds);
  const titles: Readonly<Record<string, unknown>> = binding.operationTitlesByRowId;
  for (const [rowId, title] of Object.entries(titles)) {
    if (!saved.has(rowId) || replacements.has(rowId) || typeof title !== 'string'
      || title.trim().length === 0 || title.length > 160
      || !canonicalEstimateOperationReference(saved.get(rowId)?.operation)) return resources;
  }
  return resources.map(resource => {
    if (replacements.has(id(resource))) return { ...resource, operation: { ...target } };
    const title = titles[id(resource)];
    if (typeof title !== 'string') return resource;
    const original = canonicalEstimateOperationReference(resource.operation);
    return original ? { ...resource, operation: { ...original, operationTitleRu: title } } : resource;
  });
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

/** Optional readonly caption override. Consumers retain the original source title,
 * specification/details and saved descriptor; an explicit manual title wins. */
export function canonicalLegacyResourceNameV1(
  rowId: string, context?: CanonicalLegacyOperationDisplayContextV1, manualTitleOverride = false,
): string | null {
  if (manualTitleOverride || !context || !Array.isArray(context.savedResources)) return null;
  if (resolveCanonicalLegacyOperationDisplayV1(context.savedResources, context) === context.savedResources) return null;
  const binding = legacyDisplayBindings.entries.find(entry => entry.revisionId === context.revisionId
    && entry.releaseId === context.releaseId && entry.checksumSha256 === context.checksumSha256);
  if (!binding || !Object.hasOwn(binding.resourceNamesByRowId, rowId)) return null;
  const names: Readonly<Record<string, unknown>> = binding.resourceNamesByRowId;
  const name = names[rowId];
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 180 ? name : null;
}

/** One acceptance rule for definition admission and the saved estimate/PDF path.
 * It audits composition; it never calculates quantities, prices or replacements.
 * Independent evidence must name real operations and their expected resources.
 */
export type CanonicalEstimateOperationResourceAcceptanceV1 = Readonly<{
  contractVersion: 'canonical-operation-resource-acceptance/v1';
  status: 'ACCEPTED' | 'COMPOSITION_UNVERIFIED' | 'STRUCTURE_INVALID';
  issues: readonly {code:string;rowId?:string;operationId?:string}[];
  pdfAllowed: boolean;
  definitionAdmissionAllowed: boolean;
  completeClaimAllowed: boolean;
}>;

export function auditCanonicalEstimateOperationResourcesV1(input: Readonly<{
  resources: readonly Readonly<{rowId:string;nameRu:string;unitId:string|null;sourceNameRu?:string;resourceKind?:string|null;
    operation?:unknown;publicNameVerified?:boolean;manualTitleOverride?:boolean;quantityKnown?:boolean}>[];
  independentComposition?:unknown;
  requireIndependentComposition?:boolean;
}>): CanonicalEstimateOperationResourceAcceptanceV1 {
  type Issue = {code:string;rowId?:string;operationId?:string};
  const errors:Issue[]=[],unverified:Issue[]=[];
  const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const text=(v:unknown)=>typeof v==='string'?v.trim():'';
  const key=(v:string)=>v.trim().replace(/\s+/gu,' ').toLocaleLowerCase('ru-RU');
  const kinds=new Set<string>(['MATERIAL','CONSUMABLE','TOOL','ACCESSORY','EQUIPMENT','MECHANISM','LABOR','SERVICE','TRANSPORT','PPE']);
  const physical=new Set(['MATERIAL','CONSUMABLE','TOOL','ACCESSORY','EQUIPMENT','MECHANISM','PPE']);
  const operationBody=(op:CanonicalEstimateOperationReference)=>({contractVersion:op.contractVersion,
    groupId:op.groupId,groupTitleRu:op.groupTitleRu,operationId:op.operationId,
    operationTitleRu:op.operationTitleRu,completionCriterionRu:op.completionCriterionRu,
    processOrdinal:op.processOrdinal??null,processRole:op.processRole??'PROCESS',
    whenResourcePresent:op.whenResourcePresent??[]});
  const sameOperation=(a:CanonicalEstimateOperationReference,b:CanonicalEstimateOperationReference)=>
    canonicalEstimateStableJson(operationBody(a))===canonicalEstimateStableJson(operationBody(b));
  const rows=new Map<string,(typeof input.resources)[number]>(),uses=new Map<string,CanonicalEstimateOperationReference[]>();
  const operations=new Map<string,CanonicalEstimateOperationReference>();
  if(input.resources.length===0)errors.push({code:'RESOURCES_EMPTY'});
  for(const row of input.resources){
    if(!text(row.rowId)||rows.has(row.rowId)){errors.push({code:'RESOURCE_ID_MISSING_OR_DUPLICATED',rowId:row.rowId});continue;}
    rows.set(row.rowId,row);
    // A number without its declared measure cannot be issued as an estimate.
    // Keep the visible partial row; never guess a unit from its title/category.
    if(!text(row.unitId))unverified.push({code:'RESOURCE_UNIT_UNRESOLVED',rowId:row.rowId});
    if(!text(row.nameRu)||row.nameRu.length>180||(!row.manualTitleOverride&&/сверх доказанной поставки|по фактическому основанию|инструмент квалифицированного/iu.test(row.nameRu)))
      errors.push({code:'PUBLIC_RESOURCE_NAME_INVALID',rowId:row.rowId});
    if(!row.manualTitleOverride&&row.publicNameVerified!==true)unverified.push({code:'PUBLIC_RESOURCE_NAME_UNVERIFIED',rowId:row.rowId});
    if(!row.resourceKind||!kinds.has(row.resourceKind))unverified.push({code:'RESOURCE_KIND_UNVERIFIED',rowId:row.rowId});
    const parsedRefs=canonicalEstimateOperationReferences(row.operation);
    const refs=parsedRefs.filter(op=>(!op.whenResourcePresent||op.whenResourcePresent.some(id=>input.resources.some(r=>r.rowId===id)))
      &&op.processRole!=='REFERENCE_ONLY'&&op.processRole!=='COST_SUMMARY');
    uses.set(row.rowId,refs);
    if(refs.length===0)errors.push({code:'RESOURCE_OPERATION_MISSING',rowId:row.rowId});
    if(record(row.operation)&&row.operation.additionalOperations!=null
      &&(!Array.isArray(row.operation.additionalOperations)||parsedRefs.length!==row.operation.additionalOperations.length+1))
      errors.push({code:'RELATED_OPERATION_INVALID_OR_DUPLICATED',rowId:row.rowId});
    for(const op of refs){
      if((physical.has(row.resourceKind??'')||!row.resourceKind)
        &&((!row.manualTitleOverride&&key(op.operationTitleRu)===key(row.nameRu))
          ||Boolean(text(row.sourceNameRu)&&key(op.operationTitleRu)===key(row.sourceNameRu!))))
        errors.push({code:'RESOURCE_USED_AS_OPERATION',rowId:row.rowId,operationId:op.operationId});
      const old=operations.get(op.operationId);
      if(old&&!sameOperation(old,op))errors.push({code:'OPERATION_METADATA_CONFLICT',rowId:row.rowId,operationId:op.operationId});
      else operations.set(op.operationId,op);
    }
  }
  const independent=record(input.independentComposition)?input.independentComposition:null;
  const roster=independent&&Array.isArray(independent.operationRoster)?independent.operationRoster:[];
  const entries=independent&&Array.isArray(independent.entries)?independent.entries:[];
  const evidenceValid=independent?.contract==='rik-expo-app.s26-3.independent-completeness-map.v1'
    &&['NORMATIVE_OPERATION_MAP','TECHNOLOGY_MAP','PRODUCT_SYSTEM_TDS','PROJECT_SYSTEM'].includes(text(independent.sourceKind))
    &&independent.generatedFromCurrentRows===false
    &&/^[a-f0-9]{64}$/u.test(text(independent.evidenceSha256))&&roster.length>0&&entries.length>0;
  if(!evidenceValid)(input.requireIndependentComposition?errors:unverified)
    .push({code:'INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED'});
  else{
    const expectedOps=new Map<string,CanonicalEstimateOperationReference>();
    for(const raw of roster){
      const op=canonicalEstimateOperationReference(raw);
      if(!op||expectedOps.has(op.operationId)){errors.push({code:'INDEPENDENT_OPERATION_ROSTER_INVALID'});continue;}
      expectedOps.set(op.operationId,op);
    }
    for(const [id,op]of operations){
      const expected=expectedOps.get(id);
      if(!expected||!sameOperation(expected,op))errors.push({code:'OPERATION_NOT_IN_INDEPENDENT_ROSTER',operationId:id});
    }
    const declaredRows=new Set<string>(),entryKeys=new Set<string>();
    for(const raw of entries){
      if(!record(raw)||!record(raw.resolution)){errors.push({code:'INDEPENDENT_RESOURCE_ENTRY_INVALID'});continue;}
      const entryKey=text(raw.operationId)+'\u0000'+text(raw.expectedResourceId);
      if(!text(raw.operationId)||!text(raw.expectedResourceId)||!text(raw.condition)||!text(raw.sourceId)||entryKeys.has(entryKey))
        errors.push({code:'INDEPENDENT_RESOURCE_ENTRY_AUTHORITY_INVALID'});
      entryKeys.add(entryKey);
      if(!expectedOps.has(text(raw.operationId)))errors.push({code:'INDEPENDENT_RESOURCE_OPERATION_UNKNOWN',operationId:text(raw.operationId)});
      if(!['ROW','INCLUDED_COMPONENT_ROW','INCLUDED_IN_PARENT','NOT_APPLICABLE'].includes(text(raw.resolution.kind))){
        errors.push({code:'INDEPENDENT_RESOURCE_RESOLUTION_INVALID'});continue;
      }
      if(raw.resolution.kind==='NOT_APPLICABLE'){
        if(!text(raw.resolution.reasonRu)||!text(raw.sourceId))errors.push({code:'RESOURCE_NOT_APPLICABLE_WITHOUT_EVIDENCE'});
        continue;
      }
      const rowId=text(raw.resolution.rowId??raw.resolution.parentRowId),row=rows.get(rowId);
      if(!row){errors.push({code:'REQUIRED_RESOURCE_MISSING',rowId});continue;}
      declaredRows.add(rowId);
      const required=raw.requiredOperationIds;
      if(!Array.isArray(required)||required.length===0||required.some(id=>!text(id)||!expectedOps.has(String(id))))
        errors.push({code:'REQUIRED_OPERATION_DECLARATION_INVALID',rowId});
      else if(!required.includes(raw.operationId))errors.push({code:'INDEPENDENT_RESOURCE_PRIMARY_USE_MISSING',rowId,operationId:text(raw.operationId)});
      else for(const id of required){
        if(!uses.get(rowId)?.some(op=>op.operationId===id))errors.push({code:'REQUIRED_RESOURCE_OPERATION_MISSING',rowId,operationId:String(id)});
      }
      if(!text(raw.publicNameRu)||!kinds.has(text(raw.resourceKind)))unverified.push({code:'INDEPENDENT_RESOURCE_PRESENTATION_UNVERIFIED',rowId});
      else if((!row.manualTitleOverride&&row.nameRu!==raw.publicNameRu)||row.resourceKind!==raw.resourceKind)
        errors.push({code:'RESOURCE_PRESENTATION_SOURCE_MISMATCH',rowId});
    }
    for(const row of rows.values())if(!declaredRows.has(row.rowId))
      errors.push({code:'RESOURCE_NOT_IN_INDEPENDENT_COMPOSITION',rowId:row.rowId});
    for(const [id,op]of expectedOps)if(op.processRole!=='REFERENCE_ONLY'&&op.processRole!=='COST_SUMMARY'&&!operations.has(id))errors.push({code:'REQUIRED_OPERATION_WITHOUT_RESOURCES',operationId:id});
    // A row list alone cannot prove completeness: the author must review every
    // resource class for each real operation, including documented exclusions.
    const reviews=Array.isArray(independent?.operationRequirements)?independent.operationRequirements:[];
    const reviewed=new Set<string>();
    for(const review of reviews){
      if(!record(review)||!expectedOps.has(text(review.operationId))||reviewed.has(text(review.operationId))
        ||!text(review.sourceId)||!record(review.requirements)){
        errors.push({code:'OPERATION_RESOURCE_REQUIREMENTS_INVALID'});continue;
      }
      const operationId=text(review.operationId);reviewed.add(operationId);
      for(const resourceKind of kinds){
        const requirement=review.requirements[resourceKind];
        if(!record(requirement)||!['REQUIRED','NOT_APPLICABLE','UNRESOLVED'].includes(text(requirement.status))){
          unverified.push({code:'OPERATION_RESOURCE_CLASS_UNVERIFIED_'+resourceKind,operationId});continue;
        }
        if(requirement.status==='NOT_APPLICABLE'){
          if(!text(requirement.reasonRu))errors.push({code:'RESOURCE_CLASS_NOT_APPLICABLE_WITHOUT_REASON',operationId});
          if([...rows.values()].some(row=>row.resourceKind===resourceKind&&uses.get(row.rowId)?.some(op=>op.operationId===operationId)))
            errors.push({code:'RESOURCE_CLASS_NOT_APPLICABLE_CONFLICT',operationId});
          continue;
        }
        if(!Array.isArray(requirement.rowIds)||requirement.rowIds.length===0){
          errors.push({code:'REQUIRED_RESOURCE_CLASS_WITHOUT_VISIBLE_ROWS',operationId});continue;
        }
        for(const value of requirement.rowIds){
          const rowId=text(value),row=rows.get(rowId);
          if(!row||row.resourceKind!==resourceKind||!uses.get(rowId)?.some(op=>op.operationId===operationId))
            errors.push({code:'REQUIRED_RESOURCE_CLASS_BINDING_MISSING',rowId,operationId});
        }
        if(requirement.status==='UNRESOLVED')unverified.push({code:'OPERATION_RESOURCE_CLASS_UNRESOLVED_'+resourceKind,operationId});
      }
    }
    for(const [operationId,op]of expectedOps)if(op.processRole!=='REFERENCE_ONLY'&&op.processRole!=='COST_SUMMARY'&&!reviewed.has(operationId))
      unverified.push({code:'OPERATION_RESOURCE_REQUIREMENTS_UNVERIFIED',operationId});
  }
  const quantityUnknown=input.resources.some(row=>row.quantityKnown===false);
  if(quantityUnknown)unverified.push({code:'RESOURCE_QUANTITY_UNRESOLVED'});
  const status=errors.length?'STRUCTURE_INVALID':unverified.length?'COMPOSITION_UNVERIFIED':'ACCEPTED';
  const unresolvedOnly=(issue:Issue)=>issue.code==='RESOURCE_QUANTITY_UNRESOLVED'||issue.code==='RESOURCE_UNIT_UNRESOLVED'
    ||issue.code.startsWith('OPERATION_RESOURCE_CLASS_UNRESOLVED_');
  return{contractVersion:'canonical-operation-resource-acceptance/v1',status,issues:[...errors,...unverified],
    // A partial definition may remain visible for authoring, but issuing a PDF
    // requires reviewed operation composition. Unknown numeric quantities are
    // the sole permitted unresolved condition; they never imply completeness.
    pdfAllowed:errors.length===0&&unverified.every(issue=>issue.code==='RESOURCE_QUANTITY_UNRESOLVED'),
    definitionAdmissionAllowed:errors.length===0&&unverified.every(unresolvedOnly),
    // This is a necessary composition condition. Existing source, quantity,
    // engineering and money acceptance remain mandatory for a complete estimate.
    completeClaimAllowed:errors.length===0&&unverified.length===0};
}

