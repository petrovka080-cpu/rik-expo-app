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
  additionalOperations?: readonly {
    operationId: string;
    operationTitleRu: string;
    completionCriterionRu: string;
    processOrdinal?: number;
    processRole?: "PROCESS" | "REFERENCE_ONLY" | "COST_SUMMARY";
  }[];
};

export function canonicalEstimateOperationReference(value: unknown): CanonicalEstimateOperationReference | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const keys = ["groupId", "groupTitleRu", "operationId", "operationTitleRu", "completionCriterionRu"] as const;
  if (candidate.contractVersion !== "canonical-operation-resource/v1"
    || keys.some(key => typeof candidate[key] !== "string" || !String(candidate[key]).trim())) return null;
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
      processOrdinal: related.processOrdinal, processRole: related.processRole,
    });
    if (!reference || seen.has(reference.operationId)) continue;
    references.push(reference); seen.add(reference.operationId);
  }
  return references;
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
  resources: readonly { rowId: string; operation: unknown; titleRu: string; sourceOperation?: unknown; excludedOperationKeys?: readonly string[] }[],
  scopeDecisions: readonly CanonicalScopeRequirementDecisionV1[] = [],
): CanonicalEstimateResourceOperationSection[] {
  const sections = new Map<string, CanonicalEstimateResourceOperationSection>();
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
  for (const group of groupCanonicalScopeRequirementsV1(scopeDecisions)) {
    if (group.statuses.every(status => status === 'NOT_APPLICABLE')) continue;
    const decisions = scopeDecisions.filter(decision => decision.groupId === group.groupId);
    const covering = decisions.flatMap(decision => decision.coveringRowIds);
    const coveredOwner = group.statuses.every(status => status === 'INCLUDED')
      ? covering.map(id => resourceOwner.get(id)).find(Boolean) : null;
    const operation: CanonicalEstimateOperationReference = coveredOwner ?? {
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
  resources: readonly { rowId: string; operation: unknown; titleRu?: string; category?: string; costTreatment?: string }[],
  mainWorkTitleRu = "Основная работа",
): CanonicalEstimateWorkProcessGroup[] {
  const resourceBucketTitles = new Set([
    'Материалы, оснащение и совместимая поставка',
    'Готовые операции, граница и контроль',
    'Готовая применимая операция и её раскрытые ресурсы',
    'Поставка и оснащение',
    'Фактические механизмы',
    'Объём, контроль и логистика',
    'Материалы и оснащение',
    'Раскройное оборудование',
    'Граница, контроль и доставка',
  ]);
  const groups = new Map<string, {
    group: CanonicalEstimateWorkProcessGroup;
    operations: Map<string, { value: CanonicalEstimateWorkProcessGroup["operations"][number]; ordinal: number; firstSeen: number }>;
  }>();
  for (const resource of resources) {
    const declaredReferences = canonicalEstimateOperationReferences(resource.operation);
    for (let reference of declaredReferences.length ? declaredReferences : [null]) {
      if (reference?.processRole === "REFERENCE_ONLY" || reference?.processRole === "COST_SUMMARY") continue;
      // Legacy buckets describe resource categories, not an execution step.
      if (reference && resourceBucketTitles.has(reference.operationTitleRu)) reference = null;
      const fallback = reference == null;
      if (!reference) {
        if (!['construction_work', 'work', 'labor'].includes(resource.category ?? '')
          || ['INFORMATIONAL_SCOPE', 'INCLUDED_IN_RESOURCE_ROWS', 'CONTROL_OR_DOCUMENT'].includes(resource.costTreatment ?? '')
          || !resource.titleRu?.trim()) continue;
        reference = { contractVersion: 'canonical-operation-resource/v1', groupId: 'saved-work-items',
          groupTitleRu: mainWorkTitleRu, operationId: resource.rowId,
          operationTitleRu: resource.titleRu.trim(), completionCriterionRu: 'Порядок выполнения следует уточнить по составу работ',
        };
      }
      let entry = groups.get(reference.groupId);
      const sequenceUnspecified = fallback || reference.processRole !== 'PROCESS'
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
