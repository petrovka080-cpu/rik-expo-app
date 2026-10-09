import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {cn87SeparationConfigS2754} from './prepareS2754Cn87SeparationScreed';
import {ct29IndoorPlasterPackS2754 as pack,ct29IndoorPlasterDefinitionS2754 as definition,ct29IndoorPlasterCompletenessMapS2754,
 compileCt29IndoorPlasterS2754,ct29IndoorPlasterPrefixS2754 as prefix} from '../../../src/lib/estimate/v4/ct29IndoorPlasterS2754';
export function ct29ControlInputS2754(index=1){const p=pack.products[index];return {plaster_area_m2:35.57,layer_thickness_mm:5,
 base_confirmed:pack.baseValue,conditions_confirmed:pack.conditionsValue,layer_applicability_confirmed:pack.layerValue,
 project_detail_reference:'КОНТРОЛЬ ДЛЯ ПРОВЕРКИ: не реальный узел и не одобрение любой толщины изготовителем',selected_ct29_bag:p.bagKg+' кг'};}
export function ct29ExplicitControlS2754(index=1){const p=pack.products[index],key='ct29_'+p.key;return {...ct29ControlInputS2754(index),
 [key+'_planned_whole_batches']:index===0?65:13,[key+'_stock_bags']:0,[key+'_reserve_bags']:0,[key+'_supplier_bag_multiple']:1,
 [key+'_water_l_per_batch']:index===0?1.2:6,water_stock_l:0,water_reserve_l:0,water_quantum_l:1};}
