import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolve} from 'node:path';
import {masonryAacExactV5ParentR4 as parentFactory,buildMasonryAacKz250CurrentCardSuccessorR4 as build,compileMasonryAacKz250CurrentCardR4 as compile} from './masonryAacKz250CurrentCardR4';
import {MASONRY_AAC_KZ250_WHOLE_R4 as pack,buildMasonryAacKz250WholePartR4} from './masonryAacKz250WholeCycleR4';
import {masonryAacKz250CurrentCardConfigR4 as config} from '../../../../scripts/estimate/r4a13/prepareMasonryAacKz250CurrentCardR4';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {canonicalEstimateResourceOperationSections,canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';

const parent=parentFactory(),model=build(parent),row=(key:string)=>pack.prefix+':'+key,id=(key:string)=>'aackz4_'+key;
const geometry=(L='4',H='3',A='0',storey='3')=>({m33_masonry_wall_length_m:L,m33_masonry_wall_height_m:H,m33_masonry_openings_area_m2:A,m33_masonry_storey_height_m:storey});
const confirmed=(handler='2000',crane='2000')=>({[pack.selectorId]:pack.selectorValue,[id('dpc_scope')]:'GROUND_CONTACT_STRAIGHT_UNPENETRATED_RUN',[id('first_row_feed_method')]:'EXACT_THREE_YAR1_BOXES_025M3',[id('mortar_density_kg_m3')]:'2000',[id('handler_mass_kg')]:'30',[id('handler_limit_kg')]:handler,[id('crane_limit_kg')]:crane});
const manual=(quantity:string)=>({quantity,provenance:{kind:'manual',reason:'TEST_ONLY saved quantity, no actual-site certificate'}});
const quantity=(result:Awaited<ReturnType<typeof compile>>,key:string)=>result.rows.find(value=>value.row_id===row(key))?.quantity;

test('current AAC card uses saved KZ wall quantities and one main labour owner, without CT21/KG substitution',async()=>{
 const configured=config({releaseId:parent.definition.release_id,searchReleaseId:'TEST_ONLY no publication',sourceRoot:resolve(__dirname,'../../../..')});assert.equal((await configured.verifyCore()).status,'PASS_CURRENT_CARD_OWN_KZ250_REUSE_FRAGMENT_NOT_WHOLE_ACCEPTANCE');
 const result=await compile(model,geometry('4','3','1'),{confirmedParameters:confirmed()});
 for(const [key,value] of [['aac_blocks','2.75'],['dry_adhesive','68.75'],['mixing_water','0.015125'],['first_row_mortar','0.04675'],['strip_steel','2.61525'],['dowel_5x120','0.1925'],['main-labour','10.694475'],['glue-mix-machine','0.458425'],['glue-mix-labour-included','0.458425']])assert.equal(quantity(result,key),value,key);
 assert.equal(model.resources.find(value=>value.row_id===row('main-labour'))!.resource_graph.costTreatment,'OWN_COST');
 assert.equal(model.resources.find(value=>value.row_id===row('glue-mix-labour-included'))!.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');
 assert(!result.rows.some(value=>value.row_id.startsWith('masonry:wall:krer08-03-004-')));
 assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);
});

test('AAC first-course mortar does not supply an unproved DPC bed',async()=>{
 const bedId='masonry:bearing-dpc:loose-polyolefin:r4:bed-mortar',bedNorm='mdpc4_bed_m3',mortarId=row('first_row_mortar');
 const native=buildMasonryAacKz250WholePartR4({lengthId:'m33_masonry_wall_length_m',heightId:'m33_masonry_wall_height_m',openingsId:'m33_masonry_openings_area_m2',netAreaId:'aackz4_net_wall_area_m2'});
 const sourceMortar:Readonly<Record<string,unknown>>=native.resources.find(resource=>resource.row_id===mortarId)!,mortar=model.resources.find(resource=>resource.row_id===mortarId)!,bed=model.resources.find(resource=>resource.row_id===bedId)!;
 assert(bed);assert.notEqual(bed.row_id,mortar.row_id);
 for(const field of ['formula_id','unit_id','cost_owner_id','semantic_owner','procurement_eligible','source_metadata'] as const)assert.deepEqual(mortar[field],sourceMortar[field],field);
 const sourceFormula=native.formulas.find(formula=>formula.formula_id===sourceMortar.formula_id)!,formula=model.formulas.find(formula=>formula.formula_id===mortar.formula_id)!;
 for(const field of ['formula_id','expression_source','ast','output_unit_id','input_parameter_ids'] as const)assert.deepEqual(formula[field],sourceFormula[field],field);
 assert.equal(mortar.resource_graph.costTreatment,'OWN_COST');assert.equal(bed.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');assert.equal(bed.procurement_eligible,false);
 assert.equal(mortar.source_metadata.sharedDpcFirstCourseMortarOwner,undefined);
 assert(canonicalEstimateOperationReferences(mortar.resource_graph.operationCompositionV1).every(operation=>!operation.operationId.startsWith('masonry:bearing-dpc:loose-polyolefin:r4:operation:')));
 const unknown=model.parameters.find(parameter=>parameter.parameter_id===bedNorm)!;assert(unknown);assert.equal(unknown.default_value,null);assert.equal(unknown.required,false);assert.equal(unknown.truth_metadata.visibility_role,'INTERNAL_ONLY');assert.equal(unknown.truth_metadata.value_source_role,'UNRESOLVED_APPLICATION_NORM');assert.equal(unknown.truth_metadata.provenance.consumer_input_role_v1,'APPLICATION_TECHNICAL');assert.deepEqual(model.baseline.normative_source_ids[bedNorm],[]);
 const configured=config({releaseId:parent.definition.release_id,searchReleaseId:'TEST_ONLY_NO_PG_QUERY',sourceRoot:resolve(__dirname,'../../../..')});
 assert.deepEqual(Object.keys(configured.shortInput).sort(),Object.keys(geometry()).sort());assert(!Object.hasOwn(configured.runtimeProfileInput!,bedNorm));assert(!Object.hasOwn(configured.acceptanceInput,bedNorm));assert(configured.passport.unresolvedApplicableResourceRowIds!.includes(bedId));
 const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const rawExpectations:unknown=configured.passport.independentCompletenessMap?.entries;assert(Array.isArray(rawExpectations));const expectations=rawExpectations.filter(record);assert.equal(expectations.length,rawExpectations.length);
 assert(!expectations.some(entry=>entry.expectedResourceId===pack.prefix+':expected:dpc:shared-first-course-bed'));
 const expectedBed=expectations.find(entry=>entry.expectedResourceId===pack.prefix+':expected:dpc:bed-mortar')!;assert(expectedBed);assert(record(expectedBed.resolution));assert.equal(expectedBed.resolution.kind,'ROW');assert.equal(expectedBed.resolution.rowId,bedId);assert.equal(expectedBed.formulaId,bed.formula_id);assert.equal(typeof expectedBed.quantityRule,'string');assert(String(expectedBed.quantityRule).includes('UNRESOLVED_APPLICATION_NORM'));
 const first=await compile(model,geometry(),{confirmedParameters:confirmed()}),second=await compile(model,geometry('8'),{confirmedParameters:confirmed()}),manualMortar=await compile(model,geometry(),{confirmedParameters:confirmed(),rowOverrides:{[mortarId]:{...manual('0.75'),unitPrice:'7'}}});
 assert.equal(quantity(first,'first_row_mortar'),'0.051');assert.equal(quantity(second,'first_row_mortar'),'0.102');assert.equal(quantity(manualMortar,'first_row_mortar'),'0.75');assert.equal(manualMortar.rows.find(resource=>resource.row_id===mortarId)!.unit_price,'7');
 const strip='masonry:bearing-dpc:loose-polyolefin:r4:strip-installed';assert.equal(first.rows.find(resource=>resource.row_id===strip)?.quantity,'1.46');assert.equal(second.rows.find(resource=>resource.row_id===strip)?.quantity,'2.92');
 for(const result of [first,second,manualMortar]){
  assert.equal(result.rows.filter(resource=>resource.row_id===mortarId).length,1);
  assert(!result.rows.some(resource=>resource.row_id===bedId));const pending=result.preliminaryNeeds.find(resource=>resource.row_id===bedId)!;assert(pending);assert.equal(pending.quantity,null);assert.equal(pending.unit_id,'m3');assert(pending.missing_parameter_ids.includes(bedNorm));
  const projected=canonicalEstimateResourceOperationSections([...result.rows,...result.preliminaryNeeds].map(resource=>({rowId:resource.row_id,titleRu:String(resource.title_ru),operation:(resource.calculation_trace as {resourceGraph:{operationCompositionV1:unknown}}).resourceGraph.operationCompositionV1})));
  for(const operation of ['accept-base','first-course-close']){const section=projected.find(value=>value.operation?.operationId==='masonry:bearing-dpc:loose-polyolefin:r4:operation:'+operation);assert(section);assert.equal(section.operation!.groupId,pack.prefix);assert(!section.resourceIds.includes(mortarId));assert(!section.sharedResources.some(resource=>resource.rowId===mortarId));assert(section.resourceIds.includes(bedId)||section.sharedResources.some(resource=>resource.rowId===bedId));}
 }
 assert.equal(new Set(model.resources.map(resource=>resource.row_id)).size,model.resources.length);assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);assert.equal(model.passport.decision.masonryAacKz250CurrentCardR4.dpcBedNotCoveredByAacFirstCourse,true);assert.equal(model.passport.decision.masonryAacKz250CurrentCardR4.full,0);assert.equal(configured.applicability.fullTechnicalAcceptance,false);
});

test('saved first-course quantity feeds the reused physical mass bound and cannot be hidden by manual control0',async()=>{
 const rowOverrides={[row('first_row_mortar')]:manual('0.75')};
 const exact=await compile(model,geometry(),{confirmedParameters:confirmed('1635','1665'),rowOverrides});assert.equal(exact.derivedParameters[id('effective_first_row_m3')],'0.75');
 assert.equal(quantity(exact,'first-row-handler-control'),'0');assert.equal(quantity(exact,'first-row-crane-control'),'0');
 await assert.rejects(()=>compile(model,geometry(),{confirmedParameters:confirmed('300','300'),rowOverrides:{...rowOverrides,[row('first-row-crane-control')]:manual('0')}}),{code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
});

test('mandatory physical controls reject exclusion; excluded paid first-row owner leaves explicit scope need',async()=>{
 for(const key of ['first-row-handler-control','first-row-crane-control'])await assert.rejects(()=>compile(model,geometry(),{confirmedParameters:confirmed(),compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:[row(key)]}}),{code:'COMPOSITION_SELECTION_INVALID'});
 const excluded=await compile(model,geometry(),{confirmedParameters:confirmed(),compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:[row('first_row_mortar')]}});
 const requirement=[...excluded.rows,...excluded.preliminaryNeeds].find(value=>value.row_id===row('first-row-scope'));assert(requirement);const trace=requirement.calculation_trace as {resourceGraph:{scopeRequirementDecisionV1:{status:string}}};assert.equal(trace.resourceGraph.scopeRequirementDecisionV1.status,'REQUIRED_RESOURCE_EXCLUDED');
 assert.equal(excluded.rows.find(value=>value.row_id===row('first_row_mortar'))?.included_in_estimate,false);assert.equal(excluded.derivedParameters[id('effective_first_row_m3')],'0');
 assert.equal(model.resources.find(value=>value.row_id===row('first_row_mortar'))!.resource_graph.costTreatment,'OWN_COST');
});

test('new source facts cannot be supplied by consumer; ordinary visible inputs of the selected profile are simple geometry',async()=>{
 await assert.rejects(()=>compile(model,{...geometry(),[id('handler_limit_kg')]:'9999'},{confirmedParameters:confirmed()}),{code:'PARAMETER_VALIDATION_FAILED'});
 const visible=model.parameters.filter(parameter=>parameter.truth_metadata.visibility_role==='USER_INPUT'&&resolveInclusionGraph(parameter.truth_metadata.visible_when??{kind:'literal',value:true},{...geometry(),...confirmed()}).value===true).map(parameter=>parameter.parameter_id);
 assert.deepEqual(visible.sort(),Object.keys(geometry()).sort());
 const partial=await compile(model,geometry(),{confirmedParameters:{[pack.selectorId]:pack.selectorValue}});assert(!partial.rows.some(value=>value.row_id==='masonry:bearing-dpc:loose-polyolefin:r4:strip-installed'));assert(partial.preliminaryNeeds.some(value=>value.row_id===row('whole_bearing_dpc')&&value.quantity===null));
 await assert.rejects(()=>compile(model,geometry('1','1','2'),{confirmedParameters:confirmed()}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>compile(model,geometry('4','3','0','2.99'),{confirmedParameters:confirmed()}),{code:'PARAMETER_VALIDATION_FAILED'});
 const {m33_masonry_storey_height_m:_missing,...missingPeer}=geometry();const missing=await compile(model,missingPeer,{confirmedParameters:confirmed()});assert(missing.preliminaryNeeds.some(value=>value.row_id===row('first_row_mortar')&&value.missing_parameter_ids.includes('m33_masonry_storey_height_m')));
});

test('absence of the new selected profile preserves historical calculation, binding IDs and payment owner identities',async()=>{
 const input={...parent.baseline.input_values,...geometry(),m33_masonry_source_system:'Сохранить прежний принятый способ расчёта'};
 const simplify=(result:Awaited<ReturnType<typeof compile>>)=>({rows:result.rows.map(value=>[value.row_id,value.quantity,value.amount,value.included_in_estimate,value.included_in_procurement]),needs:result.preliminaryNeeds.map(value=>[value.row_id,value.quantity,value.missing_parameter_ids]),totals:result.totals});
 assert.deepEqual(simplify(await compile(model,input)),simplify(await compile(parent,input)));
 assert.deepEqual(model.bindings,parent.bindings);assert.deepEqual(model.formulas.slice(0,parent.formulas.length),parent.formulas);
 for(const resource of parent.resources){const retained=model.resources.find(value=>value.row_id===resource.row_id)!;assert.equal(retained.resource_graph.costTreatment,resource.resource_graph.costTreatment);assert.equal(retained.procurement_eligible,resource.procurement_eligible);}
});
