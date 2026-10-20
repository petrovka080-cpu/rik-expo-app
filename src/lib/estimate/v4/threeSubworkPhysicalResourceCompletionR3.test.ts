import fixture from '../../../../data/estimate-benchmarks/fixtures/facade-ceresit-ct190-kz-material-subworks-r1.json';
import {createHash} from 'node:crypto';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {facadePhysicalResourceCompletionR3,floorConcretePhysicalResourceCompletionR3,floorScreedPhysicalResourceCompletionR3,threeSubworkResourceScheduleR3} from './threeSubworkPhysicalResourceCompletionR3';
import {facadeMineralWoolOperationCompositionR2} from './facadeMineralWoolOperationCompositionR2';
import {floorConcreteSimplePresentationR2,floorScreed20mmSimplePresentationR2} from './floorSimpleResourcePresentationR2';
import {facadeCeresitCt190PackR1 as ct,facadeCeresitCt190ChoiceParameterR1 as choice} from './facadeCeresitCt190MaterialSubworksR1';
import {FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT as legacyFacts} from './facadeMineralWoolInstallationR1';
import {floorConcreteUnderlayerScenarioFactsR1 as concreteFacts,floorConcreteUnderlayerPackR1 as concrete} from './floorConcreteUnderlayerKrer11Column09R1';
import {floorCementScreed20mmScenarioFactsR1 as screedFacts,floorCementScreed20mmPackR1 as screed} from './floorCementScreed20mmKrer11Column01R1';
import {projectResourceParameterPrefixR1 as prefix,projectResourceRequiredR1 as required,projectResourceNotRequiredR1 as notRequired,
 projectResourceSeparateR1 as separate,projectResourceIncludedR1 as included,projectResourceIncludedInPositionR1 as includedIn} from './projectSubworkResourceScheduleR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {buildCanonicalProfessionalPdfProjection} from '../backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactPreliminaryNeeds,type CanonicalArtifactRevision} from '../backendPlatform/canonicalEstimateArtifactContract';
import {canonicalEstimateResourceOperationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import {consumerRepairRowIsTechnicalDetail,registerConsumerRepairRowVerifiedPresentation} from '../../../features/consumerRepair/consumerRepairRowMetadata';
import {parseCanonicalPublicResourcePresentationV1,canonicalPublicResourceRowKindV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {canonicalPublicHiddenResourceAlternativeIdsV1,type CanonicalPublicResourceAlternativeInputV1} from '../backendPlatform/canonicalPublicResourceAlternativesV1';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateRevisionRowFromStorage} from '../backendPlatform/canonicalEstimateRevisionReadMapper';
import {adaptCanonicalRevisionToStructuredEstimate} from '../backendPlatform/canonicalEstimateForemanAdapter';
import {buildStructuredEstimateRequestDraft} from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection} from '../../consumerRequests/consumerCanonicalBackendRevisionProjection';
import {buildRequestEstimateViewModel} from '../../../features/consumerRepair/requestEstimateViewModel';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateCatalogItem,type CanonicalEstimateRevisionView} from '../backendPlatform/contracts';
import type {ConsumerRepairRequestItem,ConsumerRepairDraftBundle} from '../../consumerRequests/consumerRequestTypes';

