import {knaufInteriorPlasterBaseLabourDefinitionS2763} from '../../../src/lib/estimate/v4/knaufInteriorPlasterBaseLabourS2763';
import {evaluateFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {parseCanonicalPublicResourcePresentationV1} from '../../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import {knaufManualScopeResourceS2774,overlayS2774KnaufManualScopeCorrection} from './s2774KnaufManualScopeCorrection';
import pack from '../../../data/estimate-benchmarks/source-packs/knauf-manual-scope-correction-seven-s27-74.json';

test.each([['WALL','18.42095','Оштукатуривание стены вручную, слой 10 мм — базовые работы'],
  ['CEILING','22.4005','Оштукатуривание потолка вручную, слой 10 мм — базовые работы']] as const)(
  '%s corrects the operation scope while retaining every economic and source field', (surface,hours,name)=>{
    const definition=knaufInteriorPlasterBaseLabourDefinitionS2763(surface),snapshot=structuredClone(definition);
    const worker=definition.resources.find(row=>row.row_id==='plaster:krer15-manual-base:workers')!;
    const corrected=knaufManualScopeResourceS2774(worker,surface);
    expect(corrected.title_ru).toBe(name);
    const economic=(row:typeof worker)=>{const {title_ru,resource_graph,row_sha256,...rest}=row;return rest;};
    expect(economic(corrected as typeof worker)).toEqual(economic(worker));
    expect(corrected.resource_graph.costOwnerId).toBe(worker.resource_graph.costOwnerId);
    expect(corrected.resource_graph.costTreatment).toBe(worker.resource_graph.costTreatment);
    expect(corrected.resource_graph.operationCompositionV1.operationId).toBe('plaster:krer15-manual-base:base');
    expect(corrected.resource_graph.operationCompositionV1.additionalOperations).toBeUndefined();
    const presentation=parseCanonicalPublicResourcePresentationV1(corrected.resource_graph.publicResourcePresentationV1)!;
    expect(presentation).not.toBeNull();expect(presentation.sourceTitleRu).toBe(corrected.title_ru);
    expect(presentation.detailsRu.join(' ').toLowerCase()).toContain('огрунтовка поверхностей');
    expect(presentation.detailsRu.join(' ')).not.toContain('Обеспыливание поверхностей');
    const formula=definition.formulas.find(row=>row.formula_id===worker.formula_id)!;
    expect(evaluateFormulaGraph(formula.ast,{q:'35.5'})).toBe(hours);
    expect(definition).toEqual(snapshot);
    expect(definition.resources.map(row=>knaufManualScopeResourceS2774(row,surface)))
      .toHaveLength(definition.resources.length);
  });

test('requires one of seven exact frozen manual parents and admits no new norm or cost owner',()=>{
  expect(pack.targets).toHaveLength(7);expect(new Set(pack.targets.map(t=>t.catalogId)).size).toBe(7);
  expect(pack.targets.some(t=>t.catalogId===pack.excludedMechanizedCatalogId)).toBe(false);
  expect(()=>overlayS2774KnaufManualScopeCorrection({definition:{catalog_id:pack.targets[0]!.catalogId,id:'foreign'}} as never))
    .toThrow('KNAUF_SCOPE_EXACT_FROZEN_MANUAL_PARENT_REQUIRED');
  const worker=knaufInteriorPlasterBaseLabourDefinitionS2763('WALL').resources.find(row=>row.row_id.endsWith(':workers'))!;
  expect(()=>knaufManualScopeResourceS2774({...worker,source_metadata:{}},'WALL')).toThrow('KNAUF_SCOPE_ORIGINAL_BASE_OWNER_REQUIRED');
  expect(pack.newCompleteTechnicalTypes).toBe(0);
});
