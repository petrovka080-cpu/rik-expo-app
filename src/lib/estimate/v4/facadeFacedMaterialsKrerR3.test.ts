import assert from 'node:assert/strict';
import {canonicalEstimateOperationReferences as operationReferences,canonicalEstimateResourceOperationSections as operationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import oracle from '../../../../data/estimate-benchmarks/fixtures/facade-faced-materials-independent-oracles-r3.json';
import {facadeFacedMaterialDefinitionR3 as build,facadeFacedMaterialControlR3 as control,compileFacadeFacedMaterialR3 as compileSource,facadeFacedMaterialGeometryR5 as geometryIds,facadeFacedMaterialSelectedSourceFactsR5 as sourceFacts,facadeFacedMaterialPrimaryR3 as primary,facadeFacedMaterialCompletenessR3 as complete,facadeFacedMaterialPackR3 as pack,facadeFacedMaterialRowIdR3 as rid,type FacadeFacedMaterialKeyR3 as Key} from './facadeFacedMaterialsKrerR3';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {facadeFacedMaterialMasterConfigR3 as configOf} from '../../../../scripts/estimate/r4a13/prepareFacadeFacedMaterialsKrerR3';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../backendPlatform/canonicalProfessionalPdf';
import {escapeCanonicalArtifactHtml} from '../backendPlatform/canonicalEstimateArtifactContract';
const keys:Key[]=['face-brick-aac','limestone-mortar','ceramic-tile-mortar','plain-render'];
// Preserve unknown supplied keys in raw input, including negative add-ons.
const compile=async(key:Key,fixture:Record<string,unknown>,options:Parameters<typeof compileSource>[2]={})=>{
 const known=new Set((options.model??build(key)).parameters.map(q=>q.parameter_id));
 const submitted=Object.fromEntries(Object.entries(fixture).filter(([id])=>geometryIds(key).includes(id)||!known.has(id)));
 const confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>known.has(id)&&!geometryIds(key).includes(id)));
 return compileSource(key,submitted,{...options,confirmedParameters});
};
const row=(r:any,key:Key,id:string)=>{const x=r.rows.find((x:any)=>x.row_id===rid(key,id));assert(x,id);return x;};
describe('whole facebrick/naturalstone/ceramictile façade methods R3 — UNRUN',()=>{
 for(const k of keys)test(k+' independently authored operation map matches exact definition',()=>{const d=build(k);assert.equal(complete(k).generatedFromCurrentRows,false);assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:complete(k),formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);assert.equal(pack(k).full,0);assert(d.parameters.every(q=>q.default_value===null));});
 for(const c of oracle.cases)test('independent source oracle '+c.caseId,async()=>{const k=c.profileKey as Key,r=await compile(k,control(k,{faced_facade_area_m2:c.areaM2}));for(const[id,qty]of Object.entries(c.expectedRaw))assert.equal(cmp(row(r,k,id+(id==='labour'?'':'-consumed')).quantity,qty),0,id);assert.equal(r.preliminaryNeeds.length,pack(k).needs.length);assert(r.rows.every(x=>x.unit_price===null));});
 test('brick5070 is pieces from5.07thousand; no extra paid post labour or crane',async()=>{const k='face-brick-aac',r=await compile(k,control(k));assert.equal(cmp(row(r,k,'face-brick-consumed').quantity,'5070'),0);assert.equal(cmp(row(r,k,'supply:ready-mortar').quantity,'2.33'),0);for(const[id,q]of[['rotating-tubs','3'],['steel-boxes','4'],['shovels','2'],['rigger-crew','2']]){const x=row(r,k,'m50post:'+id);assert.equal(cmp(x.quantity,q),0);assert.equal(x.included_in_estimate,false);assert.equal(x.included_in_procurement,false);}assert.equal(row(r,k,'m50post:rigger-crew').unit_id,'person');assert(!build(k).formulas.some(f=>f.expression_source?.includes('0.40')||f.expression_source?.includes('0.234')));assert.equal(r.rows.filter(x=>x.category==='labor'&&x.included_in_estimate).length,1);});
 test('source reinforcement masses and stoneP are informational comparators, never procurement',async()=>{const brick=await compile('face-brick-aac',control('face-brick-aac'));for(const k of['anchor-steel-comparator','reinforcement-mesh-comparator'])assert.equal(row(brick,'face-brick-aac',k+'-consumed').included_in_procurement,false);for(const a of['100','12.5']){const r=await compile('limestone-mortar',control('limestone-mortar',{faced_facade_area_m2:a,faced_actual_fastening_mass_t:'0.18'})),x=row(r,'limestone-mortar','fastening-P-consumed');assert.equal(cmp(x.quantity,'0.18'),0);assert.equal(x.included_in_procurement,false);assert.equal(x.included_in_estimate,false);}});
 test('stone99m² remains99; ready1:3 mortar is3.6m³ rather than M50/brick volume',async()=>{const r=await compile('limestone-mortar',control('limestone-mortar'));assert.equal(cmp(row(r,'limestone-mortar','limestone-slabs-consumed').quantity,'99'),0);assert.equal(cmp(row(r,'limestone-mortar','ready-mortar-consumed').quantity,'3.6'),0);assert(!r.rows.some(x=>x.row_id.includes('m50post')));});
 test('tilewater is explicitly unknown, not zero or imported from stone/wet system',async()=>{const r=await compile('ceramic-tile-mortar',control('ceramic-tile-mortar'));assert(r.preliminaryNeeds.some(n=>n.row_id===rid('ceramic-tile-mortar','need:wetting-grout-water')&&n.quantity===null));assert.equal(cmp(row(r,'ceramic-tile-mortar','cement-consumed').quantity,'40'),0);assert.equal(cmp(row(r,'ceramic-tile-mortar','ready-mortar-consumed').quantity,'2'),0);});
 for(const k of keys)test(k+' no source method or protected need quantity can be substituted',async()=>{await assert.rejects(()=>compile(k,control(k,{faced_exact_whole_method:'СОВРЕМЕННЫЙ_КЛЕЙ_ИЛИ_ДРУГОЕ_ОСНОВАНИЕ'})),{code:'PARAMETER_VALIDATION_FAILED'});for(const n of pack(k).needs)for(const q of['0','1','77'])await assert.rejects(()=>compile(k,control(k,{['faced_internal_'+n.key.replaceAll('-','_')]:q})),{code:'PARAMETER_VALIDATION_FAILED'});});
 for(const[k,patch]of[['face-brick-aac',{faced_storey_height_m:'4.001'}],['face-brick-aac',{faced_brick_geometry:'ГИПЕРПРЕССОВАННЫЙ250×120×65'}],['face-brick-aac',{faced_M50_post_method:'ДВА_ПАРАЛЛЕЛЬНЫХ_ПОСТА'}],['limestone-mortar',{faced_stone_thickness_mm:'40'}],['limestone-mortar',{faced_stone_plates_per_m2:'3'}],['ceramic-tile-mortar',{faced_tile_thickness_mm:'11'}],['ceramic-tile-mortar',{faced_cement_grade:'ОБЫЧНЫЙ_ПОРТЛАНДЦЕМЕНТ'}]]as const)test(k+' rejects outofscope '+Object.keys(patch)[0],()=>assert.rejects(()=>compile(k,control(k,patch)),{code:'PARAMETER_VALIDATION_FAILED'}));
 for(const k of keys)test(k+' common PDF keeps every unknown visible and rawprice200 nonpayable',async()=>{const id=rid(k,'operators-consumed'),params=control(k),r=await compile(k,params,{rowOverrides:{[id]:{unitPrice:'200',includedInEstimate:true,provenance:{kind:'manual',reason:'TEST_ONLY reference source operators'}}}}),before=JSON.stringify(r),pdf=buildCanonicalProfessionalPdfProjection({revision:{id:'TEST_ONLY',release_id:'TEST_ONLY',catalog_id:pack(k).catalogId,checksum_sha256:'0'.repeat(64),row_count:r.rows.length,currency_code:'KGS',input_parameters:params},rows:r.rows as any,preliminaryNeeds:r.preliminaryNeeds as any,workTitleRu:pack(k).titleRu});assertCanonicalProfessionalPdfMoneyCells(pdf.html);for(const n of r.preliminaryNeeds)assert(pdf.html.includes(escapeCanonicalArtifactHtml(n.title_ru)));assert.equal(cmp(row(r,k,'operators-consumed').unit_price,'200'),0);assert.equal(row(r,k,'operators-consumed').included_in_estimate,false);assert.equal(cmp(r.totals.amount,'0'),0);assert.equal(JSON.stringify(r),before);});
 for(const k of keys)test(k+' declarationorderindependence and zerofront',async()=>{const a=await compile(k,control(k)),d=structuredClone(build(k));(d.parameters as any[]).reverse();(d.formulas as any[]).reverse();const b=await compile(k,control(k),{model:d}),semantic=(r:typeof a)=>({rows:r.rows.map(x=>[x.row_id,x.quantity,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]),needs:r.preliminaryNeeds.map(n=>[n.row_id,n.quantity]),totals:r.totals});assert.deepEqual(semantic(a),semantic(b));const z=await compile(k,{faced_facade_area_m2:'0'});assert.equal(z.preliminaryNeeds.length,0);assert(!z.rows.some(x=>x.included_in_estimate||x.included_in_procurement));});
 for(const k of keys)test(k+' whole source card exposes only one or two measured geometric facts',()=>{
  const d=build(k);assert.deepEqual(d.parameters.filter(q=>q.truth_metadata.visibility_role==='USER_INPUT').map(q=>q.parameter_id),geometryIds(k));assert.deepEqual(d.ordinaryParameterIds,geometryIds(k));
  for(const q of d.parameters.filter(q=>!geometryIds(k).includes(q.parameter_id)&&q.truth_metadata.value_source_role!=='COMPILER_DERIVED_RESOURCE_QUANTITY')){
   const provenance=q.truth_metadata.provenance;assert(provenance&&typeof provenance==='object'&&!Array.isArray(provenance));
   assert.equal(q.truth_metadata.visibility_role,'INTERNAL_ONLY');assert.equal((provenance as Record<string,unknown>).consumer_input_role_v1,'APPLICATION_TECHNICAL');
  }
 });
 for(const k of keys)test(k+' rejects raw project source echo at both wrapper and direct core',async()=>{
  const d=build(k),fixture=control(k),geometry=Object.fromEntries(Object.entries(fixture).filter(([id])=>geometryIds(k).includes(id))),confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>!geometryIds(k).includes(id)));
  for(const id of ['faced_approved_project','faced_actual_PPR','faced_exact_whole_method'])for(const value of [fixture[id],null,undefined]){
   const submittedParameters={...geometry,[id]:value};
   assert.throws(()=>compileSource(k,submittedParameters,{confirmedParameters}),{code:'PARAMETER_VALIDATION_FAILED'});
   await assert.rejects(()=>compileCanonicalEstimateCore({operation:'compile',compilerVersion:'TEST_ONLY_EXISTING_FACED_TRUSTED_BOUNDARY_R5',catalogId:pack(k).catalogId,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,confirmedParameters,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:hash}),{code:'PARAMETER_VALIDATION_FAILED'});
  }
 });
 for(const k of keys)test(k+' existing source profile never promotes synthetic project, scaffold or machine ownership',async()=>{
  const c=configOf(k,{releaseId:'TEST_ONLY',searchReleaseId:'TEST_ONLY'}),expected=sourceFacts(k);
  assert.deepEqual(c.runtimeProfileInput,expected);
  assert.deepEqual(c.runtimeProfileClassification,Object.fromEntries(Object.keys(expected).map(id=>[id,'NORMATIVE'])));
  assert.deepEqual(c.runtimeProfileSourceIds,Object.fromEntries(Object.keys(expected).map(id=>[id,[pack(k).sourceId]])));
  const input_classification=Object.fromEntries(build(k).parameters.map(q=>[q.parameter_id,c.runtimeProfileClassification?.[q.parameter_id]??'VALIDATION_FIXTURE']));
  assert.deepEqual(canonicalApprovedBaselineRuntimeParameters({input_values:c.acceptanceInput,input_classification}),expected);
  for(const id of Object.keys(c.runtimeProfileInput??{}))assert(!String(c.runtimeProfileInput?.[id]).includes('TEST_ONLY'));
  assert(!Object.hasOwn(expected,'faced_accepted_KG_basis'));assert(!Object.hasOwn(expected,'faced_actual_PPR'));assert(!Object.hasOwn(expected,'faced_ready_scaffolds_reference'));
  const actual=await c.verifyCore();
  assert.equal(actual.newMachineAdmissions,({'face-brick-aac':8,'limestone-mortar':8,'ceramic-tile-mortar':4,'plain-render':4})[k]);
  assert.equal(actual.currentUnknownNeeds,pack(k).needs.length);assert.equal(actual.newFull,0);
  assert.equal(actual.ordinaryLockedDbPreflight,'REQUIRED_BY_STANDARD_PUBLISHER');
 });
 for(const k of keys)test(k+' missing actual source readback leaves every applicable norm gap unknown',async()=>{
  const geometry={[primary]:'100',...(k==='face-brick-aac'?{faced_storey_height_m:'3'}:{})};
  const r=await compileSource(k,geometry,{confirmedParameters:sourceFacts(k)});
  for(const n of pack(k).needs)assert(r.preliminaryNeeds.some(x=>x.row_id===rid(k,'need:'+n.key)&&x.quantity===null));
  assert(!r.rows.some(x=>x.included_in_estimate||x.included_in_procurement));
  assert(build(k).parameters.every(q=>q.default_value===null));
 });

});

for(const key of keys)test(key+' existing shared resources survive the real common operation consumer with one owner',()=>{
  const d=build(key);
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