export function ct29IndoorPlasterConfigS2754(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
 const base=cn87SeparationConfigS2754(parent),included=[pack.scopeRu,'Принятый приблизительный net-профиль: площадь×назначенная толщина×1,8кг/м²/мм',
  'Отдельные минимальный расчётный план и подтверждённый последовательный план целых замесов; не факт приготовления',
  'Одна выбранная фасовка5или25кг с её собственным рецептом воды; запасы целыми пригодными мешками',
  'Вода лёгкого распыления при уходе раскрыта отдельно с открытым количеством'];
 return {...base,contract:pack.contract,stopCode:'S2754_CT29_INDOOR_PLASTER',applicationName:'s2754-ct29-indoor-plaster',
  outputRoot:resolve('.release-runtime/r568/s27-54/ct29-indoor-plaster/publication'),expectedParentShape:[0,0,0],catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourcePaths:['scripts/estimate/r4a13/prepareS2754Ct29IndoorPlaster.ts','scripts/estimate/r4a13/prepareS2754Cn87SeparationScreed.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
   'src/lib/estimate/v4/ct29IndoorPlasterS2754.ts','data/estimate-benchmarks/source-packs/ct29-indoor-plaster-s27-54.json',pack.acceptedPhysicalSourcePack,
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',pack.source.localArtifact],
  sourceMetadata:{source_title:'Ceresit CT29: ручная внутренняя штукатурка и подтверждённый план целых замесов',source_authority:'Изготовитель Ceresit/Henkel; принятый net-профиль переиспользован',
   source_kind:'MANUFACTURER_APPROXIMATE_PHYSICAL_CONSUMPTION_AND_EXPLICIT_WHOLE_BATCH_PLAN',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,
   exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu+' Числовой диапазон толщины, часы и количества дополнительных ресурсов не опубликованы; полной приёмки нет.'},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{plaster_area_m2:35.57},acceptanceInput:ct29ControlInputS2754(),validationScenario:'S2754_CT29_MANUAL_INDOOR_WHOLE_BATCHES_SEPARATE_ORDER_AND_WATER',
  passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Раскрыты конкретные CT29, вода, инструмент и уход; net-потребность, подтверждённый план и заказ различаются. Узел/толщина и дополнительные нормы обязательны.',
   includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(gap=>prefix+':'+gap.id),independentCompletenessMap:ct29IndoorPlasterCompletenessMapS2754()},
  applicability:{country:'KG',product:'Ceresit CT29',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,base:'PREPARED_LOW_ABSORPTION_CONCRETE',
   application:'INDOOR_MANUAL_PLASTER_SMOOTHING',layerNumericalRangeNotPublished:true,projectLayerReferenceRequired:true,wholeBatchCountExplicit:true,
   waterFromConfirmedPlanNotPurchase:true,calculatedPlanExcessNotWasteNorm:true,confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
  binding:{rowId:prefix+':net-mixture',applicability:{basis:'AREA_ACTUAL_LAYER_THICKNESS',approximateRateKgM2Mm:1.8,confirmedLaborNorm:false}},
  locator:{key:'s2754-ct29-indoor-plaster',payload:{sourcePack:pack,acceptedNetProfileReused:true,oneSelectedBagOnly:true,
   noThicknessRangeInvented:true,oldMechanizedGypsumPassportUntouched:true,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['Ручная штукатурка CT29 внутри по готовому бетону','CT29 с подтверждённой толщиной и планом замесов'],
   shortScopeRu:pack.scopeRu+' Конкретные смесь, вода замеса, инструмент и уход; часы и вода ухода требуют источника.',
   keyDistinguishingParameters:['layer_thickness_mm','project_detail_reference','selected_ct29_bag','base_confirmed'],
   clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
   extraSearchTermsRu:'штукатурка CT29 Ceresit бетон внутренняя ручная полутерок вода дрель миксер уход распылитель5кг25кг',
   sourceProvenance:{sourcePack:'ct29-indoor-plaster-s27-54.json',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,primaryMeasureParameterId:'plaster_area_m2',fullTechnicalAcceptance:false}},
  catalogAppend:{identity:{namespace:'global',domain:'plaster_paint',sourceIdentity:'ceresit-ct29:tds0120:manual-indoor-prepared-low-absorption-concrete',workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},
   searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:'join',groupId:'wg:base:plaster_paint_interior_wall_plaster_apply',groupNameRu:'нанесение штукатурки стен для высокой нагрузки',
    domainId:'plaster_paint',systemId:'plaster_paint',subsystemId:'wg:base:plaster_paint_interior_wall_plaster_apply',assemblyId:'wg:base:plaster_paint_interior_wall_plaster_apply',
    workFamilyId:'wg:base:plaster_paint_interior_wall_plaster_apply',breadcrumb:['нанесение штукатурки стен для высокой нагрузки'],membershipOrdinal:7,
    groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerScopeOnly:true},
    constructionState:'PREPARED_LOW_ABSORPTION_CONCRETE',technologyVariant:'CT29_MANUAL_INDOOR_EXPLICIT_WHOLE_BATCH_PLAN',normativeClassifiers:['C_CT29_TDS_1_0120'],
    applicabilityTags:['CT29','MANUAL_INDOOR_PLASTER','APPROVED_PROJECT_LAYER','EXPLICIT_WHOLE_BATCH_PLAN','MANUFACTURER_PARTIAL']}},
  forbiddenAdjacentMatchers:[/CT17|CT16|gypsum|гипсов|наружн.*фасад|deep_loss/iu],owner:'S2754_CT29_SINGLE_WRITER',receiptFileStem:'ct29_indoor_plaster',
  verifyCore:async()=>{
   assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:ct29IndoorPlasterCompletenessMapS2754(),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
   const minimal=await compileCt29IndoorPlasterS2754(ct29ControlInputS2754());assert.equal(minimal.rows.length,2);assert.equal(minimal.rows.filter(row=>row.included_in_procurement).length,0);
   const input=ct29ExplicitControlS2754(),r=await compileCt29IndoorPlasterS2754(input);assert.equal(r.rows.length,12);assert.equal(r.preliminaryNeeds.length,8);
   for(const [id,quantity] of [['net-mixture','320.13'],['25kg-minimum-batches','13'],['25kg-prepared-mixture','325'],['25kg-plan-excess','4.87'],
    ['25kg-order','325'],['25kg-ordered-bags','13'],['25kg-mix-water-min','74.1'],['25kg-mix-water-max','80.6'],['25kg-mix-water-consumed','78'],['25kg-mix-water-order','78']])
    assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,quantity,id);
   assert.equal(r.rows.filter(row=>row.included_in_procurement).length,2);assert(!r.rows.some(row=>row.row_id.startsWith(prefix+':5kg-')));
   const five=await compileCt29IndoorPlasterS2754(ct29ExplicitControlS2754(0));assert.equal(five.rows.find(row=>row.row_id===prefix+':5kg-mix-water-min')?.quantity,'71.5');
   assert.equal(five.rows.find(row=>row.row_id===prefix+':5kg-mix-water-max')?.quantity,'84.5');assert.equal(five.rows.filter(row=>row.included_in_procurement).length,2);
   const stock=await compileCt29IndoorPlasterS2754({...input,ct29_25kg_stock_bags:4,ct29_25kg_reserve_bags:1,ct29_25kg_supplier_bag_multiple:2});
   assert.equal(stock.rows.find(row=>row.row_id===prefix+':25kg-order')?.quantity,'250');assert.equal(stock.rows.find(row=>row.row_id===prefix+':25kg-mix-water-consumed')?.quantity,'78');
   const otherBag=await compileCt29IndoorPlasterS2754({...input,selected_ct29_bag:'5 кг',ct29_5kg_planned_whole_batches:65,ct29_5kg_water_l_per_batch:1.2});
   assert(!otherBag.rows.some(row=>row.row_id===prefix+':5kg-order'));assert(otherBag.preliminaryNeeds.some(row=>row.row_id===prefix+':5kg-order'));
   const noReference=await compileCt29IndoorPlasterS2754({...input,project_detail_reference:undefined});assert.equal(noReference.rows.length,0);
   await assert.rejects(()=>compileCt29IndoorPlasterS2754({...input,ct29_25kg_planned_whole_batches:12}));
   await assert.rejects(()=>compileCt29IndoorPlasterS2754({...input,ct29_25kg_water_l_per_batch:6.21}));
   await assert.rejects(()=>compileCt29IndoorPlasterS2754({...ct29ExplicitControlS2754(0),ct29_5kg_water_l_per_batch:1.31}));
   await assert.rejects(()=>compileCt29IndoorPlasterS2754({...input,layer_thickness_mm:0}));
   const curing=definition.resources.find(row=>row.row_id===prefix+':curing-water');assert.equal((curing?.resource_graph.publicResourcePresentationV1 as {specificationRu:string|null}).specificationRu,null);
   assert.deepEqual(curing?.source_metadata?.normativeTrace,[]);
   assert.equal(definition.resources.find(row=>row.row_id===prefix+':25kg-mix-water-order')?.source_metadata?.sourceRole,'DERIVED_PURCHASE_BALANCE');
   assert(definition.parameters.filter(p=>p.parameter_id.includes('stock')||p.parameter_id.includes('reserve')||p.parameter_id.includes('planned_whole_batches')).every(p=>p.default_value==null));
   return {status:'GREEN_LIMITED_CT29_MATERIAL_AND_BATCH_PLAN',knownRows:12,needs:8,procurementRows:2,approximatelyRequiredKg:320.13,
    explicitPlanWhole25KgBatches:13,plannedPreparedKg:325,calculatedPlanExcessKg:4.87,plannedMixWaterL:78,
    batchPlanNotActualPreparation:true,planExcessNotWasteNorm:true,recipeRangesNotTransferredAcrossSizes:true,waterNotBasedOnOrder:true,
    openBagsNotCounted:true,layerReferenceRequired:true,layerNumericalRangeNotPublished:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
  }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Ct29IndoorPlaster.ts')){
 const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 void runMasterSingleDefinitionSuccessorR1(ct29IndoorPlasterConfigS2754({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
 .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
