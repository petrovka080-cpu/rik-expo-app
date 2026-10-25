import {createHash} from 'node:crypto';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {parameterDefinitions,formulaDefinitions,resourceDefinitions,sourcePack} from '../../src/lib/estimate/v4/roofWindowOperationResourcesS2750';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateRevisionRowFromStorage} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {adaptCanonicalRevisionToStructuredEstimate} from '../../src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateCatalogItem,type CanonicalEstimateRevisionView} from '../../src/lib/estimate/backendPlatform/contracts';
import {buildStructuredEstimateRequestDraft} from '../../src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection,canonicalPreliminaryNamingEvidenceReadRevisionIds,
  missingCanonicalPreliminaryNamingEvidenceRevisionIds,enrichCanonicalPreliminaryNamingEvidence,
  type CanonicalPreliminaryNamingEvidence} from '../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection';
import {compactConsumerRepairBundleForDurableStorage} from '../../src/lib/platform/compactConsumerRepairDurableState';
import {buildRequestEstimateViewModel,requestEstimatePublicRevisionDiff} from '../../src/features/consumerRepair/requestEstimateViewModel';
import {consumerRepairRowPublicResourcePresentation,consumerRepairRowCalculatedQuantity} from '../../src/features/consumerRepair/consumerRepairRowMetadata';
import {compareEstimateDraftRevisions} from '../../src/lib/estimate/compareEstimateDraftRevisions';
import type {ConsumerRepairRequestItem,ConsumerRepairDraftBundle} from '../../src/lib/consumerRequests/consumerRequestTypes';
import {ConsumerRepairRequestScreenController} from '../../src/features/consumerRepair/ConsumerRepairRequestScreen';
import {loadConsumerRepairCanonicalNamingEvidence} from '../../src/features/consumerRepair/ConsumerRepairRequestScreenContainer';
import * as requestRepository from '../../src/lib/consumerRequests/consumerRequestRepository';
import * as backendClient from '../../src/lib/estimate/backendPlatform/canonicalEstimateClient';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));

const releaseId='aaaaaaaa-1111-4111-8111-111111111111';
const rootId='aaaaaaaa-2222-4222-8222-222222222222',childId='aaaaaaaa-3333-4333-8333-333333333333';
const complete={lantern_count:14,lantern_model:sourcePack.model,base_stock_units:0,base_reserve_units:0,dome_stock_units:0,dome_reserve_units:0};
const baseRow='roof-cfp100100:base',baseName='Основание окна со стеклопакетом — проём 100 × 100 см';

// This contract compiles the real window fixture below. Importing an unrelated
// foundation calculator here needlessly loads the entire legacy 10000-work graph.
function emptyDraft():ConsumerRepairDraftBundle {
 const createdAt='2026-10-09T10:00:00Z',id='durable-name-fixture';
 return {draft:{id,consumerUserId:'fixture-owner',repairType:'construction',status:'draft',missingData:[],createdAt},
  items:[],media:[],pdfs:[],projectExecutionDrafts:[],events:[],
  marketplaceLink:{id:'fixture-market-link',requestDraftId:id,status:'not_sent',createdAt}};
}

