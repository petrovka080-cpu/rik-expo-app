import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,
  validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {floorDemolitionSeriesS2754Config} from './prepareS2754FloorDemolitionSeries';
import {concreteKerbSourcePackS2754 as pack,concreteKerbDefinitionS2754,compileConcreteKerbS2754,
  concreteKerbCompletenessMapS2754,ownKerbMachinesS2754,hiredKerbMachinesS2754} from '../../../src/lib/estimate/v4/concreteKerbInstallationS2754';

export function concreteKerbControlInputS2754(index:number) {
  return {kerb_length_m:35.5,covering_kind:pack.types[index].coveringValue,
    prepared_installation_line:pack.preparedLineValue,mechanism_fulfillment:ownKerbMachinesS2754};
}

export function concreteKerbConfigS2754(index:number,parent:{releaseId:string;searchReleaseId:string},successor=false):MasterSingleDefinitionSuccessorConfig {
  const type=pack.types[index];
  if(!type)throw new Error('S2754_CONCRETE_KERB_EXACT_TWO_COLUMNS_ONLY');
  const base=floorDemolitionSeriesS2754Config(0,parent),definition=concreteKerbDefinitionS2754(index),prefix='concrete-kerb:'+type.key;
  const included=[pack.scopeRu,pack.includedTransportRu,
    'Тяжёлый бетон В15 (М200), готовый раствор М100, необрезные хвойные брусья IV сорта и строительные гвозди по исходной колонке',
    'Нормативный расход бетонных камней; точное исполнение для заказа требует спецификации объекта',
    'Собственные механизмы либо аренда с машинистами; каждый ресурс и ставка учитываются один раз'];
  return {...base,contract:pack.contract,stopCode:'S2754_KERB_'+index,applicationName:'s2754-concrete-kerb-'+type.key,
    outputRoot:resolve('.release-runtime/r568/s27-54/concrete-kerb-series/'+(successor?'specification-guard/publication/':'publication/')+type.key),
    expectedParentShape:successor?[34,27,27]:[0,0,0],
    catalogId:type.catalogId,sourceId:pack.sourceId,normId:type.column,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754ConcreteKerbSeries.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
      'src/lib/estimate/v4/concreteKerbInstallationS2754.ts','data/estimate-benchmarks/source-packs/concrete-kerb-installation-s27-54.json',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',pack.source.localArtifact],
    sourceMetadata:{source_title:'КРЕР27-2015, бетонные бортовые камни '+type.column,source_authority:'Министерство строительства Кыргызской Республики',
      source_kind:'OFFICIAL_ORIGINAL_NORMATIVE_CORE_COMPLETION_UNRESOLVED',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,
      exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu+' '+type.coveringValue+'. Шесть дополнительных потребностей не закрыты.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{kerb_length_m:35.5},acceptanceInput:concreteKerbControlInputS2754(index),
    validationScenario:'S2754_EXACT_CONCRETE_KERB_NORMATIVE_CORE_SIX_OPEN_COMPLETION_NEEDS',
    passport:{canonicalRuName:type.titleRu,workKey:type.workKey,physicalResultRu:'Подтверждён нормативный состав установки бетонного борта по выбранной колонке; дополнительные операции завершения ещё требуют подтверждения.',
      includedScopeRu:included,excludedScopeRu:pack.excludedRu,
      unresolvedApplicableResourceRowIds:pack.additionalScopeNeeds.map(gap=>prefix+':'+gap.id),
      independentCompletenessMap:concreteKerbCompletenessMapS2754(index)},
    applicability:{country:'KG',exactRateColumn:type.column,coveringKind:type.coveringValue,preparedEarthworksRequired:true,
      stoneProductSpecificationRequiredForOrder:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':labor',applicability:{exactRateColumn:type.column,coveringKind:type.coveringValue,fullTechnicalAcceptance:false}},
    locator:{key:'s2754-concrete-kerb-'+type.key,payload:{sourcePack:pack,type,fullTechnicalAcceptance:false,
      sourceRatesNotProjectDefaults:true,graniteCleaningNotInherited:true,concreteFoundationNotDuplicated:true}},
    search:{primaryUom:'m',canonicalNameRu:type.titleRu,aliases:['Бетонный бордюр '+type.coveringValue,'Монтаж бетонного борта '+type.coveringValue],
      shortScopeRu:pack.scopeRu+' '+type.coveringValue+'. Подтверждён нормативный расход пяти материалов. Завершение и точная закупочная спецификация требуют подтверждения.',
      keyDistinguishingParameters:['covering_kind','prepared_installation_line','kerb_stone_specification'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
      includedBoundaries:included,excludedBoundaries:pack.excludedRu,extraSearchTermsRu:'бордюр борт камень бетон основание опалубка швы раствор М100 бетон В15',
      sourceProvenance:{sourcePack:'concrete-kerb-installation-s27-54.json',primaryMeasureParameterId:'kerb_length_m',exactRateColumn:type.column,fullTechnicalAcceptance:false}},
    catalogAppend:successor?undefined:{identity:{namespace:'global',domain:'transport',sourceIdentity:'krer27-2015:concrete-kerb:'+type.column,
      workKey:type.workKey,titleRu:type.titleRu,denominatorEligible:true},searchPlacement:{...base.catalogAppend!.searchPlacement,
      groupMode:'join',groupId:'wg:expanded:curbs',groupNameRu:'Дороги, транспорт и площадки: установка бортового камня',
      domainId:'transport',systemId:'transport',subsystemId:'wg:expanded:curbs',assemblyId:'wg:expanded:curbs',workFamilyId:'wg:expanded:curbs',
      breadcrumb:['Дороги, транспорт и площадки: установка бортового камня'],membershipOrdinal:1+index,
      groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},
      independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,preliminaryNormativeCoreOnly:true},
      operationKind:'NEW_INSTALLATION',constructionState:'NEW',technologyVariant:type.column+'; '+type.coveringValue,
      normativeClassifiers:[type.column],applicabilityTags:['CONCRETE_KERB','PREPARED_EARTHWORKS',type.key.toUpperCase()]}},
    forbiddenAdjacentMatchers:[/27-02-010-0[34]|27-02-011|27-02-015|granite|гранитн/iu],
    owner:'S2754_LANDSCAPE_SINGLE_WRITER',receiptFileStem:'concrete_kerb_'+index,
    verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:concreteKerbCompletenessMapS2754(index),
        formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
      const input=concreteKerbControlInputS2754(index),r=await compileConcreteKerbS2754(index,input);
      for(const [id,qty] of [['labor','27.0084'],['crane-own','0.2414'],['truck-own','0.0142'],
        ['nails-consumed','0.355'],['timber-consumed','0.06035'],['mortar-consumed','0.0213'],['stone-consumed','35.5'],
        ['concrete-consumed',index===0?'1.3845':'2.0945']]) assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,qty,id);
      assert.equal(r.rows.length,13);assert.equal(r.preliminaryNeeds.length,11);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,0);
      const hired=await compileConcreteKerbS2754(index,{...input,mechanism_fulfillment:hiredKerbMachinesS2754});
      assert.equal(hired.rows.filter(row=>row.category==='equipment').length,2);
      assert.equal(hired.rows.filter(row=>row.included_in_procurement).length,2);
      assert(hired.rows.find(row=>row.row_id===prefix+':operator-hired')?.included_in_estimate===false);
      const order=await compileConcreteKerbS2754(index,{...input,mortar_stock:0,mortar_reserve:0,mortar_quantum:0.001});
      assert.equal(order.rows.find(row=>row.row_id===prefix+':mortar')?.quantity,'0.022');
      assert.equal(order.rows.filter(row=>row.included_in_procurement).length,1);
      const unspecifiedStone=await compileConcreteKerbS2754(index,{...input,stone_stock:0,stone_reserve:0,stone_quantum:1});
      assert(!unspecifiedStone.rows.some(row=>row.row_id===prefix+':stone'));
      assert(unspecifiedStone.preliminaryNeeds.find(row=>row.row_id===prefix+':stone')?.missing_parameter_ids.includes('kerb_stone_specification'));
      const specifiedStone=await compileConcreteKerbS2754(index,{...input,stone_stock:0,stone_reserve:0,stone_quantum:1,
        kerb_stone_specification:'КОНТРОЛЬНЫЙ ВВОД СПЕЦИФИКАЦИИ; не изделие и не проект объекта'});
      assert.equal(specifiedStone.rows.find(row=>row.row_id===prefix+':stone')?.quantity,'36');
      const unconfirmedLine=await compileConcreteKerbS2754(index,{...input,prepared_installation_line:undefined});
      assert.equal(unconfirmedLine.rows.length,0);
      await assert.rejects(()=>compileConcreteKerbS2754(index,{...input,covering_kind:pack.types[1-index].coveringValue}));
      return {status:'GREEN_LIMITED_EXACT_CONCRETE_KERB_COLUMN',column:type.column,knownRows:13,needs:11,
        materialConsumptions:5,mutuallyExclusiveMachines:true,operatorsNotDuplicated:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
    },
  };
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754ConcreteKerbSeries.ts')) {
  const index=Number(process.argv.find(a=>a.startsWith('--index='))?.split('=')[1]);
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(concreteKerbConfigS2754(index,{releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId},process.argv.includes('--successor')))
    .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
