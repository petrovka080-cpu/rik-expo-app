import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {ce40ReadyCeramicConfigS2754,ce40ExplicitControlS2754} from './prepareS2754Ce40ReadyCeramicSeries';
import {ce40ReadyCeramicPackS2754 as floor} from '../../../src/lib/estimate/v4/ce40ReadyCeramicGroutingS2754';
import {ce40ReadyWallPackS2754 as pack,ce40ReadyWallDefinitionS2754,ce40ReadyWallCompletenessMapS2754,
  ce40ReadyWallPrefixS2754,compileCe40ReadyWallS2754} from '../../../src/lib/estimate/v4/ce40ReadyWallGroutingS2754';

export function ce40WallControlS2754(index:number){return {...ce40ExplicitControlS2754(index),ready_joints_confirmed:pack.readyValue,protection_method_confirmed:pack.protectionValue};}
export function ce40ReadyWallConfigS2754(index:number,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const type=pack.types[index],base=ce40ReadyCeramicConfigS2754(index,parent),definition=ce40ReadyWallDefinitionS2754(index),prefix=ce40ReadyWallPrefixS2754(index),
    gid='wg:base:tile_stone_interior_tile_wall_grout',gname='затирка плиточной стены на большой площади',
    included=[pack.scopeRu,`Выбрана одна точная строка: ${type.tileCm} см / ${type.jointMm} мм, около ${type.rateKgM2} кг/м² облицовки; коэффициент на вертикаль не назначен`,
      'CE 40 Aquastatic ru_KZ, цвет 1 Белый, ведро2кг; принята одна пригодная партия на плоскость',
      'Явный план смешиваемой сухой массы, одна принятая доза0,56–0,60л/2кг; закупка и сухой резерв не увеличивают воду замеса',
      'Влажная очистка примерно15мин, удаление сухого налёта не позднее8ч; защита от пересыхания24ч и контакта с водой7дней',
      'Доступ к высоте стены и СИЗ раскрыты без автоматических лесов, часов и повторной оплаты оснащения исполнителя'];
  return {...base,contract:pack.contract,stopCode:'S2754_CE40_WALL_'+type.key,applicationName:'s2754-ce40-wall-'+type.key,
    outputRoot:resolve('.release-runtime/r568/s27-54/ce40-ready-wall-series/publication/'+type.key),catalogId:type.catalogId,sourceId:pack.sourceId,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754Ce40ReadyWallSeries.ts','src/lib/estimate/v4/ce40ReadyWallGroutingS2754.ts',
      'data/estimate-benchmarks/source-packs/ce40-ready-wall-grouting-s27-54.json',...base.sourcePaths],
    sourceMetadata:{...base.sourceMetadata,source_title:'Ceresit CE 40 Aquastatic ru_KZ: шесть точных пар для готовой внутренней стеновой облицовки',exact_locator:pack.source.locatorRu,
      use_restriction:pack.scopeRu+' Ориентировочный расход не гарантирует достаточность; часы и дополнительные количества открыты.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    acceptanceInput:ce40WallControlS2754(index),validationScenario:'S2754_CE40_READY_WALL_'+type.key,
    passport:{...base.passport,canonicalRuName:type.titleRu,workKey:type.workKey,physicalResultRu:'Конкретные CE 40 и вода связаны с затворением для обычных швов готовой стены; заполнение, очистка, защита и доступ раскрыты. Количества неподтверждённых дополнительных ресурсов не назначены.',
      includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(g=>prefix+':'+g.id),independentCompletenessMap:ce40ReadyWallCompletenessMapS2754(index)},
    applicability:{...base.applicability,readyIndoorFloor:false,readyIndoorWall:true,wallHeating:false,verticalRateMultiplierNotInvented:true,wallAccessNotAutomaticallyScaffolding:true,
      dryHazeRemovalWithinHours:8,protectionFromDryingHours:24,protectionFromWaterDays:7,walkingTimeNotApplicableToWall:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':ce40-table-quantity',applicability:{...base.binding.applicability,installation_location:'INDOOR_WALL',prepared_glazed_ceramic:true}},
    locator:{key:'s2754-ce40-wall-'+type.key,payload:{sourcePack:pack,selectedTablePair:type,existingFloorFactoryAndTableReused:true,floorDefinitionsUnchanged:true,fullTechnicalAcceptance:false}},
    search:{...base.search,canonicalNameRu:type.titleRu,aliases:[type.titleRu,`Затирка готовой стены CE40 ${type.tileCm} см ${type.jointMm} мм`],shortScopeRu:pack.scopeRu,
      keyDistinguishingParameters:['ready_joints_confirmed','geometry_confirmed','measured_joint_depth_mm','geometry_acceptance_reference','planned_mixed_dry_kg','water_l_per_2kg'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:`Ceresit CE 40 Aquastatic белая затирка стена готовая глазурованная керамика обычные швы ведро2кг ${type.tileCm} см ${type.jointMm} мм`,
      sourceProvenance:{sourcePack:'ce40-ready-wall-grouting-s27-54.json',primaryMeasureParameterId:'grout_area_m2',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{...base.catalogAppend!.identity,sourceIdentity:'ceresit-ce40:rukz:white1:ready-glazed-wall:'+type.key,workKey:type.workKey,titleRu:type.titleRu},
      searchPlacement:{...base.catalogAppend!.searchPlacement,groupId:gid,groupNameRu:gname,subsystemId:gid,assemblyId:gid,workFamilyId:gid,breadcrumb:[gname],membershipOrdinal:5+index,
        constructionState:'READY_GLAZED_CERAMIC_WALL_JOINTS',technologyVariant:'CE40_RUKZ_WHITE1_WALL_'+type.key,
        applicabilityTags:['CE40','WHITE_1','INDOOR_WALL','EXACT_TABLE_PAIR','APPROXIMATE_RATE','PROJECT_MIX_PLAN','MANUFACTURER_PARTIAL']}},
    forbiddenAdjacentMatchers:[/CS25|CM11|floor|heated|epoxy|old_grout/iu],owner:'S2754_CE40_WALL_SINGLE_WRITER',receiptFileStem:'ce40_wall_'+type.key,
    verifyCore:()=>verifyCe40WallS2754(index)};
}
export async function verifyCe40WallS2754(index:number){
  const type=pack.types[index],definition=ce40ReadyWallDefinitionS2754(index),prefix=ce40ReadyWallPrefixS2754(index),input=ce40WallControlS2754(index),
    compile=(p:Record<string,unknown>)=>compileCe40ReadyWallS2754(index,p),r=await compile(input),qty=(id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
  assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:ce40ReadyWallCompletenessMapS2754(index),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
  assert.equal(r.rows.length,9);assert.equal(r.preliminaryNeeds.length,7);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,2);
  assert.equal(qty('ce40-table-quantity'),['21.3','24.85','14.2','14.2','14.2','17.75'][index]);
  assert.equal(qty('ce40-order'),['22','26','16','16','16','18'][index]);assert.equal(qty('water-mixing'),['6.38','7.25','4.35','4.35','4.35','5.22'][index]);
  assert.equal(qty('water-order'),['7','8','5','5','5','6'][index]);
  for(const fact of ['ready_joints_confirmed','measured_joint_depth_mm','geometry_acceptance_reference','mixing_plan_reference','protection_method_confirmed'])
    assert.equal((await compile({...input,[fact]:undefined})).rows.length,0);
  await assert.rejects(()=>compile({...input,ready_joints_confirmed:floor.readyValue}));
  await assert.rejects(()=>compile({...input,geometry_confirmed:ce40WallControlS2754((index+1)%6).geometry_confirmed}));
  await assert.rejects(()=>compile({...input,open_qty_wall_access_protection:1}));
  await assert.rejects(()=>compile({...input,planned_mixed_dry_kg:1}));
  await assert.rejects(()=>compile({...input,water_l_per_2kg:0.61}));
  const reserved=await compile({...input,ce40_reserve_kg:8,ce40_supplier_bucket_multiple:2});
  assert.equal(reserved.rows.find(row=>row.row_id===prefix+':water-mixing')?.quantity,qty('water-mixing'));
  assert(definition.parameters.every(p=>p.default_value==null));assert(!JSON.stringify(definition.resources).includes('технологический проход не раньше'));
  return {key:type.key,shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],knownRows:9,sourceNeeds:7,procurementRows:2,
    approximateGroutKg:qty('ce40-table-quantity'),mixedDryKg:input.planned_mixed_dry_kg,groutOrderKg:qty('ce40-order'),waterMixL:qty('water-mixing'),waterOrderL:qty('water-order'),
    wallGated:true,oneExactTablePair:true,verticalMultiplierNotInvented:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Ce40ReadyWallSeries.ts')){
  const index=Number(process.argv.find(arg=>arg.startsWith('--index='))?.split('=')[1]);if(!Number.isInteger(index)||index<0||index>5)throw Error('EXACT_CE40_WALL_INDEX_REQUIRED');
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(ce40ReadyWallConfigS2754(index,{releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
    .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
