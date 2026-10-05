import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileSkirtingConstructorS2735 as compile,SKIRTING_TARGETS_S2735 as targets,SKIRTING_DEFINITIONS_S2735 as definitions,
  SKIRTING_SOURCE_ID_S2735 as sourceId,SKIRTING_NORM_ID_S2735 as normId,SKIRTING_SOURCE_METADATA_S2735 as sourceMetadata} from '../../../src/lib/estimate/v4/skirtingConstructorS2735';
const currentReleasePath=resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json');
const outputRoot=resolve('.release-runtime/r568/s27-35/skirting-batch');
const titles={standard:'стандартная зона',small_area:'малый участок',large_area:'большой участок',high_load:'повышенная нагрузка по проекту',technical_room:'техническое помещение',wet_zone:'влажная зона'};
const selected=process.argv.find(a=>a.startsWith('--target='))?.slice('--target='.length);
assert(selected==null||targets.some(t=>t.operation+'-'+t.variant===selected),'UNKNOWN_SKIRTING_TARGET');
async function run(){const receipts:unknown[]=[];
for(const [index,target]of targets.entries()){
  const {operation,variant,catalogId}=target,key=operation+'-'+variant;
  if(selected!=null&&selected!==key)continue;
  const parent=JSON.parse(readFileSync(currentReleasePath,'utf8'));
  const definition=definitions[operation],titleRu=titles[variant];
  const variantRoot=resolve(outputRoot,key);
  const operationTitle=operation==='install'?'Монтаж плинтуса с поставкой':'Приклеивание предоставленного плинтуса';
  async function verifyCore(){const short=await compile({length_m:30},catalogId);
    const checked=await compile({length_m:7,material_skirting_adhesive_stock:280},catalogId);
    assert.equal(short.rows.length,operation==='install'?21:19);assert.equal(short.preliminaryNeeds.length,5);
    assert.equal(checked.rows.find(r=>r.row_id==='material:skirting:adhesive')?.quantity,'0');
    assert(!Object.keys(definition.runtimeInput).some(k=>/productivity|_confirmed|trip_count/.test(k)));
    return {status:'GREEN_S2735_SKIRTING_REUSED_OWNER',operation,variant,knownShortRows:short.rows.length,shortNeeds:short.preliminaryNeeds.length,engineeringAccepted:false,ordinaryUiAccepted:false,
      validationFixtureNeverRuntimeDefaults:true,sha256:createHash('sha256').update(JSON.stringify({short,checked})).digest('hex')};}
  const config:MasterSingleDefinitionSuccessorConfig={contract:'rik-expo-app.s27-35.skirting-'+key+'.v1',stopCode:'S2735_SKIRTING_'+key.toUpperCase().replaceAll('-','_'),applicationName:'s2735-skirting-'+key,
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (75).md',masterSha256:'bd9241644e6fd958e77a775f24ae7043ad33a1e67e72f0b4b0983da0fd57b230',
    parentReleaseId:parent.definitionReleaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath,outputRoot:variantRoot,
    sourcePaths:['src/lib/estimate/v4/skirtingConstructorS2735.ts','src/lib/estimate/v4/domains/interiorFinishesComplete/baseboardGerflorInstallProfessionalV1.ts',
      'src/lib/estimate/v4/domains/interiorFinishesComplete/baseboardGlueProfessionalV1.ts','src/lib/estimate/v4/domains/interiorFinishesComplete/inventory.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
      'data/estimate-benchmarks/source-packs/skirting-constructor-s27-35.json','tests/estimateNorms/skirtingConstructorS2735.contract.test.ts',
      'scripts/estimate/r4a13/prepareS2735SkirtingBatchSuccessor.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'],
    catalogId,sourceId,normId,sourceMetadata,parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{length_m:30},acceptanceInput:{length_m:30,...definition.runtimeInput},runtimeProfileInput:definition.runtimeInput,runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,
    verifyCore,expectedParentShape:[1,59,59],benchmarkOrdinal:135+index,validationScenario:'S2735_SKIRTING_'+key.toUpperCase().replaceAll('-','_')+'_ORDINARY_LENGTH',
    passport:{canonicalRuName:operationTitle+' ('+titleRu+')',workKey:'flooring_interior_baseboard_'+operation+'_'+variant,
      physicalResultRu:'Линия совместимого плинтуса с материалами, раскроем, приклеиванием и подтверждаемыми условиями; видимый Gerflor6086/Forbo232 профиль предварительный',
      includedScopeRu:[operation==='install'?'Поставка профиля6086 и применимых вставок6087':'Профиль и вставки предоставлены, поставка исключена',
        'Числитель расхода клея и труд готовых операций переиспользованы; установка и приклеивание оплачиваются один раз',
        'Клей, совместимый очиститель и отдельные расходники/оснащение; ручной и электрический раскрой взаимоисключены',
        'Местное выравнивание и герметизация только при подтверждённой необходимости, фактических изделиях/количествах/фасовке',
        'Совместимый клей-герметик вставок и примыкания объединяется до округления, с неоплачиваемым распределением',
        'Известная длина сразу; фактический труд/доставка и подтверждение условий остаются локальными уточнениями'],
      excludedScopeRu:['Двойная оплата приклеивания и монтажа, ножовки и электрораскроя','Подложка, напольное покрытие, автоматические саморезы/комплекты кг',
        'Forbo232 для вставок без совместимого узла','Нормы труда/раскроя по названию варианта, утверждение объекта и цены']},
    applicability:{country:'KG',primaryMeasureParameterId:'length_m',knownScopeParameters:['length_m'],ordinaryUserInputCount:1,operation,variant,hiddenDemoFixtureInputs:false,ordinaryUiAccepted:false,engineeringAccepted:false},
    binding:{rowId:'material:skirting:adhesive',applicability:{technology_class:'PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION',operation_class:'REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION',source_id:sourceId,norm_id:normId,exact_locator:sourceMetadata.exact_locator,quantity_basis:'MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE',universal_productivity_claimed:false}},
    locator:{key:'skirting-s27-35-'+key+'-v1',payload:{kind:'MEASURED_LENGTH_REUSED_OPERATIONS',sourcePackSha256:sourceMetadata.artifact_sha256,ordinaryKnownInputs:['length_m'],visibleProfileInputs:Object.keys(definition.runtimeInput),fixtureValuesNeverRuntimeDefaults:true,variantDoesNotChooseEngineeringNorm:true}},
    search:{primaryUom:'m',canonicalNameRu:operationTitle+' ('+titleRu+')',aliases:[(operation==='install'?'установка плинтуса ':'приклеить плинтус ')+titleRu,(operation==='install'?'монтаж плинтуса с материалом ':'приклеивание предоставленного плинтуса ')+titleRu],
      shortScopeRu:operationTitle+'. Готовые операции, раскрытые материалы, совместимая закупка; выбранный предварительный профиль и условия требуют подтверждения.',
      keyDistinguishingParameters:['length_m','skirting_product_code','adhesive_product'],clarificationFields:['cut_extra_m','end_cap_count','cutting_mode','local_preparation_mode','junction_sealing_mode'],
      includedBoundaries:['Профиль/клей/раскрой/монтаж/подготовка/оснащение по границам выбранной операции'],excludedBoundaries:['Напольное покрытие/подложка','Скрытые проектные подтверждения и производительность'],
      extraSearchTermsRu:'плинтус ПВХ Gerflor6086 Forbo232 торец раскрой приклеивание монтаж закупка остаток',sourceProvenance:{acceptedOperationsReused:true,variantDoesNotChooseEngineeringNorm:true,hiddenDemoFixtureInputs:false,engineeringApprovalClaimed:false}},
    forbiddenAdjacentMatchers:[/materials_0[1-6]/iu,/professional_.*_set/iu,/floor_covering/iu,/underlay/iu],owner:'S2735_SKIRTING_BATCH',receiptFileStem:'skirting_'+key};
  await runMasterSingleDefinitionSuccessorR1(config);
  const receipt=process.argv.includes('--apply')?JSON.parse(readFileSync(resolve(variantRoot,'acceptance.json'),'utf8')):{status:'DRY_RUN_COMPLETED_WITHOUT_DATABASE_MUTATION',parent:{releaseId:parent.definitionReleaseId,searchReleaseId:parent.searchReleaseId},successor:null,productionAccessed:false,source:null};
  receipts.push({key,status:receipt.status,parent:receipt.parent,successor:receipt.successor,productionAccessed:receipt.productionAccessed,source:receipt.source});
  mkdirSync(outputRoot,{recursive:true});writeFileSync(resolve(outputRoot,process.argv.includes('--apply')?'batch-apply-summary.json':'batch-dry-run-summary.json'),JSON.stringify({targets:receipts,current:JSON.parse(readFileSync(currentReleasePath,'utf8')),productionAccessed:false},null,2));
}
}
void run().catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
