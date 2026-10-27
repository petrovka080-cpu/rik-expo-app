import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';
import {SINGLE_PIPE_TRENCH_DEFINITION_S2735 as ready} from './singlePipeTrenchConstructorS2735';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const GRANULAR_BACKFILL_VARIANTS_S2735=['standard','high_load','technical_room','wet_zone'] as const;
export const GRANULAR_BACKFILL_CATALOG_IDS_S2735=GRANULAR_BACKFILL_VARIANTS_S2735.map(v=>'canonical-work:base:earthworks_interior_trench_backfill_'+v);
export const GRANULAR_BACKFILL_SOURCE_ID_S2735='project_granular_backfill_actual_volume_s27_35';
export const GRANULAR_BACKFILL_NORM_ID_S2735='project:granular-backfill:actual-volume-and-supply:s27-35.v1';
export const GRANULAR_BACKFILL_CONTRACT_S2735='granular-backfill-operation:s27-35.v1';
export const GRANULAR_BACKFILL_SOURCE_METADATA_S2735={source_title:'Измеренный объём обратной засыпки и готовые операции поставки, укладки, уплотнения и контроля',
  source_authority:'Фактический проект и поставщик; характеристики грунта и проектное решение требуют подтверждения',source_document_version:GRANULAR_BACKFILL_CONTRACT_S2735,
  definition_hash:'27294a4b0ee0dca4011c352e57fd944443ec19e73d57808b0d3cfeed42bdfae0',artifact_sha256:'27294a4b0ee0dca4011c352e57fd944443ec19e73d57808b0d3cfeed42bdfae0',
  exact_locator:'source-packs/granular-backfill-operation-s27-35.json: измеренный объём в конструкции; фактический коэффициент рыхлой поставки; принятые AST поставки/труда/механизмов без fixture',
  source_kind:'ACTUAL_INSTALLED_VOLUME_AND_PROJECT_SUPPLIER_FACTS_REQUIRED',use_restriction:'Только отдельно измеренная засыпка с укладкой и уплотнением. Название варианта не назначает марку, уплотнение и нормы. Разработка, труба, постель, обсыпка и дренажные конструкции не включены.'};
const selected=new Set(['material:trench:upper-backfill','material:trench:compaction-water',
  'rc09:labor:pbb-survey','rc09:labor:pbb-material-placing','rc09:labor:pbb-compaction','rc09:labor:pbb-qa-documentation',
  'rc09:equipment:pbb-excavator','rc09:equipment:pbb-loader','rc09:equipment:pbb-compactor','rc09:equipment:pbb-water-bowser','rc09:equipment:pbb-test-equipment',
  'rc09:logistics:pbb-delivery','rc09:logistics:pbb-removal','rc09:pbb_compaction_tests','rc09:pbb_asbuilt_documents']);
const selectedResources=ready.resources.filter(r=>selected.has(r.row_id)||r.row_id.startsWith('material:trench:tool:'));
const formulaIds=new Set(selectedResources.map(r=>r.formula_id));
const selectedFormulas=ready.formulas.filter(f=>formulaIds.has(f.formula_id));
const refMap=new Map([['soil_reuse_export_reference','backfill_waste_scope_reference']]);
const remap=(x:unknown):any=>typeof x==='string'?refMap.get(x)??x:Array.isArray(x)?x.map(remap):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,remap(v)])):x;
const extra=buildAutomaticConstructionOwnerR1({contract:GRANULAR_BACKFILL_CONTRACT_S2735,semanticOwner:'granular-backfill',sourceId:GRANULAR_BACKFILL_SOURCE_ID_S2735,normId:GRANULAR_BACKFILL_NORM_ID_S2735,sourceMetadata:GRANULAR_BACKFILL_SOURCE_METADATA_S2735,
  applicabilityRu:GRANULAR_BACKFILL_SOURCE_METADATA_S2735.use_restriction,ordinary:[{id:'volume_m3',title:'Измеренный объём обратной засыпки в конструкции; не рыхлый объём заказа',valueType:'decimal',unitId:'m3',kind:'ordinary',min:0.000001},
    {id:'backfill_loose_per_installed_m3',title:'Фактический объём рыхлой поставки на 1 м³ засыпки в конструкции',valueType:'decimal',unitId:'ratio',kind:'ordinary',min:0.000001}],profile:[],conditional:[],deferMissingProjectFactsToRows:true,
  rows:[{rowId:'scope:backfill:installed',section:'Объём и границы операции',category:'service',title:'Обратная засыпка: измеренный объём в конструкции; отдельной оплаты по м³ нет',unitId:'m3',formulaId:'granular_backfill_installed_scope_v1',expression:'volume_m3',costTreatment:'INFORMATIONAL_SCOPE'},
    {rowId:'scope:backfill:loose-consumption',section:'Объём и границы операции',category:'service',title:'Потребление рыхлого материала по фактическому коэффициенту; не отдельная закупка',unitId:'m3',formulaId:'granular_backfill_loose_consumption_v1',expression:'volume_m3*backfill_loose_per_installed_m3',costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:'pbb_selected_backfill_volume_m3',unitId:'m3'}}],
  excludedUnownedAssumptions:['автоматическая геометрия из объёма','готовая плотность/коэффициент разрыхления','проектное решение по названию варианта','нормы труда и техники','цены']});
const needed=new Set<string>();
for(const f of selectedFormulas)for(const id of f.input_parameter_ids)needed.add(id);
function collect(x:unknown):void{if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(collect);return;}for(const [k,v]of Object.entries(x)){if(k==='parameterId'&&typeof v==='string')needed.add(v);else collect(v);}}
for(const r of selectedResources){const g=r.resource_graph as Record<string,unknown>;for(const key of ['inputParameterIds','titleSpecificationParameterIds'])for(const id of g[key] as string[]??[])needed.add(id);collect(r.inclusion_ast);
  for(const key of ['effectiveQuantityOutputV1','purchaseBalanceV1'])collect(g[key]);}
