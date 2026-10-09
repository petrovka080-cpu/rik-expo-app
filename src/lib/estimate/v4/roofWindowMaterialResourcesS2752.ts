import pack from '../../../../data/estimate-benchmarks/source-packs/roof-window-material-resources-s27-52.json';
import operationPack from '../../../../data/estimate-benchmarks/source-packs/roof-window-operation-resources-s27-50.json';
import { parameterDefinitions as parentParameters, formulaDefinitions as parentFormulas,
  resourceDefinitions as parentResources, sourcePack as parentPack } from './roofWindowOperationResourcesS2750';
import { buildAutomaticConstructionOwnerR1, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const sourcePack={...parentPack,...pack};
const removedRows=new Set<string>(pack.replacedRowIds);
const removedFormulas=new Set(parentResources.filter(row=>removedRows.has(row.row_id)).map(row=>row.formula_id));
const key='roof-cfp100100';
const objects:AutomaticParameterSpec[]=[
  {id:'roof_covering',title:'Покрытие крыши',valueType:'enum',unitId:null,kind:'conditional',values:['PVC','FPO','EPDM','BITUMEN']},
  {id:'roof_support',title:'Несущая конструкция крепления',valueType:'enum',unitId:null,kind:'conditional',values:['TIMBER','CONCRETE','STEEL']},
  {id:'bitumen_method',title:'Способ устройства битумного примыкания',valueType:'enum',unitId:null,kind:'conditional',
    values:['SELF_ADHESIVE','COLD_BONDED'],requiredWhen:{parameterId:'roof_covering',value:'BITUMEN'}},
];
const unresolved=pack.materials.flatMap((material):AutomaticParameterSpec[]=>[
  {id:material.quantityParameterId,title:`Расход материала: ${material.nameRu}`,valueType:'decimal',unitId:material.unitId,kind:'conditional',min:0},
  {id:material.approvalParameterId,title:`Подтверждённый узел и исполнение: ${material.nameRu}`,valueType:'enum',unitId:null,
    kind:'conditional',values:['VERIFIED_COMPATIBLE_DETAIL']},
]);
const specs:AutomaticRowSpec[]=pack.materials.map(material=>{
  const operands:NonNullable<AutomaticRowSpec['inclusion']>[]=[{kind:'equals',parameterId:'lantern_model',value:parentPack.model}];
  if(material.roof)operands.push({kind:'equals',parameterId:'roof_covering',value:material.roof});
  if(material.substrate)operands.push({kind:'equals',parameterId:'roof_support',value:material.substrate});
  if(['bitumen-cold-adhesive','bitumen-cold-membrane'].includes(material.id))operands.push({kind:'equals',parameterId:'bitumen_method',value:'COLD_BONDED'});
  if(['bitumen-detail-underlay','bitumen-detail-capsheet','bitumen-bonding-primer'].includes(material.id))
    operands.push({kind:'equals',parameterId:'bitumen_method',value:'SELF_ADHESIVE'});
  const operation=operationPack.operations[material.operation as keyof typeof operationPack.operations];
  return {rowId:material.rowId,formulaId:`${material.rowId}:quantity`,section:operation.titleRu,category:'material',
    title:material.nameRu,unitId:material.unitId,expression:`lantern_count*${material.quantityParameterId}`,procurement:true,
    inputParameterIds:['lantern_model',material.approvalParameterId],inclusion:{kind:'and',operands}};
});
const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:key,sourceId:pack.sourceId,
  normId:'MATERIAL_SPECIFICATION_CANDIDATES_NO_CONFIRMED_NODE_CONSUMPTION',
  sourceMetadata:{source_title:'Материалы кровельных примыканий и крепления: первичные паспорта изделий',
    source_document_version:'S27.52 source-bound material candidates',definition_hash:estimateDeterministicHash(pack),
    artifact_sha256:estimateDeterministicHash(pack),exact_locator:Object.entries(pack.sources).map(([id,source])=>`${id}: ${source.url}; ${source.locator}`).join(' | ')},
  applicabilityRu:pack.sourceRestrictionRu,ordinary:[{id:'lantern_count',title:'Количество одинаковых окон',
    valueType:'integer',unitId:'item',kind:'ordinary',min:1}],profile:[],conditional:[
      {id:'lantern_model',title:'Исполнение окна',valueType:'enum',unitId:null,kind:'conditional',values:[parentPack.model]},
      ...objects,...unresolved],rows:specs,
  excludedUnownedAssumptions:['Неподтверждённая совместимость узла не считается разрешением монтажа.',
    'Неизвестный расход и цены не заменяются числами.', 'Неактивные покрытия и основания не начисляются.',
    'Комплектные крепления купола и стеклопакет не покупаются второй раз.'],deferMissingProjectFactsToRows:true});
