import pack from '../../../../data/estimate-benchmarks/source-packs/jubilee110-bin-prepared-concrete-s27-58.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const jubilee110BinPackS2758=pack;
export const jubilee110BinPrefixS2758='jubilee110-bin-prepared-concrete';
export const includedBinFixingsS2758=pack.supplyChoices[0];
export const separateBinFixingsS2758=pack.supplyChoices[1];
const prefix=jubilee110BinPrefixS2758;
const installation=['prepared_foundation_acceptance_reference','actual_concrete_strength_n_mm2','safe_drilling_foundation_reference','minimum_safe_drilling_depth_mm','minimum_anchor_edge_distance_mm','project_bin_configuration_reference'];
const binSupply=['actual_bin_supply_specification','anchor_supply_scope','bin_stock_compatibility_reference'];
const source=pack.sources[1];
const sourceEdition='C000/0018 Issue4 February2009';
if(source.role!=='MANUFACTURER_CONCRETE_FIXING'||source.edition!==sourceEdition
  ||source.sha256!=='fe33b39e09d63d39719b5b52ac5b993cd1e121f3c0e5852e79815cb3080d67a7'
  ||pack.scope.fixingsPerInstalledBin!==4||pack.scope.minimumCleanHoleDepthMm!==130||pack.scope.drillDiameterMm!==10)
  throw Error('EXACT_JUBILEE110_CONCRETE_SOURCE_IDENTITY_REQUIRED');
const scopeRu='Только готовая собранная Glasdon Jubilee110 со стальным вкладышем110л на готовом ровном прочном бетоне20–30Н/мм². Четыре совместимых бетонных узла на урну; болтM10×120мм, гайкаM10 и обе шайбыØ20/Ø50мм. Ось не ближе110мм к краю, отверстияØ10мм очищены минимум130мм, ключ17мм, максимум27Н·м,2–3витка над гайкой. Числовая толщина основания не нормирована; фактическая пригодность сверления/анкеровки подтверждается объектом. Норм труда, инструмента и завершения нет.';

