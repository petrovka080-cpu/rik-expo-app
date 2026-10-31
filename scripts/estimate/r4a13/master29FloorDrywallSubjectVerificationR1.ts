import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildCanonicalRevisionIdentity} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds,escapeCanonicalArtifactHtml} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {buildCanonicalProfessionalPdfProjection,CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION} from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateRevisionRowFromStorage} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {adaptCanonicalRevisionToStructuredEstimate} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateCatalogItem,type CanonicalEstimateRevisionView,type CanonicalEstimateRowOverride} from '../../../src/lib/estimate/backendPlatform/contracts';
import {buildStructuredEstimateRequestDraft} from '../../../src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection} from '../../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection';
import {buildRequestEstimateViewModel} from '../../../src/features/consumerRepair/requestEstimateViewModel';
import type {ConsumerRepairDraftBundle,ConsumerRepairRequestItem} from '../../../src/lib/consumerRequests/consumerRequestTypes';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalProfessionalPdfReportOriginalAuditV1,canonicalProfessionalPdfReviewAcknowledgmentV1,
 canonicalProfessionalPdfReviewEligibilityV1} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';

let workerGuideFieldPairs:readonly (readonly [string,string])[]|undefined;
function currentWorkerGuideFieldPairs(){
 if(!workerGuideFieldPairs){const worker=readFileSync('scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts','utf8'),
  body=worker.slice(worker.indexOf('function localParameterGuideView('),worker.indexOf('function localParameterNormativeLinks(')),
  pairs=[...body.matchAll(/(\w+): guide\.(\w+)/gu)].map(([,target,source])=>[target!,source!] as const);
  assert(pairs.length>=20,'CURRENT_WORKER_GUIDE_MAPPING_REQUIRED');workerGuideFieldPairs=pairs;}
 return workerGuideFieldPairs;
}

/** The current worker's own direct field mapping is the normalization oracle.
 * Reading these two pure helper projections does not import/start the worker. */
export function master29WorkerGuideAndLinksR1(truth:Record<string,any>){
 const pairs=currentWorkerGuideFieldPairs();
 const raw=truth.guide as Record<string,any>|undefined;if(!raw)return{guide:undefined,normativeLinks:[]};
 const guide=Object.fromEntries(pairs.map(([target,source])=>[target,raw[source]]));
 const sourceDocument=String(raw.source_document??'').trim(),sourceLocator=String(raw.source_locator??'').trim(),
  normativeLinks=Array.isArray(truth.normative_links)&&truth.normative_links.length?truth.normative_links:sourceDocument&&sourceLocator?[{
   sourceId:sourceDocument,documentTitleRu:sourceDocument,editionStatus:String(raw.source_edition_status??raw.guide_version??'').trim(),
   locator:sourceLocator,applicabilityRu:String(raw.applicability??'').trim(),verifiedAt:String(raw.verified_at??'').trim(),verifiedSource:String(raw.source_role??'APPROVED_TEMPLATE_BASELINE').trim()}]:[];
 if(truth.runtime_profile_classification==='PRELIMINARY_SOURCE_FORMULA'){
  for(const field of ['guideKind','guideShortRu','guideValidationPolicy','sourceRole','sourceDocument','sourceLocator','guideVersion','sourceSnapshotHash','applicability','verifiedAt'])assert.equal(typeof guide[field],'string','COMPLETE_NORMALIZED_DERIVED_GUIDE:'+field);
  assert.equal(guide.sourceRole,'ENGINEERING_DESIGN');assert.equal(guide.guideKind,'DERIVED_VALUE_RULE');assert(normativeLinks.length>0);}
 return{guide,normativeLinks};
}

/** Test/catalog transport mapping of the actual authored passports, not a new
 * admission or parameter source. The worker separately maps the same fields. */