const factories={facade:facadePhysicalResourceCompletionR3,concrete:floorConcretePhysicalResourceCompletionR3,screed:floorScreedPhysicalResourceCompletionR3};
const previous={facade:facadeMineralWoolOperationCompositionR2,concrete:floorConcreteSimplePresentationR2,screed:floorScreed20mmSimplePresentationR2};
type Key=keyof typeof factories;
const baseFacts=(key:Key):Record<string,unknown>=>key==='facade'?{...legacyFacts,...fixture.facts,[choice]:ct.selectedValueRu}:key==='concrete'?concreteFacts('10'):screedFacts('100');
function scheduledFacts(key:Key):Record<string,unknown>{
 const schedule=threeSubworkResourceScheduleR3(key),facts=baseFacts(key);
 for(const item of schedule.positions){const p=prefix(schedule.key,item.key);
  if(item.optional){facts[p+'_required']=notRequired;continue;}
  facts[p+'_payment']=included;facts[p+'_quantity']=item.key==='glass-mesh'?'113':item.key==='base-coat-work'?'100':'1';
  facts[p+'_specification']='Проверочный пример выбранного ресурса';facts[p+'_reference']='Проверочная ведомость и состав основной цены; не реальный договор';
 }
 return facts;
}
function select(key:Key,facts:Record<string,unknown>,item:string,mode=included,quantity='1'){
 const schedule=threeSubworkResourceScheduleR3(key),p=prefix(schedule.key,item);
 return {...facts,...(schedule.positions.find(position=>position.key===item)!.optional?{[p+'_required']:required}:{}),[p+'_payment']:mode,[p+'_quantity']:quantity,
  [p+'_specification']:'Проверочный пример выбранного ресурса',[p+'_reference']:'Проверочная ведомость; количество и отдельная граница цены, не реальное предложение'};
}
const id=(key:Key,item:string,branch='included')=>'subwork-resource:'+threeSubworkResourceScheduleR3(key).key+':'+item+':'+branch;
const provenance={kind:'manual' as const,reason:'Проверочный пример; не действительная цена'};

it.each(['facade','concrete','screed'] as const)('keeps unresolved %s provision checks inside the actual work group',async key=>{
 const result=await compile(key,factories[key](),baseFacts(key));
 const controls=factories[key]().resources.filter(row=>row.row_id.includes(':ownership-check:'));
 expect(controls.length).toBeGreaterThan(0);
 for(const row of controls){const scope=row.resource_graph.scopeRequirementV1 as {groupId:string;groupTitleRu:string};
  expect(scope.groupTitleRu).not.toBe('Обеспечение включёнными ресурсами');
  expect(scope.groupId).toBe((row.resource_graph.operationCompositionV1 as {groupId:string}).groupId);
 }
 expect(result.preliminaryNeeds.some(row=>row.row_id.startsWith('subwork-resource:'))).toBe(true);
});

it.each(['material','tool','equipment','service','transport','delivery'])('keeps an included %s in legacy estimates visible even without an authored display descriptor',category=>{
 const graph={costTreatment:'INCLUDED_IN_RESOURCE_ROWS',includedInResourceOwnerRowId:'original-price-owner',operationCompositionV1:{groupId:'legacy'}};
 expect(canonicalPublicResourceRowKindV1({rowId:'legacy-physical',titleRu:'Существующий ресурс',descriptor:null,costTreatment:graph.costTreatment,graph,category})).toBe('RESOURCE');
 expect(consumerRepairRowIsTechnicalDetail({id:'legacy-physical',titleRu:'Существующий ресурс',category,quantity:1,unitPrice:null,calculationTrace:JSON.stringify({resourceGraph:graph}),
  sourceParameters:{rowCode:'legacy-physical',canonicalCostTreatment:graph.costTreatment,canonicalPreliminaryNeed:false,payable:false}})).toBe(false);
});

