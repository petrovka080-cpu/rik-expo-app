import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalArtifactPreliminaryNeeds,type CanonicalArtifactRow,type CanonicalArtifactRevision} from './canonicalEstimateArtifactContract';
import {canonicalProfessionalPdfReviewAcknowledgmentV1,canonicalProfessionalPdfReviewEligibilityV1,
 assertCanonicalProfessionalPdfIssuanceV1,canonicalProfessionalPdfReviewSnapshotDigestV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from './canonicalProfessionalPdf';
type R=Record<string,unknown>;
const hash=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');
const operation=(id='prepare',criterion='Проверочный этап завершён')=>({contractVersion:'canonical-operation-resource/v1' as const,
 groupId:'TEST_ONLY_REPORT',groupTitleRu:'Проверочная работа',operationId:id,operationTitleRu:'Этап '+id,
 completionCriterionRu:criterion,processRole:'PROCESS',processOrdinal:id==='prepare'?1:2});
const graph=(row:R)=>(row.calculation_trace as {resourceGraph:R}).resourceGraph;
/** Synthetic storage shapes test readability, never catalog/source admission. */
function fixture(){
 const revision:CanonicalArtifactRevision={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',
  definition_version_id:'33333333-3333-4333-8333-333333333333',catalog_id:'TEST_ONLY_REPORT',currency_code:'KGS',
  checksum_sha256:undefined,row_count:1,definition_withdrawal_reason:null,input_parameters:{},amendment_contract:{parameterSources:{preliminaryNeeds:[]}}};
 const row=(id:string,ordinal:number):CanonicalArtifactRow=>({row_id:id,ordinal,revision_id:revision.id,title_ru:'Труба '+id,
  physical_row_type:'material',category:'material',unit_id:'m',quantity:'2',unit_price:'5',amount:'10',currency_code:'KGS',
  semantic_owner:'TEST_ONLY:'+id,ownership_status:'OWNED',included_in_estimate:true,included_in_procurement:true,procurement_eligible:true,
  calculation_trace:{resourceGraph:{semanticOwner:'TEST_ONLY:'+id,costOwner:'resource',costTreatment:'OWN_COST',
   operationCompositionV1:{...operation(),additionalOperations:[operation('fit')]},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:'Труба '+id,
    nameRu:'Труба '+id,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:'MATERIAL'}}}});
 const rows=[row('a',0)],needs:R[]=[{row_id:'need:a',ordinal:1,resource_spec_id:'TEST_ONLY:need',section:'Материалы',category:'material',
  title_ru:'Неуточнённый материал',unit_id:'l',quantity:null,unit_price:null,need_state:'CONDITION_REQUIRED',
  missing_parameter_ids:['TEST_ONLY:object-condition'],selected:true,procurement_eligible:true,formula_id:'TEST_ONLY:formula',
  calculation_trace:{preliminaryNeed:true,needState:'CONDITION_REQUIRED',unresolvedConditionParameterIds:['TEST_ONLY:object-condition'],
   resourceGraph:{costTreatment:'OWN_COST',operationCompositionV1:operation()}}}];
 const rehash=()=>{
  for(const r of rows){const{row_sha256:_sha,...body}=r;r.row_sha256=hash(body);}
  for(const n of needs){const{need_sha256:_sha,...body}=n;n.need_sha256=hash(body);}
  revision.row_count=rows.length;(revision.amendment_contract as {parameterSources:R}).parameterSources.preliminaryNeeds=needs;
  revision.checksum_sha256=hash({rows,needs});
 };
 rehash();
 const resources=()=>[...rows,...canonicalArtifactPreliminaryNeeds(revision,{issuancePurpose:'PRELIMINARY_REVIEW'})];
 const request=()=>({revisionId:revision.id,releaseId:revision.release_id,definitionVersionId:revision.definition_version_id,
  checksumSha256:revision.checksum_sha256,acknowledgedPreliminaryReview:true});
 const ack=()=>canonicalProfessionalPdfReviewAcknowledgmentV1({revision,resources:resources(),request:request(),
  actorUserId:'TEST_ONLY_OWNER',acknowledgedAt:'2026-10-29T00:00:00Z'});
 const pdf=()=>buildCanonicalProfessionalPdfProjection({revision,rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision,{issuancePurpose:'PRELIMINARY_REVIEW'}),
  workTitleRu:'Проверочная работа',issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack()});
 return{revision,rows,needs,row,rehash,resources,request,ack,pdf};
}
test.each(['QUANTITY_REQUIRED','CONDITION_REQUIRED','SUPPLY_CONFIRMATION_REQUIRED'])
 ('readable report preserves %s without approval, zero filling or STANDARD admission',state=>{
 const f=fixture();f.needs[0]!.need_state=state;f.rehash();const before=JSON.stringify(f),p=f.pdf();
 expect(canonicalProfessionalPdfReviewEligibilityV1({revision:f.revision,resources:f.resources()})).toMatchObject({eligible:true,status:'ELIGIBLE'});
 expect(p.html).toContain('Не рассчитано');expect(p.html).toContain('Что требует проверки');expect(p.html).not.toContain('class="approval-block"');
 expect(p.html).not.toContain('Утвердил');expect(p.grandTotalStatus).not.toBe('COMPLETE');
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.resources()})).toThrow();
 expect(JSON.stringify(f)).toBe(before);expect(()=>assertCanonicalProfessionalPdfMoneyCells(p.html)).not.toThrow();
});
test('zero ordinary rows and all unknown needs remain a readable exact report',()=>{
 const f=fixture();f.rows.splice(0);f.rehash();const p=f.pdf();
 expect(p.rowCount).toBe(1);expect(p.preliminaryNeedCount).toBe(1);expect(p.html).toContain('Не рассчитано');
});
test('valid shared stage bindings retain one ID/number/quantity/price and exactly one saved amount',()=>{
 const f=fixture();f.needs.splice(0);f.rehash();const before=JSON.stringify(f),p=f.pdf();
 expect(p.html.match(/<strong>Труба a<\/strong>/gu)).toHaveLength(2);
 expect(p.html.match(/class="money">10,00 сом<\/td>/gu)).toHaveLength(1);
 expect(p.html.match(/class="number">1<\/td>/gu)).toHaveLength(2);
 expect(JSON.stringify(f)).toBe(before);
});
test('conflicting stage reference is unassigned while an independent valid stage and one payment survive',()=>{
 const f=fixture();f.needs.splice(0);const second=f.row('b',1);
 graph(second).operationCompositionV1=operation('prepare','Другой явно сохранённый критерий');f.rows.push(second);f.rehash();
 const before=JSON.stringify(f),p=f.pdf();
 expect(p.html).toContain('Сохранённые позиции без подтверждённой подработы');expect(p.html).toContain('Этап fit');
 expect(p.html.match(/class="money">10,00 сом<\/td>/gu)).toHaveLength(2);expect(p.html).not.toContain('undefined');
 expect(JSON.stringify(f)).toBe(before);
});
test('foreign saved completeness map remains diagnostic and never manufactures its absent rows',()=>{
 const f=fixture(),ps=(f.revision.amendment_contract as {parameterSources:R}).parameterSources;
 ps.operationCompositionEvidenceV1={contractVersion:'canonical-operation-composition-evidence/v1',releaseId:f.revision.release_id,
  definitionVersionId:f.revision.definition_version_id,mapSha256:'f'.repeat(64),sourcePassportPayloadSha256:'e'.repeat(64),
  independentComposition:{entries:[{operationId:'foreign',resolution:{kind:'ROW',rowId:'FOREIGN_NOT_SAVED'}}]}};
 f.rehash();const before=JSON.stringify(f),p=f.pdf();expect(p.html).not.toContain('FOREIGN_NOT_SAVED');
 expect(p.html).toContain('незавершённые проверки');expect(JSON.stringify(f)).toBe(before);
});
test.each(['quantity','price','amount','unit','descriptor','rental','supply','selection'])('incomplete or invalid saved %s becomes a warning and safe display',field=>{
 const f=fixture(),r=f.rows[0]!;
 if(field==='quantity')r.quantity='NaN';if(field==='price')r.unit_price='служебный текст';if(field==='amount')r.amount='неизвестно';
 if(field==='unit')r.unit_id=null;if(field==='descriptor')graph(r).publicResourcePresentationV1=null;
 if(field==='rental'){graph(r).supplyMode='RENTAL_RETURNABLE';graph(r).returnable=true;}
 if(field==='supply')(r.calculation_trace as R).purchaseSupplyBlocksV1={malformed:true};
 if(field==='selection')graph(r).compositionSelectionDecisionV1={excludedOperationKeys:{malformed:true}};
 f.rehash();const before=JSON.stringify(f),p=f.pdf();expect(()=>assertCanonicalProfessionalPdfMoneyCells(p.html)).not.toThrow();
 expect(p.html).not.toMatch(/class="money">(?:NaN|неизвестно|служебный текст)/u);expect(JSON.stringify(f)).toBe(before);
});
test('ambiguous financial owner suppresses amounts instead of a duplicate payment or invented total',()=>{
 const f=fixture();f.needs.splice(0);const b=f.row('b',1);b.semantic_owner=f.rows[0]!.semantic_owner;f.rows.push(b);f.rehash();
 const p=f.pdf();expect(p.html).toContain('Владелец оплаты');expect(p.html).not.toContain('class="money">10,00 сом</td>');
 expect(p.html).toContain('Итог не подтверждён');
});
test('saved process notes and calculation records keep stable printed numbers without undefined or invented units',()=>{
 const f=fixture();f.needs.splice(0);
 for(const [index,kind] of ['PROCESS_NOTE','CALCULATION_DETAIL'].entries()){
  const r=f.row('info-'+index,index+1);r.quantity=null;r.unit_id='';r.unit_price=null;r.amount=null;
  r.included_in_estimate=false;r.included_in_procurement=false;r.procurement_eligible=false;r.ownership_status='OWNED_EXCLUDED';
  graph(r).costTreatment='INFORMATIONAL_SCOPE';
  graph(r).publicResourcePresentationV1={contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,
   nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[],rowKind:kind};
  f.rows.push(r);
 }
 f.rehash();const p=f.pdf();expect(p.rowCount).toBe(3);expect(p.html).not.toContain('undefined');
 expect(p.html).toContain('class="number">2</td>');expect(p.html).toContain('class="number">3</td>');
 expect(p.html).toContain('class="unit"></td>');
});
test.each([undefined,null,'BROKEN'])('missing currency and malformed supplied currency remain distinct: %s',currency=>{
 const f=fixture(),r=f.rows[0]!;
 if(currency===undefined)delete r.currency_code;else r.currency_code=currency;
 f.rehash();const p=f.pdf();
 if(currency!==undefined){expect(p.html).toContain('валюта не распознана');expect(p.html).not.toContain('class="money">5,00 сом</td>');}
 else expect(p.html).toContain('class="money">5,00 сом</td>');
});
test('a saved foreign currency stays explicit and never becomes a revision-currency subtotal',()=>{
 const f=fixture();f.rows[0]!.currency_code='USD';f.rehash();const p=f.pdf();
 expect(p.html).toContain('class="money">5,00 USD</td>');expect(p.html).not.toContain('class="money">10,00 USD</td>');
 expect(p.html).toContain('валюта части позиций не подтверждены');
});
test('supplied malformed raw-need currency cannot be masked by the preliminary adapter',()=>{
 const f=fixture();f.needs[0]!.unit_price='7';f.needs[0]!.currency_code='INVALID';f.rehash();const p=f.pdf();
 expect(p.html).toContain('валюта не распознана');expect(p.html).not.toContain('class="money">7,00 сом</td>');
});
test('withdrawn source is readable with explicit restriction while STANDARD still fails closed',()=>{
 const f=fixture();f.revision.definition_withdrawal_reason='TEST_ONLY источник отозван';const p=f.pdf();
 expect(p.html).toContain('Источник отозван или ограничен');expect(p.html).toContain('Применение расчёта не разрешено');
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.resources()})).toThrow(expect.objectContaining({code:'REVISION_CONTENT_QUARANTINED'}));
});
test.each(['duplicate ID','wrong count','wrong tuple','need hash','row hash'])('unreadable identity/capture %s is not fabricated into a report',field=>{
 const f=fixture();
 if(field==='duplicate ID'){f.rows.push({...f.rows[0]!});f.rehash();}
 if(field==='wrong count')f.revision.row_count=99;
 if(field==='wrong tuple')f.rows[0]!.revision_id='FOREIGN';
 if(field==='need hash')f.needs[0]!.need_sha256='0'.repeat(64);
 if(field==='row hash')f.rows[0]!.row_sha256='broken';
 expect(()=>f.ack()).toThrow(expect.objectContaining({code:'ARTIFACT_SAVED_SNAPSHOT_UNREADABLE'}));
});
test('request and raw snapshot digest bind exact selected bytes even when presentation is tolerant',()=>{
 const f=fixture(),ack=f.ack(),digest=canonicalProfessionalPdfReviewSnapshotDigestV1({revision:f.revision,resources:f.resources()});
 f.revision.definition_withdrawal_reason='TEST_ONLY changed source restriction';
 expect(canonicalProfessionalPdfReviewSnapshotDigestV1({revision:f.revision,resources:f.resources()})).not.toBe(digest);
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.resources(),issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack})).toThrow();
});

