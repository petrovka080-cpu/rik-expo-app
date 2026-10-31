import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import oracle from '../../../../data/estimate-benchmarks/fixtures/masonry-ready-m50-post-literal-oracle-r1.json';
import {READY_M50_SUPPLY_POST_R1 as pack,assertReadyM50PostSourceR1 as guard,readyM50PostCapturedRepresentativeR1 as captured,buildReadyM50PostRetainedSuccessorR1 as build,readyM50PostIdR1 as id,readyM50PostRowIdR1 as row,compileReadyM50PostR1 as compile,readyM50PostCompletenessR1 as mapOf} from './masonryReadyM50SupplyPostR1';
import {readyM50PostControlR1 as control} from '../../../../scripts/estimate/r4a13/prepareMasonryReadyM50SupplyPostR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {resolveMaster33MasonryPrimaryR1 as primary} from './master33MasonryWallSystemsR1';
import {buildCanonicalProfessionalPdfProjection} from '../backendPlatform/canonicalProfessionalPdf';
import {canonicalProfessionalPdfReviewAcknowledgmentV1,canonicalEstimateSavedOperationAcceptanceV1} from '../backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {canonicalEstimateStableJson as savedReviewStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalArtifactPreliminaryNeeds as savedReviewNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';
import {selectCanonicalArtifactRows} from '../backendPlatform/canonicalEstimateArtifactContract';


