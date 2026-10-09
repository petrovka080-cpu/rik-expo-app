import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {roofWindowOperationResourcesS2750Config} from './prepareS2750RoofWindowOperationResources';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileCandidate,parameterDefinitions,formulaDefinitions,resourceDefinitions,sourcePack} from '../../../src/lib/estimate/v4/roofWindowMaterialResourcesS2752';
import {compileCandidate as compileParent} from '../../../src/lib/estimate/v4/roofWindowOperationResourcesS2750';

export function roofWindowMaterialResourcesS2752Config(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const previous=roofWindowOperationResourcesS2750Config(parent);
  const acceptanceInput={lantern_count:14,lantern_model:sourcePack.model,base_stock_units:0,base_reserve_units:0,
    dome_stock_units:0,dome_reserve_units:0};
  return {...previous,contract:sourcePack.contract,stopCode:'S2752_ROOF_MATERIAL_RESOURCES',applicationName:'s2752-roof-material-resources',
    masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (93).md',
    masterSha256:'3238f07235f59b3efca468f44c6d34c92a2d804e973f2228b8193ccf4503a2fc',
    outputRoot:resolve('.release-runtime/r568/s27-51/roof-material-alternatives/publication'),
    sourceId:sourcePack.sourceId,parameterDefinitions,formulaDefinitions,resourceDefinitions,acceptanceInput,
    sourcePaths:[...previous.sourcePaths,'src/lib/estimate/v4/roofWindowMaterialResourcesS2752.ts',
      'data/estimate-benchmarks/source-packs/roof-window-material-resources-s27-52.json',
      'scripts/estimate/r4a13/prepareS2752RoofWindowMaterialResources.ts',
      'src/features/consumerRepair/requestEstimateViewModel.ts','tests/requestEstimate/requestEstimateViewModel.contract.test.ts'],
    sourceMetadata:{...previous.sourceMetadata,source_title:'Состав изделий и конкретные материалы кровельных примыканий по первичным паспортам',
      source_authority:'VELUX; Sika; Elevate; IKO; Fischer; SFS — независимые паспорта изделий, совместный узел не подтверждён',
      source_kind:'COMPOSITE_PRIMARY_PRODUCT_CANDIDATES_NOT_WINDOW_DETAIL_APPROVAL',
      official_url:null,
      artifact_sha256:createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/roof-window-material-resources-s27-52.json')).digest('hex'),
      exact_locator:Object.entries(sourcePack.sources).map(([id,source])=>`${id}: ${source.url}; ${source.locator}`).join(' | '),
      use_restriction:'29 материальных альтернатив с обозначением изделий, единицами и применением. Совместимость узла и расходы не подтверждены; 36 потребностей остаются открытыми. Неактивные системы не начисляются. Подтверждённых новых монтажных материалов: 0.'},
    passport:{...previous.passport,physicalResultRu:'Основание и купол плюс конкретные материальные потребности под работами; расходы и совместимость монтажного узла остаются открытыми.',
      includedScopeRu:[...previous.passport.includedScopeRu,'29 отдельных материальных альтернатив: крепёж, мембраны, клеи, очистители, праймеры, герметизирующие составы, пароизоляция и утепление по применению'],
      unresolvedApplicableResourceRowIds:resourceDefinitions.filter(row=>row.source_metadata.sourceRole==='UNRESOLVED_INSTALLATION_SOURCE').map(row=>row.row_id)},
    applicability:{...previous.applicability,materialAlternatives:sourcePack.alternativesPolicy,
      coveringSupportMatrix:sourcePack.applicabilityMatrix,materialNodeCompatibilityApproved:false},
    locator:{key:'roof-window-material-resources-s2752',payload:{...previous.locator.payload,
      materialResourcePack:sourcePack,historicalRevisionsNotRewritten:true,knownProductQuantitiesUnchanged:true}},
    search:{...previous.search,shortScopeRu:'Основание, купол и конкретные материалы по покрытию и основанию. У каждого материала указано применение. Совместимость узла и расход ещё требуют подтверждения.',
      keyDistinguishingParameters:['lantern_model','roof_covering','roof_support','bitumen_method'],
      clarificationFields:[...previous.search.clarificationFields,'roof_covering','roof_support','bitumen_method'],
      sourceProvenance:{...previous.search.sourceProvenance,materialResourcePack:'roof-window-material-resources-s27-52.json',fullTechnicalAcceptance:false}},
    owner:'S2752_ROOF_MATERIAL_SINGLE_WRITER',receiptFileStem:'roof_material_resources',
    validationScenario:'S2752_REAL_MATERIAL_RESOURCES_NO_GUESSED_NODE_OR_CONSUMPTION',
    verifyCore:async()=>{
      const current=await compileCandidate(acceptanceInput),old=await compileParent(acceptanceInput);
      assert.equal(current.rows.length,8);assert.equal(current.preliminaryNeeds.length,36);
      assert.deepEqual(current.rows.map(row=>[row.row_id,row.quantity,row.included_in_estimate,row.included_in_procurement]),
        old.rows.map(row=>[row.row_id,row.quantity,row.included_in_estimate,row.included_in_procurement]));
      assert.equal(sourcePack.materials.length,29);assert.equal(resourceDefinitions.length,44);
      for(const roof of ['PVC','FPO','EPDM','BITUMEN']){
        const result=await compileCandidate({...acceptanceInput,roof_covering:roof,roof_support:'TIMBER',
          ...(roof==='BITUMEN'?{bitumen_method:'SELF_ADHESIVE'}:{})});
        for(const material of sourcePack.materials.filter(material=>material.roof&&material.roof!==roof))
          assert(!result.preliminaryNeeds.some(row=>row.row_id===material.rowId));
        assert.equal(result.rows.filter(row=>row.included_in_procurement).length,2);
      }
      return {status:'GREEN_S2752_MATERIAL_RESOURCE_CANDIDATE',knownRows:8,unresolvedNeeds:36,realMaterialRows:29,confirmedNewMaterialResources:0,
        incompatibleAlternativesNotOrdered:true,knownQuantitiesUnchanged:true,fullTechnicalAcceptance:false,acceptedNewTypes:0};
    },
  };
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2752RoofWindowMaterialResources.ts')){
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(roofWindowMaterialResourcesS2752Config({releaseId:current.definitionReleaseId,
    searchReleaseId:current.searchReleaseId})).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
