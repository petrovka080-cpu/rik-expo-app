import parent from '../../../../data/estimate-benchmarks/source-packs/standard-asphalt-compaction-retained-parent-r567.json';
import pack from '../../../../data/estimate-benchmarks/source-packs/asphalt-compaction-three-roller-transfer-r567.json';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

import type {CanonicalEstimateParameterDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
type Json = Record<string, any>;
type AuthoringParameter = CanonicalEstimateParameterDefinition & Json & {ordinal:number;title_ru:string;constraints_json:Json;truth_metadata:Json};
export const STANDARD_ASPHALT_COMPACTION_R567_CATALOG_ID = pack.standardCatalogId;
export const STANDARD_ASPHALT_COMPACTION_R567_METHOD = 'asphalt_compaction_method_r567';
export const STANDARD_ASPHALT_COMPACTION_R567_PROFILE = pack.profileVersion;
export const STANDARD_ASPHALT_COMPACTION_R567_AREA = 'r567_compaction_area_m2';
export const STANDARD_ASPHALT_COMPACTION_R567_PACK = pack;
const clone = <T>(x:T):T => JSON.parse(JSON.stringify(x));
const selected = {kind:'selected',parameterId:STANDARD_ASPHALT_COMPACTION_R567_METHOD,value:STANDARD_ASPHALT_COMPACTION_R567_PROFILE};
const legacy = {kind:'not',operand:selected};
const and = (...operands:Json[]):Json => ({kind:'and',operands});
const id = (old:string):string => `r567_compaction_${old}`;
const actual = new Set<string>(pack.actualProjectParameterIds);
const parameterMap = Object.fromEntries(pack.parameters.map(p => [p.parameter_id,id(p.parameter_id)]));
const remap = (value:any):any => typeof value==='string' ? parameterMap[value]??value
  : Array.isArray(value) ? value.map(remap)
  : value && typeof value==='object' ? Object.fromEntries(Object.entries(value).map(([key,child])=>[key,remap(child)])) : value;
const expression = (source:string):string => source.replace(/[A-Za-z_][A-Za-z_0-9]*/gu, token=>parameterMap[token]??token);
export function rebindStandardAsphaltCompactionInclusionR567(node:Json):Json{
  const next=clone(node);
  for(const [key,value] of Object.entries(next)){
    if((key==='parameterId'||(key==='id'&&next.kind==='parameter'))&&typeof value==='string')next[key]=parameterMap[value]??value;
    else if(key==='expression'&&typeof value==='string')next[key]=expression(value);
    else if(Array.isArray(value))next[key]=value.map(v=>v&&typeof v==='object'?rebindStandardAsphaltCompactionInclusionR567(v):v);
    else if(value&&typeof value==='object')next[key]=rebindStandardAsphaltCompactionInclusionR567(value);
  }
  return next;
}


/** The newly named public work explicitly selects this versioned preliminary
 * three-roller profile. The structural default belongs only to NEW definitions;
 * saved revisions remain on their immutable old definition. The retained legacy
 * rows are compatibility/history evidence, never a new public method option. */
export function buildStandardAsphaltCompactionR567(){
  if(parent.definition.id!==pack.capturedStandardDefinitionId || parent.resources.length!==10
    || pack.resources.length!==49 || pack.formulas.length!==11) throw Error('R567_CAPTURE_SHAPE_DRIFT');
  const oldParameters=parent.parameters.map(p=>({...clone(p),required:false,
    constraints_json:{...clone(p.constraints_json),requiredWhen:clone(legacy)},
    truth_metadata:{...clone(p.truth_metadata),visible_when:{kind:'literal',value:false},
      visibility_condition:{kind:'literal',value:false}}}));
  const selector={parameter_id:STANDARD_ASPHALT_COMPACTION_R567_METHOD,ordinal:8,value_type:'enum',unit_id:null,
    title_ru:pack.publicMethodLabelRu,required:false,default_value:STANDARD_ASPHALT_COMPACTION_R567_PROFILE,
    constraints_json:{values:[STANDARD_ASPHALT_COMPACTION_R567_PROFILE]},
    truth_metadata:{contract:pack.contract,visibility_role:'INTERNAL_ONLY',value_source_role:'SOURCE_BACKED_PRELIMINARY_PROFILE',
      runtime_profile_value:true,runtime_profile_classification:'RUNTIME_STRUCTURAL_DEFAULT',
      semantic_parameter_key:STANDARD_ASPHALT_COMPACTION_R567_METHOD,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
      guide:{guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION',source_document:pack.sourceKey,
        source_locator:'\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u0432\u0438\u0434 \u0440\u0430\u0431\u043e\u0442 \u044f\u0432\u043d\u043e \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u044f\u0435\u0442 \u043f\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c \u0442\u0440\u0451\u0445 \u043a\u0430\u0442\u043a\u043e\u0432 \u0438 \u0435\u0433\u043e \u0432\u0435\u0440\u0441\u0438\u044e.',
        source_snapshot_hash:pack.sourceArtifactSha256,guide_version:pack.contract,guide_validation_policy:'MANDATORY_BLOCK',
        guide_options:[{value:STANDARD_ASPHALT_COMPACTION_R567_PROFILE,rule_ru:pack.publicMethodLabelRu}]},
      profile_status:pack.profileStatus,full_technical_acceptance:false}};
  const newParameters=pack.parameters.map((p,ordinal)=>{
    const original=p.parameter_id,field=id(original),project=actual.has(original),value=project?null:(pack.profileValues as Json)[original];
    const metadata=clone(p.truth_metadata) as Json;
    const constraints:Json={...clone(p.constraints_json),requiredWhen:clone(selected)};
    if(project&&original!=='area_m2')constraints.min=0;
    if(!project){constraints.min=value;constraints.max=value;}
    // The consumer session contains admitted user facts only, never this
    // protected internal selector. UI visibility uses actual object facts;
    // calculation applicability keeps the independently protected method gate.
    const visible=project ? original==='area_m2' ? {kind:'literal',value:true}
      : {kind:'greater_than',parameterId:STANDARD_ASPHALT_COMPACTION_R567_AREA,value:0}
      : {kind:'literal',value:false};
    return {...clone(p),parameter_id:field,ordinal:9+ordinal,required:false,default_value:value,constraints_json:constraints,
      truth_metadata:{...metadata,contract:pack.contract,semantic_parameter_key:field,
        visible_when:clone(visible),visibility_condition:clone(visible),
        visibility_role:project?'USER_INPUT':'INTERNAL_ONLY',
        value_source_role:project?'CONDITIONAL_PROJECT_FACT':metadata.runtime_profile_classification==='NORMATIVE'
          ?'SELECTED_EQUIPMENT_PASSPORT':metadata.runtime_profile_classification==='DERIVED'?'BACKEND_DERIVED':'SOURCE_BACKED_PRELIMINARY_PROFILE',
        hidden_default_forbidden:project,runtime_profile_value:!project,
        provenance:{consumer_input_role_v1:project?'OBJECT_FACT':'APPLICATION_TECHNICAL'},
        guide:{...metadata.guide,guide_kind:project?'PROJECT_DEFINED':metadata.guide.guide_kind,
          source_role:project?'PROJECT_DOCUMENTATION':metadata.guide.source_role,
          guide_validation_policy:project?'MANDATORY_BLOCK':'PROTECTED_VERSIONED_PROFILE_CONSTANT',
          source_snapshot_hash:pack.sourceArtifactSha256,
          guide_short_ru:project ? original==='area_m2'
            ? '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u043d\u0443\u044e \u043f\u043b\u043e\u0449\u0430\u0434\u044c \u0443\u0436\u0435 \u0443\u043b\u043e\u0436\u0435\u043d\u043d\u043e\u0433\u043e \u0430\u0441\u0444\u0430\u043b\u044c\u0442\u043e\u0431\u0435\u0442\u043e\u043d\u0430, \u043c\u00b2.'
            : original==='traffic_control_setup_count'
              ? '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0444\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0447\u0438\u0441\u043b\u043e \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0445 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u043e\u0432 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438 \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f; 0 \u2014 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u0430\u044f \u0443\u0441\u043b\u0443\u0433\u0430 \u043d\u0435 \u043d\u0443\u0436\u043d\u0430.'
              : '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0444\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0447\u0438\u0441\u043b\u043e \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0445 \u043c\u043e\u0431\u0438\u043b\u0438\u0437\u0430\u0446\u0438\u0439 \u043a\u0430\u0436\u0434\u043e\u0433\u043e \u043a\u0430\u0442\u043a\u0430; 0 \u2014 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u0430\u044f \u0443\u0441\u043b\u0443\u0433\u0430 \u043d\u0435 \u043d\u0443\u0436\u043d\u0430.'
            : metadata.guide.guide_short_ru},
        profile_status:pack.profileStatus,profile_version:pack.profileVersion,full_technical_acceptance:false}};
  });
  const formulas=[...clone(parent.formulas),...pack.formulas.map(f=>{
    const source=expression(f.expression_source),compiled=compileFormulaGraph(source);
    return {...clone(f),expression_source:source,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,
      ast_sha256:estimateDeterministicHash(compiled.ast)};
  })];
  const oldResources=parent.resources.map(r=>{
    const next={...clone(r),inclusion_ast:and(legacy,clone(r.inclusion_ast))};
    return {...next,row_sha256:estimateDeterministicHash(next)};
  });
  const profileResources=pack.resources.map((r,ordinal)=>{
    let inclusion=and(selected,{kind:"present",parameterId:STANDARD_ASPHALT_COMPACTION_R567_AREA},rebindStandardAsphaltCompactionInclusionR567(r.inclusion_ast));
    if(r.formula_id==='asphalt_compaction_mobilization_v2' || r.formula_id==='asphalt_compaction_traffic_control_v2'){
      const original=r.formula_id==='asphalt_compaction_mobilization_v2'?'mobilization_count_per_unique_machine':'traffic_control_setup_count';
      inclusion=and(inclusion,{kind:'formula_greater_than',expression:id(original),unitId:r.unit_id,value:0});
    }
    const next={...clone(r),ordinal:10+ordinal,inclusion_ast:inclusion,resource_graph:remap(clone(r.resource_graph))};
    return {...next,row_sha256:estimateDeterministicHash(next)};
  });
  const parameters:AuthoringParameter[]=[...oldParameters,selector,...newParameters],resources=[...oldResources,...profileResources];
  const runtimeInput:Json={[STANDARD_ASPHALT_COMPACTION_R567_METHOD]:STANDARD_ASPHALT_COMPACTION_R567_PROFILE},
    runtimeClassification:Json={[STANDARD_ASPHALT_COMPACTION_R567_METHOD]:'RUNTIME_STRUCTURAL_DEFAULT'},
    runtimeSourceIds:Json={[STANDARD_ASPHALT_COMPACTION_R567_METHOD]:[pack.sourceKey]};
  for(const p of pack.parameters)if(!actual.has(p.parameter_id)){
    const field=id(p.parameter_id);runtimeInput[field]=(pack.profileValues as Json)[p.parameter_id];
    runtimeClassification[field]=(pack.profileClassification as Json)[p.parameter_id];
    runtimeSourceIds[field]=[(pack.sourceKey)];
  }
  return {catalogId:pack.standardCatalogId,parameters,formulas,resources,runtimeInput,runtimeClassification,runtimeSourceIds,
    ordinaryParameterIds:[STANDARD_ASPHALT_COMPACTION_R567_AREA,
      id('traffic_control_setup_count'),id('mobilization_count_per_unique_machine')],
    oldResourceRowIds:parent.resources.map(r=>r.row_id),profileResourceRowIds:pack.resources.map(r=>r.row_id),
    fullTechnicalAcceptance:false,profileStatus:pack.profileStatus};
}

export function standardAsphaltCompactionR567AcceptanceInput(areaM2=5000):Json{
  return {[STANDARD_ASPHALT_COMPACTION_R567_METHOD]:STANDARD_ASPHALT_COMPACTION_R567_PROFILE,
    [STANDARD_ASPHALT_COMPACTION_R567_AREA]:areaM2,
    [id('traffic_control_setup_count')]:1,[id('mobilization_count_per_unique_machine')]:1};
}

/** Pure use of the existing compiler, never another calculation engine. The
 * pinned profile cannot be changed by a scalar customer norm override. */
export async function compileStandardAsphaltCompactionR567(submitted:Json){
  const definition=buildStandardAsphaltCompactionR567();
  for(const [field,value] of Object.entries(definition.runtimeInput))if(Object.hasOwn(submitted,field)
    && String(submitted[field])!==String(value))throw Error('R567_PROTECTED_PROFILE_CONSTANT:'+field);
  return compileCanonicalEstimateCore({operation:'compile',catalogId:definition.catalogId,
    compilerVersion:pack.contract,primaryMeasureParameterId:STANDARD_ASPHALT_COMPACTION_R567_AREA,
    parameterDefinitions:definition.parameters as unknown as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
    formulaDefinitions:definition.formulas as unknown as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
    resourceDefinitions:definition.resources as unknown as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
    submittedParameters:submitted,confirmedParameters:definition.runtimeInput,currencyCode:'KGS',priceItems:[],maximumResourceRows:59,
    hashJson:async value=>estimateDeterministicHash(value)});
}