it('recognizes legacy balance counters in the editor and PDF from the same structural evidence, without hiding physical material',()=>{
 const graph={costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:'actual-material-order'};
 const item={id:'legacy-counter',titleRu:'Контроль остатка',category:'material',quantity:2,unitPrice:null,calculationTrace:JSON.stringify({resourceGraph:graph}),
  sourceParameters:{rowCode:'legacy-counter',canonicalCostTreatment:graph.costTreatment,canonicalPreliminaryNeed:false,payable:false}};
 expect(canonicalPublicResourceRowKindV1({rowId:'legacy-counter',titleRu:item.titleRu,descriptor:null,costTreatment:graph.costTreatment,graph,category:'material'})).toBe('CALCULATION_DETAIL');
 expect(consumerRepairRowIsTechnicalDetail(item)).toBe(true);
 const before=item.calculationTrace;item.calculationTrace=JSON.stringify({resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE'}});
 expect(consumerRepairRowIsTechnicalDetail(item)).toBe(false);expect(before).not.toBe(item.calculationTrace);
 item.calculationTrace='{invalid';expect(consumerRepairRowIsTechnicalDetail(item)).toBe(false);
});

function alternativeRows():CanonicalPublicResourceAlternativeInputV1[]{
 const group={contractVersion:'canonical-public-resource-alternatives/v1',groupId:'test-mesh',sourceRowIds:['separate','included']};
 return ['separate','included'].map(id=>({id,sourceRowId:id,scopeId:'one-revision',titleRu:'Фасадная стеклосетка',unitId:'m2',quantity:null,preliminary:true,unitPrice:null,amount:null,manual:false,
  graph:{publicResourceAlternativesV1:group,costTreatment:id==='separate'?'OWN_COST':'INCLUDED_IN_RESOURCE_ROWS'}}));
}
it('collapses indistinguishable pending alternatives while preserving the source rows',()=>{
 const rows=alternativeRows(),before=JSON.stringify(rows);
 expect([...canonicalPublicHiddenResourceAlternativeIdsV1(rows)]).toEqual(['included']);expect(JSON.stringify(rows)).toBe(before);
});
it.each(['price','amount','known','manual','other-revision','different-quantity','malformed','other-unit'])('retains both alternatives when %s makes folding unsafe',change=>{
 const rows=alternativeRows(),second=rows[1]!;
 const changed={...second,...(change==='price'?{unitPrice:'77'}:change==='amount'?{amount:'0'}:change==='known'?{preliminary:false}:change==='manual'?{manual:true}:
  change==='other-revision'?{scopeId:'different-revision'}:change==='different-quantity'?{quantity:'2'}:change==='other-unit'?{unitId:'kg'}:
   {graph:{publicResourceAlternativesV1:{contractVersion:'canonical-public-resource-alternatives/v1',groupId:'test-mesh',sourceRowIds:['included'],extra:true}}})};
 expect(canonicalPublicHiddenResourceAlternativeIdsV1([rows[0]!,changed]).size).toBe(0);
});

it('shows one physical need through real compact transport, draft, editor and PDF while the immutable alternatives stay intact',async()=>{
 const result=await compile('facade',facadePhysicalResourceCompletionR3(),baseFacts('facade'));
 const stored={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',definition_version_id:'33333333-3333-4333-8333-333333333333',
  catalog_id:ct.catalogId,checksum_sha256:'a'.repeat(64),row_count:result.rows.length,input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',
  amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
 const original=JSON.stringify(stored),transport=projectCanonicalEstimatePreliminaryNeedTransport(stored);
 const meshNeeds=transport.preliminaryNeeds.filter(need=>need.rowId.startsWith(id('facade','glass-mesh','')));
 expect(meshNeeds).toHaveLength(2);expect(meshNeeds.every(need=>need.publicResourceAlternatives!=null)).toBe(true);
 expect(meshNeeds.every(need=>!Object.hasOwn(need,'calculationTrace'))).toBe(true);
 const catalog:CanonicalEstimateCatalogItem={catalogId:ct.catalogId,releaseId:stored.release_id,namespace:'global',workKey:'facade-resource-test',titleRu:'Утепление фасада',domain:'facade',
  definitionVersion:6,applicability:{},professionalMetadata:{},parameterSchema:[]};
 const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:stored.id,parentRevisionId:null,releaseId:stored.release_id,catalogId:ct.catalogId,
  revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:result.parameters,totals:result.totals,rowCount:result.rows.length,checksumSha256:stored.checksum_sha256,
  compilerVersion:'test-resource-alternatives',createdAt:'2026-10-20T00:00:00Z',
  amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds};
 const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:result.rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))});
 const draft=buildStructuredEstimateRequestDraft(payload);
 const items=draft.items.map((item,index)=>({...item,id:'request-item-'+index,requestDraftId:'test-draft'})) as ConsumerRepairRequestItem[];
 const bundle=appendCanonicalBackendRevisionProjection({previousBundle:null,nextBundle:{draft:{id:'test-draft'},items,structuredEstimatePayload:draft.structuredEstimatePayload} as ConsumerRepairDraftBundle,payload});
 const rawCount=bundle.items.length,view=buildRequestEstimateViewModel(bundle)!;
 expect(view.sections.flatMap(section=>section.items).filter(item=>String(item.sourceParameters?.rowCode).startsWith(id('facade','glass-mesh','')))).toHaveLength(1);
 expect(bundle.items.length).toBe(rawCount);expect(bundle.items.filter(item=>String(item.sourceParameters?.rowCode).startsWith(id('facade','glass-mesh','')))).toHaveLength(2);
 const projection=buildCanonicalProfessionalPdfProjection({revision:stored,rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(stored),workTitleRu:'Утепление фасада'});
 const table=projection.html.split('<table class="client">')[1]!.split('</table>')[0]!;
 expect(table.match(/<strong>Щелочестойкая фасадная стеклосетка<\/strong>/gu)).toHaveLength(1);
 expect(projection.grandTotalStatus).not.toBe('COMPLETE');expect(JSON.stringify(stored)).toBe(original);
});
function compile(key:Key,definition:AutomaticOwnerDefinition,facts:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[]){
 const schedule=threeSubworkResourceScheduleR3(key);
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'three-subwork-resource-completion-r3',catalogId:key==='facade'?ct.catalogId:key==='concrete'?concrete.proposedIdentity.catalogId:screed.proposedIdentity.catalogId,
  primaryMeasureParameterId:schedule.primaryParameterId,parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
  submittedParameters:facts,confirmedParameters:{},rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:definition.resources.length,hashJson:async v=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex')});
}

