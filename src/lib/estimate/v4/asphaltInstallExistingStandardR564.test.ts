import assert from 'node:assert/strict';
import fixture from '../../../../data/estimate-benchmarks/fixtures/asphalt-install-existing-standard-capture-r564.json';
import {appendAsphaltInstallExistingStandardR564,asphaltInstallExistingStandardPackR564 as pack,
 asphaltInstallCaptureSha256R564,asphaltInstallParameterIdR564 as parameter,asphaltInstallRowIdR564 as row} from './asphaltInstallExistingStandardR564';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {isCanonicalEstimateConsumerSuppliedParameter,isCanonicalEstimateVisibleReplaceableProfile,
 isCanonicalEstimateVisibleUserResourceSelectionParameter} from '../backendPlatform/canonicalEstimateParameterSemantics';
import {resolveCanonicalParameterVisibility} from '../canonicalParameters/canonicalParameterCore';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
type Json=Record<string,any>;
const standard=fixture.standard.capturedParent,recipe=fixture.recipe.capturedParent;
export function asphaltInstallSelectedFactsR564(area=75,haul=12):Json{return {
 [pack.areaId]:area,[pack.siteId]:pack.siteReadyRu,[pack.haulId]:haul};}
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
function core(model:{parameters:readonly Json[];formulas:readonly Json[];resources:readonly Json[]},parameters:Json,primary:string,priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[],confirmed:Json={}){
 return compileCanonicalEstimateCore({operation:'compile',compilerVersion:pack.contract,catalogId:pack.catalogId,primaryMeasureParameterId:primary,
  parameterDefinitions:[...model.parameters] as CanonicalEstimateCompileCoreInput['parameterDefinitions'],formulaDefinitions:[...model.formulas] as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
  resourceDefinitions:[...model.resources] as CanonicalEstimateCompileCoreInput['resourceDefinitions'],submittedParameters:parameters,confirmedParameters:confirmed,currencyCode:'KGS',
  priceItems,priceSnapshotIds:priceItems?.map(p=>p.snapshot_id),maximumResourceRows:200,hashJson:async value=>estimateDeterministicHash(value)});
}
const payment=(r:Json)=>({quantity:r.quantity,unit:r.unit_id,price:r.unit_price,amount:r.amount,included:r.included_in_estimate,procurement:r.included_in_procurement,normativeTrace:r.normative_trace});
export async function runAsphaltInstallExistingStandardChecksR564(){
 const before=JSON.stringify(fixture),model=appendAsphaltInstallExistingStandardR564({capturedParent:standard,recipeParent:recipe});
 assert.equal(asphaltInstallCaptureSha256R564(standard),pack.parent.sha256);assert.equal(asphaltInstallCaptureSha256R564(recipe),pack.historicalRecipe.sha256);
 assert.equal(model.parameters.find(p=>p.parameter_id===pack.areaId)?.default_value,null);
 assert.equal(model.ordinaryObjectFactIds.length,3);assert.equal(model.fullTechnicalAcceptance,false);assert.match(pack.titleRu,/50 мм/u);
 const selector=model.parameters.find(p=>p.parameter_id===pack.selectorId)!;
 assert.equal(selector.truth_metadata.visibility_role,'INTERNAL_ONLY');assert.equal(selector.truth_metadata.provenance.historicalOracleValueIsNotAPublicOption,true);
 // Same immutable baseline filter used by canonical-estimate-worker, with the
 // selected public technology supplied by the application, never by a form.
 const runtime=canonicalApprovedBaselineRuntimeParameters({input_values:{...standard.baseline.input_values,...model.runtimeProfileInput,
  [pack.areaId]:5000,[pack.haulId]:20},input_classification:{...standard.baseline.input_classification,...model.runtimeProfileClassification,
   [pack.areaId]:'VALIDATION_FIXTURE',[pack.haulId]:'VALIDATION_FIXTURE'}});
 assert.equal(runtime[pack.selectorId],pack.selectedValueRu);assert(!Object.hasOwn(runtime,'area_m2'));assert(!Object.hasOwn(runtime,pack.areaId));assert(!Object.hasOwn(runtime,pack.haulId));
 // Project the real API schema fields, then exercise the editor's exact shared
 // ownership admission and visibility owner. Internal selectors are deliberately
 // absent from its visible-values map; old twenty fields must still stay out.
 const schema=model.parameters.map(p=>{const t=p.truth_metadata,g=t.guide??{};return {parameterId:p.parameter_id,titleRu:p.title_ru,valueType:p.value_type,
  unitId:p.unit_id,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,semanticParameterKey:t.semantic_parameter_key,
  visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,formulaConsumers:t.formula_consumers,
  resourceBranchConsumers:t.resource_branch_consumers,visibleWhen:t.visible_when,requiredWhen:t.required_when,
  runtimeProfileClassification:t.runtime_profile_classification,guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,
   sourceRole:g.source_role,sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,
   guideShortRu:g.guide_short_ru,guideVersion:g.guide_version}} as CanonicalEstimateCatalogItem['parameterSchema'][number];});
 const meaningful=schema.filter(p=>isCanonicalEstimateConsumerSuppliedParameter(p)||isCanonicalEstimateVisibleReplaceableProfile(p)||isCanonicalEstimateVisibleUserResourceSelectionParameter(p));
 const visible=(facts:Json)=>meaningful.filter(p=>resolveCanonicalParameterVisibility({kind:'INCLUSION_GRAPH',ast:(p.visibleWhen??p.requiredWhen??p.constraints.requiredWhen??{kind:'literal',value:true}) as Json},
  new Map(Object.entries(facts)))===true).map(p=>p.parameterId);
 assert.deepEqual(visible({}),[pack.areaId]);assert.deepEqual(visible({[pack.areaId]:75}).sort(),[pack.areaId,pack.siteId,pack.haulId].sort());
 assert(!meaningful.some(p=>p.parameterId===pack.selectorId));assert(!visible({[pack.areaId]:75}).some(id=>standard.parameters.some(p=>p.parameter_id===id)));
 assert.deepEqual(model.formulas.slice(0,26),standard.formulas);assert.equal(model.resources.filter(r=>model.newRowIds.includes(r.row_id)).length,58);
 for(const original of standard.resources){const next=model.resources.find(r=>r.row_id===original.row_id)!;
  for(const key of ['id','formula_id','unit_id','cost_owner_id','procurement_eligible','resource_graph','source_metadata'] as const)assert.deepEqual(next[key],original[key]);}
 const priced=standard.resources.find(r=>r.procurement_eligible&&r.cost_owner_id)!;
 const prices=[{price_key:priced.cost_owner_id,unit_id:priced.unit_id,currency_code:'KGS',unit_price:'2',snapshot_id:'R564_OLD_ROUTE_CONTROL'}];
 const legacyBefore=await core(standard,{...standard.baseline.input_values},'area_m2',prices);
 await assert.rejects(()=>core(model,{...standard.baseline.input_values,[pack.selectorId]:pack.legacyValueRu},'area_m2',prices),
  (error:unknown)=>error instanceof Error && 'code' in error && error.code==='PARAMETER_VALIDATION_FAILED' && error.message===`source-managed parameter cannot be submitted ${pack.selectorId}`);
 const legacyAfter=await core(model,{...standard.baseline.input_values},'area_m2',prices,{[pack.selectorId]:pack.legacyValueRu});
 assert.equal(legacyAfter.rows.length,legacyBefore.rows.length);
 for(const old of legacyBefore.rows){const retained=legacyAfter.rows.find(r=>r.row_id===old.row_id)!;assert(retained);assert.deepEqual(payment(retained),payment(old));}
 assert.deepEqual(legacyAfter.totals,legacyBefore.totals);assert(!legacyAfter.rows.some(r=>model.newRowIds.includes(r.row_id)));
 const facts=asphaltInstallSelectedFactsR564(),selected=await core(model,facts,pack.areaId,prices,runtime);
 const reference=await core(recipe,{...recipe.baseline.input_values,area_m2:75,haul_distance_km:12},'area_m2');
 assert(!selected.rows.some(r=>standard.resources.some(old=>old.row_id===r.row_id)));
 for(const expected of reference.rows){const copied=selected.rows.find(r=>r.row_id===row(expected.row_id));assert(copied,'missing copied recipe row '+expected.row_id);
  assert.deepEqual(payment(copied),payment(expected),'physical recipe drift '+expected.row_id);}
 const quantity=(id:string)=>selected.rows.find(r=>r.row_id===row(id))?.quantity;
 assert.equal(quantity('asphalt:material:hot-dense-fine-mix'),'9.06');assert.equal(quantity('asphalt:labor:road-workers'),'2.886');
 assert.equal(quantity('asphalt:material:road-bitumen'),'0.00102');
 assert.equal(quantity('asphalt:equipment:asphalt-paver'),'0.23925');
 assert.equal(Number(selected.parameters[parameter('asphalt_mix_base_t_per_1000m2')]),96.6);
 assert.equal(Number(selected.parameters[pack.areaId]),75);assert(!Object.hasOwn(selected.parameters,'area_m2'));
 assert.equal(selected.totals.pricedRowCount,0,'old generic prices must not pay new recipe rows');
 for(const gap of pack.gaps)assert(selected.preliminaryNeeds.some(need=>need.row_id===pack.prefix+'open:'+gap.id));
 for(const [id,data]of Object.entries(pack.profile.values)){const p=model.parameters.find(p=>p.parameter_id===parameter(id))!;
  assert.equal(p.truth_metadata.catalogue_owned_lookup_v1,true);assert.equal(p.truth_metadata.runtime_profile_classification,data.classification==='NORMATIVE'?'NORMATIVE':'ASSUMPTION');}
 await assert.rejects(()=>core(model,{...facts,[parameter('asphalt_mix_base_t_per_1000m2')]:1},pack.areaId,[],runtime),(e:Json)=>e.code==='SOURCE_MANAGED_PARAMETER_OVERRIDE_NOT_ALLOWED');
 const zero=await core(model,{[pack.areaId]:0},pack.areaId,[],runtime);
 assert.equal(zero.rows.length,0);assert.equal(zero.preliminaryNeeds.length,0);
 const unknown=await core(model,{...facts,[pack.siteId]:pack.siteUnknownRu},pack.areaId,[],runtime);
 assert(unknown.preliminaryNeeds.some(need=>need.row_id===pack.prefix+'open:project'));
 const tampered=clone(recipe);tampered.formulas[0].expression_source='1';
 assert.throws(()=>appendAsphaltInstallExistingStandardR564({capturedParent:standard,recipeParent:tampered}),/EXACT_CURRENT_PARENT_AND_PINNED_RECIPE_REQUIRED/);
 assert.equal(JSON.stringify(fixture),before,'source capture mutated');
 return {status:'PASS_R564_PURE_STANDARD_AND_PINNED_RECIPE_REPLAY',legacyRows:legacyAfter.rows.length,selectedRows:selected.rows.length,
  selectedNeeds:selected.preliminaryNeeds.map(n=>n.row_id),selectedFacts:facts,referenceRows:reference.rows.length,materialT:quantity('asphalt:material:hot-dense-fine-mix'),
  laborManH:quantity('asphalt:labor:road-workers'),bitumenT:quantity('asphalt:material:road-bitumen'),zeroRows:zero.rows.length,
  originalFixturesUnchanged:true,oldRoutesUnaffected:true,oldAndNewPaymentOverlap:false,protectedNormOverrideRejected:true,
  freshFlow:{publicTitleRu:pack.titleRu,ordinaryFactIds:visible({[pack.areaId]:75}),initialFactIds:visible({}),internalMethodDefault:runtime[pack.selectorId],
   legacyMethodIsPublic:false,oldAreaIsRuntime:false,newAreaIsRuntime:false},fullTechnicalAcceptance:false};
}
if(typeof test==='function')test('preserves the existing standard and transfers the pinned KRER recipe behind one measured method',async()=>{await runAsphaltInstallExistingStandardChecksR564();});
