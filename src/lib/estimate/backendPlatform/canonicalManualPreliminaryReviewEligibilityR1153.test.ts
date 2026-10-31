import {canonicalManualPreliminaryReviewEligibilityV1,assertCanonicalLegacyReviewSnapshotV1,
 canonicalEstimateSavedOperationAcceptanceV1,canonicalProfessionalPdfReviewAcknowledgmentV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import {canonicalEstimateRevisionDetailFromStorage} from './canonicalEstimateRevisionReadMapper';
import {buildCanonicalProfessionalPdfProjection} from './canonicalProfessionalPdf';
import type {CanonicalArtifactRow} from './canonicalEstimateArtifactContract';
jest.unmock('./canonicalEstimateSavedOperationAcceptanceV1');
// Anonymized schema-only rows. No private saved project, real prices, source
// approval or physical norm is copied into these tests.
function fixture(){
 const revision={id:'test-eligibility-revision',catalog_id:'test-catalog',release_id:'test-release',definition_version_id:'test-definition',
  checksum_sha256:'a'.repeat(64),row_count:1,input_parameters:{},price_snapshot_ids:[],definition_withdrawal_reason:null,
  amendment_contract:{parameterSources:{preliminaryNeeds:[]}},currency_code:'KGS'};
 const row:CanonicalArtifactRow={revision_id:revision.id,row_id:'test-row',ordinal:0,category:'work',section:'labor',title_ru:'Укладка покрытия',
  semantic_owner:revision.catalog_id+':test-row',physical_row_type:'labor',unit_id:'m2',quantity:'2',unit_price:null,amount:null,currency_code:'KGS',
  row_sha256:'b'.repeat(64),ownership_status:'OWNED',included_in_estimate:true,included_in_procurement:false,procurement_eligible:false,
  calculation_trace:{resourceGraph:{semanticOwner:revision.catalog_id+':test-row',physicalRowType:'work',canonicalUnit:'m2'}}};
 return{revision,resources:[row]};
}
const graph=(f:ReturnType<typeof fixture>)=>(f.resources[0]!.calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph;
test.each([['linear_m','lm'],['piece','pcs']] as const)('same registered code %s/%s retains source units, rows and audit without conversion',(stored,canonical)=>{
 const f=fixture();f.resources[0]!.unit_id=stored;graph(f).canonicalUnit=canonical;
 const before=JSON.stringify(f);expect(()=>assertCanonicalLegacyReviewSnapshotV1(f)).not.toThrow();
 const eligibility=canonicalManualPreliminaryReviewEligibilityV1(f);expect(eligibility).toMatchObject({eligible:true,status:'ELIGIBLE',unknownQuantityCount:0});
 const ack=canonicalProfessionalPdfReviewAcknowledgmentV1({...f,request:{revisionId:f.revision.id,releaseId:f.revision.release_id,
  definitionVersionId:f.revision.definition_version_id,checksumSha256:f.revision.checksum_sha256,acknowledgedPreliminaryReview:true},actorUserId:'test-user',acknowledgedAt:'2026-10-29T00:00:00Z'});
 expect(buildCanonicalProfessionalPdfProjection({revision:f.revision,rows:f.resources,workTitleRu:'Тест',issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack}).rowCount).toBe(1);
 expect(JSON.stringify(f)).toBe(before);expect(f.resources[0]!.unit_id).toBe(stored);
 expect(canonicalEstimateSavedOperationAcceptanceV1(f).pdfAllowed).toBe(false);
});
test.each([['m2','kg'],['m','mm'],['piece','set'],['m2',null]])('rejects non-equivalent/unknown supplied units %s/%s',(stored,canonical)=>{
 const f=fixture();f.resources[0]!.unit_id=stored;graph(f).canonicalUnit=canonical;
 expect(canonicalManualPreliminaryReviewEligibilityV1(f)).toMatchObject({eligible:false,status:'BLOCKED'});
});
test.each([['work','labor'],['transport','service']] as const)('preserves separate category/storage namespaces %s/%s',(category,stored)=>{
 const f=fixture();f.resources[0]!.category=category;f.resources[0]!.physical_row_type=stored;graph(f).physicalRowType=category;
 expect(()=>assertCanonicalLegacyReviewSnapshotV1(f)).not.toThrow();expect(canonicalManualPreliminaryReviewEligibilityV1(f).eligible).toBe(true);
});
test('unknown stored type and graph-vs-exact-saved-category mismatch remain blocked',()=>{
 const unknown=fixture();unknown.resources[0]!.physical_row_type='UNKNOWN';expect(canonicalManualPreliminaryReviewEligibilityV1(unknown).eligible).toBe(false);
 const mismatch=fixture();graph(mismatch).physicalRowType='material';expect(canonicalManualPreliminaryReviewEligibilityV1(mismatch).eligible).toBe(false);
});
test('the same STRUCTURE_INVALID header cannot grant eligibility for malformed/foreign/condition data',()=>{
 const good=fixture();expect(canonicalEstimateSavedOperationAcceptanceV1(good).status).toBe('STRUCTURE_INVALID');
 for(const mutate of [(f:ReturnType<typeof fixture>)=>{graph(f).operationCompositionV1=null;},
  (f:ReturnType<typeof fixture>)=>{f.resources[0]!.semantic_owner='foreign';graph(f).semanticOwner='foreign';},
  (f:ReturnType<typeof fixture>)=>{f.resources[0]!.need_state='CONDITION_REQUIRED';}]){
  const f=fixture();mutate(f);const before=JSON.stringify(f);expect(canonicalManualPreliminaryReviewEligibilityV1(f)).toMatchObject({eligible:false,status:'BLOCKED'});expect(JSON.stringify(f)).toBe(before);
 }
});
test('only current server environment DTO is exposed, with exact tuple/status/hash checks; stored client field is ignored',()=>{
 const f=fixture(),eligibility=canonicalManualPreliminaryReviewEligibilityV1(f),before=JSON.stringify(f);
 expect(eligibility.auditSha256).toMatch(/^[a-f0-9]{64}$/u);
 const view=canonicalEstimateRevisionDetailFromStorage(f.revision,{manualPreliminaryReviewEligibilityV1:eligibility});
 expect(view.manualPreliminaryReviewEligibilityV1).toEqual(eligibility);expect(view.checksumSha256).toBe(f.revision.checksum_sha256);
 expect(canonicalEstimateRevisionDetailFromStorage({...f.revision,manualPreliminaryReviewEligibilityV1:eligibility})).not.toHaveProperty('manualPreliminaryReviewEligibilityV1');
 for(const bad of [{...eligibility,checksumSha256:'b'.repeat(64)},{...eligibility,status:'BLOCKED' as const},{...eligibility,auditSha256:'bad'}])
  expect(()=>canonicalEstimateRevisionDetailFromStorage(f.revision,{manualPreliminaryReviewEligibilityV1:bad})).toThrow();
 expect(JSON.stringify(f)).toBe(before);
});