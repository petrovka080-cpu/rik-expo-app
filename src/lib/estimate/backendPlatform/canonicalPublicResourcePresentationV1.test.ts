import publicSubworkBindings from '../../../../data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json';
import { canonicalPublicResourcePresentationV1 as display, bindCanonicalPublicResourceSavedTitleV1, parseCanonicalPublicResourcePresentationV1,
  canonicalPublicResourcePresentationMatchesV1, canonicalPublicResourceRowKindV1 } from './canonicalPublicResourcePresentationV1';
import { G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 as series } from '../v4/g6PvcCommercialLaborProfilesS2741';
import { withG6PvcResourcePresentationS2741 } from '../v4/g6PvcResourcePresentationS2741';
import { canonicalEstimateRevisionRowFromStorage } from './canonicalEstimateRevisionReadMapper';
import { projectCanonicalEstimatePreliminaryNeedTransport } from './canonicalEstimatePreliminaryNeedTransport';
import { adaptCanonicalRevisionToStructuredEstimate } from './canonicalEstimateForemanAdapter';
import { ESTIMATE_PLATFORM_API_VERSION, type CanonicalEstimateCatalogItem, type CanonicalEstimateRevisionView } from './contracts';
import { buildStructuredEstimateRequestDraft } from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import { consumerRepairRowPublicResourcePresentation, consumerRepairRowMatchesSearch } from '../../../features/consumerRepair/consumerRepairRowMetadata';
import { canonicalArtifactPreliminaryNeeds, canonicalArtifactSpecificationParts, canonicalArtifactVisibleRowTitle, buildCanonicalProcurementProjection } from './canonicalEstimateArtifactContract';
import { buildCanonicalProfessionalPdfProjection } from './canonicalProfessionalPdf';
import {canonicalEstimateSavedOperationAcceptanceV1,canonicalOperationCompositionEvidenceFromPassportV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import type { CanonicalArtifactRow } from './canonicalEstimateArtifactContract';
import { createHash } from 'node:crypto';
import { compileCanonicalEstimateCore } from './canonicalEstimateCompileCore';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import { compileMasonryBrickWallBiaTn10R1, MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT } from '../v4/masonryBrickWallBiaTn10R1';
import { appendCanonicalBackendRevisionProjection } from '../../consumerRequests/consumerCanonicalBackendRevisionProjection';
import { buildRequestEstimateViewModel } from '../../../features/consumerRepair/requestEstimateViewModel';
import type { ConsumerRepairDraftBundle, ConsumerRepairRequestItem } from '../../consumerRequests/consumerRequestTypes';

const source = { contractVersion: 'canonical-public-resource-presentation/v1' as const,
  sourceTitleRu: 'Мембрана кровельная ПВХ, армированная, 1,2 мм — LOGICROOF V-RP, исходная спецификация',
  nameRu: 'Мембрана кровельная ПВХ, армированная, 1,2 мм', brandAndModelRu: 'LOGICROOF V-RP', specificationRu: null,
  detailsRu: ['Площадь требует проверки раскладки.'] };

test.each(['material','materials'])('a real %s supply covered by work cost is still a resource, never a calculation counter',category=>{
  const input={titleRu:'Средство очистки, картридж 1 л',descriptor:null,category,rowId:'cartridge',
    costTreatment:'INCLUDED_IN_RESOURCE_ROWS',includedInEstimate:false,includedInProcurement:false,
    graph:{includedInResourceOwnerRowId:'whole-work',operationCompositionV1:{operationId:'preparation'}}};
  expect(canonicalPublicResourceRowKindV1(input)).toBe('RESOURCE');
  expect(canonicalPublicResourceRowKindV1({...input,rowId:'consumption',costTreatment:'INFORMATIONAL_SCOPE',
    graph:{...input.graph,purchaseBalanceOwnerRowId:'cartridge'}})).toBe('CALCULATION_DETAIL');
});

test('a priced consumption detail remains a linked calculation detail, with ordinary paid, purchased, stale and unlinked resources visible', () => {
  const input = { titleRu: source.sourceTitleRu, descriptor: { ...source, rowKind: 'CALCULATION_DETAIL' as const },
    costTreatment: 'INFORMATIONAL_SCOPE', includedInEstimate: false, includedInProcurement: false,
    unitPrice: '50', amount: '2.1', rowId: 'consumption', graph: { purchaseBalanceOwnerRowId: 'whole-cartridge' }, category: 'material' };
  expect(canonicalPublicResourceRowKindV1(input)).toBe('CALCULATION_DETAIL');
  for (const patch of [{ includedInEstimate: true }, { includedInProcurement: true }, { manualTitleOverride: true },
    { graph: {} }, { graph: { purchaseBalanceOwnerRowId: 'consumption' } }, { titleRu: 'Другое средство' },
    { costTreatment: 'OWN_COST' }, { descriptor: { ...source, rowKind: 'PROCESS_NOTE' } }]) {
    expect(canonicalPublicResourceRowKindV1({ ...input, ...patch })).toBe('RESOURCE');
  }
  expect(input.unitPrice).toBe('50'); expect(input.amount).toBe('2.1');
});

test('a source-bound Russian label keeps brand and all details without changing the original title', () => {
  expect(display({ titleRu: source.sourceTitleRu, descriptor: source })).toEqual(source);
  expect(display({ titleRu: 'Моя мембрана, 2 мм', descriptor: source })).toBeNull();
  expect(display({ titleRu: source.sourceTitleRu, descriptor: source, manualTitleOverride: true })).toBeNull();
  expect(parseCanonicalPublicResourcePresentationV1({ ...source, nameRu: 'roof_membrane_internal_key' })).toBeNull();
  expect(parseCanonicalPublicResourcePresentationV1({ ...source, unexpected: true })).toBeNull();
  expect(canonicalPublicResourcePresentationMatchesV1(source, { ...source, brandAndModelRu: 'Другая марка' })).toBe(false);
});

test('a declared selected specification binds to the saved title and stays visible independently of the concise name', () => {
  const graph = { publicResourcePresentationV1: source };
  const title = source.sourceTitleRu+' — Совместимая поставка по ведомости №7';
  const bound = bindCanonicalPublicResourceSavedTitleV1({ graph, sourceTitleRu: source.sourceTitleRu, savedTitleRu: title,
    appendedSpecificationRu: 'Совместимая поставка по ведомости №7', manualTitleOverride: false });
  const projected = display({ titleRu: title, descriptor: bound.publicResourcePresentationV1 });
  expect(projected?.nameRu).toBe(source.nameRu);
  expect(projected?.specificationRu).toBe('Совместимая поставка по ведомости №7');
  expect(graph.publicResourcePresentationV1).toBe(source);
  expect(bindCanonicalPublicResourceSavedTitleV1({ graph, sourceTitleRu: source.sourceTitleRu, savedTitleRu: 'Мой материал',
    appendedSpecificationRu: null, manualTitleOverride: true })).toBe(graph);
});

test('the G6 authoring matrix leaves changed or unknown source titles untouched', () => {
  const base = series[0]!.originalDefinition;
  const changed = { ...base, resources: base.resources.map(r => r.row_id === 'pvc-roof:material:field'
    ? { ...r, title_ru: 'Другая мембрана 2 мм — другая марка' } : r) };
  expect(withG6PvcResourcePresentationS2741(changed).resources.find(r => r.row_id === 'pvc-roof:material:field')?.resource_graph)
    .not.toHaveProperty('publicResourcePresentationV1');
});

test('G6 snapshot preserves source and public naming projections while incomplete composition refuses STANDARD PDF', async () => {
  const profile = series[0]!;
  const compiled = await compileCanonicalEstimateCore({ catalogId: profile.catalogId, compilerVersion: 'G6-label-fixture', operation: 'compile',
    primaryMeasureParameterId: 'area_m2', submittedParameters: { area_m2: 100 }, confirmedParameters: { ...profile.definition.runtimeInput },
    parameterDefinitions: [...profile.definition.parameters], formulaDefinitions: [...profile.definition.formulas], resourceDefinitions: [...profile.definition.resources],
    currencyCode: 'KGS', maximumResourceRows: profile.definition.resources.length,
    hashJson: value => createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex') });
  const stored = { id: '11111111-1111-4111-8111-111111111111', release_id: '22222222-2222-4222-8222-222222222222',
    catalog_id: profile.catalogId, definition_version_id: '33333333-3333-4333-8333-333333333333', checksum_sha256: 'a'.repeat(64), row_count: compiled.rows.length,
    input_parameters: compiled.parameters, totals: compiled.totals, currency_code: 'KGS',
    amendment_contract: { parameterSources: { preliminaryNeeds: compiled.preliminaryNeeds } } };
  const transport = projectCanonicalEstimatePreliminaryNeedTransport(stored);
  const catalog: CanonicalEstimateCatalogItem = { catalogId: profile.catalogId, releaseId: stored.release_id, namespace: 'global',
    workKey: 'G6-label-fixture', titleRu: 'Укладка кровли', domain: 'roofing', definitionVersion: 1, applicability: {}, professionalMetadata: {}, parameterSchema: [] };
  const revision: CanonicalEstimateRevisionView = { apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: stored.id, parentRevisionId: null,
    releaseId: stored.release_id, catalogId: profile.catalogId, revisionNumber: 1, status: 'ready', currencyCode: 'KGS', parameters: compiled.parameters,
    totals: compiled.totals, rowCount: compiled.rows.length, checksumSha256: stored.checksum_sha256, compilerVersion: 'G6-label-fixture',
    createdAt: '2026-10-06T00:00:00Z',
    amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null, ...transport.amendmentContract },
    preliminaryNeeds: transport.preliminaryNeeds };
  const payload = adaptCanonicalRevisionToStructuredEstimate({ catalog, revision,
    rows: compiled.rows.map(row => canonicalEstimateRevisionRowFromStorage(row, null)) });
  const draft = buildStructuredEstimateRequestDraft(payload);
  const field = draft.items.find(item => item.sourceParameters?.rowCode === 'pvc-roof:material:field')!;
  const cleaner = draft.items.find(item => item.sourceParameters?.rowCode === 'pvc-roof:material:cleaner')!;
  expect(field.sourceParameters?.canonicalPublicResourcePresentationV1).toMatchObject({ sourceTitleRu: field.titleRu });
  expect(consumerRepairRowPublicResourcePresentation(field)).toBeNull(); // Raw metadata is not a view admission.
  const items = draft.items.map((item, index) => ({ ...item, id: 'fixture-'+index, requestDraftId: 'fixture' })) as ConsumerRepairRequestItem[];
  const bundle = appendCanonicalBackendRevisionProjection({ previousBundle: null,
    nextBundle: { draft: { id: 'fixture' }, items, structuredEstimatePayload: draft.structuredEstimatePayload } as ConsumerRepairDraftBundle, payload });
  const visible = buildRequestEstimateViewModel(bundle)!.sections.flatMap(s => s.items);
  expect(consumerRepairRowPublicResourcePresentation(visible.find(i => i.sourceParameters?.rowCode === 'pvc-roof:material:field')!))
    .toMatchObject({ nameRu: source.nameRu, brandAndModelRu: null });
  expect(consumerRepairRowPublicResourcePresentation(visible.find(i => i.sourceParameters?.rowCode === 'pvc-roof:material:cleaner')!))
    .toMatchObject({ nameRu: 'Очиститель для ПВХ-мембран', brandAndModelRu: null });
  const repeated = buildRequestEstimateViewModel(bundle)!.sections.flatMap(s => s.items);
  expect(repeated.every((item, index) => item === visible[index])).toBe(true);
  const welder = visible.find(i => i.sourceParameters?.rowCode === 'pvc-roof:machine:variant4_6kw')!;
  expect(welder.titleRu).not.toContain('Leister');
  expect(consumerRepairRowMatchesSearch(welder, 'Leister Variant')).toBe(true);
  const driver = items.find(i => i.sourceParameters?.rowCode === 'pvc-roof:machine:screwdriver')!;
  const tampered = { ...driver, sourceParameters: { ...driver.sourceParameters,
    canonicalPublicResourcePresentationV1: { ...(driver.sourceParameters?.canonicalPublicResourcePresentationV1 as object), brandAndModelRu: 'HILTI' } } };
  const rejected = buildRequestEstimateViewModel({ ...bundle, items: items.map(i => i.id === driver.id ? tampered : i) })!;
  const rejectedDriver = rejected.sections.flatMap(s => s.items).find(i => i.id === driver.id)!;
  expect(consumerRepairRowPublicResourcePresentation(rejectedDriver)).toBeNull();
  expect(consumerRepairRowMatchesSearch(rejectedDriver, 'HILTI')).toBe(false);
  expect(bundle.items.find(i => i.id === driver.id)?.sourceParameters?.canonicalPublicResourcePresentationV1).toMatchObject({ brandAndModelRu: null });
  expect(cleaner.quantity).toBeNull();
  expect(transport.preliminaryNeeds[0]).not.toHaveProperty('calculationTrace');
  const sourceRows = compiled.rows as CanonicalArtifactRow[];
  const fieldRow = sourceRows.find(r => r.row_id === 'pvc-roof:material:field')!;
  expect(canonicalArtifactVisibleRowTitle(fieldRow)).toBe(source.nameRu);
  expect(canonicalArtifactSpecificationParts(fieldRow, compiled.parameters).flatMap(s => s.parts)).not.toContain('LOGICROOF V-RP');
  const nativeBefore=JSON.stringify({stored,sourceRows});
  const nativeAudit=canonicalEstimateSavedOperationAcceptanceV1({revision:stored,resources:[...sourceRows,...canonicalArtifactPreliminaryNeeds(stored)]});
  expect(nativeAudit).toMatchObject({status:'STRUCTURE_INVALID',pdfAllowed:false,completeClaimAllowed:false});
  expect(nativeAudit.issues).toEqual(expect.arrayContaining([
    ...['pvc-roof:scope:area','pvc-roof:scope:original646','pvc-roof:labor:workers','pvc-roof:scope:operators']
      .map(rowId=>({code:'RESOURCE_OPERATION_MISSING',rowId})),{code:'INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED'},
  ]));
  expect(()=>buildCanonicalProfessionalPdfProjection({revision:stored,rows:sourceRows,
    preliminaryNeeds:canonicalArtifactPreliminaryNeeds(stored),expectedProjectedRowCount:sourceRows.length,workTitleRu:catalog.titleRu}))
    .toThrow(expect.objectContaining({code:'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID'}));
  expect(JSON.stringify({stored,sourceRows})).toBe(nativeBefore);expect(fieldRow.title_ru).toContain('LOGICROOF');
  const procurement = buildCanonicalProcurementProjection({ revision: stored,
    procurementRows: sourceRows.filter(r => r.included_in_procurement), sourceRows });
  expect(procurement.rows.find(r => r.rowId === 'pvc-roof:material:field')).toMatchObject({ titleRu: source.nameRu, quantity: '157.5' });
  expect(field.titleRu).toBe(fieldRow.title_ru); // Draft storage remains the full immutable source title.
});

// Independent synthetic layout evidence, never an actual G6/OEM recipe or norm.
const testPdfOperation={contractVersion:'canonical-operation-resource/v1',groupId:'test-public-layout',groupTitleRu:'Проверочная работа',
 operationId:'test-public-layout:prepare',operationTitleRu:'Подготовить проверочный участок',completionCriterionRu:'Участок подготовлен',processRole:'PROCESS',processOrdinal:1};
const testNoClasses=()=>Object.fromEntries(['MATERIAL','CONSUMABLE','TOOL','ACCESSORY','EQUIPMENT','MECHANISM','LABOR','SERVICE','TRANSPORT','PPE']
 .map(kind=>[kind,{status:'NOT_APPLICABLE',reasonRu:'Только синтетический контракт представления, не реальная технология'}]));
function bindTestPdfEvidence<T extends Record<string,unknown>>(revision:T,map:unknown){
 const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:String(revision.release_id),definitionVersionId:String(revision.definition_version_id),
  passport:{definition_version_id:revision.definition_version_id,payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:map}}})!;
 return{...revision,amendment_contract:{parameterSources:{operationCompositionEvidenceV1:evidence}}};
}

