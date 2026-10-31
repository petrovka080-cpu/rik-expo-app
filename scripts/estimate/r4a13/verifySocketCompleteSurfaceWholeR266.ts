import assert from 'node:assert/strict';
import fixture from '../../../data/estimate-benchmarks/fixtures/socket-complete-surface-whole-independent-r266.json';
import {socketCompleteSurfacePackR266 as pack,socketCompleteSurfaceRowR266 as rid,socketCompleteSurfaceWholeR266 as definition}
  from './ownedDomain/socketCompleteSurfaceWholeR266';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult,type CanonicalEstimateCompileCoreInput}
  from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalProfessionalPdfReviewAcknowledgmentV1,canonicalProfessionalPdfReportOriginalAuditV1}
  from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {canonicalEstimateOperationReferences} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells}
  from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactPreliminaryNeeds,canonicalArtifactMoney,escapeCanonicalArtifactHtml}
  from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {buildCanonicalRevisionCommitPayload} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';

type Model=AutomaticOwnerDefinition;
export type SocketVerificationContextR266=Readonly<{parent:Model;model?:Model;
  onCoreCall?:(ordinal:number,id:string)=>void;onOutcome?:(name:string,value:unknown)=>void}>;
function record(v:unknown):v is Record<string,unknown>{return v!==null&&typeof v==='object'&&!Array.isArray(v);}
export function verifySocketCompleteSurfacePureR266(parent:Model,model:Model):void{
  assert.deepEqual([parent.parameters.length,parent.formulas.length,parent.resources.length],[1,63,63]);
  assert.deepEqual([model.parameters.length,model.formulas.length,model.resources.length],fixture.expectedShape);
  assert.deepEqual(model.parameters.slice(0,1),parent.parameters);assert.deepEqual(model.formulas.slice(0,63),parent.formulas);
  const selected={[pack.methodParameterId]:pack.method},legacy={q:100},explicitLegacy={...legacy,[pack.methodParameterId]:pack.legacyMethod};
  for(const old of parent.resources){
    const next=model.resources.find(r=>r.row_id===old.row_id);assert(next);
    const {inclusion_ast:_oldInclusion,row_sha256:_oldHash,...oldBody}=old;
    const {inclusion_ast:_newInclusion,row_sha256:_newHash,...nextBody}=next;
    assert.deepEqual(nextBody,oldBody,'EXACT_LEGACY_BODY_OWNER_FORMULA_SOURCE_AND_PROCUREMENT');
    assert.deepEqual(next.inclusion_ast,{kind:'and',operands:[old.inclusion_ast,{kind:'not',operand:{kind:'selected',parameterId:pack.methodParameterId,value:pack.method}}]});
    assert.deepEqual(resolveInclusionGraph(next.inclusion_ast,legacy),resolveInclusionGraph(old.inclusion_ast,legacy));
    assert.deepEqual(resolveInclusionGraph(next.inclusion_ast,explicitLegacy),resolveInclusionGraph(old.inclusion_ast,explicitLegacy));
    assert.equal(resolveInclusionGraph(next.inclusion_ast,selected).value,false,'ONE_PROFILE_NO_OLD_GENERIC_COSTS');
  }
  const added=model.resources.slice(63),params=model.parameters.slice(1);
  assert.equal(added.length,24);assert.equal(params.length,28);assert.equal(new Set(model.resources.map(r=>r.row_id)).size,87);
  assert.equal(new Set(model.parameters.map(p=>p.parameter_id)).size,29);assert.equal(new Set(model.formulas.map(f=>f.formula_id)).size,87);
  assert.deepEqual(added.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id),fixture.newPaidOwnerSuffixes.map(rid));
  assert.deepEqual(added.filter(r=>r.procurement_eligible).map(r=>r.row_id),fixture.newProcurementOwnerSuffixes.map(rid));
  const internal=params.filter(p=>p.truth_metadata.visibility_role==='INTERNAL_ONLY');assert.equal(internal.length,3);
  for(const p of params){assert.equal(p.default_value,null);const provenance=p.truth_metadata.provenance;assert(record(provenance));
    assert.equal(p.truth_metadata.projectAuthenticated,false);assert.equal(p.truth_metadata.sourceAuthorityPromoted,false);
    const guide=p.truth_metadata.guide;
    if(p.truth_metadata.visibility_role==='INTERNAL_ONLY'){
      assert.equal(Object.hasOwn(p.truth_metadata,'guide'),false,'DERIVED_BALANCE_NOT_MANUFACTURER_VERIFIED');
      assert.equal(p.truth_metadata.value_source_role,'COMPILER_DERIVED_RESOURCE_QUANTITY');
      assert.equal(provenance.consumer_input_role_v1,'APPLICATION_TECHNICAL');assert(record(p.truth_metadata.effective_resource_quantity_v1));
    }else{assert.equal(p.truth_metadata.value_source_role,'PROJECT_SPECIFIC_INPUT');assert.equal(provenance.consumer_input_role_v1,'OBJECT_FACT');
      assert(record(guide));assert.equal(guide.source_role,'ACTUAL_PROJECT_DOCUMENT_REQUIRES_SERVER_BINDING');
      assert.equal(Object.hasOwn(guide,'verified_at'),false,'NO_UNEARNED_OBJECT_VERIFICATION_DATE');
      assert.equal(Object.hasOwn(guide,'source_snapshot_hash'),false,'PRODUCT_PDF_IS_NOT_PPR_STOCK_OR_PRICE_EVIDENCE');
      assert.equal(guide.source_locator,p.title_ru);}
  }
  for(const row of added){assert.equal(resolveInclusionGraph(row.inclusion_ast,legacy).value,false);
    assert(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).length>0);
    const qualification=row.resource_graph.sourceQualifiedCompleteSocketV1;assert(record(qualification));assert.equal(qualification.projectFactsAuthenticated,false);
  }
  assert.deepEqual(added.filter(r=>r.resource_graph.excludeKnownZeroQuantityV1===true).map(r=>r.row_id),['delivery','waste-removal'].map(rid));
  for(const map of[fixture.completenessMap,fixture.newProfileCompletenessMap])assert.deepEqual(validateIndependentCompletenessMapReferences({
    completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
  assert.equal(fixture.completenessMap.entries.length,87);assert.equal(fixture.newProfileCompletenessMap.entries.length,24);
  for(const e of fixture.newProfileCompletenessMap.entries){const row=added.find(r=>r.row_id===e.resolution.rowId);assert(row);
    assert.equal(row.unit_id,e.unitId);assert.equal(row.category,e.category);
    assert.deepEqual(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(op=>op.operationId),e.requiredOperationIds);
    if(e.resolution.kind==='INCLUDED_COMPONENT_ROW'){assert('parentRowId' in e.resolution);assert.equal(row.resource_graph.includedInResourceOwnerRowId,e.resolution.parentRowId);}
  }
  assert.equal(pack.full,false);assert.equal(pack.ready,false);assert.equal(pack.newPublicCatalogs,0);
}
// Only the explicit saved-review entry uses the server snapshot hash. Other
// finite preview entries retain their historical EH callback and checksum.
const savedReviewHashR266=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
function saved(result:CanonicalEstimateCompileCoreResult,input:Record<string,unknown>,overrides:CanonicalEstimateCompileCoreInput['rowOverrides'],snapshotHash:(value:unknown)=>string=hash){
  const checksum=snapshotHash(result.revisionProjection),payload=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,
    checksumSha256:checksum,compilerVersion:pack.contract,parameters:result.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},
    effectiveUserParameters:input,parentRevisionId:null,identityContract:{fixture:'TEST_ONLY_NOT_SAVED'},derivedParameters:result.derivedParameters,
    preliminaryNeeds:result.preliminaryNeeds,purchaseSupplyIndexV1:result.purchaseSupplyIndexV1,compositionSelectionV1:result.compositionSelectionV1});
  return{id:'TEST_ONLY_SOCKET_PROJECT_COMPOSITION',release_id:'TEST_ONLY_NOT_SAVED',catalog_id:pack.catalogId,checksum_sha256:checksum,
    row_count:result.rows.length,currency_code:'KGS',input_parameters:result.parameters,amendment_contract:{...payload,rowOverrides:structuredClone(overrides??{})}};
}
const rowOf=(result:CanonicalEstimateCompileCoreResult,suffix:string)=>{const row=result.rows.find(r=>r.row_id===rid(suffix));assert(row,'KNOWN_ROW_REQUIRED:'+suffix);return row;};
type Entry=Readonly<{id:string;mode?:string;input?:Readonly<Record<string,unknown>>;remove?:readonly string[];rejectCode?:string;
  expectedQuantities?:Readonly<Record<string,string>>;expectedTotal?:string;expectedNeedSuffix?:string;missingParameterId?:string;manualOwnerQuantity?:string}>;
