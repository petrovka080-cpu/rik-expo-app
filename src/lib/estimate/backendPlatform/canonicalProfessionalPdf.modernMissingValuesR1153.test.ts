// Strict source/manual diagnostics below remain separate from the readable-report purpose.
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,
 canonicalProfessionalPdfReviewAcknowledgmentV1,canonicalProfessionalPdfReviewEligibilityV1,
 canonicalManualPreliminaryReviewEligibilityV1,assertCanonicalProfessionalPdfIssuanceV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import {canonicalArtifactPreliminaryNeeds,type CanonicalArtifactRow} from './canonicalEstimateArtifactContract';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from './canonicalProfessionalPdf';
import {resolveCanonicalSavedOperationOrdinalsV1,canonicalEstimateResourceOperationSections} from './canonicalEstimateOperationComposition';
import {canonicalPublicSavedResourceRowKindV1} from './canonicalPublicResourcePresentationV1';
import {canonicalEstimateRevisionDetailFromStorage} from './canonicalEstimateRevisionReadMapper';
jest.unmock('./canonicalEstimateSavedOperationAcceptanceV1');
type R=Record<string,unknown>;
const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const operation={contractVersion:'canonical-operation-resource/v1',groupId:'test-stages',groupTitleRu:'Проверочная работа',
 operationId:'test-prepare',operationTitleRu:'Подготовить проверочный участок',completionCriterionRu:'Участок подготовлен',processRole:'PROCESS',processOrdinal:5};
const descriptor=(title:string,kind:string,note=false)=>({contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:title,
 nameRu:title,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:kind,...(note?{rowKind:'PROCESS_NOTE'}:{})});
