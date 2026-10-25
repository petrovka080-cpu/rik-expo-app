import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import {masonryGlassM25OperationDefinitionR152} from './masonryGlassM25OperationDisplayR152';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {assertCanonicalPrimaryMeasureSelectionV1,type PrimaryMeasureSelectionParameterV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {canonicalApprovedBaselineRuntimeParameters,type CanonicalApprovedBaselineRecord} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';

type Json=Record<string,unknown>;
type Resource=AutomaticOwnerDefinition['resources'][number];
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const GLASS_OPENING_CATALOG_R223='canonical-work:base:masonry_interior_opening_lay_standard';
export const GLASS_OPENING_CHOICE_ID_R223='masonry_opening_physical_result_r223';
export const GLASS_OPENING_LEGACY_R223='Сохранённый предварительный состав кладки проёма';
export const GLASS_OPENING_OWN_R223='Заполнение проёма пустотелыми стеклоблоками 194×194×98 мм';
export const GLASS_OPENING_AREA_R223='glass97_filled_opening_area_m2';
export const GLASS_OPENING_HEIGHT_R223='glass97_storey_height_m';
export const GLASS_OPENING_SOURCE_R223='source:masonry:glass-block:r103:opening-fill';
const choice=(value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId:GLASS_OPENING_CHOICE_ID_R223,value});
const legacy=choice(GLASS_OPENING_LEGACY_R223),glass=choice(GLASS_OPENING_OWN_R223);
const and=(...operands:unknown[]):Json=>({kind:'and',operands});
const rehash=(row:Resource):Resource=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:hash(body)};};
function check(value:unknown,label:string):asserts value{if(!value)throw Error('MASONRY_GLASS_EXISTING_R223_'+label);}
export const masonryGlassOpeningPrimaryR223=()=>({contract:'canonical-primary-measure-selection/v1' as const,
 selectorParameterId:GLASS_OPENING_CHOICE_ID_R223,selections:[
 {selectorValue:GLASS_OPENING_LEGACY_R223,primaryMeasureParameterId:'q',unitId:'m2'},
 {selectorValue:GLASS_OPENING_OWN_R223,primaryMeasureParameterId:GLASS_OPENING_AREA_R223,unitId:'m2'},
]});

/** Same-parent composition pattern already used by NVF R5. The new ordinary
 * selector describes the requested physical opening filling material/result. It is
 * not an APPLICATION_TECHNICAL output, project approval or source producer.
 * The two unchanged source columns still use their own actual area/height.
 * No namespace, q alias, hidden technical defaults or second paid owner. */
