import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {hep2o15VisibleLineConfigS2754} from './prepareS2754Hep2o15VisibleLine';
import {hep2o22VisibleHorizontalPackS2754 as pack,hep2o22VisibleHorizontalPrefixS2754 as prefix,
  hep2o22VisibleHorizontalDefinitionS2754,hep2o22VisibleHorizontalCompletenessMapS2754,compileHep2o22VisibleHorizontalS2754} from '../../../src/lib/estimate/v4/hep2o22VisibleHorizontalS2754';

export function hep2o22ControlInputS2754() {
  return {pipe_route_length_m:8,system_confirmed:pack.systemValue,supports_confirmed:pack.supportValue,joints_confirmed:pack.jointValue,cut_plan_confirmed:pack.cutValue,
    project_reference:'CONTROL_ONLY: горизонтальная линия8м, опорный пролёт7,8м, две концевые опоры и равномерная раскладка; не проект объекта',
    test_program_reference:'CONTROL_ONLY_NOT_PROJECT_APPROVAL',support_span_m:7.8,selected_support_max_gap_m:0.3,reusable_installed_sleeves:2};
}
export function hep2o22ExplicitControlS2754() {
  return {...hep2o22ControlInputS2754(),pipe_stock_coils:0,pipe_reserve_coils:0,pipe_supplier_coil_multiple:1,
    ...Object.fromEntries(['clip','sleeve','connector'].flatMap(key=>[[`${key}_stock_pcs`,0],[`${key}_reserve_pcs`,0],[`${key}_quantum_pcs`,1]]))};
}
export function hep2o22VisibleHorizontalConfigS2754(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const base=hep2o15VisibleLineConfigS2754(0,parent),type=pack.types[0],definition=hep2o22VisibleHorizontalDefinitionS2754();
  const included=[pack.scopeRu,'Четыре конкретных изделия: HXX25/22W, HX85/22W, HX60/22W и HD1/22W',
    'Проектный шаг видимых опор не более0,3м; фитинги не заменяют опоры; четыре обслуживаемых конца и пригодные установленные втулки учтены отдельно',
    'Одна заготовка, номинальная вставка33мм на каждом новом конце; наличие, резерв и шаг поставщика заданы явно; восемь норм открыты'];
  return {...base,contract:pack.contract,stopCode:'S2754_HEP2O22_HORIZONTAL',applicationName:'s2754-hep2o22-horizontal',
    outputRoot:resolve('.release-runtime/r568/s27-54/hep2o22-visible-horizontal/publication'),catalogId:type.catalogId,sourceId:pack.sourceId,normId:type.normId,
    sourcePaths:[...base.sourcePaths,'scripts/estimate/r4a13/prepareS2754Hep2o22VisibleHorizontal.ts','src/lib/estimate/v4/hep2o22VisibleHorizontalS2754.ts',
      'data/estimate-benchmarks/source-packs/hep2o22-visible-horizontal-s27-54.json'],
    sourceMetadata:{...base.sourceMetadata,exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu+' Часы и крепёж открыты; вертикальный22ммпрофиль не опубликован.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    acceptanceInput:hep2o22ControlInputS2754(),validationScenario:'S2754_HEP2O22_VISIBLE_HORIZONTAL_FOUR_PIPE_ENDS',
    passport:{...base.passport,canonicalRuName:type.titleRu,workKey:type.workKey,includedScopeRu:included,excludedScopeRu:pack.excludedRu,
      unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(g=>prefix+':'+g.id),independentCompletenessMap:hep2o22VisibleHorizontalCompletenessMapS2754()},
    applicability:{...base.applicability,product:'Wavin Hep2O 22 mm',orientation:'horizontal',routeBetweenConnectorEntryFacesMaximumM:24.934,newPipeNominalInsertionEachMm:33},
    binding:{rowId:prefix+':support-count',applicability:{verifiedSingleSpanUniformLayout:true,selectedVisibleGapMaxM:0.3}},
    locator:{key:'s2754-hep2o22-visible-horizontal',payload:{sourcePack:pack,acceptedPhysicalProfilesReused:true,fullTechnicalAcceptance:false}},
    search:{...base.search,canonicalNameRu:type.titleRu,aliases:['Hep2O22мм горизонтальный видимый участок',type.titleRu],shortScopeRu:pack.scopeRu+' Часы и крепёж требуют источника.',
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:'водоснабжение холодная вода Hep2O Wavin22мм HXX25/22W HX85/22W HX60/22W SmartSleeve HD1/22W HD74 GR труба клипса втулка муфта',
      sourceProvenance:{sourcePack:'hep2o22-visible-horizontal-s27-54.json',primaryMeasureParameterId:'pipe_route_length_m',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{...base.catalogAppend!.identity,sourceIdentity:'wavin-hep2o22:cold-visible:horizontal:single-line-two-connectors',workKey:type.workKey,titleRu:type.titleRu},
      searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:'join',membershipOrdinal:2,technologyVariant:'HEP2O22_HORIZONTAL_TWO_CONNECTORS',
        groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},
        independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerScopeOnly:true},
        applicabilityTags:['HEP2O22','COLD_WATER','VISIBLE_300MM_MAX','FOUR_PIPE_ENDS','MANUFACTURER_PARTIAL']}},
    forbiddenAdjacentMatchers:[/hep2o15|heating_hvac|gas|concealed/iu],owner:'S2754_HEP2O22_SINGLE_WRITER',receiptFileStem:'hep2o22_horizontal',verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:hep2o22VisibleHorizontalCompletenessMapS2754(),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
      const input=hep2o22ExplicitControlS2754(),r=await compileHep2o22VisibleHorizontalS2754(input);
      assert.equal(r.rows.length,18);assert.equal(r.preliminaryNeeds.length,8);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,4);
      for(const [id,qty] of [['support-count','27'],['sleeves-total','4'],['sleeve-order','2'],['clip-order','27'],['connector-order','2'],['pipe-consumed','8.066'],['pipe-order','25'],['pipe-remaining','16.934']])
        assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,qty,id);
      const full=await compileHep2o22VisibleHorizontalS2754({...input,pipe_route_length_m:24.934});assert.equal(full.rows.find(row=>row.row_id===prefix+':pipe-consumed')?.quantity,'25');
      const stocked=await compileHep2o22VisibleHorizontalS2754({...input,pipe_stock_coils:1,clip_stock_pcs:10,clip_reserve_pcs:1,clip_quantum_pcs:5});
      assert.equal(stocked.rows.find(row=>row.row_id===prefix+':pipe-order')?.quantity,'0');assert.equal(stocked.rows.find(row=>row.row_id===prefix+':clip-order')?.quantity,'20');
      const noReuse=await compileHep2o22VisibleHorizontalS2754({...input,reusable_installed_sleeves:0});assert.equal(noReuse.rows.find(row=>row.row_id===prefix+':sleeve-order')?.quantity,'4');
      for(const changes of [{pipe_route_length_m:24.935},{selected_support_max_gap_m:0.5},{support_span_m:8.1},{reusable_installed_sleeves:3},{open_qty_labor:1}])
        await assert.rejects(()=>compileHep2o22VisibleHorizontalS2754({...input,...changes}));
      for(const fact of ['supports_confirmed','joints_confirmed','project_reference'])assert.equal((await compileHep2o22VisibleHorizontalS2754({...input,[fact]:undefined})).rows.length,0);
      assert(definition.parameters.filter(p=>/stock|reserve|quantum|supplier|reusable/.test(p.parameter_id)).every(p=>p.default_value==null));
      return {status:'GREEN_LIMITED_HEP2O22_HORIZONTAL',shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],knownRows:18,needs:8,procurementRows:4,
        pipeCutM:8.066,pipeOrderM:25,usableRemainderM:16.934,clips:27,newSleeves:2,connectors:2,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,sharedFactoryReused:true};
    }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Hep2o22VisibleHorizontal.ts')){
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(hep2o22VisibleHorizontalConfigS2754({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId})).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
