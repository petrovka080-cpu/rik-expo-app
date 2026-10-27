import { createCanonicalDefinitionClonePlan } from './canonicalDefinitionPublisherR1';
import { estimateDeterministicHash } from '../../../src/lib/estimate/estimateDeterministicHash';

type Input = Parameters<typeof createCanonicalDefinitionClonePlan>[0];
const resources = () => [
  { id: 'source-later-id', row_id: 'later', ordinal: 95, section: 'Работа', category: 'material', title_ru: 'Материал',
    row_type: 'material', unit_id: 'kg', formula_id: 'formula-later', inclusion_ast: { kind: 'literal', value: true },
    resource_graph: { costTreatment: 'OWN_COST', formulaId: 'formula-later' }, cost_owner_id: 'later', procurement_eligible: true,
    source_metadata: { sourceId: 'EXACT_SOURCE', literalRate: '0.017' } },
  { id: 'source-earlier-id', row_id: 'earlier', ordinal: 12, section: 'Работа', category: 'labor', title_ru: 'Труд рабочих',
    row_type: 'labor', unit_id: 'man_hour', formula_id: 'formula-earlier', inclusion_ast: { kind: 'literal', value: true },
    resource_graph: { costTreatment: 'INFORMATIONAL_SCOPE', formulaId: 'formula-earlier' }, cost_owner_id: 'earlier', procurement_eligible: false,
    source_metadata: { sourceId: 'EXACT_SOURCE', literalRate: '60.43' } },
];
const make = (rows: Input['representative']['resources']) => createCanonicalDefinitionClonePlan({
  contract: 'TEST_ONLY_RESOURCE_ORDER', definition: { id: 'test-definition', releaseId: 'test-release', catalogId: 'TEST_ONLY',
    definitionVersion: 2, passport: {}, applicability: {}, definitionSha256: 'a'.repeat(64), sourceMetadata: {} },
  representative: { parameters: [], formulas: [], resources: rows,
    bindings: [{ row_id: 'later', locator_id: 'source-locator', applicability: {} }, { row_id: 'earlier', locator_id: 'source-locator', applicability: {} }],
    baseline: {}, passport: { contract_version: 'TEST_ONLY', included_scope_ru: [], capability_matrix: [] } },
  parameterTruthMetadata: row => row.truth_metadata,
  resourceId: row => 'new-' + row.row_id, resourceSemanticOwner: row => 'one-owner:' + row.row_id,
  resourceSha256: estimateDeterministicHash, bindingApplicability: binding => binding.applicability, expectedNormativeBindingCount: 2,
  baseline: { id: 'new-baseline', key: 'test-baseline', sourceDefinitionVersionId: 'source-definition', validationScenarioRefs: [],
    acceptanceEvidenceSha256: 'b'.repeat(64), acceptedReleaseId: 'test-release', supersedesBaselineId: 'source-baseline' },
  passport: { physicalResultRu: 'TEST_ONLY', excludedScopeRu: [], decision: {}, payloadSha256: 'c'.repeat(64), sourceHead: 'test-head', sourceTree: 'test-tree' },
});

it('orders resource write plans exactly as SQL self-audit while retaining sparse ordinals and immutable source input', () => {
  const source = resources(), before = JSON.stringify(source), result = make(source);
  expect(result.resources.map(row => [row.row_id, row.ordinal])).toEqual([['earlier', 12], ['later', 95]]);
  expect(JSON.stringify(source)).toBe(before);
  for (const original of source) {
    const row = result.resources.find(row => row.row_id === original.row_id)!;
    for (const key of ['unit_id', 'formula_id', 'source_metadata', 'resource_graph', 'cost_owner_id', 'procurement_eligible', 'inclusion_ast'] as const)
      expect(row[key]).toEqual(original[key]);
  }
});

it('produces identical resource payloads, checksums and source bindings from either snapshot row order', () => {
  const source = resources(), first = make(source), reverse = make([...source].reverse());
  expect(first.resources).toEqual(reverse.resources); expect(first.bindings).toEqual(reverse.bindings);
  expect(estimateDeterministicHash(first.resources)).toBe(estimateDeterministicHash(reverse.resources));
  expect(first.bindings.map(binding => binding.resource_spec_id)).toEqual(['new-earlier', 'new-later']);
});