async function fixture(input:Record<string,unknown>, options:{
  previous?:ConsumerRepairDraftBundle;id?:string;overrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];
  resources?:typeof resourceDefinitions;
}={}) {
  const id=options.id ?? rootId;
  const result=await compileCanonicalEstimateCore({operation:options.overrides?'recalculate':'compile',compilerVersion:sourcePack.contract,
    catalogId:sourcePack.catalogId,primaryMeasureParameterId:'lantern_count',parameterDefinitions,formulaDefinitions:[...formulaDefinitions],
    resourceDefinitions:options.resources ?? resourceDefinitions,submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',
    priceItems:[],rowOverrides:options.overrides,maximumResourceRows:21,
    hashJson:value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
  const checksum=createHash('sha256').update(canonicalEstimateStableJson(result.revisionProjection)).digest('hex');
  const stored={id,release_id:releaseId,catalog_id:sourcePack.catalogId,checksum_sha256:checksum,row_count:result.rows.length,
    input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',
    amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
  const transport=projectCanonicalEstimatePreliminaryNeedTransport(stored);
  const catalog:CanonicalEstimateCatalogItem={catalogId:sourcePack.catalogId,releaseId,namespace:'global',workKey:'roof_lanterns',
    titleRu:'Установка окон в крыше',domain:'roofing',definitionVersion:7,applicability:{},professionalMetadata:{},parameterSchema:[]};
  const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:id,
    parentRevisionId:options.previous?.estimateDraftRevisionState?.currentRevisionId ?? null,releaseId,catalogId:sourcePack.catalogId,
    revisionNumber:options.previous?2:1,status:'ready',currencyCode:'KGS',parameters:result.parameters,totals:result.totals,
    rowCount:result.rows.length,checksumSha256:checksum,compilerVersion:sourcePack.contract,createdAt:'2026-10-09T10:00:00Z',
    amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds};
  const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,
    rows:result.rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))});
  const draft=buildStructuredEstimateRequestDraft(payload),seed=emptyDraft();
  const next:ConsumerRepairDraftBundle={...seed,draft:{...seed.draft,id:'durable-name-fixture',selectedWorkTitleRu:'Установка окон в крыше'},
    items:draft.items.map((item,index)=>({...item,id:'fixture-'+index,requestDraftId:'durable-name-fixture'})) as ConsumerRepairRequestItem[],
    structuredEstimatePayload:draft.structuredEstimatePayload};
  return {bundle:appendCanonicalBackendRevisionProjection({previousBundle:options.previous ?? null,nextBundle:next,payload}),payload,result,revision,catalog};
}
function replay(bundle:ConsumerRepairDraftBundle):ConsumerRepairDraftBundle {
  return JSON.parse(JSON.stringify(compactConsumerRepairBundleForDurableStorage(bundle)));
}
function publicRow(bundle:ConsumerRepairDraftBundle,rowId=baseRow) {
  return buildRequestEstimateViewModel(bundle)!.sections.flatMap(section=>section.items).find(item=>item.sourceParameters?.rowCode===rowId)!;
}

function namingController(bundle:ConsumerRepairDraftBundle,load:(revisionId:string,draftId:string)=>Promise<CanonicalPreliminaryNamingEvidence|null>) {
  const controller=new ConsumerRepairRequestScreenController({consumerUserId:bundle.draft.consumerUserId!,
    onPrepareCanonicalEstimate:jest.fn(),onLoadCanonicalRevisionDraft:jest.fn(),onLoadCanonicalParameterSession:jest.fn(),
    onLoadCanonicalNamingEvidence:load,onRecalculateCanonicalEstimate:jest.fn(),onSelectCanonicalCatalogItem:jest.fn(),
    onAddCanonicalCatalogItem:jest.fn(),onOpenPhotoForMaterialRecognition:jest.fn()});
  const mutable=controller as unknown as {state:typeof controller.state;setState:(update:unknown,callback?:()=>void)=>void;
    hydrateCurrentCanonicalNamingEvidence:()=>Promise<void>;hydrateCurrentCanonicalParameterSession:()=>Promise<void>};
  mutable.state={...mutable.state,bundle,pendingCanonicalRowEditCount:5,statusMessage:'Пять несохранённых правок'};
  mutable.setState=(update,callback)=>{
    const next=typeof update==='function'?(update as (state:typeof mutable.state)=>Partial<typeof mutable.state>|null)(mutable.state)
      :update as Partial<typeof mutable.state>;
    if(next)mutable.state={...mutable.state,...next};callback?.();
  };
  mutable.hydrateCurrentCanonicalParameterSession=jest.fn().mockResolvedValue(undefined);
  return {controller,mutable};
}

test.each([{lantern_count:14},complete])('legacy cold-open evidence hydration preserves five pending edits and does not recalculate: %p',async input=>{
  const {bundle,payload}=await fixture(input),legacy=replay(bundle);
  for(const row of legacy.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!)delete row.canonicalNeedAdmissionV1;
  const load=jest.fn().mockResolvedValue(payload.canonicalBackend!),{controller,mutable}=namingController(legacy,load);
  let release!:()=>void;
  load.mockImplementation(()=>new Promise(resolve=>{release=()=>resolve(payload.canonicalBackend!);}));
  const pending=mutable.hydrateCurrentCanonicalNamingEvidence();
  // Simulate edits made after GET started; the callback must use the latest UI.
  const edited={...legacy,items:legacy.items.map((row,index)=>index>=5?row:{...row,quantity:100+index,
    quantityEditedByConsumer:true,sourceParameters:{...row.sourceParameters,manualQuantityOverride:true,
      calculatedQuantityBeforeOverride:consumerRepairRowCalculatedQuantity(row)}})};
  mutable.state={...mutable.state,bundle:edited};const itemSnapshot=JSON.stringify(edited.items);
  await mutable.hydrateCurrentCanonicalNamingEvidence();expect(load).toHaveBeenCalledTimes(1);
  release();await pending;
  expect(mutable.state.bundle!.items).toBe(edited.items);expect(JSON.stringify(mutable.state.bundle!.items)).toBe(itemSnapshot);
  expect(mutable.state.pendingCanonicalRowEditCount).toBe(5);expect(mutable.state.statusMessage).toBe('Пять несохранённых правок');
  expect(mutable.state.bundle!.estimateDraftRevisionState!.revisions).toHaveLength(1);
  expect(mutable.state.bundle!.estimateDraftRevisionState!.diffs).toHaveLength(0);
  expect(publicRow(replay(mutable.state.bundle!)).titleRu).toBe(baseName);
  expect(controller.props.onRecalculateCanonicalEstimate).not.toHaveBeenCalled();
});

