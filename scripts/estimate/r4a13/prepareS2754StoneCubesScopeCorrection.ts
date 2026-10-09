import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {floorDemolitionSeriesS2754Config} from './prepareS2754FloorDemolitionSeries';
import * as stone from '../../../src/lib/estimate/v4/stoneTileFloorCoveringDemolitionKrer46R1';

export const stoneCubesKeysS2754=Object.keys(stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS) as stone.StoneTileFloorDemolitionKrer46VariantKey[];
const artifact='.release-runtime/r568/s27-3/f09-next-current-lineage/official-snapshots/krer_46_2015.pdf';
export function stoneCubesConfigS2754(key:stone.StoneTileFloorDemolitionKrer46VariantKey,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const variant=stone.resolveStoneTileFloorDemolitionKrer46Variant(key),base=floorDemolitionSeriesS2754Config(0,parent);
  const included=['Разборка покрытия пола именно из каменной шашки по КРЕР 46-04-010-05',
    'Труд рабочих-строителей среднего разряда 2,0: 39,18 чел.-ч на 100 м²; один владелец цены',
    'Уборка, сортировка, штабелирование пригодных материалов; спуск через окно в лотках',
    'Горизонтальное перемещение до 130 м суммарно, включая до 50 м от объекта; без второй оплаты'];
  const excluded=['Другое покрытие, бетонное основание, стяжка и новая конструкция пола',
    'Упаковка, иной способ спуска, внешний вывоз и размещение требуют отдельной применимости и расчёта',
    'Масса отходов, пригодный выход, тара и рейсы из площади не вычисляются',
    'Прежнее подтверждение каменной плитки не подтверждает материал каменная шашка'];
  return {...base,contract:'rik-expo-app.s27-54.stone-cubes-scope-correction.v1',stopCode:'S2754_STONE_CUBES_'+key.toUpperCase(),
    applicationName:'s2754-stone-cubes-'+key,outputRoot:resolve('.release-runtime/r568/s27-54/stone-cubes-correction/publication/'+key),
    catalogId:variant.catalogId,sourceId:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_ID,normId:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_NORM_ID,
    sourceMetadata:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754StoneCubesScopeCorrection.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
      'src/lib/estimate/v4/stoneTileFloorCoveringDemolitionKrer46R1.ts','tests/estimateNorms/stoneTileFloorCoveringDemolitionKrer46R1.contract.test.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
      'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',artifact],
    parameterDefinitions:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS,formulaDefinitions:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS,
    resourceDefinitions:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES,shortInput:{floor_covering_area_m2:35.5},
    acceptanceInput:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,expectedParentShape:[3,2,2],catalogAppend:undefined,
    runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},validationScenario:'S2754_STONE_CUBES_FRESH_SOURCE_SCOPE_AND_PARTIAL_WASTE_CHAIN',
    passport:{canonicalRuName:variant.canonicalNameRu,workKey:'stone_tile_floor_covering_demolition_krer_46_04_010_05'+(key==='standard'?'':'_'+key),
      physicalResultRu:'Исправлен материал нормативной колонки: каменная шашка. Подтверждён только нормативный труд и включённые действия; дополнительные ресурсы обращения с отходами открыты.',
      includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
      unresolvedApplicableResourceRowIds:stone.STONE_CUBES_SOURCE_GAPS.map(g=>`f09:stone_tile_floor_demolition:${g.id}`)},
    applicability:{country:'KG',existingCoveringMaterial:'STONE_CUBES',operationClass:'DISMANTLE_EXISTING_STONE_CUBES_FLOOR_COVERING',catalogVariant:variant.catalogVariant,
      exactRate:'46-04-010-05',primaryMeasureParameterId:'floor_covering_area_m2',freshSourceScopeConfirmationRequired:true,
      oldConfirmationNotAutomaticallyReused:true,includedHorizontalTotalM:130,includedDistanceFromObjectM:50,includedDescent:'THROUGH_WINDOW_IN_CHUTES',
      packagingAndOtherDescentNotAutomaticallyIncluded:true,offsiteWasteHaulIncluded:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:'f09:stone_tile_floor_demolition:labor',applicability:{existing_covering_material:'STONE_CUBES',exact_rate:'46-04-010-05',
      fresh_source_scope_parameter:'stone_cubes_source_scope_confirmed',quantity_basis:'CONFIRMED_AREA_TIMES_39_18_MAN_HOURS_PER_100_M2',offsite_waste_haul_included:false}},
    locator:{key:'s2754-stone-cubes-'+key,payload:{source:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_SOURCE_METADATA,material:'STONE_CUBES',
      includedScopeRu:included,separateSourceGaps:stone.STONE_CUBES_SOURCE_GAPS,fullTechnicalAcceptance:false}},
    search:{primaryUom:'m2',canonicalNameRu:variant.canonicalNameRu,aliases:[variant.canonicalNameRu,'Демонтаж каменной шашки','КРЕР 46-04-010-05'],
      shortScopeRu:'Каменная шашка, 39,18 чел.-ч на 100 м². Уборка и перемещения в границах нормы включены; дополнительное обращение с отходами рассчитывается отдельно.',
      keyDistinguishingParameters:['existing_covering_profile','stone_cubes_source_scope_confirmed'],
      clarificationFields:['floor_covering_area_m2','existing_covering_profile','existing_stone_tile_covering_confirmed','stone_cubes_source_scope_confirmed'],
      includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'демонтаж разборка пол каменная шашка каменные бруски КРЕР 46-04-010-05',
      sourceProvenance:{physicalMaterial:'STONE_CUBES',artifactSha256:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,primaryMeasureParameterId:'floor_covering_area_m2',
        correctedSourceClassification:true,oldHistoryImmutable:true,fullTechnicalAcceptance:false}},
    forbiddenAdjacentMatchers:[/area_factor|new_floor|adhesive|screed_install/iu],owner:'S2754_STONE_CUBES_SINGLE_WRITER',receiptFileStem:'stone_cubes_'+key,
    verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(artifact)).digest('hex'),stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256);
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
        formulaDefinitions:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS,resourceDefinitions:stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES}),[]);
      const input={...stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT},r=await stone.compileStoneTileFloorDemolitionKrer46R1(input,{catalogId:variant.catalogId});
      assert.equal(r.rows.length,2);assert.equal(r.preliminaryNeeds.length,4);assert.equal(r.rows.find(r=>r.row_id.endsWith(':labor'))?.quantity,'13.9089');
      assert.equal(r.rows.filter(r=>r.included_in_procurement).length,0);
      const missing=await stone.compileStoneTileFloorDemolitionKrer46R1({...input,stone_cubes_source_scope_confirmed:undefined});assert.equal(missing.rows.length,0);
      for(const gap of stone.STONE_CUBES_SOURCE_GAPS)await assert.rejects(()=>stone.compileStoneTileFloorDemolitionKrer46R1({...input,[gap.parameter]:1}));
      assert(stone.STONE_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS.every(p=>p.default_value==null));
      return {status:'GREEN_LIMITED_SOURCE_SCOPE_CORRECTION',knownRows:2,sourceNeeds:4,freshConfirmationGatesBothLegacyRows:true,
        sourceMaterial:'STONE_CUBES',normativeLabor:13.9089,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,newCatalogIdentities:0};
    }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754StoneCubesScopeCorrection.ts')){
  const key=process.argv.find(a=>a.startsWith('--variant='))?.slice(10) as stone.StoneTileFloorDemolitionKrer46VariantKey;
  if(!stoneCubesKeysS2754.includes(key))throw Error('EXACT_EXISTING_STONE_VARIANT_REQUIRED');
  const c=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(stoneCubesConfigS2754(key,{releaseId:c.definitionReleaseId,searchReleaseId:c.searchReleaseId}))
    .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