it('does not inherit the mounting m² price as the unit price of included mesh or protective work',async()=>{
 const result=await compile('facade',facadePhysicalResourceCompletionR3(),scheduledFacts('facade'),{},[
  {price_key:'rc09:facade_mineral_wool_install',unit_id:'m2',currency_code:'KGS',unit_price:'80',snapshot_id:'44444444-4444-4444-8444-444444444444'}]);
 expect(result.totals.amount).toBe('8000');
 for(const key of ['glass-mesh','base-coat-work'])expect(result.rows.find(row=>row.row_id===id('facade',key))).toMatchObject({unit_price:null,amount:null,included_in_estimate:false});
});

it.each(['facade','concrete','screed']as const)('preserves the original %s quantities, source formulas and one whole labour owner',async key=>{
 const before=previous[key](),snapshot=JSON.stringify(before),after=factories[key]();
 expect(after.formulas.slice(0,before.formulas.length)).toEqual(before.formulas);
 expect(after.parameters.slice(0,before.parameters.length)).toEqual(before.parameters);
 expect(after.parameters.every(p=>p.default_value===null)).toBe(true);
 const old=await compile(key,before,baseFacts(key)),next=await compile(key,after,scheduledFacts(key));
 for(const row of old.rows){const retained=next.rows.find(r=>r.row_id===row.row_id);expect(retained).toBeDefined();
  expect({quantity:retained!.quantity,unit:retained!.unit_id,amount:retained!.amount}).toEqual({quantity:row.quantity,unit:row.unit_id,amount:row.amount});}
 if(key==='concrete')expect(next.rows.find(r=>r.row_id===concrete.prefix+':whole-labor')!.quantity).toBe('18');
 if(key==='screed')expect(next.rows.find(r=>r.row_id===screed.prefix+':whole-labor')!.quantity).toBe('39.51');
 expect(JSON.stringify(before)).toBe(snapshot);
 const ids=after.resources.map(r=>r.row_id);expect(new Set(ids).size).toBe(ids.length);
 expect(after.resources.filter(r=>r.source_metadata?.projectTakeoffNotNorm===true).every(r=>
  r.source_metadata?.universal_consumption_claimed===false&&Array.isArray(r.source_metadata.normativeTrace)&&r.source_metadata.normativeTrace.length===0)).toBe(true);
});