// Independent fixture: 3 nodes + 1 reserve - 1 stock, in multiples of 2, require 4 ordered pieces.
// Missing conditions preserve that quantity; missing numerical inputs do not manufacture one.
const missingNeedExpectationsR266:Readonly<Record<string,Readonly<{quantity:string|null;needState:'QUANTITY_REQUIRED'|'CONDITION_REQUIRED'}>>>= {
  '03-missing-new-count-never-copy-legacy100':{quantity:null,needState:'QUANTITY_REQUIRED'},
  '04-missing-real-project-reference':{quantity:'4',needState:'CONDITION_REQUIRED'},
  '05-missing-actual-aggregate-labour':{quantity:null,needState:'QUANTITY_REQUIRED'},
  '06-missing-price-scope-evidence':{quantity:'4',needState:'CONDITION_REQUIRED'},
  '07-missing-stock-never-assume-zero':{quantity:null,needState:'QUANTITY_REQUIRED'},
};
export async function verifySocketCompleteSurfaceWholeR266(context:SocketVerificationContextR266){
  const parent=context.parent,model=context.model??definition(parent);verifySocketCompleteSurfacePureR266(parent,model);
  context.onOutcome?.('pure-whole-model-and-independent-map',{shape:fixture.expectedShape,legacyRowsPreserved:63,newRows:24,sourceNormHoursAccepted:false,full:false});
  let attempted=0,completed=0,results=0,rejects=0;const entries:readonly Entry[]=fixture.entries;
  for(const entry of entries){
    const input:Record<string,unknown>={...fixture.testOnlyInput,...entry.input};for(const id of entry.remove??[])delete input[id];
    const overrides:CanonicalEstimateCompileCoreInput['rowOverrides']=entry.manualOwnerQuantity===undefined?undefined:{[rid('assembly:order')]:{
      quantity:entry.manualOwnerQuantity,unitPrice:'500',provenance:{kind:'manual',reason:'TEST_ONLY same actual supply quantity retained with honest quantum HOLD'}}};
    const prices:NonNullable<CanonicalEstimateCompileCoreInput['priceItems']>=Object.entries(fixture.testOnlyPrices).map(([suffix,price])=>{
      const resource=model.resources.find(r=>r.row_id===rid(suffix));assert(resource);return{price_key:rid(suffix),unit_id:resource.unit_id,
        currency_code:'KGS',unit_price:price,snapshot_id:'TEST_ONLY_NOT_MARKET_QUOTE'};});
    if(entry.mode==='public-money')prices.push({price_key:rid('owned-tools'),unit_id:'set',currency_code:'KGS',unit_price:'200',snapshot_id:'TEST_ONLY_REFERENCE_ONLY'});
    const invoke=async()=>{attempted++;context.onCoreCall?.(attempted,entry.id);let value:CanonicalEstimateCompileCoreResult;
      try{value=await compileCanonicalEstimateCore({operation:overrides?'recalculate':'compile',catalogId:pack.catalogId,compilerVersion:pack.contract,
        primaryMeasureParameterId:pack.countParameterId,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
        submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',priceItems:prices,rowOverrides:overrides,maximumResourceRows:model.resources.length,hashJson:async value=>entry.mode==='public-money'?savedReviewHashR266(value):hash(value)});
      }catch(error){completed++;context.onOutcome?.('actual-core-'+entry.id,{kind:'REJECT',code:record(error)?error.code:null,message:error instanceof Error?error.message:String(error)});throw error;}
      completed++;context.onOutcome?.('actual-core-'+entry.id,{kind:'RESULT',value});return value;};
    if(entry.rejectCode){await assert.rejects(invoke,e=>record(e)&&e.code===entry.rejectCode);rejects++;continue;}
    const result=await invoke();results++;
    assert.equal(result.rows.some(r=>parent.resources.some(old=>old.row_id===r.row_id)),false,'NO_SECOND_LEGACY_COST_OR_SUPPLY');
    assert.equal(result.preliminaryNeeds.some(r=>parent.resources.some(old=>old.row_id===r.row_id)),false,'INACTIVE_LEGACY_NOT_NEW_PROFILE_NEED');
    const payable=new Set(fixture.newPaidOwnerSuffixes.map(rid)),procurement=new Set(fixture.newProcurementOwnerSuffixes.map(rid));
    for(const row of result.rows){if(!payable.has(row.row_id))assert.equal(row.included_in_estimate,false);
      if(!procurement.has(row.row_id))assert.equal(row.included_in_procurement,false);}
    if(entry.mode==='missing'||entry.mode==='missing-stock'){
      assert(entry.expectedNeedSuffix&&entry.missingParameterId);assert.equal(result.rows.some(r=>r.row_id===rid(entry.expectedNeedSuffix!)),false);
      const expected=missingNeedExpectationsR266[entry.id];assert(expected,'EXACT_MISSING_CASE_EXPECTATION_REQUIRED');
      const need=result.preliminaryNeeds.find(n=>n.row_id===rid(entry.expectedNeedSuffix!));assert(need);assert.equal(need.quantity,expected.quantity);
      assert.equal(need.need_state,expected.needState);assert.equal(need.unit_price,null);
      assert.equal(Object.hasOwn(need,'amount'),false);assert.deepEqual(need.missing_parameter_ids,[entry.missingParameterId]);
      const artifact=canonicalArtifactPreliminaryNeeds(saved(result,input,overrides)).find(n=>n.row_id===need.row_id);assert(artifact);
      assert.equal(artifact.quantity,expected.quantity);assert.equal(artifact.amount,null);assert.equal(artifact.included_in_estimate,false);assert.equal(artifact.included_in_procurement,false);
      if(entry.mode==='missing-stock'){
        const consumed=[...result.rows,...result.preliminaryNeeds].filter(r=>r.row_id===rid('assembly:consumed'));
        assert.equal(consumed.length,1,'EXACTLY_ONE_KNOWN_CONSUMPTION_OWNER');assert.equal(consumed[0]?.quantity,'3','MISSING_STOCK_PRESERVES_KNOWN_CONSUMPTION');
        for(const suffix of['remaining','free','shortage','reserve-deficit']){
          assert.equal(result.rows.some(r=>r.row_id===rid('assembly:'+suffix)),false,'MISSING_STOCK_NOT_ZERO_BALANCE');
          const downstream=result.preliminaryNeeds.find(n=>n.row_id===rid('assembly:'+suffix));assert(downstream);assert.equal(downstream.quantity,null);
          assert.equal(downstream.need_state,'QUANTITY_REQUIRED');assert.equal(downstream.procurement_eligible,false);assert.equal(Object.hasOwn(downstream,'amount'),false);
          assert(downstream.missing_parameter_ids.includes(entry.missingParameterId));
        }
      }
      continue;
    }
    if(entry.mode==='quantum'){
      const owner=rowOf(result,'assembly:order');assert.equal(owner.quantity,'3');assert.equal(owner.unit_price,'500');assert.equal(owner.amount,null);
      assert.equal(owner.included_in_procurement,false);assert.equal(owner.procurement_readiness,'SUPPLY_CONFIRMATION_REQUIRED');
      for(const suffix of['remaining','free','shortage','reserve-deficit']){const id=rid('assembly:'+suffix);assert.equal(result.rows.some(r=>r.row_id===id),false);
        const need=result.preliminaryNeeds.find(n=>n.row_id===id);assert(need);assert.equal(need.quantity,null);assert.equal(Object.hasOwn(need,'amount'),false);
        assert.equal(need.need_state,'SUPPLY_CONFIRMATION_REQUIRED');assert.equal(need.procurement_eligible,false);}
      const outputs=model.parameters.filter(p=>record(p.truth_metadata.effective_resource_quantity_v1)&&p.truth_metadata.effective_resource_quantity_v1.sourceRowId===rid('assembly:order'));
      assert.equal(outputs.length,1,'NONVACUOUS_EXACT_NEW_EFFECTIVE_OUTPUT');const output=outputs[0];assert(output);assert.equal(Object.hasOwn(result.derivedParameters,output.parameter_id),false);continue;
    }
    if(entry.expectedQuantities)for(const[suffix,quantity]of Object.entries(entry.expectedQuantities))assert.equal(rowOf(result,suffix).quantity,quantity,'INDEPENDENT_EXACT_QUANTITY:'+suffix);
    if(entry.mode==='direct')assert.equal([...result.rows,...result.preliminaryNeeds].some(r=>r.row_id.startsWith(rid('anchors:'))),false,'NO_UNSELECTED_ANCHOR_QUANTITY_OR_ORDER');
    assert.equal(result.totals.amount,entry.expectedTotal);assert.equal(result.preliminaryNeeds.length,0);
    const waste=rowOf(result,'waste-removal');
    assert.equal(waste.quantity,'0');assert.equal(waste.unit_price,'50');
    assert.equal(waste.included_in_estimate,false);assert.equal(waste.included_in_procurement,false);
    assert(record(waste.calculation_trace),'KNOWN_ZERO_WASTE_TRACE_REQUIRED');
    assert.deepEqual(waste.calculation_trace.knownZeroExclusionV1,{calculatedQuantity:'0',orderedQuantity:'0'});
    const delivery=result.rows.filter(r=>r.row_id===rid('delivery'));assert.equal(delivery.length,1);
    assert.equal(delivery[0]!.quantity,'1');assert.equal(delivery[0]!.amount,'100');
    assert.equal(delivery[0]!.included_in_estimate,true);assert.equal(delivery[0]!.included_in_procurement,true);
    if(entry.mode==='public-money'){
      const tool=rowOf(result,'owned-tools');assert.equal(tool.unit_price,'200');assert.equal(tool.amount,'200');assert.equal(tool.included_in_estimate,false);assert.equal(tool.included_in_procurement,false);
      const before=JSON.stringify(result),revision={...saved(result,input,overrides,savedReviewHashR266),definition_version_id:'TEST_ONLY_SOCKET_R266_PUBLIC_MONEY_MODEL'};
      const savedBefore=JSON.stringify(revision);context.onOutcome?.('saved-revision-before-public-assert',{revision});
      const preliminaryNeeds=canonicalArtifactPreliminaryNeeds(revision,{issuancePurpose:'PRELIMINARY_REVIEW'}),resources=[...result.rows,...preliminaryNeeds],
        originalAudit=canonicalProfessionalPdfReportOriginalAuditV1({revision,resources}),
        projectionInput={revision,rows:result.rows,preliminaryNeeds,workTitleRu:'Монтаж розеток'};
      assert.equal(originalAudit.status,'COMPOSITION_UNVERIFIED');
      assert.equal(originalAudit.pdfAllowed,false);assert.equal(originalAudit.definitionAdmissionAllowed,false);assert.equal(originalAudit.completeClaimAllowed,false);
      assert(originalAudit.issues.some(issue=>issue.code==='INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED'),'ORIGINAL_INDEPENDENT_COMPOSITION_HOLD_RETAINED');
      // The literal fixture and old18 source bindings do not authorize STANDARD.
      assert.throws(()=>buildCanonicalProfessionalPdfProjection(projectionInput),error=>record(error)&&error.code==='ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED');
      const review={...projectionInput,issuancePurpose:'PRELIMINARY_REVIEW' as const};
      assert.throws(()=>buildCanonicalProfessionalPdfProjection(review),error=>record(error)&&error.code==='ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID');
      const reviewAcknowledgmentV1=canonicalProfessionalPdfReviewAcknowledgmentV1({revision,resources,
        request:{revisionId:revision.id,releaseId:revision.release_id,definitionVersionId:revision.definition_version_id,
          checksumSha256:revision.checksum_sha256,acknowledgedPreliminaryReview:true},
        actorUserId:'TEST_ONLY_SOCKET_SAVED_READER',acknowledgedAt:'2026-10-30T00:00:00Z'});
      assert.throws(()=>buildCanonicalProfessionalPdfProjection({...review,reviewAcknowledgmentV1:{...reviewAcknowledgmentV1,checksumSha256:'0'.repeat(64)}}),
        error=>record(error)&&error.code==='ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID');
      const projection=buildCanonicalProfessionalPdfProjection({...review,reviewAcknowledgmentV1});
      assert(projection.html.includes('Предварительная для проверки'));assert.notEqual(projection.grandTotalStatus,'COMPLETE');
      assert.equal(JSON.stringify(revision),savedBefore);assert.deepEqual(canonicalProfessionalPdfReportOriginalAuditV1({revision,resources}),originalAudit);
      assertCanonicalProfessionalPdfMoneyCells(projection.html);assert.equal(projection.categoryTotals.material,2034);assert.equal(projection.categoryTotals.work,2000);
      const trs=[...projection.html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gu)].map(m=>m[0]).filter(tr=>tr.includes(escapeCanonicalArtifactHtml(String(tool.title_ru))));assert(trs.length>0);
      for(const tr of trs){const cells=[...tr.matchAll(/<td\s+class="money">([\s\S]*?)<\/td>/gu)].map(m=>m[1]);
        assert.deepEqual(cells,[escapeCanonicalArtifactHtml(canonicalArtifactMoney('200','KGS')),'']);}
      const wasteTrs=[...projection.html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gu)].map(m=>m[0])
        .filter(tr=>tr.includes(escapeCanonicalArtifactHtml(String(waste.title_ru))));assert(wasteTrs.length>0);
      for(const tr of wasteTrs){const cells=[...tr.matchAll(/<td\s+class="money">([\s\S]*?)<\/td>/gu)].map(m=>m[1]);
        assert.deepEqual(cells,[escapeCanonicalArtifactHtml(canonicalArtifactMoney('50','KGS')),'']);}
      assert.equal(JSON.stringify(result),before);context.onOutcome?.('shared-public-money-and-single-owner-pass',{total:'4134',referencePrice:'200',referenceAmountBlank:true,rawUnchanged:true,projectAuthenticated:false,full:false});
    }
  }
  assert.deepEqual({attempted,completed,results,rejects},{attempted:13,completed:13,results:9,rejects:4});
  return{status:'SCOPED_TEST_ONLY_SOCKET_PROJECT_WHOLE_FINITE',entries:13,actualCoreCalls:attempted,completedCoreCalls:completed,results,rejects,
    shape:fixture.expectedShape,newPaidOwners:6,newProcurementOwners:5,legacyRowsRetained:63,legacyUnverifiedSources:18,
    sourceNormHoursAccepted:false,projectAuthenticated:false,newPublicCatalogs:0,ready:false,full:false};
}
