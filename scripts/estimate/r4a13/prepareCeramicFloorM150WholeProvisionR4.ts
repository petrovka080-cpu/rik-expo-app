import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareCeramicFloorM150ResourceGroupSuccessorR2} from './prepareCeramicFloorM150ResourceGroupSuccessorR2';
import {readMasterSuccessorTargetPreimageR1,validateIndependentCompletenessMapReferences,
  type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {ceramicFloorM150WholeProvisionDefinitionR4,ceramicFloorM150WholeProvisionCompletenessR4,
  ceramicFloorM150WholeProvisionPackR4 as pack,compileCeramicFloorM150WholeProvisionR4} from '../../../src/lib/estimate/v4/ceramicFloorCementMortarWholeProvisionR4';
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');

/** Source successor over the accepted floor/skirting group. No new catalog,
 * calculation engine or writer; the same guarded publisher owns delivery. */
export function prepareCeramicFloorM150WholeProvisionR4(parent:{releaseId:string;searchReleaseId:string;
  outputRoot:string;targetPreimage:{path:string;sha256:string}}):MasterSingleDefinitionSuccessorConfig {
  const historicPath='.release-runtime/r568/next-wave/ceramic02703/r2-sources/parent4b2d-readonly.json',
    historic=JSON.parse(readFileSync(historicPath,'utf8')),
    prior=prepareCeramicFloorM150ResourceGroupSuccessorR2({releaseId:historic.parentReleaseId,
      searchReleaseId:historic.parentSearchReleaseId,outputRoot:parent.outputRoot,
      currentTargetPreimage:{path:historicPath,sha256:sha(historicPath)}}),
    d=ceramicFloorM150WholeProvisionDefinitionR4(),map=ceramicFloorM150WholeProvisionCompletenessR4(),
    packPath='data/estimate-benchmarks/source-packs/ceramic-floor-cement-mortar-whole-provision-r4.json',packSha=sha(packPath),
    masterPath='C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19(2).txt',
    input={[pack.parent.primaryParameterId]:'100',[pack.parent.skirtingLengthParameterId]:'50'},
    open=pack.actualRemaining.map(n=>n.rowId),bound=d.resources.filter(r=>!open.includes(r.row_id)).map(r=>r.row_id);
  assert.equal(sha(parent.targetPreimage.path),parent.targetPreimage.sha256,'REVIEWED_CURRENT_TARGET_BYTES');
  const captured=JSON.parse(readFileSync(parent.targetPreimage.path,'utf8'));
  assert.equal(captured.catalogId,pack.catalogId);assert.equal(captured.sourceId,pack.publicationSourceId);
  assert.equal(captured.sets.newSource.rowCount,0,'NEW_COMPOSITE_SOURCE_PREIMAGE');
  for(const source of pack.primaryEvidence)assert.equal(sha(source.path),source.sha256,'PRIMARY_SOURCE:'+source.path);
  return {...prior,contract:pack.contract,stopCode:'CERAMIC_M150_WHOLE_PROVISION_R4',applicationName:'ceramic-m150-whole-provision-r4',
    parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,
    masterPath,masterSha256:sha(masterPath),sourceId:pack.publicationSourceId,normId:'KRER11_M150_WHOLE_PROVISION_R4',
    sourcePaths:[...prior.sourcePaths,packPath,'src/lib/estimate/v4/ceramicFloorCementMortarWholeProvisionR4.ts',
      'src/lib/estimate/v4/ceramicFloorCementMortarWholeProvisionR4.test.ts',
      'src/lib/estimate/v4/marlySkinNormalProvisionProfileR1.ts','data/estimate-benchmarks/source-packs/marly-skin-normal-provision-r1.json',
      'src/lib/estimate/v4/ceramicFloorM150ExactFormatBranchesR1.ts','src/lib/estimate/v4/ceramicFloorM150ExactFormatBranchesR1.test.ts',
      'data/estimate-benchmarks/source-packs/ceramic-floor-m150-exact-format-branches-r1.json',
      'scripts/estimate/r4a13/prepareCeramicFloorM150WholeProvisionR4.ts',
      'src/lib/estimate/v4/ceramicFloorCementMortarWholeProvisionR3.ts','data/estimate-benchmarks/source-packs/ceramic-floor-cement-mortar-whole-provision-r3.json',
      'src/lib/estimate/v4/normalHandPreparationProvisionProfileR1.ts','data/estimate-benchmarks/source-packs/normal-hand-preparation-provision-r1.json',
      'src/lib/estimate/v4/ceramicFloorM150ExactFormatBranchesR2.ts',parent.targetPreimage.path,...pack.primaryEvidence.map(s=>s.path)],
    sourceMetadata:{...prior.sourceMetadata,artifact_sha256:packSha,
      exact_locator:prior.sourceMetadata.exact_locator+'; '+pack.primaryEvidence.map(s=>s.path+': '+s.locatorRu).join('; ')},
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:input,acceptanceInput:{...input,...d.runtimeInput},
    runtimeProfileInput:d.runtimeInput,runtimeProfileClassification:d.runtimeClassification,runtimeProfileSourceIds:d.runtimeSourceIds,
    expectedParentShape:[captured.sets.parameters.rowCount,captured.sets.formulas.rowCount,captured.sets.resources.rowCount],
    validationScenario:'WHOLE_M150_AND_MEASURED_SKIRTING_WITH_REUSED_44_TOOL_KIT_SKIN_PLAN_AND_FOUR_VISIBLE_PHYSICAL_NEEDS',
    passport:{...prior.passport,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
    applicability:{...prior.applicability,exactTargetPreimage:parent.targetPreimage,
      physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,unresolvedApplicableNeeds:open.length},
    binding:{...prior.binding,rowId:bound[0]!,additionalRowIds:bound.slice(1),
      applicabilityByRowId:Object.fromEntries(d.resources.filter(r=>bound.includes(r.row_id)).map(r=>[r.row_id,{
        sourceRole:r.source_metadata?.sourceRole??'HISTORICAL_EXACT_02703',
        normativeTrace:r.source_metadata?.normativeTrace??[],physicalProvisionAccepted:r.source_metadata?.physicalProvisionAccepted??false}])),
      applicability:{...prior.binding.applicability,primaryEvidencePackSha256:packSha,fullTechnicalAcceptance:false}},
    locator:{key:'ceramic-m150-whole-provision-r4',payload:{sourcePack:pack,sourcePackSha256:packSha,
      independentlyDeclaredMap:map,targetCapture:parent.targetPreimage,fullTechnicalAcceptance:false}},
    search:{...prior.search,sourceProvenance:{...prior.search.sourceProvenance,sourcePackPath:packPath,
      sourcePackSha256:packSha,unresolvedApplicableNeeds:open.length,fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false}},
    receiptFileStem:'ceramic_m150_whole_provision_r4',
    verifyTargetPrecondition:async(client,phase)=>assert.deepEqual(await readMasterSuccessorTargetPreimageR1(client,
      {releaseId:parent.releaseId,catalogId:pack.catalogId,sourceId:pack.publicationSourceId,lock:phase==='LOCKED_BEFORE'}),captured,
      'CURRENT_TARGET_OR_COMPOSITE_SOURCE_CHANGED'),
    verifyCore:async()=>{
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
      const result=await compileCeramicFloorM150WholeProvisionR4(input),q=(suffix:string)=>result.rows.find(r=>r.row_id.endsWith(suffix))?.quantity;
      assert.equal(q(':ready-mortar-m150-order'),'1.38');assert.equal(q(':r2:skirting-tile-order'),'50.5');
      assert.equal(result.rows.find(r=>r.row_id===pack.cleanser.order.rowId)?.quantity,'1');
      assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),open.slice().sort());
      return{status:'PASS_WHOLE_M150_SOURCE_WITH_SKIN_PROVISION_AND_FOUR_OPEN_NEEDS',shape:[d.parameters.length,d.formulas.length,d.resources.length],fullTechnicalAcceptance:false};
    }};
}