test.each(['switch','switch-back','unmount'])('a late naming GET is ignored after leaving the source workspace: %s',async kind=>{
  const {bundle,payload}=await fixture(complete),legacy=replay(bundle);
  for(const row of legacy.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!)delete row.canonicalNeedAdmissionV1;
  let release!:()=>void;
  const load=jest.fn().mockImplementationOnce(()=>new Promise<CanonicalPreliminaryNamingEvidence|null>(resolve=>{release=()=>resolve(payload.canonicalBackend!);}))
    .mockResolvedValue(null);
  const {controller,mutable}=namingController(legacy,load),pending=mutable.hydrateCurrentCanonicalNamingEvidence();
  if(kind==='unmount')controller.componentWillUnmount();
  else {
    const previous=mutable.state;
    mutable.state={...mutable.state,bundle:{...legacy,draft:{...legacy.draft,id:'other-workspace'}}};
    controller.componentDidUpdate(controller.props,previous);
    if(kind==='switch-back'){
      const other=mutable.state;mutable.state={...mutable.state,bundle:legacy};controller.componentDidUpdate(controller.props,other);
    }
  }
  release();await pending;
  expect(mutable.state.bundle!.estimateDraftRevisionState).toBe(legacy.estimateDraftRevisionState);
  expect(mutable.state.pendingCanonicalRowEditCount).toBe(5);
});

test('naming recovery failure leaves the bundle, parameter state and readiness fields intact',async()=>{
  const {bundle}=await fixture(complete),legacy=replay(bundle);
  for(const row of legacy.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!)delete row.canonicalNeedAdmissionV1;
  const {mutable}=namingController(legacy,jest.fn().mockRejectedValue(new Error('temporary read failure')));
  const before=mutable.state;
  await mutable.hydrateCurrentCanonicalNamingEvidence();expect(mutable.state).toBe(before);
});

test('repository already enriched still returns original evidence to a legacy screen without resaving or rebuilding rows',async()=>{
  const {bundle,revision}=await fixture(complete),legacy=replay(bundle);
  for(const row of legacy.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!)delete row.canonicalNeedAdmissionV1;
  const read=jest.spyOn(requestRepository,'findConsumerRepairBundle').mockReturnValue(bundle);
  const save=jest.spyOn(requestRepository,'saveConsumerRepairBundle');
  const get=jest.spyOn(backendClient,'getCanonicalEstimateRevision').mockResolvedValue(revision);
  try {
    const load=jest.fn((revisionId:string,requestDraftId:string)=>loadConsumerRepairCanonicalNamingEvidence({
      revisionId,requestDraftId,consumerUserId:bundle.draft.consumerUserId!,workspaceGenerationRef:{current:1}}));
    const {mutable}=namingController(legacy,load);await mutable.hydrateCurrentCanonicalNamingEvidence();
    expect(publicRow(replay(mutable.state.bundle!)).titleRu).toBe(baseName);
    expect(mutable.state.bundle!.items).toBe(legacy.items);expect(get).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();expect(read).toHaveBeenCalledTimes(2);
  }finally{read.mockRestore();save.mockRestore();get.mockRestore();}
});

