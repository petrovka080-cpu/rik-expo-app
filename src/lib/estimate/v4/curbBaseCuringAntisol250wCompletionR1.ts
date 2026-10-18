import pack from '../../../../data/estimate-benchmarks/source-packs/curb-base-curing-antisol250w-completion-r1.json';
import {graniteKerbCementDefinitionR1,graniteKerbCementPrefixR1} from './graniteKerbCementKrer27Column03R1';
import {concreteCuringAntisolDefinitionS2763,concreteCuringAntisolPackS2763,concreteCuringAntisolOwnerS2763,concreteCuringAntisolReadyChoicesS2763} from './concreteCuringAntisolMaterialS2763';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const curbBaseCuringMaterialPackR1=pack;
export const curbBaseCuringMaterialOwnerR1=concreteCuringAntisolOwnerS2763;
const selected:AutomaticInclusionCondition={kind:'equals',parameterId:pack.selectionParameter,value:pack.selectedOption};
type ScopeFact={id:string;titleRu:string;guideRu:string;value?:string;stockPositiveOnly?:boolean};
const physicalFacts:readonly ScopeFact[]=pack.physicalFacts,supplyFacts:readonly ScopeFact[]=pack.supplyFacts;
const physicalIds=physicalFacts.map(f=>f.id),supplyIds=supplyFacts.map(f=>f.id);
const rehash=<T extends {row_sha256?:string}>(value:T)=>{const{row_sha256:_old,...body}=value;return{...body,row_sha256:estimateDeterministicHash(body)};};

/** Thin composition only: original27 rows/formulas and all parent50 definitions stay exact.
 * The seven material rows come from the existing Antisol consumer/balance.
 * No DB writer, source admission, labour split, project default or new price route. */
