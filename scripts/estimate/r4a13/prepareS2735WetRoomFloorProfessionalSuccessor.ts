import {resolve} from "node:path";
import {readFileSync} from "node:fs";
import {strict as assert} from "node:assert";
import {createHash} from "node:crypto";
import {runMasterSingleDefinitionSuccessorR1} from "./prepareMasterSingleDefinitionSuccessorR1";
import {compileWetRoomFloorProfessionalS2735 as compile,WET_ROOM_PROFESSIONAL_DEFINITION_S2735 as definition,
  WET_ROOM_PROFESSIONAL_CATALOG_ID_S2735 as catalogId,WET_ROOM_PROFESSIONAL_SOURCE_ID_S2735 as sourceId,
  WET_ROOM_PROFESSIONAL_NORM_ID_S2735 as normId,WET_ROOM_PROFESSIONAL_SOURCE_METADATA_S2735 as sourceMetadata}
  from "../../../src/lib/estimate/v4/wetRoomFloorProfessionalS2735";
const parent=JSON.parse(readFileSync(resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),"utf8"));
const wpReceipt=JSON.parse(readFileSync(resolve(".release-runtime/r568/s27-35/wet-zone-product-accessory-successor/acceptance.json"),"utf8"));
const receiptText=JSON.stringify(wpReceipt);
assert(receiptText.includes(parent.definitionReleaseId)&&receiptText.includes(parent.searchReleaseId),"VERIFIED_WATERPROOFING_PARENT_REQUIRED");
async function verifyCore(){
  const first=await compile({area_m2:30}),changed=await compile({area_m2:60});
  assert.equal(first.rows.find(r=>r.row_id==="rc09:porcelain_tile_600x600")?.quantity,"33.12");
  assert.equal(first.rows.find(r=>r.row_id==="rc09:c2te_s1_tile_adhesive")?.quantity,"150");
  assert.equal(first.rows.filter(r=>r.row_id.startsWith("material:wet-room:shared-clean-water")).length,1);
  assert.equal(first.rows.filter(r=>r.row_id.startsWith("allocation:")).length,2);
  assert(first.preliminaryNeeds.some(r=>r.missing_parameter_ids.includes("tile_worker_h")));
  assert(!Object.keys(definition.runtimeInput).some(id=>/worker_h|machine_h|productivity/u.test(id)));
  assert(Number(changed.rows.find(r=>r.row_id==="rc09:porcelain_tile_600x600")?.quantity)>60);
  return {status:"GREEN_S2735_WET_ROOM_MATERIAL_CONSTRUCTOR",areaM2:30,knownRows:first.rows.length,needs:first.preliminaryNeeds.length,
    hiddenDemoFixtureInputs:false,visiblePreliminaryProfile:true,laborAndMachineNormsClaimed:false,engineeringAccepted:false,ordinaryUiAccepted:false,
    sha256:createHash("sha256").update(JSON.stringify({first,changed})).digest("hex")};
}
void runMasterSingleDefinitionSuccessorR1({
  contract:"rik-expo-app.s27-35.wet-room-floor-professional.v1",stopCode:"S2735_WET_ROOM_PROFESSIONAL",applicationName:"s2735-wet-room-professional",
  expectedBranch:"codex/r4-a5-clean-08b18902",masterPath:"C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (75).md",
  masterSha256:"bd9241644e6fd958e77a775f24ae7043ad33a1e67e72f0b4b0983da0fd57b230",parentReleaseId:parent.definitionReleaseId,parentSearchReleaseId:parent.searchReleaseId,
  currentReleasePath:resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),outputRoot:resolve(".release-runtime/r568/s27-35/wet-room-professional-successor"),
  sourcePaths:["src/lib/estimate/v4/wetRoomFloorProfessionalS2735.ts","src/lib/estimate/v4/wetZoneWaterproofingCompletionS2735.ts",
    "src/lib/estimate/v4/porcelainFloorTileInstallationR1.ts","src/lib/estimate/v4/concreteSlabRepairR1.ts",
    "data/estimate-benchmarks/source-packs/wet-room-professional-s27-35.json","tests/estimateNorms/wetRoomFloorProfessionalS2735.contract.test.ts",
    "scripts/estimate/r4a13/prepareS2735WetRoomFloorProfessionalSuccessor.ts","src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/effectivePurchaseBalanceR1.ts","scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts","scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts"],
  catalogId,sourceId,normId,sourceMetadata,parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{area_m2:30},acceptanceInput:{area_m2:30,...definition.runtimeInput},runtimeProfileInput:definition.runtimeInput,
  runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,verifyCore,expectedParentShape:[1,59,59],
  benchmarkOrdinal:121,validationScenario:"S2735_WET_ROOM_FLOOR_ORDINARY30_MATERIAL_CONSTRUCTOR",
  passport:{canonicalRuName:"Пол санузла: подготовка, гидроизоляция, плитка и швы",workKey:"tile_stone_interior_porcelain_tile_lay_wet_zone",
    physicalResultRu:"Подготовка, применимое грунтование, гидроизоляция с примыканиями, облицовка, затирка, герметизация и сдача; до выполнения требуется обследование и утверждение фактической технологии",
    includedScopeRu:["Повторное использование готовых CL51/плиточной/ремонтной операций", "Отдельная площадь пола и заходов на стены",
      "Точные выбранные версии материалов и видимый заменяемый профиль", "Потребность, округлённый заказ, остаток и резерв",
      "Поштучное оснащение и расходники", "Совместимая вода суммируется до одного округления, распределение сохраняется по операциям",
      "Условные ремонт, выравнивание/уклон; труд и машино-часы остаются фактическими входами"],
    excludedScopeRu:["Инженерная приёмка и согласованная раскладка", "Цены и универсальные нормы труда/техники", "Проходки и трап без обследования", "Невидимые DEMO данные"]},
  applicability:{country:"KG",primaryMeasureParameterId:"area_m2",knownScopeParameters:["area_m2"],ordinaryUserInputCount:1,
    visiblePreliminaryProfile:true,hiddenDemoFixtureInputs:false,actualSurveyConfirmed:false,ordinaryUiAccepted:false,engineeringAccepted:false},
  binding:{rowId:"rc09:porcelain_tile_600x600",applicability:{technology_class:"WET_ROOM_FLOOR_VISIBLE_PRELIMINARY_PROFILE",
    operation_class:"REUSABLE_WATERPROOFING_TILE_GROUT_SEAL_FINISH",source_id:sourceId,norm_id:normId,exact_locator:sourceMetadata.exact_locator,
    quantity_basis:"MANUFACTURER_PROPERTIES_AND_VISIBLE_REPLACEABLE_GEOMETRY_AND_SUPPLY_PROFILE",universal_productivity_claimed:false}},
  locator:{key:"wet-room-floor-professional-s27-35-v1",payload:{kind:"MANUFACTURER_TDS_VISIBLE_PRELIMINARY_PROFILE",sourcePackSha256:sourceMetadata.artifact_sha256,
    ordinaryKnownInputs:["area_m2"],visibleProfileInputs:Object.keys(definition.runtimeInput),fixtureValuesNeverRuntimeDefaults:true,operationReuse:true}},
  search:{primaryUom:"m2",canonicalNameRu:"Пол санузла: подготовка, гидроизоляция, плитка и швы",
    aliases:["сделать пол санузла с плиткой","пол ванной с гидроизоляцией и плиткой","пол санузла под ключ с плиткой"],
    shortScopeRu:"Предварительная ресурсная смета полного пола: подготовка, гидроизоляция, плитка, швы, расходники, оснащение и завершение; факты обследования, часы и цены уточняются.",
    keyDistinguishingParameters:["area_m2","tile_length_mm","tile_width_mm","room_aspect_ratio","wall_upturn_height_m"],
    clarificationFields:["substrate_repair_mode","floor_leveling_mode","penetration_collar_count","floor_collar_count"],
    includedBoundaries:["Подготовка/грунт/CL51/плитка/клей/швы/герметик/оснащение/завершение", "Требуемые ремонт и выравнивание по фактам"],
    excludedBoundaries:["Обследование и фактические часы без исходных данных", "Цены и инженерное утверждение"],
    extraSearchTermsRu:"санузел ванная пол плитка керамогранит гидроизоляция клей затирка герметик материалы профессиональная смета",
    sourceProvenance:{existingOperationsReused:true,visiblePreliminaryProfile:true,hiddenDemoFixtureInputs:false,engineeringApprovalClaimed:false}},
  forbiddenAdjacentMatchers:[/rc09:floor_waterproofing/iu],owner:"S2735_WET_ROOM_FLOOR_PROFESSIONAL",receiptFileStem:"wet_room_professional",
}).catch(error=>{process.stderr.write(String(error.stack??error)+"\n");process.exitCode=1;});
