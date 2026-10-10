import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {eggerEl2240ConfigS2754,eggerEl2240ExplicitControlS2754} from './prepareS2754EggerEl2240';
import {eggerEl2240PackS2754 as originalPack,eggerEl2240PrefixS2754 as prefix,eggerEl2240DefinitionS2754 as original,compileEggerEl2240S2754} from '../../../src/lib/estimate/v4/eggerEl2240S2754';
import {eggerAccessoriesPackS2754 as pack,eggerAccessoriesDefinitionS2754 as definition,eggerAccessoriesCompletenessMapS2754,compileEggerAccessoriesS2754} from '../../../src/lib/estimate/v4/eggerAccessoriesS2754';
export function eggerAccessoriesControlS2754(){return {...eggerEl2240ExplicitControlS2754(),
  tape_method_confirmed:pack.tapeMethodValue,tape_layout_reference:'CONTROL_ONLY:24м принятых примыканий/разрезов; заводская полосаDuo исключена; не реальная раскладка',
  tape_required_m:24,tape_stock_m:0,tape_reserve_m:0,tape_supplier_roll_multiple:1,
  skirting_profile_confirmed:pack.skirtingProfileValue,skirting_climate_confirmed:pack.skirtingClimateValue,skirting_layout_confirmed:pack.skirtingLayoutValue,
  skirting_layout_reference:'CONTROL_ONLY:прямоугольнаякомната5×4м,чистыеучастки16,8мбезпроёмов;8целыхпланок2,4мпопринятойкарте; около5%ужерассмотрены,второйнадбавкинет',
  skirting_installed_m:16.8,skirting_required_boards:8,skirting_stock_boards:0,skirting_reserve_boards:0,skirting_supplier_board_multiple:1,
  clip_layout_confirmed:pack.clipLayoutValue,clip_layout_reference:'CONTROL_ONLY:44позиции с принятымшагом25–50смпоучасткам/стыкам;ненормаизплощади',
  clip_wall_confirmed:pack.clipWallValue,clip_wall_reference:'CONTROL_ONLY:модель техническипринятого стеновогоузлаS6PP/DIN7997;неуниверсальнаясовместимость',
  clip_supply_confirmed:pack.clipSupplyValue,clip_supply_reference:'CONTROL_ONLY:модельдокументапоставки30клипс+30винтов+30дюбелей/упаковка;неутверждениеизTDS',
  clip_required_pcs:44,clip_stock_complete_sets:0,clip_reserve_complete_sets:0,clip_supplier_box_multiple:1};}
