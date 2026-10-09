import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {floorDemolitionSeriesS2754Config} from './prepareS2754FloorDemolitionSeries';
import {cn87SeparationSourcePackS2754 as pack,cn87SeparationDefinitionS2754 as definition,cn87SeparationCompletenessMapS2754,
 compileCn87SeparationS2754,cn87SeparationPrefixS2754 as prefix} from '../../../src/lib/estimate/v4/cn87SeparationScreedS2754';
export function cn87ControlInputS2754(){return {screed_area_m2:35.57,ready_layer_confirmed:pack.readyLayerValue,
 construction_confirmed:pack.constructionValue,conditions_confirmed:pack.conditionsValue,joints_confirmed:pack.jointsValue,
 project_detail_reference:'КОНТРОЛЬНЫЙ ВВОД ДЛЯ ПРОВЕРКИ; не проект объекта и не утверждённая схема швов'};}
export function cn87SeparationConfigS2754(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
 const base=floorDemolitionSeriesS2754Config(0,parent),included=[pack.scopeRu,'Принятый физический профиль: приблизительно 100 кг/м² при 50 мм; мешок 25 кг',
  'Вода чистая прохладная: опубликованный диапазон 1,75–2 л/25 кг смешиваемой массы; без автоматического среднего значения',
  'Чистая потребность отдельно от заказа с фактическими наличием, резервом и кратностью поставщика'];
 return {...base,contract:pack.contract,stopCode:'S2754_CN87_SEPARATION',applicationName:'s2754-cn87-separation-screed',
  outputRoot:resolve('.release-runtime/r568/s27-54/cn87-separation-screed/publication'),catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourcePaths:['scripts/estimate/r4a13/prepareS2754Cn87SeparationScreed.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
   'src/lib/estimate/v4/cn87SeparationScreedS2754.ts','data/estimate-benchmarks/source-packs/cn87-separation-screed-s27-54.json',pack.acceptedPhysicalSourcePack,
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',pack.source.localArtifact],
  sourceMetadata:{source_title:'Ceresit CN87: техническая карта CN_87_KT_10.21 и принятый физический профиль стяжки 50 мм',
   source_authority:'Изготовитель Ceresit/Henkel; принятый физический профиль переиспользован',source_kind:'MANUFACTURER_PHYSICAL_CONSUMPTION_AND_TECHNOLOGY_NO_LABOR_RATE',
   official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,
   use_restriction:pack.scopeRu+' Часы и дополнительные количества не опубликованы; полная техническая приёмка не присвоена.'},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{screed_area_m2:35.57},acceptanceInput:cn87ControlInputS2754(),validationScenario:'S2754_CN87_READY_SEPARATION_50MM_MATERIAL_BALANCE',
  passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Подтверждены конкретная смесь, расход и технология; готовый слой и схема швов обязательны, часы и дополнительный состав требуют источника.',
   includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(gap=>prefix+':'+gap.id),
   independentCompletenessMap:cn87SeparationCompletenessMapS2754()},
  applicability:{country:'KG',product:'Ceresit CN87',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,
   thicknessMm:50,construction:'READY_SEPARATION_LAYER',underfloorHeating:false,manualMixingAndCompaction:true,approximateConsumption:true,
   confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
  binding:{rowId:prefix+':cn87-consumed',applicability:{thicknessMm:50,construction:'READY_SEPARATION_LAYER',confirmedLaborNorm:false}},
  locator:{key:'s2754-cn87-separation-screed',payload:{sourcePack:pack,acceptedPhysicalProfileReused:true,
   waterNotFromOrderedBags:true,oldBroadDefinitionsNotNarrowed:true,stockReserveNotDefaulted:true,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['Стяжка CN87 50 мм по готовой плёнке','Стяжка Ceresit CN87 на разделительном слое без подогрева'],
   shortScopeRu:pack.scopeRu+' Конкретные смесь, вода и технология раскрыты; труд и дополнительная комплектация требуют источника.',
   keyDistinguishingParameters:['construction_confirmed','ready_layer_confirmed','joints_confirmed'],
   clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:included,excludedBoundaries:pack.excludedRu,extraSearchTermsRu:'стяжка цементная CN87 Ceresit мешок25кг 50мм разделительный слой пол вода дрель миксер кельма швы',
   sourceProvenance:{sourcePack:'cn87-separation-screed-s27-54.json',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,primaryMeasureParameterId:'screed_area_m2',fullTechnicalAcceptance:false}},
  catalogAppend:{identity:{namespace:'global',domain:'flooring',sourceIdentity:'ceresit-cn87:tds-1021:50mm:ready-separation:manual',
   workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},
   searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:'join',groupId:'wg:base:flooring_interior_subfloor_lay',
    groupNameRu:'укладка основания под покрытие для высокой нагрузки',domainId:'flooring',systemId:'flooring',subsystemId:'wg:base:flooring_interior_subfloor_lay',
    assemblyId:'wg:base:flooring_interior_subfloor_lay',workFamilyId:'wg:base:flooring_interior_subfloor_lay',breadcrumb:['укладка основания под покрытие для высокой нагрузки'],
    membershipOrdinal:7,groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},
    independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerScopeOnly:true},
    operationKind:'NEW_INSTALLATION',constructionState:'PREPARED_SEPARATION_LAYER',technologyVariant:'CN87_50MM_MANUAL_UNHEATED_SEPARATION',
    normativeClassifiers:['CN_87_KT_10.21'],applicabilityTags:['CN87','READY_SEPARATION_LAYER','EXACT_50MM','MANUFACTURER_PARTIAL']}},
  forbiddenAdjacentMatchers:[/CT17|CC81|битумн.*мастик|плинтус|переходн.*профил|cn69|heated_floating/iu],
  owner:'S2754_CN87_SINGLE_WRITER',receiptFileStem:'cn87_separation_screed',verifyCore:async()=>{
   assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:cn87SeparationCompletenessMapS2754(),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
   const input=cn87ControlInputS2754(),r=await compileCn87SeparationS2754(input);
   assert.equal(r.rows.length,4);assert.equal(r.rows.find(row=>row.row_id===prefix+':cn87-consumed')?.quantity,'3557');
   assert.equal(r.rows.find(row=>row.row_id===prefix+':water-min')?.quantity,'248.99');assert.equal(r.rows.find(row=>row.row_id===prefix+':water-max')?.quantity,'284.56');
   assert.equal(r.rows.filter(row=>row.included_in_procurement).length,0);
   assert(r.preliminaryNeeds.find(row=>row.row_id===prefix+':water-consumed')?.missing_parameter_ids.includes('mix_water_l_per_25kg'));
   const orderedInput={...input,cn87_stock_kg:0,cn87_reserve_kg:0,cn87_supplier_bag_multiple:1,mix_water_l_per_25kg:1.9,water_stock_l:0,water_reserve_l:0,water_supply_quantum_l:1},
    ordered=await compileCn87SeparationS2754(orderedInput);
   assert.equal(ordered.rows.find(row=>row.row_id===prefix+':cn87-order')?.quantity,'3575');
   assert.equal(ordered.rows.find(row=>row.row_id===prefix+':cn87-bags')?.quantity,'143');
   assert.equal(ordered.rows.find(row=>row.row_id===prefix+':water-consumed')?.quantity,'270.332');
   assert.equal(ordered.rows.find(row=>row.row_id===prefix+':water-order')?.quantity,'271');
   assert.equal(ordered.rows.filter(row=>row.included_in_procurement).length,2);assert.equal(ordered.preliminaryNeeds.length,8);
   const stock=await compileCn87SeparationS2754({...orderedInput,cn87_stock_kg:500,cn87_reserve_kg:50,cn87_supplier_bag_multiple:2});
   assert.equal(stock.rows.find(row=>row.row_id===prefix+':cn87-order')?.quantity,'3150');
   assert.equal(stock.rows.find(row=>row.row_id===prefix+':water-consumed')?.quantity,'270.332');
   const missingLayer=await compileCn87SeparationS2754({...orderedInput,ready_layer_confirmed:undefined});assert.equal(missingLayer.rows.length,0);
   const missingJoints=await compileCn87SeparationS2754({...orderedInput,joints_confirmed:undefined});assert.equal(missingJoints.rows.length,0);
   await assert.rejects(()=>compileCn87SeparationS2754({...orderedInput,mix_water_l_per_25kg:2.01}));
   await assert.rejects(()=>compileCn87SeparationS2754({...orderedInput,construction_confirmed:'52 мм по утеплителю'}));
   assert(definition.parameters.filter(p=>p.parameter_id.includes('stock')||p.parameter_id.includes('reserve')||p.parameter_id==='mix_water_l_per_25kg').every(p=>p.default_value==null));
   return {status:'GREEN_LIMITED_CN87_MATERIAL_LINKAGE',knownRows:4,orderedKnownRows:8,sourceNeeds:8,
    approximateMixtureKg:3557,orderedMixtureKg:3575,bags:143,waterConsumedL:270.332,waterOrderedL:271,
    waterBasedOnConsumptionNotOrder:true,requiredPhysicalFactsGated:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
  }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Cn87SeparationScreed.ts')){
 const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 void runMasterSingleDefinitionSuccessorR1(cn87SeparationConfigS2754({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
 .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
