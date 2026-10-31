import {canonicalEstimateOperationDescriptorOwnerV1,auditCanonicalEstimateOperationResourcesV1} from './canonicalEstimateOperationComposition';
import legacyDisplayBindings from '../../../../data/estimate-benchmarks/source-packs/legacy-operation-display-five-saved-v1.json';
import {resolveCanonicalLegacyOperationDisplayV1, canonicalLegacyResourceKindV1, canonicalLegacyResourceNameV1, CANONICAL_LEGACY_OPERATION_DISPLAY_VERSION_V1} from './canonicalEstimateOperationComposition';
import { canonicalEstimateWorkProcess, canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections } from './canonicalEstimateOperationComposition';
import type {CanonicalScopeRequirementDecisionV1 as Scope} from './canonicalScopeRequirementV1';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';

const operation = (groupId: string, operationId: string, title: string, ordinal?: number) => ({
  contractVersion: 'canonical-operation-resource/v1', groupId,
  groupTitleRu: groupId === 'partition' ? 'Монтаж перегородки' : 'Устройство трубопровода',
  operationId, operationTitleRu: title, completionCriterionRu: 'Проверить выполненный этап',
  ...(ordinal == null ? {} : { processOrdinal: ordinal, processRole: 'PROCESS' }),
});
const check=(status:Scope['status'],coveringRowIds:string[],kind:Scope['kind']='INCLUDED'):Scope=>({contractVersion:'canonical-scope-requirement-decision/v1',rowId:'check-'+status,groupId:'partition',groupTitleRu:'Монтаж перегородки',titleRu:'Проверка этапа',reasonRu:'Обоснование состава',kind,status,coveringRowIds,originalRowIds:[],missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false});

test('shared-operation references remain valid canonical JSON when optional fields were absent', () => {
 const source={...operation('membrane','order','Общий заказ рулонов',0),additionalOperations:[
  {operationId:'field',operationTitleRu:'Основное поле',completionCriterionRu:'Поле наплавлено'},
  {operationId:'details',operationTitleRu:'Детали',completionCriterionRu:'Детали герметичны',processOrdinal:2,
   processRole:'PROCESS',whenResourcePresent:['membrane-details']},
 ]};
 const before=JSON.stringify(source),references=canonicalEstimateOperationReferences(source);
 const serialized=canonicalEstimateStableJson(references);
 expect(()=>JSON.parse(serialized)).not.toThrow();
 expect(JSON.parse(serialized)).toEqual(references);
 expect(references[1]).not.toHaveProperty('processOrdinal');
 expect(references[1]).not.toHaveProperty('processRole');
 expect(references[1]).not.toHaveProperty('whenResourcePresent');
 expect(references[2]).toMatchObject({processOrdinal:2,processRole:'PROCESS',whenResourcePresent:['membrane-details']});
 const sections=canonicalEstimateResourceOperationSections([
  {rowId:'rolls',titleRu:'Рулоны',operation:source},
  {rowId:'membrane-details',titleRu:'Полосы',operation:operation('membrane','details','Детали',2)},
 ]);
 expect(sections.filter(section=>section.resourceIds.includes('rolls'))).toHaveLength(1);
 expect(sections.filter(section=>section.sharedResources.some(resource=>resource.rowId==='rolls'))).toHaveLength(2);
 expect(JSON.stringify(source)).toBe(before);
});
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

test('unbound resource rows stay visible without declaring a process or clearing unknown scope', () => {
  const resources = [
    { rowId: 'paint', titleRu: 'Нанесение двух слоёв краски', category: 'labor', operation: null },
    { rowId: 'primer', titleRu: 'Грунтование основания', category: 'construction_work', operation: null },
    { rowId: 'bucket', titleRu: 'Краска', category: 'material', operation: null },
    { rowId: 'unknown', titleRu: 'Количество не рассчитано', category: 'work', operation: {} },
  ];
  const snapshot = JSON.stringify(resources);
  expect(canonicalEstimateWorkProcess(resources, 'Окраска стен')).toEqual([]);
  const sections = canonicalEstimateResourceOperationSections(resources, [check('OBJECT_FACT_REQUIRED', [], 'OBJECT_SCOPE')]);
  expect(sections.find(section => section.operation == null)?.resourceIds).toEqual(resources.map(row => row.rowId));
  expect(sections.flatMap(section => section.scopeRequirements ?? []).flatMap(group => group.statuses)).toContain('OBJECT_FACT_REQUIRED');
  expect(JSON.stringify(resources)).toBe(snapshot);
});

