import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareStairsDokaStandardFullRetainedMasterDraftR2} from './prepareStairsDokaStandardFullRetainedMasterR2';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

const decisionPath='data/estimate-benchmarks/fixtures/stairs-doka-standard-root-variant-decision-r3.json';
const decisionSha256='23a1a8550cef872fd2ef8e9ac0a317c3713eb737ef24960175dfeb803ca734d9';
const proofPath='data/estimate-benchmarks/fixtures/stairs-doka-standard-parent-elecor-readback-r1.json';
const applyPath='data/estimate-benchmarks/fixtures/stairs-doka-standard-parent-elecor-apply-r1.json';
const sha=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');

/** Configuration only. Existing Master normal/locked checks and writer own publication. */
export function prepareStairsDokaStandardFullRetainedMasterR3(input:Readonly<{
 sourceHead:string;sourceTree:string;evidenceSha256:string;outputRoot?:string;
}>):MasterSingleDefinitionSuccessorConfig{
 assert(/^[a-f0-9]{40}$/.test(input.sourceHead)&&/^[a-f0-9]{40}$/.test(input.sourceTree));
 assert(/^[a-f0-9]{64}$/.test(input.evidenceSha256));
 const bytes=readFileSync(decisionPath);assert.equal(sha(bytes),decisionSha256);
 const decision=JSON.parse(bytes.toString('utf8'));
 assert.equal(decision.status,'ROOT_ACCEPTED_EXISTING_STANDARD_DOKA_SOURCE_VARIANT_SCOPE_ONLY_CHECKS_PENDING');
 assert.equal(decision.newCatalogIds,0);assert.equal(decision.newCompleteTypes,0);
 assert.equal(decision.savedMethodSwitchAllowed,false);assert.equal(decision.runtimeDefaultSelectsDoka,false);
 assert.equal(sha(readFileSync(proofPath)),decision.parentBinding.readbackPin.sha256);
 assert.equal(sha(readFileSync(applyPath)),decision.parentBinding.applyPin.sha256);
 const proof=JSON.parse(readFileSync(proofPath,'utf8')),applied=JSON.parse(readFileSync(applyPath,'utf8'));
 assert.equal(proof.status,'PASS_ELECOR_R3_APPLY_INDEPENDENT_PAYLOAD_SOURCES_BASELINE_SAVED_AND10466');
 assert.equal(proof.completeReadSet,true);assert.equal(proof.transactionRolledBack,true);assert.equal(proof.connectionClosed,true);
 assert.equal(proof.error,null);assert.equal(applied.mutationPerformed,true);
 assert.equal(proof.preservation.unrelatedManifestMappings.unrelated_changed,0);
 assert.equal(proof.preservation.unrelatedManifestMappings.unrelated_count,10466);
 assert.equal(proof.actualPublicationContext.definitionReleaseId,decision.parentBinding.definitionReleaseId);
 assert.equal(proof.actualPublicationContext.searchReleaseId,decision.parentBinding.searchReleaseId);
 assert.equal(applied.successor.releaseId,decision.parentBinding.definitionReleaseId);
 assert.equal(applied.successor.searchReleaseId,decision.parentBinding.searchReleaseId);
 const draft=prepareStairsDokaStandardFullRetainedMasterDraftR2(),fields=draft.knownConfigFields;
 assert.equal(fields.catalogId,decision.catalogId);assert.equal(draft.newCatalogIds,0);
 const cfg:MasterSingleDefinitionSuccessorConfig={...fields,
  contract:'gox-build.stairs-doka-standard-source-variant-retained/r3',
  stopCode:'STAIRS_DOKA_STANDARD_RETAINED_R3',applicationName:'stairs-doka-standard-retained-r3',
  parentReleaseId:decision.parentBinding.definitionReleaseId,parentSearchReleaseId:decision.parentBinding.searchReleaseId,
  outputRoot:input.outputRoot??'.release-runtime/r568/stairs-doka-standard-retained-r3',
  sourcePaths:[...fields.sourcePaths,'scripts/estimate/r4a13/prepareStairsDokaStandardFullRetainedMasterR3.ts',
   decisionPath,proofPath,applyPath,'data/estimate-benchmarks/fixtures/stairs-doka-standard-parent-elecor-link-r1.json'],
  applicability:{...fields.applicability,actualPublicationParentDeferred:false,rootVariantDecisionSha256:decisionSha256,
   sourceHeadAtPreparation:input.sourceHead,sourceTreeAtPreparation:input.sourceTree,evidenceSha256:input.evidenceSha256,
   savedMethodSwitchAllowed:false,fullTechnicalAcceptance:false},
  receiptFileStem:'stairs_doka_standard_retained_r3',
  verifyCore:async()=>({...await fields.verifyCore(),actualNextElecorParentAccepted:true,
   rootVariantDecisionSha256:decisionSha256,acceptedParentReleaseId:decision.parentBinding.definitionReleaseId,
   acceptedParentSearchReleaseId:decision.parentBinding.searchReleaseId,normalAndLockedFullRetentionStillRequired:true,
   publicationPerformed:false}),
 };
 assert.equal(cfg.catalogAppend,undefined);
 return cfg;
}
