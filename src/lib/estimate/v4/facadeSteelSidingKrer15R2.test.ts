import {facadeSteelSidingDefinitionR59,facadeSteelSidingCurrentPackR59} from './facadeSteelSidingWholeR59';
import {canonicalPublicResourceDisplayPresentationV1,canonicalPublicResourceKindFromCategoryV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import assert from 'node:assert/strict';
import {auditCanonicalEstimateOperationResourcesV1,canonicalEstimateOperationReferences as operationReferences,canonicalEstimateResourceOperationSections as operationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import {readFileSync} from 'node:fs';
import pack from '../../../../data/estimate-benchmarks/source-packs/facade-steel-siding-historical-06501-r2.json';
import oracle from '../../../../data/estimate-benchmarks/fixtures/facade-steel-siding-independent-oracle-r2.json';
import provision from '../../../../data/estimate-benchmarks/source-packs/facade-steel-siding-operation-provision-r2.json';
import {assertFacadeSteelSidingSourceR2,facadeSteelSidingDefinitionR2 as build,facadeSteelSidingPrimaryR2 as primary,facadeSteelSidingRowIdR2 as rid,facadeSteelSidingScenarioFactsR2 as control,compileFacadeSteelSidingR2 as compileSource,facadeSteelSidingNeedsR2 as needs,facadeSteelSidingNeedParametersR2 as needParameters,facadeSteelSidingCompletenessR2 as complete} from './facadeSteelSidingKrer15R2';
import {facadeSteelSidingMasterConfigR2 as config,assertFacadeSteelMachineAdmissionsR2} from '../../../../scripts/estimate/r4a13/prepareFacadeSteelSidingKrer15R2';
import {facadeFamilyReadyRecipesR2,facadeFamilyHeldRecipesR3} from '../../../../scripts/estimate/r4a13/facadeFamilyReadyRecipesR2';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {assertCanonicalMachineHourDefinitionV1,canonicalMachineHourPriceRequirementV1} from '../backendPlatform/canonicalMachineHourPriceCoverageV1';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../backendPlatform/canonicalProfessionalPdf';
import {escapeCanonicalArtifactHtml,canonicalArtifactVisibleRowTitle,canonicalArtifactPreliminaryNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';
import {canonicalProfessionalPdfReviewAcknowledgmentV1} from '../backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
const row=(result:any,key:string)=>{const r=result.rows.find((r:any)=>r.row_id===rid(key));assert(r,'ACTUAL_ROW_REQUIRED:'+key);return r;};
const semantic=(r:any)=>({rows:r.rows.map((r:any)=>[r.row_id,r.quantity,r.unit_price,r.amount,r.included_in_estimate,r.included_in_procurement]),needs:r.preliminaryNeeds,totals:r.totals});
// Existing independent fixtures use confirmed source readback; unknown keys
// remain raw, so addon and unknown-parameter rejection retain their meaning.
const compile=async(fixture:Record<string,unknown>,options:Parameters<typeof compileSource>[1]={})=>{
 const known=new Set((options.model??build()).parameters.map(q=>q.parameter_id));
 const submitted=Object.fromEntries(Object.entries(fixture).filter(([id])=>id===primary||!known.has(id)));
 const confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>id!==primary&&known.has(id)));
 return compileSource(submitted,{...options,confirmedParameters});
};
describe('Historical steel siding065-01 — existing pipeline candidate, author UNRUN',()=>{
 test('publication registry retains five exact technologies and two owner HOLDs without FULL',()=>{
  assert.deepEqual(facadeFamilyReadyRecipesR2.map(x=>x.technologyKey),['insulated_thin_render_whole_profiles','face_brick_cladding','natural_stone_mortar_cladding','ceramic_tile_mortar_cladding','improved_cement_lime_render']);
  assert.equal(new Set(facadeFamilyReadyRecipesR2.map(x=>x.catalogId)).size,5);
  assert.equal(new Set(facadeFamilyReadyRecipesR2.map(x=>x.materialKind)).size,5);
  assert.deepEqual(facadeFamilyHeldRecipesR3.map(x=>x.technologyKey),['insulated_steel_siding_historical','insulated_ventilated_porcelain']);
  assert(facadeFamilyHeldRecipesR3.every(x=>x.route==='HOLD'&&x.existingPublicOwner==='canonical-work:expanded:ventilated_facade'));
  assert(facadeFamilyReadyRecipesR2.every(x=>x.physicalFull===false));
 });
 test('literal16-row whole source, sixP, units and corrected book09 codes',()=>{assertFacadeSteelSidingSourceR2();assert.equal(pack.rows.length,16);assert.equal(pack.rows.filter(r=>r.literalRate==='П').length,6);assert.equal(pack.rows.find(r=>r.key==='steel-siding')?.unitId,'m');assert.equal(pack.rows.find(r=>r.key==='levelling-bracket')?.resourceCode,'09-0320-0020');assert.equal(pack.rows.find(r=>r.key==='cover-strip')?.resourceCode,'09-0111-0020');assert.equal(pack.rows.find(r=>r.key==='starter-strip')?.resourceCode,'09-0320-0040');assert.equal(pack.rows.find(r=>r.key==='corner-strip')?.resourceCode,'09-0320-0080');assert.equal(pack.printedOperatorNormAbsent,true);});
 for(const s of pack.rows)test('source drift rejected: '+s.key,()=>{const changed=structuredClone(pack);changed.rows.find(r=>r.key===s.key)!.resourceCode='TEST_OTHER_CODE';assert.throws(()=>assertFacadeSteelSidingSourceR2(changed));});
 for(const c of oracle.cases)test('independent literal arithmetic '+c.caseId,async()=>{const r=await compile(control({[primary]:c.areaM2}));for(const [key,q] of Object.entries(c.raw))assert.equal(cmp(row(r,key+(key==='labour'?'':'-consumed')).quantity,q),0);assert.equal(r.preliminaryNeeds.length,21);assert(r.rows.every(r=>r.unit_price===null));});
 test('P and structural supply stay absolute realBOM when area changes',async()=>{const a=await compile(control({[primary]:'12.5'})),b=await compile(control({[primary]:'200'}));for(const s of pack.rows.filter(r=>r.projectQuantityKey)){assert.equal(cmp(row(a,s.key).quantity,row(b,s.key).quantity),0);assert.equal(cmp(row(a,s.key).quantity,String((control() as Record<string,unknown>)[s.projectQuantityKey!])),0);}assert.equal(cmp(row(a,'levelling-bracket-consumed').quantity,'50.3725'),0);assert.equal(cmp(row(b,'levelling-bracket-consumed').quantity,'805.96'),0);assert.equal(row(a,'levelling-bracket').quantity,'450');});
 test('fractional source piece consumption rounds only once at the single supply owner',async()=>{const r=await compile(control({[primary]:'12.5'}));assert.equal(cmp(row(r,'screw-consumed').quantity,'114.125'),0);assert.equal(cmp(row(r,'screw').quantity,'115'),0);assert.equal(row(r,'screw-consumed').included_in_procurement,false);assert.equal(row(r,'screw').included_in_procurement,true);});
 test('missingP is visible, cannot become zero nor inherit area',async()=>{const input=control() as Record<string,unknown>;delete input.project_steel_siding;const r=await compile(input);assert(!r.rows.some(x=>x.row_id===rid('steel-siding')&&cmp(x.quantity,'0')===0));assert(r.preliminaryNeeds.some(n=>n.row_id===rid('steel-siding')));});
 for(const [label,values] of [['modernKKKPG',{source_system_conformance:'СОВРЕМЕННАЯ_КК_КПГ'}],['foreignbasis',{kg_project_basis:'RU_GESN'}],['wrongconditions',{source_conditions:'MW120_30M'}],['negativearea',{[primary]:'-1'}],['fractionalprojectbracket',{project_levelling_bracket:'1.5'}],['negativeP',{project_steel_siding:'-1'}],['borrowedwater',{mixing_water_l:'20'}]] as const)test(label+' refuses incompatible input',()=>assert.rejects(()=>compile(control(values)),{code:'PARAMETER_VALIDATION_FAILED'}));
 for(const id of needParameters)test('internal norm cannot be supplied0/1/77: '+id,async()=>{for(const value of ['0','1','77'])await assert.rejects(()=>compile(control({[id]:value})),{code:'PARAMETER_VALIDATION_FAILED'});});
 test('independent14 operations×14categories retain whole labour and all21 unknowns',()=>{const d=build(),map=complete();assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);assert.equal(provision.operations.length,14);assert.equal(provision.categoryKeys.length,14);for(const op of provision.operations){assert.deepEqual(op.allCategories,provision.categoryKeys);for(const id of [...op.independentToolNeeds,...op.independentGeneralNeeds])assert(d.resources.some(r=>r.row_id===id));}for(const n of needs){const r=d.resources.find(r=>r.row_id===n.needId)!;assert(r);assert.equal(r.source_metadata?.sourceRole,'UNRESOLVED_APPLICATION_NORM');}const operationRows=d.resources.filter(r=>r.row_id.includes(':operation:'));assert.equal(operationRows.length,8);assert(operationRows.every(r=>r.resource_graph.includedInResourceOwnerRowId===rid('labour')));assert.equal(d.resources.filter(r=>r.row_id===rid('labour')).length,1);assert(!d.resources.some(r=>r.unit_id==='man_hour'&&r.row_id!==rid('labour')));});
 test('eight exact paid machine admissions, no rawINFO or foreign-catalog admission',()=>{assertFacadeSteelMachineAdmissionsR2();const d=build();let owners=0;for(const m of pack.rows.filter(r=>r.category==='equipment')){assert.equal(canonicalMachineHourPriceRequirementV1(rid(m.key+'-consumed'),'machine_hour'),null);for(const mode of ['own','hired']){const id=rid(m.key+'-'+mode),r=d.resources.find(x=>x.row_id===id)!,request={catalogId:pack.catalogId,rowId:id,unitId:r.unit_id,sourceMetadata:r.source_metadata};assert(assertCanonicalMachineHourDefinitionV1(request));assert.equal(assertCanonicalMachineHourDefinitionV1({...request,catalogId:'TEST_OTHER_CATALOG'}),null);for(const changed of [{source_artifact_sha256:'0'.repeat(64)},{exact_column:'15-01-080-03'},{normativeResourceCode:'OTHER'}])assert.throws(()=>assertCanonicalMachineHourDefinitionV1({...request,sourceMetadata:{...r.source_metadata,...changed}}),{code:'DEFINITION_INTEGRITY_FAILED'});owners++;}}assert.equal(owners,8);});
 for(const m of pack.rows.filter(r=>r.category==='equipment'))test('exclusive complete own machine operation: '+m.key,async()=>{const r=await compile(control({['machine_fulfillment_'+m.key.replaceAll('-','_')]:pack.machineFulfillmentChoices.own}));assert(r.rows.some(x=>x.row_id===rid(m.key+'-own')));assert(!r.rows.some(x=>x.row_id===rid(m.key+'-hired')));assert.equal(cmp(row(r,m.key+'-own').quantity,row(r,m.key+'-consumed').quantity),0);assert.equal(row(r,m.key+'-consumed').included_in_estimate,false);});
 test('declaration-order changes cannot change composition',async()=>{const d=build(),mutant={...d,parameters:[...d.parameters].reverse(),formulas:[...d.formulas].reverse()};assert.deepEqual(semantic(await compile(control(),{model:mutant})),semantic(await compile(control())));});
 test('INFO referenceprice200 remains numeric in a strict canonical snapshot review while STANDARD stays refused',async()=>{
  const id=rid('levelling-bracket-consumed'),parameters=control();
  const rowOverrides={[id]:{unitPrice:'200',includedInEstimate:true,provenance:{kind:'manual' as const,reason:'TEST_ONLY raw reference price'}}};
  const snapshotHash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
  const preview=await compile(parameters,{rowOverrides});
  assert(preview.rows.every(row=>/^eh_[0-9a-f]{16}$/u.test(row.row_sha256)));
  assert(preview.preliminaryNeeds.every(need=>/^eh_[0-9a-f]{16}$/u.test(need.need_sha256)));
  const r=await compile(parameters,{rowOverrides,hashJson:snapshotHash}),raw=row(r,'levelling-bracket-consumed');
  assert(r.rows.every(row=>/^[0-9a-f]{64}$/u.test(row.row_sha256)));
  assert(r.preliminaryNeeds.every(need=>/^[0-9a-f]{64}$/u.test(need.need_sha256)));
  const physical=(result:typeof r)=>({rows:result.rows.map(row=>[row.row_id,row.quantity,row.unit_id,row.unit_price,row.amount,row.included_in_estimate,row.included_in_procurement]),needs:result.preliminaryNeeds.map(need=>[need.row_id,need.quantity,need.unit_id,need.need_state,need.missing_parameter_ids]),totals:result.totals});
  assert.deepEqual(physical(r),physical(preview));
  assert.equal(cmp(raw.unit_price,'200'),0);assert.equal(raw.included_in_estimate,false);assert.equal(raw.included_in_procurement,false);
  const before=JSON.stringify(r),revision={id:'TEST_ONLY_UNSAVED_CORE',release_id:'TEST_ONLY_NOT_SAVED',
   definition_version_id:'TEST_ONLY_SOURCE_FRAGMENT_NOT_PUBLISHED',catalog_id:pack.catalogId,
   checksum_sha256:snapshotHash({contract:'TEST_ONLY_UNSAVED_SOURCE_FRAGMENT_SNAPSHOT/r1',parameters:r.parameters,rows:r.rows,preliminaryNeeds:r.preliminaryNeeds}),
   row_count:r.rows.length,currency_code:'KGS',input_parameters:r.parameters,
   amendment_contract:{parameterSources:{preliminaryNeeds:r.preliminaryNeeds}}};
  const reportNeeds=canonicalArtifactPreliminaryNeeds(revision,{issuancePurpose:'PRELIMINARY_REVIEW'}),resources=[...r.rows,...reportNeeds];
  const reportInput={revision,rows:r.rows,preliminaryNeeds:reportNeeds,workTitleRu:pack.titleRu,issuancePurpose:'PRELIMINARY_REVIEW' as const};
  assert.throws(()=>buildCanonicalProfessionalPdfProjection({...reportInput,issuancePurpose:'STANDARD'}),{code:'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED'});
  assert.throws(()=>buildCanonicalProfessionalPdfProjection(reportInput),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
  const reviewAcknowledgmentV1=canonicalProfessionalPdfReviewAcknowledgmentV1({revision,resources,
   request:{acknowledgedPreliminaryReview:true,revisionId:revision.id,releaseId:revision.release_id,definitionVersionId:revision.definition_version_id,checksumSha256:revision.checksum_sha256},
   actorUserId:'TEST_ONLY_SOURCE_FRAGMENT_UNIT_ACTOR',acknowledgedAt:'2026-10-30T00:00:00.000Z'});
  assert.throws(()=>buildCanonicalProfessionalPdfProjection({...reportInput,reviewAcknowledgmentV1:{...reviewAcknowledgmentV1,checksumSha256:'0'.repeat(64)}}),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
  const pdf=buildCanonicalProfessionalPdfProjection({...reportInput,reviewAcknowledgmentV1});
  assertCanonicalProfessionalPdfMoneyCells(pdf.html);for(const n of needs)assert(pdf.html.includes(escapeCanonicalArtifactHtml(n.titleRu)));assert(pdf.html.includes('Не рассчитано'));
  const title=escapeCanonicalArtifactHtml(canonicalArtifactVisibleRowTitle(raw,parameters)),trs=[...pdf.html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(x=>x[0]).filter(t=>t.includes('<strong>'+title));
  assert(trs.length>0);for(const tr of trs){const money=[...tr.matchAll(/<td class="money">([\s\S]*?)<\/td>/g)].map(x=>x[1]);assert.equal(money.length,2);assert(money[0]);assert.equal(money[1],'');}
  assert.equal(JSON.stringify(r),before);
 });
 test('zero front has no paid/procurement composition or physical needs',async()=>{const r=await compile({[primary]:'0'});assert.equal(r.preliminaryNeeds.length,0);assert(!r.rows.some(x=>x.included_in_estimate||x.included_in_procurement));});
 test('factory binds immutableROOTpreimage and existing append publisher, requires current admission',async()=>{const cfg=config({releaseId:'TEST_ONLY_CURRENT_ROOT_RELEASE',searchReleaseId:'TEST_ONLY_CURRENT_ROOT_SEARCH',sourceRoot:process.env.GOX_FACADE_TEST_SOURCE_ROOT});assert.deepEqual(cfg.expectedParentShape,[0,0,0]);assert.equal(cfg.catalogAppend?.identity.workKey,pack.workKey);assert.equal(cfg.catalogAppend?.requireUniqueWorkKey,true);assert.equal(cfg.applicability.newFullTechnologies,0);assert.equal(cfg.binding.retainParentBindings,undefined);const r=await cfg.verifyCore();assert.equal(r.newFull,0);assert.equal(r.unresolvedInternalNeeds,21);assert.equal(r.ordinaryLockedDbPreflight,'REQUIRED_BY_STANDARD_PUBLISHER');});
 test('no second compiler, writer, sourceprice or modernframe fallback exists',()=>{const d=build();assert.equal(d.runtimeInput[primary],undefined);for(const q of d.parameters)assert.equal(q.default_value,null);assert(d.resources.every(r=>r.source_metadata?.full_technical_acceptance===false));assert.equal(pack.componentBridgeToModernSystemAccepted,false);assert.equal(pack.sourcePricesImported,false);const runner=readFileSync('scripts/estimate/r4a13/runFacadeSteelSidingReadyCheckR2.ts','utf8');assert(runner.includes('runMasterSingleDefinitionSuccessorR1'));assert(!/fetch\(|new Client|\.query\(/.test(runner));});
 test('existing whole steel method exposes only its measured area',()=>{
  const d=build();assert.deepEqual(d.parameters.filter(q=>q.truth_metadata.visibility_role==='USER_INPUT').map(q=>q.parameter_id),[primary]);
  for(const q of d.parameters.filter(q=>q.parameter_id!==primary&&q.truth_metadata.value_source_role!=='COMPILER_DERIVED_RESOURCE_QUANTITY')){
   const provenance=q.truth_metadata.provenance;assert(provenance&&typeof provenance==='object'&&!Array.isArray(provenance));
   assert.equal(q.truth_metadata.visibility_role,'INTERNAL_ONLY');assert.equal((provenance as Record<string,unknown>).consumer_input_role_v1,'APPLICATION_TECHNICAL');
  }
 });
 test('raw source, project P and machine ownership echoes cannot enter either wrapper or core',async()=>{
  const d=build(),fixture:Record<string,unknown>=control(),confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>id!==primary));
  const machine=pack.rows.find(r=>r.category==='equipment')!;
  for(const id of ['source_system_conformance','approved_facade_project_reference','project_steel_siding','machine_fulfillment_'+machine.key.replaceAll('-','_')])for(const value of [fixture[id],null,undefined]){
   const submittedParameters={[primary]:'100',[id]:value};
   await assert.rejects(()=>compileSource(submittedParameters,{confirmedParameters}),{code:'PARAMETER_VALIDATION_FAILED'});
   await assert.rejects(()=>compileCanonicalEstimateCore({operation:'compile',compilerVersion:'TEST_ONLY_EXISTING_STEEL_TRUSTED_BOUNDARY_R5',catalogId:pack.catalogId,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,confirmedParameters,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:hash}),{code:'PARAMETER_VALIDATION_FAILED'});
  }
 });
 test('existing publisher profile carries only exact selected method, never the project fixture',()=>{
  const c=config({releaseId:'TEST_ONLY',searchReleaseId:'TEST_ONLY'}),expected={source_system_conformance:pack.sourceFitValue};
  assert.deepEqual(c.runtimeProfileInput,expected);assert.deepEqual(c.runtimeProfileClassification,{source_system_conformance:'NORMATIVE'});
  assert.deepEqual(c.runtimeProfileSourceIds,{source_system_conformance:[pack.sourceId]});
  const input_classification=Object.fromEntries(build().parameters.map(q=>[q.parameter_id,c.runtimeProfileClassification?.[q.parameter_id]??'VALIDATION_FIXTURE']));
  assert.deepEqual(canonicalApprovedBaselineRuntimeParameters({input_values:c.acceptanceInput,input_classification}),expected);
  for(const id of ['kg_project_basis','source_conditions','approved_facade_project_reference','project_steel_siding'])assert(!Object.hasOwn(c.runtimeProfileInput??{},id));
 });
 test('selected method alone preserves all21 needs without inventing P quantities or paid owners',async()=>{
  const r=await compileSource({[primary]:'100'},{confirmedParameters:{source_system_conformance:pack.sourceFitValue}});
  for(const n of needs)assert(r.preliminaryNeeds.some(x=>x.row_id===n.needId&&x.quantity===null));
  assert(!r.rows.some(x=>x.included_in_estimate||x.included_in_procurement));assert(build().parameters.every(q=>q.default_value===null));
 });

});

test('existing shared resources survive the real common operation consumer with one owner',()=>{
  const d=build();
  const related=d.resources.filter(resource=>{
   const raw=resource.resource_graph.operationCompositionV1;
   return raw!==null&&typeof raw==='object'&&!Array.isArray(raw)
    &&Array.isArray((raw as Record<string,unknown>).additionalOperations)
    &&((raw as Record<string,unknown>).additionalOperations as unknown[]).length>0;
  });
  assert(related.length>0,'ACTUAL_WHOLE_METHOD_MUST_HAVE_SHARED_RESOURCES');
  const sections=operationSections(d.resources.map(resource=>({rowId:resource.row_id,titleRu:resource.title_ru,operation:resource.resource_graph.operationCompositionV1})));
  for(const resource of related){
   const raw=resource.resource_graph.operationCompositionV1;assert(raw&&typeof raw==='object'&&!Array.isArray(raw));
   const declared=(raw as Record<string,unknown>).additionalOperations;assert(Array.isArray(declared));
   const refs=operationReferences(raw);assert.equal(refs.length,declared.length+1,'COMMON_CONSUMER_MUST_KEEP_EVERY_DECLARED_USE:'+resource.row_id);
   assert.equal(sections.filter(section=>section.resourceIds.includes(resource.row_id)).length,1,'ONE_RESOURCE_OWNER:'+resource.row_id);
   assert.equal(sections.reduce((count,section)=>count+section.sharedResources.filter(shared=>shared.rowId===resource.row_id).length,0),declared.length,'SAME_ID_IN_EVERY_ADDITIONAL_OPERATION:'+resource.row_id);
   for(const reference of refs){
    const section=sections.find(section=>section.operation?.operationId===reference.operationId&&section.operation.groupId===reference.groupId);assert(section);
    assert(section.resourceIds.includes(resource.row_id)||section.sharedResources.some(shared=>shared.rowId===resource.row_id));
   }
  }
});

test('current steel keeps raw source titles and one operation owner across consumed paid and needed rows',()=>{
 const original=build(),current=facadeSteelSidingDefinitionR59();
 const sourceRows=new Map(original.resources.map(resource=>[resource.row_id,resource]));
 const names:Readonly<Record<string,string>>=facadeSteelSidingCurrentPackR59.publicResourceNames;
 assert.deepEqual(current.parameters,original.parameters);assert.deepEqual(current.formulas,original.formulas);
 assert.deepEqual(current.resources.map(resource=>resource.row_id),original.resources.map(resource=>resource.row_id));
 const resources=current.resources.map(resource=>{
  assert.equal(resource.title_ru,sourceRows.get(resource.row_id)!.title_ru,'RAW_SOURCE_TITLE_NOT_REWRITTEN');
  const graph=resource.resource_graph??{};
  const presentation=canonicalPublicResourceDisplayPresentationV1({rowId:resource.row_id,titleRu:resource.title_ru,
   descriptor:graph.publicResourcePresentationV1,manualTitleOverride:false});
  assert(presentation,'REAL_COMMON_PRESENTATION_MUST_VERIFY_SOURCE_TITLE:'+resource.row_id);
  const name=names[resource.row_id.slice(facadeSteelSidingCurrentPackR59.prefix.length+1)];
  if(name!==undefined)assert.equal(presentation.nameRu,name);
  return{rowId:resource.row_id,nameRu:presentation.nameRu,sourceNameRu:resource.title_ru,
   unitId:typeof resource.unit_id==='string'?resource.unit_id:null,
   resourceKind:canonicalPublicResourceKindFromCategoryV1(resource.category),publicNameVerified:true,
   operation:graph.operationCompositionV1,quantityKnown:false};
 });
 const audit=auditCanonicalEstimateOperationResourcesV1({resources});
 assert.deepEqual(audit.issues.filter(issue=>issue.code==='OPERATION_METADATA_CONFLICT'),[]);
 assert.equal(audit.issues.filter(issue=>issue.code==='RESOURCE_UNIT_UNRESOLVED').length,7);
 assert.equal(audit.pdfAllowed,false);assert.equal(audit.definitionAdmissionAllowed,false);assert.equal(audit.completeClaimAllowed,false);
});
