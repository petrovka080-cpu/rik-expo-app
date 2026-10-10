import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {ct29IndoorPlasterConfigS2754,ct29ExplicitControlS2754} from './prepareS2754Ct29IndoorPlaster';
import {ct29ExteriorPlasterConfigS2754} from './prepareS2754Ct29ExteriorPlaster';
import {ct29ExistingMineralSeriesS2754 as series,ct29ExistingMineralPackS2754,ct29ExistingMineralDefinitionS2754,
  ct29ExistingMineralCompletenessMapS2754,ct29ExistingMineralPrefixS2754,compileCt29ExistingMineralS2754} from '../../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';

export function ct29ExistingMineralControlS2754(index:number){
  const type=series.types[index],pack=ct29ExistingMineralPackS2754(index),key='ct29_'+pack.products[type.controlBagIndex].key;
  return {...ct29ExplicitControlS2754(type.controlBagIndex),layer_thickness_mm:type.controlThicknessMm,
    base_confirmed:pack.baseValue,conditions_confirmed:pack.conditionsValue,layer_applicability_confirmed:pack.layerValue,
    application_mode_confirmed:pack.applicationModeValue,[key+'_planned_whole_batches']:type.controlWholeBatches,
    project_detail_reference:'CONTROL_ONLY: модель принятого штукатурного слоя по существующему основанию; не проект объекта и не одобрение произвольной толщины',
    ...(pack.weatherProtectionValue?{weather_protection_confirmed:pack.weatherProtectionValue,
      weather_protection_reference:'CONTROL_ONLY: модель принятого способа защиты от дождя и быстрого высыхания минимум24ч; не фактическое обеспечение объекта'}:{})};
}

