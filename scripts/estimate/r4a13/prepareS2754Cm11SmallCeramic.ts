import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {cn87SeparationConfigS2754} from './prepareS2754Cn87SeparationScreed';
import {cm11SmallCeramicPackS2754 as pack,cm11SmallCeramicDefinitionS2754 as definition,cm11SmallCeramicCompletenessMapS2754,
 compileCm11SmallCeramicS2754,cm11SmallCeramicPrefixS2754 as prefix} from '../../../src/lib/estimate/v4/cm11SmallCeramicS2754';
export function cm11ControlInputS2754(){return {tile_area_m2:35.5,geometry_confirmed:pack.geometryValue,base_confirmed:pack.baseValue,
 conditions_confirmed:pack.conditionsValue,primer_drying_confirmed:pack.dryingValue,supplied_product_confirmed:pack.suppliedProductValue,
 primer_scheme_confirmed:pack.primerSchemeValue,ct17_container:'5 л'};}
export function cm11ExplicitMaterialControlS2754(){return {...cm11ControlInputS2754(),
 cm11_stock:0,cm11_reserve:0,cm11_supplier_bag_multiple:1,ct17_rate_l_m2:0.2,ct17_coat_count:1,
 ct17_stock:0,ct17_reserve:0,ct17_5l_supplier_multiple:1,cm11_water_l_per_25kg:5.8,water_stock:0,water_reserve:0,water_quantum_l:1};}
