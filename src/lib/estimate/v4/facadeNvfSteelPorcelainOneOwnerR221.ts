import {facadeVentilatedSteelDefinitionR5 as steelBase,facadeVentilatedSteelCapturedParentR5 as captured,
 facadeVentilatedSteelCompletenessR5 as steelMap,facadeVentilatedSteelPrimarySelectionR5 as steelSelection,
 facadeVentilatedSteelSelectorR5 as selector,facadeVentilatedSteelCatalogR5 as catalogId,
 facadeVentilatedSteelChoiceR5 as steelChoice,facadeVentilatedSteelAreaR5 as steelArea,
 sourceFacts as steelSourceFacts,type FacadeVentilatedSteelReadbackR5} from './facadeVentilatedSteelExistingOwnerR5';
import {facadeSteelSidingPackR2 as steel} from './facadeSteelSidingKrer15R2';
import {facadePorcelainDefinitionR59 as porcelainChild,facadePorcelainCompletenessR59 as porcelainMap,
 facadePorcelainChoiceR59 as porcelainChoice,facadePorcelainPrimaryR59 as porcelainArea,
 facadePorcelainGeometryR59 as porcelainGeometry,facadePorcelainProfileR59 as porcelain} from './facadePorcelainWholeR59';
import {facadeVentilatedPorcelainCompileInputR214 as porcelainInput,
 type FacadeVentilatedPorcelainReadbackR214} from './facadeVentilatedPorcelainExistingOwnerR214';