test('independently declared synthetic composition renders public names and an unknown material through the unmocked common PDF',()=>{
 const cleanerName='Очиститель для ПВХ-мембран',rawCleaner='Очиститель для ПВХ-мембран — проверочная исходная спецификация';
 const row=(id:string,title:string,name:string,quantity:string|null,ordinal:number):CanonicalArtifactRow=>({row_id:id,ordinal,title_ru:title,category:'material',unit_id:quantity==null?'l':'m2',
  quantity,unit_price:null,amount:null,currency_code:'KGS',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,
  ownership_status:quantity==null?'PRELIMINARY_NEED':'OWNED_EXCLUDED',...(quantity==null?{need_state:'QUANTITY_REQUIRED'}:{}),
  calculation_trace:{resourceGraph:{costTreatment:'OWN_COST',operationCompositionV1:testPdfOperation,
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:title,nameRu:name,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:'MATERIAL'}}}});
 const rows=[row('test-layout:field',source.sourceTitleRu,source.nameRu,'12.5',0)],needs=[row('test-layout:cleaner',rawCleaner,cleanerName,null,1)];
 const saved=bindTestPdfEvidence({id:'test-public-pdf',release_id:'test-public-release',definition_version_id:'test-public-definition',catalog_id:'TEST_ONLY_LAYOUT',
  checksum_sha256:'a'.repeat(64),row_count:1,currency_code:'KGS',input_parameters:{},definition_withdrawal_reason:null},
  {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,evidenceSha256:'e'.repeat(64),operationRoster:[testPdfOperation],
   entries:[{operationId:testPdfOperation.operationId,expectedResourceId:'test-layout:field',sourceId:'TEST_ONLY_SOURCE',condition:'Синтетический материал',requiredOperationIds:[testPdfOperation.operationId],publicNameRu:source.nameRu,resourceKind:'MATERIAL',resolution:{kind:'ROW',rowId:'test-layout:field'}},
    {operationId:testPdfOperation.operationId,expectedResourceId:'test-layout:cleaner',sourceId:'TEST_ONLY_SOURCE',condition:'Синтетическое неизвестное количество',requiredOperationIds:[testPdfOperation.operationId],publicNameRu:cleanerName,resourceKind:'MATERIAL',resolution:{kind:'ROW',rowId:'test-layout:cleaner'}}],
   operationRequirements:[{operationId:testPdfOperation.operationId,sourceId:'TEST_ONLY_SOURCE',requirements:{...testNoClasses(),MATERIAL:{status:'REQUIRED',rowIds:['test-layout:field','test-layout:cleaner']}}}]});
 const before=JSON.stringify({saved,rows,needs});
 expect(canonicalEstimateSavedOperationAcceptanceV1({revision:saved,resources:[...rows,...needs]})).toMatchObject({status:'COMPOSITION_UNVERIFIED',pdfAllowed:true,completeClaimAllowed:false});
 const pdf=buildCanonicalProfessionalPdfProjection({revision:saved,rows,preliminaryNeeds:needs,workTitleRu:'Проверочная работа'});
 expect(pdf.html).toContain('<strong>'+source.nameRu+'</strong>');expect(pdf.html).not.toContain('LOGICROOF');expect(pdf.html).not.toContain('ТЕХНОНИКОЛЬ');
 expect(pdf.html).toContain('<td class="numeric">12,5</td>');expect(pdf.html).toContain('<strong>'+cleanerName+'</strong>');
 expect(pdf.html).toContain('<td class="numeric">Не рассчитано</td>');
 // The PDF composition contains both the known row and the unknown need.
 expect(pdf.rowCount).toBe(2);expect(pdf.preliminaryNeedCount).toBe(1);
 expect(JSON.stringify({saved,rows,needs})).toBe(before);
});
test('existing dynamic material policy remains saved when a row has no public naming descriptor', async () => {
  const facts = { ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT };
  const result = await compileMasonryBrickWallBiaTn10R1(facts);
  const brick = result.rows.find(row => ((row.calculation_trace as Record<string, unknown>).resourceGraph as Record<string, unknown>)
    .professionalMaterialQuantityPolicyV1 != null)!;
  expect(brick.calculation_trace).toMatchObject({ resourceGraph: { professionalMaterialQuantityPolicyV1: {
    wastePercent: 3, procurementPackageSize: 500,
    formulaInputs: expect.objectContaining({ brick_breakage_percent: result.parameters.brick_breakage_percent,
      brick_supplier_package_pieces: result.parameters.brick_supplier_package_pieces }) } } });
});


