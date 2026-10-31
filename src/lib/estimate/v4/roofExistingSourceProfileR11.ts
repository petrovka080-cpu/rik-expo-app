import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput as CoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalApprovedBaselineRuntimeParameters,canonicalApprovedBaselineRuntimeDefaultValue} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {resolveCanonicalEstimateProfileInputsS2723} from '../backendPlatform/canonicalEstimateProfileInputResolverS2723';
import {assertCanonicalPrimaryMeasureSelectionV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';

type Json=Record<string,any>;
export const roofSourceProfilePackR11=require('../../../../data/estimate-benchmarks/source-packs/roof-existing-source-profile-r11.json') as Json;
const fixture=require('../../../../data/estimate-benchmarks/fixtures/roof-existing-source-profile-r11.json') as {captures:Json[]};
const copy=<T,>(v:T):T=>structuredClone(v);
const check=(v:unknown,code:string):void=>{if(!v)throw Error('ROOF_EXISTING_SOURCE_PROFILE_R11_'+code);};
export const roofSourceProfileCaptureR11=(catalogId:string):Json=>{
 const c=fixture.captures.find(c=>c.definition.catalog_id===catalogId);check(c,'EXACT_CURRENT_CAPTURE_REQUIRED');return copy(c!);
};
export const roofSourceProfileEntryR11=(catalogId:string):Json=>{
 const e=roofSourceProfilePackR11.entries.find((e:Json)=>e.catalogId===catalogId);check(e,'EXACT_EXISTING_CARD_REQUIRED');return copy(e!);
};
/** Reuse current exact definitions. This changes input authority and declared
 * source selection only: no row, rate, formula, default or project fact added. */
/** Typed envelope of the same exact captured producer. Legacy ancillary
 * metadata retains its existing Json shape; core arrays and identity are
 * explicit for existing whole-family adapters. No implementation changes. */
export type RoofExistingSourceProfileModelR11=Json&{
 definition:Json&{catalog_id:string;id:string;definition_sha256:string;applicability:Json};
 parameters:CoreInput['parameterDefinitions'];
 formulas:CoreInput['formulaDefinitions'];
 resources:CoreInput['resourceDefinitions'];
};
export function buildRoofExistingSourceProfileR11(current:Json):RoofExistingSourceProfileModelR11;
export function buildRoofExistingSourceProfileR11(current:Json):Json{
 const entry=roofSourceProfileEntryR11(current.definition.catalog_id),frozen=roofSourceProfileCaptureR11(entry.catalogId);
 check(current.definition.id===entry.definitionId&&current.definition.definition_sha256===entry.definitionSha256&&hash(current)===hash(frozen),'EXACT_CURRENT_PARENT_DRIFT');
 const next=copy(current);
 check(Object.keys(entry.geometryRoleChanges??{}).length===1
  &&Object.hasOwn(entry.geometryRoleChanges,roofSourceProfilePackR11.primaryMeasureId),'EXACT_ONE_PRIMARY_MEASUREMENT_NORMALIZATION_REQUIRED');
 for(const p of next.parameters){
  if(Object.hasOwn(entry.geometryRoleChanges??{},p.parameter_id)){
   const declaration=entry.geometryRoleChanges[p.parameter_id];
   check(hash(p.truth_metadata)===hash(declaration.capturedTruthMetadata),'CAPTURED_REAL_GEOMETRY_TRUTH_DRIFT');
   check(p.parameter_id===roofSourceProfilePackR11.primaryMeasureId&&p.value_type==='decimal'&&p.unit_id==='m2'&&p.default_value===null
    &&p.truth_metadata.visibility_role==='USER_INPUT'&&p.truth_metadata.value_source_role==='USER_MEASURED'
    &&p.truth_metadata.provenance?.consumer_input_role_v1==='OBJECT_GEOMETRY','EXACT_LEGACY_MEASUREMENT_ROLE_REQUIRED');
   p.truth_metadata={...p.truth_metadata,provenance:{...p.truth_metadata.provenance,consumer_input_role_v1:'OBJECT_FACT'}};
  }
  if(Object.hasOwn(entry.authorityChanges,p.parameter_id)){
   check(hash(p.truth_metadata)===hash(entry.authorityChanges[p.parameter_id].capturedTruthMetadata),'CAPTURED_CONTEXT_TRUTH_DRIFT');
   p.truth_metadata={...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
    provenance:{...p.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'}};
  }
  if(p.parameter_id===roofSourceProfilePackR11.selectorId){
   check(hash(p.truth_metadata)===hash(entry.capturedSelectorTruthMetadata),'CAPTURED_SELECTOR_TRUTH_DRIFT');
   p.truth_metadata={...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'SOURCE_BACKED_PRELIMINARY_PROFILE',
    provenance:{...p.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'},
    guide:{...p.truth_metadata.guide,source_role:'SOURCE_BACKED_PRELIMINARY_PROFILE'}};
  }
  if(Object.hasOwn(entry.initialFormVisibilityChanges??{},p.parameter_id)){
   const visibility=entry.initialFormVisibilityChanges[p.parameter_id],old=frozen.parameters.find((old:Json)=>old.parameter_id===p.parameter_id);
   check(hash(old.truth_metadata)===hash(visibility.capturedTruthMetadata),'CAPTURED_INITIAL_FORM_TRUTH_DRIFT');
   if(visibility.kind==='PRIMARY_ALWAYS_MEASURABLE'){
    check(p.parameter_id===roofSourceProfilePackR11.primaryMeasureId,'ONLY_REAL_PRIMARY_CAN_BE_ALWAYS_MEASURABLE');
    // The ordinary editor falls back to constraints.requiredWhen if this
    // field is absent. Keep existing requiredWhen, but make this real input
    // explicitly visible before its source selector can be resolved.
    p.truth_metadata={...p.truth_metadata,visible_when:{kind:'literal',value:true}};
   }else{
    check(visibility.kind==='HISTORICAL_FIELDS_VISIBLE_ONLY_FOR_EXPLICIT_LEGACY_BRANCH'
     &&p.truth_metadata.visibility_role==='USER_INPUT'&&!p.parameter_id.startsWith('m212_roof_')
     &&next.definition.applicability.primaryMeasureSelectionV1.selections.some((s:Json)=>s.selectorValue===visibility.legacySelectorValue
      &&s.primaryMeasureParameterId!==roofSourceProfilePackR11.primaryMeasureId),'EXACT_EXISTING_LEGACY_VISIBILITY_REQUIRED');
    const explicitLegacy={kind:'selected',parameterId:roofSourceProfilePackR11.selectorId,value:visibility.legacySelectorValue};
    p.truth_metadata={...p.truth_metadata,visible_when:old.truth_metadata.visible_when
     ?{kind:'and',operands:[explicitLegacy,copy(old.truth_metadata.visible_when)]}:explicitLegacy};
   }
  }
 }
 next.definition.applicability={...next.definition.applicability,sourceProfileSelectionV1:copy(entry.sourceProfileSelectionV1)};
 for(const field of ['formulas','resources','bindings','normativeSources','normativeLocators','baseline','contentPassport'])
  check(hash(next[field])===hash(current[field]),'UNDECLARED_'+field.toUpperCase()+'_DELTA');
 check(next.parameters.length===current.parameters.length,'NEW_PARAMETER_FORBIDDEN');
 return next;
}
export const roofSourceProfileSchemaR11=(model:Json)=>model.parameters.map((p:Json)=>({parameterId:p.parameter_id,valueType:p.value_type,
 unitId:p.unit_id,visibilityRole:p.truth_metadata.visibility_role,valueSourceRole:p.truth_metadata.value_source_role,
 provenance:p.truth_metadata.provenance,constraints:p.constraints_json,defaultValue:p.default_value,
 formulaConsumers:model.formulas.filter((f:Json)=>f.input_parameter_ids.includes(p.parameter_id)).map((f:Json)=>f.formula_id)}));

/** Independent areas are measurements, never copied from the upper covering.
 * These are existing parameters of the accepted whole subworks. The immutable
 * family declaration limits ordinary input without supplying project approval. */
export function roofExistingSourceMeasuredGeometryR11(model:Json):readonly string[]{
 const declared=roofSourceProfileEntryR11(model.definition.catalog_id).measuredGeometry;
 check(Array.isArray(declared)&&declared.length>0&&declared.length<=10,'SIMPLE_GEOMETRY_DECLARATION_REQUIRED');
 const ids=new Set<string>();
 for(const field of declared){
  const p=model.parameters.find((p:Json)=>p.parameter_id===field.parameterId),truth=p?.truth_metadata;
  check(typeof field.parameterId==='string'&&!ids.has(field.parameterId)&&p?.value_type==='decimal'&&p.unit_id===field.unitId
   &&p.default_value===null&&truth.visibility_role==='USER_INPUT'&&truth.value_source_role==='USER_MEASURED'
   &&truth.provenance?.consumer_input_role_v1==='OBJECT_FACT','EXACT_EXISTING_MEASURED_GEOMETRY_REQUIRED');
  ids.add(field.parameterId);
 }
 check(ids.has(roofSourceProfilePackR11.primaryMeasureId),'PRIMARY_GEOMETRY_DECLARATION_REQUIRED');
 return [...ids];
}

/** Same trusted baseline + ordinary R10 source resolver used by the real worker.
 * This wrapper deliberately has no arbitrary confirmedParameters import option.
 * Missing actual project/PPR/base/compatibility facts remain canonical needs. */
export function prepareRoofExistingSourceInputsR11(model:Json,userGeometry:Readonly<Record<string,unknown>>){
 const permitted=new Set(roofExistingSourceMeasuredGeometryR11(model));
 check(Object.keys(userGeometry).every(id=>permitted.has(id)),'ONLY_ACTUAL_SIMPLE_GEOMETRY_CAN_BE_SUBMITTED');
 const baseline=canonicalApprovedBaselineRuntimeParameters(model.baseline);
 const schema=roofSourceProfileSchemaR11(model);
 const profile=resolveCanonicalEstimateProfileInputsS2723({catalogId:model.definition.catalog_id,
  sourceProfileSelectionMetadata:model.definition.applicability.sourceProfileSelectionV1,parameterSchema:schema,
  confirmedParameters:baseline,effectiveUserParameters:userGeometry});
 const selected=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:model.definition.applicability.primaryMeasureSelectionV1,
  parameterSchema:schema,submittedParameters:userGeometry,confirmedParameters:profile.confirmedParameters});
 check(selected.kind==='RESOLVED','EXACT_SOURCE_PRIMARY_REQUIRED');
 return{baseline,profile,primary:selected.kind==='RESOLVED'?selected.primaryMeasure.parameterId:null};
}
export function compileRoofExistingSourceProfileR11(model:Json,userGeometry:Readonly<Record<string,unknown>>,
 options:{rowOverrides?:CoreInput['rowOverrides'];operation?:CoreInput['operation']}={}){
 const admitted=prepareRoofExistingSourceInputsR11(model,userGeometry);
 return compileCanonicalEstimateCore({operation:options.operation??(options.rowOverrides?'recalculate':'compile'),catalogId:model.definition.catalog_id,
  compilerVersion:roofSourceProfilePackR11.contract,primaryMeasureParameterId:admitted.primary,parameterDefinitions:model.parameters,
  formulaDefinitions:model.formulas,resourceDefinitions:model.resources,submittedParameters:{...userGeometry},
  confirmedParameters:{...admitted.profile.confirmedParameters},rowOverrides:options.rowOverrides??{},currencyCode:'KGS',priceItems:[],
  sourceProfileSelectionV1:{metadata:model.definition.applicability.sourceProfileSelectionV1,effectiveUserParameters:userGeometry},
  maximumResourceRows:512,hashJson:async value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))});
}
/** Existing GET-catalog projection for a worker-plan case, not a new endpoint.
 * Published runtime-eligible baseline defaults only; fixtures are never exposed. */
