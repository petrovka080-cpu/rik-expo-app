import capture from '../../../data/estimate-benchmarks/fixtures/saved-source-profile-parameter-cards-r52.json';
import type { CanonicalEstimateCatalogItem } from '../../lib/estimate/backendPlatform/contracts';
import type { CanonicalEstimateParameterSessionRevision } from '../../lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';
import { buildConsumerCanonicalParameterSession, consumerCanonicalPrecompileParameterOverrides } from './consumerCanonicalParameterEditor';
import { buildConsumerRepairCanonicalSessionPreview } from './consumerRepairCanonicalSessionPreview';
import { buildCanonicalParameterCards } from '../../lib/estimatePresentation/buildCanonicalParameterCards';
import { canonicalParameterSessionConditionValuesV1 } from '../../lib/estimate/canonicalParameters/canonicalParameterSessionConditionValuesV1';

// Actual cold readback slices, not new object/source confirmation or quantity tests.
const cases = capture.cases as unknown as readonly { name: string; expectedEditableKeys: string[];
  catalog: CanonicalEstimateCatalogItem; revision: CanonicalEstimateParameterSessionRevision }[];
const saved = (name: string) => {
  const source = cases.find(c => c.name === name)!;
  return { source, session: buildConsumerCanonicalParameterSession({ ...source, draftId: 'TEST_ONLY_COLD_CARD_VISIBILITY' }) };
};
const cardKeys = (session: ReturnType<typeof saved>['session']) =>
  buildCanonicalParameterCards({ session, revision: null }).map(c => c.key).sort();

describe('actual saved source profile fields reach the ordinary cards and live preview', () => {
  test.each(cases)('$name keeps its complete public field slice after cold hydration', source => {
    const before = JSON.stringify(source);
    const session = buildConsumerCanonicalParameterSession({ ...source, draftId: 'TEST_ONLY_COLD_CARD_VISIBILITY' });
    const cards = buildCanonicalParameterCards({ session, revision: null });
    expect(cards.map(c => c.key).sort()).toEqual([...source.expectedEditableKeys].sort());
    expect(cards.every(c => c.editable)).toBe(true);
    expect(cards.length).toBeLessThanOrEqual(10);
    expect(JSON.stringify(source)).toBe(before);
    for (const key of Object.keys(consumerCanonicalPrecompileParameterOverrides({ session, patches: [] }))) {
      expect(source.expectedEditableKeys).toContain(key);
    }
    if (source.catalog.applicability.sourceProfileSelectionV1 === undefined) {
      expect(session.sourceProfileVisibilityV1).toBeUndefined();
    }
  });

  test('a positive flat area edit retains all nine independent saved measurements', () => {
    const { source, session } = saved('flat');
    const next = buildConsumerRepairCanonicalSessionPreview({ session,
      draftValues: { m212_roof_covering_area_m2: '31.25' } })!;
    expect(cardKeys(next)).toEqual([...source.expectedEditableKeys].sort());
    for (const p of next.parameters.filter(p => p.parameterId !== 'm212_roof_covering_area_m2')) {
      expect(p.value).toBe(session.parameters.find(old => old.parameterId === p.parameterId)!.value);
    }
    expect(next.parameters.find(p => p.parameterId === 'm212_roof_reuse_torch_primer_q')!.value).toBe(80);
  });

  test.each(['0', '', '-'])('area %j cannot inherit the previously saved source selector', raw => {
    const { session } = saved('flat');
    const next = buildConsumerRepairCanonicalSessionPreview({ session,
      draftValues: { m212_roof_covering_area_m2: raw } })!;
    expect(cardKeys(next)).toEqual(['m212_roof_covering_area_m2']);
    expect(canonicalParameterSessionConditionValuesV1(next).has('m212_roof_complete_system')).toBe(false);
  });

  test('restoring geometry reopens the same fields with their independent values', () => {
    const { source, session } = saved('flat');
    const zero = buildConsumerRepairCanonicalSessionPreview({ session,
      draftValues: { m212_roof_covering_area_m2: '0' } })!;
    const restored = buildConsumerRepairCanonicalSessionPreview({ session: zero,
      draftValues: { m212_roof_covering_area_m2: '62.5' } })!;
    expect(cardKeys(restored)).toEqual([...source.expectedEditableKeys].sort());
    expect(restored.parameters.find(p => p.parameterId === 'm212_roof_reuse_torch_primer_q')!.value).toBe(80);
    expect(restored.parameters.find(p => p.parameterId === 'roof_valley_length_m')!.value).toBe(12);
  });

  test('a technical draft patch cannot select a branch after zero geometry', () => {
    const { session } = saved('flat');
    const next = buildConsumerRepairCanonicalSessionPreview({ session, draftValues: {
      m212_roof_covering_area_m2: '0',
      m212_roof_complete_system: 'Два наплавляемых слоя по готовому минеральному основанию',
    } })!;
    expect(cardKeys(next)).toEqual(['m212_roof_covering_area_m2']);
    expect(consumerCanonicalPrecompileParameterOverrides({ session: next, patches: [] }))
      .not.toHaveProperty('m212_roof_complete_system');
  });

  test('a copied beam measurement still passes the original unit and producer guards', () => {
    const { session } = saved('beam');
    const changed = JSON.parse(JSON.stringify(session));
    const context = changed.sourceProfileVisibilityV1;
    const targetId = context.metadata.profiles[0].geometryCopies[0].toParameterId;
    context.parameterSchema.find((p: { parameterId: string }) => p.parameterId === targetId).unitId = 'kg';
    expect(() => canonicalParameterSessionConditionValuesV1(changed)).toThrow(/COPY_TARGET_PRODUCER_CLOSURE/u);
  });
});