export function master29SubjectCatalogR1(definition:AutomaticOwnerDefinition,catalogId:string,titleRu:string,selectionMetadata:unknown):CanonicalEstimateCatalogItem{
 const parameterSchema=definition.parameters.map(p=>{const truth=p.truth_metadata,formula=truth.preliminary_value_formula_v1 as Record<string,any>|undefined,normalized=master29WorkerGuideAndLinksR1(truth);
  return{parameterId:p.parameter_id,ordinal:p.ordinal,titleRu:p.title_ru,valueType:p.value_type,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,
   constraints:p.constraints_json,visibilityRole:truth.visibility_role,valueSourceRole:truth.value_source_role,runtimeProfileClassification:truth.runtime_profile_classification,
   provenance:truth.provenance,formulaConsumers:definition.formulas.filter(f=>f.input_parameter_ids.includes(p.parameter_id)).map(f=>f.formula_id),
   resourceBranchConsumers:definition.resources.filter(r=>(r.resource_graph.inputParameterIds as string[]??[]).includes(p.parameter_id)).map(r=>r.row_id),
   ...(formula?.expression?{derivedFrom:compileFormulaGraph(String(formula.expression)).inputParameterIds}:{}),
   sourceConfirmationRequired:truth.source_confirmation_required,preliminaryCompilationAllowed:truth.preliminary_compilation_allowed,visibleWhen:truth.visible_when,
   guide:normalized.guide,normativeLinks:normalized.normativeLinks};});
 return{catalogId,releaseId:'cccccccc-cccc-5ccc-8ccc-cccccccccccd',namespace:'global',workKey:'master29-subject-existing-catalog',titleRu,domain:'interior_finishes',definitionVersion:1,
  applicability:{primaryMeasureSelectionV1:selectionMetadata},professionalMetadata:{},parameterSchema:parameterSchema as CanonicalEstimateCatalogItem['parameterSchema']};
}

/** Independent commercial oracle: one installation owner; an unknown physical
 * labour quantity never becomes a second payable labour position. */