needed.delete('bedding_backfill_supply_mode');needed.delete('pbb_selected_backfill_volume_m3');
const selectedParameters=ready.parameters.filter(p=>needed.has(p.parameter_id)).map(p=>{
  const x=remap(p) as typeof p;return {...x,
    ...(x.parameter_id==='backfill_waste_scope_reference'?{title_ru:'Отдельно оплачиваемые рейсы вывоза упаковки/отходов этой засыпки; другие операции исключены'}:{}),
    ...(x.parameter_id==='pbb_delivery_trip_count'||x.parameter_id==='pbb_removal_trip_count'?{constraints_json:{...x.constraints_json,min:0},title_ru:x.title_ru+'; явный 0 если отдельно не оплачиваются'}:{}),
    truth_metadata:{...x.truth_metadata,semantic_parameter_key:'granular-backfill:'+x.parameter_id,guide:{...(x.truth_metadata.guide as Record<string,unknown>),source_document:GRANULAR_BACKFILL_SOURCE_ID_S2735,source_locator:GRANULAR_BACKFILL_SOURCE_METADATA_S2735.exact_locator,source_snapshot_hash:GRANULAR_BACKFILL_SOURCE_METADATA_S2735.artifact_sha256}}};
});
const resources=[...extra.resources,...selectedResources].map((r,ordinal)=>{
  const x=remap(r) as typeof r;
  const paidTrips=x.row_id==='rc09:logistics:pbb-delivery'?'pbb_delivery_trip_count':x.row_id==='rc09:logistics:pbb-removal'?'pbb_removal_trip_count':null;
  const title=x.row_id==='material:trench:upper-backfill'?'Материал отдельной обратной засыпки: потребление, заказ и остаток':x.row_id==='rc09:equipment:pbb-excavator'?'Экскаватор подачи/распределения засыпки; часы только этой операции':x.row_id==='rc09:logistics:pbb-removal'?'Вывоз упаковки/отходов только этой засыпки':x.title_ru;
  const output={...x,ordinal,title_ru:title,inclusion_ast:paidTrips?{kind:'greater_than',parameterId:paidTrips,value:0}:{kind:'literal',value:true},
    resource_graph:{...x.resource_graph,scopeContextParameterIds:['volume_m3','pbb_assembly_designation','pbb_compaction_coefficient'],operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'granular-backfill',groupTitleRu:'Обратная засыпка: материал, укладка, уплотнение и контроль',operationId:x.category==='material'?'supply':x.category==='labor'?'placing-compaction':x.category==='equipment'?'equipment':'scope-logistics',operationTitleRu:x.category==='material'?'Поставка и оснащение':x.category==='labor'?'Укладка и уплотнение':x.category==='equipment'?'Фактические механизмы':'Объём, контроль и логистика',completionCriterionRu:'Подтвердить материал, проектную конструкцию, требуемое уплотнение и отдельные оплачиваемые ресурсы'}},
    source_metadata:{...x.source_metadata,reusedOperation: selected.has(x.row_id)||x.row_id.startsWith('material:trench:tool:')?{contract:'single-pipe-trench-constructor:s27-35.v1',sourceCommit:'829f9e534774706f9f6f24c319a303e597006702',sourceRowId:x.row_id}:null,
      normativeTrace:[{sourceId:GRANULAR_BACKFILL_SOURCE_ID_S2735,normId:GRANULAR_BACKFILL_NORM_ID_S2735,source_title:GRANULAR_BACKFILL_SOURCE_METADATA_S2735.source_title,exact_locator:GRANULAR_BACKFILL_SOURCE_METADATA_S2735.exact_locator,source_definition_hash:GRANULAR_BACKFILL_SOURCE_METADATA_S2735.definition_hash}],projectApprovalClaimed:false,universal_productivity_claimed:false}};
  return {...output,row_sha256:estimateDeterministicHash({...output,row_sha256:''})};
});
const parameterIds=new Set(selectedParameters.map(p=>p.parameter_id));
const runtimeInput=Object.fromEntries(Object.entries(ready.runtimeInput).filter(([id])=>parameterIds.has(id)));
export const GRANULAR_BACKFILL_DEFINITION_S2735=Object.freeze({parameters:[...selectedParameters,...extra.parameters].map((p,ordinal)=>({...p,ordinal})),
  formulas:[...extra.formulas,...selectedFormulas.map(f=>({...f,ast:remap(f.ast),input_parameter_ids:f.input_parameter_ids.map(id=>refMap.get(id)??id)}))],resources,runtimeInput,
  runtimeClassification:Object.fromEntries(Object.keys(runtimeInput).map(id=>[id,'ASSUMPTION' as const])),runtimeSourceIds:Object.fromEntries(Object.keys(runtimeInput).map(id=>[id,[GRANULAR_BACKFILL_SOURCE_ID_S2735]])),ordinaryParameterIds:['volume_m3']});
export function compileGranularBackfillOperationS2735(submittedParameters:Record<string,unknown>,catalogId=GRANULAR_BACKFILL_CATALOG_IDS_S2735[0]){
  if(!GRANULAR_BACKFILL_CATALOG_IDS_S2735.includes(catalogId))throw Error('GRANULAR_BACKFILL_CATALOG_UNSUPPORTED');
  return compileAutomaticConstructionOwnerR1({compilerVersion:GRANULAR_BACKFILL_CONTRACT_S2735,catalogId,primaryMeasureParameterId:'volume_m3',definition:GRANULAR_BACKFILL_DEFINITION_S2735,submittedParameters});
}
