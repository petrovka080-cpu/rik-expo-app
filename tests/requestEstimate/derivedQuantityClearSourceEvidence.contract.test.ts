import { fusionBenchDefinitionS2758, fusionBenchPackS2758 as pack } from '../../src/lib/estimate/v4/fusionBenchPreparedConcreteS2758';
import { estimateDeterministicHash } from '../../src/lib/estimate/estimateDeterministicHash';
import { compileFormulaGraph } from '../../src/lib/estimate/backendPlatform/formulaGraph';
import { buildCanonicalDerivedQuantitySourceBindingV1 as binding, canonicalDerivedQuantityClearEvidenceV1 as clear } from '../../src/lib/estimate/backendPlatform/canonicalDerivedQuantityClearEvidenceV1';

const rowId = (key: string) => 'fusion-bench-prepared-concrete:' + key;
function fixture(legacy: boolean) {
  // Source records cross a JSON/JSONB boundary; optional undefined builder keys are absent there.
  const definition = JSON.parse(JSON.stringify(fusionBenchDefinitionS2758())) as ReturnType<typeof fusionBenchDefinitionS2758>;
  if (legacy) for (const row of definition.resources) {
    delete row.resource_graph.derivedQuantityEditPolicyV1;
    const { row_sha256: ignored, ...body } = row;
    row.row_sha256 = estimateDeterministicHash(body);
  }
  return { representation: 'FACTORY_ARTIFACT' as const, catalogId: pack.catalogId,
    definitionMeaning: { catalogId: pack.catalogId, sourceId: pack.sourceId, scope: pack.technicalProductIdentity }, ...definition };
}
const pin = (quantity: string | null) => ({ quantity, unitPrice: '1800', titleRu: 'Сохранённое закупочное имя', provenance: { kind: 'manual', reason: 'Истинное происхождение цены и количества', document: 'CONTROL_ONLY saved' } });

test('policy-only source descriptors agree without omitting source meaning or arbitrary resource graph keys', () => {
  const old = binding(fixture(true)), next = binding(fixture(false));
  expect(old?.mode).toBe('LEGACY'); expect(next?.mode).toBe('PARAMETERS_ONLY');
  expect(old?.sourceSemanticSha256).toBe(next?.sourceSemanticSha256);
});

test.each(['source', 'formula', 'parameter', 'inclusion', 'graph', 'passport'] as const)('refuses a clear when %s semantics differ', change => {
  const before = fixture(true), after = fixture(false);
  if (change === 'source') after.resources[0].source_metadata = { ...after.resources[0].source_metadata, exact_locator: 'Different passport' };
  if (change === 'formula') {
    const formula = after.formulas[1], expression = String(formula.expression_source) + '+0';
    formula.expression_source = expression;
    const compiled = compileFormulaGraph(expression);
    formula.ast = compiled.ast; formula.input_parameter_ids = [...compiled.inputParameterIds];
  }
  if (change === 'parameter') after.parameters[0].constraints_json = { min: 2 };
  if (change === 'inclusion') after.resources[0].inclusion_ast = { kind: 'literal', value: false };
  if (change === 'graph') after.resources[0].resource_graph.extraUnreviewedOwner = 'different';
  if (change === 'passport') after.definitionMeaning.sourceId = 'different';
  for (const row of after.resources) { const { row_sha256: ignored, ...body } = row; row.row_sha256 = estimateDeterministicHash(body); }
  expect(binding(before)).not.toBeNull(); expect(binding(after)).not.toBeNull();
  expect(clear({ from: binding(before), to: binding(after), parentOverrides: { [rowId('bench-consumed')]: pin('7') }, stagedOverrides: { [rowId('bench-consumed')]: { quantity: null } }, parentCustomRows: [] })).toBeNull();
});