// TEST_ONLY saved rendering snapshot, never STANDARD/source/whole-work admission.
function savedRenderingReview(input:Parameters<typeof buildCanonicalProfessionalPdfProjection>[0]){
 const original=input.revision as Record<string,any>,amendment=original.amendment_contract??{},sources=amendment.parameterSources??{};
 const rows=input.rows.map(row=>{const {row_sha256:_old,...body}=row;
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
const old=captured(),model=build(old),newRows=model.resources.filter(r=>!old.resources.some(p=>p.row_id===r.row_id));
const sorted=(v:unknown[])=>[...v].sort();
const semantic=(r:Awaited<ReturnType<typeof compile>>)=>({rows:r.rows.map(x=>[x.row_id,x.unit_id,x.quantity,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]),needs:r.preliminaryNeeds.map(x=>[x.row_id,x.quantity,x.need_state,sorted(x.missing_parameter_ids)]),totals:r.totals});
const newResult=(r:Awaited<ReturnType<typeof compile>>)=>r.rows.filter(x=>x.row_id.startsWith(pack.prefix+':'));

test('M50 exact literal4 counts and historical whole organization source identity',()=>{
 guard();assert.equal(pack.source.sha256,oracle.sourceSha256);assert.equal(oracle.expectedNotFromCompiledRows,true);
 assert.deepEqual(Object.fromEntries(pack.roster.map(r=>[r.key,{quantity:r.quantity,unitId:r.unitId}])),oracle.literalCounts);
 assert.equal(pack.wholeOrganization.sequentialPosts,'1');assert.equal(pack.wholeOrganization.parallelPostsAllowed,false);assert.equal(pack.sourceLiteratureReferenceOnly.notUsedInAnyFormula,true);
});
for(const size of ['small','normal'] as const)test('M50 '+size+' stable roster3/4/2/2 and independent ready-mortar volume',async()=>{
 const r=await compile(model,control(size));
 for(const[key,expected]of Object.entries(oracle.literalCounts)){const x=r.rows.find(x=>x.row_id===row(key))!;assert(x,key);assert.equal(x.quantity,expected.quantity);assert.equal(x.unit_id,expected.unitId);assert.equal(x.included_in_estimate,false);assert.equal(x.included_in_procurement,false);}
 assert.equal(r.rows.find(x=>x.row_id===row('project-operation-gate'))?.quantity,oracle[size].readyM50M3);
 assert.equal(model.passport.decision.readyM50Post.closedPhysicalNeeds,0);assert.equal(model.passport.decision.newFullTechnologies,0);
});
test('M50 zero0.0 full declaration has no sourcepost or fictitious flow',async()=>{
 const p=control('zero') as Json;for(const k of Object.keys(p))if(k.startsWith('m50post_')&&k!==pack.selectorId)delete p[k];
 const r=await compile(model,p);assert.equal(newResult(r).length,0);assert(!r.preliminaryNeeds.some(x=>x.row_id.startsWith(pack.prefix+':')));assert.equal(newRows.length,15);
});
test('M50 missing actual PPR records leaves known roster and separate CONDITION_REQUIRED operation',async()=>{
 const p=control() as Json;for(const f of pack.projectFacts)delete p[id(f.key+'_reference')];
 const r=await compile(model,p);for(const k of Object.keys(oracle.literalCounts))assert(r.rows.some(x=>x.row_id===row(k)));
 const n=r.preliminaryNeeds.find(x=>x.row_id===row('project-operation-gate'))!;assert(n);assert.equal(n.need_state,'CONDITION_REQUIRED');
 assert.deepEqual(sorted(n.missing_parameter_ids),sorted(pack.projectFacts.filter(f=>f.key!=='price-scope').map(f=>id(f.key+'_reference'))));
 assert.equal(n.quantity,oracle.normal.readyM50M3);
});
test('M50 actual documents cannot clear unknown internal product or whole method source',async()=>{
 const r=await compile(model,control());
 for(const g of pack.internalGaps){const n=r.preliminaryNeeds.find(n=>n.row_id===row('need:'+g.key))!;assert(n,g.key);assert.equal(n.need_state,'QUANTITY_REQUIRED');assert.equal(n.quantity,null);assert.deepEqual(n.missing_parameter_ids,[id('unresolved_'+g.key)]);}
});
test('M50 missing inventory remains a real object quantity need, never fictitious stockzero',async()=>{
 const p=control() as Json;for(const f of pack.stockFacts)delete p[id('available_'+f.key)];const r=await compile(model,p);
 for(const f of pack.stockFacts){const n=r.preliminaryNeeds.find(n=>n.row_id===row('stock-shortfall:'+f.key))!;assert(n);assert.equal(n.need_state,'QUANTITY_REQUIRED');assert.equal(n.quantity,null);assert.deepEqual(n.missing_parameter_ids,[id('available_'+f.key)]);}
});
test('M50 source counts and actual inventory produce informational shortages2/0/2, no order',async()=>{
 const p=control() as Json;pack.stockFacts.forEach((f,i)=>p[id('available_'+f.key)]=oracle.stockShortfall.available[i]);const r=await compile(model,p);
 pack.stockFacts.forEach((f,i)=>{const x=r.rows.find(x=>x.row_id===row('stock-shortfall:'+f.key))!;assert(x);assert.equal(x.quantity,oracle.stockShortfall.expected[i]);assert.equal(x.included_in_estimate,false);assert.equal(x.included_in_procurement,false);assert.equal(x.procurement_eligible,false);});
});
test('M50 counted crew is2person INFO; there is no0.40h or invented machine/labour formula',()=>{
 const r=newRows.find(r=>r.row_id===row('rigger-crew'))!;assert.equal(r.unit_id,'person');assert.equal(r.category,'service');assert.equal(r.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');
 assert(newRows.every(r=>r.unit_id!=='man_hour'&&r.unit_id!=='machine_hour'&&!r.procurement_eligible));assert(model.formulas.slice(old.formulas.length).every(f=>!String(f.expression_source).includes('0.40')));
});
test('M50 manual77 prices/payment switches cannot create a second cost or purchase owner',async()=>{
 const provenance={kind:'manual' as const,reason:'TEST_ONLY reference price, not source norm or actual order'};
 const overrides=Object.fromEntries(newRows.map(r=>[r.row_id,{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}]));
 const input=control(),baseInput=Object.fromEntries(Object.entries(input).filter(([k])=>!k.startsWith('m50post_'))),base=await compile(old,baseInput),r=await compile(model,input,{rowOverrides:overrides});
 const money=(t:typeof r.totals)=>({amount:t.amount,currencyCode:t.currencyCode,includedRowCount:t.includedRowCount,pricedRowCount:t.pricedRowCount,unpricedRowCount:t.unpricedRowCount});assert.deepEqual(money(r.totals),money(base.totals));assert.equal(r.totals.excludedRowCount-base.totals.excludedRowCount,newResult(r).length);assert.deepEqual(sorted(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id)),sorted(base.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id)));for(const x of newResult(r)){assert.equal(x.included_in_estimate,false);assert.equal(x.included_in_procurement,false);assert.equal(x.unit_price,'77');}
 assert.equal(selectCanonicalArtifactRows(newResult(r)).procurementRows.length,0);
 // The existing immutable core keeps reference quantity×price amounts even for
 // INFO rows; the canonical public table suppresses their amount cells.
 const source=r.rows.filter(x=>pack.roster.some(k=>x.row_id===row(k.key)));
 // This saved rendering fixture deliberately contains only the four INFO roster rows.
 const projection=savedRenderingReview({revision:{id:'TEST_ONLY',release_id:'TEST_ONLY',catalog_id:pack.catalogId,checksum_sha256:'f'.repeat(64),row_count:source.length,currency_code:'KGS',totals:{amount:'0'}},rows:source,workTitleRu:'Пост подачи готового раствора'});
 assert.equal((projection.html.match(/<td class="money"><\/td>/gu)??[]).length,4);
 assert.equal((projection.html.match(/<td class="money">77,00 сом<\/td>/gu)??[]).length,4);
});
test('M50 wrong existing material profile is rejected by persisted forbiddenWhen',async()=>{
 await assert.rejects(()=>compile(model,{...control(),[pack.parentSelector]:'Сохранить прежний принятый способ расчёта'}),{code:'PARAMETER_VALIDATION_FAILED'});
});
test('M50 no optional post choice preserves currentKG source rows and all existing needs',async()=>{
 const p=control() as Json;for(const key of Object.keys(p))if(key.startsWith('m50post_'))delete p[key];
 assert.deepEqual(semantic(await compile(model,p)),semantic(await compile(old,p)));
});
test('M50 exact historical baseline replay is byte-semantic unchanged',async()=>{
 assert.deepEqual(model.baseline.input_values,old.baseline.input_values);assert.deepEqual(semantic(await compile(model,old.baseline.input_values)),semantic(await compile(old,old.baseline.input_values)));
});
test('M50 existing primary selection and saved-parent carry policy are unchanged',()=>{
 assert.deepEqual(model.definition.applicability.primaryMeasureSelectionV1,old.definition.applicability.primaryMeasureSelectionV1);
 const p=control(),a=primary(old,p),b=primary(model,p);assert.deepEqual(a,b);
 assert(model.parameters.some(p=>p.parameter_id===pack.parentPrimary));assert(!model.parameters.some(p=>p.parameter_id==='m50post_volume_m3'));
});
test('M50 cannot accept source-gap quantities0/1 or a parallel-post count',async()=>{
 for(const value of ['0','1'])await assert.rejects(()=>compile(model,{...control(),[id('unresolved_product-compatibility')]:value}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>compile(model,{...control(),m50post_parallel_posts:'2'}),{code:'PARAMETER_VALIDATION_FAILED'});
});
test('M50 incompatible inventory unit/count is rejected rather than converted from volume',async()=>{
 for(const value of ['1.5','1m3'])await assert.rejects(()=>compile(model,{...control(),[id('available_rotating-tubs')]:value}),{code:'PARAMETER_VALIDATION_FAILED'});
});
test('M50 wrongsource unit/roster/drawing/parallel organization fails sourceguard',()=>{
 for(const mutate of [(p:typeof pack)=>p.roster[3]!.unitId='man_hour',(p:typeof pack)=>p.roster[0]!.quantity='1',(p:typeof pack)=>p.roster[0]!.drawingInternal='ANY_TUB',(p:typeof pack)=>p.wholeOrganization.parallelPostsAllowed=true]){const p=structuredClone(pack);mutate(p);assert.throws(()=>guard(p));}
});
test('M50 exact currentparent and samecardidentity reject foreign or mutated preimages',()=>{
 for(const change of [{catalog_id:'canonical-work:base:masonry_interior_gas_block_lay_standard'},{id:'different'},{definition_sha256:'0'.repeat(64)}])assert.throws(()=>build({...captured(),definition:{...old.definition,...change}}));
 const p=captured();p.formulas[0]!.expression_source='77';assert.throws(()=>build(p));
});
test('M50 project documentation and stock have real consumers; internalnorms stay hidden',()=>{
 const external=new Set(old.parameters.map(p=>p.parameter_id));for(const p of model.parameters.filter(p=>!external.has(p.parameter_id))){assert(p.truth_metadata.semantic_parameter_key);assert((p.truth_metadata.resource_branch_consumers as string[]).length>0);if(p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'){assert.equal(p.truth_metadata.visibility_role,'INTERNAL_ONLY');continue;}assert.equal(p.truth_metadata.value_source_role,'PROJECT_SPECIFIC_INPUT');assert.equal(p.truth_metadata.guide.guide_kind,'PROJECT_DEFINED');assert.equal(p.truth_metadata.guide.source_snapshot_hash,pack.source.sha256);if(p.value_type==='text'){assert.equal(p.constraints_json.minLength,1);assert.equal(p.constraints_json.maxLength,1000);assert.equal(p.truth_metadata.guide.source_role,'PROJECT_DOCUMENTATION');}}
});
test('M50 independent completeness retains source/project/supply gaps without FULL',()=>{
 const map=mapOf();assert.equal(map.generatedFromCurrentRows,false);assert.equal(map.closedPhysicalNeeds,0);assert.equal(map.newlyQuantifiedRosterCategories,4);assert.equal(map.fullTechnicalAcceptance,false);assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
 for(const r of old.resources)assert(model.resources.some(x=>x.row_id===r.row_id));
});
