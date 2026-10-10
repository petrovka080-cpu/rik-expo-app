import pack from '../../../../data/estimate-benchmarks/source-packs/fusion-bench-prepared-concrete-s27-58.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const fusionBenchPackS2758=pack;
export const fusionBenchPrefixS2758='fusion-bench-prepared-concrete';
export const includedBenchFixingsS2758=pack.supplyChoices[0];
export const separateBenchFixingsS2758=pack.supplyChoices[1];
const prefix=fusionBenchPrefixS2758;
const installation=['prepared_foundation_acceptance_reference','available_concrete_depth_mm','minimum_anchor_edge_distance_mm'];
const benchSupply=['actual_bench_supply_specification','anchor_supply_scope','bench_stock_compatibility_reference'];
const source=pack.sources[1];
const scopeRu='Только готовая собранная Glasdon Fusion Bench на сплошном подготовленном бетонном основании: толщина не менее200мм, ось крепления не ближе110мм к краю. Четыре штатных узла и отверстия на установленную скамью; сверло10мм, глубина140мм, гайкаM10, головка17мм, рекомендуемый максимум затяжки27Н·м. Труд и дополнительные ресурсы не нормированы.';

export function fusionBenchDefinitionS2758():AutomaticOwnerDefinition {
  const inputs:AutomaticParameterSpec[]=pack.userInputs.map(p=>({id:p.id,title:p.titleRu,
    valueType:p.id==='anchor_supply_scope'?'enum':p.unitId===null?'text':('integer' in p&&p.integer?'integer':'decimal'),unitId:p.unitId,
    kind:p.id==='bench_count'?'ordinary':'conditional',
    ...('minimum' in p?{min:p.minimum}:{}),...('choices' in p?{values:p.choices}:{}),
    ...(p.requiredWhen?{requiredWhen:p.requiredWhen as AutomaticInclusionCondition}:{})}));
  const conditional=inputs.filter(p=>p.kind!=='ordinary');
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
    rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category:'material',title,unitId,expression,
    procurement:false,inputParameterIds:installation,...extra});
  const benchName='Скамья готовая собранная, 1800×310×425 мм';
  const fixingName='Узел крепления скамьи к бетону, гайка M10, шайбы';
  add('bench-consumed','Устанавливаемые скамьи — '+benchName,'pcs','bench_count',
    {costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':bench-order'});
  const benchBalance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':bench-order',orderUnitId:'pcs',consumed:'bench_count',
    stock:'bench_stock',reserve:'bench_reserve',quantum:'bench_quantum'});
  add('bench-order',benchName,'pcs','ceil(max(0,bench_count+bench_reserve-bench_stock)/bench_quantum)*bench_quantum',
    {...benchBalance.owner,procurement:true,inputParameterIds:[...installation,...benchSupply],titleParameterIds:['actual_bench_supply_specification']});
  add('fixing-included',fixingName+' — входит в комплект скамьи','pcs','4*bench_count',
    {costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inclusion:{kind:'equals',parameterId:'anchor_supply_scope',value:includedBenchFixingsS2758},
      inputParameterIds:[...installation,'anchor_supply_scope']});
  add('fixing-consumed-separate','Устанавливаемый крепёж — '+fixingName,'pcs','4*bench_count',
    {costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':fixing-order',
      inclusion:{kind:'equals',parameterId:'anchor_supply_scope',value:separateBenchFixingsS2758}});
  const fixingBalance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':fixing-order',orderUnitId:'pcs',consumed:'4*bench_count',
    stock:'fixing_stock',reserve:'fixing_reserve',quantum:'fixing_quantum'});
  add('fixing-order',fixingName,'pcs','ceil(max(0,4*bench_count+fixing_reserve-fixing_stock)/fixing_quantum)*fixing_quantum',
    {...fixingBalance.owner,procurement:true,inclusion:{kind:'equals',parameterId:'anchor_supply_scope',value:separateBenchFixingsS2758},
      inputParameterIds:[...installation,'fixing_supply_specification','fixing_stock_compatibility_reference'],titleParameterIds:['fixing_supply_specification']});
  for(const gap of pack.gaps){
    const id='open_scope_qty_'+gap.id.replaceAll('-','_');
    conditional.push({id,title:gap.specificationRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});
    add(gap.id,gap.specificationRu,gap.unitId??'',id,{category:gap.category,inputParameterIds:installation});
  }
  const original=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:'Glasdon Fusion Bench: C000/0096, крепление к бетону',source_document_version:source.edition??'C000/0096',
      definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:'C000/0096, page2 concrete fixing steps1–6; current Fusion Bench product page'},
    applicabilityRu:scopeRu,ordinary:inputs.filter(p=>p.kind==='ordinary'),profile:[],conditional,rows,
    deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  return {...original,parameters:original.parameters.map(p=>{
    const field=pack.userInputs.find(f=>f.id===p.parameter_id),guide=p.truth_metadata.guide as Record<string,unknown>;
    if(p.parameter_id.startsWith('open_scope_qty_'))return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,
      'Источник не устанавливает норму ресурса, количество и владельца цены. Это техническая потребность приложения, не поле для ручного ввода нормы.')};
    if(!field)return p;
    return {...p,required:field.required,truth_metadata:{...p.truth_metadata,value_source_role:field.valueSourceRole,
      source_confirmation_required:false,provenance:{consumer_input_role_v1:field.consumerInputRole},
      ...(field.requiredWhen?{required_when:field.requiredWhen}:{}),guide:{...guide,verified_at:'2026-10-10T14:00:00Z',
        guide_short_ru:'guide' in field?field.guide:field.titleRu+': укажите фактическое значение по объекту или поставщику.'}}};
  }),resources:original.resources.map(r=>{
    const key=r.row_id.slice(prefix.length+1),gap=pack.gaps.find(g=>g.id===key);
    const included=key==='fixing-included',fixing=key.startsWith('fixing-');
    const {row_sha256:_hash,...body}=r;
    const updated={...body,cost_owner_id:included?prefix+':bench-order':r.cost_owner_id,resource_graph:{...r.resource_graph,
      ...(included?{parentCostOwnerId:prefix+':bench-order',includedInResourceOwnerRowId:prefix+':bench-order'}:{}),
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
        operationId:prefix+':operation:'+(gap?gap.id:'installation'),operationTitleRu:gap?.specificationRu??'Установка готовой скамьи и крепежа',
        processOrdinal:gap?40:10,completionCriterionRu:gap?'Определены применимость, единица, количество и владелец цены.':'Установлено точное изделие по инструкции; проверены основание и крепления.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
        brandAndModelRu:gap?null:'Glasdon Fusion Bench',specificationRu:gap?gap.specificationRu:fixing?pack.materials[1].specificationRu:pack.materials[0].specificationRu,
        detailsRu:gap?['Потребность не завершена: количественной нормы в источнике нет.',...(gap.unitId===null?['Единица, количество и владелец цены пока не определены.']:[])]:
          [scopeRu,...(fixing?['Болт, гайкаM10, малая шайба, большая шайба ИЛИ пластина и пластиковая шайба входят в один узел; отдельных повторных закупок нет.']:[]),
            ...(included?['Четыре крепления на каждую установленную скамью входят в стоимость полного комплекта; отдельного заказа нет.']:[])]}},
      source_metadata:{...r.source_metadata,sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':key.endsWith('-order')?'DERIVED_PURCHASE_BALANCE':'MANUFACTURER_INSTALLATION_COMPOSITION',
        normativeTrace:gap?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'MANUFACTURER_INSTALLATION_COMPOSITION'})),
        official_url:source.url,source_artifact_sha256:source.sha256,exact_locator:'C000/0096 page2 steps1–6; Fusion Bench product page',
        exact_product:'Glasdon Fusion Bench',holesPerInstalledBench:4,quantityUnitUnconfirmed:gap?.unitId===null,
        full_technical_acceptance:false,sourceOutlineSha256:pack.sourceAdmission.outlineSha256}};
    return {...updated,row_sha256:estimateDeterministicHash(updated)};
  })};
}

