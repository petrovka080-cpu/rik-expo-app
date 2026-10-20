import { canonicalEstimateWorkProcess, canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections } from './canonicalEstimateOperationComposition';
import type {CanonicalScopeRequirementDecisionV1 as Scope} from './canonicalScopeRequirementV1';

const operation = (groupId: string, operationId: string, title: string, ordinal?: number) => ({
  contractVersion: 'canonical-operation-resource/v1', groupId,
  groupTitleRu: groupId === 'partition' ? 'Монтаж перегородки' : 'Устройство трубопровода',
  operationId, operationTitleRu: title, completionCriterionRu: 'Проверить выполненный этап',
  ...(ordinal == null ? {} : { processOrdinal: ordinal, processRole: 'PROCESS' }),
});
const check=(status:Scope['status'],coveringRowIds:string[],kind:Scope['kind']='INCLUDED'):Scope=>({contractVersion:'canonical-scope-requirement-decision/v1',rowId:'check-'+status,groupId:'partition',groupTitleRu:'Монтаж перегородки',titleRu:'Проверка этапа',reasonRu:'Обоснование состава',kind,status,coveringRowIds,originalRowIds:[],missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false});
test('completed applicability and excluded mandatory coverage stay inside their one declared stage',()=>{
 const resources=[{rowId:'labor',titleRu:'Труд',operation:operation('partition','frame','Монтаж каркаса',0)}];
 const sections=canonicalEstimateResourceOperationSections(resources,[check('COMPLETED',[],'OBJECT_SCOPE'),check('REQUIRED_RESOURCE_EXCLUDED',['labor'])]);
 expect(sections).toHaveLength(1);expect(sections[0]!.resourceIds).toEqual(['labor']);expect(sections[0]!.scopeRequirements?.[0]!.statuses).toEqual(['COMPLETED','REQUIRED_RESOURCE_EXCLUDED']);
});
test('an ambiguous same-group scope stays separate unless its covering resources identify one owner',()=>{
 const resources=[{rowId:'frame',titleRu:'Каркас',operation:operation('partition','frame','Монтаж каркаса',0)},{rowId:'lining',titleRu:'Обшивка',operation:operation('partition','lining','Обшивка',1)}];
 const unknown=canonicalEstimateResourceOperationSections(resources,[check('OBJECT_FACT_REQUIRED',[],'OBJECT_SCOPE')]);expect(unknown).toHaveLength(3);
 const exact=canonicalEstimateResourceOperationSections(resources,[check('COMPLETED',[],'PROJECT_SCOPE'),check('INCLUDED',['lining'])]);expect(exact).toHaveLength(2);expect(exact.find(s=>s.resourceIds.includes('lining'))!.scopeRequirements).toHaveLength(1);
});

test('an unresolved scope check uses its own saved operation without creating a phantom group',()=>{
 const lining=operation('partition','lining','Обшивка',1),resources=[
  {rowId:'frame',titleRu:'Каркас',operation:operation('partition','frame','Монтаж каркаса',0)},
  {rowId:'lining',titleRu:'Обшивка',operation:lining}];
 const scope=check('OBJECT_FACT_REQUIRED',[],'OBJECT_SCOPE');
 const sections=canonicalEstimateResourceOperationSections(resources,[scope],[{rowId:scope.rowId,operation:lining}]);
 expect(sections).toHaveLength(2);expect(sections.find(section=>section.operation?.operationId===lining.operationId)?.scopeRequirements).toHaveLength(1);
 expect(sections.some(section=>section.operation?.groupId==='saved-scope-stages')).toBe(false);
});

test('conflicting or incomplete scope declarations retain an explicit unresolved group',()=>{
 const a=check('OBJECT_FACT_REQUIRED',[],'OBJECT_SCOPE'),b={...a,rowId:'other-check'};
 const frame=operation('partition','frame','Каркас',0),lining=operation('partition','lining','Обшивка',1);
 const resources=[{rowId:'frame',titleRu:'Каркас',operation:frame},{rowId:'lining',titleRu:'Обшивка',operation:lining}];
 for(const declarations of [[{rowId:a.rowId,operation:frame}],[{rowId:a.rowId,operation:frame},{rowId:b.rowId,operation:lining}]])
  expect(canonicalEstimateResourceOperationSections(resources,[a,b],declarations).some(section=>section.operation?.groupId==='saved-scope-stages')).toBe(true);
});