const unresolvedIds=new Set(unresolved.map(parameter=>parameter.id));
export const parameterDefinitions=[...parentParameters.filter(parameter=>!pack.removedQuantityParameterIds.includes(parameter.parameter_id)),
  ...built.parameters.filter(parameter=>!parentParameters.some(old=>old.parameter_id===parameter.parameter_id))
    .map(parameter=>({...parameter,truth_metadata:unresolvedIds.has(parameter.parameter_id)?{
    ...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'UNRESOLVED_APPLICATION_NORM',
    provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},unresolved_norm_reason:'Требуются совместимый узел, точное исполнение и подтверждённый расход; выбор покрытия сам по себе их не подтверждает.',
    guide:{...(parameter.truth_metadata.guide as Record<string,unknown>),guide_kind:'PROJECT_DEFINED',
      source_role:'UNRESOLVED_APPLICATION_REQUIREMENT',guide_short_ru:'Материал показан по применению. Приложению нужен подтверждённый узел и расход; пользователь не назначает норму.'},
  }:{...parameter.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'}}}))]
  .map((parameter,ordinal)=>({...parameter,ordinal}));
export const formulaDefinitions=[...parentFormulas.filter(formula=>!removedFormulas.has(formula.formula_id)),...built.formulas];
export const resourceDefinitions=[...parentResources.filter(resource=>!removedRows.has(resource.row_id)),
  ...built.resources.map(resource=>{
    const material=pack.materials.find(candidate=>candidate.rowId===resource.row_id)!;
    const operation=operationPack.operations[material.operation as keyof typeof operationPack.operations];
    const {row_sha256:_oldHash,...content}=resource;
    const result={...content,resource_graph:{...resource.resource_graph,
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'roof-window:installation',
        groupTitleRu:'Установка окон в крыше',operationId:`roof-window:${material.operation}`,
        operationTitleRu:operation.titleRu,completionCriterionRu:operation.criterionRu,processOrdinal:operation.ordinal},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,
        nameRu:material.nameRu,brandAndModelRu:null,
        specificationRu:`${material.characteristicsRu}. Неподобранная альтернатива: совместимость с узлом окна не подтверждена.`,
        detailsRu:[`Применение: ${material.applicationRu}`,material.quantityStatusRu,material.inclusionStatusRu]},
    },source_metadata:{...resource.source_metadata,normativeTrace:[],sourceRole:'UNRESOLVED_INSTALLATION_SOURCE',
      material_source_ids:material.sourceIds,exact_product_reference:material.exactProductExample,
      window_interface_approved:false,full_technical_acceptance:false}};
    return {...result,row_sha256:estimateDeterministicHash(result)};
  })].map((resource,ordinal)=>{
    const {row_sha256:_oldHash,...content}=resource;
    const result={...content,ordinal};return {...result,row_sha256:estimateDeterministicHash(result)};
  });

export async function compileCandidate(input:Record<string,unknown>,rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']) {
  return compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',compilerVersion:pack.contract,
    catalogId:pack.catalogId,primaryMeasureParameterId:'lantern_count',parameterDefinitions,
    formulaDefinitions:[...formulaDefinitions],resourceDefinitions,submittedParameters:input,confirmedParameters:{},
    currencyCode:'KGS',priceItems:[],rowOverrides,maximumResourceRows:100,hashJson:estimateDeterministicHash});
}
