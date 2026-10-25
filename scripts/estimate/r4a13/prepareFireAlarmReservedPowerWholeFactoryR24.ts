import pack from '../../../data/estimate-benchmarks/source-packs/fire-alarm-rip24-06-whole-factory-delivery-r24.json';
import {appendFireAlarmReservedPowerWholeFactoryR24,fireAlarmReservedPowerWholeResourceIdsR24} from '../../../src/lib/estimate/backendPlatform/fireAlarmReservedPowerWholeFactoryR24';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

/** Non-publishable preparation only. The final delivery payload/calculation
 * body below is shared with the strict normal wrapper; no registry witness is
 * accepted or manufactured in this phase. */
export type FireAlarmPsuProposedConfigR24=Omit<MasterSingleDefinitionSuccessorConfig,'capturedScopedNormativeRegistry'>;
export type FireAlarmPsuFactoryPreparationR24=Readonly<{
  hostConfig:FireAlarmPsuProposedConfigR24;capturedParentDefinition:AutomaticOwnerDefinition;
  expectedCapturedComputationSha256:string;newSourcePaths:readonly string[];
  verifyWholeFactoryDeliveryCore:MasterSingleDefinitionSuccessorConfig['verifyCore'];
}>;
export function prepareFireAlarmReservedPowerWholeFactoryProposedR24(input:FireAlarmPsuFactoryPreparationR24):FireAlarmPsuProposedConfigR24{
  if(Object.hasOwn(input.hostConfig,'capturedScopedNormativeRegistry'))
    throw Error('FIRE_RESERVED_POWER_PROPOSED_PHASE_MUST_NOT_CONTAIN_CAPTURE');
  const host=input.hostConfig,ids=fireAlarmReservedPowerWholeResourceIdsR24();
  if(host.catalogId!==pack.catalogId||host.catalogAppend!==undefined||!host.binding.retainParentBindings)
    throw Error('FIRE_RESERVED_POWER_ACTUAL_EXISTING_PARENT_AND_REGISTRY_REQUIRED');
  if(host.projectSourcePackagePath!==undefined||host.sourceMetadata.artifact_sha256!==pack.primary.sha256
    ||host.sourceMetadata.source_kind!==pack.sourceKind)throw Error('FIRE_RESERVED_POWER_FACTORY_SOURCE_NOT_PROJECT_APPROVAL');
  if(host.binding.rowId!==ids[0]||JSON.stringify([...(host.binding.additionalRowIds??[])].sort())!==JSON.stringify(ids.slice(1).sort()))
    throw Error('FIRE_RESERVED_POWER_EXACT_FIVE_COMPONENT_BINDINGS_REQUIRED');
  for(const name of ['fire-alarm-rip24-06-whole-factory-delivery-r24.json','fireAlarmReservedPowerWholeFactoryR24.ts',
    'prepareFireAlarmReservedPowerWholeFactoryR24.ts','BOLID_RIP24_06_MANUAL_REV10_20260925.pdf','BOLID_RIP24_06_OFFICIAL_PRODUCT.html'])
    if(!input.newSourcePaths.some(path=>path.replace(/\\/g,'/').endsWith('/'+name)))throw Error('FIRE_RESERVED_POWER_FULL_PRIMARY_SOURCE_CLOSURE_REQUIRED:'+name);
  const definition=appendFireAlarmReservedPowerWholeFactoryR24({catalogId:host.catalogId,parent:input.capturedParentDefinition,
    expectedCapturedComputationSha256:input.expectedCapturedComputationSha256,rootSourceKey:host.sourceId,rootNormId:host.normId});
  return{...host,parameterDefinitions:definition.parameters.map(row=>({...row})),formulaDefinitions:definition.formulas.map(row=>({...row})),
    resourceDefinitions:definition.resources.map(row=>({...row})),sourcePaths:[...new Set([...host.sourcePaths,...input.newSourcePaths])],
    shortInput:{...host.shortInput,[pack.profileId]:pack.notSelected},acceptanceInput:{...host.acceptanceInput,[pack.profileId]:pack.selectedProfile},
    verifyCore:input.verifyWholeFactoryDeliveryCore,
    locator:{...host.locator,payload:{...host.locator.payload,wholeFactoryDeliveryR24:{primary:pack.primary,parts:pack.parts,
      existingUnitOwner:pack.existingOwner.powerRowId,newPaidOwners:0,externalBatteryBoundary:pack.externalBatteryBoundary,
      sourceAdmission:false,projectApproval:false,priceScopeConfirmed:false}}},
    passport:{...host.passport,includedScopeRu:[...host.passport.includedScopeRu,pack.scopeRu],
      excludedScopeRu:[...host.passport.excludedScopeRu,...pack.notCoveredRu],independentCompletenessMap:{...host.passport.independentCompletenessMap,
        rip24_06FactoryDelivery:{nativeSourceRows:6,retainedDeviceOwners:1,newIncludedComponents:5,newPaidOwners:0,
          batteriesIncluded:false,pairedMountCountPerUnit:4,cableGlandsPerUnit:4,priceCoverage:'ROOT_EXACT_FACTORY_UNIT_SCOPE_HOLD',
          oldSourceArraysAndBindingsUnchanged:true,wholeOperationalInstallationAccepted:false}}},
    applicability:{...host.applicability,rip24_06FactoryDelivery:{officialFactoryRosterComplete:true,nativeQuantityAlgorithmChanged:false,
      actualProjectOrStockApproval:false,safeUseOrQaAccepted:false,priceScopeConfirmed:false,newLabourNorm:false,FULL:false}}};
}

/** The existing ordinary route keeps its original actual-parent/capture guard.
 * Only the pure final-data builder is extracted; callbacks remain references. */
export function fireAlarmReservedPowerWholeFactoryConfigR24(input:Readonly<{
  hostConfig:MasterSingleDefinitionSuccessorConfig;capturedParentDefinition:AutomaticOwnerDefinition;
  expectedCapturedComputationSha256:string;newSourcePaths:readonly string[];
  verifyWholeFactoryDeliveryCore:MasterSingleDefinitionSuccessorConfig['verifyCore'];
}>):MasterSingleDefinitionSuccessorConfig{
  const host=input.hostConfig,ids=fireAlarmReservedPowerWholeResourceIdsR24();
  if(host.catalogId!==pack.catalogId||host.catalogAppend!==undefined||!host.binding.retainParentBindings||!host.capturedScopedNormativeRegistry)
    throw Error('FIRE_RESERVED_POWER_ACTUAL_EXISTING_PARENT_AND_REGISTRY_REQUIRED');
  const {capturedScopedNormativeRegistry,...proposedHost}=host;
  const prepared=prepareFireAlarmReservedPowerWholeFactoryProposedR24({...input,hostConfig:proposedHost});
  return{...prepared,capturedScopedNormativeRegistry};
}
