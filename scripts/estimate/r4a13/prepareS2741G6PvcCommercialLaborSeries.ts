import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {pvcRoofRussianPresentationS2737PublishConfig} from './prepareS2737PvcRoofRussianPresentationSuccessor';
import {pvcRoofVolumeCleanerS2737PublishConfig} from './prepareS2737PvcRoofVolumeCleanerSuccessor';
import {pvcBitumenTransitionGuide2024S2737PublishConfig} from './prepareS2737PvcBitumenTransitionGuide2024Successor';
import {G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 as series, G6_COMMERCIAL_LABOR_MODE_PARAMETER_S2741 as modeId,
  G6_COMPOSITE_LABOR_MODE_S2741 as rateMode} from '../../../src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {PVC_TRANSITION_GUIDE2024_CONTROL_INPUT as transitionFixture} from './pvcBitumenTransitionGuide2024ControlInput';

type Parent={releaseId:string;searchReleaseId:string};
const currentPath=resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json');
export function g6CommercialLaborSeriesConfigS2741(index:number,parent:Parent):MasterSingleDefinitionSuccessorConfig {
  const profile=series[index];assert(profile,'BOUNDED_G6_01_TARGET_REQUIRED');
  const old=index===0?pvcRoofRussianPresentationS2737PublishConfig:index===1
    ?pvcRoofVolumeCleanerS2737PublishConfig(parent):pvcBitumenTransitionGuide2024S2737PublishConfig(parent);
  const shortInput=profile.measureId==='area_m2'?{area_m2:100}:{transition_length_m:10};
  const fixture=profile.measureId==='area_m2'?{...old.acceptanceInput}:{...transitionFixture};
  const definition=profile.definition;
  return {...old,
    contract:'rik-expo-app.s27-41.g6-commercial-labor-'+index+'.v1',stopCode:'S2741_G6_COMMERCIAL_LABOR_'+index,
    applicationName:'s2741-g6-commercial-labor-'+index,owner:'S2741_G6_01_SINGLE_WRITER',receiptFileStem:'g6_commercial_labor_'+index,
    masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (81).md',
    masterSha256:'67c5314eaf60ef88b887c3de0a4d2d39c38e406b2b58160415ccde3e8764648c',
    parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath:currentPath,
    outputRoot:resolve('.release-runtime/r568/s27-41/g6-commercial-series',String(index)),catalogAppend:undefined,
    expectedParentShape:[profile.originalDefinition.parameters.length,profile.originalDefinition.formulas.length,profile.originalDefinition.resources.length],
    sourcePaths:[...new Set([...old.sourcePaths,'scripts/estimate/r4a13/prepareS2741G6PvcCommercialLaborSeries.ts',
      'src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741.ts','src/lib/estimate/backendPlatform/canonicalCommercialCostCoverageV1.ts',
      'src/lib/estimate/backendPlatform/canonicalCommercialCostCoverageV1.test.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
      'src/lib/estimate/backendPlatform/contracts.ts','src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts',
      'src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding.ts','src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts',
      'src/lib/estimate/backendPlatform/canonicalProfessionalPdf.test.ts','src/features/consumerRepair/consumerRepairRowMetadata.ts',
      'src/features/consumerRepair/ConsumerRepairItemRow.tsx','src/features/consumerRepair/requestEstimateViewModel.ts',
      'tests/requestEstimate/requestEstimateViewModel.contract.test.ts','tests/estimateNorms/g6PvcCommercialLaborProfilesS2741.contract.test.ts',
      'src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1.ts',
      'src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1.test.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts','src/lib/estimate/v4/g6PvcResourcePresentationS2741.ts',
      'src/features/consumerRepair/RequestEstimateItemsEditor.tsx',
      'data/estimate-benchmarks/source-packs/g6-pvc-resource-presentation-source-bindings-s27-41.json'])],
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput,acceptanceInput:{...fixture,...definition.runtimeInput},runtimeProfileInput:definition.runtimeInput,
    runtimeProfileClassification:{...definition.runtimeClassification,[modeId]:'RUNTIME_STRUCTURAL_DEFAULT'},
    runtimeProfileSourceIds:definition.runtimeSourceIds,
    sourceMetadata:{...old.sourceMetadata,source_kind:'REUSED_ENGINEERING_PROFILE_WITH_EXPLICIT_COMMERCIAL_SCOPE',
      exact_locator:old.sourceMetadata.exact_locator+'; MASTER S27.41 §20.43.2–20.43.7: явный состав оплаты, без новой нормы или цены.',
      use_restriction:old.sourceMetadata.use_restriction+' Ставка по объёму требует предложения с трудом и уже включённой оснасткой; отдельные материальные/машинные строки не покрываются.'},
    passport:{...old.passport,includedScopeRu:[...old.passport.includedScopeRu,
      'Оплата исходной строки труда либо одна совместимая комплексная ставка за объём; включённая оснастка сохраняет прежнюю применимость',
      'Физические материалы, техника, количества, обеспечение и процесс сохраняются; неизвестные цены редактируются без выдуманного нуля'],
      excludedScopeRu:[...old.passport.excludedScopeRu,'Произвольное деление общей нормы труда, неподтверждённая комплексная цена и скрытое включение отдельных материалов/машин']},
    search:{...old.search,clarificationFields:[...old.search.clarificationFields,modeId],
      sourceProvenance:{...old.search.sourceProvenance,commercialScopeExplicit:true,technicalNormsPreserved:true,newPricesPublished:false}},
    applicability:{...old.applicability,commercialModelParameterId:modeId,sourceLaborQuantityPreserved:true,engineeringAccepted:false,ordinaryUiAccepted:false},
    locator:{...old.locator,key:old.locator.key+'-commercial-s2741',payload:{...old.locator.payload,
      financialSource:'MASTER S27.41 §20.43, explicit quote scope, not a new engineering norm',seriesId:'G6-01',rateRowId:profile.rateRowId,
      physicalResourcesUnchanged:true,pricesNeverDefaults:true}},
    verifyCore:async()=>{
      const compile=(def:typeof definition,input:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:profile.catalogId,
        compilerVersion:'S2741-G6-publisher-core-proof',primaryMeasureParameterId:profile.measureId,definition:def,submittedParameters:input});
      const original=await compile(profile.originalDefinition,fixture),baseline=await compile(definition,fixture);
      const withoutDisplay=(rows:readonly Record<string,unknown>[])=>rows.map(row=>{
        const {row_sha256:_rowHash,need_sha256:_needHash,...rest}=row;
        const trace=rest.calculation_trace as Record<string,unknown>;
        const {publicResourcePresentationV1:_display,...graph}=trace.resourceGraph as Record<string,unknown>;
        return {...rest,calculation_trace:{...trace,resourceGraph:graph}};
      });
      assert.deepEqual(withoutDisplay(baseline.rows),withoutDisplay(original.rows));
      assert.deepEqual(withoutDisplay(baseline.preliminaryNeeds),withoutDisplay(original.preliminaryNeeds));
      const rate=await compile(definition,{...fixture,[modeId]:rateMode});
      assert.equal(rate.rows.find(r=>r.row_id===profile.workerRowId)?.quantity,original.rows.find(r=>r.row_id===profile.workerRowId)?.quantity);
      assert.equal(rate.rows.find(r=>r.row_id===profile.workerRowId)?.included_in_estimate,false);
      assert.equal(rate.rows.find(r=>r.row_id===profile.rateRowId)?.unit_price,null);
      assert.deepEqual(rate.rows.filter(r=>r.included_in_procurement).map(r=>[r.row_id,r.quantity]),original.rows.filter(r=>r.included_in_procurement).map(r=>[r.row_id,r.quantity]));
      return {status:'GREEN_S2741_G6_COMMERCIAL_SOURCE_MODELS',seriesId:'G6-01',binding:index,originalResourceRows:profile.originalDefinition.resources.length,
        preparedResourceRows:definition.resources.length,technicalSourcePreserved:true,priceDefault:null,fixtureFactsNeverDefaults:true,
        engineeringAccepted:false,ordinaryUiAccepted:false,seriesAccepted:false};
    },
  };
}

async function run(){
  const target=process.argv.find(a=>a.startsWith('--target='))?.slice('--target='.length);
  assert(target==null||['0','1','2'].includes(target),'G6_01_TARGET_OUTSIDE_MANIFEST');
  for(let index=0;index<series.length;index++){
    if(target!=null&&target!==String(index))continue;
    const current=JSON.parse(readFileSync(currentPath,'utf8'));
    await runMasterSingleDefinitionSuccessorR1(g6CommercialLaborSeriesConfigS2741(index,
      {releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}));
  }
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2741G6PvcCommercialLaborSeries.ts')){
  void run().catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
