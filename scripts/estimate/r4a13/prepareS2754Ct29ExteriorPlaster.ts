import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {ct29IndoorPlasterConfigS2754,ct29ExplicitControlS2754} from './prepareS2754Ct29IndoorPlaster';
import {ct29ExteriorPlasterPackS2754 as pack,ct29ExteriorPlasterDefinitionS2754 as definition,ct29ExteriorPlasterCompletenessMapS2754,
  compileCt29ExteriorPlasterS2754,ct29ExteriorPlasterPrefixS2754 as prefix} from '../../../src/lib/estimate/v4/ct29ExteriorPlasterS2754';

export function ct29ExteriorControlS2754(index=1){return {...ct29ExplicitControlS2754(index),base_confirmed:pack.baseValue,conditions_confirmed:pack.conditionsValue,
  layer_applicability_confirmed:pack.layerValue,weather_protection_confirmed:pack.weatherProtectionValue,
  weather_protection_reference:'CONTROL_ONLY: принятие способа и обеспечения защиты минимум24ч моделируется, не проект и не фактическая защита объекта'};}
export function ct29ExteriorPlasterConfigS2754(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const base=ct29IndoorPlasterConfigS2754(parent),included=[pack.scopeRu,'Приблизительная потребность CT29: площадь × назначенная толщина ×1,8кг/м²/мм',
    'Один выбранный мешок5или25кг и соответствующий ему рецепт; целые замесы по явному последовательному плану',
    'Защита наружного слоя от дождя и слишком быстрого высыхания минимум24ч — отдельный обязательный способ и источник состава',
    'Вода затворения, вода ухода, пригодный запас, заказ и превышение плана разделены'];
  const groupId='wg:master:ct29_exterior_concrete_wall_plaster',groupNameRu='Наружная штукатурка бетонных стен Ceresit CT29';
  return {...base,contract:pack.contract,stopCode:'S2754_CT29_EXTERIOR_PLASTER',applicationName:'s2754-ct29-exterior-plaster',
    outputRoot:resolve('.release-runtime/r568/s27-54/ct29-exterior-plaster/publication'),catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754Ct29ExteriorPlaster.ts','src/lib/estimate/v4/ct29ExteriorPlasterS2754.ts',
      'data/estimate-benchmarks/source-packs/ct29-exterior-plaster-s27-54.json',...base.sourcePaths],
    sourceMetadata:{...base.sourceMetadata,source_title:pack.sourceTitleRu,exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu+' Полная техническая приёмка и часы дополнительных ресурсов не подтверждены.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{plaster_area_m2:35.57},acceptanceInput:ct29ExteriorControlS2754(),validationScenario:'S2754_CT29_EXTERIOR_WEATHER_PROTECTION_GATED_MATERIAL_PLAN',
    passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Конкретные CT29, вода затворения и действия связаны с наружным нанесением; обязательны подтверждённые слой, условия и защита минимум24ч. Дополнительные количества открыты.',
      includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(g=>prefix+':'+g.id),independentCompletenessMap:ct29ExteriorPlasterCompletenessMapS2754()},
    applicability:{...base.applicability,acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,application:'EXTERIOR_MANUAL_PLASTER_SMOOTHING',
      exteriorProtectionMinimumHours:24,weatherProtectionAndReferenceRequired:true,intensiveSolarExposureExcluded:true,accessMethodNotAutomaticallyScaffolding:true,
      fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':net-mixture',applicability:{...base.binding.applicability,installation_location:'OUTDOOR',weather_protection_min_hours:24,
      mandatoryScopeParameters:['base_confirmed','conditions_confirmed','layer_applicability_confirmed','project_detail_reference','weather_protection_confirmed','weather_protection_reference']}},
    locator:{key:'s2754-ct29-exterior-plaster',payload:{sourcePack:pack,existingMixtureAndWholeBatchFactoryReused:true,indoorDefinitionUnchanged:true,
      protection24HoursNotLaborHours:true,noThicknessRangeInvented:true,fullTechnicalAcceptance:false}},
    search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:[pack.titleRu,'Ручная штукатурка CT29 снаружи по готовому бетону'],
      shortScopeRu:pack.scopeRu,keyDistinguishingParameters:['layer_thickness_mm','selected_ct29_bag','conditions_confirmed','weather_protection_confirmed','weather_protection_reference'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:'Ceresit CT29 наружная ручная штукатурка бетон защита дождь солнце вода полутерок5кг25кг',
      sourceProvenance:{sourcePack:'ct29-exterior-plaster-s27-54.json',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,primaryMeasureParameterId:'plaster_area_m2',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{...base.catalogAppend!.identity,sourceIdentity:'ceresit-ct29:tds0120:manual-exterior-prepared-low-absorption-concrete',workKey:pack.workKey,titleRu:pack.titleRu},
      searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:'create',groupId,groupNameRu,subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,
        breadcrumb:[groupNameRu],membershipOrdinal:0,technologyVariant:'CT29_MANUAL_EXTERIOR_EXPLICIT_WHOLE_BATCH_PLAN_AND_WEATHER_PROTECTION',
        applicabilityTags:['CT29','MANUAL_EXTERIOR_PLASTER','APPROVED_PROJECT_LAYER','WEATHER_PROTECTION_24H','EXPLICIT_WHOLE_BATCH_PLAN','MANUFACTURER_PARTIAL']}},
    forbiddenAdjacentMatchers:[/CT17|CT16|gypsum|deep_loss|ETICS/iu],owner:'S2754_CT29_EXTERIOR_SINGLE_WRITER',receiptFileStem:'ct29_exterior_plaster',verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:ct29ExteriorPlasterCompletenessMapS2754(),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
      const input=ct29ExteriorControlS2754(),r=await compileCt29ExteriorPlasterS2754(input),qty=(id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
      assert.equal(r.rows.length,12);assert.equal(r.preliminaryNeeds.length,9);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,2);
      for(const [id,q] of [['net-mixture','320.13'],['25kg-prepared-mixture','325'],['25kg-order','325'],['25kg-ordered-bags','13'],['25kg-mix-water-consumed','78']])assert.equal(qty(id),q);
      for(const fact of ['base_confirmed','conditions_confirmed','layer_applicability_confirmed','project_detail_reference','weather_protection_confirmed','weather_protection_reference'])
        assert.equal((await compileCt29ExteriorPlasterS2754({...input,[fact]:undefined})).rows.length,0);
      await assert.rejects(()=>compileCt29ExteriorPlasterS2754({...input,weather_protection_confirmed:'Защита12ч'}));
      await assert.rejects(()=>compileCt29ExteriorPlasterS2754({...input,conditions_confirmed:'Внутри помещения'}));
      await assert.rejects(()=>compileCt29ExteriorPlasterS2754({...input,open_qty_exterior_weather_protection:24}));
      const stock=await compileCt29ExteriorPlasterS2754({...input,ct29_25kg_stock_bags:4,ct29_25kg_reserve_bags:1,ct29_25kg_supplier_bag_multiple:2});
      assert.equal(stock.rows.find(row=>row.row_id===prefix+':25kg-order')?.quantity,'250');assert.equal(stock.rows.find(row=>row.row_id===prefix+':25kg-mix-water-consumed')?.quantity,'78');
      const five=await compileCt29ExteriorPlasterS2754(ct29ExteriorControlS2754(0));assert.equal(five.rows.filter(row=>row.included_in_procurement).length,2);
      assert(!five.rows.some(row=>row.row_id.startsWith(prefix+':25kg-')));assert.equal(five.rows.find(row=>row.row_id===prefix+':5kg-mix-water-min')?.quantity,'71.5');
      assert.equal(five.rows.find(row=>row.row_id===prefix+':5kg-mix-water-max')?.quantity,'84.5');
      return {status:'GREEN_LIMITED_CT29_EXTERIOR',shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],knownRows:12,sourceNeeds:9,procurementRows:2,
        approximatelyRequiredKg:320.13,plannedPreparedKg:325,plannedWhole25KgBatches:13,plannedWaterL:78,weatherAndReferenceGated:true,
        minimum24HoursNotPricedAsLabor:true,oneSelectedBagOnly:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
    }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Ct29ExteriorPlaster.ts')){
  const c=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(ct29ExteriorPlasterConfigS2754({releaseId:c.definitionReleaseId,searchReleaseId:c.searchReleaseId}))
    .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