const graph=(row:R)=>(row.calculation_trace as {resourceGraph:R}).resourceGraph;
const trace=(row:R)=>row.calculation_trace as R;
function rehashNeed(need:R){const {need_sha256:_old,...body}=need;need.need_sha256=hash(body);}
function fixture(allUnknown=false){
 const revision:R={id:'test-numeric-review',release_id:'test-release',definition_version_id:'test-definition',catalog_id:'test-catalog',
  checksum_sha256:'a'.repeat(64),row_count:allUnknown?0:2,currency_code:'KGS',created_at:'2026-10-29T00:00:00Z',revision_number:1,
  definition_withdrawal_reason:null,input_parameters:{},amendment_contract:{parameterSources:{}}};
 const rows:CanonicalArtifactRow[]=allUnknown?[]:['Материал покрытия','Труд подготовки'].map((title,index)=>({
  revision_id:revision.id,row_id:'test-known-'+index,ordinal:index,title_ru:title,category:index?'labor':'material',section:'test',
  quantity:'4',unit_id:index?'man_hour':'m2',unit_price:null,amount:null,currency_code:null,ownership_status:'OWNED',
  semantic_owner:'test-catalog:test-known-'+index,included_in_estimate:true,included_in_procurement:index===0,procurement_eligible:index===0,
  row_sha256:'b'.repeat(64),resource_spec_id:'test-spec-known-'+index,physical_row_type:index?'labor':'material',
  calculation_trace:{formulaId:'test-formula-known-'+index,resourceGraph:{semanticOwner:'test-catalog:test-known-'+index,
   canonicalUnit:index?'man_hour':'m2',physicalRowType:index?'labor':'material',costTreatment:'OWN_COST',costOwner:'resource',
   operationCompositionV1:operation,publicResourcePresentationV1:descriptor(title,index?'LABOR':'MATERIAL')}}}));
 const needs:R[]=[['Расходный материал','CONSUMABLE','material'],['Измерительный инструмент','TOOL','equipment'],['Услуга','SERVICE','service'],
  ['Проверка первого этапа','SERVICE','service'],['Проверка второго этапа','SERVICE','service'],['Проверка третьего этапа','SERVICE','service']].map(([title,kind,category],index)=>{
  const {processOrdinal:_order,processRole:_role,...unspecified}=operation,note=index>=3,id='test-need-'+index;
  const need:R={row_id:id,ordinal:rows.length+index,resource_spec_id:'test-spec-'+index,section:'test',category,title_ru:title,
   unit_id:note?'':kind==='SERVICE'?'service':'piece',quantity:null,unit_price:null,need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['test_numeric_norm_'+index],
   selected:!note,procurement_eligible:!note,formula_id:'test-formula-'+index,
   calculation_trace:{formulaId:'test-formula-'+index,preliminaryNeed:true,needState:'QUANTITY_REQUIRED',missingParameterIds:['test_numeric_norm_'+index],
    resourceGraph:{canonicalUnit:note?'':kind==='SERVICE'?'service':'piece',physicalRowType:category,costTreatment:note?'INFORMATIONAL_SCOPE':'OWN_COST',costOwner:note?'scope':'resource',
     operationCompositionV1:unspecified,publicResourcePresentationV1:descriptor(title!,kind!,note)}}};
  rehashNeed(need);return need;
 });
 // Older source-owned map shape: newer operationRoster/operationRequirements are
 // truly ABSENT, not supplied null/empty. This is unverified composition, not FULL.
 const map={contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
  evidenceSha256:'e'.repeat(64),entries:[...rows,...needs].map(row=>({operationId:operation.operationId,expectedResourceId:row.row_id,
   sourceId:'TEST_ONLY_SOURCE',condition:'Синтетический сохранённый контракт',formulaId:trace(row).formulaId,unitId:row.unit_id,
   requiredOperationIds:[operation.operationId],resolution:{kind:'ROW',rowId:row.row_id}}))};
 const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:String(revision.release_id),definitionVersionId:String(revision.definition_version_id),
  passport:{definition_version_id:revision.definition_version_id,payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:map}}})!;
 const ps={preliminaryNeeds:needs,operationCompositionEvidenceV1:evidence};revision.amendment_contract={parameterSources:ps};
 const rehash=()=>{for(const row of rows){const{row_sha256:_old,...body}=row;row.row_sha256=hash(body);}revision.checksum_sha256=hash({rows,parameterSources:ps});};rehash();
 const resources=()=>[...rows,...canonicalArtifactPreliminaryNeeds(revision as any,{issuancePurpose:'PRELIMINARY_REVIEW'})];
 const request=()=>({revisionId:String(revision.id),releaseId:String(revision.release_id),definitionVersionId:String(revision.definition_version_id),
  checksumSha256:String(revision.checksum_sha256),acknowledgedPreliminaryReview:true as const});
 const ack=()=>canonicalProfessionalPdfReviewAcknowledgmentV1({revision,resources:resources(),request:request(),actorUserId:'test-actor',acknowledgedAt:'2026-10-29T00:00:00Z'});
 const render=()=>buildCanonicalProfessionalPdfProjection({revision:revision as any,rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision as any,{issuancePurpose:'PRELIMINARY_REVIEW'}),
  workTitleRu:'Проверочная работа',issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack()});
 const strictSource=()=>assertCanonicalProfessionalPdfReadinessSnapshotV1({revision,resources:resources()});
 return{revision,rows,needs,ps,map,resources,request,ack,render,rehash,strictSource};
}