export function roofExistingSourceCatalogR11(model:Json,releaseId:string):CanonicalEstimateCatalogItem{
 const entry=roofSourceProfileEntryR11(model.definition.catalog_id);
 return{catalogId:entry.catalogId,releaseId,namespace:'global',domain:'roofing',workKey:model.definition.passport.workKey,
  titleRu:model.definition.passport.canonicalRuName,definitionVersion:model.definition.definition_version,
  applicability:model.definition.applicability,professionalMetadata:model.definition.source_metadata,
  parameterSchema:model.parameters.map((p:Json)=>{
   const t=p.truth_metadata,g=t.guide??{};
   return{parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,titleRu:p.title_ru,required:p.required,
    defaultValue:p.default_value??canonicalApprovedBaselineRuntimeDefaultValue(model.baseline,p.parameter_id),constraints:p.constraints_json,
    semanticParameterKey:t.semantic_parameter_key,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,
    provenance:t.provenance,visibleWhen:t.visible_when,requiredWhen:t.required_when,preliminaryCompilationAllowed:t.preliminary_compilation_allowed===true,
    formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,
    runtimeProfileClassification:model.baseline.input_classification[p.parameter_id],
    guide:{guideKind:g.guide_kind,guideShortRu:g.guide_short_ru,sourceRole:g.source_role,sourceDocument:g.source_document,
     sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideVersion:g.guide_version,
     guideValidationPolicy:g.guide_validation_policy,applicability:g.applicability,verifiedAt:g.verified_at}};
  })} as CanonicalEstimateCatalogItem;
}
