import source from '../../../../data/estimate-benchmarks/source-packs/wall-ceramic-cement-native-f266.json';
import provision from '../../../../data/estimate-benchmarks/source-packs/wall-ceramic-cement-existing-provision-f271.json';
import {wallCeramicCementNativeF266 as native,WALL_CERAMIC_CEMENT_AREA_F266 as area} from './wallCeramicCementNativeF266';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticRowSpec,type AutomaticParameterSpec}
 from './automaticConstructionOwnerR1';
import {appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
export const WALL_METHOD_F271='wall019_requested_physical_method';
export const WALL_HEIGHT_F271='wall019_room_height_m';
export const WALL_LEGACY_F271='Сохранённый предварительный состав облицовки стены';
export const WALL_CEMENT_F271='Облицовка плоской кирпичной или бетонной стены белой глазурованной плиткой на цементном растворе';
type Json=Record<string,unknown>;
type Resource=AutomaticOwnerDefinition['resources'][number];
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function check(v:unknown,c:string):asserts v{if(!v)throw Error('WALL_EXISTING_F271_'+c);}
const eq=(value:string)=>({kind:'equals' as const,parameterId:WALL_METHOD_F271,value});
const legacy=eq(WALL_LEGACY_F271),own=eq(WALL_CEMENT_F271);
const scope=(when:unknown)=>({kind:'and',operands:[when,{kind:'literal',value:true}]});
const rehash=(r:Resource):Resource=>{const{row_sha256:_old,...body}=r;return{...body,row_sha256:hash(body)};};
export const wallPrimaryF271=()=>({contract:'canonical-primary-measure-selection/v1' as const,
 selectorParameterId:WALL_METHOD_F271,selections:[
 {selectorValue:WALL_LEGACY_F271,primaryMeasureParameterId:'q',unitId:'m2'},
 {selectorValue:WALL_CEMENT_F271,primaryMeasureParameterId:area,unitId:'m2'}]});

/** Same-parent/NVF/R160 existing composition. Selection is a requested physical
 * method, not brand/source permission/project approval. Historical59 formulas,
 * IDs/units/owners/metadata remain intact; each physical route is exclusive.
 * Six explicit unresolved needs prevent a complete whole-provision claim.
 */
export function wallExistingOwnerDefinitionF271(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 check(parent.parameters.length===1&&parent.formulas.length===59&&parent.resources.length===59,'EXACT_PARENT_SHAPE');
 const q=parent.parameters[0];check(q?.parameter_id==='q'&&q.unit_id==='m2'&&q.default_value===100&&record(q.constraints_json),'EXACT_OLD_PRIMARY');
 const prior={...parent,parameters:[{...q,required:false,default_value:null,
  constraints_json:{...q.constraints_json,requiredWhen:scope(legacy),forbiddenWhen:own},
  truth_metadata:{...q.truth_metadata,visible_when:scope(legacy)}}],
  resources:parent.resources.map(r=>rehash({...r,inclusion_ast:{kind:'and',operands:[legacy,r.inclusion_ast]}}))};
 const meta={source_title:'Облицовка стены на цементном растворе',source_document_version:'КРЕР15-2015;15-01-019-01',
  definition_hash:source.sourceArtifact.sha256,artifact_sha256:source.sourceArtifact.sha256,exact_locator:'PDF56–58,column01;§1.2а/1.4/1.9/2.3'};
 const controls=buildAutomaticConstructionOwnerR1({contract:provision.contract,semanticOwner:'tile-wall:existing:f271:scope',
  sourceId:source.sourceKey,normId:'REQUESTED_PHYSICAL_SCOPE_NOT_APPROVAL',sourceMetadata:meta,applicabilityRu:source.scopeRu,
  ordinary:[{id:WALL_METHOD_F271,title:'Способ облицовки стены',kind:'ordinary',valueType:'enum',unitId:null,
   values:[WALL_LEGACY_F271,WALL_CEMENT_F271]},
   {id:WALL_HEIGHT_F271,title:'Высота помещения',kind:'ordinary',valueType:'decimal',unitId:'m',min:0.1,max:3.5}],
  profile:[],conditional:[],rows:[],excludedUnownedAssumptions:['Физический метод не подтверждает готовность основания,наличие,проект или нормативный допуск.']});
 const control={...controls,parameters:controls.parameters.map(p=>({...p,
  ...(p.parameter_id===WALL_HEIGHT_F271?{required:false,constraints_json:{...p.constraints_json,requiredWhen:scope(own),forbiddenWhen:legacy}}:{}),
  truth_metadata:{...p.truth_metadata,visible_when:p.parameter_id===WALL_HEIGHT_F271?scope(own):{kind:'or',operands:[legacy,own]},
   preliminary_compilation_allowed:p.parameter_id===WALL_HEIGHT_F271,
   provenance:{consumer_input_role_v1:'OBJECT_FACT',requested_physical_scope_only:true,project_approval_claimed:false}}}))};
 const withChoice=appendOptionalAutomaticOwnerR1({parent:prior,child:control,when:{kind:'or',operands:[legacy,own]}});
 const n=native();
 const child={...n,parameters:n.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,visible_when:scope(own),
  preliminary_compilation_allowed:true,provenance:{consumer_input_role_v1:'OBJECT_FACT',project_approval_claimed:false}}})),
  resources:n.resources.map(r=>rehash({...r,resource_graph:{...r.resource_graph,inputParameterIds:[area,WALL_HEIGHT_F271],
   ...(r.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'?{parentCostOwnerId:'tile-wall:kg15-01901:whole-labour'}:{})}}))};
 const withNative=appendOptionalAutomaticOwnerR1({parent:withChoice,child,when:own});
 const rows:AutomaticRowSpec[]=provision.needs.map(need=>({rowId:need.rowId,section:need.section,category:need.category,
  title:need.nameRu,unitId:'',formulaId:need.rowId+':quantity',expression:need.parameterId,
  costTreatment:'INFORMATIONAL_SCOPE',procurement:false}));
 const pending=buildAutomaticConstructionOwnerR1({contract:provision.contract,semanticOwner:'tile-wall:existing:f271:unresolved',
  sourceId:source.sourceKey,normId:'UNRESOLVED_WHOLE_PROVISION_NOT_A_POSITIVE_NORM',sourceMetadata:meta,applicabilityRu:source.scopeRu,
  ordinary:[],profile:[],conditional:provision.needs.map((need):AutomaticParameterSpec=>({id:need.parameterId,title:need.nameRu,kind:'conditional',valueType:'decimal',unitId:null,min:0})),
  rows,operationCompositionGroupId:'tile-wall:kg15-01901:whole-operation',excludedUnownedAssumptions:[
   'Открытые потребности не равны новому набору1,документампроекта,остаткам или разрешениюпокупки.']});
 const unresolved={...pending,parameters:pending.parameters.map(p=>{
  const need=provision.needs.find(v=>v.parameterId===p.parameter_id);check(need,'EXACT_NEED');
  const truth=unresolvedApplicationNormTruthR1(p.truth_metadata,need.reasonRu);
  return{...p,truth_metadata:{...truth,preliminary_compilation_allowed:true,input_origin_class:'UNRESOLVED_APPLICATION_NORM',
   guide:{guide_kind:'APPLICATION_NORM_REQUIRED',guide_short_ru:need.reasonRu,source_role:'UNRESOLVED_APPLICATION_NORM',
    source_document:source.sourceKey,source_locator:'Independent whole-provision gap;not a quantitative source',guide_validation_policy:'MANDATORY_BLOCK'}}};})};
 const joined=appendOptionalAutomaticOwnerR1({parent:withNative,child:unresolved,when:own});
 const consumers=buildMasterParameterCalculationConsumers(joined);
 check(joined.parameters.length===10&&joined.formulas.length===81&&joined.resources.length===81,'EXACT_59PLUS22');
 return{...joined,ordinaryParameterIds:['q',WALL_METHOD_F271,area,WALL_HEIGHT_F271],
  parameters:joined.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,
   formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}