test('all24 authored CT126 batch counters are calculation details, with physical supplies retained', () => {
  const ids=new Set(['putty:ct126-dry-wall','putty:ct126-prepared:wall-cement','putty:ct126-prepared:wall-smooth-concrete']
    .flatMap(prefix=>[5,20].flatMap(size=>['minimum-batches','planned-batches','plan-coverage','plan-excess'].map(suffix=>`${prefix}:${size}kg-${suffix}`))));
  const bindings=publicSubworkBindings.bindings.filter(binding=>ids.has(binding.rowId));
  expect(bindings).toHaveLength(24);
  for(const binding of bindings){
    const input={titleRu:binding.sourceTitleRu,rowId:binding.rowId,descriptor:null,category:'material',graph:{},
      costTreatment:'INFORMATIONAL_SCOPE',includedInEstimate:false,includedInProcurement:false};
    expect(canonicalPublicResourceRowKindV1(input)).toBe('CALCULATION_DETAIL');
    for(const patch of [{includedInEstimate:true},{includedInProcurement:true},{manualTitleOverride:true},{unitPrice:'50'},
      {rowId:'unrelated-physical-need'},{titleRu:'Иной реальный ресурс'},{costTreatment:'OWN_COST'}]){
      expect(canonicalPublicResourceRowKindV1({...input,...patch})).toBe('RESOURCE');
    }
  }
});

