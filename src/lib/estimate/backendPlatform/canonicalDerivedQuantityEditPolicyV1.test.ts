import { canonicalDerivedQuantityEditPolicyV1, validateCanonicalDerivedQuantityEditPolicyV1,
  assertCanonicalDerivedQuantityAmendmentV1 } from './canonicalDerivedQuantityEditPolicyV1';
import { consumerRepairRowHasSourceManagedQuantity } from '../../../features/consumerRepair/consumerRepairRowMetadata';

const policy = { contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY',
  unitId: 'pcs', parameterIds: ['N'], reasonRu: 'Объём меняется через количество изделий.' } as const;
const validate = (raw: unknown, unit = 'pcs', inputs: string[] = ['N'], definitions = new Set(['N']), ast: string[] = ['N']) =>
  validateCanonicalDerivedQuantityEditPolicyV1(raw, 'physical', unit, 'pcs', inputs, definitions, ast);

it('keeps legacy rows and paid order amendments unchanged without explicit policy', () => {
  expect(validate(undefined)).toBeNull();
  expect(() => assertCanonicalDerivedQuantityAmendmentV1(null, '7')).not.toThrow();
  expect(consumerRepairRowHasSourceManagedQuantity({ quantity: 3, sourceParameters: {} })).toBe(false);
});
it.each([null, true, { ...policy, mode: 'OTHER' }, { ...policy, unknown: true },
  { ...policy, parameterIds: [] }, { ...policy, parameterIds: ['N', 'N'] },
  { ...policy, parameterIds: ['missing'] }, { ...policy, unitId: 'kg' },
  { ...policy, reasonRu: '' }])('fails closed on malformed definition policy %j', raw => {
  expect(() => validate(raw)).toThrow(expect.objectContaining({ code: 'DEFINITION_INTEGRITY_FAILED' }));
});
it('requires the exact formula operands and units, not an unrelated field', () => {
  expect(() => validate(policy, 'kg')).toThrow();
  expect(() => validate(policy, 'pcs', ['N', 'extra'])).toThrow();
  expect(() => validate(policy, 'pcs', ['N'], new Set())).toThrow();
  expect(() => validate(policy, 'pcs', ['N'], new Set(['N']), ['other'])).toThrow();
});
it('allows null clear and rejects equal pins that would become stale after parameter edits', () => {
  const p = validate(policy);
  expect(() => assertCanonicalDerivedQuantityAmendmentV1(p, null)).not.toThrow();
  for (const manual of ['0', '1', '3', '3.000', '7', '3.5']) expect(() => assertCanonicalDerivedQuantityAmendmentV1(p, manual))
    .toThrow(expect.objectContaining({ code: 'ROW_AMENDMENT_INVALID' }));
});
it('permits an explicit manual amendment while the automatic policy remains unchanged',()=>{
  const p=validate(policy),before=JSON.stringify(p);
  for(const quantity of ['0','3','7','3.5'])expect(()=>assertCanonicalDerivedQuantityAmendmentV1(p,quantity,true)).not.toThrow();
  expect(JSON.stringify(p)).toBe(before);
});
it('locks a known derived physical UI row while preserving ordinary quantity editors', () => {
  expect(canonicalDerivedQuantityEditPolicyV1(policy)).toEqual(policy);
  expect(consumerRepairRowHasSourceManagedQuantity({ quantity: 12, sourceParameters: {
    canonicalDerivedQuantityEditPolicyV1: policy,
  } })).toBe(true);
  expect(consumerRepairRowHasSourceManagedQuantity({ quantity: 12, sourceParameters: {
    canonicalDerivedQuantityEditPolicyV1: { ...policy, mode: 'OTHER' },
  } })).toBe(false);
});
