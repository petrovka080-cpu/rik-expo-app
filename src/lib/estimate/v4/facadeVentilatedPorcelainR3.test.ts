import {facadePorcelainDefinitionR59,facadePorcelainCurrentPackR59} from './facadePorcelainWholeR59';
import porcelainPdfSourcePack from '../../../../data/estimate-benchmarks/source-packs/facade-current-family-whole-systems-r3.json';
import {canonicalPublicResourceDisplayPresentationV1,canonicalPublicResourcePresentationV1,canonicalPublicResourceKindFromCategoryV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import assert from 'node:assert/strict';
import {auditCanonicalEstimateOperationResourcesV1,canonicalEstimateOperationReferences as operationReferences,canonicalEstimateResourceOperationSections as operationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import {facadeVentilatedPorcelainPackR3 as p,facadeVentilatedPorcelainDefinitionR3 as build,compileFacadeVentilatedPorcelainR3 as compileSource,facadeVentilatedPorcelainGeometryR5 as geometryIds,facadeVentilatedPorcelainPrimaryR3 as primary,facadeVentilatedPorcelainControlR3 as control,facadeVentilatedPorcelainRowIdR3 as rid,facadeVentilatedPorcelainNeedsR3 as needs,facadeVentilatedPorcelainCompletenessR3 as complete} from './facadeVentilatedPorcelainR3';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../backendPlatform/canonicalProfessionalPdf';
import {escapeCanonicalArtifactHtml,canonicalArtifactVisibleRowTitle,canonicalArtifactPreliminaryNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';
import {facadeVentilatedPorcelainMasterConfigR3 as configOf} from '../../../../scripts/estimate/r4a13/prepareFacadeVentilatedPorcelainR3';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalProfessionalPdfReportOriginalAuditV1,canonicalProfessionalPdfReviewEligibilityV1,canonicalProfessionalPdfReviewAcknowledgmentV1} from '../backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
// Exact existing source fixture goes through the trusted channel; unknown
// supplied keys deliberately stay raw so rejection tests cannot become no-ops.
const compile=async(fixture:Record<string,unknown>,options:Parameters<typeof compileSource>[1]={})=>{
 const known=new Set(build().parameters.map(q=>q.parameter_id));
 const submitted=Object.fromEntries(Object.entries(fixture).filter(([id])=>geometryIds.some(geometry=>geometry===id)||!known.has(id)));
 const confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>known.has(id)&&!geometryIds.some(geometry=>geometry===id)));
 return compileSource(submitted,{...options,confirmedParameters});
};
const row=(r:any,k:string)=>{const x=r.rows.find((x:any)=>x.row_id===rid(k));assert(x,'ACTUAL_ROW:'+k);return x;};
describe('whole ventilated porcelain façade R3 — author product checks UNRUN',()=>{
 test('source operation map is independent and references exact actual rows/formulas/operations',()=>{const d=build();assert.equal(complete().generatedFromCurrentRows,false);assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:complete(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);});
 test('five actual source labour operations; readyplatformmethodaddsnoinventoryscaffoldnorm',async()=>{const r=await compile(control()),expected={layout:'1.5',brackets:'6.4',guides:'13',cladding:'84',insulation:'30'};for(const[k,q]of Object.entries(expected))assert.equal(cmp(row(r,'labor:'+k).quantity,q),0);assert(!r.rows.some(x=>x.row_id===rid('labor:scaffold')));assert.equal(r.rows.filter(x=>x.row_id.startsWith(rid('labor:'))).length,5);});
 test('same real BOQ is not scaled by changed area',async()=>{const a=await compile(control()),b=await compile(control({porcelain_facade_area_m2:'50'}));for(const c of p.projectComponents)assert.equal(cmp(row(a,'supply:'+c.key).quantity,row(b,'supply:'+c.key).quantity),0);assert.equal(cmp(row(a,'supply:stone-wool').quantity,'11'),0);assert.equal(cmp(row(b,'supply:stone-wool').quantity,'5.5'),0);assert.equal(cmp(row(b,'labor:brackets').quantity,'6.4'),0);});
 test('16 applicable literal stocktypes; metal scissors are excluded from porcelain cutting',async()=>{const r=await compile(control());assert.equal(p.physicalProvision.filter((e:any)=>e.selectedForPorcelain).length,16);for(const e of p.physicalProvision.filter((e:any)=>e.selectedForPorcelain))assert.equal(cmp(row(r,'stock:'+e.key).quantity,e.quantity),0);assert(!r.rows.some(x=>x.row_id.includes('metal-shears')));assert.equal(row(r,'stock:drill-and-driver-attachments').unit_id,'set');});
 test('published stockfront remains unsized; one/two source links change only stock factor',async()=>{const a=await compile(control()),b=await compile(control({porcelain_published_stock_links:'2'}));assert.equal(cmp(row(b,'stock:helmet').quantity,'4'),0);assert.equal(cmp(row(a,'labor:insulation').quantity,row(b,'labor:insulation').quantity),0);assert.equal(build().resources.find(x=>x.row_id===rid('stock:helmet'))!.source_metadata?.sourceCrewSizeUnknown,true);assert.equal(a.preliminaryNeeds.length,5);});
 for(const[mode,suffix,bought]of[['Собственное обеспечение на период ППР','own',false],['Услуга обеспечения на период ППР','hired',true],['Новая поставка для рабочего фронта','buy',true]]as const)test('one publishedstock owner in explicitmode '+suffix,async()=>{const r=await compile(control({porcelain_tools_mode:mode}));for(const e of p.physicalProvision.filter((e:any)=>e.selectedForPorcelain)){const x=r.rows.filter(x=>x.row_id.startsWith(rid('tool:'+e.key+':')));assert.equal(x.length,1);assert.equal(x[0]!.row_id,rid('tool:'+e.key+':'+suffix));assert.equal(x[0]!.included_in_procurement,bought);}});
 for(const[label,patch]of[['wrongSystem',{porcelain_exact_whole_method:'СТ-Ф-П-ГПВ'}],['wrongThickness',{porcelain_panel_thickness_mm:'8'}],['wrongInsulationThickness',{porcelain_insulation_thickness_mm:'120'}],['overHeight',{porcelain_work_top_height_m:'50.001'}],['platform150isNotScope',{porcelain_work_top_height_m:'150'}],['layoutInsufficient',{porcelain_approved_layout_surface_m2:'99'}],['weakBase',{porcelain_base_density_kg_m3:'599'}],['fractionalAnchor',{porcelain_bom_base_anchor:'200.5'}],['zeroSourceLinks',{porcelain_published_stock_links:'0'}],['fractionalSourceLinks',{porcelain_published_stock_links:'1.5'}],['hiddenClampAddon',{porcelain_hidden_clamp_quantity:'100'}],['fiberPanelAddon',{porcelain_fiber_cement_panel_quantity:'100'}],['unknownNormAddon',{porcelain_preparatory_norm_man_hour_m2:'0.1'}]]as const)test(label+' rejects exactly without fallback',()=>assert.rejects(()=>compile(control(patch)),{code:'PARAMETER_VALIDATION_FAILED'}));
 for(const n of needs())test('unclosedapplicationneedcannotbeenteredbyuser: '+n.key,async()=>{for(const q of['0','1','77'])await assert.rejects(()=>compile(control({[n.parameterId]:q})),{code:'PARAMETER_VALIDATION_FAILED'});});
 test('five honest needs and null prices survive exact saved PRELIMINARY PDF while STANDARD stays blocked',async()=>{
  // Saved-report fixture: the actual source factory and Core use canonical SHA
  // before compilation. The production wrapper keeps its preview EH transport.
  const d=build(),params=control(),
   submittedParameters=Object.fromEntries(Object.entries(params).filter(([id])=>geometryIds.some(geometry=>geometry===id))),
   confirmedParameters=Object.fromEntries(Object.entries(params).filter(([id])=>!geometryIds.some(geometry=>geometry===id))),
   inputsBefore=canonicalEstimateStableJson({d,params,submittedParameters,confirmedParameters}),
   r=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:porcelainPdfSourcePack.contract,catalogId:p.catalogId,
    primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters,confirmedParameters,rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,
    hashJson:value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))}),
   before=canonicalEstimateStableJson(r),revision={id:'TEST_ONLY_PORCELAIN_SAVED_REPORT_R3',release_id:'TEST_ONLY_PORCELAIN_R3_RELEASE',
    definition_version_id:'TEST_ONLY_PORCELAIN_R3_DEFINITION',catalog_id:p.catalogId,
    checksum_sha256:canonicalEstimateSha256HexText(canonicalEstimateStableJson(r.revisionProjection)),row_count:r.rows.length,
    currency_code:'KGS',input_parameters:r.parameters,amendment_contract:{rowOverrides:{},parameterSources:{preliminaryNeeds:r.preliminaryNeeds}}},
   preliminaryNeeds=canonicalArtifactPreliminaryNeeds(revision,{issuancePurpose:'PRELIMINARY_REVIEW'}),
   snapshot={revision,resources:[...r.rows,...preliminaryNeeds]},snapshotBefore=canonicalEstimateStableJson(snapshot),
   originalAudit=canonicalProfessionalPdfReportOriginalAuditV1(snapshot),
   projectionInput={revision,rows:r.rows,preliminaryNeeds,workTitleRu:'Навесной фасад с керамогранитной облицовкой'},
   unknownIds=needs().map((need:{needId:string})=>need.needId);
  assert.equal(r.preliminaryNeeds.length,5);assert.deepEqual(r.preliminaryNeeds.map(need=>need.row_id),unknownIds);
  for(const need of r.preliminaryNeeds){assert.equal(need.quantity,null);assert.equal(need.unit_price,null);assert.equal(need.selected,false);assert.equal(need.procurement_eligible,false);}
  assert.equal(originalAudit.status,'COMPOSITION_UNVERIFIED');
  assert.equal(originalAudit.pdfAllowed,false);assert.equal(originalAudit.definitionAdmissionAllowed,false);assert.equal(originalAudit.completeClaimAllowed,false);
  assert.deepEqual(originalAudit.issues.filter(issue=>issue.code==='RESOURCE_UNIT_UNRESOLVED').map(issue=>issue.rowId),unknownIds);
  assert.equal(originalAudit.issues.filter(issue=>issue.code==='PUBLIC_RESOURCE_NAME_UNVERIFIED').length,65);
  assert.equal(originalAudit.issues.filter(issue=>issue.code==='INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED').length,1);
  assert.equal(originalAudit.issues.filter(issue=>issue.code==='RESOURCE_QUANTITY_UNRESOLVED').length,1);
  assert.throws(()=>buildCanonicalProfessionalPdfProjection(projectionInput),{code:'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED',httpStatus:409});
  assert.throws(()=>buildCanonicalProfessionalPdfProjection({...projectionInput,issuancePurpose:'STANDARD'}),{code:'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED',httpStatus:409});
  const eligibility=canonicalProfessionalPdfReviewEligibilityV1(snapshot);assert.equal(eligibility.eligible,true);assert.equal(eligibility.status,'ELIGIBLE');
  assert.equal(eligibility.unknownQuantityCount,5);
  const request={revisionId:revision.id,releaseId:revision.release_id,definitionVersionId:revision.definition_version_id,
    checksumSha256:revision.checksum_sha256,acknowledgedPreliminaryReview:true},
   reader={actorUserId:'TEST_ONLY_PORCELAIN_SAVED_REPORT_READER',acknowledgedAt:'2026-10-30T00:00:00.000Z'},
   ack=canonicalProfessionalPdfReviewAcknowledgmentV1({...snapshot,request,...reader}),
   reviewInput={...projectionInput,issuancePurpose:'PRELIMINARY_REVIEW' as const},
   differentDigest=(value:string)=>(value[0]==='0'?'1':'0')+value.slice(1);
  assert.equal(ack.actorUserId,reader.actorUserId);assert.equal(ack.revisionId,revision.id);assert.equal(ack.checksumSha256,revision.checksum_sha256);
  assert.equal(ack.auditSha256,eligibility.auditSha256);assert.equal(ack.unknownQuantityCount,5);
  assert.throws(()=>canonicalProfessionalPdfReviewAcknowledgmentV1({...snapshot,request,...reader,actorUserId:''}),{code:'ARTIFACT_REVIEW_REQUEST_INVALID'});
  assert.throws(()=>canonicalProfessionalPdfReviewAcknowledgmentV1({...snapshot,request:{...request,revisionId:'WRONG_READ_REVISION'},...reader}),{code:'ARTIFACT_REVIEW_REQUEST_INVALID'});
  assert.throws(()=>buildCanonicalProfessionalPdfProjection(reviewInput),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
  for(const invalid of [{revisionId:'WRONG_SAVED_REVISION'},{releaseId:'WRONG_SAVED_RELEASE'},{definitionVersionId:'WRONG_SAVED_DEFINITION'},
   {checksumSha256:differentDigest(ack.checksumSha256)},{auditSha256:differentDigest(ack.auditSha256)}])
   assert.throws(()=>buildCanonicalProfessionalPdfProjection({...reviewInput,reviewAcknowledgmentV1:{...ack,...invalid}}),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
  const pdf=buildCanonicalProfessionalPdfProjection({...reviewInput,reviewAcknowledgmentV1:ack});
  assertCanonicalProfessionalPdfMoneyCells(pdf.html);
  for(const n of r.preliminaryNeeds)assert(pdf.html.includes(escapeCanonicalArtifactHtml(n.title_ru)));
  assert(pdf.html.includes('Не рассчитано'));assert(pdf.html.includes('saved-report-warnings'));assert(pdf.html.includes('Итог не подтверждён'));
  assert(pdf.html.includes('отчёт не разрешает оплату или закупку'));assert(!pdf.html.includes('class="approval-block"'));
  assert.notEqual(pdf.grandTotalStatus,'COMPLETE');assert(r.rows.every(x=>x.unit_price===null));
  assert.equal(canonicalEstimateStableJson(r),before);assert.equal(canonicalEstimateStableJson(snapshot),snapshotBefore);
  assert.deepEqual(canonicalProfessionalPdfReportOriginalAuditV1(snapshot),originalAudit);
  assert.equal(canonicalEstimateStableJson({d,params,submittedParameters,confirmedParameters}),inputsBefore);
 });
 test('INFO price200 remains raw numeric but no second payable/procurement owner',async()=>{const id=rid('stock:facade-platform'),r=await compile(control(),{rowOverrides:{[id]:{unitPrice:'200',includedInEstimate:true,provenance:{kind:'manual',reason:'TEST_ONLY raw reference price'}}}}),x=row(r,'stock:facade-platform');assert.equal(cmp(x.unit_price,'200'),0);assert.equal(cmp(x.amount,'200'),0);assert.equal(x.included_in_estimate,false);assert.equal(x.included_in_procurement,false);});
 test('zero-area front stays empty and no syntheticBOMbecomesmodeldefault',async()=>{const d=build(),r=await compile({porcelain_facade_area_m2:'0'});assert(d.parameters.every(q=>q.default_value===null));assert.equal(r.preliminaryNeeds.length,0);assert(!r.rows.some(x=>x.included_in_estimate||x.included_in_procurement));});
 test('existing whole method exposes only area and measured height, without a technical questionnaire',()=>{
  const d=build();assert.deepEqual(d.parameters.filter(q=>q.truth_metadata.visibility_role==='USER_INPUT').map(q=>q.parameter_id),[...geometryIds]);assert.deepEqual(d.ordinaryParameterIds,[...geometryIds]);
  for(const q of d.parameters.filter(q=>!geometryIds.some(id=>id===q.parameter_id)&&q.truth_metadata.value_source_role!=='COMPILER_DERIVED_RESOURCE_QUANTITY')){
   const provenance=q.truth_metadata.provenance;assert(provenance&&typeof provenance==='object'&&!Array.isArray(provenance));
   assert.equal(q.truth_metadata.visibility_role,'INTERNAL_ONLY');assert.equal((provenance as Record<string,unknown>).consumer_input_role_v1,'APPLICATION_TECHNICAL');
  }
 });
 test('trusted channel does not permit a raw technical echo at the wrapper or direct core',async()=>{
  const d=build(),fixture=control(),confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>!geometryIds.some(geometry=>geometry===id)));
  for(const id of ['porcelain_approved_structural_project','porcelain_published_stock_links','porcelain_bom_bracket','porcelain_panel_thickness_mm'])for(const value of [fixture[id],null,undefined]){
   const submittedParameters={[primary]:'100',porcelain_work_top_height_m:'30',[id]:value};
   assert.throws(()=>compileSource(submittedParameters,{confirmedParameters}),{code:'PARAMETER_VALIDATION_FAILED'});
   await assert.rejects(()=>compileCanonicalEstimateCore({operation:'compile',compilerVersion:'TEST_ONLY_EXISTING_PORCELAIN_TRUSTED_BOUNDARY_R5',catalogId:p.catalogId,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,confirmedParameters,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:hash}),{code:'PARAMETER_VALIDATION_FAILED'});
  }
 });
 test('missing source readback keeps needs visible and cannot manufacture project BOM or link counts',async()=>{
  const result=await compileSource({[primary]:'100',porcelain_work_top_height_m:'30'});
  for(const need of needs())assert(result.preliminaryNeeds.some(n=>n.row_id===need.needId&&n.quantity===null));
  assert(build().parameters.every(q=>q.default_value===null));
  assert(!result.rows.some(r=>r.row_id===rid('supply:bracket')));
 });
 test('the synthetic whole-method control remains validation-only in an actual new estimate',()=>{
  const fixture=control();assert.deepEqual(canonicalApprovedBaselineRuntimeParameters({input_values:fixture,input_classification:Object.fromEntries(Object.keys(fixture).map(id=>[id,'VALIDATION_FIXTURE']))}),{});
  const scope=build().parameters.find(q=>q.parameter_id==='porcelain_KG_scope_acceptance')!;
  const provenance=scope.truth_metadata.provenance;assert(provenance&&typeof provenance==='object'&&!Array.isArray(provenance));
  assert.equal((provenance as Record<string,unknown>).international_source_scope_v1,true);
  assert.equal(scope.truth_metadata.visibility_role,'INTERNAL_ONLY');
 });

 test('existing publisher supplies exactly the selected three source facts, excluding every project fixture',async()=>{
  const c=configOf({releaseId:'TEST_ONLY',searchReleaseId:'TEST_ONLY'}),expected={
   porcelain_exact_whole_method:control().porcelain_exact_whole_method,
   porcelain_insulation_thickness_mm:'100',porcelain_panel_thickness_mm:'10'};
  assert.deepEqual(c.runtimeProfileInput,expected);
  assert.deepEqual(c.runtimeProfileClassification,Object.fromEntries(Object.keys(expected).map(id=>[id,'NORMATIVE'])));
  assert.deepEqual(c.runtimeProfileSourceIds,Object.fromEntries(Object.keys(expected).map(id=>[id,[p.sourceId]])));
  const input_classification=Object.fromEntries(c.parameterDefinitions.map(q=>{
   assert.equal(typeof q.parameter_id,'string');return [String(q.parameter_id),c.runtimeProfileClassification?.[String(q.parameter_id)]??'VALIDATION_FIXTURE'];
  }));
  assert.deepEqual(canonicalApprovedBaselineRuntimeParameters({input_values:c.acceptanceInput,input_classification}),expected);
  for(const id of ['porcelain_approved_structural_project','porcelain_ppr_reference','porcelain_published_stock_links','porcelain_bom_bracket','porcelain_tools_mode'])
   assert(!Object.hasOwn(c.runtimeProfileInput??{},id));
  const proof=await c.verifyCore();assert.equal(proof.currentUnknownNeeds,5);assert.equal(proof.newFull,0);
 });
 test('the normal source profile remains insufficient to invent any object-specific bill of quantities',async()=>{
  const c=configOf({releaseId:'TEST_ONLY',searchReleaseId:'TEST_ONLY'});
  for(const area of ['100','50']){
   const result=await compileSource({[primary]:area,porcelain_work_top_height_m:'30'},{confirmedParameters:{...c.runtimeProfileInput}});
   assert(!result.rows.some(r=>r.row_id===rid('supply:bracket')));
   assert(!result.rows.some(r=>r.row_id===rid('tool:helmet:hired')));
   for(const need of needs())assert(result.preliminaryNeeds.some(n=>n.row_id===need.needId&&n.quantity===null));
  }
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

test('porcelain borrowers retain exact raw titles and canonical primary operation ordinals without closing source gaps',()=>{
 const original=build(),current=facadePorcelainDefinitionR59(),before=JSON.stringify({original,current});
 const unknownKeys=['preparation-labor','working-parts','access-power-protection','quality-services','delivery-feed-waste'] as const;
 const unknownIds=unknownKeys.map(key=>p.prefix+':need:'+key);
 assert.deepEqual(p.unknownNeeds.map((need:{key:string})=>need.key),[...unknownKeys]);
 const originals=new Map(original.resources.map(resource=>[resource.row_id,resource]));
 const names:Readonly<Record<string,string>>=facadePorcelainCurrentPackR59.publicResourceNames;
 assert.equal(Object.keys(names).length,115);assert.equal(current.resources.length,120);
 assert.deepEqual(current.resources.filter(row=>!Object.hasOwn(names,row.row_id.slice(p.prefix.length+1))).map(row=>row.row_id),unknownIds);
 const ordinals:Readonly<Record<string,number>>={layout:1,brackets:2,guides:3,cladding:4,insulation:5,
  junctions:10,fire:10,quality:20,completion:100};
 assert.deepEqual(current.parameters,original.parameters);assert.deepEqual(current.formulas,original.formulas);
 assert.deepEqual(current.resources.map(resource=>resource.row_id),original.resources.map(resource=>resource.row_id));
 const resources=current.resources.map(resource=>{
  assert.equal(resource.title_ru,originals.get(resource.row_id)!.title_ru);
  const graph=resource.resource_graph??{};
  for(const operation of operationReferences(graph.operationCompositionV1))
   assert.equal(operation.processOrdinal,ordinals[operation.operationId.slice((p.prefix+':operation:').length)]);
  const presentation=canonicalPublicResourceDisplayPresentationV1({rowId:resource.row_id,titleRu:resource.title_ru,
   descriptor:graph.publicResourcePresentationV1,manualTitleOverride:false});
  const name=names[resource.row_id.slice(p.prefix.length+1)],unverified=unknownIds.includes(resource.row_id);
  if(unverified){
   assert.equal(name,undefined);assert.equal(graph.publicResourcePresentationV1,undefined);assert.equal(presentation,null);
   assert.equal(resource.unit_id,'');assert.equal(resource.source_metadata?.sourceRole,'UNRESOLVED_APPLICATION_NORM');
   assert.deepEqual(resource.source_metadata?.normativeTrace,[]);
   assert.equal(canonicalArtifactVisibleRowTitle({row_id:resource.row_id,title_ru:resource.title_ru,calculation_trace:{resourceGraph:graph}}),resource.title_ru);
  }else{
   assert(presentation,'AUTHORED_PRESENTATION_REQUIRED:'+resource.row_id);assert.equal(presentation.nameRu,name);
   assert.equal(canonicalPublicResourcePresentationV1({titleRu:resource.title_ru,descriptor:graph.publicResourcePresentationV1})?.sourceTitleRu,resource.title_ru);
   assert.equal(canonicalPublicResourcePresentationV1({titleRu:'TEST_ONLY foreign saved title',descriptor:graph.publicResourcePresentationV1}),null);
   assert.equal(canonicalPublicResourcePresentationV1({titleRu:resource.title_ru,descriptor:graph.publicResourcePresentationV1,manualTitleOverride:true}),null);
  }
  return{rowId:resource.row_id,nameRu:unverified?resource.title_ru:presentation!.nameRu,sourceNameRu:resource.title_ru,
   unitId:typeof resource.unit_id==='string'?resource.unit_id:null,
   resourceKind:canonicalPublicResourceKindFromCategoryV1(resource.category),operation:graph.operationCompositionV1,
   publicNameVerified:!unverified,quantityKnown:false};
 });
 const audit=auditCanonicalEstimateOperationResourcesV1({resources});
 assert.deepEqual(audit.issues.filter(issue=>issue.code==='OPERATION_METADATA_CONFLICT'),[]);
 assert.equal(audit.issues.filter(issue=>issue.code==='RESOURCE_UNIT_UNRESOLVED').length,5);
 assert.deepEqual(audit.issues.filter(issue=>issue.code==='PUBLIC_RESOURCE_NAME_UNVERIFIED').map(issue=>issue.rowId),unknownIds);
 assert.equal(JSON.stringify({original,current}),before);
 assert.equal(audit.pdfAllowed,false);assert.equal(audit.definitionAdmissionAllowed,false);assert.equal(audit.completeClaimAllowed,false);
});