test('one process projection orders subworks and retains resource ownership for unrelated construction groups', () => {
  const resources = [
    { rowId: 'sheet', operation: operation('partition', 'lining', 'Обшивка каркаса', 1) },
    { rowId: 'pipe', operation: operation('pipeline', 'mount', 'Прокладка трубы', 0) },
    { rowId: 'profile', operation: operation('partition', 'frame', 'Монтаж каркаса', 0) },
    { rowId: 'screw', operation: operation('partition', 'lining', 'Обшивка каркаса', 1) },
    { rowId: 'test-pump', operation: operation('pipeline', 'test', 'Испытание трубопровода', 1) },
  ];
  const snapshot = JSON.stringify(resources);
  const groups = canonicalEstimateWorkProcess(resources);
  expect(groups.map(group => group.groupTitleRu)).toEqual(['Монтаж перегородки', 'Устройство трубопровода']);
  expect(groups[0]?.operations.map(step => step.operationTitleRu)).toEqual(['Монтаж каркаса', 'Обшивка каркаса']);
  expect(groups[0]?.operations[1]?.resourceIds).toEqual(['sheet', 'screw']);
  expect(groups[1]?.operations.map(step => step.operationTitleRu)).toEqual(['Прокладка трубы', 'Испытание трубопровода']);
  expect(JSON.stringify(resources)).toBe(snapshot);
});

test('reference rows and a single paid complex are retained outside the process, and an absent process is not invented', () => {
  expect(canonicalEstimateWorkProcess([
    { rowId: 'scope', operation: { ...operation('partition', 'scope', 'Объём'), processRole: 'REFERENCE_ONLY' } },
    { rowId: 'crew', operation: { ...operation('partition', 'labor', 'Труд всего комплекса'), processRole: 'COST_SUMMARY' } },
    { rowId: 'legacy', operation: null },
  ])).toEqual([]);
});

test('legacy resource buckets expose actual saved work titles and do not pretend their order is a process sequence', () => {
  const groups = canonicalEstimateWorkProcess([
    { rowId: 'paint', titleRu: 'Нанесение двух слоёв краски', category: 'labor',
      operation: operation('partition', 'legacy', 'Готовые операции, граница и контроль') },
    { rowId: 'primer', titleRu: 'Грунтование основания', category: 'labor', operation: null },
    { rowId: 'bucket', titleRu: 'Краска', category: 'material', operation: null },
    { rowId: 'operator', titleRu: 'Машинист: входит в стоимость машины', category: 'labor',
      costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', operation: null },
  ], 'Окраска стен');
  expect(groups).toHaveLength(1);
  expect(groups[0]?.sequenceUnspecified).toBe(true);
  expect(groups[0]?.operations.map(step => step.operationTitleRu)).toEqual(['Нанесение двух слоёв краски', 'Грунтование основания']);
});

test('an older operation reference without an explicit process order is not presented as a numbered sequence', () => {
  expect(canonicalEstimateWorkProcess([{ rowId: 'work', operation: operation('partition', 'mount', 'Монтаж') }])[0]?.sequenceUnspecified)
    .toBe(true);
});

test('one resource can serve several subworks while malformed, repeated and foreign-instance references are ignored', () => {
  const shared = { ...operation('pipeline', 'straight', 'Прямые соединения'), additionalOperations: [
    null, {}, { operationId: '', operationTitleRu: 'Пустой', completionCriterionRu: 'Нет' },
    { operationId: 'nodes', operationTitleRu: 'Монтаж фитингов', completionCriterionRu: 'Соединения проверены' },
    { operationId: 'nodes', operationTitleRu: 'Дублирующий узел', completionCriterionRu: 'Нет' },
    { groupId: 'foreign', operationId: 'other', operationTitleRu: 'Чужая работа', completionCriterionRu: 'Нет' },
  ] };
  const resources = [{ rowId: 'fusion-machine', titleRu: 'Сварочный аппарат PP-R', operation: shared }];
  const snapshot = JSON.stringify(resources);
  const references = canonicalEstimateOperationReferences(shared);
  expect(references.map(reference => [reference.groupId, reference.operationId])).toEqual([['pipeline', 'straight'], ['pipeline', 'nodes']]);
  const groups = canonicalEstimateWorkProcess(resources);
  expect(groups).toHaveLength(1);
  expect(groups[0]?.sequenceUnspecified).toBe(true);
  for (const step of groups[0]!.operations) {
    expect(step.resourceIds).toEqual(['fusion-machine']);
    expect(step.sharedResources).toEqual([{ rowId: 'fusion-machine', titleRu: 'Сварочный аппарат PP-R' }]);
  }
  expect(JSON.stringify(resources)).toBe(snapshot);
  expect(canonicalEstimateOperationReferences({ additionalOperations: shared.additionalOperations })).toEqual([]);
});