export function compileFusionBenchS2758(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({
  catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'bench_count',definition:fusionBenchDefinitionS2758(),submittedParameters:input});}

/** Physical expectations are frozen from the manufacturer's instructions before generating the owner. */
export function fusionBenchCompletenessMapS2758(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',
  sourceKind:'TECHNOLOGY_MAP',generatedFromCurrentRows:false,evidenceSha256:source.sha256,
  evidenceReferences:[source.url,'C000/0096 page2 steps1–6'],entries:[
    {expectedResourceId:'FUSION:ASSEMBLED_BENCH',operationId:'setting',category:'material',specification:pack.materials[0].specificationRu,
      condition:'exact assembled Fusion Bench on prepared continuous concrete',sourceId:pack.sourceId,unitId:'pcs',quantityRule:'N_INSTALLED_BENCHES',
      formulaId:prefix+':formula:bench-consumed',resolution:{kind:'ROW',rowId:prefix+':bench-consumed'}},
    ...[true,false].map(included=>({expectedResourceId:'FUSION:FOUR_FIXINGS:'+included,operationId:'fixing',category:'material',
      specification:pack.materials[1].specificationRu,condition:included?includedBenchFixingsS2758:separateBenchFixingsS2758,
      sourceId:pack.sourceId,unitId:'pcs',quantityRule:'FOUR_PER_INSTALLED_BENCH',
      formulaId:prefix+':formula:'+(included?'fixing-included':'fixing-consumed-separate'),
      resolution:{kind:'ROW',rowId:prefix+':'+(included?'fixing-included':'fixing-consumed-separate')}})),
  ]};}
