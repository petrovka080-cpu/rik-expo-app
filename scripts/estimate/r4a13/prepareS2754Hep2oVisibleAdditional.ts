import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {hep2o22VisibleHorizontalConfigS2754} from './prepareS2754Hep2o22VisibleHorizontal';
import {hep2oVisibleAdditionalSourceS2754 as source,hep2oVisibleAdditionalVariantS2754,hep2oVisibleAdditionalPrefixS2754,
  hep2oVisibleAdditionalDefinitionS2754,hep2oVisibleAdditionalCompletenessMapS2754,compileHep2oVisibleAdditionalS2754} from '../../../src/lib/estimate/v4/hep2oVisibleAdditionalS2754';

export function hep2oVisibleAdditionalControlS2754(index:number) {
  const {pack,orientation}=hep2oVisibleAdditionalVariantS2754(index);
  return {pipe_route_length_m:8,system_confirmed:pack.systemValue,supports_confirmed:pack.supportValue,joints_confirmed:pack.jointValue,cut_plan_confirmed:pack.cutValue,
    project_reference:`CONTROL_ONLY: ${orientation} линия8м, опорный пролёт7,8м, две концевые опоры и равномерная раскладка; не проект объекта`,
    test_program_reference:'CONTROL_ONLY_NOT_PROJECT_APPROVAL',support_span_m:7.8,selected_support_max_gap_m:0.3,reusable_installed_sleeves:2,
    pipe_stock_coils:0,pipe_reserve_coils:0,pipe_supplier_coil_multiple:1,
    ...Object.fromEntries(['clip','sleeve','connector'].flatMap(k=>[[`${k}_stock_pcs`,0],[`${k}_reserve_pcs`,0],[`${k}_quantum_pcs`,1]]))};
}
export function hep2oVisibleAdditionalConfigS2754(index:number,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const v=hep2oVisibleAdditionalVariantS2754(index),{pack}=v,type=pack.types[0],prefix=hep2oVisibleAdditionalPrefixS2754(index),definition=hep2oVisibleAdditionalDefinitionS2754(index);
  const base=hep2o22VisibleHorizontalConfigS2754(parent),included=[pack.scopeRu,
    'Четыре конкретных изделия: '+Object.values(pack.products).map(p=>p.sku).join(', '),
    `Шаг видимой раскладки явно принят не более0,3м. Справочный общий шаг таблицы3: ${v.generalSupportSpacingM}м; он не подставляется в расчёт видимого участка.`,
    'Два концевых опорных узла; четыре обслуживаемых трубных конца; пригодные установленные втулки не закупаются повторно',
    `Номинальные заходы новых концов по${v.nominalInsertionMm}мм учтены один раз. Наличие, резерв и кратность поставщика задаются явно. Часы, точный крепёж и испытания открыты.`];
  return {...base,contract:pack.contract,stopCode:'S2754_HEP2O_VISIBLE_'+v.key.toUpperCase(),applicationName:'s2754-hep2o-visible-'+v.key,
    outputRoot:resolve('.release-runtime/r568/s27-54/hep2o-visible-series/publication/'+v.key),catalogId:type.catalogId,sourceId:pack.sourceId,normId:type.normId,
    sourcePaths:[...base.sourcePaths,'scripts/estimate/r4a13/prepareS2754Hep2oVisibleAdditional.ts','src/lib/estimate/v4/hep2oVisibleAdditionalS2754.ts',
      'data/estimate-benchmarks/source-packs/hep2o-visible-additional-s27-54.json'],
    sourceMetadata:{...base.sourceMetadata,source_title:'Wavin HEP040: точные изделия и видимая проектная раскладка',source_authority:'Wavin; прямое чтение производителя; общий SmartSleeve и ресурсный compiler переиспользованы',
      exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu+' Часы и точный крепёж открыты. Общий шаг таблицы3 не считается шагом видимой раскладки.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    acceptanceInput:hep2oVisibleAdditionalControlS2754(index),validationScenario:'S2754_HEP2O_VISIBLE_'+v.key.toUpperCase()+'_FOUR_PIPE_ENDS',
    passport:{...base.passport,canonicalRuName:type.titleRu,workKey:type.workKey,includedScopeRu:included,excludedScopeRu:pack.excludedRu,
      unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(g=>prefix+':'+g.id),independentCompletenessMap:hep2oVisibleAdditionalCompletenessMapS2754(index)},
    applicability:{...base.applicability,product:`Wavin Hep2O ${v.diameterMm} mm`,orientation:v.orientation,
      routeBetweenConnectorEntryFacesMaximumM:v.routeMaximumM,newPipeNominalInsertionEachMm:v.nominalInsertionMm,sourceGeneralSupportSpacingM:v.generalSupportSpacingM,
      visibleSelectedSupportMaximumM:0.3,exactSourceNorm:type.normId},
    binding:{rowId:prefix+':support-count',applicability:{verifiedSingleSpanUniformLayout:true,selectedVisibleGapMaxM:0.3}},
    locator:{key:'s2754-hep2o-visible-'+v.key,payload:{sourcePack:pack,directManufacturerVisibleLayout:true,sharedSmartSleeveAndPurchaseBalanceReused:true,fullTechnicalAcceptance:false}},
    search:{...base.search,canonicalNameRu:type.titleRu,aliases:[`Hep2O ${v.diameterMm} мм ${v.orientation==='vertical'?'вертикальный':'горизонтальный'} видимый участок`,type.titleRu],
      shortScopeRu:pack.scopeRu+' Часы и крепёж требуют источника.',clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
      includedBoundaries:included,excludedBoundaries:pack.excludedRu,extraSearchTermsRu:`водоснабжение холодная вода Hep2O Wavin ${v.diameterMm} мм `+Object.values(pack.products).map(p=>p.sku).join(' ')+' HD78 GR труба клипса втулка муфта',
      sourceProvenance:{sourcePack:'hep2o-visible-additional-s27-54.json',primaryMeasureParameterId:'pipe_route_length_m',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{...base.catalogAppend!.identity,sourceIdentity:`wavin-hep2o${v.diameterMm}:cold-visible:${v.orientation}:single-line-two-connectors`,workKey:type.workKey,titleRu:type.titleRu},
      searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:'join',membershipOrdinal:3+index,technologyVariant:`HEP2O${v.diameterMm}_${v.orientation.toUpperCase()}_TWO_CONNECTORS`,
        groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerScopeOnly:true},
        applicabilityTags:[`HEP2O${v.diameterMm}`,'COLD_WATER','VISIBLE_300MM_MAX','FOUR_PIPE_ENDS','MANUFACTURER_PARTIAL']}},
    forbiddenAdjacentMatchers:[/heating_hvac|gas|concealed/iu],owner:'S2754_HEP2O_VISIBLE_ADDITIONAL_SINGLE_WRITER',receiptFileStem:'hep2o_'+v.key,verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
      assert.equal(source.sourceNorms.find(n=>n.normId===type.normId)?.visibleSelectedMaximumM,0.3);
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:hep2oVisibleAdditionalCompletenessMapS2754(index),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
      const input=hep2oVisibleAdditionalControlS2754(index),r=await compileHep2oVisibleAdditionalS2754(index,input);
      assert.equal(r.rows.length,18);assert.equal(r.preliminaryNeeds.length,8);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,4);
      const expectedCut=String((8000+2*v.nominalInsertionMm)/1000),remaining=String((25000-8000-2*v.nominalInsertionMm)/1000);
      for(const [id,qty] of [['support-count','27'],['sleeves-total','4'],['sleeve-order','2'],['clip-order','27'],['connector-order','2'],['pipe-consumed',expectedCut],['pipe-order','25'],['pipe-remaining',remaining]])
        assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,qty,id);
      const full=await compileHep2oVisibleAdditionalS2754(index,{...input,pipe_route_length_m:v.routeMaximumM});assert.equal(full.rows.find(row=>row.row_id===prefix+':pipe-consumed')?.quantity,'25');
      const stock=await compileHep2oVisibleAdditionalS2754(index,{...input,pipe_stock_coils:1,clip_stock_pcs:10,clip_reserve_pcs:1,clip_quantum_pcs:5});
      assert.equal(stock.rows.find(row=>row.row_id===prefix+':pipe-order')?.quantity,'0');assert.equal(stock.rows.find(row=>row.row_id===prefix+':clip-order')?.quantity,'20');
      const noReuse=await compileHep2oVisibleAdditionalS2754(index,{...input,reusable_installed_sleeves:0});assert.equal(noReuse.rows.find(row=>row.row_id===prefix+':sleeve-order')?.quantity,'4');
      for(const changes of [{pipe_route_length_m:v.routeMaximumM+0.001},{selected_support_max_gap_m:0.5},{support_span_m:8.1},{reusable_installed_sleeves:3},{open_qty_labor:1}])
        await assert.rejects(()=>compileHep2oVisibleAdditionalS2754(index,{...input,...changes}));
      for(const fact of ['system_confirmed','supports_confirmed','joints_confirmed','project_reference'])assert.equal((await compileHep2oVisibleAdditionalS2754(index,{...input,[fact]:undefined})).rows.length,0);
      const other=source.variants.find(o=>o.key!==v.key)!;await assert.rejects(()=>compileHep2oVisibleAdditionalS2754(index,{...input,system_confirmed:other.pack.systemValue}),/invalid enum system_confirmed/);
      assert(definition.parameters.filter(p=>/stock|reserve|quantum|supplier|reusable/.test(p.parameter_id)).every(p=>p.default_value==null));
      return {status:'GREEN_LIMITED_HEP2O_VISIBLE_'+v.key.toUpperCase(),shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],knownRows:18,needs:8,procurementRows:4,
        diameterMm:v.diameterMm,orientation:v.orientation,pipeCutM:Number(expectedCut),pipeOrderM:25,usableRemainderM:Number(remaining),clips:27,newSleeves:2,connectors:2,
        confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,sharedFactoryReused:true};
    }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Hep2oVisibleAdditional.ts')){
  const key=process.argv.find(arg=>arg.startsWith('--type='))?.slice(7),index=source.variants.findIndex(v=>v.key===key);
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(hep2oVisibleAdditionalConfigS2754(index,{releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId})).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