test('repository hydration preserves an edit made during GET and refuses writes after a workspace change',async()=>{
  const {bundle,revision}=await fixture(complete),legacy=replay(bundle);
  for(const row of legacy.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!)delete row.canonicalNeedAdmissionV1;
  let stored=legacy,release!:(value:CanonicalEstimateRevisionView)=>void;
  const read=jest.spyOn(requestRepository,'findConsumerRepairBundle').mockImplementation(()=>stored);
  const save=jest.spyOn(requestRepository,'saveConsumerRepairBundle').mockImplementation(next=>{stored=next;return next;});
  const get=jest.spyOn(backendClient,'getCanonicalEstimateRevision').mockImplementation(()=>new Promise(resolve=>{release=resolve;}));
  const generation={current:1},input={revisionId:rootId,requestDraftId:legacy.draft.id,consumerUserId:legacy.draft.consumerUserId!,workspaceGenerationRef:generation};
  try {
    const pending=loadConsumerRepairCanonicalNamingEvidence(input);
    stored={...legacy,items:legacy.items.map((row,index)=>index===0?{...row,quantity:99}:row)};
    const latestItems=stored.items;release(revision);await pending;
    expect(save).toHaveBeenCalledTimes(1);expect(stored.items).toBe(latestItems);expect(stored.items[0]!.quantity).toBe(99);
    expect(stored.estimateDraftRevisionState!.revisions).toHaveLength(1);expect(stored.estimateDraftRevisionState!.diffs).toHaveLength(0);
    save.mockClear();stored=legacy;
    const stale=loadConsumerRepairCanonicalNamingEvidence(input);generation.current+=1;release(revision);
    expect(await stale).toBeNull();expect(save).not.toHaveBeenCalled();expect(stored).toBe(legacy);
  }finally{read.mockRestore();save.mockRestore();get.mockRestore();}
});

test.each([{lantern_count:14},complete])('durable replay keeps source-bound names and unknown quantities without storing the large payload: %p',async input=>{
  const {bundle}=await fixture(input),before=JSON.stringify(bundle);
  expect(publicRow(bundle).titleRu).toBe(baseName);
  const restored=replay(bundle);
  expect(restored.structuredEstimatePayload).toBeNull();
  expect(publicRow(restored).titleRu).toBe(baseName);
  expect(restored.items.map(item=>[item.quantity,item.unitPrice])).toEqual(bundle.items.map(item=>[item.quantity,item.unitPrice]));
  expect(restored.estimateDraftRevisionState?.revisions).toHaveLength(1);
  expect(JSON.stringify(bundle)).toBe(before);
});

test('a cold replay rejects changed naming evidence or need hashes instead of trusting item metadata',async()=>{
  const {bundle}=await fixture({lantern_count:14});
  for(const kind of ['descriptor','item-hash','saved-hash']) {
    const changed=replay(bundle),item=changed.items.find(item=>item.sourceParameters?.rowCode===baseRow)!;
    if(kind==='descriptor') item.sourceParameters={...item.sourceParameters,
      canonicalPublicResourcePresentationV1:{...(item.sourceParameters?.canonicalPublicResourcePresentationV1 as object),nameRu:'Подменённое имя'}};
    else if(kind==='item-hash') item.sourceParameters={...item.sourceParameters,rowSha256:'f'.repeat(64)};
    else changed.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!.find(row=>row.rowId===baseRow)!.canonicalNeedAdmissionV1!.needSha256='f'.repeat(64);
    expect(consumerRepairRowPublicResourcePresentation(publicRow(changed))).toBeNull();
  }
});

test('an older local projection is enriched only by its own exact backend payload without adding revisions or diffs',async()=>{
  const {bundle,payload}=await fixture(complete),legacy=replay(bundle);
  for(const row of legacy.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!) delete row.canonicalNeedAdmissionV1;
  const restored=appendCanonicalBackendRevisionProjection({previousBundle:legacy,nextBundle:legacy,payload});
  expect(restored.estimateDraftRevisionState!.revisions).toHaveLength(1);expect(restored.estimateDraftRevisionState!.diffs).toHaveLength(0);
  expect(publicRow(replay(restored)).titleRu).toBe(baseName);
  const wrongOwner={...payload,canonicalBackend:{...payload.canonicalBackend!,releaseId:'bbbbbbbb-1111-4111-8111-111111111111'}};
  const refused=appendCanonicalBackendRevisionProjection({previousBundle:legacy,nextBundle:legacy,payload:wrongOwner});
  expect(refused.estimateDraftRevisionState).toBe(legacy.estimateDraftRevisionState);
});