// ROOT supplies this private read-only file only for the approved ten UI cases.
// It is never copied into the repository, CI fixture or test failure output.
const externalPath=process.env.GOX_REPORT_SAVED_SNAPSHOTS_PATH;
if(externalPath){
 const bytes=readFileSync(externalPath);
 if(createHash('sha256').update(bytes).digest('hex')!=='b2ab4bddbcac870b4595197cde0c600f4e41a3139e6b5d12713a71876e0d1ada')
  throw new Error('PRIVATE_REPORT_SNAPSHOTS_PIN_MISMATCH');
 const saved=JSON.parse(bytes.toString('utf8')) as {revision:CanonicalArtifactRevision;resources:CanonicalArtifactRow[]|null}[];
 if(saved.length!==10)throw new Error('PRIVATE_REPORT_EXPECTED_TEN_CASES');
 for(const [index,s] of saved.entries())test('ROOT approved saved report case '+(index+1)+' is readable without mutation',()=>{
  const before=JSON.stringify(s),ordinary=s.resources??(s.revision.row_count===0?[]:null);
  if(!ordinary)throw new Error('PRIVATE_REPORT_ROW_COUNT_REQUIRES_RESOURCE_CAPTURE');
  const needs=canonicalArtifactPreliminaryNeeds(s.revision,{issuancePurpose:'PRELIMINARY_REVIEW'}),resources=[...ordinary,...needs];
  const eligibility=canonicalProfessionalPdfReviewEligibilityV1({revision:s.revision,resources});
  expect(eligibility.eligible).toBe(true);
  const ack=canonicalProfessionalPdfReviewAcknowledgmentV1({revision:s.revision,resources,actorUserId:'ROOT_PRIVATE_TEST_OWNER',acknowledgedAt:'2026-10-29T00:00:00Z',
   request:{revisionId:s.revision.id,releaseId:s.revision.release_id,definitionVersionId:s.revision.definition_version_id,
    checksumSha256:s.revision.checksum_sha256,acknowledgedPreliminaryReview:true}});
  const p=buildCanonicalProfessionalPdfProjection({revision:s.revision,rows:ordinary,preliminaryNeeds:needs,workTitleRu:'Сохранённая работа',
   issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack});
  expect(p.rowCount).toBe(ordinary.length+needs.length);expect(p.html.includes('Что требует проверки')).toBe(true);
  expect(p.html.includes('Утвердил')).toBe(false);expect(()=>assertCanonicalProfessionalPdfMoneyCells(p.html)).not.toThrow();
  expect(JSON.stringify(s)===before).toBe(true);
 });
}else test.skip('ROOT private ten saved snapshots require the explicit pinned external input',()=>{});
