import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareInteriorWallFinishingProvisionGroupR7} from './prepareInteriorWallFinishingProvisionGroupR7';
import type {PublishedFinishingBranchR4} from './prepareInteriorWallFinishingCrewGroupR4';
import {readMasterSuccessorTargetPreimageR1,validateIndependentCompletenessMapReferences,
  type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {interiorWallFinishingProvisionGroupDefinitionR8,interiorWallFinishingProvisionCompletenessMapR8,
  interiorWallFinishingProvisionPackR8 as pack} from '../../../src/lib/estimate/v4/interiorWallFinishingProvisionGroupR8';
import {interiorWallFinishingGeometryPackR3 as base,interiorWallFinishingGeometryParameterR3 as p,
  interiorWallFinishingGeometryRowR3 as row} from '../../../src/lib/estimate/v4/interiorWallFinishingGeometryGroupR3';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';

const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
export const finishingProvisionSourceIdR8=(branch:PublishedFinishingBranchR4)=>
  'interior_wall_vgt_provision_'+branch.replaceAll('-','_')+'_r8';

/** Whole-stage source successor through the existing guarded publisher. The
 * saved consumption driver keeps pieces; it never becomes a preparation count. */
export function prepareInteriorWallFinishingProvisionGroupR8(parent:{releaseId:string;searchReleaseId:string;
  outputRoot:string;targetPreimage:{path:string;sha256:string}},branch:PublishedFinishingBranchR4):MasterSingleDefinitionSuccessorConfig {
  const historicPath='.release-runtime/r568/master28-confirmation-wave/target-preimages/'+
    (branch==='improved-wall-01'?'vgt':'primer')+'.json',
    prior=prepareInteriorWallFinishingProvisionGroupR7({...parent,targetPreimage:{path:historicPath,sha256:sha(historicPath)}},branch),
    d=interiorWallFinishingProvisionGroupDefinitionR8(branch),map=interiorWallFinishingProvisionCompletenessMapR8(branch),
    sourceId=finishingProvisionSourceIdR8(branch),packPath='data/estimate-benchmarks/source-packs/interior-wall-finishing-provision-group-r8.json',
    packSha=sha(packPath),input={[p(base.areaId)]:'20.1'},open=pack.requiredNeeds.map(n=>row('open-'+n.id));
  assert.equal(sha(parent.targetPreimage.path),parent.targetPreimage.sha256,'REVIEWED_CURRENT_TARGET_BYTES');
  const captured=JSON.parse(readFileSync(parent.targetPreimage.path,'utf8'));
  assert.equal(captured.catalogId,prior.catalogId);assert.equal(captured.sourceId,sourceId);
  assert.equal(captured.sets.newSource.rowCount,0,'NEW_WHOLE_SOURCE_PREIMAGE');
  for(const source of [...pack.sources,...pack.predecessorPins])assert.equal(sha(source.path),source.sha256,'PRIMARY_OR_PARENT_SOURCE:'+source.path);
  return {...prior,contract:pack.contract+'.'+branch,stopCode:'VGT_PROVISION_R8_'+branch.replaceAll('-','_').toUpperCase(),
    applicationName:'vgt-provision-r8-'+branch,sourceId,normId:'VGT_PROVISION_R8_'+branch.replaceAll('-','_').toUpperCase(),
    sourcePaths:[...prior.sourcePaths,packPath,'src/lib/estimate/v4/interiorWallFinishingProvisionGroupR8.ts',
      'src/lib/estimate/v4/interiorWallFinishingProvisionGroupR8.test.ts','src/lib/estimate/v4/normalHandPreparationDryingProfileR1.ts',
      'data/estimate-benchmarks/source-packs/normal-hand-preparation-drying-r1.json',
      'scripts/estimate/r4a13/prepareInteriorWallFinishingProvisionGroupR8.ts',parent.targetPreimage.path,...pack.sources.map(s=>s.path)],
    sourceMetadata:{...prior.sourceMetadata,artifact_sha256:packSha,
      exact_locator:prior.sourceMetadata.exact_locator+'; '+pack.sources.map(s=>s.id+': '+s.locatorRu).join('; ')},
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
    acceptanceInput:{...input,...d.runtimeInput},runtimeProfileInput:d.runtimeInput,
    runtimeProfileClassification:d.runtimeClassification,runtimeProfileSourceIds:d.runtimeSourceIds,
    expectedParentShape:[captured.sets.parameters.rowCount,captured.sets.formulas.rowCount,captured.sets.resources.rowCount],
    passport:{...prior.passport,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
    applicability:{...prior.applicability,selectedTechnology:pack.contract+'.'+branch,
      sourceTargetCaptureSha256:parent.targetPreimage.sha256,quantityNeeds:open.length,
      physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false},
    binding:{...prior.binding,additionalRowIds:[...(prior.binding.additionalRowIds??[]),row(pack.drying.existingResourceKey),row(pack.drying.supplyResourceKey)],
      applicability:{...prior.binding.applicability,exactProfile:pack.contract+'.'+branch,primaryEvidencePackSha256:packSha,fullTechnicalAcceptance:false}},
    locator:{key:'vgt-provision-r8-'+branch,payload:{sourcePack:pack,sourcePackSha256:packSha,sourceBranch:branch,
      targetCapture:parent.targetPreimage,fullTechnicalAcceptance:false}},
    search:{...prior.search,sourceProvenance:{...prior.search.sourceProvenance,sourcePackPath:packPath,
      sourcePackSha256:packSha,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false}},
    receiptFileStem:'vgt_provision_r8_'+branch.replaceAll('-','_'),
    verifyTargetPrecondition:async(client,phase)=>assert.deepEqual(await readMasterSuccessorTargetPreimageR1(client,
      {releaseId:parent.releaseId,catalogId:prior.catalogId,sourceId,lock:phase==='LOCKED_BEFORE'}),captured,
      'CURRENT_TARGET_OR_WHOLE_SOURCE_CHANGED'),
    verifyCore:async()=>{
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
      const result=await compileAutomaticConstructionOwnerR1({catalogId:prior.catalogId,compilerVersion:pack.contract,
        primaryMeasureParameterId:p(base.areaId),definition:d,submittedParameters:input});
      assert(result.rows.some(r=>r.row_id===row(pack.drying.supplyResourceKey)&&Number(r.quantity)>0));
      assert.deepEqual(result.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id).sort(),open.slice().sort());
      return{status:'PASS_WHOLE_SOURCE_WITH_FINITE_DRYING_AND_THREE_PHYSICAL_NEEDS',branch,
        shape:[d.parameters.length,d.formulas.length,d.resources.length],fullTechnicalAcceptance:false};
    }};
}
