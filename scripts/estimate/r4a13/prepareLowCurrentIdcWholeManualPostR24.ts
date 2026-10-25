import pack from '../../../data/estimate-benchmarks/source-packs/low-current-idc-whole-manual-post-r24.json';
import {appendLowCurrentIdcWholeManualPostR24,lowCurrentIdcPostResourceIdsR24} from '../../../src/lib/estimate/backendPlatform/lowCurrentIdcWholeManualPostR24';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

/** Existing publisher Config adapter, not a new publisher or approval route.
 * ROOT must supply a real current parent and captured registry input. No source
 * key, UUID, absent row or approved project is manufactured by this module. */
export function lowCurrentIdcWholeManualPostConfigR24(input:Readonly<{
  hostConfig:MasterSingleDefinitionSuccessorConfig;
  capturedParentDefinition:AutomaticOwnerDefinition;
  expectedCapturedComputationSha256:string;
  newSourcePaths:readonly string[];
  verifyWholePostCore:MasterSingleDefinitionSuccessorConfig['verifyCore'];
}>):MasterSingleDefinitionSuccessorConfig{
  const host=input.hostConfig;
  if(host.catalogId!==pack.hostCatalogId)throw Error('LOW_CURRENT_IDC_EXISTING_SCS_CONFIG_REQUIRED');
  if(host.catalogAppend!==undefined)throw Error('LOW_CURRENT_IDC_EXISTING_OWNER_SUCCESSOR_NOT_CATALOG_APPEND');
  if(!host.binding.retainParentBindings||!host.capturedScopedNormativeRegistry)
    throw Error('LOW_CURRENT_IDC_REAL_PARENT_AND_REGISTRY_CAPTURE_REQUIRED');
  if(host.projectSourcePackagePath!==undefined)
    throw Error('LOW_CURRENT_IDC_PROJECT_JSON_NOT_MANUFACTURER_INVENTORY_APPROVAL');
  if(host.sourceMetadata.artifact_sha256!==pack.source.sha256
    ||host.sourceMetadata.source_kind!=='MANUFACTURER_PACKAGE_INVENTORY_NO_INSTALLATION_RATE')
    throw Error('LOW_CURRENT_IDC_EXACT_PRIMARY_INVENTORY_SOURCE_REQUIRED');
  const rowIds=lowCurrentIdcPostResourceIdsR24();
  if(host.binding.rowId!==rowIds[0]
    ||JSON.stringify([...(host.binding.additionalRowIds??[])].sort())!==JSON.stringify(rowIds.slice(1).sort()))
    throw Error('LOW_CURRENT_IDC_ALL_SIX_OWNED_ROWS_MUST_BE_BOUND');
  const requiredNames=['lowCurrentIdcWholeManualPostR24.ts','low-current-idc-whole-manual-post-r24.json','pro-tool-kits.html','d914-series-impact-tools.html'];
  if(requiredNames.some(name=>!input.newSourcePaths.some(path=>path.replace(/\\/g,'/').endsWith('/'+name))))
    throw Error('LOW_CURRENT_IDC_PINNED_MODEL_PACK_AND_TWO_PRIMARY_ARTIFACTS_REQUIRED');
  const definition=appendLowCurrentIdcWholeManualPostR24({catalogId:host.catalogId,parent:input.capturedParentDefinition,
    expectedCapturedComputationSha256:input.expectedCapturedComputationSha256,sourceKey:host.sourceId});
  return{...host,sourcePaths:[...new Set([...host.sourcePaths,...input.newSourcePaths])],
    parameterDefinitions:definition.parameters.map(p=>({...p})),formulaDefinitions:definition.formulas.map(f=>({...f})),
    resourceDefinitions:definition.resources.map(r=>({...r})),verifyCore:input.verifyWholePostCore,
    shortInput:{...host.shortInput,[pack.profileId]:pack.notSelected},
    acceptanceInput:{...host.acceptanceInput,[pack.profileId]:pack.profiles[0]!.titleRu,[pack.frontCountId]:2},
    locator:{...host.locator,payload:{...host.locator.payload,physicalPostInventoryR24:{contract:pack.contract,
      scopeRu:pack.scopeRu,manufacturerDeclaredRoster:pack.parts,source:pack.source,
      priceScopeRu:pack.priceScopeRu,quantityBasis:pack.quantityBasis,notCoveredRu:pack.notCoveredRu,
      installationRateClaimed:false,serverApprovalClaimed:false}}},
    passport:{...host.passport,includedScopeRu:[...host.passport.includedScopeRu,pack.scopeRu],
      excludedScopeRu:[...host.passport.excludedScopeRu,...pack.notCoveredRu],
      independentCompletenessMap:{...host.passport.independentCompletenessMap,
        physicalPostInventorySourceMapR24:{sourceKind:'MANUFACTURER_DECLARED_WHOLE_PACKAGE',generatedFromCurrentRows:false,
          sourceArtifactSha256:pack.source.sha256,ownerRowId:rowIds[0],wholeRosterIds:rowIds.slice(1),
          expectedParts:5,partsPerExplicitPhysicalPost:5,installationNormClaimed:false,
          oldNeedsAndSourceBindingsPreserved:true}}},
    applicability:{...host.applicability,lowCurrentIdcPhysicalPostR24:{contract:pack.contract,
      profiles:pack.profiles,actualObjectFactsRequired:pack.requiresActualObjectFacts,
      profileSelectionConfirmsStockOrApproval:false,wholeStructuredCablingInstallationComplete:false,
      oldNativeQuantitiesUnchanged:true,oldNeedsNotClosed:true,newPublicCards:0,FULL:false}},
  };
}
