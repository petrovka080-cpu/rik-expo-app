import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {waterValtecWorkProcessS2737PublishConfig} from './prepareS2737WaterValtecWorkProcessSuccessor';
import {runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {canonicalEstimateConsumerInputRole} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
import {compileWaterValtecPpr20StandardS2723} from '../../../src/lib/estimate/v4/waterValtecPpr20StandardS2723';

/** Existing preliminary water profile; only its customer presentation changes.
 * Route-node quantities are genuine geometry, never a percentage of pipe. */
export function waterValtecShortInputS2747Config(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const previous=waterValtecWorkProcessS2737PublishConfig(parent);
  const objectIds=previous.parameterDefinitions.filter(p=>canonicalEstimateConsumerInputRole({
    provenance:p.truth_metadata?.provenance as Record<string,unknown>,
  })==='OBJECT_FACT').map(p=>p.parameter_id);
  assert.deepEqual(objectIds,['route_length_m','straight_coupling_count','elbow_count','tee_count','threaded_transition_count','terminal_cap_count']);
  return {...previous,
    contract:'rik-expo-app.s27-47.water-valtec-short-input.v1',stopCode:'S2747_WATER_VALTEC_SHORT_INPUT',
    applicationName:'s2747-water-valtec-short-input',owner:'S2747_WATER_VALTEC_SINGLE_WRITER',receiptFileStem:'water_valtec_short_input',
    masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (87).md',
    masterSha256:'bdb1fe052f60ba7d775139894309d178ac092957d00499ae090d5e5618762c87',
    outputRoot:resolve('.release-runtime/r568/s27-47/g7-valtec-short-input'),
    sourcePaths:[...new Set([...previous.sourcePaths,'scripts/estimate/r4a13/prepareS2747WaterValtecShortInput.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.ts'])],
    locator:{...previous.locator,key:previous.locator.key+'-short-input-s2747',payload:{...previous.locator.payload,
      consumerInputOwnership:'S2747_WATER_VALTEC_ROUTE_FACTS',quantitiesAndNormsUnchanged:true,routeCountsDefaulted:false}},
    search:{...previous.search,clarificationFields:objectIds,sourceProvenance:{...previous.search.sourceProvenance,
      consumerInputOwnership:'S2747_WATER_VALTEC_ROUTE_FACTS',projectGeometryNotInferredFromLength:true}},
    verifyCore:async()=>{
      const previousProof=await previous.verifyCore();
      const sizeOnly=await compileWaterValtecPpr20StandardS2723({route_length_m:100});
      const routeFacts={route_length_m:100,straight_coupling_count:24,elbow_count:8,tee_count:2,threaded_transition_count:4,terminal_cap_count:2};
      const result=await compileWaterValtecPpr20StandardS2723(routeFacts);
      assert.equal(sizeOnly.preliminaryNeeds.length,18);
      assert.equal(result.preliminaryNeeds.length,0);assert.equal(result.rows.length,52);
      assert.equal(result.rows.filter(r=>r.row_id==='water-ppr20:04:equipment:fusion-machine').length,1);
      assert.equal(result.rows.find(r=>r.row_id==='water-ppr20:04:equipment:fusion-machine')?.quantity,'3.223333333');
      return {...previousProof,objectQuestions:6,onlySizeAndFiveRouteFacts:true,technicalQuestions:false,
        numericNormsChanged:false,routeCountsDefaulted:false,ordinaryUiAccepted:false,wholeG7Accepted:false,acceptedNewTypes:0};
    },
  };
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2747WaterValtecShortInput.ts')) {
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(waterValtecShortInputS2747Config({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
    .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