export function ct29ExistingMineralConfigS2754(index:number,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const type=series.types[index],pack=ct29ExistingMineralPackS2754(index),outside=type.location==='OUTDOOR',prefix=ct29ExistingMineralPrefixS2754(index),
    definition=ct29ExistingMineralDefinitionS2754(index),map=ct29ExistingMineralCompletenessMapS2754(index),
    base=outside?ct29ExteriorPlasterConfigS2754(parent):ct29IndoorPlasterConfigS2754(parent),
    groupId=outside?'wg:master:ct29_exterior_existing_mineral_plaster':'wg:base:plaster_paint_interior_wall_plaster_apply',
    groupNameRu=outside?'Наружное выравнивание минеральной штукатурки Ceresit CT29':'нанесение штукатурки стен для высокой нагрузки',
    included=[pack.scopeRu,'Штукатурный слой поверх существующей цементной или цементно-известковой штукатурки подтверждается отдельным обязательным выбором',
      'Приблизительная потребность CT29 по площади и назначенной толщине; принятый net-профиль 1,8кг/м²/мм переиспользован',
      'Одна выбранная фасовка5или25кг, собственный рецепт воды, явный последовательный план целых замесов, пригодное наличие, резерв и кратность',
      ...(outside?['Наружная защита от дождя и быстрого высыхания минимум24ч требует отдельного подтверждения способа и ссылки на задание']:[])],
    mandatory=['base_confirmed','conditions_confirmed','layer_applicability_confirmed','project_detail_reference','application_mode_confirmed',
      ...(outside?['weather_protection_confirmed','weather_protection_reference']:[])];
  return {...base,contract:pack.contract,stopCode:'S2754_CT29_EXISTING_MINERAL_'+index,applicationName:'s2754-ct29-existing-'+type.key,
    outputRoot:resolve('.release-runtime/r568/s27-54/ct29-existing-mineral-series/publication/'+type.key),expectedParentShape:[0,0,0],
    catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754Ct29ExistingMineralSeries.ts','src/lib/estimate/v4/ct29ExistingMineralSeriesS2754.ts',
      'data/estimate-benchmarks/source-packs/ct29-existing-mineral-series-s27-54.json',...base.sourcePaths],
    sourceMetadata:{...base.sourceMetadata,source_title:pack.sourceTitleRu??pack.titleRu,exact_locator:pack.source.locatorRu,
      use_restriction:pack.scopeRu+' Тонкая финишная шпаклёвка и глубокие выбоины исключены; часы и дополнительные количества не подтверждены.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{plaster_area_m2:35.57},acceptanceInput:ct29ExistingMineralControlS2754(index),validationScenario:'S2754_CT29_EXISTING_'+type.key.toUpperCase().replaceAll('-','_')+'_EXPLICIT_PLASTER_LAYER',
    passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Конкретная CT29 и чистая холодная вода связаны с затворением; технология нанесения, ухода и дополнительные ресурсы раскрыты с точными пробелами. Подготовленное основание уже принято.',
      includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(g=>prefix+':'+g.id),independentCompletenessMap:map},
    applicability:{...base.applicability,acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,base:'PREPARED_SURVEYED_LOW_ABSORPTION_'+type.materialValue,
      application:type.location+'_MANUAL_PLASTER_LAYER_OVER_EXISTING_PLASTER',substrateMaterial:type.materialValue,
      separatePlasterApplicationModeRequired:true,lowAbsorptionFromSurveyNotSubstrateName:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':net-mixture',applicability:{...base.binding.applicability,installation_location:type.location,
      existing_substrate:type.materialValue,mandatoryScopeParameters:mandatory}},
    locator:{key:'s2754-ct29-existing-'+type.key,payload:{sourcePack:pack,existingNetAndWholeBatchFactoryReused:true,
      preparedConcreteDefinitionsUnchanged:true,thinPuttyAndDeepFillExcluded:true,applicationModeMandatory:true,fullTechnicalAcceptance:false}},
    search:{...base.search,canonicalNameRu:pack.titleRu,aliases:[pack.titleRu,'CT29: '+type.materialTitleRu+', '+(outside?'наружное':'внутреннее')+' штукатурное выравнивание'],
      shortScopeRu:pack.scopeRu,keyDistinguishingParameters:['base_confirmed','application_mode_confirmed','layer_thickness_mm','project_detail_reference','selected_ct29_bag',
        ...(outside?['weather_protection_confirmed','weather_protection_reference']:[])],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:'Ceresit CT29 '+type.materialTitleRu+' '+(outside?'наружная':'внутренняя')+' штукатурка выравнивание готовое основание вода миксер полутерок5кг25кг',
      sourceProvenance:{sourcePack:'ct29-existing-mineral-series-s27-54.json',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,primaryMeasureParameterId:'plaster_area_m2',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{...base.catalogAppend!.identity,sourceIdentity:'ceresit-ct29:tds0120:manual-existing-'+type.key+'-prepared-surveyed-low-absorption',workKey:pack.workKey,titleRu:pack.titleRu},
      searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:index===2?'create':'join',groupId,groupNameRu,subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,
        breadcrumb:[groupNameRu],membershipOrdinal:outside?index-2:index+8,constructionState:'PREPARED_SURVEYED_LOW_ABSORPTION_'+type.materialValue,
        technologyVariant:'CT29_EXISTING_'+type.key.toUpperCase().replaceAll('-','_')+'_EXPLICIT_PLASTER_LAYER',
        applicabilityTags:['CT29','EXISTING_'+type.materialValue,type.location,'EXPLICIT_PLASTER_LAYER','APPROVED_PROJECT_LAYER','EXPLICIT_WHOLE_BATCH_PLAN','MANUFACTURER_PARTIAL']}},
    forbiddenAdjacentMatchers:[/CT17|CT16|gypsum|deep_loss|ETICS/iu],owner:'S2754_CT29_EXISTING_MINERAL_SINGLE_WRITER',receiptFileStem:'ct29_existing_'+type.key.replaceAll('-','_'),
    verifyCore:()=>verifyCt29ExistingMineralS2754(index)};
}

