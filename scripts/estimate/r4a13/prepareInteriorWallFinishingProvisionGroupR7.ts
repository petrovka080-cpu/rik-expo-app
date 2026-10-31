import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareInteriorWallFinishingCrewGroupR4,type PublishedFinishingBranchR4} from './prepareInteriorWallFinishingCrewGroupR4';
import {readMasterSuccessorTargetPreimageR1,validateIndependentCompletenessMapReferences,
  type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {interiorWallFinishingProvisionGroupDefinitionR7,interiorWallFinishingProvisionCompletenessMapR7,
  interiorWallFinishingProvisionPackR7 as pack} from '../../../src/lib/estimate/v4/interiorWallFinishingProvisionGroupR7';
import {interiorWallFinishingGeometryPackR3 as base,interiorWallFinishingGeometryParameterR3 as p,
  interiorWallFinishingGeometryRowR3 as row} from '../../../src/lib/estimate/v4/interiorWallFinishingGeometryGroupR3';
import {interiorWallFinishingProvisionPackR6 as previousPack} from '../../../src/lib/estimate/v4/interiorWallFinishingProvisionGroupR6';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';

const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
export const finishingProvisionSourceIdR7=(branch:PublishedFinishingBranchR4)=>
  'interior_wall_vgt_provision_'+branch.replaceAll('-','_')+'_r7';

/** This descriptor reuses the accepted whole branch and the sole publisher.
 * Its fresh bounded preimage is repeated under that publisher's writer locks. */
export function prepareInteriorWallFinishingProvisionGroupR7(parent:{releaseId:string;searchReleaseId:string;
  outputRoot:string;targetPreimage:{path:string;sha256:string}},branch:PublishedFinishingBranchR4):MasterSingleDefinitionSuccessorConfig {
  const prior=prepareInteriorWallFinishingCrewGroupR4(parent,branch),d=interiorWallFinishingProvisionGroupDefinitionR7(branch),
    map=interiorWallFinishingProvisionCompletenessMapR7(branch),sourceId=finishingProvisionSourceIdR7(branch),
    packPath='data/estimate-benchmarks/source-packs/interior-wall-finishing-provision-group-r7.json',packSha=sha(packPath),
    input={[p(base.areaId)]:'20.1'},masterPath='C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19(2).txt';
  assert.equal(sha(parent.targetPreimage.path),parent.targetPreimage.sha256,'REVIEWED_CURRENT_TARGET_BYTES');
  const captured=JSON.parse(readFileSync(parent.targetPreimage.path,'utf8'));
  assert.equal(captured.catalogId,prior.catalogId);assert.equal(captured.sourceId,sourceId);
  assert.equal(captured.sets.newSource.rowCount,0,'NEW_COMPOSITE_SOURCE_PREIMAGE');
  for(const source of pack.sources)assert.equal(sha(source.path),source.sha256,'PRIMARY_SOURCE:'+source.id);
  return {...prior,contract:pack.contract+'.'+branch,stopCode:'VGT_PROVISION_R7_'+branch.replaceAll('-','_').toUpperCase(),
    applicationName:'vgt-provision-r7-'+branch,masterPath,masterSha256:sha(masterPath),sourceId,
    normId:'VGT_PROVISION_R7_'+branch.replaceAll('-','_').toUpperCase(),
    sourcePaths:[...prior.sourcePaths,packPath,'src/lib/estimate/v4/interiorWallFinishingProvisionGroupR7.ts',
      'src/lib/estimate/v4/interiorWallFinishingProvisionGroupR7.test.ts',
      'src/lib/estimate/v4/marlySkinNormalProvisionProfileR1.ts',
      'data/estimate-benchmarks/source-packs/marly-skin-normal-provision-r1.json',
      'scripts/estimate/r4a13/prepareInteriorWallFinishingProvisionGroupR7.ts',
      'src/lib/estimate/v4/interiorWallFinishingProvisionGroupR6.ts','data/estimate-benchmarks/source-packs/interior-wall-finishing-provision-group-r6.json',
      'src/lib/estimate/v4/normalHandPreparationProvisionProfileR1.ts','data/estimate-benchmarks/source-packs/normal-hand-preparation-provision-r1.json',parent.targetPreimage.path,...pack.sources.map(s=>s.path)],
    sourceMetadata:{...prior.sourceMetadata,artifact_sha256:packSha,
      exact_locator:prior.sourceMetadata.exact_locator+'; '+pack.sources.map(s=>s.id+': '+s.locatorRu).join('; ')},
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,acceptanceInput:{...input,...d.runtimeInput},
    runtimeProfileInput:d.runtimeInput,runtimeProfileClassification:d.runtimeClassification,runtimeProfileSourceIds:d.runtimeSourceIds,
    expectedParentShape:[captured.sets.parameters.rowCount,captured.sets.formulas.rowCount,captured.sets.resources.rowCount],
    passport:{...prior.passport,independentCompletenessMap:map,
      unresolvedApplicableResourceRowIds:pack.requiredNeeds.map(n=>row('open-'+n.id))},
    applicability:{...prior.applicability,selectedTechnology:pack.contract+'.'+branch,
      sourceTargetCaptureSha256:parent.targetPreimage.sha256,newQuantitativeComponents:pack.newQuantitativeComponents,
      quantityNeeds:pack.requiredNeeds.length,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false},
    binding:{...prior.binding,additionalRowIds:[...(prior.binding.additionalRowIds??[]),row(previousPack.skin.resourceKey),row(pack.cleanser.existingResourceKey),row(pack.cleanser.supplyResourceKey),row(pack.cleanser.dispenserResourceKey)],
      applicability:{...prior.binding.applicability,exactProfile:pack.contract+'.'+branch,primaryEvidencePackSha256:packSha,fullTechnicalAcceptance:false}},
    locator:{key:'vgt-provision-r7-'+branch,payload:{sourcePack:pack,sourcePackSha256:packSha,sourceBranch:branch,
      targetCapture:parent.targetPreimage,fullTechnicalAcceptance:false}},
    search:{...prior.search,sourceProvenance:{...prior.search.sourceProvenance,sourcePackPath:packPath,
      sourcePackSha256:packSha,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false}},
    receiptFileStem:'vgt_provision_r7_'+branch.replaceAll('-','_'),
    verifyTargetPrecondition:async(client,phase)=>assert.deepEqual(await readMasterSuccessorTargetPreimageR1(client,
      {releaseId:parent.releaseId,catalogId:prior.catalogId,sourceId,lock:phase==='LOCKED_BEFORE'}),captured,
      'CURRENT_TARGET_OR_COMPOSITE_SOURCE_CHANGED'),
    verifyCore:async()=>{
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
      const result=await compileAutomaticConstructionOwnerR1({catalogId:prior.catalogId,compilerVersion:pack.contract,
        primaryMeasureParameterId:p(base.areaId),definition:d,submittedParameters:input});
      assert.equal(result.rows.find(r=>r.row_id===row(previousPack.skin.resourceKey))?.quantity,'3');
      assert.equal(result.rows.find(r=>r.row_id===row(pack.cleanser.supplyResourceKey))?.quantity,'1');
      assert.deepEqual(result.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id).sort(),
        pack.requiredNeeds.map(n=>row('open-'+n.id)).sort());
      return{status:'PASS_WHOLE_SOURCE_WITH_HAND_PREPARATION_AND_FOUR_PHYSICAL_NEEDS',branch,
        shape:[d.parameters.length,d.formulas.length,d.resources.length],fullTechnicalAcceptance:false};
    }};
}
