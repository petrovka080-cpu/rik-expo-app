import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {cn87SeparationConfigS2754} from './prepareS2754Cn87SeparationScreed';
import {ce40ReadyCeramicPackS2754 as pack,ce40ReadyCeramicDefinitionS2754,ce40ReadyCeramicCompletenessMapS2754,
  ce40ReadyCeramicPrefixS2754,compileCe40ReadyCeramicS2754} from '../../../src/lib/estimate/v4/ce40ReadyCeramicGroutingS2754';

// Fixtures are explicit test project selections, never runtime defaults or a
// manufacturer requirement to mix whole buckets or whole kilograms.
export function ce40ControlInputS2754(index:number){const type=pack.types[index];return {
  grout_area_m2:35.5,supplied_product_confirmed:pack.productValue,ready_joints_confirmed:pack.readyValue,conditions_confirmed:pack.conditionsValue,
  mixing_method_confirmed:pack.mixingValue,protection_method_confirmed:pack.protectionValue,
  geometry_confirmed:`Принята глазурованная керамика ${type.tileCm} см и обычные швы ${type.jointMm} мм; одна выбранная строка таблицы CE 40`,
  geometry_acceptance_reference:'CONTROL_ONLY: одинаковая глубина 5 мм задана для проверки; применимость приблизительной строки не является проектной приёмкой',
  mixing_plan_reference:'CONTROL_ONLY: последовательный план замесов с одной дозой воды, одной партией и использованием каждого замеса в течение 2 ч; не проект объекта',
  measured_joint_depth_mm:5,planned_mixed_dry_kg:[22,25,15,15,15,18][index],water_l_per_2kg:0.58};}
export function ce40ExplicitControlS2754(index:number){return {...ce40ControlInputS2754(index),ce40_stock_kg:0,ce40_reserve_kg:0,
  ce40_supplier_bucket_multiple:1,water_stock_l:0,water_reserve_l:0,water_quantum_l:1};}
