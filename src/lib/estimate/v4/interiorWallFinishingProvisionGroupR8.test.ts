import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {interiorWallFinishingProvisionGroupDefinitionR8 as definition,interiorWallFinishingProvisionCompletenessMapR8 as oracle,
 interiorWallFinishingProvisionPackR8 as pack} from './interiorWallFinishingProvisionGroupR8';
import {interiorWallFinishingProvisionGroupDefinitionR7 as prior,interiorWallFinishingProvisionPackR7 as priorPack} from './interiorWallFinishingProvisionGroupR7';
import {normalHandPreparationDryingExpressionsR1,normalHandPreparationDryingPackR1 as common} from './normalHandPreparationDryingProfileR1';
import {interiorWallFinishingCrewPackR4 as r4Pack,type InteriorWallFinishingBranchR4} from './interiorWallFinishingCrewGroupR4';
import {interiorWallFinishingGeometryRowR3 as r,interiorWallFinishingGeometryParameterR3 as p,
 interiorWallFinishingGeometryPackR3 as base} from './interiorWallFinishingGeometryGroupR3';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {canonicalPurchaseShortagesV1,assertCanonicalPurchaseReadinessV1} from '../backendPlatform/canonicalPurchaseBalanceV1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {assertCanonicalPublisherParameterOrdinalsUniqueR1,assertCanonicalPublisherResourceOrdinalsUniqueR1} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {buildCanonicalProfessionalPdfProjection} from '../backendPlatform/canonicalProfessionalPdf';
