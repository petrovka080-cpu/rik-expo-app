import { validateIndependentCompletenessMapReferences } from './prepareMasterSingleDefinitionSuccessorR1';

const operation = (operationId: string) => ({
  operationId, operationTitleRu: 'Операция', completionCriterionRu: 'Результат принят',
});
const reference = {
  contractVersion: 'canonical-operation-resource/v1', groupId: 'control:group',
  groupTitleRu: 'Контрольная технология', ...operation('control:mixing'),
  additionalOperations: [operation('control:application')],
};
const formula = {formula_id: 'control:formula'};
const resource = {row_id: 'control:material', formula_id: formula.formula_id,
  resource_graph: {operationCompositionV1: reference}};
function map(requiredOperationIds: unknown = ['control:mixing', 'control:application']) {
  return {
    contract: 'rik-expo-app.s26-3.independent-completeness-map.v1', sourceKind: 'TECHNOLOGY_MAP',
    generatedFromCurrentRows: false, evidenceSha256: 'a'.repeat(64), operationResourceBindingRequired: true,
    entries: [{operationId: 'application', expectedResourceId: 'material', condition: 'SELECTED_SCOPE',
      sourceId: 'control:independent-source', formulaId: formula.formula_id, requiredOperationIds,
      resolution: {kind: 'ROW', rowId: resource.row_id}}],
  };
}
const validate = (completenessMap: unknown, resourceDefinitions: Record<string, unknown>[] = [resource]) =>
  validateIndependentCompletenessMapReferences({completenessMap, resourceDefinitions, formulaDefinitions: [formula]});

describe('independent required resources use their actual operation identities', () => {
  test('one shared resource covers two declared stages without a duplicate resource', () => {
    expect(validate(map())).toEqual([]);
  });
  test('rejects a resource assigned only to mixing when application also requires it', () => {
    expect(validate(map(), [{...resource, resource_graph: {
      operationCompositionV1: {...reference, additionalOperations: []},
    }}])).toContain('ENTRY_0_OPERATION_BINDING');
  });
  test('matching display titles cannot replace the required stable operation ID', () => {
    expect(validate(map(), [{...resource, resource_graph: {operationCompositionV1: {
      ...reference, additionalOperations: [operation('control:unrelated')],
    }}}])).toContain('ENTRY_0_OPERATION_BINDING');
  });
  test('detects an entirely forgotten resource from the independent map', () => {
    expect(validate(map(), [])).toContain('ENTRY_0_ROW_REFERENCE');
  });
  test.each([undefined, [], ['control:mixing', 'control:mixing'], [''], 'control:mixing'])(
    'an opted-in map requires an explicit nonempty unique operation list (%p)', required => {
      const m = map(); Object.assign(m.entries[0], {requiredOperationIds: required});
      expect(validate(m)).toContain('ENTRY_0_REQUIRED_OPERATION_IDS');
    });
  test('rejects a malformed declaration even when its ID text matches', () => {
    expect(validate(map(['control:mixing']), [{...resource, resource_graph: {
      operationCompositionV1: {operationId: 'control:mixing'},
    }}])).toContain('ENTRY_0_OPERATION_BINDING');
  });
  test('a documented inapplicable category needs no fictional resource or operation', () => {
    const m = map(); Object.assign(m.entries[0], {requiredOperationIds: undefined,
      resolution: {kind: 'NOT_APPLICABLE', reasonRu: 'Контрольный узел не требует крепежа'}});
    expect(validate(m, [])).toEqual([]);
  });
  test('retains the historical reference-only contract without reinterpreting old publications', () => {
    const m = map(); Reflect.deleteProperty(m, 'operationResourceBindingRequired');
    Reflect.deleteProperty(m.entries[0], 'requiredOperationIds');
    expect(validate(m, [{...resource, resource_graph: {}}])).toEqual([]);
  });
  test.each([
    ['category', {category: 'equipment', unit_id: 'kg'}, {output_unit_id: 'kg'}, 'RESOURCE_CATEGORY'],
    ['resource unit', {category: 'material', unit_id: 'm3'}, {output_unit_id: 'm3'}, 'RESOURCE_UNIT'],
    ['unit scale', {category: 'material', unit_id: 't'}, {output_unit_id: 't'}, 'RESOURCE_UNIT'],
    ['formula output', {category: 'material', unit_id: 'kg'}, {output_unit_id: 'm3'}, 'FORMULA_OUTPUT_UNIT'],
  ])('rejects the wrong physical %s despite matching resource/formula/operation IDs', (_label, row, output, reason) => {
    const m = map(); Object.assign(m.entries[0], {category: 'material', unitId: 'kg'});
    expect(validateIndependentCompletenessMapReferences({completenessMap: m,
      resourceDefinitions: [{...resource, ...row}], formulaDefinitions: [{...formula, ...output}],
    })).toContain('ENTRY_0_' + reason);
  });
  test('accepts registered unit aliases and the explicit labor/work category without conversion', () => {
    const m = map(); Object.assign(m.entries[0], {category: 'work', unitId: 'чел.-ч'});
    expect(validateIndependentCompletenessMapReferences({completenessMap: m,
      resourceDefinitions: [{...resource, category: 'labor', unit_id: 'man_hour'}],
      formulaDefinitions: [{...formula, output_unit_id: 'labor_hour'}],
    })).toEqual([]);
  });
  test('retains an explicitly unresolved unit in a partial physical map', () => {
    const m = map(); Object.assign(m.entries[0], {category: 'material', unitId: null});
    expect(validateIndependentCompletenessMapReferences({completenessMap: m,
      resourceDefinitions: [{...resource, category: 'material', unit_id: ''}],
      formulaDefinitions: [{...formula, output_unit_id: ''}],
    })).toEqual([]);
  });
});