it('has explicit material, mechanism, tool and service coverage of the facade gaps',()=>{
 const keys=threeSubworkResourceScheduleR3('facade').positions.map(p=>p.key);
 expect(keys).toEqual(expect.arrayContaining(['ct17-primer','ct29-repair','ct99-treatment','glass-mesh','starter-fasteners','starter-connectors',
  'corner-profile','window-profile','drip-profile','joint-tape','joint-sealant','scaffold-rental','scaffold-assembly','facade-cover','wash-equipment',
  'mixer','drill','drill-bit','large-notched-float','mesh-notched-float','flat-float','mixing-container','water-measure','gloves','goggles','material-delivery','waste-transport','base-coat-work']));
 expect(keys).toHaveLength(40);
 const result=facadePhysicalResourceCompletionR3();
 const sections=canonicalEstimateResourceOperationSections(result.resources.map(r=>({rowId:r.row_id,titleRu:r.title_ru,operation:r.resource_graph.operationCompositionV1})));
 expect(sections.every(section=>section.operation!==null)).toBe(true);
 for(const key of ['mixer','glass-mesh','gloves']){
  expect(sections.filter(s=>s.resourceIds.includes(id('facade',key)))).toHaveLength(1);
 }
});

it('keeps actual order amounts while a mesh takeoff is priced once and the common mix stays shared',async()=>{
 const d=facadePhysicalResourceCompletionR3(),facts=select('facade',scheduledFacts('facade'),'glass-mesh',separate,'113');
 const result=await compile('facade',d,facts,{[ct.prefix+':dry-mix-order']:{unitPrice:'77',provenance},[id('facade','glass-mesh','separate')]:{unitPrice:'15',provenance}});
 expect(result.totals.amount).toBe('86395');
 expect(result.rows.find(r=>r.row_id===id('facade','glass-mesh','separate'))).toMatchObject({quantity:'113',amount:'1695',included_in_procurement:true});
 expect(result.rows.some(r=>r.row_id===id('facade','glass-mesh'))).toBe(false);
 expect(result.rows.filter(r=>r.row_id===ct.prefix+':dry-mix-order')).toHaveLength(1);
});

it.each(['facade','concrete','screed']as const)('shows included physical tools in the %s editor and PDF without adding a second price',async key=>{
 const result=await compile(key,factories[key](),scheduledFacts(key));
 const tool=result.rows.find(r=>r.row_id===id(key,key==='facade'?'flat-float':'straightedge'))!;
 expect(tool).toMatchObject({included_in_estimate:false,included_in_procurement:false,unit_price:null,amount:null});
 const graph=(tool.calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph;
 const presentation=parseCanonicalPublicResourcePresentationV1(graph.publicResourcePresentationV1)!;expect(presentation).not.toBeNull();
 const ui={id:tool.row_id,titleRu:String(tool.title_ru),category:'tool',quantity:Number(tool.quantity),unitPrice:null,
  sourceParameters:{canonicalCostTreatment:'INCLUDED_IN_RESOURCE_ROWS',canonicalPreliminaryNeed:false,payable:false}};
 registerConsumerRepairRowVerifiedPresentation(ui,presentation,presentation);
 expect(consumerRepairRowIsTechnicalDetail(ui)).toBe(false);
 const revision:CanonicalArtifactRevision={id:'test-resource-schedule',release_id:'test-release',catalog_id:key,checksum_sha256:estimateDeterministicHash(result),
  row_count:result.rows.length,input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
 const pdf=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:'Проверка состава'});
 const table=pdf.html.split('<table class="client">')[1]!.split('</table>')[0]!;
 expect(table).toContain(presentation.nameRu);expect(table).toContain('Включено в №');expect(table).toContain('Без доплаты');
 if(key!=='facade')expect(table).toContain('Уточнить цену');
});

it('does not infer a tool quantity, delivery trip or mesh allowance from work area or from a supplied price',async()=>{
 const d=facadePhysicalResourceCompletionR3(),empty=await compile('facade',d,baseFacts('facade'),{[id('facade','glass-mesh','separate')]:{unitPrice:'77',provenance}});
 expect(empty.rows.some(r=>r.row_id.startsWith('subwork-resource:'))).toBe(false);
 expect(empty.preliminaryNeeds.some(r=>r.row_id===id('facade','glass-mesh','separate'))).toBe(true);
 const a=await compile('facade',d,scheduledFacts('facade'));
 const b=await compile('facade',d,{...scheduledFacts('facade'),area_m2:'200'});
 for(const key of ['glass-mesh','mixer','mixing-container','gloves'])expect(b.rows.find(r=>r.row_id===id('facade',key))!.quantity).toBe(a.rows.find(r=>r.row_id===id('facade',key))!.quantity);
 expect(b.rows.find(r=>r.row_id===id('facade','glass-mesh'))!.quantity).toBe('113');
});

