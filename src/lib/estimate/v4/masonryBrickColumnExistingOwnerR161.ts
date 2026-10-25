import {buildMasonryBrickColumnWholeNormalR117,masonryBrickColumnWholePackR117 as pack} from './masonryBrickColumnSixProfileWholeNormalR117';
import type {AutomaticOwnerDefinition,AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';

type Json=Record<string,unknown>;
type Resource=AutomaticOwnerDefinition['resources'][number];
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const and=(...operands:unknown[]):Json=>({kind:'and',operands});
function check(v:unknown,code:string):asserts v{if(!v)throw Error('MASONRY_COLUMN_EXISTING_R161_'+code);}
export const COLUMN_CATALOG_R161='canonical-work:base:masonry_interior_column_lay_standard';
export const COLUMN_LEGACY_R161='Сохранённый предварительный состав кладочного столба';
const volume=pack.measurement.primaryId,height=pack.measurement.heightId,kind=pack.measurement.physicalKindId;
const select=(value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId:kind,value});
const legacy=select(COLUMN_LEGACY_R161);
const own:AutomaticInclusionCondition={kind:'or',operands:pack.measurement.physicalKindChoicesRu.map(select)};
const rehash=(row:Resource):Resource=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:hash(body)};};
export function masonryBrickColumnPrimarySelectionR161(){return{contract:'canonical-primary-measure-selection/v1',selectorParameterId:kind,
 selections:[{selectorValue:COLUMN_LEGACY_R161,primaryMeasureParameterId:'q',unitId:'m2'},
 ...pack.measurement.physicalKindChoicesRu.map(selectorValue=>({selectorValue,primaryMeasureParameterId:volume,unitId:'m3'}))]};}

/** One existing column owner, unchanged R117 whole six profiles. A real own
 * measured m3 is never q/m2 or column count. Public shape is not project approval.
 * The same33 APPLICATION_TECHNICAL readback fields retain their original authority;
 * this composition neither provides a producer nor confirms them. */
export function masonryBrickColumnQuantityPreimageR166(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 check(parent.parameters.length===1&&parent.parameters[0]?.parameter_id==='q'&&parent.parameters[0].unit_id==='m2'
  &&parent.parameters[0].default_value===100&&parent.formulas.length===59&&parent.resources.length===59,'EXACT_CURRENT_PARENT');
 const child=buildMasonryBrickColumnWholeNormalR117();
 check(child.parameters.length===104&&child.formulas.length===118&&child.resources.length===118,'EXACT_REUSED_WHOLE');
 const prior={...parent,parameters:parent.parameters.map(p=>({...p,required:false,default_value:null,
  constraints_json:{...p.constraints_json,requiredWhen:and(legacy,{kind:'literal',value:true}),forbiddenWhen:own},
  truth_metadata:{...p.truth_metadata,visible_when:and({kind:'selected',parameterId:kind,value:COLUMN_LEGACY_R161},{kind:'literal',value:true})}})),
  resources:parent.resources.map(row=>rehash({...row,inclusion_ast:and(legacy,row.inclusion_ast)}))};
 const scoped={...child,parameters:child.parameters.map(p=>{
  if(p.parameter_id===kind)return{...p,constraints_json:{...p.constraints_json,values:[COLUMN_LEGACY_R161,...pack.measurement.physicalKindChoicesRu]},
   truth_metadata:{...p.truth_metadata,visible_when:{kind:'literal',value:true},provenance:{...(record(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'OBJECT_FACT',requested_physical_scope_only:true,project_approval_claimed:false}}};
  if(p.parameter_id===volume||p.parameter_id===height)return{...p,truth_metadata:{...p.truth_metadata,visible_when:own,
   provenance:{...(record(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'OBJECT_FACT',own_geometry_not_q_conversion:true,project_approval_claimed:false}}};
  return p;
 })};
 const joined=appendOptionalAutomaticOwnerR1({parent:prior,child:scoped,when:own});
 const consumers=buildMasterParameterCalculationConsumers(joined);
 check(joined.parameters.length===105&&joined.formulas.length===177&&joined.resources.length===177,'WHOLE_CURRENT_COMPOSITION_COUNTS');
 return{...joined,ordinaryParameterIds:['q',volume,height,kind],parameters:joined.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,
  formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}


/** Cost successor only. The quantity preimage above is the exact accepted R166
 * constructor; no old source pack, calculation or public owner is rewritten. */
export const COLUMN_NATIVE_PAYMENT_SCOPE_R166="Цельный труд выбранной кладки оплачивается один раз; известные исходные материалы и полные машиночасы имеют собственных владельцев стоимости; машинист отдельно не оплачивается; закупка не подтверждена";
export function masonryBrickColumnExistingDefinitionR161(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 const before=masonryBrickColumnQuantityPreimageR166(parent);
 type Profile=typeof pack.profiles[number];type Native=Profile['rows'][number];
 const native=new Map<string,{profile:Profile;row:Native}>();
 for(const profile of pack.profiles)for(const row of profile.rows)native.set(profile.prefix+':'+row.id,{profile,row});
 check(native.size===44,'EXACT_NATIVE_COST_ROSTER');
 const paymentFacts=[...pack.technicalReadbackFacts,...pack.additionalTechnicalReadbackFacts].filter(f=>f.id.endsWith('_payment'));
 const paymentIds=new Set<string>(paymentFacts.map(f=>f.id));
 check(paymentIds.size===3,'EXACT_EXISTING_PAYMENT_SCOPES');
 const parameters=before.parameters.map(parameter=>{
  if(!paymentIds.has(parameter.parameter_id))return parameter;
  check(parameter.value_type==='enum'&&record(parameter.constraints_json)&&Array.isArray(parameter.constraints_json.values)
   &&parameter.constraints_json.values.length===1,'EXACT_PREVIOUS_PAYMENT_SCOPE');
  const historical=paymentFacts.find(fact=>fact.id===parameter.parameter_id);
  check(historical&&record(historical)&&Array.isArray(historical.values)
   &&JSON.stringify(parameter.constraints_json.values)===JSON.stringify(historical.values),'EXACT_HISTORICAL_PAYMENT_LITERAL');
  return{...parameter,constraints_json:{...parameter.constraints_json,values:[COLUMN_NATIVE_PAYMENT_SCOPE_R166]}};
 });
 const resources=before.resources.map(resource=>{
  const item=native.get(resource.row_id);if(!item)return resource;
  const {profile,row}=item,metadata=resource.source_metadata;
  check(record(metadata)&&metadata.exact_column===profile.normId&&metadata.source_artifact_sha256===pack.source.sha256,'EXACT_NATIVE_COST_SOURCE');
  check(resource.unit_id===row.unitId&&resource.cost_owner_id===resource.row_id,'EXACT_NATIVE_COST_OWNER_UNIT');
  const operator=row.id==='operator-information',machine=row.category==='equipment';
  if(operator||row.id==='whole-masonry-labour'){check(resource.resource_graph.costTreatment===(operator?'INFORMATIONAL_SCOPE':'OWN_COST'),'EXACT_UNCHANGED_LABOUR_OPERATOR_COST');return resource;}
  if(machine)check(row.unitId==='machine_hour'&&typeof row.resourceCode==='string','EXACT_NATIVE_MACHINE_CODE_UNIT');
  return rehash({...resource,resource_graph:{...resource.resource_graph,costTreatment:operator?'INFORMATIONAL_SCOPE':'OWN_COST'},
   procurement_eligible:false,source_metadata:{...metadata,...(machine?{
    normativeResourceCode:row.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION'}:{})}});
 });
 return{...before,parameters,resources};
}
