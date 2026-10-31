import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareInteriorWallFinishingGeometryGroupR3} from './prepareInteriorWallFinishingGeometryGroupR3';
import {readMasterSuccessorTargetPreimageR1,validateIndependentCompletenessMapReferences,
 type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {interiorWallFinishingCrewGroupDefinitionR4,interiorWallFinishingCrewCompletenessMapR4,
 interiorWallFinishingCrewPackR4 as pack} from '../../../src/lib/estimate/v4/interiorWallFinishingCrewGroupR4';
import {interiorWallFinishingGeometryPackR3 as base,interiorWallFinishingGeometryParameterR3 as p,
 interiorWallFinishingGeometryRowR3 as row} from '../../../src/lib/estimate/v4/interiorWallFinishingGeometryGroupR3';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';

export type PublishedFinishingBranchR4='improved-wall-01'|'deep-primer-00603';
const guards={
 'improved-wall-01':{sha256:'5f31ad5eefc47ec8d76af0ac80cf38ecc1f169d5ad77ea6c0a0db74a4030b538',sourceId:'interior_wall_vgt_crew_improved_01_r4'},
 'deep-primer-00603':{sha256:'06944d82531dee3d5d24c4ad82af92940eea3be3250eb2bdbca3122accb791c4',sourceId:'interior_wall_vgt_crew_deep_primer_00603_r4'},
} as const;
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');

export function prepareInteriorWallFinishingCrewGroupR4(parent:{releaseId:string;searchReleaseId:string;outputRoot:string},
 branch:PublishedFinishingBranchR4='improved-wall-01'):MasterSingleDefinitionSuccessorConfig {
 assert(Object.hasOwn(guards,branch),'ONLY_REVIEWED_CURRENT_CATALOG_BRANCHES');
 const prior=prepareInteriorWallFinishingGeometryGroupR3(parent),selected=pack.branches.find(b=>b.id===branch)!,guard=guards[branch],
  definition=interiorWallFinishingCrewGroupDefinitionR4(branch),map=interiorWallFinishingCrewCompletenessMapR4(branch),
  path='data/estimate-benchmarks/source-packs/interior-wall-finishing-crew-group-r4.json',packSha=sha(path),
  capturePath=`.release-runtime/r568/interior-wall-finishing-crew-r4/current-guards/${branch}.json`,
  input={[p(base.areaId)]:'20.1'},scope=branch==='improved-wall-01'?base.physicalScopeRu:
   'Однократное грунтование готовой ровной штукатурки стен VGT ВД-АК 0301, один последовательный ручной пост до3,5м.',
  excluded=branch==='improved-wall-01'?base.excludedRu:[...base.excludedRu,'Шпаклевание, шлифование и окраска стен.'],
  orderKeys=branch==='improved-wall-01'?['preputty-primer-order','ready-putty-order','primer-order','paint-order']:['preputty-primer-order'],
  open=['ordinary-access','ordinary-accompanying','open-access','open-washing-water','open-ppe','open-handling-profile'].map(row),
  physicalNeeds=['open-washing-water','open-ppe','open-handling-profile'].map(row);
 assert.equal(sha(capturePath),guard.sha256,'EXACT_REVIEWED_TARGET_CAPTURE');
 const captured=JSON.parse(readFileSync(capturePath,'utf8'));
 assert.equal(captured.catalogId,selected.catalogId);assert.equal(captured.sourceId,guard.sourceId);assert.equal(captured.sets.newSource.rowCount,0);
 for(const source of pack.sources)assert.equal(sha(source.path),source.sha256,source.id);
 return {...prior,contract:pack.contract+'.'+branch,stopCode:'INTERIOR_WALL_FINISHING_CREW_R4_'+branch.replaceAll('-','_').toUpperCase(),
  applicationName:'interior-wall-finishing-crew-r4-'+branch,catalogId:selected.catalogId,sourceId:guard.sourceId,
  normId:'VGT_CREW_R4_'+selected.normId.replaceAll('-','_'),
  sourcePaths:[...prior.sourcePaths,path,'src/lib/estimate/v4/interiorWallFinishingCrewGroupR4.ts',
   'src/lib/estimate/v4/interiorWallFinishingCrewGroupR4.test.ts','scripts/estimate/r4a13/prepareInteriorWallFinishingCrewGroupR4.ts',
   capturePath,...pack.sources.map(s=>s.path)],
  sourceMetadata:{source_title:selected.titleRu,source_authority:'КРЕР15; VGT; типовые профили ручного звена; паспорта KRAUSE/3M.',
   source_kind:'COMPOSITE_PRIMARY_SOURCE_GEOMETRY',artifact_sha256:packSha,official_url:null,
   exact_locator:pack.sources.map(s=>s.id+': '+s.locatorRu).join('; '),use_restriction:scope},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:input,acceptanceInput:input,runtimeProfileInput:definition.runtimeInput,
  runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,
  expectedParentShape:[captured.sets.parameters.rowCount,captured.sets.formulas.rowCount,captured.sets.resources.rowCount],
  passport:{canonicalRuName:selected.titleRu,workKey:selected.catalogId.split(':').at(-1)!,physicalResultRu:scope,
   includedScopeRu:[scope],excludedScopeRu:excluded,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:physicalNeeds},
  applicability:{...prior.applicability,primaryMeasureParameterId:p(base.areaId),selectedTechnology:pack.contract+'.'+branch,
   sourceBranch:branch,ordinaryObjectFactBudget:1,requiredNonGeometryTechnicalQuestions:0,
   selectedScopeQuantitiesComplete:false,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,
   quantityNeeds:3,conditionNeeds:3,wholeSubworkReuse:selected.normId,sourceTargetCaptureSha256:guard.sha256},
  binding:{rowId:row('whole-work'),additionalRowIds:orderKeys.map(row),
   applicability:{exactProfile:pack.contract+'.'+branch,primaryEvidencePackSha256:packSha,fullTechnicalAcceptance:false}},
  locator:{key:'vgt-crew-r4-'+branch,payload:{sourcePack:pack,sourcePackSha256:packSha,sourceBranch:branch,
   targetCapture:{path:capturePath,sha256:guard.sha256},fullTechnicalAcceptance:false}},
  search:{...prior.search,canonicalNameRu:selected.titleRu,aliases:[selected.titleRu,'VGT '+selected.normId],
   shortScopeRu:scope,includedBoundaries:[scope],excludedBoundaries:excluded,
   sourceProvenance:{sourcePackPath:path,sourcePackSha256:packSha,sourceBranch:branch,
    fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,requiredNonGeometryTechnicalQuestions:0}},
  receiptFileStem:'vgt_crew_r4_'+branch.replaceAll('-','_'),
  verifyTargetPrecondition:async(client,phase)=>assert.deepEqual(await readMasterSuccessorTargetPreimageR1(client,
   {releaseId:parent.releaseId,catalogId:selected.catalogId,sourceId:guard.sourceId,lock:phase==='LOCKED_BEFORE'}),captured,
   'EXACT_TARGET_AND_REGISTRY_CHANGED_BEFORE_PUBLICATION'),
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
   const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:selected.catalogId,
    compilerVersion:pack.contract,primaryMeasureParameterId:p(base.areaId),definition,submittedParameters}),result=await compile(input);
   assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),open.slice().sort());
   const q=(key:string)=>result.rows.find(r=>r.row_id===row(key))?.quantity;
   assert.equal(q('preputty-primer-order'),'3');assert.equal(q('workers-preputty'),'1.31655');
   if(branch==='improved-wall-01'){assert.equal(q('ready-putty-order'),'29');assert.equal(q('paint-order'),'7.5');assert.equal(q('workers'),'8.75556');}
   else{assert.equal(q('workers-total'),'1.31655');assert.equal(q('workers'),undefined);assert.equal(q('ready-putty-order'),undefined);}
   const zero=await compile({[p(base.areaId)]:0});assert.equal(zero.rows.length,0);assert.equal(zero.preliminaryNeeds.length,0);
   return{status:'PASS_FINISHING_WHOLE_BRANCH_WITH_EXPLICIT_REMAINING_NEEDS',branch,operations:selected.operationIds.length,
    shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],physicalNeeds:3,conditionNeeds:3,
    fullTechnicalAcceptance:false};
  }};
}
