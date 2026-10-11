export type CanonicalDerivedQuantityEditPolicyV1 = Readonly<{
  contractVersion: 'canonical-derived-quantity-edit-policy/v1';
  mode: 'PARAMETERS_ONLY';
  unitId: string;
  parameterIds: readonly string[];
  reasonRu: string;
}>;

/** Only explicitly admitted definition rows use this policy. Paid order
 * amendments and legacy physical rows keep their existing semantics. */
export function canonicalDerivedQuantityEditPolicyV1(raw: unknown): CanonicalDerivedQuantityEditPolicyV1 | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const p = raw as Record<string, unknown>;
  if (Object.keys(p).some(k => !['contractVersion', 'mode', 'unitId', 'parameterIds', 'reasonRu'].includes(k))
    || p.contractVersion !== 'canonical-derived-quantity-edit-policy/v1' || p.mode !== 'PARAMETERS_ONLY'
    || typeof p.unitId !== 'string' || !p.unitId.trim()
    || typeof p.reasonRu !== 'string' || !p.reasonRu.trim() || p.reasonRu.length > 2000
    || !Array.isArray(p.parameterIds) || p.parameterIds.length === 0 || p.parameterIds.length > 64
    || p.parameterIds.some(id => typeof id !== 'string' || !id.trim() || id !== id.trim())
    || new Set(p.parameterIds).size !== p.parameterIds.length) return null;
  return p as CanonicalDerivedQuantityEditPolicyV1;
}

export function validateCanonicalDerivedQuantityEditPolicyV1(raw: unknown, rowId: string,
  unitId: string, formulaUnitId: string | undefined, formulaInputIds: readonly string[], definitionIds: ReadonlySet<string>,
  astInputIds: readonly string[]) {
  if (raw === undefined) return null;
  const p = canonicalDerivedQuantityEditPolicyV1(raw);
  if (!p || p.unitId !== unitId || p.unitId !== formulaUnitId
    || p.parameterIds.length !== formulaInputIds.length
    || p.parameterIds.length !== astInputIds.length
    || p.parameterIds.some(id => !definitionIds.has(id) || !formulaInputIds.includes(id) || !astInputIds.includes(id))) {
    throw Object.assign(new Error(`derived quantity edit policy invalid ${rowId}`), { code: 'DEFINITION_INTEGRITY_FAILED' });
  }
  return p;
}

export function assertCanonicalDerivedQuantityAmendmentV1(policy: CanonicalDerivedQuantityEditPolicyV1 | null,
  manualQuantity: string | null) {
  // Even an equal override would become stale after a parameter edit. A
  // PARAMETERS_ONLY row accepts only clear, never a persisted quantity pin.
  if (policy && manualQuantity != null) {
    throw Object.assign(new Error(policy.reasonRu), { code: 'ROW_AMENDMENT_INVALID' });
  }
}
