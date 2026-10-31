import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,
  assertCanonicalEstimateSavedArtifactStructureV1,canonicalProfessionalPdfReviewAcknowledgmentV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from './canonicalProfessionalPdf';
import {canonicalEstimateResourceOperationSections} from './canonicalEstimateOperationComposition';
import {selectCanonicalArtifactRows,type CanonicalArtifactRow} from './canonicalEstimateArtifactContract';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';

jest.unmock('./canonicalEstimateSavedOperationAcceptanceV1');
// Anonymized shared-contract fixture only. Neither this passport object nor its
// self-hash is a real source approval, technology, object fact, norm or DB proof.
// Different stages own different rows; only the measuring tool has two consumers.
function fixture(){
 const operations=[
  {contractVersion:'canonical-operation-resource/v1',groupId:'test-process',groupTitleRu:'Проверочная работа',
   operationId:'test-prepare',operationTitleRu:'Подготовить проверочный участок',completionCriterionRu:'Участок подготовлен',processRole:'PROCESS',processOrdinal:1},
  {contractVersion:'canonical-operation-resource/v1',groupId:'test-process',groupTitleRu:'Проверочная работа',
   operationId:'test-finish',operationTitleRu:'Завершить проверочный участок',completionCriterionRu:'Участок завершён',processRole:'PROCESS',processOrdinal:2},
 ];
 const classes=[['MATERIAL','Материал'],['CONSUMABLE','Расходный материал'],['TOOL','Измерительный инструмент'],
  ['ACCESSORY','Оснастка'],['EQUIPMENT','Оборудование'],['MECHANISM','Механизм'],['LABOR','Труд монтажника'],
  ['SERVICE','Услуга'],['TRANSPORT','Доставка'],['PPE','Средства защиты']] as const;
 const revision={id:'test-grouped-revision',catalog_id:'test-grouped-catalog',release_id:'test-grouped-release',
  definition_version_id:'test-grouped-definition',checksum_sha256:'a'.repeat(64),row_count:19,currency_code:'KGS',
  created_at:'2026-10-29T00:00:00Z',revision_number:1,definition_withdrawal_reason:null,input_parameters:{},
  amendment_contract:{parameterSources:{} as Record<string,unknown>}};
 const rows:CanonicalArtifactRow[]=operations.flatMap((op,stage)=>classes.flatMap(([kind,label])=>{
  if(kind==='TOOL'&&stage===1)return [];
  const id=kind==='TOOL'?'test-shared-tool':`test-${stage}-${kind}`,title=kind==='TOOL'?label:`${label} ${stage===0?'первого':'второго'} этапа`,
   unit=kind==='LABOR'?'man_hour':kind==='TRANSPORT'?'trip':'piece',
   category=kind==='LABOR'?'labor':kind==='TRANSPORT'?'transport':kind==='SERVICE'?'service':
    ['MATERIAL','CONSUMABLE','PPE'].includes(kind)?'material':'equipment';
  return [{revision_id:revision.id,row_id:id,ordinal:0,title_ru:title,category,section:'resources',
   quantity:'3',unit_id:unit,unit_price:'2',amount:'6',currency_code:'KGS',ownership_status:'OWNED',
   semantic_owner:revision.catalog_id+':'+id,procurement_eligible:kind!=='LABOR',
   included_in_estimate:true,included_in_procurement:kind!=='LABOR',row_sha256:'b'.repeat(64),
   calculation_trace:{resourceGraph:{semanticOwner:revision.catalog_id+':'+id,canonicalUnit:unit,
    operationCompositionV1:kind==='TOOL'?{...op,additionalOperations:[operations[1]]}:op,
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:title,
     nameRu:title,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:kind}}}}];
 }));
 rows.forEach((row,index)=>{row.ordinal=index;});
 const graph=(row:CanonicalArtifactRow)=>(row.calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph;
 const idsFor=(operationId:string,kind:string)=>rows.filter(row=>{
  const g=graph(row),p=g.publicResourcePresentationV1 as {resourceKind:string},op=g.operationCompositionV1 as typeof operations[number];
  return p.resourceKind===kind&&(op.operationId===operationId||row.row_id==='test-shared-tool');
 }).map(row=>String(row.row_id));
 const map={contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',
  generatedFromCurrentRows:false,evidenceSha256:'e'.repeat(64),operationRoster:operations,
  entries:rows.map(row=>{const g=graph(row),op=g.operationCompositionV1 as typeof operations[number],
   presentation=g.publicResourcePresentationV1 as {resourceKind:string};return {
   operationId:op.operationId,expectedResourceId:String(row.row_id),condition:'Синтетический контракт двух этапов',
   sourceId:'TEST_ONLY_SOURCE',requiredOperationIds:row.row_id==='test-shared-tool'?operations.map(o=>o.operationId):[op.operationId],
   publicNameRu:row.title_ru,resourceKind:presentation.resourceKind,resolution:{kind:'ROW',rowId:row.row_id}};}),
  operationRequirements:operations.map(op=>({operationId:op.operationId,sourceId:'TEST_ONLY_SOURCE',
   requirements:Object.fromEntries(classes.map(([kind])=>[kind,{status:'REQUIRED',rowIds:idsFor(op.operationId,kind)}]))}))};
 const passport={definition_version_id:revision.definition_version_id,payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:map}};
 const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:revision.release_id,
  definitionVersionId:revision.definition_version_id,passport})!;
 revision.amendment_contract.parameterSources.operationCompositionEvidenceV1=evidence;
 revision.checksum_sha256=canonicalEstimateSha256HexText(canonicalEstimateStableJson({rows,evidence}));
 return{revision,rows,operations,map,passport,evidence,graph};
}
const render=(f:ReturnType<typeof fixture>)=>buildCanonicalProfessionalPdfProjection({revision:f.revision,rows:f.rows,
 workTitleRu:'Проверочная работа',definitionVersionId:f.revision.definition_version_id});
