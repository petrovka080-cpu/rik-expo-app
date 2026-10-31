import source from '../../../../data/estimate-benchmarks/source-packs/masonry-silicate65-m75-own-cycle-r4.json';
import flow from '../../../../data/estimate-benchmarks/source-packs/masonry-ready-m50-whole-supply-cycle-r2.json';
import front from '../../../../data/estimate-benchmarks/source-packs/masonry-ceramic250-whole-family-composition-r2.json';

type Entry=Readonly<{expectedResourceId:string;operationId:string;requiredOperationIds:readonly string[];sourceId:string;category:string;unitId:string;specification:string;quantityRule:string;formulaId:string;condition:string;resolution:Readonly<{kind:'ROW';rowId:string}>;componentEvidenceSourceId?:string}>;
const row=(key:string)=>source.prefix+':'+key;
const flowOperation=(key:string)=>flow.prefix+':operation:'+key;
const frontOperation=(key:string)=>front.prefix+':operation:'+key;
const normOperation=(key:'masonry'|'handling')=>source.groupId+':operation:'+key;
const condition='Собственный полнотелый силикатный кирпич250×120×65, внутренняя ненесущая стена250мм, готовый цементно-известковыйМ75, этаждо4м, положительный чистый объём. Приложение выбрало точный источник; фактическая партия, проект, качество, нагрузки, доступ, защита и полное обеспечение не подтверждены выбором.';
const frontTitles:Readonly<Record<string,string>>={
 'prepare-front':'Подготовка рабочего фронта кирпичной кладки',access:'Устройство и перемещение полного доступа для кладки',
 'receive-front':'Приём готового раствора на рабочем фронте','lay-and-fit':'Кладка и ручная подгонка кирпича',
 control:'Операционный контроль и приёмка кирпичной кладки','clean-return':'Очистка, возврат инвентаря и сбор отходов кладки',
};

/** Expectations come from the saved source rates, complete physical rosters,
 * maker BOM and explicit unclosed whole operations, never the generated rows.
 * A source inventory line is not an actual supply/order or a consumption rate. */
