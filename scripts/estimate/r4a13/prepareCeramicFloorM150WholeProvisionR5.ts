import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareCeramicFloorM150WholeProvisionR4} from './prepareCeramicFloorM150WholeProvisionR4';
import {readMasterSuccessorTargetPreimageR1,validateIndependentCompletenessMapReferences,
  type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {ceramicFloorM150WholeProvisionDefinitionR5,ceramicFloorM150WholeProvisionCompletenessR5,
  ceramicFloorM150WholeProvisionPackR5 as pack,compileCeramicFloorM150WholeProvisionR5} from '../../../src/lib/estimate/v4/ceramicFloorM150HandDryingProvisionR5';
import {ceramicFloorM150SelectableFormatPackR1 as format} from '../../../src/lib/estimate/v4/ceramicFloorM150SelectableFormatR1';
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');

/** One same-catalog successor, preserving the combined default and all paid
 * owners. The sole publisher delivers the selector and shared drying together. */
export function prepareCeramicFloorM150WholeProvisionR5(parent:{releaseId:string;searchReleaseId:string;
  outputRoot:string;targetPreimage:{path:string;sha256:string}}):MasterSingleDefinitionSuccessorConfig {
  const historicPath='.release-runtime/r568/master28-confirmation-wave/target-preimages/floor.json',
    prior=prepareCeramicFloorM150WholeProvisionR4({...parent,targetPreimage:{path:historicPath,sha256:sha(historicPath)}}),
    d=ceramicFloorM150WholeProvisionDefinitionR5(),map=ceramicFloorM150WholeProvisionCompletenessR5(),
    packPath='data/estimate-benchmarks/source-packs/ceramic-floor-m150-hand-drying-provision-r5.json',packSha=sha(packPath),
    input={[pack.primaryParameterId]:'100',[pack.skirtingParameterId]:'50'},open=pack.remaining.map(n=>n.rowId),
    bound=d.resources.filter(r=>!open.includes(r.row_id)).map(r=>r.row_id);
  assert.equal(sha(parent.targetPreimage.path),parent.targetPreimage.sha256,'REVIEWED_CURRENT_TARGET_BYTES');
  const captured=JSON.parse(readFileSync(parent.targetPreimage.path,'utf8'));
  assert.equal(captured.catalogId,pack.catalogId);assert.equal(captured.sourceId,pack.publicationSourceId);
  assert.equal(captured.sets.newSource.rowCount,0,'NEW_WHOLE_SOURCE_PREIMAGE');
  for(const source of [...pack.primaryEvidence,...pack.sharedDependencyPins,...format.parentPins,format.source])
    assert.equal(sha(source.path),source.sha256,'PRIMARY_OR_PARENT_SOURCE:'+source.path);
  return {...prior,contract:pack.contract,stopCode:'CERAMIC_M150_WHOLE_PROVISION_R5',applicationName:'ceramic-m150-whole-provision-r5',
    sourceId:pack.publicationSourceId,normId:'KRER11_M150_WHOLE_PROVISION_R5',
    sourcePaths:[...prior.sourcePaths,packPath,'src/lib/estimate/v4/ceramicFloorM150HandDryingProvisionR5.ts',
      'src/lib/estimate/v4/ceramicFloorM150SelectableFormatR1.ts','src/lib/estimate/v4/ceramicFloorM150HandDryingProvisionR5.test.ts',
      'data/estimate-benchmarks/source-packs/ceramic-floor-m150-selectable-format-r1.json',
      'src/lib/estimate/v4/normalHandPreparationDryingProfileR1.ts','data/estimate-benchmarks/source-packs/normal-hand-preparation-drying-r1.json',
      'scripts/estimate/r4a13/prepareCeramicFloorM150WholeProvisionR5.ts',parent.targetPreimage.path,...pack.primaryEvidence.map(s=>s.path)],
    sourceMetadata:{...prior.sourceMetadata,artifact_sha256:packSha,
      exact_locator:prior.sourceMetadata.exact_locator+'; '+pack.primaryEvidence.map(s=>s.locatorRu).join('; ')},
    parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
    shortInput:input,acceptanceInput:{...input,...d.runtimeInput},runtimeProfileInput:d.runtimeInput,
    runtimeProfileClassification:d.runtimeClassification,runtimeProfileSourceIds:d.runtimeSourceIds,
    expectedParentShape:[captured.sets.parameters.rowCount,captured.sets.formulas.rowCount,captured.sets.resources.rowCount],
    passport:{...prior.passport,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
    applicability:{...prior.applicability,exactTargetPreimage:parent.targetPreimage,physicalResourceCoverageComplete:false,
      fullTechnicalAcceptance:false,unresolvedApplicableNeeds:open.length,sameCatalogSelectableFormats:format.choices.map(c=>c.value)},
    binding:{...prior.binding,rowId:bound[0]!,additionalRowIds:bound.slice(1),
      applicabilityByRowId:Object.fromEntries(d.resources.filter(r=>bound.includes(r.row_id)).map(r=>{
        const metadata:Record<string,unknown>=r.source_metadata??{};
        return[r.row_id,{sourceRole:metadata.sourceRole??'HISTORICAL_EXACT_02703',normativeTrace:metadata.normativeTrace??[],
          physicalProvisionAccepted:metadata.physicalProvisionAccepted??false}];})),
      applicability:{...prior.binding.applicability,primaryEvidencePackSha256:packSha,fullTechnicalAcceptance:false}},
    locator:{key:'ceramic-m150-whole-provision-r5',payload:{sourcePack:pack,sourcePackSha256:packSha,
      independentlyDeclaredMap:map,targetCapture:parent.targetPreimage,fullTechnicalAcceptance:false}},
    search:{...prior.search,keyDistinguishingParameters:[...prior.search.keyDistinguishingParameters,format.selectorId],
      clarificationFields:[...prior.search.clarificationFields,format.selectorId],sourceProvenance:{...prior.search.sourceProvenance,
        sourcePackPath:packPath,sourcePackSha256:packSha,unresolvedApplicableNeeds:open.length,
        fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false}},
    receiptFileStem:'ceramic_m150_whole_provision_r5',
    verifyTargetPrecondition:async(client,phase)=>assert.deepEqual(await readMasterSuccessorTargetPreimageR1(client,
      {releaseId:parent.releaseId,catalogId:pack.catalogId,sourceId:pack.publicationSourceId,lock:phase==='LOCKED_BEFORE'}),captured,
      'CURRENT_TARGET_OR_WHOLE_SOURCE_CHANGED'),
    verifyCore:async()=>{
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
      for(const choice of [null,...format.choices.map(c=>c.value)]){
        const result=await compileCeramicFloorM150WholeProvisionR5({...input,...(choice==null?{}:{[format.selectorId]:choice})});
        assert.equal(result.rows.find(r=>r.row_id.endsWith(':ready-mortar-m150-order'))?.quantity,'1.38');
        assert.equal(result.rows.find(r=>r.row_id===pack.drying.order.rowId)?.quantity,'120');
        assert.deepEqual(result.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED').map(n=>n.row_id).sort(),open.slice().sort());
      }
      return{status:'PASS_M150_THREE_FORMAT_CHOICES_WITH_FINITE_DRYING_AND_THREE_NEEDS',
        shape:[d.parameters.length,d.formulas.length,d.resources.length],fullTechnicalAcceptance:false};
    }};
}