test('the shared PDF omits an authored counter in an independently declared synthetic physical layout',()=>{
  const binding=publicSubworkBindings.bindings.find(binding=>binding.rowId==='putty:ct126-prepared:wall-cement:20kg-planned-batches')!;
  const sourceRows=Array.from({length:2},(_,index)=>({...rowsForCounterRoleTest(index)}));
  function rowsForCounterRoleTest(index:number):CanonicalArtifactRow{return {row_id:index===0?binding.rowId:'physical-mixer',ordinal:index,
    title_ru:index===0?binding.sourceTitleRu:'Дрель с насадкой для перемешивания',category:index===0?'material':'equipment',
    unit_id:index===0?'pcs':'item',quantity:index===0?'11':'1',unit_price:null,amount:null,currency_code:'KGS',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,ownership_status:'OWNED_EXCLUDED',
    calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE'}}} as CanonicalArtifactRow;}
  const saved={id:'00000000-0000-4000-8000-000000000001',release_id:'00000000-0000-4000-8000-000000000002',catalog_id:'counter-role-fixture',checksum_sha256:'a'.repeat(64),row_count:2,revision_number:1,currency_code:'KGS',created_at:'2026-10-21T00:00:00Z',input_parameters:{},primary_measure_value:'35.5',primary_measure_unit_id:'m2'};
  const counterBefore=JSON.stringify(sourceRows[0]);
  const physical=sourceRows[1]!,title=String(physical.title_ru);
  physical.calculation_trace={resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',operationCompositionV1:testPdfOperation,
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:title,nameRu:title,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:'EQUIPMENT'}}};
  const boundSaved=bindTestPdfEvidence({...saved,definition_version_id:'TEST_ONLY_COUNTER_LAYOUT_DEFINITION',definition_withdrawal_reason:null},
   {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,evidenceSha256:'e'.repeat(64),operationRoster:[testPdfOperation],
    entries:[{operationId:testPdfOperation.operationId,expectedResourceId:'test-physical-mixer',sourceId:'TEST_ONLY_SOURCE',condition:'Синтетическая проверка роли счётчика',requiredOperationIds:[testPdfOperation.operationId],publicNameRu:'Дрель с насадкой для перемешивания',resourceKind:'EQUIPMENT',resolution:{kind:'ROW',rowId:'physical-mixer'}}],
    operationRequirements:[{operationId:testPdfOperation.operationId,sourceId:'TEST_ONLY_SOURCE',requirements:{...testNoClasses(),EQUIPMENT:{status:'REQUIRED',rowIds:['physical-mixer']}}}]});
  const before=JSON.stringify({saved:boundSaved,sourceRows});
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:boundSaved,resources:sourceRows})).toMatchObject({status:'ACCEPTED',pdfAllowed:true});
  const pdf=buildCanonicalProfessionalPdfProjection({revision:boundSaved,rows:sourceRows,workTitleRu:'Выравнивание стен'});
  expect(pdf.html).not.toContain(binding.nameRu);expect(pdf.html).toContain('Дрель с насадкой для перемешивания');expect(pdf.rowCount).toBe(2);
  expect(JSON.stringify(sourceRows[0])).toBe(counterBefore);
  expect(JSON.stringify({saved:boundSaved,sourceRows})).toBe(before);
});