export function masonrySilicate65M75IndependentCompletenessR4(inherited:unknown){
 if(!inherited||typeof inherited!=='object'||Array.isArray(inherited))throw Error('MASONRY_SILICATE65_M75_COMPLETENESS_PARENT_MAP');
 const old=inherited as Record<string,unknown>;
 if(!Array.isArray(old.entries)||!Array.isArray(old.evidenceReferences))throw Error('MASONRY_SILICATE65_M75_COMPLETENESS_PARENT_ARRAYS');
 const entry=(key:string,resourceId:string,formulaId:string,operations:readonly string[],sourceId:string,category:string,unitId:string,specification:string,quantityRule:string,componentEvidenceSourceId?:string):Entry=>({
  expectedResourceId:row('expected:'+key),operationId:operations[0]!,requiredOperationIds:[...new Set(operations)],sourceId,category,unitId,specification,quantityRule,formulaId,condition,resolution:{kind:'ROW',rowId:resourceId},...(componentEvidenceSourceId?{componentEvidenceSourceId}:{}),
 });
 const entries:Entry[]=[
  ...source.rates.map(rate=>{
   const primary=normOperation(rate.key==='tower-crane'||rate.key==='operators-included'?'handling':'masonry');
   const uses=rate.operationKeys.flatMap(key=>key==='ready-mortar-post'?flow.operations.map(step=>flowOperation(step.key)):key==='control-and-protect'?[frontOperation('control')]:key==='clean-return-waste'?[flowOperation('clean'),frontOperation('clean-return')]:[normOperation(key==='receive-store'?'handling':'masonry')]);
   return entry('norm:'+rate.key,row(rate.key),row('formula:'+rate.key),[primary,...uses],source.sourceId,rate.category,rate.unitId,rate.titleRu,'OWN_EXPLICIT_KG08_COLUMN07_SILICATE65_READY_CEMENT_LIME_M75_'+rate.perM3+'_PER_NET_M3_NOT_M50_PAYMENT');
  }),
  ...flow.roster.map(item=>entry('flow:'+item.key,flow.prefix+':'+item.key,flow.prefix+':formula:'+item.key,item.operations.map(flowOperation),source.sourceId,item.category,item.unitId,item.titleRu,'WHOLE_EXISTING_SEQUENTIAL_FLOW_SOURCE_STOCK_'+item.quantity+'_SAME_OWNER_NOT_CONSUMPTION_OR_ORDER',flow.sourceId)),
  ...source.flowOperations.map(step=>entry('operation:'+step.key,row('operation:'+step.key),row('formula:operation:'+step.key),[flowOperation(step.key)],source.sourceId,'work','m3',step.titleRu,'OWN_EFFECTIVE_M75_MORTAR_VOLUME_AFTER_MANUAL_QUANTITY_NO_EXTRA_LABOUR')),
  ...front.stock.map(item=>entry('front:'+item.key,front.prefix+':'+item.key,front.prefix+':formula:'+item.key,item.operationKeys.map(frontOperation),source.sourceId,item.category,item.unitId,item.titleRu,'WHOLE_EXISTING_EIGHT_MASON_SOURCE_STOCK_'+item.quantity+'_NOT_CURRENT_ISSUE_OR_ORDER',front.sourceId)),
  ...front.panelProduct.perCompletePanel.map(item=>entry('panel:'+item.key,front.prefix+':'+item.key,front.prefix+':formula:'+item.key,[frontOperation('access')],source.sourceId,'equipment',item.unitId,item.titleRu,'EXACT_EXISTING_MAKER_BOM_'+item.quantity+'_PER_ACTUAL_PPR_PANEL_NO_GEOMETRY_GUESSED_COUNT',front.sourceId)),
  ...front.operationKeys.map(key=>entry('front:operation:'+key,frontOperation(key),front.prefix+':formula:operation:'+key,[frontOperation(key)],source.sourceId,'work','m3',frontTitles[key]!,'SOURCE_NET_WALL_SCOPE_WITH_ACTUAL_METHOD_QUALITY_COMPARISON_NOT_EXTRA_PAID_HOURS',front.sourceId)),
  ...(['upper-control','crane-control','return-balance'] as const).map(key=>entry('control:'+key,row(key),row('formula:'+key),[key==='return-balance'?row('operation-scope:lay-bond-fit'):flowOperation('feed')],source.sourceId,'service','kg',key==='upper-control'?'Фактическая нагрузка верхнего захвата':key==='crane-control'?'Фактическая нагрузка на крюк крана':'Сохранённый возврат и остатки раствора','MANDATORY_ZERO_EXCESS_FROM_OWN_EFFECTIVE_M75_AND_ACTUAL_RECORDS_NOT_MANUAL_ZERO')),
  ...(['returned','waste'] as const).map(key=>entry('balance:'+key,row(key),row('formula:'+key),[flowOperation('clean')],source.sourceId,'material','kg',key==='returned'?'Фактический возврат раствора марки75':'Фактические передаваемые остатки раствора марки75','ACTUAL_OBJECT_KG_RECORD_AND_SAVED_MANUAL_QUANTITY_NOT_WASTE_PERCENT')),
  entry('actual-scope',row('actual-scope'),row('formula:actual-scope'),[row('operation-scope:lay-bond-fit')],source.sourceId,'service','set','Соответствие материалов, проекта, качества и действующего полного фронта','MANDATORY_ACTUAL_OBJECT_SCOPE_NOT_SOURCE_SELECTION_OR_CLOSED_DEVELOPER_GAPS'),
  entry('whole-physical-coverage',row('whole-physical-coverage'),row('formula:whole-physical-coverage'),[flowOperation('prepare')],source.sourceId,'service','set','Сохранность целого исходного состава подачи и рабочего фронта','MANDATORY_ALL_SOURCE_COMPONENT_ROWS_INCLUDED_NOT_SOURCE_AVAILABILITY'),
  ...source.wholeOpenNeeds.map(gap=>entry('need:'+gap.key,row('need:'+gap.key),row('formula:need:'+gap.key),[row('operation-scope:lay-bond-fit')],source.sourceId,'service','set',gap.titleRu,'UNRESOLVED_APPLICATION_NORM_NULL_NOT_SUPPLIED_BY_SOURCE_CHOICE_OR_PROJECT_RECORD: '+gap.reason)),
 ];
 if(entries.some(value=>!value.operationId||!value.specification)||new Set(entries.map(value=>value.expectedResourceId)).size!==entries.length)throw Error('MASONRY_SILICATE65_M75_SOURCE_EXPECTATIONS');
 return{...old,contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,operationResourceBindingRequired:true,
  evidenceSha256:source.sources.find(item=>item.role==='kg08')!.sha256,
  evidenceReferences:[...old.evidenceReferences,...source.sources.map(item=>item.path),flow.source.path,flow.methodSource.path,...front.sources.map(item=>item.path)],
  entries:[...old.entries,...entries],parentNeedsClosed:0,newFullTechnologies:0,fullTechnicalAcceptance:false,wholeMasonryFamilyStillUnderComposition:true,
  ownSilicate65M75:{contract:source.contract,wholeFlowStockReused:flow.roster.length,wholeFrontStockReused:front.stock.length,wholePanelComponentTypes:front.panelProduct.perCompletePanel.length,actualFitNotConfirmed:true,sourceNormNotM50:true},
 };
}
