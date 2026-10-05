import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileWallPaintConstructorS2735 as compile,WALL_PAINT_VARIANTS_S2735 as variants,WALL_PAINT_CATALOGS_S2735 as catalogs,
  WALL_PAINT_DEFINITION_S2735 as definition,WALL_PAINT_SOURCE_ID_S2735 as sourceId,WALL_PAINT_NORM_ID_S2735 as normId,WALL_PAINT_SOURCE_METADATA_S2735 as sourceMetadata} from '../../../src/lib/estimate/v4/wallPaintConstructorS2735';
const currentReleasePath=resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json');
const outputRoot=resolve('.release-runtime/r568/s27-35/wall-paint-batch');
const titles={standard:'стандартная зона',small_area:'малый участок',large_area:'большой участок',high_load:'повышенная нагрузка по проекту',technical_room:'техническое помещение',wet_zone:'влажная зона'};
const selected=process.argv.find(a=>a.startsWith('--target='))?.slice('--target='.length);
assert(selected==null||variants.some(v=>v===selected),'UNKNOWN_WALL_PAINT_TARGET');
async function run(){const receipts:unknown[]=[];
for(const [index,variant]of variants.entries()){
 if(selected!=null&&selected!==variant)continue;
 const parent=JSON.parse(readFileSync(currentReleasePath,'utf8')),catalogId=catalogs[index]!,titleRu=titles[variant];
 const variantRoot=resolve(outputRoot,variant),title='Окраска внутренних минеральных стен CT54 с применимым CT17/CT29';
 async function verifyCore(){
  const short=await compile({area_m2:50},catalogId),stocked=await compile({area_m2:50,material_wall_paint_ct54_stock:15},catalogId);
  assert.equal(short.rows.length,28);assert.equal(short.preliminaryNeeds.length,5);
  assert.equal(stocked.rows.find(r=>r.row_id==='material:wall-paint:ct54')?.quantity,'0');
  const fullMix=await compile({area_m2:10,mineral_repair_mode:'CT29_REQUIRED',repair_area_m2:2,repair_average_depth_mm:2,ct29_pack_kg:'5',
   repair_preparation_mode:'MOISTEN_ONLY',repair_preparation_reference:'EXPLICIT_TEST_MOISTEN_METHOD',repair_drying_compatibility_reference:'EXPLICIT_TEST_COMPATIBLE_MINERAL_REPAIR',repair_additional_water_l:3},catalogId);
  assert.equal(fullMix.rows.find(r=>r.row_id==='scope:wall-paint:ct29-full-mixes')?.quantity,'10');
  assert.equal(fullMix.rows.find(r=>r.row_id==='scope:wall-paint:ct29-wet-surplus')?.quantity,'2.8');
  assert(!Object.keys(definition.runtimeInput).some(k=>/productivity|_confirmed|trip_count|repair_area|repair_average_depth/.test(k)));
  return {status:'GREEN_S2735_WALL_PAINT_REUSED_OWNER',variant,knownShortRows:28,shortNeeds:5,fullMixVerified:true,engineeringAccepted:false,ordinaryUiAccepted:false,
   validationFixtureNeverRuntimeDefaults:true,sha256:createHash('sha256').update(JSON.stringify({short,stocked,fullMix})).digest('hex')};
 }
 const config:MasterSingleDefinitionSuccessorConfig={contract:'rik-expo-app.s27-35.wall-paint-'+variant+'.v1',stopCode:'S2735_WALL_PAINT_'+variant.toUpperCase(),applicationName:'s2735-wall-paint-'+variant,
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (75).md',masterSha256:'bd9241644e6fd958e77a775f24ae7043ad33a1e67e72f0b4b0983da0fd57b230',
  parentReleaseId:parent.definitionReleaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath,outputRoot:variantRoot,
  sourcePaths:['src/lib/estimate/v4/wallPaintConstructorS2735.ts','src/lib/estimate/v4/domains/interiorFinishesComplete/paintCeresitCt54Ct17ProfessionalV1.ts',
   'src/lib/estimate/v4/domains/interiorFinishesComplete/inventory.ts','src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
   'data/estimate-benchmarks/source-packs/wall-paint-constructor-s27-35.json','tests/estimateNorms/wallPaintConstructorS2735.contract.test.ts',
   'scripts/estimate/r4a13/prepareS2735WallPaintBatchSuccessor.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'],
  catalogId,sourceId,normId,sourceMetadata,parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{area_m2:50},acceptanceInput:{area_m2:50,...definition.runtimeInput},runtimeProfileInput:definition.runtimeInput,runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,
  verifyCore,expectedParentShape:[1,59,59],benchmarkOrdinal:147+index,validationScenario:'S2735_WALL_PAINT_'+variant.toUpperCase()+'_ORDINARY_AREA',
  passport:{canonicalRuName:title+' ('+titleRu+')',workKey:'plaster_paint_interior_paint_wall_paint_'+variant,
   physicalResultRu:'Два слоя выбранной CT54 на совместимой внутренней цементно-известковой минеральной стене; грунтование и CT29 подключаются по применимости, материалы и оснащение раскрыты',
   includedScopeRu:['Готовые формулы труда, подготовки, распыления и контроля переиспользованы; расход CT54 относится к обоим слоям',
    'CT17 PROFIen_GL03.24 точно отделён от ru_KZ и концентрата; совместимые потребности до/после ремонта объединяются до округления',
    'CT29 только по фактической площади/толщине/совместимости; полные замесы мешков, отдельный мокрый остаток и сухой запас целыми мешками',
    'Вода всех применимых стадий объединяется до округления, с сохранёнными неоплачиваемыми распределениями',
    'Индивидуальные инструменты, защита и расходники; ручной способ и отдельно оплачиваемый распылитель взаимоисключены',
    'Измеренная площадь сразу; производительность, отдельная доставка, обследование/высыхание и подтверждение объекта остаются уточнениями'],
   excludedScopeRu:['Фасад, потолок и акриловое/полимерное основание','Число слоёв или нормы труда по названию варианта','Двойная оплата оператора/аппарата/миксера','Мокрый остаток как пригодный сухой запас','Скрытые DEMO данные, утверждение объекта и цены']},
  applicability:{country:'KG',primaryMeasureParameterId:'area_m2',knownScopeParameters:['area_m2'],ordinaryUserInputCount:1,variant,hiddenDemoFixtureInputs:false,ordinaryUiAccepted:false,engineeringAccepted:false},
  binding:{rowId:'material:wall-paint:ct54',applicability:{technology_class:'PRELIMINARY_CT54_MINERAL_INTERIOR_WITH_ACTUAL_CONFIRMATION',operation_class:'REUSED_PAINT_OPERATIONS_CONDITIONAL_MINERAL_REPAIR',source_id:sourceId,norm_id:normId,exact_locator:sourceMetadata.exact_locator,quantity_basis:'MEASURED_WALL_AREA_AND_VISIBLE_EXACT_PRODUCT_PROFILE',universal_productivity_claimed:false}},
  locator:{key:'wall-paint-s27-35-'+variant+'-v1',payload:{kind:'MEASURED_AREA_REUSED_OPERATIONS',sourcePackSha256:sourceMetadata.artifact_sha256,ordinaryKnownInputs:['area_m2'],visibleProfileInputs:Object.keys(definition.runtimeInput),fixtureValuesNeverRuntimeDefaults:true,variantDoesNotChooseEngineeringNorm:true}},
  search:{primaryUom:'m2',canonicalNameRu:title+' ('+titleRu+')',aliases:['покрасить внутренние стены '+titleRu,'окраска минеральных стен '+titleRu],
   shortScopeRu:'Внутренняя цементно-известковая стена: готовая окраскаCT54, применимые CT17/CT29, материалы и оснащение. Видимый предварительный профиль требует обследования.',
   keyDistinguishingParameters:['area_m2','substrate_product_profile','ct54_delivered_version'],clarificationFields:['paint_priming_mode','mineral_repair_mode','paint_application_mode','applicability_mode'],
   includedBoundaries:['Подготовка, применимое грунтование/ремонт, два слоя краски, оснащение и контроль'],excludedBoundaries:['Фасад/потолок','Автоматическое подтверждение минерального основания, возраста и высыхания'],
   extraSearchTermsRu:'покраска стены минеральная штукатурка CT54 CT17 CT29 краска валик кисть грунт ремонт закупка остаток',sourceProvenance:{acceptedOperationsReused:true,variantDoesNotChooseEngineeringNorm:true,hiddenDemoFixtureInputs:false,engineeringApprovalClaimed:false}},
  forbiddenAdjacentMatchers:[/materials_0[1-6]/iu,/professional_.*_set/iu,/facade_scaffold/iu,/ct127/iu],owner:'S2735_WALL_PAINT_BATCH',receiptFileStem:'wall_paint_'+variant};
 await runMasterSingleDefinitionSuccessorR1(config);
 const receipt=process.argv.includes('--apply')?JSON.parse(readFileSync(resolve(variantRoot,'acceptance.json'),'utf8')):{status:'DRY_RUN_COMPLETED_WITHOUT_DATABASE_MUTATION',parent:{releaseId:parent.definitionReleaseId,searchReleaseId:parent.searchReleaseId},successor:null,productionAccessed:false,source:null};
 receipts.push({variant,status:receipt.status,parent:receipt.parent,successor:receipt.successor,productionAccessed:receipt.productionAccessed,source:receipt.source});
 mkdirSync(outputRoot,{recursive:true});writeFileSync(resolve(outputRoot,process.argv.includes('--apply')?'batch-apply-summary.json':'batch-dry-run-summary.json'),JSON.stringify({targets:receipts,current:JSON.parse(readFileSync(currentReleasePath,'utf8')),productionAccessed:false},null,2));
}
}
void run().catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