import {auditCanonicalPublisherSuccessorOperationResourcesR1} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {accessControlWholePassageKitMeasuredModelR6,ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2} from '../v4/accessControlSystemR1';

test.each(['labor','construction_work'])('Included native labour R1049 %s remains visible under its single existing owner',category=>{
 const input={titleRu:'Труд фактической разгрузки и перемещения оборудования',descriptor:null,category,
  rowId:'reference:acs:whole-door:r2:loading-labor',costTreatment:'INCLUDED_IN_RESOURCE_ROWS',includedInEstimate:false,includedInProcurement:false,
  graph:{includedInResourceOwnerRowId:'rc09:labor:acs-device-install',operationCompositionV1:{operationId:'access-control:whole-operations:r1:delivery'}}};
 const before=JSON.stringify(input);
 expect(canonicalPublicResourceRowKindV1(input)).toBe('RESOURCE');
 expect(JSON.stringify(input)).toBe(before);
 expect(canonicalPublicResourceRowKindV1({...input,costTreatment:'INFORMATIONAL_SCOPE',graph:{...input.graph,purchaseBalanceOwnerRowId:'rc09:labor:acs-device-install'}})).toBe('CALCULATION_DETAIL');
});
test('Included native labour R1049 explicit process and calculation roles remain authoritative',()=>{
 const titleRu='Труд фактической разгрузки и перемещения оборудования';
 const descriptor={contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:titleRu,nameRu:titleRu,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:'LABOR'};
 const input={titleRu,descriptor,category:'construction_work',rowId:'explicit-role',costTreatment:'INCLUDED_IN_RESOURCE_ROWS',includedInEstimate:false,includedInProcurement:false,graph:{includedInResourceOwnerRowId:'whole-work',operationCompositionV1:{operationId:'delivery'}}};
 expect(canonicalPublicResourceRowKindV1({...input,descriptor:{...descriptor,rowKind:'PROCESS_NOTE'}})).toBe('PROCESS_NOTE');
 expect(canonicalPublicResourceRowKindV1({...input,descriptor:{...descriptor,rowKind:'CALCULATION_DETAIL'}})).toBe('CALCULATION_DETAIL');
});
test('Included native labour R1049 actual ACS loading and cleanup visible while incomplete composition still refuses admission',()=>{
 const s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2,q=s.kitForwardR6,model=accessControlWholePassageKitMeasuredModelR6(s.profileId);
 const before=JSON.stringify({rows:model.resources,composition:q.independentComposition});
 const report=auditCanonicalPublisherSuccessorOperationResourcesR1({resourceDefinitions:model.resources,independentComposition:q.independentComposition});
 const labourIds=['reference:acs:whole-door:r2:loading-labor','reference:acs:whole-door:r2:cleanup-labor'];
 expect(report.issues.filter(x=>x.code==='REQUIRED_RESOURCE_MISSING'&&labourIds.includes(x.rowId??''))).toEqual([]);
 expect(report.issues.some(x=>x.code==='REQUIRED_RESOURCE_CLASS_WITHOUT_VISIBLE_ROWS')).toBe(true);
 expect(report.definitionAdmissionAllowed).toBe(false);
 expect(JSON.stringify({rows:model.resources,composition:q.independentComposition})).toBe(before);
});