test.each(['missing','empty','duplicate','title','quantity','unit','price'])('legacy backfill refuses changed or missing preliminary rows: %s',async kind=>{
  const {bundle,payload}=await fixture(complete),legacy=replay(bundle);
  for(const row of legacy.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!) delete row.canonicalNeedAdmissionV1;
  const snapshot=JSON.stringify(legacy.estimateDraftRevisionState);
  const needs=payload.canonicalBackend!.preliminaryNeeds!.map(row=>({...row}));
  if(kind==='duplicate') needs[1]={...needs[0]!};
  if(kind==='title') needs[0]!.titleRu+=' изменено';
  if(kind==='quantity') needs[0]!.quantity='123';
  if(kind==='unit') needs[0]!.unitId='kg';
  if(kind==='price') needs[0]!.unitPrice='123';
  const changed={...payload,canonicalBackend:{...payload.canonicalBackend!,
    preliminaryNeeds:kind==='missing'?undefined:kind==='empty'?[]:needs}};
  const result=appendCanonicalBackendRevisionProjection({previousBundle:legacy,nextBundle:legacy,payload:changed});
  expect(result.estimateDraftRevisionState).toBe(legacy.estimateDraftRevisionState);
  expect(JSON.stringify(result.estimateDraftRevisionState)).toBe(snapshot);
});

test('legacy enrichment preserves existing rows and existing admission evidence',async()=>{
  const {bundle,payload}=await fixture(complete),legacy=replay(bundle);
  const rows=legacy.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!,first=rows[0]!;
  delete rows[1]!.canonicalNeedAdmissionV1;
  const before=rows.map(({canonicalNeedAdmissionV1,...row})=>row);
  const result=appendCanonicalBackendRevisionProjection({previousBundle:legacy,nextBundle:legacy,payload});
  const restored=result.estimateDraftRevisionState!.revisions[0]!.preliminaryRows!;
  expect(restored[0]).toBe(first);
  expect(restored.map(({canonicalNeedAdmissionV1,...row})=>row)).toEqual(before);
  expect(restored[1]!.canonicalNeedAdmissionV1).toBeDefined();
  expect(result.estimateDraftRevisionState!.diffs).toEqual(legacy.estimateDraftRevisionState!.diffs);
});

test('the public comparison preserves eight need-to-calculated changes and all quantities, prices and counters',async()=>{
  const before=await fixture({lantern_count:14}),after=await fixture(complete,{previous:before.bundle,id:childId});
  const state=after.bundle.estimateDraftRevisionState!,diff=state.diffs[0]!,snapshot=JSON.stringify(diff);
  expect(diff.changedRowsCount).toBe(8);
  const shown=requestEstimatePublicRevisionDiff(state,diff)!;
  expect(shown.changedRows.find(row=>row.rowId===baseRow)!.titleRu).toBe(baseName);
  expect(shown.changedRows.map(({titleRu,beforeTitleRu,...fields})=>fields))
    .toEqual(diff.changedRows.map(({titleRu,beforeTitleRu,...fields})=>fields));
  expect(shown.changedRows.map(row=>row.titleRu).join(' ')).not.toContain('VELUX');
  expect(JSON.stringify(diff)).toBe(snapshot);
});