test('modern three unknown physical quantities and missing prices preview saved rows without approval or zero fill',()=>{
 const f=fixture(),before=JSON.stringify(f),audit=canonicalEstimateSavedOperationAcceptanceV1({revision:f.revision,resources:f.resources()});
 expect(audit.pdfAllowed).toBe(false);expect(audit.completeClaimAllowed).toBe(false);
 expect(canonicalManualPreliminaryReviewEligibilityV1({revision:f.revision,resources:f.resources()}).eligible).toBe(false);
 expect(canonicalProfessionalPdfReviewEligibilityV1({revision:f.revision,resources:f.resources()})).toMatchObject({eligible:true,unknownQuantityCount:3});
 const ack=f.ack();expect(ack.unknownQuantityCount).toBe(6); // Saved report acknowledgment counts raw notes; UI DTO counts physical rows.
 const p=f.render();expect(p.html).toContain('Не рассчитано');expect(p.html).toContain('<tr class="operation">');
 expect((p.html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gu)??[]).filter(row=>row.includes('<td class="numeric">Не рассчитано</td>')&&!row.includes('<td>Справочная запись</td>'))).toHaveLength(3);
 expect(p.pricedRowCount).toBe(0);expect(p.missingPriceRowCount).toBe(2);expect(p.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
 expect([...p.html.matchAll(/<td class="money">(.*?)<\/td>/gu)].every(match=>match[1]==='')).toBe(true);
 expect(p.html).toContain('Состав подработ и полнота обеспечения не подтверждены');
 expect(()=>assertCanonicalProfessionalPdfMoneyCells(p.html)).not.toThrow();expect(JSON.stringify(f)).toBe(before);
});

test('zero ordinary rows and all physical quantities unknown still use the same renderer with truthful preliminary status',()=>{
 const f=fixture(true),before=JSON.stringify(f);expect(f.rows).toHaveLength(0);expect(f.revision.row_count).toBe(0);
 expect(canonicalProfessionalPdfReviewEligibilityV1({revision:f.revision,resources:f.resources()})).toMatchObject({eligible:true,unknownQuantityCount:3});
 const p=f.render();expect((p.html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gu)??[]).filter(row=>row.includes('<td class="numeric">Не рассчитано</td>')&&!row.includes('<td>Справочная запись</td>'))).toHaveLength(3);
 expect(p.pricedRowCount).toBe(0);expect(p.html).not.toContain('>Полная<');expect(JSON.stringify(f)).toBe(before);
});

test('same saved refs unify a truly absent optional ordinal consistently without editing raw graph or using a factory',()=>{
 const {processOrdinal:_ordinal,...absent}=operation;
 const refs:{rowId:string;operation:unknown}[]=[{rowId:'a',operation},{rowId:'b',operation:absent}];
 const before=JSON.stringify(refs),resolved=resolveCanonicalSavedOperationOrdinalsV1(refs);
 expect((resolved[1]!.operation as R).processOrdinal).toBe(5);expect(JSON.stringify(refs)).toBe(before);
 expect(canonicalEstimateResourceOperationSections(refs.map(row=>({...row,titleRu:'Ресурс'})))).toHaveLength(1);
});

test.each([9,null,'5',Number.NaN])('explicit conflicting or malformed ordinal %s is never repaired',value=>{
 const f=fixture();graph(f.rows[0]!).operationCompositionV1={...operation,processOrdinal:value};f.rehash();
 expect(()=>f.strictSource()).toThrow();
});

test('an absent-first reference cannot hide two explicit conflicting ordinals in any saved row order',()=>{
 const f=fixture();graph(f.rows[1]!).operationCompositionV1={...operation,processOrdinal:9};
 const {processOrdinal:_ordinal,...absent}=operation;
 const first={...f.rows[0]!,row_id:'test-absent-first',ordinal:8,semantic_owner:'test-catalog:test-absent-first',
  calculation_trace:{...trace(f.rows[0]!),resourceGraph:{...graph(f.rows[0]!),semanticOwner:'test-catalog:test-absent-first',operationCompositionV1:absent}}};
 f.rows.unshift(first);f.revision.row_count=3;f.rehash();
 for(const reverse of [false,true]){if(reverse)f.rows.reverse();expect(()=>f.strictSource()).toThrow();}
});

