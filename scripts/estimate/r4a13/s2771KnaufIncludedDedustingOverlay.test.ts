import {knaufInteriorPlasterBaseLabourDefinitionS2763} from '../../../src/lib/estimate/v4/knaufInteriorPlasterBaseLabourS2763';
import {evaluateFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalEstimateOperationReference,canonicalEstimateResourceOperationSections} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {knaufIncludedDedustingResourceS2771,overlayS2771KnaufIncludedDedusting,
  S2771_KNAUF_INCLUDED_DEDUSTING_WORKER as workerId} from './s2771KnaufIncludedDedustingOverlay';
import pack from '../../../data/estimate-benchmarks/source-packs/knauf-included-dedusting-seven-s27-71.json';

test.each([['WALL','18.42095'],['CEILING','22.4005']] as const)(
  '%s rejects unproven dedusting without changing inherited fractional labour or cost owners',
  (surface,expected)=>{
    const definition=knaufInteriorPlasterBaseLabourDefinitionS2763(surface);
    const original=structuredClone(definition);
    const worker=definition.resources.find(row=>row.row_id===workerId)!;
    expect(()=>knaufIncludedDedustingResourceS2771(worker)).toThrow('KNAUF_DEDUSTING_SOURCE_NOT_ADMITTED');
    expect(definition).toEqual(original);
    const primary=canonicalEstimateOperationReference(worker.resource_graph.operationCompositionV1);
    if(!primary)throw Error('SOURCE_PRIMARY_OPERATION_REQUIRED');
    expect(primary.additionalOperations?.some(row=>row.operationId.endsWith(':included-dedusting'))??false).toBe(false);
    const formula=definition.formulas.find(row=>row.formula_id===worker.formula_id)!;
    expect(evaluateFormulaGraph(formula.ast,{q:'35.5'})).toBe(expected);
    const resources=definition.resources;
    const sections=canonicalEstimateResourceOperationSections(resources.map(row=>({rowId:row.row_id,titleRu:row.title_ru,operation:row.resource_graph.operationCompositionV1})));
    expect(sections.some(section=>section.operation?.operationId.endsWith(':included-dedusting'))).toBe(false);
    expect(sections.flatMap(section=>section.resourceIds).filter(id=>id===workerId)).toEqual([workerId]);
    expect(resources.filter(row=>row.resource_graph.costTreatment==='OWN_COST')).toHaveLength(4);
  },
);

test('does not repeat an existing relationship or attach a worker reference to a machine',()=>{
  const definition=knaufInteriorPlasterBaseLabourDefinitionS2763('WALL');
  const worker=definition.resources.find(row=>row.row_id===workerId)!;
  const duplicate=structuredClone(worker);
  const primary=canonicalEstimateOperationReference(duplicate.resource_graph.operationCompositionV1);
  if(!primary)throw Error('SOURCE_PRIMARY_OPERATION_REQUIRED');
  duplicate.resource_graph.operationCompositionV1={...primary,additionalOperations:[{operationId:'plaster:krer15-manual-base:included-dedusting',operationTitleRu:'Неподтверждённая тестовая ссылка',completionCriterionRu:'Проверка отказа повторной связи',processOrdinal:10,processRole:'REFERENCE_ONLY'}]};
  expect(()=>knaufIncludedDedustingResourceS2771(duplicate)).toThrow('ALREADY_INCLUDED');
  expect(()=>knaufIncludedDedustingResourceS2771(definition.resources.find(row=>row.row_id.endsWith(':mixer'))!)).toThrow('EXISTING_SOURCE_BACKED_WORKER');
  expect(()=>knaufIncludedDedustingResourceS2771({...worker,source_metadata:{}})).toThrow('EXISTING_SOURCE_BACKED_WORKER');
});

test('rejects an arbitrary parent and keeps all seven manual consumers distinct from the mechanized control',()=>{
  expect(pack.targets).toHaveLength(7);
  expect(new Set(pack.targets.map(target=>target.catalogId)).size).toBe(7);
  expect(pack.targets.some(target=>target.catalogId===pack.excludedMechanizedCatalogId)).toBe(false);
  expect(()=>overlayS2771KnaufIncludedDedusting({definition:{catalog_id:pack.targets[0]!.catalogId,id:'foreign'}} as never)).toThrow('EXACT_CURRENT_PARENT');
  expect(pack.newCompleteTechnicalTypes).toBe(0);
});

test('priming in the pinned table does not admit a dedusting publication',()=>{
  expect(pack.source.quantityAdmitted).toBe(false);
  expect(pack.publicationAdmitted).toBe(false);
  expect(pack.sourceReview.status).toBe('BLOCKED_EXACT_SOURCE_DOES_NOT_PROVE_DEDUSTING');
  expect(pack.sourceReview.exactReadingRu).toContain('Огрунтовка поверхностей');
});
