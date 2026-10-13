import type { StructuredEstimateParameterRequirement } from "../estimateStructuredPipeline/structuredEstimateTypes";

export type CanonicalParameterRequirementTable = {
  contractVersion: "canonical-parameter-requirements/v1";
  revisionId: string;
  releaseId: string;
  parameterSchemaHash: string | null;
  requirementsById: Record<string, StructuredEstimateParameterRequirement>;
};

export type CanonicalParameterRequirementTables = Record<string, CanonicalParameterRequirementTable>;

type Carrier = { sourceParameters?: Readonly<Record<string, unknown>> | null };

/** The protected unknown quantity stays unresolved. Only this authored scope
 * question has a fact-checking instruction rather than a missing norm. */
export function consumerCanonicalApplicationScopeRequirementNotice(
  requirement: Readonly<Record<string, unknown>>,
): string | null {
  return requirement.parameterId === 'betogrund_undetermined_need_kg'
    && requirement.visibilityRole === 'INTERNAL_ONLY'
    && requirement.valueSourceRole === 'UNRESOLVED_APPLICATION_NORM'
    && requirement.sourceConfirmationRequired === true
    && typeof requirement.guideShortRu === 'string' && requirement.guideShortRu.trim()
    ? requirement.guideShortRu.trim() : null;
}

/** Display labels use the immutable revision's shared schema, including known
 * quantities. This does not change missing-input or editing authority. */
export function consumerCanonicalParameterTitle(
  item: Carrier,
  parameterId: string,
  tables?: CanonicalParameterRequirementTables | null,
): string | null {
  const source = item.sourceParameters ?? {};
  const revisionId = String(source.canonicalBackendRevisionId ?? '');
  const releaseId = String(source.canonicalBackendReleaseId ?? '');
  const table = tables?.[revisionId];
  if (!revisionId || !releaseId || table?.contractVersion !== 'canonical-parameter-requirements/v1'
    || table.revisionId !== revisionId || table.releaseId !== releaseId) return null;
  const reference = source.canonicalParameterRequirementReference as Partial<CanonicalParameterRequirementTable> | undefined;
  if (reference && (reference.contractVersion !== table.contractVersion || reference.revisionId !== revisionId
    || reference.releaseId !== releaseId || reference.parameterSchemaHash !== table.parameterSchemaHash)) return null;
  const parameter = table.requirementsById[parameterId];
  return parameter?.parameterId === parameterId && typeof parameter.titleRu === 'string' && parameter.titleRu.trim()
    ? parameter.titleRu.trim() : null;
}

/** Legacy inline requirements remain readable. New rows resolve the shared table only for their exact revision. */
export function consumerCanonicalMissingRequirements(
  item: Carrier,
  tables?: CanonicalParameterRequirementTables | null,
): Readonly<Record<string, unknown>>[] {
  const source = item.sourceParameters ?? {};
  if (Array.isArray(source.missingParameterRequirements)) {
    return source.missingParameterRequirements.filter((value): value is Record<string, unknown> =>
      value != null && typeof value === "object" && !Array.isArray(value) && value.optionalScopeChoice!==true);
  }
  const reference = source.canonicalParameterRequirementReference as Partial<CanonicalParameterRequirementTable> | undefined;
  const revisionId = String(source.canonicalBackendRevisionId ?? "");
  const releaseId = String(source.canonicalBackendReleaseId ?? "");
  const table = tables?.[revisionId];
  const validTable = reference?.contractVersion === "canonical-parameter-requirements/v1"
    && table?.contractVersion === reference.contractVersion
    && reference.revisionId === revisionId && table.revisionId === revisionId
    && reference.releaseId === releaseId && table.releaseId === releaseId
    && reference.parameterSchemaHash === table.parameterSchemaHash;
  const sourceManagedIds = new Set(Array.isArray(source.sourceManagedMissingParameterIds)
    ? source.sourceManagedMissingParameterIds : []);
  return (Array.isArray(source.missingParameterIds) ? source.missingParameterIds : []).flatMap((id) => {
    if (typeof id !== "string") return [];
    const requirement = validTable ? table?.requirementsById?.[id] : undefined;
    if(requirement?.parameterId===id && requirement.optionalScopeChoice===true) return [];
    // A missing table must not make a source-managed quantity editable or erase its question.
    return [requirement?.parameterId === id && requirement.sourceConfirmationRequired === sourceManagedIds.has(id) ? requirement : {
      parameterId: id, titleRu: id, sourceConfirmationRequired: sourceManagedIds.has(id),
    }];
  });
}
