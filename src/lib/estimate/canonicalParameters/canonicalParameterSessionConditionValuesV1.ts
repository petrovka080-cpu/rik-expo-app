import type { CanonicalParameter, CanonicalParameterSession, CanonicalParameterValue } from './canonicalParameterCore';
import { resolveCanonicalSourceProfileSelectionV1, type CanonicalSourceProfileParameterV1,
  type CanonicalSourceProfileSelectionV1 } from '../backendPlatform/canonicalSourceProfileSelectionV1';

/** Ephemeral presentation context, never source confirmation or a submitted input. */
export type CanonicalSourceProfileVisibilityContextV1 = Readonly<{
  metadata: CanonicalSourceProfileSelectionV1;
  parameterSchema: readonly CanonicalSourceProfileParameterV1[];
}>;

export function projectCanonicalSourceProfileVisibilityContextV1(
  parameterSchema: readonly CanonicalSourceProfileParameterV1[], metadata: unknown,
): CanonicalSourceProfileVisibilityContextV1 | undefined {
  if (metadata === undefined) return undefined;
  // The existing producer validates all source, ownership, unit and copy edges.
  resolveCanonicalSourceProfileSelectionV1({ parameterSchema, sourceProfileSelectionMetadata: metadata,
    confirmedParameters: {}, effectiveUserParameters: {} });
  const source = metadata as CanonicalSourceProfileSelectionV1;
  const ids = new Set([source.selectorParameterId, ...source.geometryParameterIds,
    ...source.profiles.flatMap(profile => profile.geometryCopies.map(copy => copy.toParameterId))]);
  // Retain only the producer closure, not a large catalog or source documents.
  return JSON.parse(JSON.stringify({ metadata: source, parameterSchema: parameterSchema.filter(p => ids.has(p.parameterId))
    .map(p => ({ parameterId: p.parameterId, valueType: p.valueType, unitId: p.unitId,
      visibilityRole: p.visibilityRole, valueSourceRole: p.valueSourceRole, defaultValue: p.defaultValue,
      constraints: p.constraints, provenance: p.provenance })) })) as CanonicalSourceProfileVisibilityContextV1;
}

/** Use the same producer for cold cards and unsaved previews. No BOQ calculation. */
export function canonicalParameterSessionConditionValuesV1(
  session: CanonicalParameterSession, parameters: readonly CanonicalParameter[] = session.parameters,
): Map<string, CanonicalParameterValue> {
  const values = new Map<string, CanonicalParameterValue>(Object.entries(session.sourceReadbackConditionValuesV1 ?? {}));
  for (const parameter of [...parameters, ...(session.applicationParameters ?? [])]) {
    if (parameter.value != null) values.set(parameter.parameterId, parameter.value);
  }
  const context = session.sourceProfileVisibilityV1;
  if (!context) return values;
  const ownedIds = [context.metadata.selectorParameterId,
    ...context.metadata.profiles.flatMap(p => p.geometryCopies.map(copy => copy.toParameterId))];
  for (const id of ownedIds) values.delete(id);
  const geometry = new Set(context.metadata.geometryParameterIds);
  const effectiveUserParameters = Object.fromEntries(parameters
    .filter(p => geometry.has(p.parameterId) && p.inputOwnership !== 'APPLICATION'
      && p.consumerInputRole !== 'APPLICATION_TECHNICAL' && p.valid && p.value != null)
    .map(p => [p.parameterId, p.value]));
  const resolved = resolveCanonicalSourceProfileSelectionV1({ parameterSchema: context.parameterSchema,
    sourceProfileSelectionMetadata: context.metadata, confirmedParameters: {}, effectiveUserParameters });
  for (const [id, value] of Object.entries(resolved.ownedOutputs ?? {})) values.set(id, value);
  return values;
}