test.each(['missing','invalid'])('comparison never borrows the previous name for an unverified after owner: %s',async kind=>{
  const before=await fixture(complete),after=await fixture(complete,{previous:before.bundle,id:childId,
    overrides:{[baseRow]:{unitPrice:'10',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE'}}}});
  const state=JSON.parse(JSON.stringify(after.bundle.estimateDraftRevisionState)) as NonNullable<ConsumerRepairDraftBundle['estimateDraftRevisionState']>;
  const diff=state.diffs[0]!,raw=diff.changedRows.find(row=>row.rowId===baseRow)!;
  if(kind==='missing') state.revisions=state.revisions.filter(row=>row.revisionId!==childId);
  else state.revisions.find(row=>row.revisionId===childId)!.resolvedIdentity!.checksum='f'.repeat(64);
  const shown=requestEstimatePublicRevisionDiff(state,diff)!.changedRows.find(row=>row.rowId===baseRow)!;
  expect(shown.titleRu).toBe(raw.titleRu);expect(shown.beforeTitleRu).toBe(raw.beforeTitleRu);
});

test('a verified deletion still uses the deleted row own saved name',async()=>{
  const before=await fixture(complete),after=await fixture(complete,{previous:before.bundle,id:childId});
  // Isolate the display selector from compiler resource dependencies.
  const state=JSON.parse(JSON.stringify(after.bundle.estimateDraftRevisionState)) as NonNullable<ConsumerRepairDraftBundle['estimateDraftRevisionState']>;
  const from=state.revisions.find(row=>row.revisionId===rootId)!,to=state.revisions.find(row=>row.revisionId===childId)!;
  to.boq.rows=to.boq.rows.filter(row=>row.rowId!==baseRow);
  const diff=compareEstimateDraftRevisions(from,to);
  const shown=requestEstimatePublicRevisionDiff(state,diff)!.changedRows.find(row=>row.rowId===baseRow)!;
  expect(shown.afterState).toBe('ABSENT');expect(shown.titleRu).toBe(baseName);
});

test.each([{lantern_count:14},complete])('pending quantity editing retains verified names after cold replay: %p',async input=>{
  const {bundle}=await fixture(input),edited=replay(bundle),item=edited.items.find(row=>row.sourceParameters?.rowCode===baseRow)!;
  const domeRow='roof-cfp100100:dome',domeName=publicRow(edited,domeRow).titleRu;
  const baseline=consumerRepairRowCalculatedQuantity(item);
  item.quantity=15;item.quantityEditedByConsumer=true;
  item.sourceParameters={...item.sourceParameters,manualQuantityOverride:true,calculatedQuantityBeforeOverride:baseline};
  const snapshot=JSON.stringify(edited);
  expect(publicRow(edited).titleRu).toBe(baseName);expect(publicRow(edited,domeRow).titleRu).toBe(domeName);
  expect(publicRow(edited).quantity).toBe(15);expect(JSON.stringify(edited)).toBe(snapshot);
  item.sourceParameters.calculatedQuantityBeforeOverride=13;
  expect(consumerRepairRowPublicResourcePresentation(publicRow(edited))).toBeNull();
});

test('pending known preliminary amounts and repeated saved manual amounts use their actual formula baseline',async()=>{
  const {bundle}=await fixture({lantern_count:14}),edited=replay(bundle);
  const needs=edited.items.filter(row=>row.sourceParameters?.canonicalPreliminaryNeed===true && row.quantity!=null);
  expect(needs.length).toBeGreaterThan(0);
  const names=needs.map(row=>publicRow(edited,String(row.sourceParameters!.rowCode)).titleRu);
  needs.forEach(row=>{
    const baseline=consumerRepairRowCalculatedQuantity(row);row.quantity=123;row.quantityEditedByConsumer=true;
    row.sourceParameters={...row.sourceParameters,manualQuantityOverride:true,calculatedQuantityBeforeOverride:baseline};
  });
  expect(needs.map(row=>publicRow(edited,String(row.sourceParameters!.rowCode)).titleRu)).toEqual(names);
  const manual=await fixture(complete,{overrides:{[baseRow]:{quantity:'15',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE'}}}});
  const pending=replay(manual.bundle),base=pending.items.find(row=>row.sourceParameters?.rowCode===baseRow)!;
  const baseline=consumerRepairRowCalculatedQuantity(base);expect(baseline).toBe(14);
  base.quantity=16;base.quantityEditedByConsumer=true;
  base.sourceParameters={...base.sourceParameters,manualQuantityOverride:true,calculatedQuantityBeforeOverride:baseline};
  expect(publicRow(pending).titleRu).toBe(baseName);expect(publicRow(pending).quantity).toBe(16);
});

test('a saved manual preliminary amount retains its original known baseline before the model is selected',async()=>{
  const {lantern_model,...withoutModel}=complete;
  const manual=await fixture(withoutModel,{overrides:{[baseRow]:{quantity:'15',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE'}}}});
  for(const cold of [false,true]) {
    const pending=cold?replay(manual.bundle):JSON.parse(JSON.stringify(manual.bundle)) as ConsumerRepairDraftBundle;
    const base=pending.items.find(row=>row.sourceParameters?.rowCode===baseRow)!;
    expect(base.sourceParameters?.canonicalPreliminaryNeed).toBe(true);
    expect(base.quantity).toBe(15);
    const baseline=consumerRepairRowCalculatedQuantity(base);expect(baseline).toBe(14);
    base.quantity=16;base.quantityEditedByConsumer=true;
    base.sourceParameters={...base.sourceParameters,manualQuantityOverride:true,calculatedQuantityBeforeOverride:baseline};
    expect(publicRow(pending).titleRu).toBe(baseName);expect(publicRow(pending).quantity).toBe(16);
  }
});

test.each([complete, {lantern_count:14}])('clearing a saved manual amount retains names only at its original formula baseline: %p',async input=>{
  const saved=await fixture(input,{overrides:{[baseRow]:{quantity:'15',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE'}}}});
  const pending=replay(saved.bundle),base=pending.items.find(row=>row.sourceParameters?.rowCode===baseRow)!;
  const baseline=consumerRepairRowCalculatedQuantity(base);expect(baseline).toBe('lantern_model' in input ? 14 : null);
  base.quantity=baseline;base.quantityEditedByConsumer=false;
  base.sourceParameters={...base.sourceParameters,manualQuantityOverride:false,calculatedQuantityBeforeOverride:baseline};
  const snapshot=JSON.stringify(pending);
  expect(publicRow(pending).titleRu).toBe(baseName);
  expect(publicRow(pending).quantity).toBe(baseline);expect(JSON.stringify(pending)).toBe(snapshot);
  base.quantity=999;
  expect(consumerRepairRowPublicResourcePresentation(publicRow(pending))).toBeNull();
});

test('clearing a saved manual source gap retains the verified name without accepting a quantity',async()=>{
  const original=await fixture({lantern_count:14});
  const unknown=original.bundle.items.find(row=>row.sourceParameters?.canonicalPreliminaryNeed===true
    && row.quantity==null && consumerRepairRowPublicResourcePresentation(publicRow(original.bundle,String(row.sourceParameters.rowCode)))!=null)!;
  expect(unknown).toBeDefined();
  const rowId=String(unknown.sourceParameters!.rowCode),name=publicRow(original.bundle,rowId).titleRu;
  const saved=await fixture({lantern_count:14},{overrides:{[rowId]:{quantity:'4',unitPrice:'1291.35',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE'}}}});
  const pending=replay(saved.bundle),item=pending.items.find(row=>row.sourceParameters?.rowCode===rowId)!;
  expect(item.quantity).toBe(4);expect(consumerRepairRowCalculatedQuantity(item)).toBeNull();
  item.quantity=null;item.quantityEditedByConsumer=false;
  item.sourceParameters={...item.sourceParameters,manualQuantityOverride:false,calculatedQuantityBeforeOverride:null};
  const snapshot=JSON.stringify(pending),shown=publicRow(pending,rowId);
  expect(shown.titleRu).toBe(name);expect(shown.quantity).toBeNull();expect(shown.unitPrice).toBe(1291.35);
  expect(JSON.stringify(pending)).toBe(snapshot);
  item.sourceParameters.rowSha256='f'.repeat(64);
  expect(consumerRepairRowPublicResourcePresentation(publicRow(pending,rowId))).toBeNull();
});

test('manual names survive replay and both title/price comparisons without renaming the previous side',async()=>{
  const before=await fixture(complete),name='Моё окно VELUX по ведомости заказчика';
  const after=await fixture(complete,{previous:before.bundle,id:childId,
    overrides:{[baseRow]:{titleRu:name,unitPrice:'10',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE'}}}});
  expect(publicRow(replay(after.bundle)).titleRu).toBe(name);
  const state=after.bundle.estimateDraftRevisionState!,raw=state.diffs[0]!;
  const shown=requestEstimatePublicRevisionDiff(state,raw)!.changedRows.find(row=>row.rowId===baseRow)!;
  expect(shown.titleRu).toBe(name);expect(shown.beforeTitleRu).toBe(baseName);
  expect(shown.afterUnitPrice).toBe(10);expect(shown.afterQuantity).toBe(14);
});

test('a replacement descriptor is applied to its saved side only',async()=>{
  const before=await fixture(complete),titleRu='Другой источник: основание окна 120 × 120 см';
  const resources=resourceDefinitions.map(row=>row.row_id!==baseRow?row:{...row,title_ru:titleRu,resource_graph:{...row.resource_graph,
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:titleRu,nameRu:'Основание окна 120 × 120 см',
      brandAndModelRu:null,specificationRu:null,detailsRu:[]}}});
  const after=await fixture(complete,{previous:before.bundle,id:childId,resources}),state=after.bundle.estimateDraftRevisionState!;
  const shown=requestEstimatePublicRevisionDiff(state,state.diffs[0]!)!.changedRows.find(row=>row.rowId===baseRow)!;
  expect(shown.beforeTitleRu).toBe(baseName);expect(shown.titleRu).toBe('Основание окна 120 × 120 см');
});

test('a cold comparison restores classification from each exact revision, with two bounded reads and no recalculation',async()=>{
  const before=await fixture({lantern_count:14}),after=await fixture(complete,{previous:before.bundle,id:childId}),legacy=replay(after.bundle);
  for(const revision of legacy.estimateDraftRevisionState!.revisions)for(const row of revision.preliminaryRows??[]){
    if(row.canonicalNeedAdmissionV1){delete row.canonicalNeedAdmissionV1.category;delete row.canonicalNeedAdmissionV1.costTreatment;}
  }
  expect(canonicalPreliminaryNamingEvidenceReadRevisionIds(legacy)).toEqual([childId,rootId]);
  expect(missingCanonicalPreliminaryNamingEvidenceRevisionIds(legacy)).toEqual([childId,rootId]);
  const rawDiff=JSON.stringify(legacy.estimateDraftRevisionState!.diffs),items=legacy.items;
  const load=jest.fn(async(id:string)=>id===childId?after.payload.canonicalBackend!:before.payload.canonicalBackend!);
  const {controller,mutable}=namingController(legacy,load);await mutable.hydrateCurrentCanonicalNamingEvidence();
  expect(load.mock.calls.map(args=>args[0])).toEqual([childId,rootId]);
  expect(missingCanonicalPreliminaryNamingEvidenceRevisionIds(mutable.state.bundle)).toEqual([]);
  expect(mutable.state.bundle!.items).toBe(items);expect(mutable.state.bundle!.estimateDraftRevisionState!.currentRevisionId).toBe(childId);
  expect(JSON.stringify(mutable.state.bundle!.estimateDraftRevisionState!.diffs)).toBe(rawDiff);
  expect(mutable.state.pendingCanonicalRowEditCount).toBe(5);expect(controller.props.onRecalculateCanonicalEstimate).not.toHaveBeenCalled();
});

test('classification enrichment rejects conflicting saved evidence and never uses another revision checksum',async()=>{
  const {bundle,payload}=await fixture({lantern_count:14}),legacy=replay(bundle),row=legacy.estimateDraftRevisionState!.revisions[0]!.preliminaryRows![0]!;
  delete row.canonicalNeedAdmissionV1!.costTreatment;row.canonicalNeedAdmissionV1!.category='foreign-category';
  expect(enrichCanonicalPreliminaryNamingEvidence(legacy,payload.canonicalBackend!)).toBe(legacy);
  delete row.canonicalNeedAdmissionV1!.category;
  expect(enrichCanonicalPreliminaryNamingEvidence(legacy,{...payload.canonicalBackend!,checksumSha256:'f'.repeat(64)})).toBe(legacy);
  const restored=enrichCanonicalPreliminaryNamingEvidence(legacy,payload.canonicalBackend!);
  expect(restored).not.toBe(legacy);expect(missingCanonicalPreliminaryNamingEvidenceRevisionIds(restored)).toEqual([]);
});

test('repository refuses an unrelated saved revision without issuing GET',async()=>{
  const {bundle}=await fixture(complete),read=jest.spyOn(requestRepository,'findConsumerRepairBundle').mockReturnValue(bundle);
  const get=jest.spyOn(backendClient,'getCanonicalEstimateRevision');
  try{
    expect(await loadConsumerRepairCanonicalNamingEvidence({revisionId:childId,requestDraftId:bundle.draft.id,
      consumerUserId:bundle.draft.consumerUserId!,workspaceGenerationRef:{current:1}})).toBeNull();expect(get).not.toHaveBeenCalled();
  }finally{read.mockRestore();get.mockRestore();}
});

test('comparison hides verified unpriced counters, keeps physical materials, and preserves the raw history',async()=>{
  const counter='roof-cfp100100:daylight';
  const resources=resourceDefinitions.map(row=>row.row_id!==counter?row:{...row,resource_graph:{...row.resource_graph,
    publicResourcePresentationV1:{...row.resource_graph.publicResourcePresentationV1,rowKind:'CALCULATION_DETAIL'}}});
  const before=await fixture(complete,{resources}),after=await fixture({...complete,lantern_count:15},{previous:before.bundle,id:childId,resources});
  const state=after.bundle.estimateDraftRevisionState!,raw=state.diffs[0]!,snapshot=JSON.stringify(state);
  expect(raw.changedRows.some(row=>row.rowId===counter)).toBe(true);
  const shown=requestEstimatePublicRevisionDiff(state,raw)!;
  expect(shown.changedRows.some(row=>row.rowId===counter)).toBe(false);expect(shown.changedRows.some(row=>row.rowId===baseRow)).toBe(true);
  expect(shown.changedRowsCount).toBe(shown.changedRows.length);expect(JSON.stringify(state)).toBe(snapshot);
  // Even a saved zero price prevents hiding a financial change.
  const protectedDiff={...raw,changedRows:raw.changedRows.map(row=>row.rowId===counter?{...row,afterUnitPrice:0}:row)};
  expect(requestEstimatePublicRevisionDiff(state,protectedDiff)!.changedRows.some(row=>row.rowId===counter)).toBe(true);
});