test('a labor name and category cannot supply a missing or malformed operation declaration', () => {
  for (const category of ['labor', 'work', 'construction_work']) {
    for (const titleRu of ['Монтаж оборудования', 'Труд всего комплекса', 'Материалы и оснащение']) {
      for (const declared of [null, {}, { ...operation('partition', 'mount', 'Монтаж'), contractVersion: 'unsupported' }]) {
        expect(canonicalEstimateWorkProcess([{ rowId: 'row', category, titleRu, operation: declared }])).toEqual([]);
      }
    }
  }
});

test('an explicit real process keeps its source title and resources independent of row names', () => {
  const declared = operation('partition', 'frame', 'Монтаж каркаса', 0);
  const resources = [
    { rowId: 'crew', category: 'labor', titleRu: 'Рабочие', operation: declared },
    { rowId: 'tool', category: 'tool', titleRu: 'Инструмент', operation: declared },
    { rowId: 'material', category: 'material', titleRu: 'Профиль', operation: declared },
  ];
  const snapshot = JSON.stringify(resources);
  const groups = canonicalEstimateWorkProcess(resources);
  expect(groups).toHaveLength(1);
  expect(groups[0]?.operations.map(step => [step.operationId, step.operationTitleRu, step.resourceIds]))
    .toEqual([['frame', 'Монтаж каркаса', ['crew', 'tool', 'material']]]);
  expect(groups[0]?.sequenceUnspecified).toBeUndefined();
  expect(JSON.stringify(resources)).toBe(snapshot);
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

describe('CE40 actual current one-owner operation-only metadata',()=>{
 const factory=()=>require('../../../../scripts/estimate/r4a13/prepareS2754Ce40ReadyWallSeries') as typeof import('../../../../scripts/estimate/r4a13/prepareS2754Ce40ReadyWallSeries');
 const parent=()=>{const r=factory().ce40CurrentOperationRecordS2754();return{releaseId:r.membership.release_id as string,searchReleaseId:r.searchDocument.search_release_id as string,
  outputRoot:'TEST_ONLY_NO_PUBLICATION',masterPath:'TEST_ONLY_NOT_READ',masterSha256:'TEST_ONLY_NOT_READ',expectedBranch:'TEST_ONLY_NOT_READ'};};
 test('preserves the actual whole model and one labor owner through real core and TEST_ONLY cold views',async()=>{
  const f=factory(),r=f.ce40CurrentOperationRecordS2754(),before=JSON.stringify(r),cfg=f.ce40CurrentOperationOnlyConfigS2754(r,parent());
  expect(cfg).not.toHaveProperty('catalogAppend');expect(cfg.expectedParentShape).toEqual([27,16,16]);
  expect(cfg.parameterDefinitions).toEqual(r.capture.parameters);expect(cfg.formulaDefinitions).toEqual(r.capture.formulas);expect(cfg.resourceDefinitions).toHaveLength(16);
  expect(cfg.resourceDefinitions.filter(row=>row.row_id.includes(':physical:'))).toHaveLength(0);
  const actual=await cfg.verifyCore();expect(actual.status).toBe('PASS_CURRENT_CE40_ONE_LABOR_METADATA_ARITHMETIC_AND_TEST_ONLY_TRANSPORT');
  expect(actual.currentNeeds).toBe(r.contentPassport.decision.unresolvedResourceRowIds.length);expect(actual.FULL).toBe(false);
  expect(actual.actualDurableStoreTransaction).toBe(false);expect(JSON.stringify(r)).toBe(before);
 });
 test('rejects missing or changed genuine captured passport before core',()=>{
  const f=factory(),missing=f.ce40CurrentOperationRecordS2754(),changed=f.ce40CurrentOperationRecordS2754();
  Object.defineProperty(missing,'contentPassport',{value:undefined});changed.contentPassport.decision.quantityScope='FULL';
  expect(()=>f.ce40CurrentOperationOnlyConfigS2754(missing,parent())).toThrow('EXACT_REVIEWED_CE40_CURRENT_RECORD');
  expect(()=>f.ce40CurrentOperationOnlyConfigS2754(changed,parent())).toThrow('EXACT_REVIEWED_CE40_CURRENT_RECORD');
 });
 test('rejects actual map drift and an attempted quantity-unit change under the same retained guard',()=>{
  const f=factory(),r=f.ce40CurrentOperationRecordS2754(),cfg=f.ce40CurrentOperationOnlyConfigS2754(r,parent()),retained=cfg.binding.retainParentBindings;
  if(!retained?.operationCompositionOnly)throw Error('ACTUAL_CURRENT_OPERATION_MODE_REQUIRED');
  const owner='ceramic:ce40-ready-wall:5x5-2mm:labor',bad=f.ce40CurrentOperationRecordS2754(),operation=bad.operationByRowId[owner];
  if(!operation)throw Error('ACTUAL_CURRENT_LABOR_OPERATION_REQUIRED');operation.completionCriterionRu='HOSTILE_CHANGED_STAGE';
  expect(()=>f.ce40CurrentOperationOnlyConfigS2754(bad,parent())).toThrow('EXACT_REVIEWED_CE40_CURRENT_RECORD');
  const {assertMasterOperationCompositionComputationR1}=require('../../../../scripts/estimate/r4a13/masterOperationCompositionOnlyR1') as typeof import('../../../../scripts/estimate/r4a13/masterOperationCompositionOnlyR1');
  const changed=cfg.resourceDefinitions.map(row=>row.row_id===owner?{...row,unit_id:'kg'}:row);
  expect(()=>assertMasterOperationCompositionComputationR1(retained.capturedParent,retained.operationCompositionOnly!,{
   parameters:cfg.parameterDefinitions,formulas:cfg.formulaDefinitions,resources:changed},'REPRESENTATIVE')).toThrow('REPRESENTATIVE_resources_DRIFT');
 });
});

describe('exact saved revision legacy display adapter', () => {
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  it.each(legacyDisplayBindings.entries)('projects only saved installation links for $revisionId without changing saved fields', binding => {
    const resources = binding.expectedResources.map(resource => ({ ...clone(resource), quantity: null, unitPrice: null,
      amount: null, titleRu: 'Сохранённое имя', costOwnerId: resource.rowId, includedInProcurement: false }));
    const context = { revisionId: binding.revisionId, releaseId: binding.releaseId,
      checksumSha256: binding.checksumSha256, savedResources: resources };
    const stored = JSON.stringify({context, resources});
    const display = resolveCanonicalLegacyOperationDisplayV1(resources, context);
    expect(display).not.toBe(resources);
    expect(display).toHaveLength(resources.length);
    const changedIdRows = ['site-fixings','electrical-cable','isolator','drill','drill-bit','marking-pencil','screwdriver','electrical-tools','access','ppe']
      .map(key => 'factory-fan:onsite:' + key);
    const authorizedRows = [...changedIdRows, 'factory-fan:onsite:installation-labour'];
    expect([...binding.replacementRowIds].sort()).toEqual([...authorizedRows].sort());
    expect(display.filter((row, index) => row.operation.operationId !== resources[index]!.operation.operationId)
      .map(row => row.rowId).sort()).toEqual([...changedIdRows].sort());
    for (const [index, row] of display.entries()) {
      const original = resources[index]!;
      if (authorizedRows.includes(row.rowId)) {
        expect(row.operation).toEqual(binding.target);
      } else if (original.operation.operationId.endsWith(':operation:factory-supply')) {
        expect(row.operation).toEqual({...original.operation, operationTitleRu:'Комплектация вентилятора'});
        expect([row.operation.operationId,row.operation.processOrdinal,row.operation.completionCriterionRu,row.operation.additionalOperations])
          .toEqual([original.operation.operationId,original.operation.processOrdinal,original.operation.completionCriterionRu,original.operation.additionalOperations]);
      } else if (row.rowId === 'factory-fan:onsite:duct-interface') {
        expect(row.operation).toEqual({...original.operation, operationTitleRu:'Присоединение вентилятора к воздуховоду'});
      } else {
        expect(row.operation).toBe(original.operation);
      }
    }
    for (const [index, row] of display.entries()) {
      expect({...row, operation: resources[index]!.operation}).toEqual(resources[index]);
      expect(row.quantity).toBeNull(); expect(row.unitPrice).toBeNull(); expect(row.amount).toBeNull();
    }
    const sections = canonicalEstimateResourceOperationSections(resources, [], [], context);
    const install = sections.find(section => section.operation?.operationId === 'factory-fan:onsite:operation:installation-labour');
    expect(install?.resourceIds).toEqual(binding.replacementRowIds);
    expect(sections.flatMap(section => section.resourceIds).sort()).toEqual(resources.map(row => row.rowId).sort());
    expect(install?.sharedResources.length).toBeGreaterThan(0);
    const process = canonicalEstimateWorkProcess(resources, 'Сохранённая работа', context);
    expect(process.flatMap(group => group.operations).find(operation => operation.operationId === binding.target.operationId)?.resourceIds)
      .toEqual(expect.arrayContaining(binding.replacementRowIds));
    expect(JSON.stringify({context, resources})).toBe(stored);
    expect(CANONICAL_LEGACY_OPERATION_DISPLAY_VERSION_V1).toBe(legacyDisplayBindings.version);
  });

  it('refuses unlisted identities, incomplete or duplicated membership and changed original relations', () => {
    const binding = legacyDisplayBindings.entries[0];
    if (!binding) throw new Error('exact legacy binding required');
    const resources = clone(binding.expectedResources);
    const context = { revisionId: binding.revisionId, releaseId: binding.releaseId,
      checksumSha256: binding.checksumSha256, savedResources: resources };
    expect(resolveCanonicalLegacyOperationDisplayV1(resources)).toBe(resources);
    for (const key of ['revisionId', 'releaseId', 'checksumSha256'] as const)
      expect(resolveCanonicalLegacyOperationDisplayV1(resources, {...context, [key]: 'unlisted'})).toBe(resources);
    expect(resolveCanonicalLegacyOperationDisplayV1(resources, {...context, savedResources: resources.slice(1)})).toBe(resources);
    expect(resolveCanonicalLegacyOperationDisplayV1(resources, {...context, savedResources: [...resources.slice(1), resources[1]!]})).toBe(resources);
    const changed = resources.map((row, index) => index === 0 ? {...row, operation: {...row.operation, operationId: 'foreign'}} : row);
    expect(resolveCanonicalLegacyOperationDisplayV1(changed, {...context, savedResources: changed})).toBe(changed);
    expect(resolveCanonicalLegacyOperationDisplayV1(changed, context)).toBe(changed);
    const duplicate = [...resources, resources[0]!];
    expect(resolveCanonicalLegacyOperationDisplayV1(duplicate, context)).toBe(duplicate);
    const filtered = resources.filter(row => binding.replacementRowIds.includes(row.rowId));
    expect(resolveCanonicalLegacyOperationDisplayV1(filtered, context).every(row => row.operation.operationId === binding.target.operationId)).toBe(true);
    expect(resolveCanonicalLegacyOperationDisplayV1(filtered, {...context, savedResources: filtered})).toBe(filtered);
  });
});

it.each(legacyDisplayBindings.entries)('binds TOOL ACCESSORY and PPE display overrides to the same complete saved revision $revisionId', binding => {
  const resources = JSON.parse(JSON.stringify(binding.expectedResources)) as typeof binding.expectedResources;
  const context = { revisionId: binding.revisionId, releaseId: binding.releaseId,
    checksumSha256: binding.checksumSha256, savedResources: resources };
  const before = JSON.stringify({resources, context});
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:drill', context)).toBe('TOOL');
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:screwdriver', context)).toBe('TOOL');
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:drill-bit', context)).toBe('ACCESSORY');
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:ppe', context)).toBe('PPE');
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:access', context)).toBe('EQUIPMENT');
  for (const rowId of ['factory-fan:axial-100-timer:setting-screwdriver', 'factory-fan:axial-125-timer:setting-screwdriver']) {
    expect(canonicalLegacyResourceKindV1(rowId, context))
      .toBe(binding.expectedResources.some(resource => resource.rowId === rowId) ? 'TOOL' : null);
  }
  const malformed = JSON.parse(JSON.stringify(context));
  malformed.savedResources[0] = null;
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:drill', malformed)).toBeNull();
  expect(canonicalLegacyResourceKindV1('unlisted-row', context)).toBeNull();
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:drill')).toBeNull();
  for (const key of ['revisionId', 'releaseId', 'checksumSha256'] as const)
    expect(canonicalLegacyResourceKindV1('factory-fan:onsite:drill', {...context, [key]: ''})).toBeNull();
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:drill', {...context, savedResources: []})).toBeNull();
  const changed = resources.map(row => row.rowId === 'factory-fan:onsite:drill'
    ? {...row, operation: {...row.operation, operationId: 'foreign'}} : row);
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:drill', {...context, savedResources: changed})).toBeNull();
  expect(JSON.stringify({resources, context})).toBe(before);
});

it.each(legacyDisplayBindings.entries)('changes only the exact saved duct operation caption for $revisionId', binding => {
  const resources = JSON.parse(JSON.stringify(binding.expectedResources)) as typeof binding.expectedResources;
  const context = {revisionId: binding.revisionId, releaseId: binding.releaseId,
    checksumSha256: binding.checksumSha256, savedResources: resources};
  const before = JSON.stringify({resources, context});
  const rowId = 'factory-fan:onsite:duct-interface';
  const original = resources.find(row => row.rowId === rowId);
  if (!original) throw new Error('saved duct relationship required');
  const display = resolveCanonicalLegacyOperationDisplayV1(resources, context);
  const duct = display.find(row => row.rowId === rowId);
  expect(duct?.operation).toEqual({...original.operation, operationTitleRu: 'Присоединение вентилятора к воздуховоду'});
  const sections = canonicalEstimateResourceOperationSections(resources.map(row => ({...row, titleRu: 'Сохранённый ресурс'})), [], [], context);
  expect(sections.find(section => section.resourceIds.includes(rowId))?.operation?.operationTitleRu)
    .toBe('Присоединение вентилятора к воздуховоду');
  const drift = resources.map(row => row.rowId === rowId
    ? {...row, operation: {...row.operation, operationId: 'foreign-duct'}} : row);
  expect(resolveCanonicalLegacyOperationDisplayV1(drift, {...context, savedResources: drift})).toBe(drift);
  expect(canonicalLegacyResourceKindV1('factory-fan:onsite:drill', {...context, savedResources: drift})).toBeNull();
  expect(resolveCanonicalLegacyOperationDisplayV1(resources, {...context, checksumSha256: 'unlisted'})).toBe(resources);
  expect(JSON.stringify({resources, context})).toBe(before);
});
it.each(legacyDisplayBindings.entries)('projects exact source-authored names without rewriting saved fields for $revisionId', binding => {
  const resources = binding.expectedResources.map(row => ({...JSON.parse(JSON.stringify(row)),
    titleRu: 'Сохранённое полное имя', sourceTitleRu: 'Исходное полное имя',
    specificationRu: 'Сохранённая характеристика', detailsRu: ['Полный источник'],
    quantity: null, unitPrice: null, costOwnerId: row.rowId, procurementEligible: false}));
  const context = {revisionId: binding.revisionId, releaseId: binding.releaseId,
    checksumSha256: binding.checksumSha256, savedResources: resources};
  const stored = JSON.stringify({resources, context});
  for (const [rowId, name] of Object.entries(binding.resourceNamesByRowId)) {
    expect(canonicalLegacyResourceNameV1(rowId, context)).toBe(name);
    expect(canonicalLegacyResourceNameV1(rowId, context, true)).toBeNull();
  }
  expect(canonicalLegacyResourceNameV1('factory-fan:onsite:electrical-cable', context)).toBe('Кабель и материалы подключения');
  expect(canonicalLegacyResourceNameV1('factory-fan:onsite:access', context)).toBe('Оборудование для безопасного доступа');
  expect(canonicalLegacyResourceNameV1('factory-fan:onsite:duct-interface', context)).toBe('Воздуховод и соединительные детали');
  expect(canonicalLegacyResourceNameV1('unlisted', context)).toBeNull();
  expect(canonicalLegacyResourceNameV1('factory-fan:onsite:drill')).toBeNull();
  for (const key of ['revisionId','releaseId','checksumSha256'] as const)
    expect(canonicalLegacyResourceNameV1('factory-fan:onsite:drill', {...context, [key]: 'unlisted'})).toBeNull();
  const drift = resources.map(row => row.rowId === 'factory-fan:onsite:duct-interface'
    ? {...row, operation: {...row.operation, operationId: 'foreign'}} : row);
  expect(canonicalLegacyResourceNameV1('factory-fan:onsite:drill', {...context, savedResources: drift})).toBeNull();
  expect(canonicalLegacyResourceNameV1('factory-fan:onsite:drill', {...context, savedResources: resources.slice(1)})).toBeNull();
  const display = resolveCanonicalLegacyOperationDisplayV1(resources, context);
  expect(display.map(row => ({...row, operation: resources.find(saved => saved.rowId === row.rowId)!.operation}))).toEqual(resources);
  expect(display.find(row => row.rowId === 'factory-fan:onsite:duct-interface')?.operation.operationTitleRu)
    .toBe('Присоединение вентилятора к воздуховоду');
  expect(JSON.stringify({resources, context})).toBe(stored);
});
it.each(legacyDisplayBindings.entries)('R589 names the exact saved fan and every supplied BOM component without rewriting ownership for $revisionId',binding=>{
 const resources=binding.expectedResources.map(row=>({...JSON.parse(JSON.stringify(row)),titleRu:'Сохранённое исходное имя',quantity:null,unitPrice:null,costOwnerId:row.rowId,procurementEligible:false}));
 const context={revisionId:binding.revisionId,releaseId:binding.releaseId,checksumSha256:binding.checksumSha256,savedResources:resources};
 const stored=JSON.stringify({resources,context});
 const known=resources.filter(row=>row.operation.operationId.endsWith(':operation:factory-supply'));
 expect(known.length).toBeGreaterThanOrEqual(5);expect(known.length).toBeLessThanOrEqual(6);
 const names:Record<string,string>={fixings:'Шурупы и дюбели',seal:'Уплотнительная прокладка',manual:'Инструкция по установке',box:'Упаковочная коробка','setting-screwdriver':'Отвёртка для настройки таймера'};
 for(const row of known){
  const role=row.rowId.split(':').at(-1)!;
  const expected=role==='owner'?'Вытяжной вентилятор Ø'+(row.rowId.includes(':axial-100-')?'100':'125')+' мм, 220–240 В, 50 Гц, '+(row.rowId.includes('-timer:')?'с таймером':'без таймера'):names[role];
  expect(expected).toBeDefined();expect(canonicalLegacyResourceNameV1(row.rowId,context)).toBe(expected);
  expect(canonicalLegacyResourceNameV1(row.rowId,context,true)).toBeNull();
  expect(canonicalLegacyResourceNameV1(row.rowId,{...context,checksumSha256:'foreign'})).toBeNull();
 }
 const display=resolveCanonicalLegacyOperationDisplayV1(resources,context);
 for(const row of known){const shown=display.find(x=>x.rowId===row.rowId)!;
  expect(shown.operation).toEqual({...row.operation,operationTitleRu:'Комплектация вентилятора'});
  expect([shown.rowId,shown.quantity,shown.unitPrice,shown.costOwnerId,shown.procurementEligible]).toEqual([row.rowId,row.quantity,row.unitPrice,row.costOwnerId,row.procurementEligible]);
 }
 const foreign=resources.map(row=>row===known[0]?{...row,operation:{...row.operation,operationId:'foreign-supply'}}:row);
 expect(canonicalLegacyResourceNameV1(known[0]!.rowId,{...context,savedResources:foreign})).toBeNull();
 expect(canonicalLegacyResourceNameV1(known[0]!.rowId,{...context,savedResources:resources.slice(1)})).toBeNull();
 expect(JSON.stringify({resources,context})).toBe(stored);
});


test('conditional primary operation keeps one resource at its actual remaining consumer without a phantom stage', () => {
  const mount = { ...operation('facade', 'mount', 'Крепление плит', 0), whenResourcePresent: ['adhesive'] };
  const base = operation('facade', 'base', 'Устройство базового слоя', 1);
  const finish = { ...operation('facade', 'finish', 'Отделка поверхности', 2), whenResourcePresent: ['finish-coat'] };
  const tool = { rowId: 'saved-shared-float', sourceRowId: 'float', titleRu: 'Тёрка',
    quantity: 3, manualQuantity: true, unitPrice: 150, costOwnerRowId: 'one-tool-owner',
    operation: { ...mount, additionalOperations: [base, finish] } };
  const resources = [tool];
  const before = JSON.stringify(resources);
  const sections = canonicalEstimateResourceOperationSections(resources);
  expect(sections.map(section => section.operation?.operationId)).toEqual(['base']);
  expect(sections[0]!.resourceIds).toEqual(['saved-shared-float']);
  expect(sections[0]!.sharedResources).toEqual([]);
  expect(canonicalEstimateWorkProcess(resources)[0]!.operations.map(value => value.operationId)).toEqual(['base']);
  expect(JSON.stringify(resources)).toBe(before);
});

test('conditional primary and shared consumers return only with their saved source anchors', () => {
  const mount = { ...operation('facade', 'mount', 'Крепление плит', 0), whenResourcePresent: ['adhesive'] };
  const base = operation('facade', 'base', 'Устройство базового слоя', 1);
  const finish = { ...operation('facade', 'finish', 'Отделка поверхности', 2), whenResourcePresent: ['finish-coat'] };
  const tool = { rowId: 'float', titleRu: 'Тёрка', operation: { ...mount, additionalOperations: [base, finish] } };
  const resources = [tool,
    { rowId: 'saved-adhesive', sourceRowId: 'adhesive', titleRu: 'Клеевой раствор', operation: mount },
    { rowId: 'saved-finish', sourceRowId: 'finish-coat', titleRu: 'Штукатурный состав', operation: finish }];
  const before = JSON.stringify(resources), sections = canonicalEstimateResourceOperationSections(resources);
  expect(sections.map(section => section.operation?.operationId)).toEqual(['mount', 'base', 'finish']);
  expect(sections.filter(section => section.resourceIds.includes('float'))).toHaveLength(1);
  expect(sections.find(section => section.operation?.operationId === 'mount')!.resourceIds).toEqual(['float', 'saved-adhesive']);
  for (const operationId of ['base', 'finish']) {
    expect(sections.find(section => section.operation?.operationId === operationId)!.sharedResources)
      .toContainEqual({ rowId: 'float', titleRu: 'Тёрка', ownerOperationTitleRu: 'Крепление плит' });
  }
  expect(JSON.stringify(resources)).toBe(before);
});

test('scope coverage follows an active conditional consumer while a resource with no active consumer stays visible', () => {
  const absent = { ...operation('partition', 'lining', 'Обшивка', 1), whenResourcePresent: ['lining-material'] };
  const frame = operation('partition', 'frame', 'Монтаж каркаса', 0);
  const tool = { rowId: 'tool', titleRu: 'Инструмент', operation: { ...absent, additionalOperations: [frame] } };
  const scope = check('INCLUDED', ['tool']);
  const sections = canonicalEstimateResourceOperationSections([tool], [scope], [{ rowId: scope.rowId, operation: tool.operation }]);
  expect(sections).toHaveLength(1);
  expect(sections[0]!.operation?.operationId).toBe('frame');
  expect(sections[0]!.scopeRequirements?.[0]!.statuses).toEqual(['INCLUDED']);
  const unbound = { ...tool, operation: absent };
  const noConsumer = canonicalEstimateResourceOperationSections([unbound]);
  expect(noConsumer).toHaveLength(1);
  expect(noConsumer[0]!.operation).toBeNull();
  expect(noConsumer[0]!.resourceIds).toEqual(['tool']);
  expect(canonicalEstimateWorkProcess([unbound])).toEqual([]);
});

test('source operation owner preserves group identity and isolates source and borrower aliases',()=>{
 const source={...operation('g','a','Работа',3),whenResourcePresent:['paid','borrower']};
 const owner=canonicalEstimateOperationDescriptorOwnerV1([source,operation('other','a','Иная работа',8)]);
 source.completionCriterionRu='changed source';source.whenResourcePresent[0]='changed source';
 const borrowed=owner('g','a');borrowed.completionCriterionRu='changed borrower';
 (borrowed.whenResourcePresent as string[])[0]='changed borrower';
 expect(owner('g','a').completionCriterionRu).toBe('Проверить выполненный этап');
 expect(owner('g','a').whenResourcePresent).toEqual(['paid','borrower']);
 expect(owner('other','a').operationTitleRu).toBe('Иная работа');
 expect(()=>owner('missing','a')).toThrow('CANONICAL_OPERATION_OWNER_MISSING');
 expect(()=>owner('g','missing')).toThrow('CANONICAL_OPERATION_OWNER_MISSING');
 expect(()=>canonicalEstimateOperationDescriptorOwnerV1([source,source])).toThrow('CANONICAL_OPERATION_OWNER_DUPLICATE');
 expect(()=>canonicalEstimateOperationDescriptorOwnerV1([operation('g','a','Работа')])).toThrow('CANONICAL_OPERATION_OWNER_INVALID');
});

test('real consumer audit accepts shared owner references but still rejects explicit borrower metadata corruption',()=>{
 const owner=canonicalEstimateOperationDescriptorOwnerV1([operation('g','a','Подготовка',1),operation('g','b','Монтаж',2)]);
 const rows=[{rowId:'paid',nameRu:'Материал',unitId:'piece',resourceKind:'MATERIAL',publicNameVerified:true,
  operation:owner('g','a')},{rowId:'borrower',nameRu:'Оснастка',unitId:'piece',resourceKind:'ACCESSORY',publicNameVerified:true,
  operation:{...owner('g','b'),additionalOperations:[owner('g','a')]}}];
 expect(auditCanonicalEstimateOperationResourcesV1({resources:rows}).issues.filter(issue=>issue.code==='OPERATION_METADATA_CONFLICT')).toEqual([]);
 const corrupt=[rows[0]!,{...rows[1]!,operation:{...owner('g','b'),additionalOperations:[{...owner('g','a'),processOrdinal:99}]}}];
 expect(auditCanonicalEstimateOperationResourcesV1({resources:corrupt}).issues.some(issue=>issue.code==='OPERATION_METADATA_CONFLICT')).toBe(true);
});