test('a corrupt source row hash or partial/malformed policy cannot produce a binding', () => {
  const corrupt = fixture(false); corrupt.resources[0].row_sha256 = 'f'.repeat(64); expect(binding(corrupt)).toBeNull();
  const partial = fixture(false); delete partial.resources.find(row => row.row_id === rowId('fixing-included'))!.resource_graph.derivedQuantityEditPolicyV1;
  expect(binding(partial)).toBeNull();
  const forged = fixture(false); forged.resources.find(row => row.row_id === rowId('bench-consumed'))!.resource_graph.derivedQuantityEditPolicyV1 = { contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY', unitId: 'm', parameterIds: ['bench_count'], reasonRu: 'forged' };
  expect(binding(forged)).toBeNull();
});

test.each(['0', '3', '7'])('explicitly clears existing %s, preserving prices, provenance, paid order and parent object', quantity => {
  const parent = { [rowId('bench-consumed')]: pin(quantity), [rowId('bench-order')]: pin('9') }, before = JSON.stringify(parent);
  const result = clear({ from: binding(fixture(true)), to: binding(fixture(false)), parentOverrides: parent,
    stagedOverrides: { [rowId('bench-consumed')]: { quantity: null, provenance: { kind: 'manual', reason: 'Generic new UI clear reason' } } }, parentCustomRows: [] });
  expect(result?.clearedRowIds).toEqual([rowId('bench-consumed')]);
  expect(result?.mergedOverrides).toEqual({ ...parent, [rowId('bench-consumed')]: { ...parent[rowId('bench-consumed')], quantity: null } });
  expect(JSON.stringify(parent)).toBe(before);
});

test('an inactive fixing pin still needs an explicit clear, with no automatic extra amendment', () => {
  const parent = { [rowId('bench-consumed')]: pin('7'), [rowId('fixing-consumed-separate')]: pin('20') }, staged = { [rowId('bench-consumed')]: { quantity: null } };
  const input = { from: binding(fixture(true)), to: binding(fixture(false)), parentOverrides: parent, stagedOverrides: staged, parentCustomRows: [] };
  expect(clear(input)).toBeNull();
  const result = clear({ ...input, stagedOverrides: { ...staged, [rowId('fixing-consumed-separate')]: { quantity: null } } });
  expect(result?.clearedRowIds).toHaveLength(2); expect(parent[rowId('fixing-consumed-separate')].quantity).toBe('20');
});

test.each([{ quantity: '3' }, { quantity: null, unitPrice: '999' }, { quantity: null, titleRu: 'new' }, { quantity: null, includedInEstimate: false }, {}])('rejects new row changes mixed into an explicit clear: %j', amendment => {
  expect(clear({ from: binding(fixture(true)), to: binding(fixture(false)), parentOverrides: { [rowId('bench-consumed')]: pin('7') }, stagedOverrides: { [rowId('bench-consumed')]: amendment }, parentCustomRows: [] })).toBeNull();
});

test('keeps custom rows outside this first adoption and preserves already calculated null overrides', () => {
  const input = { from: binding(fixture(true)), to: binding(fixture(false)), parentOverrides: { [rowId('bench-consumed')]: pin('7') }, stagedOverrides: { [rowId('bench-consumed')]: { quantity: null } }, parentCustomRows: [] };
  expect(clear({ ...input, parentCustomRows: [{ rowId: 'custom', quantity: 1 }] })).toBeNull();
  expect(clear({ ...input, parentOverrides: { [rowId('bench-consumed')]: pin(null) } })).toBeNull();
  const mixed = { ...input.parentOverrides, [rowId('fixing-consumed-separate')]: pin(null) };
  expect(clear({ ...input, parentOverrides: mixed })?.mergedOverrides[rowId('fixing-consumed-separate')]).toEqual(pin(null));
});

test('all malformed policy descriptors are rejected instead of being classified as legacy', () => {
  const definition = fixture(false);
  for (const row of definition.resources) {
    if (Object.hasOwn(row.resource_graph, 'derivedQuantityEditPolicyV1')) row.resource_graph.derivedQuantityEditPolicyV1 = {};
    const { row_sha256: ignored, ...body } = row; row.row_sha256 = estimateDeterministicHash(body);
  }
  expect(binding(definition)).toBeNull();
});

test('physical formulas and source integrity remain independent gates', () => {
  const definition = fixture(false), formula = definition.formulas[0];
  formula.expression_source = '2*bench_count';
  const compiled = compileFormulaGraph(formula.expression_source);
  formula.ast = compiled.ast; formula.input_parameter_ids = [...compiled.inputParameterIds];
  expect(binding(definition)).toBeNull();
  const placeholder = fixture(false); placeholder.formulas[0].ast_sha256 = 'f'.repeat(64);
  expect(binding(placeholder)).toBeNull();
});
