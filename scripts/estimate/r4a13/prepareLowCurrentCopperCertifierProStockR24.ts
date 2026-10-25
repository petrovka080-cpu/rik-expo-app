import pack from '../../../data/estimate-benchmarks/source-packs/low-current-copper-certifier-pro-stock-r24.json';
import {appendLowCurrentCopperCertifierProStockR24,lowCurrentCopperCertifierProStockResourceIdsR24} from '../../../src/lib/estimate/backendPlatform/lowCurrentCopperCertifierProStockR24';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

/** An inventory addition to the existing SCS successor. Its existing paid
 * tester-hour row is retained; the new stock rows carry no hourly-price claim. */
export function lowCurrentCopperCertifierProStockConfigR24(input:Readonly<{
  hostConfig:MasterSingleDefinitionSuccessorConfig;
  capturedParentDefinition:AutomaticOwnerDefinition;
  expectedCapturedComputationSha256:string;
  newSourcePaths:readonly string[];
  verifyWholePostCore:MasterSingleDefinitionSuccessorConfig['verifyCore'];
}>):MasterSingleDefinitionSuccessorConfig{
  const host=input.hostConfig;
  if(host.catalogId!==pack.hostCatalogId)throw Error('LOW_CURRENT_CERTIFIER_EXISTING_SCS_CONFIG_REQUIRED');
  if(host.catalogAppend!==undefined)throw Error('LOW_CURRENT_CERTIFIER_EXISTING_OWNER_SUCCESSOR_NOT_CATALOG_APPEND');
  if(!host.binding.retainParentBindings||!host.capturedScopedNormativeRegistry)
    throw Error('LOW_CURRENT_CERTIFIER_REAL_PARENT_AND_REGISTRY_CAPTURE_REQUIRED');
  if(host.projectSourcePackagePath!==undefined)
    throw Error('LOW_CURRENT_CERTIFIER_PROJECT_JSON_NOT_MANUFACTURER_INVENTORY_APPROVAL');
  if(host.sourceMetadata.artifact_sha256!==pack.primary.sha256
    ||host.sourceMetadata.source_kind!=='MANUFACTURER_PACKAGE_INVENTORY_NO_INSTALLATION_RATE')
    throw Error('LOW_CURRENT_CERTIFIER_EXACT_PRIMARY_INVENTORY_SOURCE_REQUIRED');
  const ids=lowCurrentCopperCertifierProStockResourceIdsR24();
  if(host.binding.rowId!==ids[0]
    ||JSON.stringify([...(host.binding.additionalRowIds??[])].sort())!==JSON.stringify(ids.slice(1).sort()))
    throw Error('LOW_CURRENT_CERTIFIER_ALL_NINE_INVENTORY_ROWS_MUST_BE_BOUND');
  const requiredNames=['prepareLowCurrentCopperCertifierProStockR24.ts','lowCurrentCopperCertifierProStockR24.ts','low-current-copper-certifier-pro-stock-r24.json','dsx602-datasheet.html'];
  if(requiredNames.some(name=>!input.newSourcePaths.some(path=>path.replace(/\\/g,'/').endsWith('/'+name))))
    throw Error('LOW_CURRENT_CERTIFIER_PINNED_MODEL_PACK_AND_PRIMARY_ARTIFACT_REQUIRED');
  const definition=appendLowCurrentCopperCertifierProStockR24({catalogId:host.catalogId,parent:input.capturedParentDefinition,
    expectedCapturedComputationSha256:input.expectedCapturedComputationSha256,sourceKey:host.sourceId});
  const usage=definition.resources.find(row=>row.row_id===pack.existingMachineHourOwnerRowId);
  const capturedUsage=input.capturedParentDefinition.resources.find(row=>row.row_id===pack.existingMachineHourOwnerRowId);
  if(!usage||usage!==capturedUsage)throw Error('LOW_CURRENT_CERTIFIER_EXISTING_USAGE_OWNER_MUST_BE_UNCHANGED');
  return{...host,sourcePaths:[...new Set([...host.sourcePaths,...input.newSourcePaths])],
    parameterDefinitions:definition.parameters.map(p=>({...p})),formulaDefinitions:definition.formulas.map(f=>({...f})),
    resourceDefinitions:definition.resources.map(r=>({...r})),verifyCore:input.verifyWholePostCore,
    shortInput:{...host.shortInput,[pack.profileId]:pack.notSelected},
    acceptanceInput:{...host.acceptanceInput,[pack.profileId]:pack.selectedProfile,[pack.frontCountId]:2},
    locator:{...host.locator,payload:{...host.locator.payload,physicalCertifierInventoryR24:{contract:pack.contract,
      source:pack.primary,declaredRoster:pack.parts,quantityBasis:'EXPLICIT_PHYSICAL_PAIR_COUNT_NOT_MACHINE_HOURS',
      oldHourOwner:pack.existingMachineHourOwnerRowId,oldHourParameter:pack.existingMachineHourParameterId,
      newPaidOwnerAdded:false,oldPriceCoverageClaimed:false,actualCalibrationAccepted:false,serverApprovalClaimed:false}}},
    passport:{...host.passport,includedScopeRu:[...host.passport.includedScopeRu,pack.scopeRu],
      excludedScopeRu:[...host.passport.excludedScopeRu,...pack.openObjectFacts],
      independentCompletenessMap:{...host.passport.independentCompletenessMap,
        copperCertifierProInventoryR24:{sourceArtifactSha256:pack.primary.sha256,wholeRosterIds:ids,
          namedPositions:9,physicalPiecesPerPair:11,documentsPerPair:1,
          existingUsageHourOwner:pack.existingMachineHourOwnerRowId,newPaidOwnerCount:0,
          oldNativeQuantitiesAndBindingsPreserved:true,priceCoverage:'ROOT_OWNER_REVIEW_HOLD'}}},
    applicability:{...host.applicability,lowCurrentCopperCertifierProStockR24:{contract:pack.contract,
      compatibleScope:pack.compatibility,sourceDeclaredRosterComplete:true,operationalWholePostAccepted:false,
      priceCoverage:'ROOT_OWNER_REVIEW_HOLD',actualObjectFactsRequired:pack.openObjectFacts,
      newHourOrLaborNorms:0,newPublicCards:0,FULL:false}},
  };
}