export function jubilee110BinDefinitionS2758():AutomaticOwnerDefinition {
  const inputs:AutomaticParameterSpec[]=pack.userInputs.map(p=>({id:p.id,title:p.titleRu,
    valueType:p.valueType as AutomaticParameterSpec['valueType'],unitId:p.unitId,
    kind:p.id==='bin_count'?'ordinary':'conditional',
    ...('minimum' in p?{min:p.minimum}:{}),...('maximum' in p?{max:p.maximum}:{}),...('choices' in p?{values:p.choices}:{}),
    ...(p.requiredWhen?{requiredWhen:p.requiredWhen as AutomaticInclusionCondition}:{})}));
  const conditional=inputs.filter(p=>p.kind!=='ordinary');
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
    rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:pack.titleRu,category:'material',title,unitId,expression,
    procurement:false,inputParameterIds:installation,...extra});
  const binName='Урна готовая собранная, стальной вкладыш110л,1158×598×553мм';
  const fixingName='Узел крепления урны к бетону: болтM10×120мм, гайкаM10, шайбыØ20/Ø50мм';
  add('bin-consumed','Устанавливаемые урны — '+binName,'pcs','bin_count',
    {costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':bin-order'});
  const binBalance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':bin-order',orderUnitId:'pcs',consumed:'bin_count',
    stock:'bin_stock',reserve:'bin_reserve',quantum:'bin_quantum'});
  add('bin-order',binName,'pcs','ceil(max(0,bin_count+bin_reserve-bin_stock)/bin_quantum)*bin_quantum',
    {...binBalance.owner,procurement:true,inputParameterIds:[...installation,...binSupply],titleParameterIds:['actual_bin_supply_specification']});
  add('fixing-included',fixingName+' — входит в комплект урны','pcs','4*bin_count',
    {costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inclusion:{kind:'equals',parameterId:'anchor_supply_scope',value:includedBinFixingsS2758},
      inputParameterIds:[...installation,'anchor_supply_scope']});
  add('fixing-consumed','Устанавливаемый крепёж — '+fixingName,'pcs','4*bin_count',
    {costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:prefix+':fixing-order'});
  const fixingBalance=effectivePurchaseBalanceExpressionsR1({ownerRowId:prefix+':fixing-order',orderUnitId:'pcs',consumed:'4*bin_count',
    stock:'fixing_stock',reserve:'fixing_reserve',quantum:'fixing_quantum'});
  add('fixing-order',fixingName,'pcs','ceil(max(0,4*bin_count+fixing_reserve-fixing_stock)/fixing_quantum)*fixing_quantum',
    {...fixingBalance.owner,procurement:true,inclusion:{kind:'equals',parameterId:'anchor_supply_scope',value:separateBinFixingsS2758},
      inputParameterIds:[...installation,'fixing_supply_specification','fixing_stock_compatibility_reference'],titleParameterIds:['fixing_supply_specification']});
  for(const gap of pack.gaps){
    const id='open_scope_qty_'+gap.id.replaceAll('-','_');
    conditional.push({id,title:gap.specificationRu,valueType:'decimal',unitId:gap.unitId,kind:'conditional',min:0});
    add(gap.id,gap.specificationRu,gap.unitId??'',id,{category:gap.category,inputParameterIds:installation});
  }
  const original=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:'Glasdon Jubilee110: C000/0018, крепление к бетону',source_document_version:sourceEdition,
      definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:'C000/0018, PDF1 upper concrete section concrete fixing steps1–6; current Jubilee110 product page'},
    applicabilityRu:scopeRu,ordinary:inputs.filter(p=>p.kind==='ordinary'),profile:[],conditional,rows,
    deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  return {...original,parameters:original.parameters.map(p=>{
    const field=pack.userInputs.find(f=>f.id===p.parameter_id),guide=p.truth_metadata.guide as Record<string,unknown>;
    if(p.parameter_id.startsWith('open_scope_qty_'))return {...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,
      'Источник не устанавливает норму ресурса, количество и владельца цены. Это техническая потребность приложения, не поле для ручного ввода нормы.')};
    if(!field)return p;
    return {...p,required:field.required,truth_metadata:{...p.truth_metadata,value_source_role:field.valueSourceRole,
      source_confirmation_required:false,provenance:{consumer_input_role_v1:field.consumerInputRole},
      ...(field.requiredWhen?{required_when:field.requiredWhen}:{}),guide:{...guide,verified_at:pack.verifiedAt,
        guide_short_ru:'guide' in field?field.guide:field.titleRu+': укажите фактическое значение по объекту или поставщику.'}}};
  }),resources:original.resources.map(r=>{
    const key=r.row_id.slice(prefix.length+1),gap=pack.gaps.find(g=>g.id===key);
    const included=key==='fixing-included',fixing=key.startsWith('fixing-');
    const {row_sha256:_hash,...body}=r;
    const updated={...body,cost_owner_id:included?prefix+':bin-order':r.cost_owner_id,resource_graph:{...r.resource_graph,
      ...(['bin-consumed','fixing-consumed','fixing-included'].includes(key)?{derivedQuantityEditPolicyV1:{
        contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'pcs',parameterIds:['bin_count'],
        reasonRu:'Количество устанавливаемых урн и четырёх креплений на каждую урну изменяется через поле количества урн.'}}:{}),
      ...(included?{parentCostOwnerId:prefix+':bin-order',includedInResourceOwnerRowId:prefix+':bin-order'}:{}),
      operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
        operationId:prefix+':operation:'+(gap?gap.id:'installation'),operationTitleRu:gap?.specificationRu??'Установка готовой урны и крепежа',
        processOrdinal:gap?40:10,completionCriterionRu:gap?'Определены применимость, единица, количество и владелец цены.':'Установлено точное изделие по инструкции; проверены основание и крепления.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
        brandAndModelRu:gap?null:'Glasdon Jubilee110',specificationRu:gap?gap.specificationRu:fixing?pack.materials[1].specificationRu:pack.materials[0].specificationRu,
        detailsRu:gap?['Потребность не завершена: количественной нормы в источнике нет.',...(gap.unitId===null?['Единица, количество и владелец цены пока не определены.']:[])]:
          [scopeRu,...(fixing?['БолтM10×120мм, гайкаM10, шайбыM10/Ø20мм иM10/Ø50мм входят в один совместимый узел; отдельных повторных закупок нет.']:[]),
            ...(included?['Четыре крепления на каждую установленную урну входят в стоимость полного комплекта; отдельного заказа нет.']:[])]}},
      source_metadata:{...r.source_metadata,sourceRole:gap?'UNRESOLVED_INSTALLATION_SOURCE':key.endsWith('-order')?'DERIVED_PURCHASE_BALANCE':'MANUFACTURER_INSTALLATION_COMPOSITION',
        normativeTrace:gap?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'MANUFACTURER_INSTALLATION_COMPOSITION'})),
        official_url:source.url,source_artifact_sha256:source.sha256,exact_locator:'C000/0018 PDF1 upper concrete section steps1–6; Jubilee110 product page',
        exact_product:'Glasdon Jubilee110',holesPerInstalledBin:4,quantityUnitUnconfirmed:gap?.unitId===null,
        full_technical_acceptance:false,sourceOutlineSha256:pack.sourceAdmission.outlineSha256}};
    return {...updated,row_sha256:estimateDeterministicHash(updated)};
  })};
}