test.each(['condition','raw amount','raw duplicate','malformed descriptor','supplied null roster','supplied empty roster','duplicate payer','withdrawal'] as const)(
 'preview fails closed on %s and never converts it into a missing numeric value',kind=>{
 const f=fixture();
 if(kind==='condition'){f.needs[0]!.need_state='CONDITION_REQUIRED';trace(f.needs[0]!).needState='CONDITION_REQUIRED';trace(f.needs[0]!).unresolvedConditionParameterIds=['test_object_fact'];rehashNeed(f.needs[0]!);}
 if(kind==='raw amount'){f.needs[0]!.amount='6';rehashNeed(f.needs[0]!);}
 if(kind==='raw duplicate')f.needs.push({...f.needs[0]!});
 if(kind==='malformed descriptor'){graph(f.needs[0]!).publicResourcePresentationV1=null;rehashNeed(f.needs[0]!);}
 if(kind==='supplied null roster'||kind==='supplied empty roster'){
  const changed={...f.map,operationRoster:kind==='supplied null roster'?null:[]},evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:String(f.revision.release_id),
   definitionVersionId:String(f.revision.definition_version_id),passport:{definition_version_id:f.revision.definition_version_id,payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:changed}}})!;
  f.ps.operationCompositionEvidenceV1=evidence;
 }
 if(kind==='duplicate payer'){f.rows[1]!.semantic_owner=f.rows[0]!.semantic_owner;graph(f.rows[1]!).semanticOwner=f.rows[0]!.semantic_owner;}
 if(kind==='withdrawal')f.revision.definition_withdrawal_reason='TEST_WITHDRAWAL';
 f.rehash();const before=JSON.stringify(f);expect(()=>f.strictSource()).toThrow();expect(JSON.stringify(f)).toBe(before);
});

test('review request and acknowledgment stay bound to exact saved tuple and audit',()=>{
 const f=fixture(),resources=f.resources();expect(()=>canonicalProfessionalPdfReviewAcknowledgmentV1({revision:f.revision,resources,
  request:{...f.request(),checksumSha256:'0'.repeat(64)},actorUserId:'test-actor',acknowledgedAt:'2026-10-29T00:00:00Z'})).toThrow();
 const ack=f.ack();for(const changed of [{...ack,unknownQuantityCount:3},{...ack,auditSha256:'0'.repeat(64)},{...ack,definitionVersionId:'other'}])
  expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources,issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:changed})).toThrow();
});
test('saved manual price on an unknown quantity retains revision currency and no amount',()=>{
 const f=fixture();f.needs[0]!.unit_price='2';rehashNeed(f.needs[0]!);f.rehash();
 const adapted=f.resources().find(row=>row.row_id===f.needs[0]!.row_id)!;
 expect(Object.hasOwn(f.needs[0]!,'currency_code')).toBe(false);expect(adapted.currency_code).toBe('KGS');expect(adapted.amount).toBeNull();
 expect(canonicalProfessionalPdfReviewEligibilityV1({revision:f.revision,resources:f.resources()}).eligible).toBe(true);
 expect(f.render().html).toContain('<td class="money">2,00 сом</td>');
 f.needs[0]!.currency_code='USD';rehashNeed(f.needs[0]!);f.rehash();expect(()=>f.strictSource()).toThrow();
});

test('manual-custom unknown resource uses its genuine saved manual identity without a fabricated resource spec or operation',()=>{
 const f=fixture(),id='manual:test-extra';
 const need:R={row_id:id,ordinal:8,resource_spec_id:null,section:'test',category:'material',title_ru:'Дополнительный материал',unit_id:'piece',
  quantity:null,unit_price:null,need_state:'QUANTITY_REQUIRED',missing_parameter_ids:[],selected:true,procurement_eligible:true,formula_id:'manual_custom_quantity',
  calculation_trace:{compilerVersion:'TEST_ONLY',rowId:id,semanticOwner:id,physicalRowType:'material',manualAmendment:{kind:'manual'},
   preliminaryNeed:true,needState:'QUANTITY_REQUIRED',missingParameterIds:[]},normative_trace:[]};
 rehashNeed(need);f.needs.push(need);f.rehash();
 expect(canonicalProfessionalPdfReviewEligibilityV1({revision:f.revision,resources:f.resources()})).toMatchObject({eligible:true,unknownQuantityCount:4});
 expect(f.render().html).toContain('Дополнительный материал');expect(graph(f.rows[0]!).operationCompositionV1).toEqual(operation);
 trace(need).manualAmendment={kind:'not-manual'};rehashNeed(need);f.rehash();expect(()=>f.strictSource()).toThrow();
});

