import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileGravelBaseOperationS2735 as compile,GRAVEL_BASE_VARIANTS_S2735 as variants,GRAVEL_BASE_DEFINITION_S2735 as definition,
  GRAVEL_BASE_SOURCE_ID_S2735 as sourceId,GRAVEL_BASE_NORM_ID_S2735 as normId,GRAVEL_BASE_SOURCE_METADATA_S2735 as sourceMetadata} from '../../../src/lib/estimate/v4/gravelBaseOperationS2735';
const currentReleasePath=resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json');
const outputRoot=resolve('.release-runtime/r568/s27-35/gravel-base-batch');
const titles={standard:'стандартная зона',small_area:'малый участок',large_area:'большой участок',high_load:'повышенная нагрузка по проекту',technical_room:'техническое помещение',wet_zone:'влажная зона'};
const selectedVariant=process.argv.find(a=>a.startsWith('--variant='))?.slice('--variant='.length);
assert(selectedVariant==null||variants.includes(selectedVariant as typeof variants[number]),'UNKNOWN_GRAVEL_BASE_VARIANT');
async function run(){const receipts:unknown[]=[];
for(const [index,variant]of variants.entries()){
  if(selectedVariant!=null&&selectedVariant!==variant)continue;
  const parent=JSON.parse(readFileSync(currentReleasePath,'utf8'));
  const catalogId='canonical-work:base:earthworks_interior_gravel_base_prepare_'+variant;
  const titleRu=titles[variant];
  const variantRoot=resolve(outputRoot,variant);
  async function verifyCore(){const short=await compile({volume_m3:20},catalogId);
    const checked=await compile({volume_m3:20,gb_backfill_loose_per_installed_m3:1.2,gb_pbb_backfill_material:'EXPLICIT_VERIFICATION_PRODUCT',gb_pbb_assembly_designation:'EXPLICIT_VERIFICATION_METHOD_NOT_RUNTIME',gb_pbb_compaction_coefficient:0.95,gb_backfill_stock:5,gb_backfill_reserve:2,gb_backfill_quantum:10},catalogId);
    assert.equal(short.rows.length,1);assert.equal(short.rows[0].quantity,'20');assert.equal(short.preliminaryNeeds.length,25);
    assert.equal(checked.rows.find(r=>r.row_id==='gravel-base:material:trench:upper-backfill')?.quantity,'30');
    assert(!Object.keys(definition.runtimeInput).some(k=>/labor_h|machine_h|coefficient|loose_per|trip_count/.test(k)));
    return {status:'GREEN_S2735_GRAVEL_BASE_REUSED_OWNER',variant,knownShortRows:short.rows.length,shortNeeds:short.preliminaryNeeds.length,engineeringAccepted:false,ordinaryUiAccepted:false,
      validationFixtureNeverRuntimeDefaults:true,sha256:createHash('sha256').update(JSON.stringify({short,checked})).digest('hex')};}
  const config:MasterSingleDefinitionSuccessorConfig={contract:'rik-expo-app.s27-35.gravel-base-'+variant+'.v1',stopCode:'S2735_GRAVEL_BASE_'+variant.toUpperCase(),applicationName:'s2735-gravel-base-'+variant,
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (75).md',masterSha256:'bd9241644e6fd958e77a775f24ae7043ad33a1e67e72f0b4b0983da0fd57b230',
    parentReleaseId:parent.definitionReleaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath,outputRoot:variantRoot,
    sourcePaths:['src/lib/estimate/v4/gravelBaseOperationS2735.ts','src/lib/estimate/v4/granularBackfillOperationS2735.ts','src/lib/estimate/v4/singlePipeTrenchConstructorS2735.ts','src/lib/estimate/v4/pipeBeddingBackfillR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
      'data/estimate-benchmarks/source-packs/gravel-base-operation-s27-35.json','tests/estimateNorms/gravelBaseOperationS2735.contract.test.ts','scripts/estimate/r4a13/prepareS2735GravelBaseBatchSuccessor.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'],
    catalogId,sourceId,normId,sourceMetadata,parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{volume_m3:20},acceptanceInput:{volume_m3:20,...definition.runtimeInput},runtimeProfileInput:definition.runtimeInput,runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,
    verifyCore,expectedParentShape:[1,59,59],benchmarkOrdinal:129+index,validationScenario:'S2735_GRAVEL_BASE_'+variant.toUpperCase()+'_ORDINARY_VOLUME',
    passport:{canonicalRuName:'Щебёночное основание: материал, укладка и уплотнение ('+titleRu+')',workKey:'earthworks_interior_gravel_base_prepare_'+variant,
      physicalResultRu:'Уложенное и уплотнённое отдельно измеренное щебёночное основание с материалом, фактическим оснащением и ресурсами по проектному решению; вариант не назначает норму',
      includedScopeRu:['Материал по фактическому коэффициенту рыхлой поставки и выбранной спецификации','Принятые операции поставки, укладки, уплотнения, контроля и логистики','Потребление, пригодное наличие, резерв, кратность, заказ и остаток одного владельца',
        'Отдельные инструмент/расходники и вода по фактической ведомости','Геотекстиль только по проектной применимости и фактической раскладке с нахлёстами','Известный объём сразу, остальные уточнения только по зависимым строкам'],
      excludedScopeRu:['Разработка, поставка трубы, постель и обсыпка другой операции','Автоматические песчаные/дренажные слои, трубы и общие комплекты','Нормы по названию варианта и геометрия из объёма','Цены и инженерное утверждение без исходных данных']},
    applicability:{country:'KG',primaryMeasureParameterId:'volume_m3',knownScopeParameters:['volume_m3'],ordinaryUserInputCount:1,variant,materialAndCompactionFactsRequired:true,hiddenDemoFixtureInputs:false,ordinaryUiAccepted:false,engineeringAccepted:false},
    binding:{rowId:'gravel-base:material:trench:upper-backfill',applicability:{technology_class:'MEASURED_GRAVEL_BASE_PROJECT_SPECIFICATION',operation_class:'REUSED_ACCEPTED_SUPPLY_PLACING_COMPACTION',source_id:sourceId,norm_id:normId,exact_locator:sourceMetadata.exact_locator,quantity_basis:'ACTUAL_INSTALLED_VOLUME_AND_LOOSE_SUPPLY_FACTOR',universal_productivity_claimed:false}},
    locator:{key:'gravel-base-s27-35-'+variant+'-v1',payload:{kind:'ACTUAL_VOLUME_REUSED_OPERATION',sourcePackSha256:sourceMetadata.artifact_sha256,ordinaryKnownInputs:['volume_m3'],visibleProfileInputs:Object.keys(definition.runtimeInput),fixtureValuesNeverRuntimeDefaults:true,variantDoesNotChooseEngineeringNorm:true}},
    search:{primaryUom:'m3',canonicalNameRu:'Щебёночное основание: материал, укладка и уплотнение ('+titleRu+')',aliases:['подготовка щебёночного основания '+titleRu,'щебёночное основание с уплотнением '+titleRu],
      shortScopeRu:'Отдельно измеренное щебёночное основание. Материал, рыхлая поставка, укладка, уплотнение и фактическое оснащение; проектные условия требуют подтверждения.',
      keyDistinguishingParameters:['volume_m3','gb_pbb_backfill_material','gb_pbb_compaction_coefficient'],clarificationFields:['gb_backfill_loose_per_installed_m3','gb_pbb_assembly_designation','gb_material_delivery_scope_reference'],
      includedBoundaries:['Материал/укладка/уплотнение/контроль/оснащение/фактическая логистика'],excludedBoundaries:['Разработка, труба, постель, обсыпка','Автоматические нормы по варианту'],
      extraSearchTermsRu:'щебень щебёночное основание подготовка фракция слой уплотнение геотекстиль объём закупка остаток',sourceProvenance:{acceptedOperationReused:true,variantDoesNotChooseEngineeringNorm:true,hiddenDemoFixtureInputs:false,engineeringApprovalClaimed:false}},
    forbiddenAdjacentMatchers:[/drainage_pipe/iu,/materials_0[1-6]/iu,/professional_.*_set/iu],owner:'S2735_GRAVEL_BASE_BATCH',receiptFileStem:'gravel_base_'+variant};
  await runMasterSingleDefinitionSuccessorR1(config);
  const receipt=process.argv.includes('--apply')?JSON.parse(readFileSync(resolve(variantRoot,'acceptance.json'),'utf8')):{status:'DRY_RUN_COMPLETED_WITHOUT_DATABASE_MUTATION',parent:{releaseId:parent.definitionReleaseId,searchReleaseId:parent.searchReleaseId},successor:null,productionAccessed:false,source:null};
  receipts.push({variant,status:receipt.status,parent:receipt.parent,successor:receipt.successor,productionAccessed:receipt.productionAccessed,source:receipt.source});
  mkdirSync(outputRoot,{recursive:true});writeFileSync(resolve(outputRoot,process.argv.includes('--apply')?'batch-apply-summary.json':'batch-dry-run-summary.json'),JSON.stringify({variants:receipts,current:JSON.parse(readFileSync(currentReleasePath,'utf8')),productionAccessed:false},null,2));
}
}
void run().catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
