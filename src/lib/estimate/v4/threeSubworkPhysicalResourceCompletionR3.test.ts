import {buildConsumerCanonicalPrecompileParameterSession,buildConsumerCanonicalParameterSession} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import {buildCanonicalParameterCards} from '../../estimatePresentation/buildCanonicalParameterCards';
import {retainResourceScopeCheckGroupsR4} from './fourWorkProjectResourceCompositionR4';
import {floorScreedPhysicalCycleDefinitionR1 as cycleOverlay,floorScreedPhysicalCycleCompletenessR1 as cycleCompleteness,
 floorScreedPhysicalCyclePackR1 as screedCycle,floorScreedPhysicalCycleFactR1 as cycleFact,floorScreedPhysicalCycleUnknownR1 as cycleUnknown} from './threeSubworkPhysicalResourceCompletionR3';
import {validateIndependentCompletenessMapReferences as validateCycleMap} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
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
import {estimateDeterministicHash,stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1} from '../backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {prepareFloorCementScreed20mmColumn01AppendR1 as currentScreedProducer} from '../../../../scripts/estimate/r4a13/prepareFloorCementScreed20mmColumn01AppendR1';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1,buildMasterScopeReadiness} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {resolveMasterScopedNormativeRegistryOptInR1} from '../../../../scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {assertCanonicalProfessionalPdfMoneyCells,buildCanonicalProfessionalPdfProjection} from '../backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactPreliminaryNeeds,type CanonicalArtifactRevision} from '../backendPlatform/canonicalEstimateArtifactContract';
import {canonicalEstimateResourceOperationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import {consumerRepairRowIsTechnicalDetail,registerConsumerRepairRowVerifiedPresentation} from '../../../features/consumerRepair/consumerRepairRowMetadata';
import {parseCanonicalPublicResourcePresentationV1,canonicalPublicResourceRowKindV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {canonicalPublicHiddenResourceAlternativeIdsV1,type CanonicalPublicResourceAlternativeInputV1} from '../backendPlatform/canonicalPublicResourceAlternativesV1';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateRevisionRowFromStorage,canonicalEstimateRevisionDetailFromStorage} from '../backendPlatform/canonicalEstimateRevisionReadMapper';
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
 const schedule=threeSubworkResourceScheduleR3(key),toolKey=key==='facade'?'flat-float':'straightedge',position=schedule.positions.find(p=>p.key===toolKey)!;
 const tool=result.rows.find(r=>r.row_id===id(key,toolKey))!;
 expect(tool).toMatchObject({category:'tool',unit_id:position.unitId,quantity:'1',included_in_estimate:false,included_in_procurement:false,unit_price:null,amount:null});
 const graph=(tool.calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph;
 expect(graph.includedInResourceOwnerRowId).toBe(schedule.includedOwnerRowId);
 expect(result.rows.filter(row=>row.row_id===schedule.includedOwnerRowId)).toHaveLength(1);
 expect(result.rows.filter(row=>row.row_id===tool.row_id)).toHaveLength(1);
 const presentation=parseCanonicalPublicResourcePresentationV1(graph.publicResourcePresentationV1)!;expect(presentation).not.toBeNull();
 const ui={id:tool.row_id,titleRu:String(tool.title_ru),category:'tool',quantity:Number(tool.quantity),unitPrice:null,
  sourceParameters:{canonicalCostTreatment:'INCLUDED_IN_RESOURCE_ROWS',canonicalPreliminaryNeed:false,payable:false}};
 registerConsumerRepairRowVerifiedPresentation(ui,presentation,presentation);
 expect(consumerRepairRowIsTechnicalDetail(ui)).toBe(false);
 const revision:CanonicalArtifactRevision={id:'test-resource-schedule',release_id:'test-release',catalog_id:key,checksum_sha256:estimateDeterministicHash(result),
  row_count:result.rows.length,input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
 const pdf=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:'Проверка состава'});
 const table=pdf.html.split('<table class="client">')[1]!.split('</table>')[0]!;
 expect(() => assertCanonicalProfessionalPdfMoneyCells(pdf.html)).not.toThrow();
 expect(table).toContain(presentation.nameRu);expect(table).not.toMatch(/Включено в №|Без доплаты|Уточнить цену/u);
 const physicalRow=[...table.matchAll(/<tr(?:\s[^>]*)?>[\s\S]*?<\/tr>/gu)].map(match=>match[0])
  .find(row=>row.includes(presentation.nameRu)&&row.includes('class="money"'))!;
 expect(physicalRow).toBeDefined();expect(physicalRow).toContain('<td class="numeric">1</td>');
 expect(physicalRow.match(/<td class="money"><\/td>/gu)).toHaveLength(2);
 expect(result.totals.amount).toBe('0');expect(pdf.pricedRowCount).toBe(0);
 expect(Object.values(pdf.categoryTotals).every(total=>total===0)).toBe(true);
 if(key!=='facade')expect(pdf.missingPriceRowCount).toBeGreaterThan(0);
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


/** Source fixture only; ROOT supplies the actual R672 current parent at intake. */
const cycleDefinition=()=>cycleOverlay(retainResourceScopeCheckGroupsR4(floorScreedPhysicalResourceCompletionR3()));
const cycleId=(key:string)=>screedCycle.prefix+':'+key,cycleRow=(key:string)=>cycleId('cycle:'+key),cycleOp=(key:string)=>cycleId('operation:'+key);
/** Explicit test inventory, not a crew/tool consumption norm or real object. */
function cycleSubmitted(area='125'):Record<string,unknown>{
 let facts:Record<string,unknown>={...screedFacts(area)};
 const counts:Record<string,string>={'straightedge':'2','float':'3','shovel':'2','brush':'2','level':'1','tape-measure':'2','gloves':'6','goggles':'3'};
 for(const position of threeSubworkResourceScheduleR3('screed').positions){
  const p=prefix('floor_screed20_r3',position.key);
  if(position.optional){facts[p+'_required']=notRequired;continue;}
  facts={...facts,[p+'_payment']:included,[p+'_quantity']:counts[position.key],
   [p+'_specification']:'TEST_ONLY exact physical item: '+position.key,
   [p+'_reference']:'TEST_ONLY actual-schedule-shaped fixture; not a quote, object or consumption norm'};
 }
 // A selected film-care method must actually have provision; quantity is a
 // deliberate test takeoff, never area*allowance or a runtime default.
 facts=select('screed',facts,'curing-cover',included,'137');
 return facts;
}
const cycleConfirmed=():Record<string,unknown>=>Object.fromEntries(screedCycle.facts.map(item=>[
 cycleFact(item.key),item.values?.[0]??'TEST_ONLY_ACCEPTED_'+item.key]));
const compileCycle=(values:Record<string,unknown>=cycleSubmitted(),confirmed:Record<string,unknown>=cycleConfirmed(),
 overrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>{
 const d=cycleDefinition();return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:screedCycle.contract,catalogId:screedCycle.catalogId,
  primaryMeasureParameterId:screed.measurement.parameterId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:values,confirmedParameters:confirmed,rowOverrides:overrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
};
const anyCycleRow=(result:Awaited<ReturnType<typeof compileCycle>>,id:string)=>[...result.rows,...result.preliminaryNeeds].find(row=>row.row_id===id);

describe('source-only complete physical cycle of exact20mm floor cement screed',()=>{
 it('requires the retained128/91/91 whole parent and rejects older or changed quantitative semantics',()=>{
  const current=retainResourceScopeCheckGroupsR4(floorScreedPhysicalResourceCompletionR3());
  expect([current.parameters.length,current.formulas.length,current.resources.length]).toEqual(screedCycle.currentParent.shape);
  expect(()=>cycleOverlay({...current,resources:current.resources.slice(1)})).toThrow('EXACT_WHOLE_PARENT');
  const formulaId=current.resources.find(row=>row.row_id===cycleId('ready-mortar-m150-consumed'))!.formula_id;
  expect(()=>cycleOverlay({...current,formulas:current.formulas.map(formula=>formula.formula_id===formulaId?{...formula,
   expression_source:screed.measurement.parameterId+'*2.5/100'}:formula)})).toThrow('RETAINED_WHOLE_SOURCE_DRIFT');
 });
 it('whole hoist and labour gain real consumers once without extra stage hours or operators',()=>{
  const d=cycleDefinition();
  for(const extension of screedCycle.wholeConsumerExtensions){const row=d.resources.find(row=>row.row_id===cycleId(extension.rowSuffix))!;
   expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(op=>op.operationId))
    .toEqual(expect.arrayContaining(extension.newOps.map(cycleOp)));
   expect(d.resources.filter(r=>r.row_id===row.row_id)).toHaveLength(1);
  }
 });

 it('preserves the whole existing source and R3 candidate formulas/owners without changing a default constructor',()=>{
  const old=floorScreedPhysicalResourceCompletionR3(),saved=JSON.stringify(old),next=cycleDefinition();
  expect(next.formulas.slice(0,old.formulas.length)).toEqual(old.formulas);
  for(const resource of old.resources){const kept=next.resources.find(row=>row.row_id===resource.row_id)!;
   expect([kept.unit_id,kept.formula_id,kept.cost_owner_id,kept.procurement_eligible,kept.resource_graph.costTreatment,
    kept.resource_graph.parentCostOwnerId,kept.resource_graph.includedInResourceOwnerRowId])
    .toEqual([resource.unit_id,resource.formula_id,resource.cost_owner_id,resource.procurement_eligible,resource.resource_graph.costTreatment,
     resource.resource_graph.parentCostOwnerId,resource.resource_graph.includedInResourceOwnerRowId]);
  }
  expect(JSON.stringify(floorScreedPhysicalResourceCompletionR3())).toBe(saved);
  expect(next.parameters.every(parameter=>parameter.default_value===null)).toBe(true);expect(next.runtimeInput).toEqual({});
  expect(screedCycle.operations).toHaveLength(8);expect(screedCycle.resources).toHaveLength(17);expect(screedCycle.facts).toHaveLength(21);
  expect(screedCycle.sources[1]?.sha256).toBe('d80e0d65fcf4c269f044381eac13a2b6c8b376878d60e439a41e6296f9901fa1');
 });
 it.each([
  ['125','49.3875','1.5875','11.3375','4.375','2.55'],
  ['0.5','0.19755','0.00635','0.04535','0.0175','0.0102']
 ]as const)('uses exact whole011-01 quantities for%s m2 and keeps ready mortar, water and labour owners single',async(area,labor,hoist,vibrator,water,mortar)=>{
  const r=await compileCycle(cycleSubmitted(area));
  for(const[suffix,quantity]of[['whole-labor',labor],['hoist500kg45m-consumed',hoist],['surface-vibrator-consumed',vibrator],
   ['water-consumed',water],['ready-mortar-m150-consumed',mortar]])expect(anyCycleRow(r,cycleId(suffix))?.quantity).toBe(quantity);
  expect(r.rows.filter(row=>row.included_in_procurement).map(row=>row.row_id).sort()).toEqual(['water-order','ready-mortar-m150-order'].map(cycleId).sort());
  expect(r.preliminaryNeeds.find(need=>need.row_id===cycleRow('wash-water-receiver'))?.quantity).toBeNull();
  expect(r.rows.some(row=>row.row_id.includes('cement-order')||row.row_id.includes('sand-order')||row.row_id.includes('mixer'))).toBe(false);
 });
 it('zero area has no minimum crew, resource, order, seven-day item, control count or need',async()=>{
  const r=await compileCycle(cycleSubmitted('0'),{});expect(r.rows).toEqual([]);expect(r.preliminaryNeeds).toEqual([]);expect(r.totals.amount).toBe('0');
 });
 it.each(['-1','NaN'])('rejects invalid area%s',async area=>{await expect(compileCycle(cycleSubmitted(area))).rejects.toThrow();});
 it('rejects a roof/thickness/method proxy, consumer technical facts, forged source quantities and fractional piece inventory',async()=>{
  await expect(compileCycle({...cycleSubmitted(),[screed.scopeFact.id]:'Кровельная стяжка25мм'})).rejects.toThrow();
  await expect(compileCycle({...cycleSubmitted(),layer_thickness_mm:'25'})).rejects.toThrow();
  await expect(compileCycle({...cycleSubmitted(),[cycleFact('ready_base')]:'consumer declares ready'})).rejects.toThrow();
  await expect(compileCycle({...cycleSubmitted(),[cycleUnknown('guide-rails')]:'1'})).rejects.toThrow('unresolved application norm cannot be supplied');
  await expect(compileCycle({...cycleSubmitted(),[prefix('floor_screed20_r3','float')+'_quantity']:'2.5'})).rejects.toThrow();
 });
 it.each(['0.5','50'])('one confirmed actual small room%s m2 has two distinct minima of5measurements, not5tools or tests',async area=>{
  const r=await compileCycle(cycleSubmitted(area),{...cycleConfirmed(),[cycleFact('control_scope')]:'MINIMUM_ONE_ACTUAL_ROOM_UP_TO_50_M2'});
  for(const key of ['one-small-room-flatness-minimum','one-small-room-plane-minimum'])expect(anyCycleRow(r,cycleRow(key))).toMatchObject({quantity:'5',unit_id:'test',included_in_estimate:false,included_in_procurement:false});
  expect(r.rows.find(row=>row.row_id===id('screed','straightedge'))?.quantity).toBe('2');
 });
 it('does not choose70m2 partitions, count rooms from net area or accept a false small-room scope over50m2',async()=>{
  const r=await compileCycle();expect(anyCycleRow(r,cycleRow('one-small-room-flatness-minimum'))).toBeUndefined();
  await expect(compileCycle(cycleSubmitted('50.0001'),{...cycleConfirmed(),[cycleFact('control_scope')]:'MINIMUM_ONE_ACTUAL_ROOM_UP_TO_50_M2'})).rejects.toThrow();
 });
 it('selects4or2mm by actual following-covering scope and keeps seven wet days informational',async()=>{
  const r=await compileCycle();expect(anyCycleRow(r,cycleRow('other-covering-gap-limit'))).toMatchObject({quantity:'4',unit_id:'mm'});
  expect(anyCycleRow(r,cycleRow('strict-covering-gap-limit'))).toBeUndefined();
  expect(anyCycleRow(r,cycleRow('standard-wet-care-min-days'))).toMatchObject({quantity:'7',unit_id:'day',included_in_estimate:false,included_in_procurement:false});
  const strict=await compileCycle(cycleSubmitted(),{...cycleConfirmed(),[cycleFact('covering_profile')]:'POLYMER_WOOD_LINOLEUM_OR_LARGE_TILE'});
  expect(anyCycleRow(strict,cycleRow('strict-covering-gap-limit'))?.quantity).toBe('2');expect(anyCycleRow(strict,cycleRow('other-covering-gap-limit'))).toBeUndefined();
 });
 it('manufacturer-exception care, extra joints and other water retention preserve exact unknown quantities and unconfirmed units',async()=>{
  const ordinary=await compileCycle(),special=await compileCycle(cycleSubmitted(),{...cycleConfirmed(),
   [cycleFact('care_profile')]:'APPROVED_MANUFACTURER_EXCEPTION',[cycleFact('joint_scope')]:'PROJECT_ADDITIONAL_JOINT_REQUIRED'});
  expect(anyCycleRow(ordinary,cycleRow('exception-care'))).toBeUndefined();expect(anyCycleRow(ordinary,cycleRow('additional-joint-supply'))).toBeUndefined();
  expect(anyCycleRow(special,cycleRow('standard-wet-care-min-days'))).toBeUndefined();
  for(const key of ['exception-care','additional-joint-supply'])expect(anyCycleRow(special,cycleRow(key))).toMatchObject({quantity:null,unit_id:''});
  const other=await compileCycle(cycleSubmitted(),{...cycleConfirmed(),[cycleFact('care_profile')]:'OTHER_WATER_RETAINING_STANDARD'});
  expect(anyCycleRow(other,cycleRow('other-water-retainer'))?.quantity).toBeNull();
  expect(other.rows.some(row=>row.row_id.startsWith(id('screed','curing-cover','')))).toBe(false);
 });
 it('missing receiver is an actual condition alongside unknown receiver count; missing control scope never receives a false5',async()=>{
  const confirmed=cycleConfirmed();delete confirmed[cycleFact('waste_receiver')];delete confirmed[cycleFact('control_scope')];
  const r=await compileCycle(cycleSubmitted('0.5'),confirmed),receiver=r.preliminaryNeeds.find(need=>need.row_id===cycleRow('wash-water-receiver'))!;
  expect(receiver.quantity).toBeNull();expect(receiver.missing_parameter_ids).toEqual(expect.arrayContaining([cycleFact('waste_receiver'),cycleUnknown('wash-water-receiver')]));
  expect(receiver.calculation_trace.unresolvedConditionParameterIds).toContain(cycleFact('waste_receiver'));
  expect(r.rows.find(row=>row.row_id===cycleRow('one-small-room-flatness-minimum'))).toBeUndefined();
 });
 it('retains single mortar order with actual stock/reserve/quantum and does not allocate water to washing by area',async()=>{
  const key='floor_cement_screed20mm_mortar',r=await compileCycle({...cycleSubmitted(),[key+'_stock']:'1',[key+'_stock_reference']:'TEST_ONLY compatible M150 stock',
   [key+'_reserve']:'0.2',[key+'_quantum']:'0.5'});
  expect(anyCycleRow(r,cycleId('ready-mortar-m150-consumed'))?.quantity).toBe('2.55');expect(anyCycleRow(r,cycleId('ready-mortar-m150-order'))?.quantity).toBe('2');
  expect(anyCycleRow(r,cycleId('ready-mortar-m150-remaining'))?.quantity).toBe('0.45');expect(anyCycleRow(r,cycleRow('wash-water'))?.quantity).toBeNull();
 });
 it('pays one explicitly separate tool once; edits preserve the same physical row shared by placement and control',async()=>{
  const submitted=select('screed',cycleSubmitted(),'straightedge',separate,'2'),rowId=id('screed','straightedge','separate'),
   r=await compileCycle(submitted,cycleConfirmed(),{[rowId]:{titleRu:'TEST_ONLY двухметровая рейка',unitPrice:'77',provenance}}),row=r.rows.find(row=>row.row_id===rowId)!;
  expect(row).toMatchObject({quantity:'2',unit_price:'77',amount:'154',included_in_estimate:true});expect(r.rows.filter(row=>row.row_id===rowId)).toHaveLength(1);
  const sections=canonicalEstimateResourceOperationSections(r.rows.map(row=>({rowId:row.row_id,titleRu:row.title_ru,operation:(row.calculation_trace.resourceGraph as Record<string,unknown>).operationCompositionV1})));
  expect(sections.find(section=>section.operation?.operationId===cycleOp('control'))?.sharedResources).toEqual(expect.arrayContaining([expect.objectContaining({rowId,titleRu:row.title_ru})]));
 });
 it('explicit pump3.25h owns included hose/coupling/nozzle once and is never seven-days*24h',async()=>{
  let submitted=select('screed',cycleSubmitted(),'curing-pump',separate,'3.25');
  const pump=threeSubworkResourceScheduleR3('screed').positions.find(position=>position.key==='curing-pump')!;
  for(const key of ['curing-hose','hose-coupling','water-nozzle'])submitted=select('screed',submitted,key,includedIn(pump.titleRu),key==='curing-hose'?'18':'2');
  const r=await compileCycle(submitted,cycleConfirmed(),{[id('screed','curing-pump','separate')]:{unitPrice:'77',provenance}});
  expect(r.rows.find(row=>row.row_id===id('screed','curing-pump','separate'))).toMatchObject({quantity:'3.25',amount:'250.25'});
  for(const key of ['curing-hose','hose-coupling','water-nozzle']){
   const row=r.rows.find(row=>row.row_id===id('screed',key,'included-in-curing-pump-separate'))!;
   expect(row.included_in_estimate).toBe(false);expect(row.included_in_procurement).toBe(false);
   expect(row.calculation_trace.resourceGraph).toMatchObject({includedInResourceOwnerRowId:id('screed','curing-pump','separate')});
  }
 });
 it('exclusion of obligatory mortar or whole labour uses the existing common scope check',async()=>{
  const normal=await compileCycle(),decision=(r:typeof normal)=>(anyCycleRow(r,cycleRow('whole-required-scope'))!.calculation_trace.resourceGraph as Record<string,any>).scopeRequirementDecisionV1;
  expect(decision(normal).status).toBe('INCLUDED');
  for(const suffix of ['ready-mortar-m150-order','whole-labor']){
   const r=await compileCycle(cycleSubmitted(),cycleConfirmed(),{[cycleId(suffix)]:{includedInEstimate:false,includedInProcurement:false,provenance}});
   expect(decision(r).status).toBe('REQUIRED_RESOURCE_EXCLUDED');
  }
 });
 it('ordinary full compatible stock can leave a zero purchase while the physical whole scope stays included',async()=>{
  const key='floor_cement_screed20mm_mortar',r=await compileCycle({...cycleSubmitted(),[key+'_stock']:'3',[key+'_stock_reference']:'TEST_ONLY compatible full stock'}),
   decision=(anyCycleRow(r,cycleRow('whole-required-scope'))!.calculation_trace.resourceGraph as Record<string,any>).scopeRequirementDecisionV1;
  expect(anyCycleRow(r,cycleId('ready-mortar-m150-order'))?.quantity).toBe('0');expect(decision.status).toBe('INCLUDED');
 });
 it('independent whole/source-position map detects removed physical functions and wrong consumers',()=>{
  const d=cycleDefinition(),map=cycleCompleteness(),validate=(resources:typeof d.resources)=>validateCycleMap({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:resources});
  expect(validate(d.resources)).toEqual([]);expect(map.generatedFromCurrentRows).toBe(false);expect(map.fullTechnicalAcceptance).toBe(false);
  for(const item of screedCycle.resources){const r=d.resources.find(row=>row.row_id===cycleRow(item.key))!;
   expect(canonicalEstimateOperationReferences(r.resource_graph.operationCompositionV1).map(op=>op.operationId)).toEqual(item.ops.map(cycleOp));
   expect(validate(d.resources.filter(row=>row.row_id!==r.row_id))).toEqual(expect.arrayContaining([expect.stringMatching(/ROW_REFERENCE$/)]));
  }
  const wrong=d.resources.map(row=>row.row_id===cycleRow('wash-water-receiver')?{...row,resource_graph:{...row.resource_graph,
   operationCompositionV1:d.resources.find(row=>row.row_id===cycleRow('guide-rails'))!.resource_graph.operationCompositionV1}}:row);
  expect(validate(wrong)).toEqual(expect.arrayContaining([expect.stringMatching(/OPERATION_BINDING$/)]));
 });
});


/** Actual R833 parent, not reconstructed R1/R3 fixture. All values below are TEST_ONLY. */
describe('R833 actual whole cement screed measured source continuation',()=>{
 const parent=():AutomaticOwnerDefinition=>{const snapshot=JSON.parse(JSON.stringify(screedCycle.actualCurrent.retainedBody));
  return{...snapshot,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:snapshot.parameters
   .filter((p:{required:boolean})=>p.required).map((p:{parameter_id:string})=>p.parameter_id)};},
  definition=()=>cycleOverlay(parent(),'ACTUAL_MEASURES_R1'),did=(key:string)=>'floor_cement_screed20mm_measure_'+key,
  measures={mortar_peak_received_l:81,mortar_vessel_usable_l:40,solid_waste_peak_l:41,solid_container_usable_l:20,
   wash_effluent_peak_l:21,wash_receiver_usable_l:10,additional_wash_meter_before_l:1000,additional_wash_meter_after_l:1120},
  values=(area='125')=>({...cycleSubmitted(area),...Object.fromEntries(Object.entries(measures).map(([k,v])=>[did(k),v]))}),
  run=(submitted:Record<string,unknown>=values(),confirmed:Record<string,unknown>=cycleConfirmed(),overrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>{
   const d=definition();return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:screedCycle.contract,catalogId:screedCycle.catalogId,
    primaryMeasureParameterId:screed.measurement.parameterId,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:submitted,confirmedParameters:confirmed,rowOverrides:overrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
  };
 it('retains all actual128/91/91 data and rejects body mutation while preserving five old holds including two inactive rows',()=>{
  const actual=parent(),snapshot=screedCycle.actualCurrent.retainedBody,proofBytes=readFileSync(screedCycle.actualCurrent.proofPath);
  expect(createHash('sha256').update(proofBytes).digest('hex')).toBe(screedCycle.actualCurrent.proofSha256);
  const proof=JSON.parse(proofBytes.toString('utf8')),target=proof.results.find((entry:{target:{catalogId:string;sourceId:string}})=>
   entry.target.catalogId===screedCycle.catalogId&&entry.target.sourceId===screedCycle.contract);
  expect(target.target.catalogId).toBe('canonical-work:master:floor_cement_screed20mm_krer11_01_011_01');
  expect(target.current.header).toEqual(screedCycle.actualCurrent.header);
  expect(target.current.header.definition_sha256).toBe('fb653d7cfc8edaa32d9adf05ae466fa5f31ad1702378340a0e6c3baca077177d');
  // Actual definition SHA covers the DB definition domain; the normalized arrays
  // have distinct SHA256 and eh_ domains. In particular JSON.stringify(1e-6)
  // emits0.000001, not Python JSON's1e-06. Values/units/body remain unchanged.
  expect({bodySha256:createHash('sha256').update(stringifyCanonicalEstimateJson(snapshot)).digest('hex'),
   bodyEstimateHash:estimateDeterministicHash(snapshot)}).toEqual({bodySha256:screedCycle.actualCurrent.retainedBodyContentSha256,
    bodyEstimateHash:screedCycle.actualCurrent.retainedBodyEstimateContentHash});
  expect(screedCycle.actualCurrent.retainedBodyContentSha256).not.toBe(target.current.header.definition_sha256);
  const d=definition();
  expect(d.formulas.slice(0,91)).toEqual(snapshot.formulas);expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([174,114,114]);
  expect(d.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toHaveLength(18);
  for(const before of snapshot.resources){const after=d.resources.find(row=>row.row_id===before.row_id)!;
   for(const key of ['row_id','formula_id','unit_id','cost_owner_id','procurement_eligible']as const)expect(after[key]).toEqual(before[key]);}
  expect(d.runtimeInput).toEqual({});expect(screedCycle.actualCurrent.declaredOldSourceNormParameters).toBe(5);
  expect(d.resources.find(r=>r.row_id===cycleId('open-tools-and-ppe'))!.inclusion_ast).toEqual({kind:'and',operands:[
   {kind:'greater_than',parameterId:screed.measurement.parameterId,value:0},{kind:'literal',value:false}]});
  actual.formulas[0]={...actual.formulas[0]!,expression_source:actual.formulas[0]!.expression_source+'+0'};
  expect(()=>cycleOverlay(actual,'ACTUAL_MEASURES_R1')).toThrow('SCREED_PHYSICAL_ACTUAL_R833_BODY_REQUIRED');
 });
 it.each([['125','2.55','4.375','49.3875'],['0.5','0.0102','0.0175','0.19755']]as const)
 ('uses whole20mm source rates and four measured balances for area%s without changing an owner',async(area,mortar,water,labour)=>{
  const r=await run(values(area));
  for(const[key,q]of[['ready-mortar-m150-consumed',mortar],['water-consumed',water],['whole-labor',labour]])expect(anyCycleRow(r,cycleId(key!))?.quantity).toBe(q);
  for(const key of ['mortar-vessel','waste-container','wash-water-receiver'])expect(anyCycleRow(r,cycleRow(key))).toMatchObject({quantity:'3',unit_id:'piece',included_in_estimate:false,included_in_procurement:false});
  expect(anyCycleRow(r,cycleRow('wash-water'))).toMatchObject({quantity:'0.12',unit_id:'m3',included_in_estimate:false,included_in_procurement:false});
  expect(r.rows.filter(row=>row.row_id===cycleId('ready-mortar-m150-order'))).toHaveLength(1);
  expect(r.rows.some(row=>row.row_id.includes('cement-order')||row.row_id.includes('sand-order')||row.row_id.includes('mixer'))).toBe(false);
 });
 it.each([[40,40,'1'],[40.000001,40,'2'],[0.25,0.5,'1']]as const)
 ('uses actual usable capacity at exact and small boundaries %s/%s',async(peak,capacity,expected)=>{
  const r=await run({...values(),[did('mortar_peak_received_l')]:peak,[did('mortar_vessel_usable_l')]:capacity});
  expect(anyCycleRow(r,cycleRow('mortar-vessel'))?.quantity).toBe(expected);
  expect(anyCycleRow(r,cycleId('ready-mortar-m150-consumed'))?.quantity).toBe('2.55');
 });
 it('keeps absent numerical measures a quantity need and rejects zero/negative capacity without inventing an applicability condition',async()=>{
  const missing=values();delete missing[did('wash_receiver_usable_l')];const r=await run(missing),need=r.preliminaryNeeds.find(n=>n.row_id===cycleRow('wash-water-receiver'))!;
  expect(need).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});expect(need.calculation_trace.unresolvedConditionParameterIds??[]).toEqual([]);
  for(const capacity of [0,-1])await expect(run({...values(),[did('wash_receiver_usable_l')]:capacity})).rejects.toThrow();
 });
 it('keeps incomplete meter pairs UNKNOWN and rejects reversed/equal separate-water readings',async()=>{
  const missing=values();delete missing[did('additional_wash_meter_after_l')];
  expect((await run(missing)).preliminaryNeeds.find(n=>n.row_id===cycleRow('wash-water'))).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});
  for(const after of [1000,999])await expect(run({...values(),[did('additional_wash_meter_after_l')]:after})).rejects.toThrow();
 });
 it('does not demand or purchase additional water when actual readback confirms it belongs to the whole water balance',async()=>{
  const input=values();delete input[did('additional_wash_meter_before_l')];delete input[did('additional_wash_meter_after_l')];
  const r=await run(input,{...cycleConfirmed(),[cycleFact('cleanup_water_scope')]:'WITHIN_WHOLE_WATER_BALANCE_CONFIRMED'});
  expect(anyCycleRow(r,cycleRow('wash-water'))).toBeUndefined();expect(anyCycleRow(r,cycleId('water-consumed'))?.quantity).toBe('4.375');
 });
 it('cannot hide missing receiver conditions with known capacities and the same saved bytes retain the common PDF refusal',async()=>{
  const confirmed=cycleConfirmed();delete confirmed[cycleFact('waste_receiver')];const r=await run(values(),confirmed),need=r.preliminaryNeeds.find(n=>n.row_id===cycleRow('wash-water-receiver'))!;
  expect(need.need_state).toBe('CONDITION_REQUIRED');expect(need.calculation_trace.unresolvedConditionParameterIds).toContain(cycleFact('waste_receiver'));
  const revision={id:'TEST_ONLY_SAVED',release_id:'TEST_ONLY_R833',definition_version_id:'TEST_ONLY_DEFINITION',checksum_sha256:'a'.repeat(64),input_parameters:r.parameters},
   cold=JSON.parse(JSON.stringify({revision,resources:[...r.rows,...r.preliminaryNeeds]})),before=JSON.stringify(cold),
   acceptance=canonicalEstimateSavedOperationAcceptanceV1(cold);
  expect(acceptance.pdfAllowed).toBe(false);expect(acceptance.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_CONDITION_UNRESOLVED'})]));
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(acceptance)).toThrow();expect(JSON.stringify(cold)).toBe(before);
 });
 it('preserves the same shared manual tool ID/title/price and totals with one current owner across layout/placing/control after JSON reopening',async()=>{
  const rowId=id('screed','straightedge','separate'),input=select('screed',values(),'straightedge',separate,'2'),
   r=await run(input,cycleConfirmed(),{[rowId]:{titleRu:'TEST_ONLY двухметровая рейка',unitPrice:'77',provenance}}),row=r.rows.find(x=>x.row_id===rowId)!;
  expect(row).toMatchObject({quantity:'2',unit_price:'77',amount:'154',included_in_estimate:true});
  const cold=JSON.parse(JSON.stringify(r)),sections=canonicalEstimateResourceOperationSections(cold.rows.map((x:{row_id:string;title_ru:string;calculation_trace:{resourceGraph:{operationCompositionV1:unknown}}})=>({rowId:x.row_id,titleRu:x.title_ru,operation:x.calculation_trace.resourceGraph.operationCompositionV1})));
  expect(cold.rows.filter((x:{row_id:string})=>x.row_id===rowId)).toHaveLength(1);
  expect(sections.find(s=>s.operation?.operationId===cycleOp('control'))?.sharedResources).toEqual(expect.arrayContaining([expect.objectContaining({rowId,titleRu:row.title_ru})]));
 });
 it('keeps whole mortar and labour mandatory after source measurement and preserves stock/order as a separate supply balance',async()=>{
  for(const suffix of ['ready-mortar-m150-order','whole-labor']){const r=await run(values(),cycleConfirmed(),{[cycleId(suffix)]:{includedInEstimate:false,includedInProcurement:false,provenance}});
   expect((anyCycleRow(r,cycleRow('whole-required-scope'))!.calculation_trace.resourceGraph as Record<string,any>).scopeRequirementDecisionV1.status).toBe('REQUIRED_RESOURCE_EXCLUDED');}
  const key='floor_cement_screed20mm_mortar',r=await run({...values(),[key+'_stock']:'1',[key+'_stock_reference']:'TEST_ONLY compatible stock',[key+'_reserve']:'0.2',[key+'_quantum']:'0.5'});
  expect(anyCycleRow(r,cycleId('ready-mortar-m150-consumed'))?.quantity).toBe('2.55');expect(anyCycleRow(r,cycleId('ready-mortar-m150-order'))?.quantity).toBe('2');
 });
 it('rejects unsupported roof/thickness and forged norm quantities without converting missing source into a user post',async()=>{
  await expect(run({...values(),[screed.scopeFact.id]:'Кровельная стяжка25мм'})).rejects.toThrow();
  await expect(run({...values(),[cycleUnknown('guide-rails')]:1})).rejects.toThrow('unresolved application norm cannot be supplied');
  await expect(run({...values(),[cycleFact('ready_base')]:'consumer approves'})).rejects.toThrow();
 });
 it('does not retain resources or capacity minima for zero area and rejects a negative primary measure',async()=>{
  const r=await run(cycleSubmitted('0'),{});expect(r.rows).toEqual([]);expect(r.preliminaryNeeds).toEqual([]);
  await expect(run(values('-1'))).rejects.toThrow();
 });

 const catalog=():CanonicalEstimateCatalogItem=>{const d=definition();return{catalogId:screedCycle.catalogId,releaseId:'TEST_ONLY_R833',namespace:'global',domain:'flooring',
  workKey:screed.proposedIdentity.workKey,titleRu:screed.titleRu,definitionVersion:4,applicability:{},professionalMetadata:{},
  parameterSchema:d.parameters.map(p=>{const truth=p.truth_metadata,g=truth.guide as Record<string,unknown>;return{
   parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,titleRu:p.title_ru,required:p.required,defaultValue:p.default_value,
   constraints:p.constraints_json,semanticParameterKey:truth.semantic_parameter_key,visibilityRole:truth.visibility_role,valueSourceRole:truth.value_source_role,
   provenance:truth.provenance,preliminaryCompilationAllowed:truth.preliminary_compilation_allowed,requiredWhen:p.constraints_json.requiredWhen??truth.required_when,
   visibleWhen:truth.visible_when,formulaConsumers:truth.formula_consumers,resourceBranchConsumers:truth.resource_branch_consumers,
   guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,sourceDocument:g.source_document,
    sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideShortRu:g.guide_short_ru,guideVersion:g.guide_version,
    applicability:g.applicability,verifiedAt:g.verified_at}}as CanonicalEstimateCatalogItem['parameterSchema'][number];})};};
 it('shows source-owned conditional measured fields with real consumers and keeps all21technology readbacks protected',async()=>{
  const cat=catalog(),d=definition(),scope=cycleFact('cleanup_water_scope'),meterKeys=['additional_wash_meter_before_l','additional_wash_meter_after_l'],
   compileForSession=(submitted:Record<string,unknown>,confirmed:Record<string,unknown>)=>compileCanonicalEstimateCore({operation:'recalculate',
    compilerVersion:screedCycle.contract,catalogId:screedCycle.catalogId,primaryMeasureParameterId:screed.measurement.parameterId,
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:submitted,
    confirmedParameters:confirmed,rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,
    hashJson:value=>createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex')});
  for(const separateWater of [true,false]){
   const submitted=cycleSubmitted(),confirmed={...cycleConfirmed(),[scope]:separateWater?'ADDITIONAL_WASH_WATER_REQUIRED':'WITHIN_WHOLE_WATER_BALANCE_CONFIRMED'},
    compiled=await compileForSession(submitted,confirmed);
   expect(compiled.parameters[scope]).toBe(confirmed[scope]);
   // Existing immutable storage/read projection over the real Core result.
   // This is a saved-shaped JSON test, not a native database save.
   const stored={id:'11111111-1111-4111-8111-111111111111',release_id:cat.releaseId,catalog_id:cat.catalogId,
    definition_version_id:'TEST_ONLY_R833_DEFINITION',definition_version:4,revision_number:1,status:'ready',currency_code:'KGS',price_snapshot_ids:[],
    input_parameters:compiled.parameters,user_input_snapshot:submitted,accepted_baseline_snapshot:confirmed,assumption_snapshot:{},
    parameter_schema_hash:'TEST_ONLY_SCHEMA',compiler_version:screedCycle.contract,checksum_sha256:'a'.repeat(64),created_at:'2026-10-27T00:00:00Z',
    totals:compiled.totals,row_count:compiled.rows.length,amendment_contract:{parameterSources:{preliminaryNeeds:compiled.preliminaryNeeds}}},
    cold=JSON.parse(JSON.stringify(stored)),before=JSON.stringify(cold),revision=canonicalEstimateRevisionDetailFromStorage(cold),
    session=buildConsumerCanonicalParameterSession({catalog:cat,revision,draftId:'TEST_ONLY_CORE_TO_SAVED_SHAPE'}),
    cards=buildCanonicalParameterCards({session,revision:null});
   expect(revision.parameters[scope]).toBe(confirmed[scope]);
   expect(revision.userInputSnapshot?.[scope]).toBeUndefined();
   expect(revision.preliminaryNeeds?.map(n=>n.rowId)).toEqual(compiled.preliminaryNeeds.map(n=>n.row_id));
   for(const driver of screedCycle.measuredQuantityPlan.drivers){const id=did(driver.key),schema=cat.parameterSchema.find(p=>p.parameterId===id)!,card=cards.find(c=>c.key===id);
    expect(schema.resourceBranchConsumers).toContain(cycleRow(screedCycle.measuredQuantityPlan.rules.find(r=>r.drivers.includes(driver.key))!.key));
    if(driver.additionalWashOnly&&!separateWater){
     expect(card).toBeUndefined();expect(session.contractMissingParameterIds).not.toContain(id);expect(session.blockingMissingParameterIds).not.toContain(id);
    }else expect({id,scope:revision.parameters[scope],card:card?{key:card.key,value:card.value,editable:card.editable,missing:card.missing}:null})
     .toMatchObject({id,scope:confirmed[scope],card:{key:id,value:null,editable:true,missing:true}});
   }
   if(!separateWater)expect([...compiled.rows,...compiled.preliminaryNeeds].some(row=>row.row_id===cycleRow('wash-water'))).toBe(false);
   for(const fact of screedCycle.facts)expect(cards.some(c=>c.key===cycleFact(fact.key)&&c.editable)).toBe(false);
   expect(JSON.stringify(cold)).toBe(before);
  }
  const injected={...cycleSubmitted(),...cycleConfirmed(),[scope]:'ADDITIONAL_WASH_WATER_REQUIRED'},
   raw=buildConsumerCanonicalPrecompileParameterSession({catalog:cat,draftId:'TEST_ONLY_UNTRUSTED_INJECTION',parameters:injected,
    missingParameterIds:[],userExplicitParameterIds:Object.keys(injected),textExtractedParameterIds:[]}),
   rawCards=buildCanonicalParameterCards({session:raw,revision:null});
  for(const key of meterKeys)expect(rawCards.some(card=>card.key===did(key))).toBe(false);
  for(const fact of screedCycle.facts)expect(rawCards.some(card=>card.key===cycleFact(fact.key)&&card.editable)).toBe(false);
  await expect(compileForSession(injected,{})).rejects.toThrow();
 });
 it('retains measured values and source conditions in a saved JSON cold parameter-session without claiming native save or automatic completeness',()=>{
  const cat=catalog(),parameters={...values(),...cycleConfirmed()},revision:Parameters<typeof buildConsumerCanonicalParameterSession>[0]['revision']={
   revisionId:'TEST_ONLY_SCREED_SAVED',parentRevisionId:null,releaseId:cat.releaseId,catalogId:cat.catalogId,definitionVersionId:'TEST_ONLY_DEFINITION',definitionVersion:4,status:'ready',
   parameters,userInputSnapshot:values(),acceptedBaselineSnapshot:cycleConfirmed(),assumptionSnapshot:{},parameterSchemaHash:'TEST_ONLY_SCHEMA',compilerVersion:screedCycle.contract,
   checksumSha256:'a'.repeat(64),createdAt:'2026-10-27T00:00:00Z',preliminaryNeeds:[]},cold=JSON.parse(JSON.stringify({catalog:cat,revision})),before=JSON.stringify(cold),
   session=buildConsumerCanonicalParameterSession({...cold,draftId:'TEST_ONLY_SCREED_COLD'}),cards=buildCanonicalParameterCards({session,revision:null});
  for(const driver of screedCycle.measuredQuantityPlan.drivers){const id=did(driver.key),card=cards.find(c=>c.key===id);expect(card?{key:card.key,value:card.value,editable:card.editable}:null)
   .toEqual({key:id,value:parameters[id],editable:true});}
  expect(JSON.stringify(cold)).toBe(before);expect(definition().parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toHaveLength(18);
 });
 it('uses the existing ordinary producer over fresh R833 source0 and refuses missing formal scoped registry capture',()=>{
  const root='C:/Users/User/Documents/Codex/2026-10-27/files-pasted-by-the-user-c-2/work/finishing/cement-screed-current/continuation',
   pin=(path:string)=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}),
   config=currentScreedProducer({currentPhysicalCycle:{releaseId:'01417cef-3091-5012-844d-1bbd9e75cee1',searchReleaseId:'485d16ea-60f5-5c6c-b43a-5ea604945208',outputRoot:'TEST_ONLY_NO_WRITER',
    actualBodyProof:pin(screedCycle.actualCurrent.proofPath),targetPreimage:pin(root+'/R833_NEW_SOURCE_TARGET_PREIMAGE.json'),
    master:pin('C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_24_2026-10-27.txt'),currentRelease:pin('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
    physicalSourcePack:pin(join(__dirname,'../../../../data/estimate-benchmarks/source-packs/cement-screed20mm-current-physical-cycle-r1.json'))}});
  expect(config.expectedParentShape).toEqual([128,91,91]);expect(config.catalogAppend).toBeUndefined();expect(config.sourceId).toBe(screedCycle.contract);
  for(const path of ['scripts/estimate/r4a13/prepareFloorCementScreed20mmColumn01AppendR1.ts','src/lib/estimate/v4/threeSubworkPhysicalResourceCompletionR3.ts',
   'src/lib/estimate/v4/threeSubworkPhysicalResourceCompletionR3.test.ts'])expect(config.sourcePaths).toContain(join(__dirname,'../../../..',path));
  expect([config.parameterDefinitions.length,config.formulaDefinitions.length,config.resourceDefinitions.length]).toEqual([174,114,114]);
  expect(config.passport.unresolvedApplicableResourceRowIds).toHaveLength(18);expect(config.runtimeProfileInput).toEqual({});
  expect(buildMasterScopeReadiness(config.passport.unresolvedApplicableResourceRowIds!,config.resourceDefinitions).technicalScopeStatus).toBe('NEEDS_SOURCE');
  expect(validateCycleMap({completenessMap:config.passport.independentCompletenessMap,formulaDefinitions:config.formulaDefinitions,resourceDefinitions:config.resourceDefinitions})).toEqual([]);
  const generated=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
  expect(Buffer.byteLength(JSON.stringify(generated.newLocators[0]))).toBeLessThanOrEqual(512*1024);
  expect(()=>resolveMasterScopedNormativeRegistryOptInR1(generated)).toThrow('STOP_SCREED_CURRENT_MEASURED_PHYSICAL_R1_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED');
 });
});