export function masonryGlassOpeningExistingDefinitionR223(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 check(parent.parameters.length===1&&parent.parameters[0]?.parameter_id==='q'
  &&parent.parameters[0].unit_id==='m2'&&parent.parameters[0].default_value===100
  &&parent.formulas.length===59&&parent.resources.length===59,'EXACT_LEGACY_SHAPE');
 const child=masonryGlassM25OperationDefinitionR152('opening-fill');
 check(child.ordinaryParameterIds.includes(GLASS_OPENING_AREA_R223)
  &&child.ordinaryParameterIds.includes(GLASS_OPENING_HEIGHT_R223),'EXACT_OWN_GEOMETRY_IDS');
 const prior={...parent,parameters:parent.parameters.map(p=>({...p,required:false,default_value:null,
  constraints_json:{...p.constraints_json,requiredWhen:and(legacy,{kind:'literal',value:true}),forbiddenWhen:glass},
  truth_metadata:{...p.truth_metadata,visible_when:and(
   {kind:'selected',parameterId:GLASS_OPENING_CHOICE_ID_R223,value:GLASS_OPENING_LEGACY_R223},{kind:'literal',value:true})}})),
  resources:parent.resources.map(row=>rehash({...row,inclusion_ast:and(legacy,row.inclusion_ast)}))};
 const control=buildAutomaticConstructionOwnerR1({contract:'masonry-glass-opening-existing-owner/r223',
  semanticOwner:'masonry:glass-opening:existing-owner:r223',sourceId:GLASS_OPENING_SOURCE_R223,
  normId:'PHYSICAL_OPENING_REQUEST_NOT_APPROVAL_OR_QUANTITY_RATE',
  sourceMetadata:{source_title:'Перегородка из стеклоблоков',source_document_version:'KG2015; retained own03/04',
   definition_hash:'cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436',
   artifact_sha256:'cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436',exact_locator:'08-04-002-03/04,PDF55; requested material scope only'},
  applicabilityRu:'Запрошенный физический вид проёма; не подтверждение проекта, армирования, наличия и полного обеспечения.',
  ordinary:[{id:GLASS_OPENING_CHOICE_ID_R223,title:'Вид проёма',kind:'ordinary',valueType:'enum',unitId:null,
   values:[GLASS_OPENING_LEGACY_R223,GLASS_OPENING_OWN_R223]}],profile:[],conditional:[],rows:[],
  excludedUnownedAssumptions:['Фактический материал выбирается явно; площадь не определяет источник или проектный допуск.']});
 const scope={...control,parameters:control.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,
  preliminary_compilation_allowed:false,provenance:{consumer_input_role_v1:'OBJECT_FACT',
   requested_physical_scope_only:true,project_approval_claimed:false}}}))};
 const withChoice=appendOptionalAutomaticOwnerR1({parent:prior,child:scope,when:{kind:'or',operands:[legacy,glass]}});
 const scopedChild={...child,parameters:child.parameters.map(p=>child.ordinaryParameterIds.includes(p.parameter_id)
  ?{...p,truth_metadata:{...p.truth_metadata,visible_when:glass,preliminary_compilation_allowed:false,
    provenance:{...(record(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'OBJECT_FACT'}}}:p)};
 const joined=appendOptionalAutomaticOwnerR1({parent:withChoice,child:scopedChild,when:glass});
 const consumers=buildMasterParameterCalculationConsumers(joined);
 check(joined.parameters.length===24&&joined.formulas.length===97&&joined.resources.length===97,'WHOLE_COUNTS');
 return{...joined,ordinaryParameterIds:['q',GLASS_OPENING_CHOICE_ID_R223,GLASS_OPENING_AREA_R223,GLASS_OPENING_HEIGHT_R223],
  parameters:joined.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,
   formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}

/** The same primary resolver and approved-baseline filter used by the existing
 * worker. This is not a new project/source producer. No caller confirmed map. */
export function compileMasonryGlassOpeningExistingR223(model:AutomaticOwnerDefinition,baseline:CanonicalApprovedBaselineRecord,
 submitted:Record<string,unknown>){
 const schema:PrimaryMeasureSelectionParameterV1[]=model.parameters.map(p=>({parameterId:p.parameter_id,valueType:p.value_type,
  unitId:p.unit_id,visibilityRole:typeof p.truth_metadata.visibility_role==='string'?p.truth_metadata.visibility_role:undefined,
  valueSourceRole:typeof p.truth_metadata.value_source_role==='string'?p.truth_metadata.value_source_role:undefined,
  provenance:record(p.truth_metadata.provenance)?p.truth_metadata.provenance:undefined,
  constraints:p.constraints_json??{},formulaConsumers:Array.isArray(p.truth_metadata.formula_consumers)
   &&p.truth_metadata.formula_consumers.every((id:unknown)=>typeof id==='string')?p.truth_metadata.formula_consumers:undefined}));
 const selected=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:masonryGlassOpeningPrimaryR223(),parameterSchema:schema,
  submittedParameters:submitted,confirmedParameters:{}});
 check(selected.kind==='RESOLVED','EXACT_PRIMARY_REQUIRED');
 const confirmed=canonicalApprovedBaselineRuntimeParameters(baseline,{parameterDefinitions:model.parameters,inputParameters:submitted});
 return compileCanonicalEstimateCore({operation:'compile',compilerVersion:'masonry-glass-opening-existing-owner/r223',
  catalogId:GLASS_OPENING_CATALOG_R223,primaryMeasureParameterId:selected.primaryMeasure.parameterId,
  parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
  submittedParameters:submitted,confirmedParameters:confirmed,priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:hash});
}