export function assertMaster29IncludedPhysicalOwnersR1(definition:Pick<AutomaticOwnerDefinition,'resources'>,expected:{workOwnerRowId:string;includedRowIds:readonly string[]}){
 const owner=definition.resources.find(r=>r.row_id===expected.workOwnerRowId);assert(owner,'EXPECTED_WHOLE_WORK_OWNER');
 assert.equal(owner.category,'work');assert.equal(owner.unit_id,'m2');assert.equal(owner.resource_graph.costTreatment,'OWN_COST');assert.equal(owner.cost_owner_id,owner.row_id);
 for(const rowId of expected.includedRowIds){const row=definition.resources.find(r=>r.row_id===rowId);assert(row,'EXPECTED_INCLUDED_PHYSICAL_RESOURCE:'+rowId);
  assert.equal(row.resource_graph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS','SECOND_LABOUR_OR_TOOL_PAYMENT_FORBIDDEN:'+rowId);
  assert.equal(row.cost_owner_id,expected.workOwnerRowId,'SINGLE_PAID_OWNER:'+rowId);
  assert.equal(row.resource_graph.includedInResourceOwnerRowId,expected.workOwnerRowId);assert.equal(row.procurement_eligible,false);}
}

/** Subject verification only: invokes the real shared pipeline and never
 * computes a resource, renders a second PDF, writes a revision or publishes. */
export async function verifyMaster29PhysicalPrimaryProjectionR1(input:{catalogId:string;definitionVersionId:string;titleRu:string;
 definition:AutomaticOwnerDefinition;result:CanonicalEstimateCompileCoreResult;primaryParameterId:string;expectedArea:string;
 submittedParameters:Readonly<Record<string,unknown>>;
 rowOverrides?:Record<string,CanonicalEstimateRowOverride>;expectedAmount?:string;
 expectedIncludedManualPhysicalRows?:readonly {rowId:string;quantity:string;unitPrice:string;unitId:string}[];
 expectedPhysicalNeedRowIds?:readonly string[];
 issuancePurpose?:'STANDARD'|'PRELIMINARY_REVIEW'}){
 const issuancePurpose=input.issuancePurpose??'STANDARD',review=issuancePurpose==='PRELIMINARY_REVIEW',
  originalInput=JSON.stringify({definition:input.definition,result:input.result,submittedParameters:input.submittedParameters,rowOverrides:input.rowOverrides});
 assert(issuancePurpose==='STANDARD'||review,'EXPLICIT_SUPPORTED_PDF_PURPOSE_REQUIRED');
 const result=await compileCanonicalEstimateCore({operation:input.rowOverrides?'recalculate':'compile',catalogId:input.catalogId,compilerVersion:'master29-subject-verification',
  primaryMeasureParameterId:input.primaryParameterId,parameterDefinitions:[...input.definition.parameters],formulaDefinitions:[...input.definition.formulas],
  resourceDefinitions:[...input.definition.resources],submittedParameters:input.submittedParameters,confirmedParameters:input.definition.runtimeInput,
  rowOverrides:input.rowOverrides,
  currencyCode:'KGS',maximumResourceRows:input.definition.resources.length,
  hashJson:value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
 assert.deepEqual(result.rows.map(r=>[r.row_id,r.quantity,r.unit_id,r.cost_owner_id]),input.result.rows.map(r=>[r.row_id,r.quantity,r.unit_id,r.cost_owner_id]),'ACTUAL_CRYPTO_CORE_PRESERVES_SUBJECT_QUANTITIES');
 assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),input.result.preliminaryNeeds.map(n=>n.row_id).sort(),'ACTUAL_CRYPTO_CORE_PRESERVES_PHYSICAL_NEEDS');
 if(input.expectedAmount!==undefined)assert.equal(result.totals.amount,input.expectedAmount,'SINGLE_WHOLE_WORK_AMOUNT');
 assert.equal(String(result.parameters[input.primaryParameterId]),input.expectedArea,'COMPILED_SOURCE_DERIVED_PHYSICAL_AREA');
 const identity=await buildCanonicalRevisionIdentity({catalogId:input.catalogId,parentRevisionId:null,
  requestIdentity:{sourceRequestText:input.titleRu,primaryMeasureParameterId:input.primaryParameterId},
  definition:{id:input.definitionVersionId,title_ru:input.titleRu,domain:'interior_finishes'},parameterDefinitions:[...input.definition.parameters],
  parameters:result.parameters,effectiveUserParameters:{},baselineAssumptions:{},preliminaryNeeds:result.preliminaryNeeds,parent:null,
  searchReleaseId:null,compilerVersion:'master29-subject-verification',hashText:value=>createHash('sha256').update(value).digest('hex')});
 assert.equal(identity.primaryMeasureUnitId,'m2');assert.equal(String(identity.primaryMeasureValue),input.expectedArea);
 const stored={id:'cccccccc-cccc-5ccc-8ccc-cccccccccccc',release_id:'cccccccc-cccc-5ccc-8ccc-cccccccccccd',
  // Hash the original Core revision projection when constructing this TEST_ONLY
  // saved snapshot. No compiled row, need, source evidence or norm is rewritten.
  catalog_id:input.catalogId,definition_version_id:input.definitionVersionId,
  checksum_sha256:review?createHash('sha256').update(canonicalEstimateStableJson(result.revisionProjection)).digest('hex'):'a'.repeat(64),row_count:result.rows.length,
  input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',primary_measure_parameter_id:identity.primaryMeasureParameterId,
  primary_measure_value:identity.primaryMeasureValue,primary_measure_unit_id:identity.primaryMeasureUnitId,display_title_ru:identity.displayTitleRu,
  revision_contract_version:identity.contractVersion,amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
 const transport=projectCanonicalEstimatePreliminaryNeedTransport(stored),catalog:CanonicalEstimateCatalogItem={catalogId:input.catalogId,
  releaseId:stored.release_id,namespace:'global',workKey:'master29-subject-existing-catalog',titleRu:input.titleRu,domain:'interior_finishes',
  definitionVersion:1,applicability:{},professionalMetadata:{},parameterSchema:[]};
 const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:stored.id,parentRevisionId:null,
  releaseId:stored.release_id,catalogId:input.catalogId,revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:result.parameters,
  totals:result.totals,rowCount:result.rows.length,checksumSha256:stored.checksum_sha256,compilerVersion:'master29-subject-verification',createdAt:'2026-10-22T00:00:00Z',
  displayTitleRu:String(identity.displayTitleRu),revisionContractVersion:String(identity.contractVersion),primaryMeasureParameterId:input.primaryParameterId,
  primaryMeasureValue:String(identity.primaryMeasureValue),primaryMeasureUnitId:'m2',
  amendmentContract:{rowOverrides:input.rowOverrides??{},customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds};
 const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:result.rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))}),
  draft=buildStructuredEstimateRequestDraft(payload),items=draft.items.map((item,index)=>({...item,id:'master29-'+index,requestDraftId:'master29'})) as ConsumerRepairRequestItem[],
  bundle=appendCanonicalBackendRevisionProjection({previousBundle:null,nextBundle:{draft:{id:'master29'},items,structuredEstimatePayload:draft.structuredEstimatePayload} as ConsumerRepairDraftBundle,payload}),
  visible=buildRequestEstimateViewModel(bundle)!,
  publicItems=visible.sections.flatMap(s=>s.items),expectedTitle=String(identity.displayTitleRu);
 let pdf:ReturnType<typeof buildCanonicalProfessionalPdfProjection>,standardRefusalCode:string|null=null,
  originalAudit:ReturnType<typeof canonicalProfessionalPdfReportOriginalAuditV1>|null=null,originalSnapshot:string|null=null;
 if(review){
  const preliminaryNeeds=canonicalArtifactPreliminaryNeeds(stored,{issuancePurpose}),
   snapshot={revision:stored,resources:[...result.rows,...preliminaryNeeds]},
   projectionInput={revision:stored,rows:result.rows,preliminaryNeeds,workTitleRu:payload.workTitle};
  originalSnapshot=JSON.stringify({stored,rows:result.rows,preliminaryNeeds});
  originalAudit=canonicalProfessionalPdfReportOriginalAuditV1(snapshot);
  if(!originalAudit.pdfAllowed){
   standardRefusalCode=originalAudit.status==='COMPOSITION_UNVERIFIED'?'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED':'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID';
   assert.throws(()=>buildCanonicalProfessionalPdfProjection(projectionInput),{code:standardRefusalCode},'SAME_SNAPSHOT_STANDARD_REMAINS_REJECTED');
  }
  const eligibility=canonicalProfessionalPdfReviewEligibilityV1(snapshot);
  assert.equal(eligibility.eligible,true,'EXACT_SAVED_REVIEW_SNAPSHOT_READABLE');
  const acknowledgment=canonicalProfessionalPdfReviewAcknowledgmentV1({...snapshot,
   request:{revisionId:stored.id,releaseId:stored.release_id,definitionVersionId:stored.definition_version_id,
    checksumSha256:stored.checksum_sha256,acknowledgedPreliminaryReview:true},
   actorUserId:'TEST_ONLY_MASTER29_SUBJECT_REPORT_READER',acknowledgedAt:'2026-10-30T00:00:00.000Z'});
  assert.equal(acknowledgment.auditSha256,eligibility.auditSha256,'ACK_BINDS_ORIGINAL_SNAPSHOT_AND_AUDIT');
  const reviewInput={...projectionInput,issuancePurpose},
   wrongChecksum=(stored.checksum_sha256[0]==='0'?'1':'0')+stored.checksum_sha256.slice(1);
  assert.throws(()=>buildCanonicalProfessionalPdfProjection(reviewInput),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'},'PRELIMINARY_REQUIRES_ACK');
  assert.throws(()=>buildCanonicalProfessionalPdfProjection({...reviewInput,reviewAcknowledgmentV1:{...acknowledgment,checksumSha256:wrongChecksum}}),
   {code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'},'PRELIMINARY_REJECTS_OTHER_CHECKSUM_ACK');
  pdf=buildCanonicalProfessionalPdfProjection({...reviewInput,reviewAcknowledgmentV1:acknowledgment});
  assert.equal(pdf.grandTotalStatus,'PARTIAL_NEEDS_PRICE','PRELIMINARY_IS_NOT_FULL_OR_STANDARD');
  assert(pdf.html.includes('Итог не подтверждён'),'PRELIMINARY_TOTAL_REMAINS_UNCONFIRMED');
  assert(!pdf.html.includes('class="approval-block"'),'PRELIMINARY_NOT_APPROVAL');
  assert.deepEqual(canonicalProfessionalPdfReportOriginalAuditV1(snapshot),originalAudit,'REPORT_RETAINS_ORIGINAL_AUDIT');
  assert.equal(JSON.stringify({stored,rows:result.rows,preliminaryNeeds}),originalSnapshot,'REPORT_DOES_NOT_MUTATE_SNAPSHOT');
 }else{
  pdf=buildCanonicalProfessionalPdfProjection({revision:stored,rows:result.rows,
   preliminaryNeeds:canonicalArtifactPreliminaryNeeds(stored),workTitleRu:payload.workTitle});
 }
 assert.equal(payload.workTitle,expectedTitle);assert.deepEqual(payload.quantity,{status:'accepted',quantity:Number(input.expectedArea),unit:'m2',measurementKind:'backend_primary_measure',assumptions:[]});
 assert.equal(payload.sourceEstimate.input.volume,Number(input.expectedArea));assert.equal(payload.sourceEstimate.input.unit,'m2');
 assert.equal(visible.title,expectedTitle);assert(expectedTitle.endsWith(' м²'));
 assert(pdf.html.includes('<div class="subtitle">'+expectedTitle+'</div>'));
 assert(pdf.html.includes('<strong>Первичная мера:</strong> '+new Intl.NumberFormat('ru-RU',{maximumFractionDigits:6}).format(Number(input.expectedArea))+' м²'));
 const resourceHeader=pdf.html.match(/<table class="client"><thead><tr>([\s\S]*?)<\/tr><\/thead>/u)?.[1];
 assert(resourceHeader,'CURRENT_SHARED_RESOURCE_TABLE');assert.equal([...resourceHeader.matchAll(/<th>/gu)].length,7,'CURRENT_SEVEN_COLUMN_RESOURCE_TABLE');
 for(const rowId of input.expectedPhysicalNeedRowIds??[]){const physical=publicItems.find(item=>item.sourceParameters?.rowCode===rowId);
  assert(physical,'UNKNOWN_PHYSICAL_NEED_VISIBLE:'+rowId);assert.equal(physical.quantity,null,'UNKNOWN_NOT_ZERO:'+rowId);assert(pdf.html.includes(physical.titleRu),'UNKNOWN_PDF_NAME:'+rowId);}
 const manualPhysicalRows=(input.expectedIncludedManualPhysicalRows??[]).map(expected=>{
  const need=transport.preliminaryNeeds.find(n=>n.rowId===expected.rowId),adapted=payload.canonicalBackend?.preliminaryNeeds?.find(n=>n.rowId===expected.rowId),
   artifact=canonicalArtifactPreliminaryNeeds(stored).find(n=>n.row_id===expected.rowId),
   draftItem=draft.items.find(item=>item.sourceParameters?.rowCode===expected.rowId),physical=publicItems.find(item=>item.sourceParameters?.rowCode===expected.rowId);
  assert(need&&adapted&&artifact&&draftItem&&physical,'MANUAL_INCLUDED_PHYSICAL_ROW_SURVIVES_REAL_TRANSPORT_ADAPTER_VM:'+expected.rowId);
  for(const source of [need,adapted]){assert.equal(source.quantity,expected.quantity);assert.equal(source.unitPrice,expected.unitPrice);assert.equal(source.unitId,expected.unitId);
   assert.equal(source.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');assert.equal(source.selected,false);}
  for(const item of [draftItem,physical]){assert.equal(item.quantity,Number(expected.quantity));assert.equal(item.unitPrice,Number(expected.unitPrice));assert.equal(item.unit,expected.unitId);
   assert.equal(item.sourceParameters?.includedInEstimate,false);assert.equal(item.sourceParameters?.includedInProcurement,false);assert.equal(item.sourceParameters?.payable,false);}
  assert.equal(artifact.quantity,expected.quantity);assert.equal(artifact.unit_price,expected.unitPrice);assert.equal(artifact.unit_id,expected.unitId);
  assert.equal(artifact.included_in_estimate,false);assert.equal(artifact.included_in_procurement,false);assert.equal(artifact.amount,null,'REAL_COMMON_ARTIFACT_ADAPTER_NO_SECOND_AMOUNT');
   // PRELIM warnings can repeat this name before the table. Only actual saved
   // resource rows with the exact escaped name cell can prove monetary cells.
   const clientTableBody=pdf.html.match(/<table class="client"><thead>[\s\S]*?<\/thead><tbody>([\s\S]*?)<\/tbody><\/table>/u)?.[1];
   assert(clientTableBody,'CURRENT_SHARED_RESOURCE_TABLE_BODY');
   const expectedName='<td class="name"><strong>'+escapeCanonicalArtifactHtml(physical.titleRu)+'</strong>',
    pdfRows=[...clientTableBody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gu)].map(([,body])=>body!)
     .filter(row=>row.includes(expectedName));
   assert(pdfRows.length>0,'INCLUDED_MANUAL_PHYSICAL_ROW_VISIBLE_IN_PDF');
  for(const row of pdfRows){const cells=[...row.matchAll(/<td\b[^>]*\bclass="money"[^>]*>([\s\S]*?)<\/td>/gu)];assert.equal(cells.length,2);assert.equal(cells[1]![1]!.trim(),'','INCLUDED_PDF_AMOUNT_BLANK');}
  return{rowId:expected.rowId,quantity:need.quantity,unitPrice:need.unitPrice,unitId:need.unitId,includedInEstimate:artifact.included_in_estimate,amount:artifact.amount};
 });
 assert.equal(JSON.stringify({definition:input.definition,result:input.result,submittedParameters:input.submittedParameters,rowOverrides:input.rowOverrides}),originalInput,'SUBJECT_PROJECTION_DOES_NOT_MUTATE_ORIGINAL_INPUT');
 return{status:'PASS_ACTUAL_WRITER_ADAPTER_VIEWMODEL_PDF_AREA',issuancePurpose,standardRefusalCode,originalAudit,
  primaryParameterId:input.primaryParameterId,area:input.expectedArea,unitId:'m2',
  identityTitle:identity.displayTitleRu,adapterTitle:payload.workTitle,viewModelTitle:visible.title,pdfRenderer:CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
  compileHash:'SHA256(canonicalEstimateStableJson)',writerHash:'SHA256(UTF8)',
  manualPhysicalRows,totalAmount:String(result.totals.amount),
  unresolvedPhysicalNeedsChecked:input.expectedPhysicalNeedRowIds?.length??0,fullTechnicalAcceptance:false};
}