it('cannot turn an included physical resource into a second payment by overriding price and inclusion',async()=>{
 const result=await compile('facade',facadePhysicalResourceCompletionR3(),scheduledFacts('facade'),{
  [id('facade','glass-mesh')]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
 expect(result.rows.find(row=>row.row_id===id('facade','glass-mesh'))).toMatchObject({included_in_estimate:false,included_in_procurement:false});
 expect(result.totals.amount).toBe('0');
});

it('requires a separate scope when the original mounting owner has zero work quantity',async()=>{
 await expect(compile('facade',facadePhysicalResourceCompletionR3(),{...scheduledFacts('facade'),area_m2:'0'})).rejects.toThrow();
});

it('links a drill bit to the selected drill offer and charges that offer once',async()=>{
 let facts=select('facade',scheduledFacts('facade'),'drill',separate,'3');
 facts=select('facade',facts,'drill-bit',includedIn('Перфоратор для дюбелей'),'2');
 const result=await compile('facade',facadePhysicalResourceCompletionR3(),facts,{[id('facade','drill','separate')]:{unitPrice:'300',provenance}});
 expect(result.totals.amount).toBe('900');
 const bit=result.rows.find(row=>row.row_id===id('facade','drill-bit','included-in-drill-separate'))!;
 expect(bit).toMatchObject({quantity:'2',included_in_estimate:false,included_in_procurement:false});
 expect(bit.calculation_trace).toMatchObject({resourceGraph:{includedInResourceOwnerRowId:id('facade','drill','separate')}});
 expect(result.rows.filter(row=>String(row.row_id).startsWith(id('facade','drill-bit','')))).toHaveLength(1);
});

it('retains a scope warning when the paid equipment owner of an included bit is excluded',async()=>{
 let facts=select('facade',scheduledFacts('facade'),'drill',separate,'3');
 facts=select('facade',facts,'drill-bit',includedIn('Перфоратор для дюбелей'),'2');
 const result=await compile('facade',facadePhysicalResourceCompletionR3(),facts,{
  [id('facade','drill','separate')]:{unitPrice:'300',includedInEstimate:false,includedInProcurement:false,provenance}});
 expect(result.totals.amount).toBe('0');
 expect(result.rows.some(row=>(row.calculation_trace as {resourceGraph:{scopeRequirementDecisionV1?:{status:string}}}).resourceGraph.scopeRequirementDecisionV1?.status==='REQUIRED_RESOURCE_EXCLUDED')).toBe(true);
});

it('rejects inclusion in an inapplicable scaffold offer',async()=>{
 const facts=select('facade',scheduledFacts('facade'),'scaffold-assembly',includedIn('Аренда строительных лесов'),'100');
 await expect(compile('facade',facadePhysicalResourceCompletionR3(),facts)).rejects.toThrow();
});

it('keeps a nozzle with an included pump and retains the original whole labour owner',async()=>{
 let facts=select('concrete',scheduledFacts('concrete'),'curing-pump',included,'2');
 facts=select('concrete',facts,'water-nozzle',includedIn('Насос для подачи воды'),'1');
 const result=await compile('concrete',floorConcretePhysicalResourceCompletionR3(),facts);
 const nozzle=result.rows.find(row=>row.row_id===id('concrete','water-nozzle','included-in-curing-pump-included'))!;
 expect(nozzle.calculation_trace).toMatchObject({resourceGraph:{includedInResourceOwnerRowId:id('concrete','curing-pump')}});
 expect(result.rows.find(row=>row.row_id===id('concrete','curing-pump'))!.calculation_trace).toMatchObject({resourceGraph:{includedInResourceOwnerRowId:concrete.prefix+':whole-labor'}});
 expect(nozzle).toMatchObject({included_in_estimate:false,included_in_procurement:false});expect(result.totals.amount).toBe('0');
});

it.each(['concrete','screed']as const)('does not retain supplementary %s resources when the work quantity becomes zero',async key=>{
 const schedule=threeSubworkResourceScheduleR3(key),result=await compile(key,factories[key](),{...scheduledFacts(key),[schedule.primaryParameterId]:'0'});
 expect([...result.rows,...result.preliminaryNeeds].some(row=>row.row_id.startsWith('subwork-resource:'))).toBe(false);
});

it('does not activate substrate treatment, scaffold, transport or starter accessories without their applicable decisions',async()=>{
 const result=await compile('facade',facadePhysicalResourceCompletionR3(),scheduledFacts('facade'));
 for(const key of ['ct17-primer','ct29-repair','ct99-treatment','scaffold-rental','material-delivery','starter-fasteners'])
  expect([...result.rows,...result.preliminaryNeeds].some(r=>r.row_id===id('facade',key)||r.row_id===id('facade',key,'separate'))).toBe(false);
 const noBase=await compile('facade',facadePhysicalResourceCompletionR3(),{...scheduledFacts('facade'),ct190_base_layer_area_m2:'0'});
 for(const key of ['glass-mesh','base-coat-work','mesh-notched-float'])expect([...noBase.rows,...noBase.preliminaryNeeds].some(r=>r.row_id===id('facade',key))).toBe(false);
});

it('keeps optional stages absent and direct tool quantities out of operation headings',async()=>{
 const definition=facadePhysicalResourceCompletionR3(),result=await compile('facade',definition,scheduledFacts('facade'));
 const revision:CanonicalArtifactRevision={id:'header-preview',release_id:'test-release',catalog_id:ct.catalogId,checksum_sha256:'a'.repeat(64),row_count:result.rows.length,
  input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
 const projection=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:'Утепление фасада',
  parameterTitlesRu:Object.fromEntries(definition.parameters.map(parameter=>[parameter.parameter_id,parameter.title_ru]))});
 const headings=[...projection.html.matchAll(/<tr class="operation">([\s\S]*?)<\/tr>/gu)].map(match=>match[1]).join(' ');
 expect(headings).not.toContain('Установить стартовый профиль');expect(headings).not.toContain('Устроить противопожарные рассечки');
 expect(headings).not.toContain('Какое количество:');
 expect(projection.html).toContain('Гладкий стальной полутёрок');
 const noBase=await compile('facade',definition,{...scheduledFacts('facade'),ct190_base_layer_area_m2:'0'});
 const noBaseRevision={...revision,row_count:noBase.rows.length,input_parameters:noBase.parameters,totals:noBase.totals,amendment_contract:{parameterSources:{preliminaryNeeds:noBase.preliminaryNeeds}}};
 const noBasePdf=buildCanonicalProfessionalPdfProjection({revision:noBaseRevision,rows:noBase.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(noBaseRevision),workTitleRu:'Утепление фасада'});
 expect([...noBasePdf.html.matchAll(/<tr class="operation">([\s\S]*?)<\/tr>/gu)].map(match=>match[1]).join(' ')).not.toContain('Нанести защитный слой со стеклосеткой');
});

it.each(['concrete','screed']as const)('adds real %s supply positions while leaving its machine/operator admission and project dependencies open',async key=>{
 const f=key==='concrete'?concrete:screed,result=await compile(key,factories[key](),scheduledFacts(key));
 expect(result.preliminaryNeeds.some(r=>r.row_id===f.prefix+':open-machine-price-scope')).toBe(true);
 expect(result.rows.filter(r=>r.included_in_estimate&&r.category==='labor').map(r=>r.row_id)).toEqual([f.prefix+':whole-labor']);
 expect(result.rows.some(r=>r.row_id.startsWith('subwork-resource:')&&r.title_ru==='Вода')).toBe(false);
 for(const key of ['curing-cover','curing-hose','quality-test','material-delivery','waste-transport'])expect(threeSubworkResourceScheduleR3(f===concrete?'concrete':'screed').positions.some(p=>p.key===key)).toBe(true);
});
