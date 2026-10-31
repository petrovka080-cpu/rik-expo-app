import assert from 'node:assert/strict';
import pack from '../../../../data/estimate-benchmarks/source-packs/facade-bolix-mw120-krer15-r1.json';
import {facadeMw120DefinitionR1,facadeMw120ScenarioFactsR1,facadeMw120TechnicalParameterIdsR5,facadeMw120PrimaryR1} from './facadeMw120Krer15R1';
import {master35FacadeRepresentativeR1,master35FacadeCapturedParentR1,buildMaster35FacadeMw120SuccessorR1,compileMaster35FacadeR1 as compileRaw,master35FacadeParameterIdR1 as ns} from './master35FacadeMw120R1';
import {master35FacadeRetainedOptionsR1,master35FacadeMw120MasterConfigR1} from '../../../../scripts/estimate/r4a13/prepareMaster35FacadeMw120R1';
import {masterRegisteredRetainedForwardLineageR1} from '../../../../scripts/estimate/r4a13/masterRetainedForwardLineageR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {assertCanonicalMachineHourDefinitionV1,canonicalMachineHourPriceRequirementV1} from '../backendPlatform/canonicalMachineHourPriceCoverageV1';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactVisibleRowTitle,escapeCanonicalArtifactHtml,canonicalArtifactPreliminaryNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalProfessionalPdfReportOriginalAuditV1,canonicalProfessionalPdfReviewEligibilityV1,canonicalProfessionalPdfReviewAcknowledgmentV1} from '../backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';

// TEST_ONLY source fixture readback; assertions and physical inputs below stay unchanged.
const namespacedTechnicalFixtureIds=new Set(facadeMw120TechnicalParameterIdsR5.map(ns));
function compileMaster35FacadeR1(model:Parameters<typeof compileRaw>[0],values:Record<string,unknown>,options:Parameters<typeof compileRaw>[2]={}){
 const submitted=Object.fromEntries(Object.entries(values).filter(([id])=>!namespacedTechnicalFixtureIds.has(id)));
 const confirmedParameters=Object.fromEntries(Object.entries(values).filter(([id])=>namespacedTechnicalFixtureIds.has(id)));
 return compileRaw(model,submitted,{...options,confirmedParameters});
}
const original=master35FacadeRepresentativeR1(),model=buildMaster35FacadeMw120SuccessorR1(original);
const same=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const input=(more:Record<string,unknown>={})=>({...Object.fromEntries(Object.entries(facadeMw120ScenarioFactsR1({facade_length_m:'10',facade_height_m:'10',openings_outer_frame_area_m2:'0',...more})).map(([id,v])=>[ns(id),v])),[pack.sourceProfileSelectorId]:pack.exactChoiceRu});
const semantics=(r:any)=>({rows:r.rows.map((x:any)=>[x.row_id,x.quantity,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]),needs:r.preliminaryNeeds,totals:r.totals});