const htmlRows=(html:string,title:string)=>[...html.matchAll(/<tr(?:\s[^>]*)?>[\s\S]*?<\/tr>/gu)]
 .map(match=>match[0]).filter(row=>row.includes(`<strong>${title}</strong>`));
const cells=(html:string,className:string)=>[...html.matchAll(new RegExp(`<td class="${className}">(.*?)</td>`,'gu'))].map(m=>m[1]);

test('unmocked saved evidence groups two stages through the common table; shared tool retains one ID, number, saved price and payment',()=>{
 const f=fixture(),before=JSON.stringify(f);
 expect(jest.isMockFunction(assertCanonicalEstimateSavedArtifactStructureV1)).toBe(false);
 expect(canonicalEstimateSavedOperationAcceptanceV1({revision:f.revision,resources:f.rows})).toMatchObject({status:'ACCEPTED',pdfAllowed:true});
 const sections=canonicalEstimateResourceOperationSections(f.rows.map(row=>({rowId:String(row.row_id),titleRu:String(row.title_ru),operation:f.graph(row).operationCompositionV1})));
 expect(sections).toHaveLength(2);expect(sections[0]!.resourceIds).toContain('test-shared-tool');
 expect(sections[1]!.resourceIds).not.toContain('test-shared-tool');
 expect(sections[1]!.sharedResources.map(row=>row.rowId)).toEqual(['test-shared-tool']);
 expect(sections[0]!.resourceIds).not.toContain('test-1-MATERIAL');
 expect(sections[1]!.resourceIds).not.toContain('test-0-MATERIAL');
 const p=render(f),uses=htmlRows(p.html,'Измерительный инструмент');expect(uses).toHaveLength(2);
 expect(p.html.match(/<tr class="operation">/gu)).toHaveLength(2);
 for(const op of f.operations)expect(p.html).toContain(`<strong>${op.operationTitleRu}</strong>`);
 const numbers=uses.map(row=>cells(row,'number'));expect(numbers[0]).toEqual([expect.stringMatching(/^\d+$/u)]);
 expect(numbers[1]).toEqual(numbers[0]);
 expect(uses.map(row=>cells(row,'numeric'))).toEqual([['3'],['3']]);
 expect(uses.map(row=>cells(row,'unit'))[0]).toEqual(uses.map(row=>cells(row,'unit'))[1]);
 const money=uses.map(row=>cells(row,'money'));expect(money[0]![0]).toMatch(/^2,00\s+сом$/u);
 expect(money[1]).toEqual([money[0]![0],'']);expect(money[0]![1]).toMatch(/^6,00\s+сом$/u);
 expect(p.rowCount).toBe(19);expect(p.pricedRowCount).toBe(19);
 expect(selectCanonicalArtifactRows(f.rows).procurementRows.filter(row=>row.row_id==='test-shared-tool')).toHaveLength(1);
 expect(p.html).not.toMatch(/Общие ресурсы|См\. №|class="shared-resource"/u);
 expect(()=>assertCanonicalProfessionalPdfMoneyCells(p.html)).not.toThrow();expect(JSON.stringify(f)).toBe(before);
});