test('included-resource owner chains terminate in one existing owner, including an unknown selected need; cycles stop',()=>{
 const f=fixture();Object.assign(f.rows[0]!,{included_in_estimate:false,included_in_procurement:false,ownership_status:'OWNED_EXCLUDED'});
 graph(f.rows[0]!).costTreatment='INCLUDED_IN_RESOURCE_ROWS';graph(f.rows[0]!).includedInResourceOwnerRowId=f.needs[0]!.row_id;f.rehash();
 expect(()=>f.ack()).not.toThrow();
 graph(f.needs[0]!).costTreatment='INCLUDED_IN_RESOURCE_ROWS';graph(f.needs[0]!).includedInResourceOwnerRowId=f.rows[0]!.row_id;rehashNeed(f.needs[0]!);f.rehash();
 expect(()=>f.strictSource()).toThrow();
});

test('PDF eligibility is a server-only exact-tuple read DTO, independent of stored spoof and manual approval',()=>{
 const f=fixture(),row={...f.revision,price_snapshot_ids:[],professionalPdfReviewEligibilityV1:{eligible:true}},
  eligibility=canonicalProfessionalPdfReviewEligibilityV1({revision:f.revision,resources:f.resources()});
 expect(canonicalEstimateRevisionDetailFromStorage(row).professionalPdfReviewEligibilityV1).toBeUndefined();
 expect(canonicalEstimateRevisionDetailFromStorage(row,{professionalPdfReviewEligibilityV1:eligibility}).professionalPdfReviewEligibilityV1).toEqual(eligibility);
 expect(()=>canonicalEstimateRevisionDetailFromStorage(row,{professionalPdfReviewEligibilityV1:{...eligibility,checksumSha256:'0'.repeat(64)}})).toThrow();
});
test('source-only process notes stay distinct from unknown physical resources after the same preliminary adapter',()=>{
 const f=fixture(),projected=f.resources(),note=projected.find(row=>row.row_id==='test-need-3')!;
 expect(canonicalPublicSavedResourceRowKindV1(note)).toBe('PROCESS_NOTE');
 for(const change of [
  {unit_price:'2'},{included_in_estimate:true},{included_in_procurement:true},
  {calculation_trace:{...trace(note),manualTitleOverride:true}},
  {calculation_trace:{...trace(note),resourceGraph:{...graph(note),publicResourcePresentationV1:null}}},
  {calculation_trace:{...trace(note),resourceGraph:{...graph(note),costTreatment:'INCLUDED_IN_RESOURCE_ROWS',includedInResourceOwnerRowId:'test-known-0'}}},
  {calculation_trace:{...trace(note),resourceGraph:{...graph(note),publicResourcePresentationV1:{...(graph(note).publicResourcePresentationV1 as R),rowKind:'CALCULATION_DETAIL'}}}},
 ])expect(canonicalPublicSavedResourceRowKindV1({...note,...change})).toBe('RESOURCE');
});
test('an explicit old-map consumer binding cannot disappear into the absent-metadata preview path',()=>{
 const f=fixture();delete graph(f.rows[0]!).operationCompositionV1;f.rehash();expect(()=>f.strictSource()).toThrow();
});

