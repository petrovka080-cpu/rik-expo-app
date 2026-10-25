import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import pack from '../../../data/estimate-benchmarks/source-packs/access-control-lock-factory-whole-r24.json';
import {accessControlLockWholeFactoryConfigR24} from './prepareAccessControlLockWholeFactoryR24';
import {resolveMasterSingleDefinitionLocatorExcerptSha256R1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {resolveMasterScopedNormativeRegistryOptInR1,masterScopedNormativeRegistryCaptureSha256R1,
  type MasterCapturedScopedNormativeRegistryR1,type MasterScopedNormativeRegistryInputR1} from './masterScopedNormativeRegistryPreimageR1';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';

type RootActualInputPinR24=Readonly<{path:string;sha256:string}>;
const sourceKey='manufacturer_al300premium_complete_factory_delivery_20260521';
const normId='MANUFACTURER_AL300PREMIUM_WHOLE_FACTORY_DELIVERY_NOT_INSTALLATION_NORM';
const locatorKey='al300premium-20260521-section3-1-fig1-whole-delivery';
const stable=canonicalEstimateStableJson;
function readRootPinnedBytes(pin:RootActualInputPinR24):Buffer{
  assert(path.isAbsolute(pin.path)&&/^[a-f0-9]{64}$/.test(pin.sha256),'ACS_ROOT_ACTUAL_INPUT_PIN_REQUIRED');
  assert(fs.statSync(pin.path).size<=4*1024*1024,'ACS_ROOT_ACTUAL_INPUT_BOUND');
  const bytes=fs.readFileSync(pin.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.sha256,'ACS_ROOT_ACTUAL_INPUT_SHA');return bytes;
}

/** ROOT passes the genuine result of the existing formal capture arm. This
 * boundary never converts an R249 raw witness, manufactures empty rows/IDs,
 * or treats a read/fixture as normative, price or actual-project approval.
 * Existing ordinary Config and publisher retain their later normal/locked
 * guards and verifyCore callback. This function performs no SQL or publish. */
export function bindAccessControlLockActualFormalRegistryR24(input:Readonly<{
  hostConfig:MasterSingleDefinitionSuccessorConfig;
  capturedParentDefinition:AutomaticOwnerDefinition;
  expectedCapturedComputationSha256:string;
  actualFormalCapture:MasterCapturedScopedNormativeRegistryR1;
  actualFormalCapturePin:RootActualInputPinR24;
  actualReadonlyReceiptPin:RootActualInputPinR24;
  /** Complete managed rows from the existing publisher generation route. */
  publisherGeneratedRows:Pick<MasterScopedNormativeRegistryInputR1,'newSource'|'newLocators'>;
  newSourcePaths:readonly string[];
  verifyWholeLockFactoryCore:MasterSingleDefinitionSuccessorConfig['verifyCore'];
}>):MasterSingleDefinitionSuccessorConfig{
  const host=input.hostConfig,capture=input.actualFormalCapture,generated=input.publisherGeneratedRows;
  assert.equal(capture.contract,'master-scoped-normative-registry-preimage/r1');
  assert.equal(capture.projection,'pg-jsonb-text-utc-microseconds/r1');
  assert.equal(masterScopedNormativeRegistryCaptureSha256R1(capture),capture.captureSha256,'ACS_FORMAL_CAPTURE_HASH');
  const exactFile:unknown=JSON.parse(readRootPinnedBytes(input.actualFormalCapturePin).toString('utf8'));
  assert.equal(stable(exactFile),stable(capture),'ACS_ARGUMENT_IS_EXACT_ROOT_FORMAL_CAPTURE_FILE');
  readRootPinnedBytes(input.actualReadonlyReceiptPin); // Passive actual-read provenance, not a boolean approval switch.
  assert.equal(host.catalogId,pack.catalogId);assert.equal(host.contract,pack.contract);
  assert.equal(host.sourceId,sourceKey);assert.equal(host.normId,normId);assert.equal(host.locator.key,locatorKey);
  assert.equal(host.projectSourcePackagePath,undefined);assert.equal(host.catalogAppend,undefined);
  assert.equal(host.binding.reuseExistingNormativeRegistry,undefined,'ACS_CAPTURE_AND_REUSE_ROUTES_MUST_NOT_MIX');
  const retained=host.binding.retainParentBindings;assert(retained,'ACS_GENUINE_RETAINED_PARENT_REQUIRED');
  assert.equal(retained.capturedSourcePreimage?.sourceKey,sourceKey);
  assert.equal(retained.capturedSourcePreimage?.expected,null,'ACS_ROOT_ACTUAL_ABSENCE_ROUTE_REQUIRED');
  assert.equal(capture.scope.sourceKey,sourceKey);assert.equal(capture.scope.artifactSha256,pack.primary.sha256);
  assert.equal(capture.scope.normId,normId);assert.deepEqual(capture.scope.generatedLocatorKeys,[locatorKey]);
  assert.equal(generated.newSource.source_key,sourceKey);assert.equal(generated.newSource.artifact_sha256,pack.primary.sha256);
  assert.equal(generated.newSource.metadata.activationAllowed,false);
  assert.equal(generated.newSource.metadata.universalProductivityClaimed,false);
  assert.equal(generated.newSource.metadata.universalConsumptionClaimed,false);
  assert.equal(generated.newSource.metadata.sourceKind,pack.sourceKind);
  assert.equal(generated.newSource.metadata.contract,host.contract);
  assert.equal(generated.newSource.metadata.useRestriction,host.sourceMetadata.use_restriction);
  assert.equal(generated.newSource.title_ru,host.sourceMetadata.source_title);
  assert.equal(generated.newSource.authority,host.sourceMetadata.source_authority);
  assert.equal(generated.newSource.official_url,host.sourceMetadata.official_url??null);
  assert.equal(generated.newSource.effective_from,host.sourceMetadata.effective_from??null);
  assert.equal(generated.newSource.effective_to,null);
  assert.equal(host.sourceMetadata.exact_locator,pack.primary.locator);
  for(const suffix of ['scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts',
    'scripts/estimate/r4a13/bindAccessControlLockActualFormalRegistryR24.ts'])
    assert(input.newSourcePaths.some(candidate=>candidate.replace(/\\/g,'/').endsWith(suffix)),'ACS_EXACT_RUNTIME_SOURCE_PATH_REQUIRED:'+suffix);
  const proofPaths=[input.actualFormalCapturePin.path,input.actualReadonlyReceiptPin.path];
  const next=accessControlLockWholeFactoryConfigR24({hostConfig:{...host,capturedScopedNormativeRegistry:capture},
    capturedParentDefinition:input.capturedParentDefinition,expectedCapturedComputationSha256:input.expectedCapturedComputationSha256,
    newSourcePaths:[...input.newSourcePaths,...proofPaths],verifyWholeLockFactoryCore:input.verifyWholeLockFactoryCore});
  // Validate the FINAL locator produced by the existing ACS wrapper. Capturing
  // a pre-wrapper payload would not match normal publisher generated rows.
  assert.equal(generated.newLocators.length,1);const locator=generated.newLocators[0];assert(locator);
  assert.equal(locator.locator_key,next.locator.key);assert.equal(stable(locator.locator),stable(next.locator.payload));
  assert.equal(locator.excerpt_sha256,resolveMasterSingleDefinitionLocatorExcerptSha256R1(next),'ACS_EXISTING_PUBLISHER_EXCERPT_ROUTE');
  const formal=resolveMasterScopedNormativeRegistryOptInR1({config:next,...generated});
  assert(formal,'ACS_FORMAL_CAPTURE_OPT_IN_REQUIRED');
  assert.equal(stable(formal.declaration),stable(capture));
  assert.equal(next.verifyCore,input.verifyWholeLockFactoryCore,'REAL_CALLBACK_NOT_REPLACED_BY_RECEIPT_FLAG');
  assert.equal(next.applicability.electromagneticLockFactoryDelivery.sourceRegistryAdmission,false);
  assert.equal(next.applicability.electromagneticLockFactoryDelivery.actualDoorVoltageOrReleaseApproval,false);
  assert.equal(next.applicability.electromagneticLockFactoryDelivery.physicalToolStockAndQaAccepted,false);
  assert.equal(next.applicability.electromagneticLockFactoryDelivery.priceScopeConfirmed,false);
  assert.equal(next.applicability.electromagneticLockFactoryDelivery.FULL,false);
  return next;
}