import {canonicalProfessionalPdfReviewAcknowledgmentV1,canonicalEstimateSavedOperationAcceptanceV1} from '../backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {canonicalEstimateStableJson as savedReviewStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalArtifactPreliminaryNeeds as savedReviewNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateRevisionRowFromStorage} from '../backendPlatform/canonicalEstimateRevisionReadMapper';
import {adaptCanonicalRevisionToStructuredEstimate} from '../backendPlatform/canonicalEstimateForemanAdapter';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateCatalogItem,type CanonicalEstimateRevisionView} from '../backendPlatform/contracts';
import {buildStructuredEstimateRequestDraft} from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection} from '../../consumerRequests/consumerCanonicalBackendRevisionProjection';
import {buildRequestEstimateViewModel} from '../../../features/consumerRepair/requestEstimateViewModel';
import {consumerEstimateOpenScopeGroups,consumerEstimateUnresolvedQuantityItems} from '../../consumerRequests/consumerEstimateReadiness';
import {consumerRepairRowIsTechnicalDetail} from '../../../features/consumerRepair/consumerRepairRowMetadata';
import type {ConsumerRepairDraftBundle,ConsumerRepairRequestItem} from '../../consumerRequests/consumerRequestTypes';
import {canonicalArtifactPreliminaryNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';

// TEST_ONLY saved rendering snapshot, never STANDARD/source/whole-work admission.
function savedRenderingReview(input:Omit<Parameters<typeof buildCanonicalProfessionalPdfProjection>[0],'preliminaryNeeds'> & {preliminaryNeeds?:Record<string,unknown>[]} ){
 const original=input.revision as Record<string,any>,amendment=original.amendment_contract??{},sources=amendment.parameterSources??{};
 const rows:typeof input.rows=input.rows.map(row=>{const {row_sha256:_old,...body}=row;
  return {...body,row_sha256:createHash('sha256').update(savedReviewStableJson(body)).digest('hex')};});
 const sourceNeeds=sources.preliminaryNeeds??input.preliminaryNeeds??[];
 const needs=sourceNeeds.map((need:Record<string,unknown>)=>{const {need_sha256:_old,...body}=need;
  return {...body,need_sha256:createHash('sha256').update(savedReviewStableJson(body)).digest('hex')};});
 const revision={...input.revision,definition_version_id:original.definition_version_id??'TEST_ONLY_RENDERING_DEFINITION',
  row_count:rows.length,amendment_contract:{...amendment,parameterSources:{...sources,preliminaryNeeds:needs}}};
 const {checksum_sha256:_priorChecksum,...identity}=revision as Record<string,any>;
 (revision as Record<string,any>).checksum_sha256=createHash('sha256').update(savedReviewStableJson({revision:identity,rows,needs})).digest('hex');
 const preliminaryNeeds=savedReviewNeeds(revision,{issuancePurpose:'PRELIMINARY_REVIEW'}),resources=[...rows,...preliminaryNeeds];
 const audit=canonicalEstimateSavedOperationAcceptanceV1({revision,resources});
 assert.equal(audit.pdfAllowed,false,'rendering fixture must not acquire STANDARD admission');
 assert.equal(audit.completeClaimAllowed,false,'rendering fixture must not claim complete composition');
 const request={revisionId:String(revision.id),releaseId:String(revision.release_id),definitionVersionId:revision.definition_version_id,
  checksumSha256:String((revision as Record<string,any>).checksum_sha256),acknowledgedPreliminaryReview:true};
 const reviewAcknowledgmentV1=canonicalProfessionalPdfReviewAcknowledgmentV1({revision,resources,request,
  actorUserId:'TEST_ONLY_RENDERING_OWNER',acknowledgedAt:'2026-10-31T00:00:00Z'});
 const pdf=buildCanonicalProfessionalPdfProjection({...input,revision,rows,preliminaryNeeds,issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1});
 return {...pdf,savedReviewRows:rows,savedReviewNeeds:needs};
}

type Json=Record<string,any>;
const active=['improved-wall-01','deep-primer-00603'] as const;
export async function runInteriorWallFinishingProvisionChecksR8(sourceRoot='C:/dev/rik-expo-app-r4a5-dc4f0ce7'){
 const done:string[]=[];const check=async(name:string,fn:()=>unknown|Promise<unknown>)=>{await fn();done.push(name);};
 const compile=(branch:InteriorWallFinishingBranchR4,area='20.1',rowOverrides:Json={},facts:Json={},old=false)=>{
  const d=old?prior(branch):definition(branch);return compileCanonicalEstimateCore({operation:'recalculate',
   catalogId:r4Pack.branches.find(value=>value.id===branch)!.catalogId,compilerVersion:pack.contract,
   primaryMeasureParameterId:p(base.areaId),parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
   submittedParameters:{[p(base.areaId)]:area,...facts},confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',
   maximumResourceRows:d.resources.length,hashJson:async value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
 };
 const q=(result:Awaited<ReturnType<typeof compile>>,key:string)=>result.rows.find(row=>row.row_id===r(key))?.quantity??null;
 const provenance={kind:'manual',reason:'R8_ADVERSE_SEMANTIC_TEST_ONLY'};
 await check('exact primary bytes and immutable canonical R4 R6 predecessor pins',()=>{
  for(const source of pack.sources){const target=resolve(sourceRoot,source.path);
   assert.equal(createHash('sha256').update(readFileSync(target)).digest('hex'),source.sha256,source.path);}
  for(const pin of pack.predecessorPins)assert.equal(createHash('sha256').update(readFileSync(resolve('C:/dev/rik-expo-app-r4a5-dc4f0ce7',pin.path))).digest('hex'),pin.sha256,pin.path);
  assert.equal(common.towelsPerPreparation,2);assert.equal(common.towelsPerPairedPack,2);assert.equal(common.productCode,'DYNJPE2220A');
  assert.deepEqual(common.sizeCm,['37','69']);assert.equal(common.surgicalClinicalRegimeTransferred,false);assert.equal(common.newLabourNormClaimed,false);assert.equal(common.powerRequired,false);assert.equal(common.industrialDecontaminationAccepted,false);
 });
 await check('all branch ordinals and whole independent expected operation unit category bindings remain guarded',()=>{
  for(const branch of [...active,'high-quality-wall-05'] as const){const d=definition(branch),m=oracle(branch);
   assert.deepEqual(d.parameters.map(row=>row.ordinal),d.parameters.map((_,index)=>index));
   assert.deepEqual(d.resources.map(row=>row.ordinal),d.resources.map((_,index)=>index));
   assert.doesNotThrow(()=>assertCanonicalPublisherParameterOrdinalsUniqueR1(d.parameters));
   assert.doesNotThrow(()=>assertCanonicalPublisherResourceOrdinalsUniqueR1(d.resources));
   const validate=(rows:typeof d.resources)=>validateIndependentCompletenessMapReferences({completenessMap:m,formulaDefinitions:d.formulas,resourceDefinitions:rows});
   assert.deepEqual(validate(d.resources),[]);
   for(const entry of m.entries.filter((entry:any)=>entry.resolution.kind!=='NOT_APPLICABLE')){
    assert('category'in entry&&entry.category);assert('unitId'in entry);assert(entry.requiredOperationIds.length);
    assert(validate(d.resources.filter(row=>row.row_id!==(entry.resolution as Json).rowId)).some(error=>error.includes('ROW_REFERENCE')),entry.expectedResourceId);
   }
   for(const key of ['hand-drying-towels-order']){const row=d.resources.find(row=>row.row_id===r(key))!;
    assert(validate(d.resources.map(item=>item===row?{...item,category:'labor'}:item)).some(error=>error.includes('RESOURCE_CATEGORY')));
    assert(validate(d.resources.map(item=>item===row?{...item,unit_id:'kg'}:item)).some(error=>error.includes('RESOURCE_UNIT')));
    assert(validate(d.resources.map(item=>item===row?{...item,resource_graph:{...item.resource_graph,
     operationCompositionV1:{...(item.resource_graph.operationCompositionV1 as Json),additionalOperations:[]}}}:item)).some(error=>error.includes('OPERATION_BINDING')));
   }
  }
 });
 await check('two fresh exact hand towels per already accepted preparation with whole paired packs',async()=>{
  const cases=[['improved-wall-01','0.0001',18,9],['improved-wall-01','20.1',22,11],['improved-wall-01','12000',3024,1512],
   ['deep-primer-00603','0.0001',6,3],['deep-primer-00603','20.1',6,3],['deep-primer-00603','100000',3280,1640]] as const;
  for(const [branch,area,towels,preparations]of cases){const result=await compile(branch,area),d=definition(branch),row=d.resources.find(row=>row.row_id===r('hand-drying-towels-order'))!;
   assert.equal(Number(q(result,'hand-drying-towels-order')),towels,branch+':'+area);assert.equal(Number(q(result,'open-hand-drying-towels')),preparations*2);
   assert.equal((row.source_metadata as Json).acceptedR7PreparationsExpression,(prior(branch).resources.find(row=>row.row_id===r('hand-cleanser-order'))!.source_metadata as Json).acceptedR6PreparationsExpression);
   assert.equal((row.resource_graph.purchaseBalanceV1 as Json).orderQuantumExpression,'2');
  }
  assert.equal(normalHandPreparationDryingExpressionsR1('1000').nominalUsePcs,'(1000)*2');
  for(const branch of active)assert.equal((await compile(branch,'0')).rows.length,0);
 });
 await check('every inherited physical quantity remains unchanged and drying has one cost owner with shortage guards',async()=>{
  for(const branch of active){const result=await compile(branch),old=await compile(branch,'20.1',{}, {},true),d=definition(branch);
   for(const row of old.rows)if(row.row_id!==r('open-hand-drying-towels'))assert.equal(result.rows.find(item=>item.row_id===row.row_id)?.quantity,row.quantity,row.row_id);
   assert.deepEqual(result.rows.filter(row=>row.procurement_eligible).map(row=>row.row_id),old.rows.filter(row=>row.procurement_eligible).map(row=>row.row_id));
   for(const key of ['hand-drying-towels-order']){const resource=d.resources.find(row=>row.row_id===r(key))!;
    assert.equal(resource.cost_owner_id,r('whole-work'));assert.equal(resource.resource_graph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');
    assert.equal(resource.procurement_eligible,false);
    assert.deepEqual(canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1).map(ref=>ref.operationId),
     canonicalEstimateOperationReferences(d.resources.find(row=>row.row_id===r('skin-protection-foam'))!.resource_graph.operationCompositionV1).map(ref=>ref.operationId));
    const changed=await compile(branch,'20.1',{[resource.row_id]:{quantity:'0',provenance}});
    assert(canonicalPurchaseShortagesV1(changed.rows).some(shortage=>shortage.rowId===resource.row_id));
    assert.throws(()=>assertCanonicalPurchaseReadinessV1(changed.rows));
    await assert.rejects(compile(branch,'20.1',{[resource.row_id]:{quantity:'1',provenance}}));
   }
  }
 });
 await check('legacy pieces100 stay100 and101 become102 without multiplying by preparations or duplicate reference-price charge',async()=>{
  for(const branch of active){
   for(const [raw,expected]of [['100',100],['101',102],['0.042',2],['10.2',12]] as const){
    const overrides={[r('whole-work')]:{unitPrice:'100',provenance},[r('open-hand-drying-towels')]:{quantity:raw,unitPrice:'120.5',includedInEstimate:true,provenance}};
    const result=await compile(branch,'20.1',overrides),detail=result.rows.find(row=>row.row_id===r('open-hand-drying-towels'))!;
    assert.equal(detail.quantity,raw);assert.equal(detail.unit_price,'120.5');assert.equal(detail.included_in_estimate,false);
    assert.equal((detail.calculation_trace as Json).manualQuantityOverride,true);assert.equal(Number(q(result,'hand-drying-towels-order')),expected);
    assert.equal(result.rows.find(row=>row.row_id===r('hand-drying-towels-order'))!.included_in_estimate,false);assert.equal(result.totals.amount,'2010');
    const pdf=savedRenderingReview({revision:{id:'r8-legacy',release_id:'22222222-2222-4222-8222-222222222222',checksum_sha256:'a'.repeat(64),catalog_id:r4Pack.branches.find(value=>value.id===branch)!.catalogId,row_count:result.rows.length,totals:result.totals,currency_code:'KGS'},rows:result.rows,preliminaryNeeds:result.preliminaryNeeds,workTitleRu:'Отделка стен'});
    assert(!pdf.html.includes(pack.drying.detailNameRu));
    assert(pdf.html.includes('Одноразовые полотенца для рук, 37 × 69 см'));
    assert(!pdf.html.includes(pack.drying.nameRu));
    assert.equal(result.rows.find(row=>row.row_id===r('hand-drying-towels-order'))!.title_ru,pack.drying.nameRu);
    const savedCounter=pdf.savedReviewRows.find(row=>row.row_id===detail.row_id)!;assert(savedCounter);
    assert.equal(savedCounter.unit_price,'120.5');assert.equal(savedCounter.included_in_estimate,false);
    assert.equal(savedCounter.included_in_procurement,false);assert.equal(savedCounter.quantity,raw);
    assert.deepEqual(pdf.savedReviewRows.filter(row=>row.unit_price==='120.5').map(row=>row.row_id),[detail.row_id]);
    const counterRows=[...pdf.html.matchAll(/<tr(?:\s[^>]*)?>[\s\S]*?<\/tr>/gu)].map(match=>match[0]).filter(row=>row.includes('<td class="money">120,50 сом</td>'));
    assert(counterRows.length>0,'saved reference price must remain numeric and visible');
    for(const row of counterRows)assert.deepEqual([...row.matchAll(/<td class="money">([\s\S]*?)<\/td>/gu)].map(cell=>cell[1]),['120,50 сом',''],'reference price is not a second paid amount');
    assert.equal(result.rows.filter(row=>row.row_id===detail.row_id&&row.included_in_estimate).length,0);
   }
   const cleared=await compile(branch,'20.1',{[r('open-hand-drying-towels')]:{quantity:null,unitPrice:'120.5',provenance}});
   assert.equal(Number(q(cleared,'hand-drying-towels-order')),branch==='improved-wall-01'?22:6);
   assert.equal(cleared.rows.find(row=>row.row_id===r('open-hand-drying-towels'))!.unit_price,'120.5');
   const shortage=await compile(branch,'20.1',{[r('open-hand-drying-towels')]:{quantity:'101',provenance},[r('hand-drying-towels-order')]:{quantity:'100',provenance}});
   assert(canonicalPurchaseShortagesV1(shortage.rows).some(value=>value.rowId===r('hand-drying-towels-order')));assert.throws(()=>assertCanonicalPurchaseReadinessV1(shortage.rows));
   const soapEdit=await compile(branch,'20.1',{[r('open-hand-cleanser')]:{quantity:'10',provenance}});
   assert.equal(Number(q(soapEdit,'hand-drying-towels-order')),branch==='improved-wall-01'?22:6);
  }
 });
 await check('KRAUSE future execution becomes PROCESS_REQUIRED without false actual acceptance or removed boundaries',async()=>{
  for(const branch of active){const d=definition(branch),result=await compile(branch),row=result.preliminaryNeeds.find(row=>row.row_id===r('open-access'))!;
   const scope=((row.calculation_trace as Json).resourceGraph as Json).scopeRequirementDecisionV1;
   assert.equal(scope.status,'PROCESS_REQUIRED');assert.equal(scope.kind,'PROCESS');assert.notEqual(scope.status,'COMPLETED');
   assert.deepEqual(scope.missingObjectFactParameterIds,[]);assert.equal(scope.coveringRowIds.length,13);
   assert.equal((d.resources.find(item=>item.row_id===row.row_id)!.source_metadata as Json).actualSiteAcceptanceConfirmed,false);
   assert.equal(priorPack.access.selectedMaximumRoomHeightM,'3.50');assert.equal(priorPack.access.manufacturerWorkHeightM,'3.60');
   assert.equal(priorPack.access.maximumTotalLoadKg,'240');assert.equal(priorPack.access.maxPersons,1);
   assert(!('satisfiedWhen'in(d.resources.find(item=>item.row_id===row.row_id)!.resource_graph.scopeRequirementV1 as Json)));
  }
 });
 await check('three unclosed physical needs retain source gates despite manual quantities and no editable norm shortcut',async()=>{
  for(const branch of active){const normal=await compile(branch),d=definition(branch);
   assert.deepEqual(normal.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').map(need=>need.row_id).sort(),pack.requiredNeeds.map(need=>r('open-'+need.id)).sort());
   assert(!d.parameters.some(parameter=>parameter.parameter_id===p('need_hand_drying_towels')));
   for(const need of pack.requiredNeeds){assert.equal(q(normal,'open-'+need.id),null);
    await assert.rejects(compile(branch,'20.1',{}, {[p('need_'+need.id.replaceAll('-','_'))]:'1'}));}
   const manual=await compile(branch,'20.1',Object.fromEntries(pack.requiredNeeds.map(need=>[r('open-'+need.id),{quantity:'1',provenance}])));
   for(const need of pack.requiredNeeds){const saved=manual.preliminaryNeeds.find(value=>value.row_id===r('open-'+need.id))!;
    assert.equal(saved.quantity,'1');assert(saved.missing_parameter_ids.includes(p('need_'+need.id.replaceAll('-','_'))));}
   assert.equal(oracle(branch).fullTechnicalAcceptance,false);assert.equal(oracle(branch).physicalResourceCoverageComplete,false);
  }
 });
 await check('actual saved transport adapter UI PDF show one drying supply and three named gaps across all operations',async()=>{
  for(const branch of active){const result=await compile(branch),catalogId=r4Pack.branches.find(value=>value.id===branch)!.catalogId;
   const stored={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',catalog_id:catalogId,
    definition_version_id:'33333333-3333-4333-8333-333333333333',checksum_sha256:'a'.repeat(64),row_count:result.rows.length,
    input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
   const transport=projectCanonicalEstimatePreliminaryNeedTransport(stored),catalog:CanonicalEstimateCatalogItem={catalogId,releaseId:stored.release_id,
    namespace:'global',workKey:branch,titleRu:'Отделка стен',domain:'finishing',definitionVersion:1,applicability:{},professionalMetadata:{},parameterSchema:[]};
   const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:stored.id,parentRevisionId:null,releaseId:stored.release_id,
    catalogId,revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:result.parameters,totals:result.totals,rowCount:result.rows.length,
    checksumSha256:stored.checksum_sha256,compilerVersion:pack.contract,createdAt:'2026-10-21T00:00:00Z',
    amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds};
   const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:result.rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))}),draft=buildStructuredEstimateRequestDraft(payload);
   const items=draft.items.map((item,index)=>({...item,id:'r8-'+index,requestDraftId:'r8'})) as ConsumerRepairRequestItem[];
   const bundle=appendCanonicalBackendRevisionProjection({previousBundle:null,nextBundle:{draft:{id:'r8'},items,
    structuredEstimatePayload:draft.structuredEstimatePayload} as ConsumerRepairDraftBundle,payload});
   const visible=buildRequestEstimateViewModel(bundle)!.sections.flatMap(section=>section.items),pdf=savedRenderingReview({revision:stored,rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(stored),workTitleRu:'Отделка стен'});
   assert.equal(consumerEstimateOpenScopeGroups(bundle).length,0);assert.equal(consumerEstimateUnresolvedQuantityItems(bundle).length,3);
   for(const key of ['hand-drying-towels-order',...pack.requiredNeeds.map(need=>'open-'+need.id)]){
    const definitionRow=definition(branch).resources.find(row=>row.row_id===r(key))!,item=visible.find(item=>item.sourceParameters?.rowCode===r(key));
    assert(item,key+' in UI');assert.equal(item.quantity,key==='hand-drying-towels-order'?(branch==='improved-wall-01'?22:6):null);
    assert(pdf.html.includes(item.titleRu),key+' has the same functional name in UI and PDF');
    const sourceRow=[...result.rows,...result.preliminaryNeeds].find(row=>row.row_id===r(key))!;
    assert.equal(sourceRow.title_ru,definitionRow.title_ru,key+' retains its immutable source name');
    if(key==='hand-drying-towels-order'){
     assert(String(sourceRow.title_ru).includes('Medline'));
     assert(!/Medline|DYNJPE/iu.test(item.titleRu),'the public towel name omits brand and article');
    }
   }
   assert(!pdf.html.includes('need_hand_cleanser'));assert(!pdf.html.includes('need_hand_drying_towels'));
   const detail=visible.find(item=>item.sourceParameters?.rowCode===r('open-hand-drying-towels'))!;
   assert(detail);assert(consumerRepairRowIsTechnicalDetail(detail));
   assert(!pdf.html.includes(pack.drying.detailNameRu));
   assert.equal(bundle.items.filter(item=>item.sourceParameters?.rowCode===r('hand-drying-towels-order')).length,1);
  }
 });
 await check('high quality05 keeps independent unknown VGT putty demand and source guard',async()=>{
  const result=await compile('high-quality-wall-05');assert.equal(q(result,'ready-putty-order'),null);
  await assert.rejects(compile('high-quality-wall-05','20.1',{}, {[p('high_quality_vgt_putty_kg_m2')]:'1.4'}));
  assert.equal(oracle('high-quality-wall-05').normativeResourceQuantitiesComplete,false);
 });
 return{status:'PASS_PARTIAL_WHOLE_KIT_R8_WITH_SELECTED_FINITE_DRYING_PROFILE',checks:done.length,completed:done,
  consumers:pack.activeConsumers,physicalNeedsClosed:pack.physicalNeedsClosed,remainingNeeds:pack.requiredNeeds.map(need=>need.id),fullTechnicalAcceptance:false};
}
if(typeof it==='function')it('R8 VGT selected two-towel drying retains legacy-piece semantics and whole-kit source gates',async()=>{await runInteriorWallFinishingProvisionChecksR8();});