export function compileJubilee110BinS2758(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({
  catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'bin_count',definition:jubilee110BinDefinitionS2758(),submittedParameters:input});}

/** Physical expectations are frozen from the manufacturer's instructions before generating the owner. */
export function jubilee110BinCompletenessMapS2758(){return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',
  sourceKind:'TECHNOLOGY_MAP',generatedFromCurrentRows:false,evidenceSha256:source.sha256,
  evidenceReferences:[source.url,'C000/0018 PDF1 upper concrete section steps1–6'],entries:[
    {expectedResourceId:'JUBILEE110:ASSEMBLED_BIN',operationId:'setting',category:'material',specification:pack.materials[0].specificationRu,
      condition:'exact assembled Jubilee110 on prepared level sound concrete20–30N/mm²',sourceId:pack.sourceId,unitId:'pcs',quantityRule:'N_INSTALLED_BINS',
      formulaId:prefix+':formula:bin-consumed',resolution:{kind:'ROW',rowId:prefix+':bin-consumed'}},
    ...[true,false].map(included=>({expectedResourceId:'JUBILEE110:FOUR_FIXINGS:'+included,operationId:'fixing',category:'material',
      specification:pack.materials[1].specificationRu,condition:included?includedBinFixingsS2758:separateBinFixingsS2758,
      sourceId:pack.sourceId,unitId:'pcs',quantityRule:'FOUR_PER_INSTALLED_BIN',
      formulaId:prefix+':formula:'+(included?'fixing-included':'fixing-consumed'),
      resolution:{kind:'ROW',rowId:prefix+':'+(included?'fixing-included':'fixing-consumed')}})),
    ...pack.gaps.map(g=>({expectedResourceId:'JUBILEE110:OPEN:'+g.id,operationId:g.id,category:g.category,specification:g.specificationRu,condition:'UNRESOLVED_NO_MANUAL_ZERO_OR_ONE',sourceId:pack.sourceId,unitId:null,quantityRule:'OPEN_SOURCE_QUANTITY_UNIT_PRICE_SCOPE',formulaId:prefix+':formula:'+g.id,resolution:{kind:'ROW',rowId:prefix+':'+g.id}})),
  ]};}