export function eggerAccessoriesConfigS2754(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const base=eggerEl2240ConfigS2754(parent),map=eggerAccessoriesCompletenessMapS2754(),unresolved=[...pack.remainingSourceNeeds,'skirting-tools'].map(id=>prefix+':'+id),
    included=[...base.passport.includedScopeRu,'AluTape1483117,текущийплинтус1818385 иClipholder1823775 раскрыты по собственным паспортам',
      'Лента по принятой ведомости не дублирует встроенную полосуDuo; число целых планок по раскрою не получает вторые5%',
      'Клипсы по принятой ведомости и стеновому узлу; винтDIN7997 3,5×30мм иS6PP включены только при документально подтверждённой полной поставке',
      'Материал и физическая комплектация известны отдельно от числа, источника часов и пригодности конкретного объекта'];
  return {...base,contract:pack.contract,stopCode:'S2754_EGGER_ACCESSORIES',applicationName:'s2754-egger-accessories',outputRoot:resolve('.release-runtime/r568/s27-54/egger-accessories/publication'),
    expectedParentShape:[31,20,20],catalogAppend:undefined,sourceId:pack.sourceId,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754EggerAccessories.ts','src/lib/estimate/v4/eggerAccessoriesS2754.ts',
      'data/estimate-benchmarks/source-packs/egger-el2240-accessories-s27-54.json',...base.sourcePaths,...Object.values(pack.sources).map(s=>s.localArtifact)],
    sourceMetadata:{source_title:'EGGER EL2240:AluTape,текущий6cmCUBICAL иClipholder по собственнымTDS/инструкции',source_authority:'EGGER:официальныеTDS,инструкция;объектные количества и поставка требуют принятой ведомости',
      source_kind:'VERIFIED_ACCESSORY_PASSPORTS_AND_EXPLICIT_LAYOUT_DELIVERY_FACTS',official_url:pack.sources.skirtings.officialUrl,artifact_sha256:pack.sources.skirtings.sha256,
      exact_locator:pack.sources.skirtings.locatorRu+';'+pack.sources['skirting-installation'].locatorRu,use_restriction:'Один принятый узел по текущим поставленным изделиям; универсальная совместимость стен, количество комплектующих из30pieces и проценты из площади не назначены.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,acceptanceInput:eggerAccessoriesControlS2754(),
    validationScenario:'S2754_EGGER_EXISTING_TYPE_THREE_ACCESSORY_OWNERS_AND_INCLUDED_FIXINGS',
    passport:{...base.passport,includedScopeRu:included,physicalResultRu:'Три прежние материальные потребности преобразованы в точные ресурсные записи по принятой ведомости. Крепёж по подтверждённому комплекту имеет одного владельца цены. Остаток норм раскрыт.',
      unresolvedApplicableResourceRowIds:unresolved,independentCompletenessMap:map},
    applicability:{...base.applicability,existingCatalogIdentityPreserved:true,currentSkirtingDimensionsMm:[2400,58,14],clipPackagePcs:30,tapeRollM:50,tapeWidthMm:50,
      integratedDuoStripNotDuplicated:true,skirtingCutAllowanceNotAddedTwice:true,fullClipDeliveryFactAndWallDetailRequired:true,clipSpacingFromAcceptedLayout:true,
      oldKnownLaminateAndUnderlayQuantitiesPreserved:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    locator:{key:'s2754-egger-accessories',payload:{sourcePack:pack,existingIdentity:originalPack.catalogId,confirmedNewResourceOwners:3,includedHardwareComponents:2,
      kitQuantityNotManufacturerPromise:true,oldLaminateCoreReused:true,fullTechnicalAcceptance:false}},
    search:{...base.search,shortScopeRu:originalPack.scopeRu+' По принятым узлам:AluTape50м,плинтус2,4м,Clipholder30шт;винтыDIN7997иS6PPпо подтверждённойкомплектности.',
      includedBoundaries:included,keyDistinguishingParameters:[...base.search.keyDistinguishingParameters,'tape_layout_reference','skirting_profile_confirmed','skirting_layout_reference','clip_wall_reference','clip_supply_reference'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
      extraSearchTermsRu:base.search.extraSearchTermsRu+' AluTape1483117плинтус1818385Clipholder1823775DIN7997S6PP',sourceProvenance:{sourcePack:'egger-el2240-accessories-s27-54.json',primaryMeasureParameterId:'net_floor_area_m2',fullTechnicalAcceptance:false}},
    forbiddenAdjacentMatchers:[/591722|hydro_install|full_glue_install/iu],owner:'S2754_EGGER_ACCESSORIES_SINGLE_WRITER',receiptFileStem:'egger_accessories',verifyCore:verifyEggerAccessoriesS2754};
}
export async function verifyEggerAccessoriesS2754(){
  for(const source of Object.values(pack.sources))assert.equal(createHash('sha256').update(readFileSync(source.localArtifact)).digest('hex'),source.sha256);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:eggerAccessoriesCompletenessMapS2754(),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
  const oldInput=eggerEl2240ExplicitControlS2754(),old=await compileEggerEl2240S2754(oldInput),legacy=await compileEggerAccessoriesS2754(oldInput);
  assert.equal(legacy.rows.length,11);assert.equal(legacy.rows.filter(r=>r.included_in_procurement).length,2);
  for(const row of old.rows){const same=legacy.rows.find(r=>r.row_id===row.row_id);assert(same);assert.equal(same.quantity,row.quantity);assert.equal(same.unit_id,row.unit_id);assert.equal(same.included_in_procurement,row.included_in_procurement);}
  for(const id of ['alu-tape','skirting','skirting-clips']){const before=original.resources.find(r=>r.row_id===prefix+':'+id),after=definition.resources.find(r=>r.row_id===before!.row_id);
    assert.equal(after!.unit_id,before!.unit_id);assert.equal(after!.cost_owner_id,before!.cost_owner_id);assert.equal(after!.id,before!.id);}
  const input=eggerAccessoriesControlS2754(),r=await compileEggerAccessoriesS2754(input),qty=(id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
  assert.equal(r.rows.length,28);assert.equal(r.preliminaryNeeds.length,7);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,5);
  for(const [id,q] of [['laminate-order','10'],['duo-order','2'],['alu-tape','50'],['alu-tape-consumed','24'],['alu-tape-rolls','1'],['alu-tape-remaining','26'],
    ['skirting','19.2'],['skirting-installed-length','16.8'],['skirting-ordered-boards','8'],['skirting-remaining','0'],['skirting-clips','60'],['clip-consumed','44'],['clip-boxes','2'],['clip-remaining','16'],['clip-screws-included','44'],['clip-dowels-included','44']])assert.equal(qty(id),q,id);
  for(const id of ['clip-screws-included','clip-dowels-included']){const row=definition.resources.find(r=>r.row_id===prefix+':'+id)!;assert.equal(row.cost_owner_id,prefix+':skirting-clips');assert.equal(row.procurement_eligible,false);}
  for(const fact of ['clip_supply_confirmed','clip_supply_reference','clip_wall_confirmed','clip_wall_reference']){
    const missing=await compileEggerAccessoriesS2754({...input,[fact]:undefined});assert(!missing.rows.some(r=>r.row_id===prefix+':skirting-clips'));
    assert(missing.preliminaryNeeds.some(n=>n.row_id===prefix+':clip-screws-included'));assert.equal(missing.rows.find(r=>r.row_id===prefix+':laminate-order')?.quantity,'10');}
  for(const [fact,owner] of [['tape_method_confirmed','alu-tape'],['tape_layout_reference','alu-tape'],['skirting_profile_confirmed','skirting'],['skirting_climate_confirmed','skirting'],['skirting_layout_confirmed','skirting'],['skirting_layout_reference','skirting'],['clip_layout_confirmed','skirting-clips'],['clip_layout_reference','skirting-clips']] as const)
    assert(!(await compileEggerAccessoriesS2754({...input,[fact]:undefined})).rows.some(r=>r.row_id===prefix+':'+owner));
  const reserved=await compileEggerAccessoriesS2754({...input,tape_stock_m:10,tape_reserve_m:5,tape_supplier_roll_multiple:2,skirting_supplier_board_multiple:10,clip_stock_complete_sets:30,clip_reserve_complete_sets:1});
  for(const [id,q] of [['alu-tape','100'],['skirting','24'],['skirting-clips','30'],['clip-screws-included','44']])assert.equal(reserved.rows.find(r=>r.row_id===prefix+':'+id)?.quantity,q,id);
  const stocked=await compileEggerAccessoriesS2754({...input,tape_stock_m:50,skirting_stock_boards:8,clip_stock_complete_sets:60});
  for(const id of ['alu-tape','skirting','skirting-clips'])assert.equal(stocked.rows.find(r=>r.row_id===prefix+':'+id)?.quantity,'0');
  for(const changes of [{skirting_required_boards:6},{skirting_installed_m:19},{clip_supply_confirmed:'Комплектностьнеизвестна'},{skirting_profile_confirmed:'2400×60×17мм'},{clip_required_pcs:44.5},{open_qty_alu_tape:24},{open_qty_skirting_tools:1}])
    await assert.rejects(()=>compileEggerAccessoriesS2754({...input,...changes}));
  assert(definition.parameters.filter(p=>/stock|reserve|supplier/.test(p.parameter_id)).every(p=>p.default_value==null));
  assert.equal((definition.resources.find(r=>r.row_id===prefix+':skirting-tools')!.resource_graph.publicResourcePresentationV1 as {brandAndModelRu:string|null}).brandAndModelRu,null);
  return {status:'GREEN_LIMITED_EGGER_ACCESSORY_SUCCESSOR',shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],knownRows:28,sourceNeeds:7,procurementRows:5,
    confirmedNewResourceOwners:3,includedHardwareComponents:2,oldKnownRowsPreserved:11,oldIdentityUnitsAndCostOwnersPreserved:true,legacyInputDoesNotAutoApproveAccessories:true,
    currentSkirtingProfileMm:[2400,58,14],clipSupplyDocumentRequired:true,integratedDuoStripNotDuplicated:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754EggerAccessories.ts')){
  const c=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(eggerAccessoriesConfigS2754({releaseId:c.definitionReleaseId,searchReleaseId:c.searchReleaseId})).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
}
