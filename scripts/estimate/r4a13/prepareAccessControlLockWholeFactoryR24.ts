import pack from '../../../data/estimate-benchmarks/source-packs/access-control-lock-factory-whole-r24.json';
import {appendAccessControlLockWholeFactoryR24,accessControlLockFactoryResourceIdsR24} from '../../../src/lib/estimate/backendPlatform/accessControlLockWholeFactoryR24';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
/** One normal existing-owner Config. ROOT supplies the actual manufacturer
 * registry/source assembly and finite callback. No fixture, method choice or
 * factory inventory is an actual project/power/stock/price authorization. */
export function accessControlLockWholeFactoryConfigR24(input:Readonly<{
  hostConfig:MasterSingleDefinitionSuccessorConfig;capturedParentDefinition:AutomaticOwnerDefinition;
  expectedCapturedComputationSha256:string;newSourcePaths:readonly string[];
  verifyWholeLockFactoryCore:MasterSingleDefinitionSuccessorConfig['verifyCore'];
}>):MasterSingleDefinitionSuccessorConfig{
  const host=input.hostConfig,retained=host.binding.retainParentBindings,expected=pack.currentReadOnlyIdentity;
  if(host.catalogId!==pack.catalogId||host.catalogAppend!==undefined||!retained||!host.capturedScopedNormativeRegistry)
    throw Error('ACS_LOCK_FACTORY_ACTUAL_EXISTING_PARENT_AND_REGISTRY_REQUIRED');
  const capture=retained.capturedParent,definition=capture.definition,arrays=capture.baseline.normative_source_ids;
  if(definition.id!==expected.definitionId||definition.catalog_id!==pack.catalogId||definition.definition_version!==expected.definitionVersion
    ||definition.definition_sha256!==expected.definitionSha256||capture.baseline.id!==expected.baselineId
    ||JSON.stringify(host.expectedParentShape)!==JSON.stringify(expected.shape)||capture.parameters.length!==53||capture.formulas.length!==36
    ||capture.resources.length!==36||capture.bindings.length!==1||!object(arrays)||Object.keys(arrays).length!==53
    ||retained.capturedParentSha256!==masterRetainedParentCaptureSha256R1(capture)
    ||hash({parameters:capture.parameters,formulas:capture.formulas,resources:capture.resources})!==input.expectedCapturedComputationSha256)
    throw Error('ACS_LOCK_FACTORY_EXACT_R268_CAPTURE_REQUIRED');
  if(host.projectSourcePackagePath!==undefined||host.sourceId===pack.existingOwner.sourceKey
    ||host.sourceMetadata.artifact_sha256!==pack.primary.sha256||host.sourceMetadata.source_kind!==pack.sourceKind)
    throw Error('ACS_LOCK_FACTORY_SOURCE_NOT_PROJECT_OR_OLD_TEMPLATE_APPROVAL');
  const ids=accessControlLockFactoryResourceIdsR24();
  if(host.binding.rowId!==ids[0]||JSON.stringify([...(host.binding.additionalRowIds??[])].sort())!==JSON.stringify(ids.slice(1).sort()))
    throw Error('ACS_LOCK_FACTORY_EXACT_TEN_COMPONENT_BINDINGS_REQUIRED');
  const required=['access-control-lock-factory-whole-r24.json','accessControlLockWholeFactoryR24.ts',
    'prepareAccessControlLockWholeFactoryR24.ts',pack.primary.logicalPath,pack.officialProductPage.logicalPath];
  for(const path of required)if(!input.newSourcePaths.some(candidate=>candidate.replace(/\\/g,'/').endsWith(path)))
    throw Error('ACS_LOCK_FACTORY_FULL_PRIMARY_SOURCE_CLOSURE_REQUIRED:'+path);
  const next=appendAccessControlLockWholeFactoryR24({catalogId:host.catalogId,parent:input.capturedParentDefinition,
    expectedCapturedComputationSha256:input.expectedCapturedComputationSha256,rootSourceKey:host.sourceId,rootNormId:host.normId});
  return{...host,parameterDefinitions:next.parameters.map(row=>({...row})),formulaDefinitions:next.formulas.map(row=>({...row})),
    resourceDefinitions:next.resources.map(row=>({...row})),sourcePaths:[...new Set([...host.sourcePaths,...input.newSourcePaths])],
    shortInput:{...host.shortInput,[pack.profileId]:pack.notSelected},acceptanceInput:{...host.acceptanceInput,[pack.profileId]:pack.selected12V},
    verifyCore:input.verifyWholeLockFactoryCore,
    locator:{...host.locator,payload:{...host.locator.payload,accessLockWholeFactoryR24:{primary:pack.primary,parts:pack.parts,
      existingPaidOwner:pack.existingOwner.rowId,sourceAdmission:false,projectApproval:false,newPaidOwners:0}}},
    passport:{...host.passport,includedScopeRu:[...host.passport.includedScopeRu,pack.scopeRu],
      excludedScopeRu:[...host.passport.excludedScopeRu,...pack.notCoveredRu],independentCompletenessMap:{...host.passport.independentCompletenessMap,
        electromagneticLockFactoryDelivery:{sourceNativeGroups:11,retainedLockOwner:1,newIncludedComponents:10,newPaidOwners:0,
          sourceSpecific12VAnd24VSeparate:true,pinPossiblyPreinstalledNotDuplicated:true,optionalMountsNotIncluded:true,
          oldDoorContactsFastenersPowerLabourQaUnchanged:true,wholeOperationalDoorAccepted:false,priceScope:'EXACT_FACTORY_VENDOR_SCOPE_HOLD'}}},
    applicability:{...host.applicability,electromagneticLockFactoryDelivery:{literalFactoryRosterComplete:true,
      nativeQuantityNormChanged:false,actualDoorVoltageOrReleaseApproval:false,physicalToolStockAndQaAccepted:false,
      sourceRegistryAdmission:false,priceScopeConfirmed:false,FULL:false}}};
}
