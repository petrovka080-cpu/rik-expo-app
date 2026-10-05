import {resolve} from 'node:path';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {roadPlatformS2736PublishConfig as base} from './prepareS2736RoadPlatform150Plus50Successor';

// Forward-only passport correction of the already prepared road definition.
// Existing identity, search group, formulas and resource ownership are retained.
const config:MasterSingleDefinitionSuccessorConfig={
  ...base,contract:'rik-expo-app.s27-36.road-platform-visible-profile.v2',stopCode:'S2736_ROAD_PLATFORM_VISIBLE_PROFILE',applicationName:'s2736-road-platform-visible-profile',
  parentReleaseId:'32097bb3-e196-5041-bc54-d199b9384944',parentSearchReleaseId:'cff7a937-1af5-56f8-ab41-f6da1c6ff1b8',
  outputRoot:resolve('.release-runtime/r568/s27-35/road-platform-visible-profile'),expectedParentShape:[58,58,92],catalogAppend:undefined,
  sourcePaths:[...base.sourcePaths,'scripts/estimate/r4a13/prepareS2736RoadPlatformVisibleProfileSuccessor.ts'],
  locator:{key:'road-platform-150-plus-50-visible-profile-v2',payload:{...base.locator.payload,profileAssumptionsVisible:true,normativeDerivedProtectionRetained:true}},
  owner:'S2736_ROAD_PLATFORM_VISIBLE_PROFILE',receiptFileStem:'road_platform_visible_profile',
};
void runMasterSingleDefinitionSuccessorR1(config).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