export function ce40ReadyCeramicConfigS2754(index:number,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const type=pack.types[index];if(!type)throw Error('EXACT_SIX_CE40_TABLE_VARIANTS_ONLY');
  const base=cn87SeparationConfigS2754(parent),definition=ce40ReadyCeramicDefinitionS2754(index),prefix=ce40ReadyCeramicPrefixS2754(index);
  const gid='wg:base:tile_stone_interior_tile_floor_grout',gname='затирка плиточного пола на большой площади';
  const included=[pack.scopeRu,`Выбранная строка: плитка ${type.tileCm} см, шов ${type.jointMm} мм, около ${type.rateKgM2} кг/м²`,
    'CE 40 Aquastatic ru_KZ, цвет 1 Белый, ведро 2 кг; одна пригодная партия на плоскость',
    'Смешиваемая сухая масса по принятому плану; вода 0,56–0,60 л/2 кг этой массы, не закупки или резерва',
    'Сухое наличие, сохраняемый резерв и фактическая кратность поставщика явные; мокрый излишек не возвращён в сухой запас'];
  return {...base,contract:pack.contract,stopCode:'S2754_CE40_'+type.key,applicationName:'s2754-ce40-'+type.key,
    outputRoot:resolve('.release-runtime/r568/s27-54/ce40-ready-grouting/publication/'+type.key),expectedParentShape:[0,0,0],catalogId:type.catalogId,sourceId:pack.sourceId,normId:type.normId,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754Ce40ReadyCeramicSeries.ts','src/lib/estimate/v4/ce40ReadyCeramicGroutingS2754.ts',
      'data/estimate-benchmarks/source-packs/ce40-ready-ceramic-grouting-s27-54.json','scripts/estimate/r4a13/prepareS2754Cn87SeparationScreed.ts',
      'scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
      'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',pack.source.localArtifact],
    sourceMetadata:{source_title:'Ceresit CE 40 Aquastatic ru_KZ: шесть ориентировочных строк, цвет 1 Белый и рецептура воды',source_authority:'Ceresit/Henkel',
      source_kind:'MANUFACTURER_APPROXIMATE_TABLE_AND_CONFIRMED_PROJECT_MIX_PLAN',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,
      exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu+' Глубина не выведена из таблицы; часы и дополнительные количества открыты.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,shortInput:{grout_area_m2:35.5},
    acceptanceInput:ce40ControlInputS2754(index),validationScenario:'S2754_CE40_READY_FLOOR_'+type.key,
    passport:{canonicalRuName:type.titleRu,workKey:type.workKey,physicalResultRu:'Конкретная затирка и вода связаны с замешиванием; обычные швы, очистка и защита раскрыты отдельно. Расход ориентировочный, часы и оснастка имеют точные открытые потребности.',
      includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(g=>prefix+':'+g.id),independentCompletenessMap:ce40ReadyCeramicCompletenessMapS2754(index)},
    applicability:{country:'KG',product:'Ceresit CE 40 Aquastatic ru_KZ',color:'1 Белый',bucketKg:2,tileCm:type.tileCm,jointMm:type.jointMm,
      approximateTableRateKgM2:type.rateKgM2,tableDoesNotDefineJointDepth:true,plannedCoverageNotManufacturerMinimum:true,glazedCeramicOnly:true,
      ordinaryJointsOnly:true,readyIndoorFloor:true,underfloorHeating:false,waterFollowsMixedMassNotPurchase:true,wholeBucketMixNotAssumed:true,
      confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':ce40-table-quantity',applicability:{exactTablePair:true,approximateManufacturerRate:true,projectGeometryRequired:true}},
    locator:{key:'s2754-ce40-'+type.key,payload:{sourcePack:pack,selectedTablePair:type,fullTechnicalAcceptance:false}},
    search:{primaryUom:'m2',canonicalNameRu:type.titleRu,aliases:[type.titleRu,`Затирка швов CE40 ${type.tileCm} см ${type.jointMm} мм`],
      shortScopeRu:pack.scopeRu,keyDistinguishingParameters:['grout_area_m2','measured_joint_depth_mm','planned_mixed_dry_kg','water_l_per_2kg'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:`Ceresit CE 40 Aquastatic белая затирка пол обычные швы ведро 2 кг ${type.tileCm} см ${type.jointMm} мм`,
      sourceProvenance:{sourcePack:'ce40-ready-ceramic-grouting-s27-54.json',primaryMeasureParameterId:'grout_area_m2',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{namespace:'global',domain:'tile_stone',sourceIdentity:'ceresit-ce40:rukz:white1:ready-glazed-floor:'+type.key,workKey:type.workKey,titleRu:type.titleRu,denominatorEligible:true},
      searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:'join',groupId:gid,groupNameRu:gname,domainId:'tile_stone',systemId:'tile_stone',subsystemId:gid,
        assemblyId:gid,workFamilyId:gid,breadcrumb:[gname],membershipOrdinal:5+index,groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},
        independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerScopeOnly:true},
        operationKind:'NEW_INSTALLATION',constructionState:'READY_GLAZED_CERAMIC_FLOOR_JOINTS',technologyVariant:'CE40_RUKZ_WHITE1_'+type.key,
        normativeClassifiers:['CE40_RUKZ_TDS'],applicabilityTags:['CE40','WHITE_1','EXACT_TABLE_PAIR','APPROXIMATE_RATE','PROJECT_MIX_PLAN','MANUFACTURER_PARTIAL']}},
    forbiddenAdjacentMatchers:[/CS25|CM11|wall|heated|epoxy|old_grout/iu],owner:'S2754_CE40_SINGLE_WRITER',receiptFileStem:'ce40_'+type.key,verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:ce40ReadyCeramicCompletenessMapS2754(index),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
      const input=ce40ExplicitControlS2754(index),r=await compileCe40ReadyCeramicS2754(index,input),qty=(id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
      assert.equal(r.rows.length,9);assert.equal(r.preliminaryNeeds.length,6);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,2);
      assert.equal(qty('ce40-table-quantity'),['21.3','24.85','14.2','14.2','14.2','17.75'][index]);
      assert.equal(qty('ce40-order'),['22','26','16','16','16','18'][index]);assert.equal(qty('ce40-dry-remaining'),['0','1','1','1','1','0'][index]);
      assert.equal(qty('water-mixing'),['6.38','7.25','4.35','4.35','4.35','5.22'][index]);assert.equal(qty('water-order'),['7','8','5','5','5','6'][index]);
      const reserved=await compileCe40ReadyCeramicS2754(index,{...input,ce40_reserve_kg:8,ce40_supplier_bucket_multiple:2});
      assert.equal(reserved.rows.find(row=>row.row_id===prefix+':water-mixing')?.quantity,qty('water-mixing'),'Dry reserve/order must not increase mixing water');
      const stocked=await compileCe40ReadyCeramicS2754(index,{...input,ce40_stock_kg:100,water_stock_l:100});
      assert.equal(stocked.rows.find(row=>row.row_id===prefix+':ce40-order')?.quantity,'0');assert.equal(stocked.rows.find(row=>row.row_id===prefix+':water-order')?.quantity,'0');
      for(const changes of [{water_l_per_2kg:0.55},{water_l_per_2kg:0.61},{planned_mixed_dry_kg:1},{ce40_supplier_bucket_multiple:1.5},{open_qty_labor:1}])
        await assert.rejects(()=>compileCe40ReadyCeramicS2754(index,{...input,...changes}));
      for(const fact of ['geometry_confirmed','measured_joint_depth_mm','ready_joints_confirmed','mixing_plan_reference','protection_method_confirmed'])
        assert.equal((await compileCe40ReadyCeramicS2754(index,{...input,[fact]:undefined})).rows.length,0);
      await assert.rejects(()=>compileCe40ReadyCeramicS2754(index,{...input,geometry_confirmed:ce40ControlInputS2754((index+1)%6).geometry_confirmed}));
      assert(definition.parameters.filter(p=>/stock|reserve|supplier|quantum|mixed|dose/.test(p.parameter_id)).every(p=>p.default_value==null));
      return {status:'GREEN_LIMITED_CE40_TABLE_PAIR',key:type.key,shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],
        knownRows:9,needs:6,procurementRows:2,approximateGroutKg:qty('ce40-table-quantity'),mixedDryKg:input.planned_mixed_dry_kg,groutOrderKg:qty('ce40-order'),
        dryRemainderKg:qty('ce40-dry-remaining'),waterMixL:qty('water-mixing'),waterOrderL:qty('water-order'),fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
    }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Ce40ReadyCeramicSeries.ts')){
  const key=process.argv.find(a=>a.startsWith('--type='))?.slice(7)??pack.types[0].key,index=pack.types.findIndex(t=>t.key===key);if(index<0)throw Error('EXACT_CE40_VARIANT_REQUIRED');
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(ce40ReadyCeramicConfigS2754(index,{releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId})).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
