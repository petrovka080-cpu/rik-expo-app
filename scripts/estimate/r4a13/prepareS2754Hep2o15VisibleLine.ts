import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig, validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {cn87SeparationConfigS2754} from './prepareS2754Cn87SeparationScreed';
import {hep2o15VisibleLinePackS2754 as pack, hep2o15VisibleLineDefinitionS2754, hep2o15VisibleLineCompletenessMapS2754,
  compileHep2o15VisibleLineS2754, hep2o15VisibleLinePrefixS2754} from '../../../src/lib/estimate/v4/hep2o15VisibleLineS2754';
import {resolveWavinHep2OPushFitLayoutV1, resolveProfessionalPhysicalNormParameterValuesV1,
  WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID} from '../../../src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1';
import type {ProfessionalParameterValueV4} from '../../../src/lib/estimate/v4/professionalProjectAssemblyV4';

export function hep2o15ControlInputS2754() {
  return {pipe_route_length_m: 8, system_confirmed: pack.systemValue, supports_confirmed: pack.supportValue,
    joints_confirmed: pack.jointValue, cut_plan_confirmed: pack.cutValue,
    project_reference: 'CONTROL_ONLY: прямая линия 8 м, опорный пролёт 7,8 м, два концевых узла, равномерные опоры; не проект объекта',
    test_program_reference: 'CONTROL_ONLY_NOT_PROJECT_APPROVAL', support_span_m: 7.8, selected_support_max_gap_m: 0.3,
    reusable_installed_sleeves: 2};
}
export function hep2o15ExplicitControlS2754() {
  return {...hep2o15ControlInputS2754(), pipe_stock_coils: 0, pipe_reserve_coils: 0, pipe_supplier_coil_multiple: 1,
    ...Object.fromEntries(['clip','sleeve','connector'].flatMap(key => [[`${key}_stock_pcs`,0],[`${key}_reserve_pcs`,0],[`${key}_quantum_pcs`,1]]))};
}
function physicalValues(orientation: string, diameter = 15, span = 7.8): Record<string, ProfessionalParameterValueV4> {
  const values = {product_profile_id: WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID,
    exact_material_or_equipment: 'Wavin Hep2O Barrier pipe and Hep2O fittings', pipe_material_and_class: 'Wavin Hep2O Barrier pipe',
    jointing_method: 'Wavin Hep2O push-fit with SmartSleeve', connection_count: 2, prepared_pipe_end_count: 4,
    hep2o_system_variant: 'WAVIN_HEP2O_PUSH_FIT', hep2o_joint_topology_reference: 'CONTROL_ONLY_TWO_CONNECTORS_FOUR_PIPE_ENDS',
    route_length_m: span, nominal_diameter_mm: diameter, hep2o_support_orientation: orientation,
    hep2o_support_span_lengths_m: String(span), hep2o_support_anchor_node_count: 2,
    hep2o_support_layout_reference: 'CONTROL_ONLY_ENDPOINT_ANCHORS_AND_UNIFORM_INTERMEDIATE_SUPPORTS', hep2o_support_anchor_positions_verified: 'true'};
  return Object.fromEntries(Object.entries(values).map(([id,value]) => [id,{value, unit_id:null, source_type:'USER_EXPLICIT' as const,
    source_id:'CONTROL_ONLY_NOT_PROJECT_APPROVAL', captured_at:'2026-10-10T00:00:00Z', confidence:'high' as const, applicability:'CONTROL_ONLY'}]));
}
export function hep2o15VisibleLineConfigS2754(index: number, parent: {releaseId:string;searchReleaseId:string}): MasterSingleDefinitionSuccessorConfig {
  const type = pack.types[index]; if (!type) throw Error('EXACT_TWO_HEP2O15_TYPES_ONLY');
  const definition = hep2o15VisibleLineDefinitionS2754(index), prefix = hep2o15VisibleLinePrefixS2754(index);
  const base = cn87SeparationConfigS2754(parent), gid = 'plumbing_hep2o15_visible_cold_s2754', gname = 'Монтаж видимых труб холодного водоснабжения';
  const included = [pack.scopeRu, 'Четыре конкретных изделия: HXX25/15W, HX85/15W, HX60/15W и HD1/15W',
    'Для видимой трубы обоих направлений выбранный шаг не более 0,3 м; концевые фитинги не заменяют опоры',
    'Четыре обслуживаемых трубных конца; пригодные установленные втулки не закупаются повторно',
    'Наличие, резерв и кратность поставщика явные; часы и крепёж имеют точные открытые пробелы'];
  return {...base, contract:pack.contract, stopCode:'S2754_HEP2O15_'+type.key.toUpperCase(), applicationName:'s2754-hep2o15-'+type.key,
    outputRoot:resolve('.release-runtime/r568/s27-54/hep2o15-visible-line/publication/'+type.key), expectedParentShape:[0,0,0],
    catalogId:type.catalogId, sourceId:pack.sourceId, normId:type.normId,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754Hep2o15VisibleLine.ts','src/lib/estimate/v4/hep2o15VisibleLineS2754.ts',
      'data/estimate-benchmarks/source-packs/hep2o15-visible-line-s27-54.json',pack.acceptedPhysicalSourcePack,
      'src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1.ts','src/lib/estimate/backendPlatform/formulaGraph.ts',
      'scripts/estimate/r4a13/prepareS2754Cn87SeparationScreed.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',pack.source.localArtifact],
    sourceMetadata:{source_title:'Wavin Hep2O HEP040: конкретные изделия, видимые опоры и трубные концы', source_authority:'Wavin; принятые физические профили переиспользованы',
      source_kind:'MANUFACTURER_PRODUCT_AND_VERIFIED_PROJECT_LAYOUT_NO_LABOR_NORM', official_url:pack.source.officialUrl,
      artifact_sha256:pack.source.sha256, exact_locator:pack.source.locatorRu, use_restriction:pack.scopeRu+' Часы и точный крепёж открыты; полной приёмки нет.'},
    parameterDefinitions:definition.parameters, formulaDefinitions:definition.formulas, resourceDefinitions:definition.resources,
    shortInput:{pipe_route_length_m:8}, acceptanceInput:hep2o15ControlInputS2754(), validationScenario:'S2754_HEP2O15_VISIBLE_'+type.key.toUpperCase()+'_FOUR_PIPE_ENDS',
    passport:{canonicalRuName:type.titleRu,workKey:type.workKey,physicalResultRu:'Конкретные труба, клипса, втулка и муфта связаны с этапами. Потребность и закупка разделены; часы и крепёж остаются открытыми.',
      includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(g=>prefix+':'+g.id),independentCompletenessMap:hep2o15VisibleLineCompletenessMapS2754(index)},
    applicability:{country:'KG',product:'Wavin Hep2O 15 mm',orientation:type.key,visible:true,coldWater:true,maximumSelectedSupportGapM:0.3,
      endpointSupportsConfirmed:true,supportSpanExcludesInsertions:true,straightConnectors:2,preparedPipeEnds:4,serviceableInstalledSleevesNotRebought:true,
      continuousNewCutMaximumM:25,routeBetweenConnectorEntryFacesMaximumM:24.936,newPipeNominalInsertionEachMm:32,supplierPackagingNotAssumed:true,confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':support-count',applicability:{verifiedSingleSpanUniformLayout:true,selectedVisibleGapMaxM:0.3}},
    locator:{key:'s2754-hep2o15-visible-'+type.key,payload:{sourcePack:pack,acceptedPhysicalProfilesReused:true,fullTechnicalAcceptance:false}},
    search:{primaryUom:'linear_m',canonicalNameRu:type.titleRu,aliases:[`Hep2O 15 мм ${type.key==='horizontal'?'горизонтальный':'вертикальный'} видимый участок`,type.titleRu],
      shortScopeRu:pack.scopeRu+' Точный крепёж и часы требуют источника.',keyDistinguishingParameters:['pipe_route_length_m','support_span_m','project_reference','reusable_installed_sleeves'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:'водоснабжение холодная вода Hep2O Wavin 15 мм HXX25/15W HX85/15W HX60/15W SmartSleeve HD1/15W HD74 GR труба клипса втулка муфта',
      sourceProvenance:{sourcePack:'hep2o15-visible-line-s27-54.json',primaryMeasureParameterId:'pipe_route_length_m',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{namespace:'global',domain:'plumbing',sourceIdentity:'wavin-hep2o15:cold-visible:'+type.key+':single-line-two-connectors',workKey:type.workKey,titleRu:type.titleRu,denominatorEligible:true},
      searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:index===0?'create':'join',groupId:gid,groupNameRu:gname,domainId:'plumbing',systemId:'plumbing',subsystemId:gid,assemblyId:gid,workFamilyId:gid,
        breadcrumb:[gname],membershipOrdinal:index,groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},
        independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerScopeOnly:true},
        constructionState:'VISIBLE_COLD_WATER_READY_ISOLATED_HEP2O_ENDS',technologyVariant:'HEP2O15_'+type.key.toUpperCase()+'_TWO_CONNECTORS',normativeClassifiers:['HEP040'],
        applicabilityTags:['HEP2O15','COLD_WATER','VISIBLE_300MM_MAX','FOUR_PIPE_ENDS','MANUFACTURER_PARTIAL']}},
    forbiddenAdjacentMatchers:[/hep2o22|heating_hvac|gas|concealed/iu],owner:'S2754_HEP2O15_SINGLE_WRITER',receiptFileStem:'hep2o15_'+type.key,verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:hep2o15VisibleLineCompletenessMapS2754(index),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
      const input=hep2o15ExplicitControlS2754(),r=await compileHep2o15VisibleLineS2754(index,input);
      assert.equal(r.rows.length,18); assert.equal(r.preliminaryNeeds.length,8); assert.equal(r.rows.filter(row=>row.included_in_procurement).length,4);
      for(const [id,qty] of [['support-count','27'],['actual-support-gap','0.3'],['sleeves-total','4'],['sleeves-installed','2'],['sleeve-order','2'],
        ['clip-order','27'],['connector-order','2'],['pipe-consumed','8.064'],['pipe-order','25'],['pipe-ordered-coils','1'],['pipe-remaining','16.936']])
        assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,qty,id);
      const noReuse=await compileHep2o15VisibleLineS2754(index,{...input,reusable_installed_sleeves:0});assert.equal(noReuse.rows.find(row=>row.row_id===prefix+':sleeve-order')?.quantity,'4');
      const fullCoilCut=await compileHep2o15VisibleLineS2754(index,{...input,pipe_route_length_m:24.936});assert.equal(fullCoilCut.rows.find(row=>row.row_id===prefix+':pipe-consumed')?.quantity,'25');
      const stock=await compileHep2o15VisibleLineS2754(index,{...input,clip_stock_pcs:10,clip_reserve_pcs:1,clip_quantum_pcs:5,sleeve_stock_pcs:1});
      assert.equal(stock.rows.find(row=>row.row_id===prefix+':clip-order')?.quantity,'20');assert.equal(stock.rows.find(row=>row.row_id===prefix+':sleeve-order')?.quantity,'1');
      for(const fact of ['supports_confirmed','joints_confirmed','project_reference'])assert.equal((await compileHep2o15VisibleLineS2754(index,{...input,[fact]:undefined})).rows.length,0);
      for(const changes of [{selected_support_max_gap_m:0.5},{support_span_m:8.1},{pipe_route_length_m:25},{reusable_installed_sleeves:3},{open_qty_labor:1}])
        await assert.rejects(()=>compileHep2o15VisibleLineS2754(index,{...input,...changes}));
      const physical=resolveWavinHep2OPushFitLayoutV1({parameterValues:physicalValues(type.key),selectedProjectSpacing:{maximumM:0.3,reference:'CONTROL_ONLY_VISIBLE_UNIFORM_LAYOUT'}});
      assert.equal(physical.status,'APPLIED');assert.equal(physical.parameter_values.support_count.value,27);assert.equal(physical.parameter_values.smart_sleeve_quantity_piece.value,4);
      const boundary=resolveWavinHep2OPushFitLayoutV1({parameterValues:physicalValues('horizontal',15,2.1)});
      assert.equal(boundary.parameter_values.support_count.value,8,'Exact 2.1/0.3 must not add a ninth support');
      const old=resolveProfessionalPhysicalNormParameterValuesV1({technology_class:'HEATING_PIPE_NETWORK',operation_class:'INSTALL',material_system:'HEATING_PIPE:SPACE_HEATING:HEATING_WATER',scope_mode:'FULL_APPLICABLE_SCOPE',parameter_values:physicalValues('horizontal',22,7.8)});
      assert.equal(old.status,'APPLIED');assert.equal(old.parameter_values.support_count.value,17);assert(!old.parameter_values.support_count.applicability.includes('selected_project'));
      const bad=resolveWavinHep2OPushFitLayoutV1({parameterValues:physicalValues('horizontal'),selectedProjectSpacing:{maximumM:0.4,reference:'CONTROL_ONLY'}});assert.equal(bad.status,'BLOCKED_NOT_APPLICABLE');
      assert(definition.parameters.filter(p=>/stock|reserve|quantum|supplier|reusable/.test(p.parameter_id)).every(p=>p.default_value==null));
      return {status:'GREEN_LIMITED_HEP2O15_VISIBLE',orientation:type.key,shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],knownRows:18,needs:8,procurementRows:4,
        pipeCutM:8.064,pipeOrderM:25,coils25M:1,usablePipeRemainderM:16.936,clips:27,preparedPipeEnds:4,reusedInstalledSleeves:2,newSleeves:2,connectors:2,
        decimalSupportBoundaryFixed:true,previous22MmDispatchPreserved:true,sharedFactoryForBothOrientations:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
    }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Hep2o15VisibleLine.ts')){
  const key=process.argv.find(arg=>arg.startsWith('--type='))?.slice(7)??'horizontal',index=pack.types.findIndex(t=>t.key===key);
  if(index<0)throw Error('EXACT_HEP2O15_TYPE_REQUIRED');
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(hep2o15VisibleLineConfigS2754(index,{releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId})).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
