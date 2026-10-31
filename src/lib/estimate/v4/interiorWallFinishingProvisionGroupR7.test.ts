import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {interiorWallFinishingProvisionGroupDefinitionR7 as definition,interiorWallFinishingProvisionCompletenessMapR7 as oracle,
 interiorWallFinishingProvisionPackR7 as pack} from './interiorWallFinishingProvisionGroupR7';
import {interiorWallFinishingProvisionGroupDefinitionR6 as prior} from './interiorWallFinishingProvisionGroupR6';
import {normalHandPreparationCleanserExpressionsR1,normalHandPreparationProvisionPackR1 as common} from './normalHandPreparationProvisionProfileR1';
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
import {canonicalArtifactVisibleRowTitle as reviewVisibleTitle,escapeCanonicalArtifactHtml as reviewEscape} from '../backendPlatform/canonicalEstimateArtifactContract';
import {canonicalPublicEstimatePendingRowTitleRu as reviewPendingTitle} from '../backendPlatform/canonicalPublicEstimateLanguageRu';
import {canonicalLegacyResourceNameV1 as reviewLegacyName} from '../backendPlatform/canonicalEstimateOperationComposition';
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
function savedRenderingReview(input:Parameters<typeof buildCanonicalProfessionalPdfProjection>[0]){
 const original=input.revision as Record<string,any>,amendment=original.amendment_contract??{},sources=amendment.parameterSources??{};
 const rows=input.rows.map(row=>{const {row_sha256:_old,...body}=row;
  return {...body,row_sha256:createHash('sha256').update(savedReviewStableJson(body)).digest('hex')};});
 const sourceNeeds=sources.preliminaryNeeds??input.preliminaryNeeds??[];
 const needs=sourceNeeds.map((need:Record<string,unknown>)=>{const {need_sha256:_old,...body}=need;
  return {...body,need_sha256:createHash('sha256').update(savedReviewStableJson(body)).digest('hex')};});
 const revision:typeof input.revision={...input.revision,definition_version_id:original.definition_version_id??'TEST_ONLY_RENDERING_DEFINITION',
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
 return {...pdf,savedReviewRows:rows,savedReviewNeeds:needs,savedReviewRevision:revision};
}


function expectedSavedReviewTitle(pdf:ReturnType<typeof savedRenderingReview>,row:Record<string,any>){
 const revision=pdf.savedReviewRevision,resources=[...pdf.savedReviewRows,...pdf.savedReviewNeeds],trace=row.calculation_trace??{},sourceGraph=trace.resourceGraph??{};
 const context={revisionId:String(revision.id),releaseId:String(revision.release_id),checksumSha256:String(revision.checksum_sha256),
  savedResources:resources.map(row=>({rowId:String(row.row_id),operation:row.calculation_trace?.resourceGraph?.operationCompositionV1}))};
 const alias=reviewLegacyName(String(row.row_id),context,trace.manualTitleOverride===true);
 assert.equal(alias,null,'TEST_ONLY snapshot is not authenticated historical alias authority');
 const {titleSpecificationMode:_mode,...graph}=sourceGraph;
 const displayRow={...row,calculation_trace:{...trace,resourceGraph:graph}};
 const visible=reviewVisibleTitle(displayRow,revision.input_parameters as Record<string,unknown>??{});
 return alias??(pdf.savedReviewNeeds.some((need:Record<string,unknown>)=>need.row_id===row.row_id)?reviewPendingTitle(visible):visible);
}

type Json=Record<string,any>;
const active=['improved-wall-01','deep-primer-00603'] as const;
export async function runInteriorWallFinishingProvisionChecksR7(sourceRoot='C:/dev/rik-expo-app-r4a5-dc4f0ce7'){
 const done:string[]=[];const check=async(name:string,fn:()=>unknown|Promise<unknown>)=>{await fn();done.push(name);};
 const compile=(branch:InteriorWallFinishingBranchR4,area='20.1',rowOverrides:Json={},facts:Json={},old=false)=>{
  const d=old?prior(branch):definition(branch);return compileCanonicalEstimateCore({operation:'recalculate',
   catalogId:r4Pack.branches.find(value=>value.id===branch)!.catalogId,compilerVersion:pack.contract,
   primaryMeasureParameterId:p(base.areaId),parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
   submittedParameters:{[p(base.areaId)]:area,...facts},confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',
   maximumResourceRows:d.resources.length,hashJson:async value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
 };
 const q=(result:Awaited<ReturnType<typeof compile>>,key:string)=>result.rows.find(row=>row.row_id===r(key))?.quantity??null;
 const provenance={kind:'manual',reason:'R7_ADVERSE_SEMANTIC_TEST_ONLY'};
 await check('exact primary bytes and immutable canonical R4 R6 predecessor pins',()=>{
  for(const source of pack.sources){const target=source.path.includes('provision-r7')?resolve(sourceRoot,source.path):resolve('C:/dev/rik-expo-app-r4a5-dc4f0ce7',source.path);
   assert.equal(createHash('sha256').update(readFileSync(target)).digest('hex'),source.sha256,source.path);}
  for(const pin of pack.predecessorPins)assert.equal(createHash('sha256').update(readFileSync(resolve('C:/dev/rik-expo-app-r4a5-dc4f0ce7',pin.path))).digest('hex'),pin.sha256,pin.path);
  assert.equal(common.doseMl,'0.7');assert.equal(common.cartridgeL,'1');assert.equal(common.dispenserCode,'TPW1LDS');
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
   for(const key of ['hand-cleanser-order','tool-hand-cleanser-dispenser']){const row=d.resources.find(row=>row.row_id===r(key))!;
    assert(validate(d.resources.map(item=>item===row?{...item,category:'labor'}:item)).some(error=>error.includes('RESOURCE_CATEGORY')));
    assert(validate(d.resources.map(item=>item===row?{...item,unit_id:'kg'}:item)).some(error=>error.includes('RESOURCE_UNIT')));
    assert(validate(d.resources.map(item=>item===row?{...item,resource_graph:{...item.resource_graph,
     operationCompositionV1:{...(item.resource_graph.operationCompositionV1 as Json),additionalOperations:[]}}}:item)).some(error=>error.includes('OPERATION_BINDING')));
   }
  }
 });
 await check('finite cleanser uses exactly the already accepted R6 preparation budget with whole cartridge balance',async()=>{
  const cases=[['improved-wall-01','0.0001',1,9],['improved-wall-01','20.1',1,11],['improved-wall-01','12000',2,1512],
   ['deep-primer-00603','0.0001',1,3],['deep-primer-00603','20.1',1,3],['deep-primer-00603','100000',2,1640]] as const;
  for(const [branch,area,litres,applications]of cases){const result=await compile(branch,area),d=definition(branch);
   assert.equal(Number(q(result,'hand-cleanser-order')),litres,branch+':'+area);assert.equal(Number(q(result,'tool-hand-cleanser-dispenser')),1);
   const row=d.resources.find(row=>row.row_id===r('hand-cleanser-order'))!,metadata=row.source_metadata as Json;
   assert.equal(metadata.acceptedR6PreparationsExpression,(prior(branch).formulas.find(formula=>formula.formula_id===r('formula:skin-protection-foam'))!.expression_source as string).slice(6,-8));
   const expectedDose=applications*0.0007;assert(expectedDose<=litres&&expectedDose>litres-1);
   assert(Math.abs(Number(q(result,'open-hand-cleanser'))-expectedDose)<1e-10);
   assert.equal((row.resource_graph.purchaseBalanceV1 as Json).orderQuantumExpression,'1');
  }
  assert.equal(normalHandPreparationCleanserExpressionsR1('1000').consumedL,'(1000)*0.0007');
  for(const branch of active)assert.equal((await compile(branch,'0')).rows.length,0);
 });
 await check('every inherited physical quantity remains unchanged and cleanser has one owner with shortage guards',async()=>{
  for(const branch of active){const result=await compile(branch),old=await compile(branch,'20.1',{}, {},true),d=definition(branch);
   for(const row of old.rows)if(row.row_id!==r('open-hand-cleanser'))assert.equal(result.rows.find(item=>item.row_id===row.row_id)?.quantity,row.quantity,row.row_id);
   assert.deepEqual(result.rows.filter(row=>row.procurement_eligible).map(row=>row.row_id),old.rows.filter(row=>row.procurement_eligible).map(row=>row.row_id));
   for(const key of ['hand-cleanser-order','tool-hand-cleanser-dispenser']){const resource=d.resources.find(row=>row.row_id===r(key))!;
    assert.equal(resource.cost_owner_id,r('whole-work'));assert.equal(resource.resource_graph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');
    assert.equal(resource.procurement_eligible,false);
    assert.deepEqual(canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1).map(ref=>ref.operationId),
     canonicalEstimateOperationReferences(d.resources.find(row=>row.row_id===r('skin-protection-foam'))!.resource_graph.operationCompositionV1).map(ref=>ref.operationId));
    const changed=await compile(branch,'20.1',{[resource.row_id]:{quantity:'0',provenance}});
    assert(canonicalPurchaseShortagesV1(changed.rows).some(shortage=>shortage.rowId===resource.row_id));
    assert.throws(()=>assertCanonicalPurchaseReadinessV1(changed.rows));
    await assert.rejects(compile(branch,'20.1',{[resource.row_id]:{quantity:'0.5',provenance}}));
   }
  }
 });
 await check('legacy fractional and large manual consumed quantities drive one whole-litre supply owner without duplicate reference-price charge',async()=>{
  for(const branch of active){
   for(const [raw,expected]of [['0.042',1],['10',10],['10.2',11]] as const){
    const overrides={[r('whole-work')]:{unitPrice:'100',provenance},[r('open-hand-cleanser')]:{quantity:raw,unitPrice:'50',includedInEstimate:true,provenance}};
    const result=await compile(branch,'20.1',overrides),detail=result.rows.find(row=>row.row_id===r('open-hand-cleanser'))!;
    assert.equal(detail.quantity,raw);assert.equal(detail.unit_price,'50');assert.equal(detail.included_in_estimate,false);
    assert.equal((detail.calculation_trace as Json).manualQuantityOverride,true);assert.equal(Number(q(result,'hand-cleanser-order')),expected);
    assert.equal(result.rows.find(row=>row.row_id===r('hand-cleanser-order'))!.included_in_estimate,false);
    assert.equal(result.totals.amount,'2010');
   }
   const cleared=await compile(branch,'20.1',{[r('open-hand-cleanser')]:{quantity:null,unitPrice:'50',provenance}});
   assert.equal(Number(q(cleared,'hand-cleanser-order')),1);assert.equal(cleared.rows.find(row=>row.row_id===r('open-hand-cleanser'))!.unit_price,'50');
   const shortage=await compile(branch,'20.1',{[r('open-hand-cleanser')]:{quantity:'10',provenance},[r('hand-cleanser-order')]:{quantity:'9',provenance}});
   assert(canonicalPurchaseShortagesV1(shortage.rows).some(value=>value.rowId===r('hand-cleanser-order')));
   assert.throws(()=>assertCanonicalPurchaseReadinessV1(shortage.rows));
  }
 });
 await check('KRAUSE future execution becomes PROCESS_REQUIRED without false actual acceptance or removed boundaries',async()=>{
  for(const branch of active){const d=definition(branch),result=await compile(branch),row=result.preliminaryNeeds.find(row=>row.row_id===r('open-access'))!;
   const scope=((row.calculation_trace as Json).resourceGraph as Json).scopeRequirementDecisionV1;
   assert.equal(scope.status,'PROCESS_REQUIRED');assert.equal(scope.kind,'PROCESS');assert.notEqual(scope.status,'COMPLETED');
   assert.deepEqual(scope.missingObjectFactParameterIds,[]);assert.equal(scope.coveringRowIds.length,13);
   assert.equal((d.resources.find(item=>item.row_id===row.row_id)!.source_metadata as Json).actualSiteAcceptanceConfirmed,false);
   assert.equal(pack.access.selectedMaximumRoomHeightM,'3.50');assert.equal(pack.access.manufacturerWorkHeightM,'3.60');
   assert.equal(pack.access.maximumTotalLoadKg,'240');assert.equal(pack.access.maxPersons,1);
   assert(!('satisfiedWhen'in(d.resources.find(item=>item.row_id===row.row_id)!.resource_graph.scopeRequirementV1 as Json)));
  }
 });
 await check('four unclosed physical needs retain source gates despite manual quantities and no editable norm shortcut',async()=>{
  for(const branch of active){const normal=await compile(branch),d=definition(branch);
   assert.deepEqual(normal.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').map(need=>need.row_id).sort(),pack.requiredNeeds.map(need=>r('open-'+need.id)).sort());
   assert(!d.parameters.some(parameter=>parameter.parameter_id===p('need_hand_cleanser')));
   for(const need of pack.requiredNeeds){assert.equal(q(normal,'open-'+need.id),null);
    await assert.rejects(compile(branch,'20.1',{}, {[p('need_'+need.id.replaceAll('-','_'))]:'1'}));}
   const manual=await compile(branch,'20.1',Object.fromEntries(pack.requiredNeeds.map(need=>[r('open-'+need.id),{quantity:'1',provenance}])));
   for(const need of pack.requiredNeeds){const saved=manual.preliminaryNeeds.find(value=>value.row_id===r('open-'+need.id))!;
    assert.equal(saved.quantity,'1');assert(saved.missing_parameter_ids.includes(p('need_'+need.id.replaceAll('-','_'))));}
   assert.equal(oracle(branch).fullTechnicalAcceptance,false);assert.equal(oracle(branch).physicalResourceCoverageComplete,false);
  }
 });
 await check('actual saved transport adapter UI PDF show known cleanser dispenser and four named gaps across all operations',async()=>{
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
   const items=draft.items.map((item,index)=>({...item,id:'r7-'+index,requestDraftId:'r7'})) as ConsumerRepairRequestItem[];
   const bundle=appendCanonicalBackendRevisionProjection({previousBundle:null,nextBundle:{draft:{id:'r7'},items,
    structuredEstimatePayload:draft.structuredEstimatePayload} as ConsumerRepairDraftBundle,payload});
   const visible=buildRequestEstimateViewModel(bundle)!.sections.flatMap(section=>section.items),pdf=savedRenderingReview({revision:stored,rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(stored),workTitleRu:'Отделка стен'});
   assert.equal(consumerEstimateOpenScopeGroups(bundle).length,0);assert.equal(consumerEstimateUnresolvedQuantityItems(bundle).length,4);
   for(const key of ['hand-cleanser-order','tool-hand-cleanser-dispenser',...pack.requiredNeeds.map(need=>'open-'+need.id)]){
    const definitionRow=definition(branch).resources.find(row=>row.row_id===r(key))!,item=visible.find(item=>item.sourceParameters?.rowCode===r(key));
    assert(item,key+' in UI');assert.equal(item.quantity,key==='hand-cleanser-order'||key==='tool-hand-cleanser-dispenser'?1:null);
    const title=(definitionRow.resource_graph.publicResourcePresentationV1 as Json)?.nameRu??definitionRow.title_ru;
    const saved=[...pdf.savedReviewRows,...pdf.savedReviewNeeds].find((row:Json)=>row.row_id===definitionRow.row_id)!;
    const original=[...result.rows,...result.preliminaryNeeds].find(row=>row.row_id===definitionRow.row_id)!;assert(saved);assert(original);
    const {row_sha256:_savedRow,need_sha256:_savedNeed,...savedBody}=saved,
     {row_sha256:_originalRow,need_sha256:_originalNeed,...originalBody}=original;
    assert.deepEqual(savedBody,originalBody,key+' preserves saved ID/ordinal/unit/quantity/price/conditions/procurement');
    assert.equal((definitionRow.resource_graph.publicResourcePresentationV1 as Json)?.nameRu??definitionRow.title_ru,title);
    assert(pdf.html.includes('<strong>'+reviewEscape(expectedSavedReviewTitle(pdf,saved))+'</strong>'),key+' approved public visible/pending title in PDF');
   }
   assert(!pdf.html.includes('need_hand_cleanser'));assert(!pdf.html.includes('need_hand_drying_towels'));
   const detail=visible.find(item=>item.sourceParameters?.rowCode===r('open-hand-cleanser'))!;
   assert(detail);assert(consumerRepairRowIsTechnicalDetail(detail));
   assert(!pdf.html.includes('Расход средства для подготовки рук перед защитой кожи'));
   assert.equal(bundle.items.filter(item=>item.sourceParameters?.rowCode===r('hand-cleanser-order')).length,1);
  }
 });
 await check('high quality05 keeps independent unknown VGT putty demand and source guard',async()=>{
  const result=await compile('high-quality-wall-05');assert.equal(q(result,'ready-putty-order'),null);
  await assert.rejects(compile('high-quality-wall-05','20.1',{}, {[p('high_quality_vgt_putty_kg_m2')]:'1.4'}));
  assert.equal(oracle('high-quality-wall-05').normativeResourceQuantitiesComplete,false);
 });
 return{status:'PASS_PARTIAL_WHOLE_KIT_R7_WITH_NORMAL_PREPARATION_CLEANSER_AND_EXECUTION_SCOPE',checks:done.length,completed:done,
  consumers:pack.activeConsumers,physicalNeedsClosed:pack.physicalNeedsClosed,remainingNeeds:pack.requiredNeeds.map(need=>need.id),fullTechnicalAcceptance:false};
}
if(typeof it==='function')it('R7 VGT normal hand preparation and access execution retain independent whole-kit gates',async()=>{await runInteriorWallFinishingProvisionChecksR7();});
