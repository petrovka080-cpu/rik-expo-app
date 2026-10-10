import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {incandescentVlConfigS2758} from './prepareS2758IncandescentVl';

export function incandescentVlEffectiveTruckConfigS2758(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
  const base=incandescentVlConfigS2758(parent);
  return {...base,contract:'rik-expo-app.s27-58.incandescent-vl-luminaire-33-04-014-01.effective-truck.v2',stopCode:'S2758_INCANDESCENT_VL_EFFECTIVE_TRUCK',applicationName:'s2758-incandescent-effective-truck',
    outputRoot:resolve('.release-runtime/r568/s27-58/lighting-wave/publication/effective-truck'),expectedParentShape:[72,29,29],catalogAppend:undefined,
    sourcePaths:[...new Set([...base.sourcePaths,'scripts/estimate/r4a13/prepareS2758IncandescentVlEffectiveTruck.ts'])],
    applicability:{...base.applicability,selectedTruckCostUsesEffectivePhysicalQuantity:true},
    locator:{key:'s2758-incandescent-effective-truck',payload:{...base.locator.payload,selectedTruckCostUsesEffectivePhysicalQuantity:true}},
    owner:'S2758_INCANDESCENT_VL_SINGLE_WRITER',receiptFileStem:'incandescent_vl_effective_truck'};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2758IncandescentVlEffectiveTruck.ts')){
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(incandescentVlEffectiveTruckConfigS2758({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId})).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
}