test.each(['unknown physical type','NaN price','service text amount','wrong unit','unpriced zero amount'] as const)('strict source snapshot rejects %s independently of report readability',kind=>{
 const f=fixture();if(kind==='unknown physical type')f.rows[0]!.physical_row_type='invalid';
 if(kind==='NaN price')f.rows[0]!.unit_price='NaN';if(kind==='service text amount')f.rows[0]!.amount='Включено';
 if(kind==='wrong unit')graph(f.rows[0]!).canonicalUnit='kg';if(kind==='unpriced zero amount')f.rows[0]!.amount='0';f.rehash();expect(()=>f.strictSource()).toThrow();
});
test('an explicitly saved zero price remains numeric zero without filling any absent price',()=>{
 const f=fixture();Object.assign(f.rows[0]!,{quantity:'0',unit_price:'0',amount:'0',currency_code:'KGS'});f.rehash();
 const p=f.render();expect(p.pricedRowCount).toBe(1);expect(p.html).toContain('<td class="money">0,00 сом</td>');
 expect(f.rows[1]!.unit_price).toBeNull();expect(f.rows[1]!.amount).toBeNull();
});
test('legacy-absent review also permits missing prices with blank amounts, and rejects an unknown price disguised as zero amount',()=>{
 const f=fixture();f.ps.preliminaryNeeds=[];delete (f.ps as R).operationCompositionEvidenceV1;
 for(const row of f.rows){delete graph(row).operationCompositionV1;delete graph(row).publicResourcePresentationV1;delete graph(row).costTreatment;delete graph(row).costOwner;}
 f.rehash();expect(canonicalProfessionalPdfReviewEligibilityV1({revision:f.revision,resources:f.resources()}).eligible).toBe(true);
 expect(f.render().html).toContain('Сохранённые позиции без подтверждённой подработы');
 expect(f.render().html).not.toContain('Подготовить проверочный участок');
 expect(f.rows.every(row=>!Object.hasOwn(graph(row),'costOwner')&&!Object.hasOwn(graph(row),'operationCompositionV1'))).toBe(true);
 graph(f.rows[0]!).costOwner='resource';f.rehash();expect(()=>f.strictSource()).toThrow();
 delete graph(f.rows[0]!).costOwner;
 f.rows[0]!.amount='0';f.rehash();expect(()=>f.strictSource()).toThrow();
});
test.each(['stale descriptor','conflicting source name','conflicting source kind'] as const)('supplied %s cannot become missing metadata',kind=>{
 const f=fixture();
 if(kind==='stale descriptor')graph(f.rows[0]!).publicResourcePresentationV1={...(graph(f.rows[0]!).publicResourcePresentationV1 as R),sourceTitleRu:'Иной источник'};
 else{
  const changed={...f.map,entries:f.map.entries.map((entry,index)=>index?entry:{...entry,...(kind==='conflicting source name'?{publicNameRu:'Иной материал'}:{resourceKind:'LABOR'})})};
  f.ps.operationCompositionEvidenceV1=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:String(f.revision.release_id),definitionVersionId:String(f.revision.definition_version_id),
   passport:{definition_version_id:f.revision.definition_version_id,payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:changed}}})!;
 }
 f.rehash();expect(()=>f.strictSource()).toThrow();
});
function acceptedStandard(){
 const f=fixture();f.rows.pop();f.needs.splice(0);f.revision.row_count=1;
 const kinds=['MATERIAL','CONSUMABLE','TOOL','ACCESSORY','EQUIPMENT','MECHANISM','LABOR','SERVICE','TRANSPORT','PPE'];
 const map={contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,evidenceSha256:'e'.repeat(64),
  operationRoster:[operation],entries:[{operationId:operation.operationId,expectedResourceId:f.rows[0]!.row_id,sourceId:'TEST_ONLY_SOURCE',condition:'Синтетическая проверка выдачи',
   requiredOperationIds:[operation.operationId],publicNameRu:f.rows[0]!.title_ru,resourceKind:'MATERIAL',resolution:{kind:'ROW',rowId:f.rows[0]!.row_id}}],
  operationRequirements:[{operationId:operation.operationId,sourceId:'TEST_ONLY_SOURCE',requirements:Object.fromEntries(kinds.map(kind=>[kind,kind==='MATERIAL'
   ?{status:'REQUIRED',rowIds:[f.rows[0]!.row_id]}:{status:'NOT_APPLICABLE',reasonRu:'Только синтетический минимальный контракт проверки выдачи, не реальная технология'}]))}]};
 f.ps.operationCompositionEvidenceV1=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:String(f.revision.release_id),definitionVersionId:String(f.revision.definition_version_id),
  passport:{definition_version_id:f.revision.definition_version_id,payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:map}}})!;
 f.rehash();return f;
}