import {appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {assertCanonicalPrimaryMeasureSelectionV1,type PrimaryMeasureSelectionParameterV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
const contract='gox.facade.existing-nvf.steel-porcelain-one-owner/r221';
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fail:(message:string)=>never=message=>{throw Object.assign(new Error(message),{code:'PARAMETER_VALIDATION_FAILED'});};
export const facadeNvfSteelPorcelainIdentityR221={catalogId,selector,steelChoice,porcelainChoice,steelArea,porcelainArea,
 steelSourceKey:steel.sourceId,porcelainSourceKey:porcelain.sourceId,contract} as const;

/** One physical owner with five explicit mutually exclusive source profiles.
 * Native parameter/row/formula IDs, all source quantities and both leaf maps
 * remain owned by the existing source builders. No second public card. */
export function facadeNvfSteelPorcelainDefinitionR221():AutomaticOwnerDefinition{
 const base=steelBase(),child=porcelainChild(),selection=steelSelection(),when={kind:'equals' as const,parameterId:selector,value:porcelainChoice};
 if(base.parameters.length!==117||base.formulas.length!==140||base.resources.length!==140
  ||child.parameters.length!==80||child.formulas.length!==120||child.resources.length!==120||selection.selections.length!==4)
  fail('NVF_TWO_PROFILE_EXACT_ACCEPTED_LEAF_SHAPES_REQUIRED');
 const parameters=new Set(base.parameters.map(p=>p.parameter_id)),formulas=new Set(base.formulas.map(f=>f.formula_id)),rows=new Set(base.resources.map(r=>r.row_id));
 if(child.parameters.some(p=>parameters.has(p.parameter_id))||child.formulas.some(f=>formulas.has(f.formula_id))||child.resources.some(r=>rows.has(r.row_id)))
  fail('NVF_TWO_PROFILE_IDENTITY_COLLISION_HOLD_NO_ALIAS');
 const parent={...base,parameters:base.parameters.map(p=>{
  if(p.parameter_id!==selector)return p;
  const values=p.constraints_json?.values,guide=p.truth_metadata.guide;
  if(!Array.isArray(values)||values.length!==4||values.some((value,index)=>value!==selection.selections[index]?.selectorValue)
   ||!record(guide)||p.default_value!==null||values.includes(porcelainChoice))fail('NVF_TWO_PROFILE_CURRENT_SELECTOR_IDENTITY_REQUIRED');
  return{...p,constraints_json:{...p.constraints_json,values:[...values,porcelainChoice]},truth_metadata:{...p.truth_metadata,
   guide:{...guide,source_profile_references_v1:[
    {selectorValue:steelChoice,sourceKey:steel.sourceId,sourceSha256:steel.source.sha256,exactMethod:steel.normId},
    {selectorValue:porcelainChoice,sourceKey:porcelain.sourceId,exactMethod:'ST_KG_V_T_PORCELAIN10_SOURCE_METHOD'}]}}};
 })};
 const scoped={...child,parameters:child.parameters.map(p=>porcelainGeometry.some(id=>id===p.parameter_id)
  ?{...p,truth_metadata:{...p.truth_metadata,visible_when:when}}:p)};
 const joined=appendOptionalAutomaticOwnerR1({parent,child:scoped,when}),consumers=buildMasterParameterCalculationConsumers(joined);
 return{...joined,ordinaryParameterIds:[...base.ordinaryParameterIds,...porcelainGeometry],parameters:joined.parameters.map(p=>({...p,
  truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}
export function facadeNvfSteelPorcelainPrimarySelectionR221(){
 const base=steelSelection();return{...base,selections:[...base.selections,{selectorValue:porcelainChoice,primaryMeasureParameterId:porcelainArea,unitId:'m2'}]};
}
export function facadeNvfSteelPorcelainCompletenessR221(){
 const base=steelMap(),child=porcelainMap();
 return{...base,entries:[...base.entries,...child.entries],componentMaps:[base,child],generatedFromCurrentRows:false,
  fullTechnicalAcceptance:false,newFULL:0};
}
function schema(model:AutomaticOwnerDefinition):PrimaryMeasureSelectionParameterV1[]{return model.parameters.map(p=>{
 const t=p.truth_metadata,provenance=t.provenance,consumers=t.formula_consumers;
 if(typeof t.visibility_role!=='string'||typeof t.value_source_role!=='string'||(provenance!==undefined&&!record(provenance))
  ||!Array.isArray(consumers)||!consumers.every((id:unknown)=>typeof id==='string'))fail('NVF_TWO_PROFILE_PRIMARY_SCHEMA_REQUIRED');
 return{parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,
  provenance,constraints:p.constraints_json??undefined,formulaConsumers:consumers};
});}
export type FacadeNvfSteelPorcelainReadbackR221=Readonly<
 {profile:'steel';value:FacadeVentilatedSteelReadbackR5}|{profile:'porcelain';value:FacadeVentilatedPorcelainReadbackR214}>;
export type FacadeNvfSteelPorcelainCompileOptionsR221=Readonly<{readback?:FacadeNvfSteelPorcelainReadbackR221;
 parentPrimaryMeasure?:unknown;rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];priceItems?:CanonicalEstimateCompileCoreInput['priceItems']}>;
/** Same source readback owners and one canonical core. This only binds the two
 * new methods; retained legacy definitions remain present and unchanged for
 * their existing common producer. No old root quantities/prices are inherited. */
export function facadeNvfSteelPorcelainNewMethodInputR221(input:Record<string,unknown>,options:FacadeNvfSteelPorcelainCompileOptionsR221={}):CanonicalEstimateCompileCoreInput{
 const value=input[selector];
 if(value!==steelChoice&&value!==porcelainChoice)fail('NVF_TWO_PROFILE_EXPLICIT_NEW_SOURCE_CHOICE_REQUIRED');
 const geometry=value===steelChoice?[steelArea]:porcelainGeometry;
 if(Object.keys(input).some(id=>id!==selector&&!geometry.some(key=>key===id)))fail('NVF_TWO_PROFILE_SELECTED_PUBLIC_GEOMETRY_ONLY');
 const model=facadeNvfSteelPorcelainDefinitionR221(),primary=assertCanonicalPrimaryMeasureSelectionV1({
  selectionMetadata:facadeNvfSteelPorcelainPrimarySelectionR221(),submittedParameters:input,parameterSchema:schema(model),parentPrimaryMeasure:options.parentPrimaryMeasure});
 if(primary.kind!=='RESOLVED')fail('NVF_TWO_PROFILE_PRIMARY_SELECTION_REQUIRED');
 let confirmed:CanonicalEstimateCompileCoreInput['confirmedParameters'];
 if(value===porcelainChoice){
  if(options.readback&&options.readback.profile!=='porcelain')fail('NVF_TWO_PROFILE_READBACK_OWNER_MISMATCH');
  confirmed=porcelainInput(input,{readback:options.readback?.value,parentPrimaryMeasure:options.parentPrimaryMeasure}).confirmedParameters;
 }else{
  if(options.readback&&options.readback.profile!=='steel')fail('NVF_TWO_PROFILE_READBACK_OWNER_MISMATCH');
  confirmed=options.readback?steelSourceFacts(input,options.readback.value):{};
 }
 return{operation:'recalculate',compilerVersion:contract,catalogId,primaryMeasureParameterId:primary.primaryMeasure.parameterId,
  parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
  submittedParameters:input,confirmedParameters:confirmed,rowOverrides:options.rowOverrides??{},priceItems:options.priceItems??[],
  currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:hash};
}
export function compileFacadeNvfSteelPorcelainNewMethodR221(input:Record<string,unknown>,options:FacadeNvfSteelPorcelainCompileOptionsR221={}){
 return compileCanonicalEstimateCore(facadeNvfSteelPorcelainNewMethodInputR221(input,options));
}
export const facadeNvfSteelPorcelainCapturedParentR221=captured;
