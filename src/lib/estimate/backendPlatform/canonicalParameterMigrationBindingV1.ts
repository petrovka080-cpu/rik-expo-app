/** A release transition never aliases or converts an existing physical input. */
export type CanonicalParameterMigrationBindingV1 = Readonly<{
  parameterId: string;
  unitId: string | null;
  valueType: string;
  semanticParameterKey?: string | null;
}>;

export function canonicalParameterMigrationBindingCompatibleV1(
  source: CanonicalParameterMigrationBindingV1 | null | undefined,
  destination: CanonicalParameterMigrationBindingV1 | null | undefined,
): boolean {
  if (!source || !destination || source.parameterId !== destination.parameterId
    || source.unitId !== destination.unitId
    || (source.semanticParameterKey ?? source.parameterId)
      !== (destination.semanticParameterKey ?? destination.parameterId)) return false;
  // The target validator still checks the submitted value; no rounding occurs here.
  return source.valueType === destination.valueType
    || (source.valueType === 'decimal' && destination.valueType === 'integer');
}
