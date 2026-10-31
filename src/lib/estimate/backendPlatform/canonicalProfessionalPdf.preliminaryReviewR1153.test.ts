import {assertCanonicalLegacyReviewSnapshotV1,canonicalProfessionalPdfReviewAcknowledgmentV1,
  assertCanonicalProfessionalPdfIssuanceV1,canonicalEstimateSavedOperationAcceptanceV1,
  assertCanonicalEstimateSavedArtifactStructureV1,assertCanonicalProfessionalPdfPurposeMatchesV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalProfessionalPdfProjection,CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
  assertCanonicalProfessionalPdfMoneyCells} from './canonicalProfessionalPdf';
import {buildCanonicalArtifactMetadata,canonicalProfessionalArtifactMetadataIdentityMatches,
  assertCanonicalProfessionalArtifactCurrentPresentationV1,selectCanonicalArtifactRows,canonicalArtifactFileIdentity} from './canonicalEstimateArtifactContract';
import type {CanonicalArtifactRow} from './canonicalEstimateArtifactContract';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
jest.unmock('./canonicalEstimateSavedOperationAcceptanceV1');
// Anonymized contract rows only: no customer snapshot, price, address, phone,
// source approval, physical norm, independent kit or completed work is asserted.
function fixture(){
 const revision={id:'test-review-revision',release_id:'test-review-release',definition_version_id:'test-review-definition',
  catalog_id:'test-review-catalog',checksum_sha256:'a'.repeat(64),row_count:2,currency_code:'KGS',
  created_at:'2026-10-29T00:00:00Z',revision_number:1,definition_withdrawal_reason:null,
  input_parameters:{},amendment_contract:{parameterSources:{userParameters:{},preliminaryNeeds:[]}}};
 const rows:CanonicalArtifactRow[]=['work','material'].map((id,ordinal)=>({revision_id:revision.id,row_id:id,ordinal,
  title_ru:id==='work'?'Укладка покрытия':'Покрытие пола',category:id==='work'?'work':'material',section:id==='work'?'labor':'materials',
  unit_id:'m2',quantity:'10',unit_price:'2',amount:'20',currency_code:'KGS',ownership_status:'OWNED',
  semantic_owner:revision.catalog_id+':'+id,physical_row_type:id==='work'?'labor':'material',row_sha256:'b'.repeat(64),
  procurement_eligible:id!=='work',included_in_estimate:true,included_in_procurement:id!=='work',
  calculation_trace:{resourceGraph:{semanticOwner:revision.catalog_id+':'+id,canonicalUnit:'m2',physicalRowType:id==='work'?'work':'material'}}}));
 const request={revisionId:revision.id,releaseId:revision.release_id,definitionVersionId:revision.definition_version_id,
  checksumSha256:revision.checksum_sha256,acknowledgedPreliminaryReview:true as const};
 const ack=()=>canonicalProfessionalPdfReviewAcknowledgmentV1({revision,resources:rows,request,actorUserId:'test-actor',acknowledgedAt:'2026-10-29T00:00:00Z'});
 return{revision,rows,request,ack};
}
const graph=(row:CanonicalArtifactRow)=>(row.calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph;
const trace=(row:CanonicalArtifactRow)=>row.calculation_trace as Record<string,unknown>;
test('unmocked review keeps the failed technical audit, saved bytes, prices and rows; no fake operations or FULL',()=>{
 expect(jest.isMockFunction(assertCanonicalEstimateSavedArtifactStructureV1)).toBe(false);
 const f=fixture(),before=JSON.stringify(f),audit=canonicalEstimateSavedOperationAcceptanceV1({revision:f.revision,resources:f.rows});
 expect(audit).toMatchObject({status:'STRUCTURE_INVALID',pdfAllowed:false,completeClaimAllowed:false});
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.rows})).toThrow();
 const ack=f.ack();expect(assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.rows,issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack})).toEqual(audit);
 const p=buildCanonicalProfessionalPdfProjection({revision:f.revision,rows:f.rows,workTitleRu:'Укладка покрытия',
  definitionVersionId:f.revision.definition_version_id,issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack});
 expect(p.rowCount).toBe(2);expect(p.html).toContain('Состав подработ и полнота обеспечения не подтверждены');
 expect(p.html).not.toContain('Состав операций проверен');expect(p.html).not.toContain('>Полная<');expect(p.html).toContain('Сохранённые позиции без подтверждённой подработы');
 expect(p.html).toContain('Итого по учтённым позициям');expect(p.html).toContain('Укладка покрытия');expect(p.html).toContain('Покрытие пола');
 expect(()=>assertCanonicalProfessionalPdfMoneyCells(p.html)).not.toThrow();expect(JSON.stringify(f)).toBe(before);
 expect(selectCanonicalArtifactRows(f.rows).professionalPdfRows).toEqual(f.rows);
});
test.each([
 ['amendment null',(f:ReturnType<typeof fixture>)=>{(f.revision as Record<string,unknown>).amendment_contract=null;}],
 ['parameterSources array',(f:ReturnType<typeof fixture>)=>{(f.revision.amendment_contract as Record<string,unknown>).parameterSources=[];}],
 ['graph null',(f:ReturnType<typeof fixture>)=>{trace(f.rows[0]!).resourceGraph=null;}],
 ['supplied null operation',(f:ReturnType<typeof fixture>)=>{graph(f.rows[0]!).operationCompositionV1=null;}],
 ['supplied malformed operation',(f:ReturnType<typeof fixture>)=>{graph(f.rows[0]!).operationCompositionV1={contractVersion:'bad'};}],
 ['supplied original operation',(f:ReturnType<typeof fixture>)=>{graph(f.rows[0]!).originalOperationCompositionV1={};}],
 ['supplied null descriptor',(f:ReturnType<typeof fixture>)=>{graph(f.rows[0]!).publicResourcePresentationV1=null;}],
 ['supplied null evidence',(f:ReturnType<typeof fixture>)=>{(f.revision.amendment_contract.parameterSources as Record<string,unknown>).operationCompositionEvidenceV1=null;}],
 ['object condition',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.need_state='CONDITION_REQUIRED';}],
 ['supply marker',(f:ReturnType<typeof fixture>)=>{trace(f.rows[0]!).purchaseSupplyBlocksV1=null;}],
 ['withdrawal',(f:ReturnType<typeof fixture>)=>{(f.revision as Record<string,unknown>).definition_withdrawal_reason='test-substantive-withdrawal';}],
 ['missing unit',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.unit_id='';}],
 ['unknown unit',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.unit_id='test-unknown-unit';}],
 ['graph unit drift',(f:ReturnType<typeof fixture>)=>{graph(f.rows[0]!).canonicalUnit='kg';}],
 ['invalid name',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.title_ru='';}],
 ['row parity',(f:ReturnType<typeof fixture>)=>{f.rows.pop();}],
 ['duplicate ID',(f:ReturnType<typeof fixture>)=>{f.rows[1]!.row_id=f.rows[0]!.row_id;}],
 ['duplicate ordinal',(f:ReturnType<typeof fixture>)=>{f.rows[1]!.ordinal=0;}],
 ['row from other revision',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.revision_id='another';}],
 ['foreign explicit owner',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.cost_owner_id='other';}],
 ['graph owner null',(f:ReturnType<typeof fixture>)=>{graph(f.rows[0]!).costOwnerId=null;}],
 ['duplicate semantic owner',(f:ReturnType<typeof fixture>)=>{f.rows[1]!.semantic_owner=f.rows[0]!.semantic_owner;graph(f.rows[1]!).semanticOwner=f.rows[0]!.semantic_owner;}],
 ['same foreign row and graph owner',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.semantic_owner='foreign:owner';graph(f.rows[0]!).semanticOwner='foreign:owner';}],
 ['graph foreign semantic owner',(f:ReturnType<typeof fixture>)=>{graph(f.rows[0]!).semanticOwner='foreign';}],
 ['unknown ownership',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.ownership_status='INVALID';}],
 ['excluded owner hidden by selection',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.ownership_status='MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL';}],
 ['procurement without eligibility',(f:ReturnType<typeof fixture>)=>{f.rows[1]!.procurement_eligible=false;}],
 ['NaN price',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.unit_price='NaN';}],
 ['service text in money',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.amount='Включено';}],
 ['nonpayable amount',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.included_in_estimate=false;}],
 ['null quantity with payment',(f:ReturnType<typeof fixture>)=>{f.rows[0]!.quantity=null;}],
] as const)('strict manual/source snapshot fails closed on %s without metadata synthesis',(_name,change)=>{const f=fixture();change(f);expect(()=>assertCanonicalLegacyReviewSnapshotV1({revision:f.revision,resources:f.rows})).toThrow();});
test('unknown numeric quantity stays visible and unpaid with no zero fill',()=>{
 const f=fixture();Object.assign(f.rows[0]!,{quantity:null,amount:null,included_in_estimate:false,included_in_procurement:false});
 const ack=f.ack();expect(ack.unknownQuantityCount).toBe(1);
 const p=buildCanonicalProfessionalPdfProjection({revision:f.revision,rows:f.rows,workTitleRu:'Покрытие',issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack});
 expect(p.html).toContain('Не рассчитано');expect(f.rows[0]!.quantity).toBeNull();expect(f.rows[0]!.amount).toBeNull();
});
test('review intent and audit digest bind exact saved tuple, separately from approval',()=>{
 const f=fixture();expect(()=>canonicalProfessionalPdfReviewAcknowledgmentV1({revision:f.revision,resources:f.rows,
  request:{...f.request,checksumSha256:'c'.repeat(64)},actorUserId:'test-actor',acknowledgedAt:'2026-10-29T00:00:00Z'})).toThrow();
 const ack=f.ack();for(const changed of [{...ack,auditSha256:'c'.repeat(64)},{...ack,unknownQuantityCount:1},{...ack,revisionId:'another'},{...ack,acknowledgedPreliminaryReview:false}]){
  expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.rows,issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:changed})).toThrow();
 }
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.rows,issuancePurpose:'UNKNOWN'})).toThrow();
});
test('mode identity, current renderer and signed-link purpose reject tampering while STANDARD old absence stays compatible',()=>{
 const f=fixture(),ack=f.ack();const metadata=buildCanonicalArtifactMetadata({operation:'professional_pdf',renderer:CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
  revision:f.revision,sourceRowCount:2,projectedRowCount:2,selectedProcurementRowCount:0,definitionVersionId:f.revision.definition_version_id,
  pageCount:1,grandTotalStatus:'COMPLETE',issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack});
 expect(canonicalProfessionalArtifactMetadataIdentityMatches({metadata,revision:f.revision})).toBe(true);
 expect(()=>assertCanonicalProfessionalArtifactCurrentPresentationV1({metadata,revision:f.revision,rendererVersion:CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,expectedIssuancePurpose:'PRELIMINARY_REVIEW'})).not.toThrow();
 expect(()=>assertCanonicalProfessionalArtifactCurrentPresentationV1({metadata,revision:f.revision,rendererVersion:CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION})).toThrow();
 expect(canonicalProfessionalArtifactMetadataIdentityMatches({metadata:{...metadata,templateVersion:'professional-estimate-pdf:5',reviewAcknowledgmentV1:undefined},revision:f.revision})).toBe(false);
 expect(canonicalProfessionalArtifactMetadataIdentityMatches({metadata:{templateVersion:'professional-estimate-pdf:5'},revision:f.revision})).toBe(true);
 const url=new URL('https://example.test/artifact-files/test?issuancePurpose=PRELIMINARY_REVIEW');
 expect(()=>assertCanonicalProfessionalPdfPurposeMatchesV1(metadata,url.searchParams.get('issuancePurpose'))).not.toThrow();
 url.searchParams.delete('issuancePurpose');expect(()=>assertCanonicalProfessionalPdfPurposeMatchesV1(metadata,url.searchParams.get('issuancePurpose')??undefined)).toThrow();
 expect(()=>assertCanonicalProfessionalPdfPurposeMatchesV1(metadata,'STANDARD')).toThrow();expect(()=>assertCanonicalProfessionalPdfPurposeMatchesV1({},undefined)).not.toThrow();
 expect(canonicalArtifactFileIdentity('professional_pdf',f.revision.checksum_sha256,'b'.repeat(64))).not.toBe(canonicalArtifactFileIdentity('professional_pdf',f.revision.checksum_sha256,'c'.repeat(64)));
});
test('SQL source retains original triggers and isolates both cache directions; actual rollback proof remains ROOT-owned',()=>{
 const sql=readFileSync(resolve(__dirname,'../../../../supabase/migrations/20261029110000_saved_professional_pdf_review_purpose.sql'),'utf8');
 expect(sql).not.toMatch(/(?:create|alter|drop)\s+(?:or\s+replace\s+)?(?:function\s+public\.estimate_enforce|trigger)/iu);
 expect(sql).toContain('ARTIFACT_PURPOSE_CONFLICT');expect(sql).toContain('session_user is distinct from v_database_owner');
 expect(sql).toContain('from public,anon,authenticated,service_role');expect(sql).toContain("'previousPresentation'");
});