export function appendCurbBaseCuringMaterialR1(parent:AutomaticOwnerDefinition=graniteKerbCementDefinitionR1()):AutomaticOwnerDefinition{
 if(parent.parameters.length!==50||parent.formulas.length!==27||parent.resources.length!==27)throw Error('CURB_CURING_EXACT_PARENT_SHAPE_REQUIRED');
 const oldNeed=parent.resources.find(r=>r.row_id===pack.completionNeedRowId);
 if(!oldNeed||oldNeed.unit_id!==''||oldNeed.source_metadata?.sourceRole!=='UNRESOLVED_INSTALLATION_SOURCE')throw Error('CURB_CURING_ORIGINAL_NEED_REQUIRED');
 if(parent.formulas.find(f=>f.formula_id===graniteKerbCementPrefixR1+':formula:whole-labor')?.expression_source!=='kerb_length_m*109/100')throw Error('CURB_CURING_WHOLE_LABOR_MUST_STAY109');
 const concrete=parent.resources.find(r=>r.row_id===graniteKerbCementPrefixR1+':concrete-consumed');
 if(!concrete||concrete.unit_id!=='m3'||concrete.source_metadata?.sourceCode!=='06-0206-0009'||parent.formulas.find(f=>f.formula_id===concrete.formula_id)?.expression_source!=='kerb_length_m*3.9/100')throw Error('CURB_CURING_B15_PARENT_MISMATCH');
 if(concreteCuringAntisolPackS2763.source.sha256!==pack.source.sha256||concreteCuringAntisolPackS2763.source.coverageM2PerL!==4.9||concreteCuringAntisolPackS2763.source.packageL!==19)throw Error('CURB_CURING_EXACT_PDS_REQUIRED');
 const material:AutomaticOwnerDefinition=concreteCuringAntisolDefinitionS2763();
 const specs:AutomaticParameterSpec[]=[...physicalFacts,...supplyFacts].map((f):AutomaticParameterSpec=>({id:f.id,title:f.titleRu,valueType:f.value===undefined?'text':'enum',unitId:null,kind:'conditional',...(f.value===undefined?{}:{values:[f.value]}),requiredWhen:f.stockPositiveOnly?{kind:'and',operands:[selected,{kind:'greater_than',parameterId:'antisol_usable_stock_l',value:0}]}:selected}));
 // Declared source conditions are built through the same existing parameter contract.
 const gates=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:'curb-base-curing-material',sourceId:pack.materialSourceId,normId:pack.materialNormId,
  sourceMetadata:{source_title:concreteCuringAntisolPackS2763.source.titleRu,source_document_version:concreteCuringAntisolPackS2763.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:concreteCuringAntisolPackS2763.source.locatorRu},
  applicabilityRu:pack.compatibility.selectedFaceOnly,ordinary:[{id:pack.selectionParameter,title:'Материальная ветвь ухода за открытым основанием борта',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.selectedOption,pack.otherOption]}],profile:[],conditional:[...specs,{id:'antisol_usable_stock_l',title:'Пригодный остаток для условия подтверждения',valueType:'decimal',unitId:'l',kind:'conditional',min:0}],rows:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[]});
 const newParams=[...material.parameters.map(p=>{
  if(p.truth_metadata.visibility_role==='INTERNAL_ONLY')return p;
  const constraints={...p.constraints_json,requiredWhen:selected,
   ...(p.parameter_id==='approved_external_curing_method'?{values:['MEMBRANE_CURING_COMPOUND']}:{ }),
   ...(p.parameter_id==='antisol_material_choice'?{values:[concreteCuringAntisolPackS2763.selectedProductRu]}:{ }),
   ...(p.parameter_id==='antisol_surface_ready'?{values:[concreteCuringAntisolReadyChoicesS2763[0]]}:{ })};
  return{...p,required:false,constraints_json:constraints,truth_metadata:{...p.truth_metadata,required_when:selected,visible_when:selected,contract:pack.contract}};
 }),...gates.parameters.filter(p=>p.parameter_id!=='antisol_usable_stock_l').map(p=>{
  const fact=[...physicalFacts,...supplyFacts].find(f=>f.id===p.parameter_id);
  return{...p,required:false,truth_metadata:{...p.truth_metadata,contract:pack.contract,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   ...(p.parameter_id===pack.selectionParameter?{}:{visible_when:selected,required_when:p.constraints_json?.requiredWhen}),provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(p.truth_metadata.guide as Record<string,unknown>),guide_short_ru:fact?.guideRu??'Явно выберите только реально предусмотренный продукт/метод. Выбор отсутствует — исходная потребность ухода остаётся открыта.',source_role:'USER_SUPPLIED_OBJECT_FACT'}}};
 })];
 const parentParamIds=new Set(parent.parameters.map(p=>p.parameter_id));
 if(newParams.some(p=>parentParamIds.has(p.parameter_id))||new Set(newParams.map(p=>p.parameter_id)).size!==newParams.length)throw Error('CURB_CURING_PARAMETER_COLLISION');
 const oldRows=new Set(parent.resources.map(r=>r.row_id)),oldFormulas=new Set(parent.formulas.map(f=>f.formula_id));
 if(material.resources.some(r=>oldRows.has(r.row_id))||material.formulas.some(f=>oldFormulas.has(f.formula_id)))throw Error('CURB_CURING_DUPLICATE_OWNER_OR_FORMULA');
 const added=material.resources.map((r,index)=>{
  const owner=r.row_id===concreteCuringAntisolOwnerS2763,graph=r.resource_graph;
  return rehash({...r,ordinal:parent.resources.length+index,inclusion_ast:{kind:'and' as const,operands:[selected,r.inclusion_ast]},
   source_metadata:{...r.source_metadata,completionNeedRowId:pack.completionNeedRowId,completionNeedRawSha256:pack.completionNeedRawSha256,completionScope:'MATERIAL_QUANTITY_ONLY_ORIGINAL_NEED_REMAINS_OPEN',curbBaseClass:'B15',surfaceScope:pack.compatibility.selectedFaceOnly},
   resource_graph:{...graph,scopeContextParameterIds:['kerb_length_m','exposed_curing_surface_area_m2'],
    inputParameterIds:[...new Set([...(Array.isArray(graph.inputParameterIds)?graph.inputParameterIds as string[]:[]),...physicalIds,...(owner?supplyIds:[])])],
    ...(r.row_id===pack.materialRows.consumed?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'l',parameterIds:['exposed_curing_surface_area_m2'],reasonRu:'Приблизительный паспортный расход относится только к измеренной допустимой поверхности. Ручная строка не меняет расход.'}}:{})}});
 });
 return{...parent,parameters:[...parent.parameters,...newParams.map((p,index)=>({...p,ordinal:parent.parameters.length+index}))],formulas:[...parent.formulas,...material.formulas],resources:[...parent.resources,...added],ordinaryParameterIds:[...parent.ordinaryParameterIds,...material.ordinaryParameterIds,pack.selectionParameter]};
}
export function compileCurbBaseCuringMaterialR1(parameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'kerb_length_m',definition:appendCurbBaseCuringMaterialR1(),submittedParameters:parameters});}
export function curbBaseCuringControlFactsR1(area='49'):Record<string,unknown>{return{
 [pack.selectionParameter]:pack.selectedOption,exposed_curing_surface_area_m2:area,approved_external_curing_method:'MEMBRANE_CURING_COMPOUND',antisol_material_choice:concreteCuringAntisolPackS2763.selectedProductRu,
 antisol_surface_ready:concreteCuringAntisolReadyChoicesS2763[0],antisol_minimum_temperature_12h_c:'20',antisol_subsequent_surface_use:'Без приклеиваемой отделки, гидроизоляции и контакта с питьевой водой',antisol_usable_stock_l:'0',antisol_retained_reserve_l:'0',
 ...Object.fromEntries(physicalFacts.map(f=>[f.id,f.value!==undefined?f.value:'QA_SYNTHETIC_ONLY exact exposed-face project evidence; not actual approval'])),
 ...Object.fromEntries(supplyFacts.filter(f=>!f.stockPositiveOnly).map(f=>[f.id,f.value!==undefined?f.value:'QA_SYNTHETIC_ONLY separate exact material supply; not actual quote']))};}