test('accepted STANDARD retains live withdrawal STOP while a fresh read-only report warns without source admission',()=>{
 const f=acceptedStandard(),resources=f.resources();
 expect(assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources})).toMatchObject({status:'ACCEPTED',pdfAllowed:true});
 expect(()=>buildCanonicalProfessionalPdfProjection({revision:f.revision as any,rows:f.rows,workTitleRu:'Проверочная работа'})).not.toThrow();
 f.revision.definition_withdrawal_reason='TEST_LIVE_WITHDRAWAL';
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources})).toThrow(expect.objectContaining({code:'REVISION_CONTENT_QUARANTINED'}));
 const ack=f.ack();expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources,issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:ack})).not.toThrow();
 expect(f.render().html).toContain('Источник отозван или ограничен');
 expect(()=>buildCanonicalProfessionalPdfProjection({revision:f.revision as any,rows:f.rows,workTitleRu:'Проверочная работа'})).toThrow(expect.objectContaining({code:'REVISION_CONTENT_QUARANTINED'}));
});

test('missing live source status is unknown for issuance, and standard PDF cannot bypass the fake-zero money invariant',()=>{
 const f=acceptedStandard();delete f.revision.definition_withdrawal_reason;
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.resources()})).toThrow(expect.objectContaining({code:'ARTIFACT_SOURCE_STATUS_UNVERIFIED'}));
 f.revision.definition_withdrawal_reason=null;f.rows[0]!.amount='0';f.rehash();
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.resources()})).toThrow(expect.objectContaining({code:'ARTIFACT_MONEY_SNAPSHOT_INVALID'}));
 expect(()=>buildCanonicalProfessionalPdfProjection({revision:f.revision as any,rows:f.rows,workTitleRu:'Проверочная работа'})).toThrow(expect.objectContaining({code:'ARTIFACT_MONEY_SNAPSHOT_INVALID'}));
 f.rows[0]!.unit_price='0';f.rows[0]!.currency_code='KGS';f.rehash();
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.resources()})).not.toThrow();
});
test('STANDARD keeps a known price with unknown quantity unpaid; a non-null zero amount cannot masquerade as a calculated amount',()=>{
 const f=acceptedStandard();Object.assign(f.rows[0]!,{quantity:null,unit_price:'2',currency_code:'KGS',amount:'0',included_in_procurement:false});f.rehash();
 expect(()=>assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.resources()})).toThrow(expect.objectContaining({code:'ARTIFACT_MONEY_SNAPSHOT_INVALID'}));
 expect(()=>buildCanonicalProfessionalPdfProjection({revision:f.revision as any,rows:f.rows,workTitleRu:'Проверочная работа'})).toThrow(expect.objectContaining({code:'ARTIFACT_MONEY_SNAPSHOT_INVALID'}));
 f.rows[0]!.amount=null;f.rehash();const before=JSON.stringify(f);
 expect(assertCanonicalProfessionalPdfIssuanceV1({revision:f.revision,resources:f.resources()})).toMatchObject({pdfAllowed:true,completeClaimAllowed:false});
 const p=buildCanonicalProfessionalPdfProjection({revision:f.revision as any,rows:f.rows,workTitleRu:'Проверочная работа'});
 expect(p.html).toContain('<td class="numeric">Не рассчитано</td>');expect(p.html).toContain('<td class="money">2,00 сом</td>');
 expect(p.html).toContain('<td class="money"></td>');expect(p.pricedRowCount).toBe(0);expect(p.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
 expect(f.rows[0]!.amount).toBeNull();expect(f.rows[0]!.included_in_procurement).toBe(false);expect(JSON.stringify(f)).toBe(before);
});
test('the existing backend item count stays raw item while the same registry code validates its piece aliases',()=>{
 const f=fixture();f.needs[1]!.unit_id='item';graph(f.needs[1]!).canonicalUnit='pcs';rehashNeed(f.needs[1]!);f.rehash();
 const before=JSON.stringify(f);expect(canonicalProfessionalPdfReviewEligibilityV1({revision:f.revision,resources:f.resources()})).toMatchObject({eligible:true,unknownQuantityCount:3});
 expect(f.render().html).toContain('Измерительный инструмент');expect(f.needs[1]!.unit_id).toBe('item');expect(JSON.stringify(f)).toBe(before);
});