export async function verifyCt29ExistingMineralS2754(index:number){
  const type=series.types[index],pack=ct29ExistingMineralPackS2754(index),definition=ct29ExistingMineralDefinitionS2754(index),prefix=ct29ExistingMineralPrefixS2754(index),
    bag=pack.products[type.controlBagIndex],key='ct29_'+bag.key,input=ct29ExistingMineralControlS2754(index),compile=(p:Record<string,unknown>)=>compileCt29ExistingMineralS2754(index,p);
  assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:ct29ExistingMineralCompletenessMapS2754(index),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
  const result=await compile(input),qty=(id:string)=>result.rows.find(r=>r.row_id===prefix+':'+id)?.quantity;
  assert.equal(result.rows.length,12);assert.equal(result.preliminaryNeeds.length,pack.sourceNeeds.length);assert.equal(result.rows.filter(r=>r.included_in_procurement).length,2);
  for(const [id,value] of [['net-mixture',type.expectedNetKg],[bag.key+'-prepared-mixture',type.expectedPlanKg],[bag.key+'-order',type.expectedPlanKg],
    [bag.key+'-ordered-bags',String(type.controlWholeBatches)],[bag.key+'-mix-water-consumed',type.expectedWaterL],[bag.key+'-mix-water-order',type.expectedWaterL]])assert.equal(qty(id),value,id);
  const other=pack.products[1-type.controlBagIndex];assert(!result.rows.some(r=>r.row_id.startsWith(prefix+':'+other.key+'-')));
  for(const fact of ['application_mode_confirmed','base_confirmed','project_detail_reference',...(pack.weatherProtectionValue?['weather_protection_confirmed','weather_protection_reference']:[])])
    assert.equal((await compile({...input,[fact]:undefined})).rows.length,0,fact);
  await assert.rejects(()=>compile({...input,application_mode_confirmed:'Тонкая финишная шпаклёвка'}));
  await assert.rejects(()=>compile({...input,base_confirmed:ct29ExistingMineralPackS2754(index%2===0?index+1:index-1).baseValue}));
  await assert.rejects(()=>compile({...input,open_qty_curing_water:1}));
  await assert.rejects(()=>compile({...input,[key+'_planned_whole_batches']:Math.ceil(Number(type.expectedNetKg)/bag.bagKg)-1}));
  await assert.rejects(()=>compile({...input,[key+'_water_l_per_batch']:bag.waterMaxLPerBag+0.01}));
  const stock=await compile({...input,[key+'_stock_bags']:4,[key+'_reserve_bags']:1,[key+'_supplier_bag_multiple']:2});
  assert.equal(stock.rows.find(r=>r.row_id===prefix+':'+bag.key+'-order')?.quantity,String(Math.ceil((type.controlWholeBatches+1-4)/2)*2*bag.bagKg));
  assert.equal(stock.rows.find(r=>r.row_id===prefix+':'+bag.key+'-mix-water-consumed')?.quantity,type.expectedWaterL);
  assert(definition.parameters.every(p=>p.default_value==null));
  assert(definition.resources.every(r=>Array.isArray(r.resource_graph.inputParameterIds)&&r.resource_graph.inputParameterIds.includes('application_mode_confirmed')));
  return {key:type.key,shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],knownRows:12,sourceNeeds:pack.sourceNeeds.length,procurementRows:2,
    approximateNetKg:type.expectedNetKg,plannedWholeBatches:type.controlWholeBatches,bagKg:bag.bagKg,plannedPreparedKg:type.expectedPlanKg,plannedWaterL:type.expectedWaterL,
    applicationModeGated:true,oneSelectedBagOnly:true,existingFactoryReused:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Ct29ExistingMineralSeries.ts')){
  const index=Number(process.argv.find(arg=>arg.startsWith('--index='))?.split('=')[1]);
  if(!Number.isInteger(index)||index<0||index>3)throw Error('EXACT_INDEX_0_TO_3_REQUIRED');
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(ct29ExistingMineralConfigS2754(index,{releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
    .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