export function cm11SmallCeramicConfigS2754(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
 const base=cn87SeparationConfigS2754(parent),included=[pack.scopeRu,'Принятый профиль CM11: точная пара керамика≤10см/шпатель4мм, приблизительно2кг/м²',
  'CT17global: явный расход0,1–0,5л/м² и число проходов; одна выбранная фасовка1/2/5/10л',
  'Вода5,5–6л/25кг смешиваемого клея; явная дозировка, отдельно от округлённой закупки',
  'Конкретные CE40 Aquastatic и CS25 MicroProtect — кандидаты с применением и открытой геометрией/количеством'];
 return {...base,contract:pack.contract,stopCode:'S2754_CM11_SMALL_CERAMIC',applicationName:'s2754-cm11-small-ceramic',
  outputRoot:resolve('.release-runtime/r568/s27-54/cm11-small-ceramic/publication'),catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourcePaths:['scripts/estimate/r4a13/prepareS2754Cm11SmallCeramic.ts','scripts/estimate/r4a13/prepareS2754Cn87SeparationScreed.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
   'src/lib/estimate/v4/cm11SmallCeramicS2754.ts','data/estimate-benchmarks/source-packs/cm11-small-ceramic-s27-54.json',pack.acceptedPhysicalSourcePack,
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',...Object.values(pack.sources).map(source=>source.localArtifact)],
  sourceMetadata:{source_title:'Ceresit CM11 PLUS04/2026, CT17 Profi03.24 и кандидат CE40 Aquastatic ru_KZ; принятый профиль малой керамической плитки',
   source_authority:'Изготовитель Ceresit/Henkel; физический профиль переиспользован',source_kind:'MANUFACTURER_PHYSICAL_CONSUMPTION_AND_TECHNOLOGY_WITH_OPEN_JOINTS',
   official_url:pack.sources.cm11.officialUrl,artifact_sha256:pack.sources.cm11.sha256,exact_locator:pack.sources.cm11.locatorRu,
   use_restriction:pack.scopeRu+' Расход кандидатов швов и часы не назначены. Различие выдержки2/5мин требует инструкции поставленной партии; реальная25кг фасовка CM11 подтверждается поставкой.'},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{tile_area_m2:35.5},acceptanceInput:cm11ControlInputS2754(),validationScenario:'S2754_CM11_SMALL_CERAMIC_CT17_ONE_CONTAINER_MATERIAL_LINKAGE',
  passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Раскрыты плитка по реальному артикулу, CM11, CT17, вода и кандидаты CE40/CS25; труд и полный состав швов остаются открытыми.',
   includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(gap=>prefix+':'+gap.id),independentCompletenessMap:cm11SmallCeramicCompletenessMapS2754()},
  applicability:{country:'KG',product:'CM11 PLUSglobal04/2026',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,tile:'CERAMIC_UP_TO_10CM',notchMm:4,
   base:'READY_ABSORBENT_CEMENT_SCREEED_28D_2CM',installation:'INDOOR_HORIZONTAL',underfloorHeating:false,primer:'CT17_PROFI_GLOBAL_03_24_UNDILUTED',
   primerBeforeCm11DryingMinHours:2,approximateConsumption:true,confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
  binding:{rowId:prefix+':cm11-consumed',applicability:{exactPair:'UP_TO_10CM_4MM',approximateRateKgM2:2,confirmedLaborNorm:false}},
  locator:{key:'s2754-cm11-small-ceramic',payload:{sourcePack:pack,acceptedPhysicalProfileReused:true,ct17OneContainerOnly:true,
   actualCm11PackageRequiresSupplyConfirmation:true,cm11Maturing2Vs5ConflictNotHidden:true,sourcePricesNotCurrent:true,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['Укладка керамической плитки до10см на CM11 PLUS','Малая керамическая плитка, CT17 и шпатель4мм'],
   shortScopeRu:pack.scopeRu+' Точные клей, грунтовка, вода, применение CE40/CS25; не полный принятый состав швов и труда.',
   keyDistinguishingParameters:['geometry_confirmed','base_confirmed','primer_drying_confirmed','supplied_product_confirmed','ct17_container'],
   clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:included,excludedBoundaries:pack.excludedRu,extraSearchTermsRu:'плитка керамика10см клей CM11 PLUS грунтовка CT17 Profi затирка CE40 Aquastatic силикон CS25 MicroProtect вода шпатель4мм',
   sourceProvenance:{sourcePack:'cm11-small-ceramic-s27-54.json',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,primaryMeasureParameterId:'tile_area_m2',fullTechnicalAcceptance:false}},
  catalogAppend:{identity:{namespace:'global',domain:'tile_stone',sourceIdentity:'ceresit-cm11-global042026:ceramic-up-to10cm-4mm:absorbent-cement-indoor',workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},
   searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:'join',groupId:'wg:base:tile_stone_interior_ceramic_tile_lay',groupNameRu:'укладка керамической плитки для высокой нагрузки',
    domainId:'tile_stone',systemId:'tile_stone',subsystemId:'wg:base:tile_stone_interior_ceramic_tile_lay',assemblyId:'wg:base:tile_stone_interior_ceramic_tile_lay',
    workFamilyId:'wg:base:tile_stone_interior_ceramic_tile_lay',breadcrumb:['укладка керамической плитки для высокой нагрузки'],membershipOrdinal:6,
    groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerScopeOnly:true},
    constructionState:'PREPARED_ABSORBENT_CEMENT_FLOOR',technologyVariant:'CM11_CERAMIC_UPTO10CM_4MM_CT17_GLOBAL',normativeClassifiers:['CERESIT_CM11_TDS_04_2026','CT17_PROFI_03_24'],
    applicabilityTags:['SMALL_CERAMIC','EXACT_4MM_NOTCH','CM11_CT17_GLOBAL','MANUFACTURER_PARTIAL']}},
  forbiddenAdjacentMatchers:[/CM17|CS16|CL51|CC83_ORDER|CT17_30L|porcelain_600/iu],owner:'S2754_CM11_SINGLE_WRITER',receiptFileStem:'cm11_small_ceramic',
  verifyCore:async()=>{
   for(const source of Object.values(pack.sources))assert.equal(createHash('sha256').update(readFileSync(source.localArtifact)).digest('hex'),source.sha256);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:cm11SmallCeramicCompletenessMapS2754(),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
   const input=cm11ControlInputS2754(),r=await compileCm11SmallCeramicS2754(input);assert.equal(r.rows.length,3);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,0);
   assert.equal(r.rows.find(row=>row.row_id===prefix+':cm11-consumed')?.quantity,'71');assert.equal(r.rows.find(row=>row.row_id===prefix+':water-min')?.quantity,'15.62');assert.equal(r.rows.find(row=>row.row_id===prefix+':water-max')?.quantity,'17.04');
   const explicit=cm11ExplicitMaterialControlS2754(),ordered=await compileCm11SmallCeramicS2754(explicit);assert.equal(ordered.rows.length,10);assert.equal(ordered.preliminaryNeeds.length,12);
   for(const [id,quantity] of [['cm11-consumed','71'],['cm11-order','75'],['cm11-bags','3'],['ct17-consumed','7.1'],['ct17-5l-order','10'],['ct17-5l-containers','2'],['water-consumed','16.472'],['water-order','17']])
    assert.equal(ordered.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,quantity,id);
   assert.equal(ordered.rows.filter(row=>row.included_in_procurement).length,3);
   for(const size of pack.primerContainerSizesL){const selected=await compileCm11SmallCeramicS2754({...explicit,ct17_container:size+' л',['ct17_'+size+'l_supplier_multiple']:1});
    const primerRows=selected.rows.filter(row=>row.included_in_procurement&&row.row_id.includes(':ct17-'));assert.equal(primerRows.length,1);assert.equal(primerRows[0].row_id,prefix+':ct17-'+size+'l-order');}
   const stock=await compileCm11SmallCeramicS2754({...explicit,cm11_stock:20,cm11_reserve:5,cm11_supplier_bag_multiple:2});assert.equal(stock.rows.find(row=>row.row_id===prefix+':cm11-order')?.quantity,'100');
   assert.equal(stock.rows.find(row=>row.row_id===prefix+':water-consumed')?.quantity,'16.472');
   assert(ordered.preliminaryNeeds.find(row=>row.row_id===prefix+':labor')?.missing_parameter_ids.includes('batch_maturing_instruction'));
   await assert.rejects(()=>compileCm11SmallCeramicS2754({...explicit,batch_maturing_instruction:'произвольное подтверждение2/5мин'}),/unresolved application norm cannot be supplied/);
   const noPrimerRate=await compileCm11SmallCeramicS2754({...explicit,ct17_rate_l_m2:undefined});assert(!noPrimerRate.rows.some(row=>row.included_in_procurement&&row.row_id.includes(':ct17-')));
   const noBase=await compileCm11SmallCeramicS2754({...explicit,base_confirmed:undefined});assert.equal(noBase.rows.length,0);
   const tileJoints=await compileCm11SmallCeramicS2754({...explicit,tile_area_m2:1.036324,tile_required_m2:1,
    tile_specification:'КОНТРОЛЬ:100керамических плиток100×100мм;9швов2мм по каждой оси, не реальный артикул',tile_stock:0,tile_reserve:0,tile_quantum_m2:1});
   assert.equal(tileJoints.rows.find(row=>row.row_id===prefix+':tile-consumed')?.quantity,'1');
   assert.equal(tileJoints.rows.find(row=>row.row_id===prefix+':tile-order')?.quantity,'1');
   await assert.rejects(()=>compileCm11SmallCeramicS2754({...explicit,primer_drying_confirmed:'15 минут'}));
   await assert.rejects(()=>compileCm11SmallCeramicS2754({...explicit,ct17_container:'30 л'}));
   await assert.rejects(()=>compileCm11SmallCeramicS2754({...explicit,cm11_water_l_per_25kg:6.1}));
   assert(definition.parameters.filter(p=>p.parameter_id.includes('stock')||p.parameter_id.includes('reserve')||p.parameter_id==='ct17_rate_l_m2').every(p=>p.default_value==null));
   assert.equal(definition.resources.find(row=>row.row_id===prefix+':sealant-cs25')?.source_metadata?.ownProductPassportSha256,null);
   return {status:'GREEN_LIMITED_CM11_CT17_MATERIAL_LINKAGE',knownRows:3,explicitMaterialKnownRows:10,needs:12,procurementRows:3,
    actualTileSkuAndLayoutStillRequired:true,ct17OneContainerOnly:true,waterNotBasedOnRoundedBags:true,sourceMaturingConflictNotHidden:true,
    primerDrying2hNot15min:true,cm11PackageIsSupplyFactNotPublishedPackaging:true,sourceNeeds:10,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
  }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Cm11SmallCeramic.ts')){
 const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 void runMasterSingleDefinitionSuccessorR1(cm11SmallCeramicConfigS2754({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
 .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