// Explicit saved-report fixture only. Same selected model/input/Core as the
// preview wrapper, but canonical SHA is selected BEFORE compilation.
async function compileSavedMw120ReportCoreR2(parameters:Record<string,unknown>,options:Parameters<typeof compileRaw>[2]={}){
 const submittedParameters=Object.fromEntries(Object.entries(parameters).filter(([id])=>!namespacedTechnicalFixtureIds.has(id))),
  confirmedParameters=Object.fromEntries(Object.entries(parameters).filter(([id])=>namespacedTechnicalFixtureIds.has(id)));
 assert.equal(parameters[pack.sourceProfileSelectorId],pack.exactChoiceRu);
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:model.definition.catalog_id,
  primaryMeasureParameterId:ns(facadeMw120PrimaryR1),parameterDefinitions:model.parameters as any,formulaDefinitions:model.formulas as any,
  resourceDefinitions:model.resources as any,submittedParameters,confirmedParameters,rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',
  maximumResourceRows:model.resources.length,hashJson:value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))});
}
function savedMw120PreliminaryReportR2(result:Awaited<ReturnType<typeof compileSavedMw120ReportCoreR2>>,workTitleRu:string){
 const revision={id:'TEST_ONLY_MW120_SAVED_REPORT',release_id:'TEST_ONLY_MW120_RELEASE',definition_version_id:'TEST_ONLY_MW120_DEFINITION',
  catalog_id:pack.catalogId,checksum_sha256:canonicalEstimateSha256HexText(canonicalEstimateStableJson(result.revisionProjection)),
  row_count:result.rows.length,currency_code:'KGS',input_parameters:result.parameters,amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}},
  preliminaryNeeds=canonicalArtifactPreliminaryNeeds(revision,{issuancePurpose:'PRELIMINARY_REVIEW'}),
  snapshot={revision,resources:[...result.rows,...preliminaryNeeds]},before=canonicalEstimateStableJson(snapshot),
  originalAudit=canonicalProfessionalPdfReportOriginalAuditV1(snapshot),projectionInput={revision,rows:result.rows,preliminaryNeeds,workTitleRu};
 assert.equal(originalAudit.status,'COMPOSITION_UNVERIFIED');assert.equal(originalAudit.pdfAllowed,false);
 assert.equal(originalAudit.definitionAdmissionAllowed,false);assert.equal(originalAudit.completeClaimAllowed,false);
 assert.deepEqual(originalAudit.issues.filter(issue=>issue.code==='RELATED_OPERATION_INVALID_OR_DUPLICATED'),[]);
 assert.deepEqual(originalAudit.issues.filter(issue=>issue.code==='OPERATION_METADATA_CONFLICT'),[]);
 assert.deepEqual(originalAudit.issues.filter(issue=>issue.code==='RESOURCE_UNIT_UNRESOLVED').map(issue=>issue.rowId),pack.residual.map(need=>need.needId));
 assert.equal(originalAudit.issues.filter(issue=>issue.code==='INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED').length,1);
 assert.equal(originalAudit.issues.filter(issue=>issue.code==='RESOURCE_QUANTITY_UNRESOLVED').length,1);
 assert.throws(()=>buildCanonicalProfessionalPdfProjection(projectionInput),{code:'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED'});
 const eligibility=canonicalProfessionalPdfReviewEligibilityV1(snapshot);assert.equal(eligibility.eligible,true);
 const acknowledgment=canonicalProfessionalPdfReviewAcknowledgmentV1({...snapshot,
  request:{revisionId:revision.id,releaseId:revision.release_id,definitionVersionId:revision.definition_version_id,checksumSha256:revision.checksum_sha256,acknowledgedPreliminaryReview:true},
  actorUserId:'TEST_ONLY_MW120_SAVED_REPORT_READER',acknowledgedAt:'2026-10-30T00:00:00.000Z'}),
  reviewInput={...projectionInput,issuancePurpose:'PRELIMINARY_REVIEW' as const},
  wrongChecksum=(revision.checksum_sha256[0]==='0'?'1':'0')+revision.checksum_sha256.slice(1);
 assert.equal(acknowledgment.auditSha256,eligibility.auditSha256);
 assert.throws(()=>buildCanonicalProfessionalPdfProjection(reviewInput),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
 assert.throws(()=>buildCanonicalProfessionalPdfProjection({...reviewInput,reviewAcknowledgmentV1:{...acknowledgment,checksumSha256:wrongChecksum}}),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
 assert.throws(()=>buildCanonicalProfessionalPdfProjection({...reviewInput,reviewAcknowledgmentV1:{...acknowledgment,releaseId:'WRONG_SAVED_RELEASE'}}),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
 const pdf=buildCanonicalProfessionalPdfProjection({...reviewInput,reviewAcknowledgmentV1:acknowledgment});
 assert.notEqual(pdf.grandTotalStatus,'COMPLETE');assert(pdf.html.includes('saved-report-warnings'));assert(!pdf.html.includes('class="approval-block"'));
 assert.equal(canonicalEstimateStableJson(snapshot),before);assert.deepEqual(canonicalProfessionalPdfReportOriginalAuditV1(snapshot),originalAudit);return pdf;
}

describe('MW120 current pipeline R2 — integration delta, UNRUN by source author',()=>{
 test('source related operations borrow exact existing owner criteria and reject a missing criterion',()=>{
  const definition=facadeMw120DefinitionR1();let checked=0;
  for(const row of definition.resources){const operation=row.resource_graph.operationCompositionV1 as {additionalOperations?:unknown[]};
   if(!operation.additionalOperations?.length)continue;
   const refs=canonicalEstimateOperationReferences(operation);assert.equal(refs.length,operation.additionalOperations.length+1);
   for(const [index,reference]of refs.entries()){
    assert.equal(reference.completionCriterionRu,'Исходный количественный состав, без объявления фактической стройготовности.');
    const authored=pack.operations.find(source=>pack.prefix+':operation:'+source.key===reference.operationId);
    // Existing aggregate primary roles (all/handling/mixing/starter) remain
    // unchanged; every additional use must be a real authored source operation.
    if(index===0&&!authored)continue;assert(authored);
    assert.equal(reference.operationTitleRu,authored.titleRu);assert.equal(reference.processOrdinal,authored.sourceOrdinal);
   }
   const invalid=structuredClone(operation) as {additionalOperations:Record<string,unknown>[]};delete invalid.additionalOperations[0]!.completionCriterionRu;
   assert.equal(canonicalEstimateOperationReferences(invalid).length,refs.length-1);checked++;
  }assert(checked>0,'ACTUAL_SHARED_SOURCE_ROWS_REQUIRED');
 });
 test('all14 exact machine owners are admitted, raw consumers and neighbour catalogs are excluded',()=>{
  const definitions=facadeMw120DefinitionR1().resources;
  let owners=0;
  for(const m of pack.rows.filter(x=>x.category==='equipment')){
   for(const mode of ['own','hired']){
    const id=pack.prefix+':'+m.key+'-'+mode,row=definitions.find(x=>x.row_id===id)!;
    const request={catalogId:pack.catalogId,rowId:id,unitId:'machine_hour',sourceMetadata:row.source_metadata};
    assert(assertCanonicalMachineHourDefinitionV1(request));owners++;
    assert.equal(canonicalMachineHourPriceRequirementV1(id,'machine_hour')?.resourceCode,m.resourceCode);
    assert.equal(assertCanonicalMachineHourDefinitionV1({...request,catalogId:'TEST_ONLY_FOREIGN_CATALOG'}),null);
    for(const changed of [{source_artifact_sha256:'0'.repeat(64)},{exact_column:'15-01-080-02'},{normativeResourceCode:'TEST_OTHER_MACHINE'}])
     assert.throws(()=>assertCanonicalMachineHourDefinitionV1({...request,sourceMetadata:{...row.source_metadata,...changed}}),{code:'DEFINITION_INTEGRITY_FAILED'});
   }
   assert.equal(canonicalMachineHourPriceRequirementV1(pack.prefix+':'+m.key+'-consumed','machine_hour'),null);
  }
  assert.equal(owners,14);
 });
 test('finite historical registration binds all three observed predecessor nodes, never caller supplied ancestry',()=>{
  const opt=master35FacadeRetainedOptionsR1(),capture=opt.capturedParent;
  const nodes=masterRegisteredRetainedForwardLineageR1(capture,opt.capturedParentSha256,same)!;
  assert.equal(nodes.length,3);
  assert.deepEqual(nodes.map(x=>x.definition.definition_version),[6,5,4]);
  assert.equal(masterRegisteredRetainedForwardLineageR1(capture,'0'.repeat(64),same),null);
  const altered=structuredClone(capture) as any;altered.baseline.input_values.area_m2='77';
  assert.equal(masterRegisteredRetainedForwardLineageR1(altered,opt.capturedParentSha256,same),null);
  assert.deepEqual(master35FacadeCapturedParentR1().definition.source_metadata,capture.definition.source_metadata);
 });
 test('current factory reaches the existing normal compiler/verify path without a stale blocker status',async()=>{
  const cfg=master35FacadeMw120MasterConfigR1({releaseId:'TEST_ONLY_SOURCE_RELEASE',searchReleaseId:'TEST_ONLY_SEARCH_RELEASE',sourceRoot:process.env.MASTER35_FACADE_TEST_SOURCE_ROOT});
  assert.equal(cfg.catalogId,pack.catalogId);assert.equal(cfg.binding.retainParentBindings?.capturedParent.definition.id,pack.currentDefinitionId);
  assert(cfg.sourcePaths.includes('scripts/estimate/r4a13/masterRetainedForwardLineageR1.ts'));
  const result=await cfg.verifyCore();assert.equal(result.newFull,0);
  assert.equal(result.ordinaryLockedDbPreflight,'REQUIRED_BY_STANDARD_PUBLISHER');
  assert(!Object.hasOwn(result,'blocker'));
 });
 test('compiler result is independent of parameter/formula declaration order',async()=>{
  const normal=await compileMaster35FacadeR1(model,input());
  const shuffled=structuredClone(model);shuffled.parameters.reverse();shuffled.formulas.reverse();
  assert.deepEqual(semantics(await compileMaster35FacadeR1(shuffled,input())),semantics(normal));
 });
 test('ordinary legacy replay remains independent of new source composition and source prices',async()=>{
  const captured=master35FacadeCapturedParentR1(),oldInput=structuredClone(captured.baseline.input_values);
  const before=await compileMaster35FacadeR1(original,oldInput),after=await compileMaster35FacadeR1(model,oldInput);
  assert.deepEqual(semantics(after),semantics(before));
  assert.deepEqual(captured.baseline.input_values,oldInput);
 });
 test('raw INFO price remains numeric but never creates a paid/procurement owner',async()=>{
  const id=pack.prefix+':operators',r=await compileMaster35FacadeR1(model,input(),{rowOverrides:{[id]:{unitPrice:'200',includedInEstimate:true,provenance:{kind:'manual',reason:'TEST_ONLY info-price regression'}}}});
  const raw=r.rows.find(x=>x.row_id===id)!;assert(raw);
  assert.equal(cmp(raw.unit_price!,'200'),0);assert.equal(raw.included_in_estimate,false);assert.equal(raw.included_in_procurement,false);
  assert.equal(cmp(raw.quantity,'19.33'),0);
 });
 test('actual compiler rows pass common PDF projection with every unresolved obligation visible',async()=>{
  const parameters=input(),result=await compileSavedMw120ReportCoreR2(parameters);
   const before=JSON.stringify(result),projected=savedMw120PreliminaryReportR2(result,'Наружное утепление минватой120мм с тонкослойной отделкой');
  assertCanonicalProfessionalPdfMoneyCells(projected.html);
  for(const n of pack.residual){assert(result.preliminaryNeeds.some(x=>x.row_id===n.needId));assert(projected.html.includes(escapeCanonicalArtifactHtml(n.titleRu)));}
  assert.equal(result.preliminaryNeeds.length,8);assert(projected.html.includes('Не рассчитано'));
  assert(!/(BOLIX|SSA1363|СТД-985)/i.test([...projected.html.matchAll(/<strong>([^<]*)<\/strong>/g)].map(x=>x[1]).join('|')));
  assert.equal(JSON.stringify(result),before,'projection cannot mutate core result');
 });
 test('common PDF preserves saved INFO price and blanks its amount in all repeated operation rows',async()=>{
  const id=pack.prefix+':operators',parameters=input(),result=await compileSavedMw120ReportCoreR2(parameters,{rowOverrides:{[id]:{unitPrice:'200',provenance:{kind:'manual',reason:'TEST_ONLY numeric reference price'}}}});
   const raw=result.rows.find(x=>x.row_id===id)!,before=JSON.stringify(result),projected=savedMw120PreliminaryReportR2(result,'Наружное утепление');
  assertCanonicalProfessionalPdfMoneyCells(projected.html);
  const title=escapeCanonicalArtifactHtml(canonicalArtifactVisibleRowTitle(raw as any,parameters));
  const trs=[...projected.html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(x=>x[0]).filter(t=>t.includes('<strong>'+title));
  assert(trs.length>0);
   for(const tr of trs){const money=[...tr.matchAll(/<td class="money">([\s\S]*?)<\/td>/g)].map(x=>x[1]);assert.equal(money.length,2);assert(money[0].length>0);assert.equal(money[1],'');}
   assert.equal(JSON.stringify(result),before,'saved reference price report cannot mutate core result');
 });
});