test('known composition with unknown shared quantity stays grouped, unpaid, visible twice and incomplete',()=>{
 const f=fixture(),tool=f.rows.find(row=>row.row_id==='test-shared-tool')!;
 Object.assign(tool,{quantity:null,amount:null,included_in_estimate:false,included_in_procurement:false});
 f.revision.checksum_sha256=canonicalEstimateSha256HexText(canonicalEstimateStableJson({rows:f.rows,evidence:f.evidence}));
 const before=JSON.stringify(f),audit=canonicalEstimateSavedOperationAcceptanceV1({revision:f.revision,resources:f.rows});
 expect(audit).toMatchObject({status:'COMPOSITION_UNVERIFIED',pdfAllowed:true,completeClaimAllowed:false});
 const p=render(f),uses=htmlRows(p.html,'Измерительный инструмент');expect(uses).toHaveLength(2);
 expect(uses.map(row=>cells(row,'numeric'))).toEqual([['Не рассчитано'],['Не рассчитано']]);
 for(const row of uses){expect(cells(row,'money')[0]).toMatch(/^2,00\s+сом$/u);expect(cells(row,'money')[1]).toBe('');}
 expect(p.pricedRowCount).toBe(18);expect(tool.quantity).toBeNull();expect(JSON.stringify(f)).toBe(before);
});

test.each([
 ['release mismatch','releaseId'],['definition mismatch','definitionVersionId'],
 ['invalid map digest','mapSha256'],['malformed passport digest','sourcePassportPayloadSha256'],
] as const)('saved %s blocks before HTML without changing input bytes',(_label,field)=>{
  // Passport payload hash is format-checked here; the exact pinned DB passport
  // authority is the existing server-only write path, not this synthetic reader.
  const f=fixture();f.revision.amendment_contract.parameterSources.operationCompositionEvidenceV1={...f.evidence,[field]:'wrong'};
  const before=JSON.stringify(f);expect(()=>render(f)).toThrow();expect(JSON.stringify(f)).toBe(before);
 });

test('missing saved authority cannot be upgraded by a current factory map or review intent',()=>{
 const f=fixture();delete f.revision.amendment_contract.parameterSources.operationCompositionEvidenceV1;
 f.revision.checksum_sha256=canonicalEstimateSha256HexText(canonicalEstimateStableJson({rows:f.rows}));
 const before=JSON.stringify(f);
 expect(()=>buildCanonicalProfessionalPdfProjection({revision:f.revision,rows:f.rows,workTitleRu:'Проверочная работа',savedIndependentComposition:f.map})).toThrow();
 const request={revisionId:f.revision.id,releaseId:f.revision.release_id,definitionVersionId:f.revision.definition_version_id,
  checksumSha256:f.revision.checksum_sha256,acknowledgedPreliminaryReview:true};
 const ack=canonicalProfessionalPdfReviewAcknowledgmentV1({revision:f.revision,resources:f.rows,request,
  actorUserId:'test-actor',acknowledgedAt:'2026-10-29T00:00:00Z'});
 const args={revision:f.revision,rows:f.rows,workTitleRu:'Проверочная работа',issuancePurpose:'PRELIMINARY_REVIEW' as const,reviewAcknowledgmentV1:ack};
 const report=buildCanonicalProfessionalPdfProjection({...args,savedIndependentComposition:f.map});
 expect(report.html).toBe(buildCanonicalProfessionalPdfProjection(args).html);
 expect(report.html).toContain('Состав подработ и полнота обеспечения не подтверждены');
 expect(report.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
 expect(JSON.stringify(f)).toBe(before);
});