test.each(['physical empty','null note','note selected','note paid','note procurement','material spoof','note map mismatch','note map null','unknown unit','set drift','pair drift'] as const)(
 'only a genuine empty-unit process note is exempt: %s stays blocked',kind=>{
 const f=fixture(),note=f.needs[3]!;
 if(kind==='physical empty'){f.needs[0]!.unit_id='';graph(f.needs[0]!).canonicalUnit='';rehashNeed(f.needs[0]!);}
 if(kind==='null note'){note.unit_id=null;rehashNeed(note);}
 if(kind==='note selected'){note.selected=true;rehashNeed(note);}
 if(kind==='note paid'){note.included_in_estimate=true;rehashNeed(note);}
 if(kind==='note procurement'){note.included_in_procurement=true;rehashNeed(note);}
 if(kind==='material spoof'){graph(note).costTreatment='OWN_COST';rehashNeed(note);}
 if(kind==='unknown unit'){f.needs[0]!.unit_id='unknown_unit';graph(f.needs[0]!).canonicalUnit='unknown_unit';rehashNeed(f.needs[0]!);}
 if(kind==='set drift'||kind==='pair drift'){f.needs[1]!.unit_id='item';graph(f.needs[1]!).canonicalUnit=kind==='set drift'?'set':'pair';rehashNeed(f.needs[1]!);}
 if(kind==='note map mismatch'||kind==='note map null'){
  const changed={...f.map,entries:f.map.entries.map(entry=>entry.resolution.rowId===note.row_id?{...entry,unitId:kind==='note map mismatch'?'pcs':null}:entry)};
  f.ps.operationCompositionEvidenceV1=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:String(f.revision.release_id),definitionVersionId:String(f.revision.definition_version_id),
   passport:{definition_version_id:f.revision.definition_version_id,payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:changed}}})!;
 }
 f.rehash();expect(()=>f.strictSource()).toThrow();
});
test('distinct semantic payers sharing the existing resource role are not one duplicated financial owner',()=>{
 const f=fixture();expect(f.rows.map(row=>graph(row).costOwner)).toEqual(['resource','resource']);
 expect(new Set(f.rows.map(row=>row.semantic_owner)).size).toBe(2);
 const before=JSON.stringify(f);expect(()=>f.ack()).not.toThrow();expect(JSON.stringify(f)).toBe(before);
});

test.each(['row explicit ID','graph explicit ID','historical opaque graph ID'] as const)('role handling still rejects duplicate %s',kind=>{
 const f=fixture();for(const row of f.rows){
  if(kind==='row explicit ID')row.cost_owner_id='resource';
  if(kind==='graph explicit ID')graph(row).costOwnerId='resource';
  if(kind==='historical opaque graph ID')graph(row).costOwner='test-legacy-financial-owner';
 }
 f.rehash();expect(()=>f.strictSource()).toThrow();
});