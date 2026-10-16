// DRAFT / NOT_RUN. This is a display/replay fixture for two new material
// owners, not a current DB parent, persisted reopen or full-estimate proof.
import {createHash} from 'node:crypto';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {ct54Tesa2600DefinitionR1,ct54Tesa2600PackR1 as pack,ct54Tesa2600PrefixR1 as prefix} from '../../src/lib/estimate/v4/ct54RectangularProtectionS2770';
import {canonicalEstimateRevisionRowFromStorage} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {adaptCanonicalRevisionToStructuredEstimate} from '../../src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateCatalogItem,type CanonicalEstimateRevisionView} from '../../src/lib/estimate/backendPlatform/contracts';
import {buildStructuredEstimateRequestDraft} from '../../src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection} from '../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection';
import type {ConsumerRepairDraftBundle,ConsumerRepairRequestItem} from '../../src/lib/consumerRequests/consumerRequestTypes';
import {buildRequestEstimateViewModel,requestEstimatePublicRevisionDiff} from '../../src/features/consumerRepair/requestEstimateViewModel';
import {buildCanonicalProcurementPreviewRows} from '../../src/features/consumerRepair/canonicalProcurementPreviewRows';
import {consumerRepairRowPublicResourcePresentation} from '../../src/features/consumerRepair/consumerRepairRowMetadata';
import {buildCanonicalProcurementProjection,canonicalArtifactSpecificationParts,canonicalArtifactVisibleRowTitle,type CanonicalArtifactRow} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {buildCanonicalProfessionalPdfProjection} from '../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';

const catalogId = 'canonical-work:base:facade_interior_facade_paint_install_standard';
const film = prefix+':film-order',tape = prefix+':tape-order';
const expected = [
  [film,'Укрывная плёнка с верхней лентой tesa 4369, рулон 14 × 2,6 м'],
  [tape,'Лента для трёх сторон укрытия tesa 4363, рулон 25 м × 50 мм'],
] as const;
const hash = (value:unknown) => createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');

async function fixture(overrides:CanonicalEstimateRevisionView['amendmentContract']['rowOverrides']={},previous?:ConsumerRepairDraftBundle) {
  const definition = ct54Tesa2600DefinitionR1();
  const parameters = {ct54_protection_method:pack.exactChoiceRu,ct54_tesa2600_site:pack.exactSiteRu,
    ct54_tesa2600_rectangle_count:'3',ct54_tesa2600_cut_width_m:'1.2',ct54_tesa2600_cut_height_m:'2.2',
    ct54_tesa2600_film_stock:'0',ct54_tesa2600_film_reserve:'0',ct54_tesa2600_film_supplier_multiple:'1',
    ct54_tesa2600_tape_stock:'0',ct54_tesa2600_tape_reserve:'0',ct54_tesa2600_tape_supplier_multiple:'1'};
  const compiled = await compileCanonicalEstimateCore({operation:'recalculate',catalogId,compilerVersion:'ct54-tesa2600-display-fixture',
    parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
    submittedParameters:parameters,confirmedParameters:{},rowOverrides:overrides,
    currencyCode:'KGS',maximumResourceRows:definition.resources.length,hashJson:hash});
  const rows = compiled.rows as CanonicalArtifactRow[];
  const stored = {id:previous?'44444444-4444-4444-8444-444444444444':'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',
    catalog_id:catalogId,definition_version_id:'33333333-3333-4333-8333-333333333333',checksum_sha256:hash({rows,parameters}),
    row_count:rows.length,input_parameters:parameters,totals:compiled.totals,currency_code:'KGS',
    amendment_contract:{parameterSources:{preliminaryNeeds:compiled.preliminaryNeeds}}};
  const transport = projectCanonicalEstimatePreliminaryNeedTransport(stored);
  const catalog:CanonicalEstimateCatalogItem = {catalogId,releaseId:stored.release_id,namespace:'global',workKey:'ct54-tesa2600-display-fixture',
    titleRu:'Окраска фасада — вариант укрытия 2,6 м',domain:'facade',definitionVersion:1,applicability:{},professionalMetadata:{},parameterSchema:[]};
  const revision:CanonicalEstimateRevisionView = {apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:stored.id,parentRevisionId:previous?'11111111-1111-4111-8111-111111111111':null,
    releaseId:stored.release_id,catalogId,revisionNumber:previous?2:1,status:'ready',currencyCode:'KGS',parameters,totals:compiled.totals,
    rowCount:rows.length,checksumSha256:stored.checksum_sha256,compilerVersion:'ct54-tesa2600-display-fixture',createdAt:'2026-10-16T00:00:00Z',
    amendmentContract:{rowOverrides:overrides,customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds};
  const payload = adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))});
  const draft = buildStructuredEstimateRequestDraft(payload);
  const items = draft.items.map((item,index)=>({...item,id:'tesa2600-name-fixture-'+index,requestDraftId:'tesa2600-name-fixture'})) as ConsumerRepairRequestItem[];
  const bundle = appendCanonicalBackendRevisionProjection({previousBundle:previous??null,nextBundle:{draft:{id:'tesa2600-name-fixture'},items,
    structuredEstimatePayload:draft.structuredEstimatePayload} as ConsumerRepairDraftBundle,payload});
  return {bundle,rows,stored,parameters};
}

test('new exact source names reach app, procurement and PDF without a 1.8 m alias',async()=>{
  const f = await fixture(),before = JSON.stringify(f);
  const visible = buildRequestEstimateViewModel(f.bundle)!.sections.flatMap(section=>section.items);
  const current = f.bundle.estimateDraftRevisionState!.revisions[0]!;
  const preview = buildCanonicalProcurementPreviewRows(current,visible);
  const procurement = buildCanonicalProcurementProjection({revision:f.stored,procurementRows:f.rows.filter(row=>row.included_in_procurement),sourceRows:f.rows});
  const pdf = buildCanonicalProfessionalPdfProjection({revision:f.stored,rows:f.rows,workTitleRu:'Окраска фасада — укрытие 2,6 м'});
  expect(preview).toHaveLength(2);expect(procurement.rows).toHaveLength(2);
  for(const [id,name] of expected) {
    expect(visible.find(row=>row.sourceParameters?.rowCode === id)?.titleRu).toBe(name);
    expect(preview.find(row=>row.rowId === id)?.titleRu).toBe(name);
    expect(procurement.rows.find(row=>row.rowId === id)).toMatchObject({titleRu:name,quantity:'1'});
    expect(canonicalArtifactVisibleRowTitle(f.rows.find(row=>row.row_id === id)!)).toBe(name);
    expect(pdf.html).toContain('<strong>'+name+'</strong>');
  }
  expect(pdf.html).not.toContain('14 × 1,8 м');
  expect(JSON.stringify(f)).toBe(before);
});

test('the ordinary on-demand descriptor and procurement specifications keep the right roll price unit',async()=>{
  const f = await fixture(),before = JSON.stringify(f);
  const visible = buildRequestEstimateViewModel(f.bundle)!.sections.flatMap(section=>section.items);
  const procurement = buildCanonicalProcurementProjection({revision:f.stored,
    procurementRows:f.rows.filter(row=>row.included_in_procurement),sourceRows:f.rows});
  const contracts = [
    [film,"Цена задаётся за один целый рулон tesa 4369 размером 14 × 2,6 м и не переносится из цены плёнки за м².","Цена задаётся за один целый рулон tesa 4363 размером 25 м × 50 мм и не переносится из цены ленты за метр."],
    [tape,"Цена задаётся за один целый рулон tesa 4363 размером 25 м × 50 мм и не переносится из цены ленты за метр.","Цена задаётся за один целый рулон tesa 4369 размером 14 × 2,6 м и не переносится из цены плёнки за м²."],
  ] as const;
  for(const [id,ownPrice,otherPrice] of contracts) {
    const item = visible.find(row=>row.sourceParameters?.rowCode === id)!;
    expect(item).toBeDefined();
    const onDemand = consumerRepairRowPublicResourcePresentation(item);
    expect(onDemand?.detailsRu).toContain(ownPrice);
    expect(onDemand?.detailsRu).not.toContain(otherPrice);
    const specifications = procurement.rows.find(row=>row.rowId === id)!.specifications.flatMap(part=>part.parts);
    expect(specifications).toContain(ownPrice);expect(specifications).not.toContain(otherPrice);
  }
  const information = f.rows.filter(row=>!row.included_in_procurement);
  expect(information).toHaveLength(11);
  for(const row of information) {
    const specifications = canonicalArtifactSpecificationParts(row,f.parameters).flatMap(part=>part.parts);
    expect(specifications.join(' ')).not.toMatch(/цен[аыуе]/iu);
  }
  // The ordinary PDF keeps the existing title/specification path; it does not
  // render detailsRu. Existing PDF assertions do not claim otherwise.
  expect(JSON.stringify(f)).toBe(before);
});

test('history keeps the new film identity and both prices without rewriting saved rows',async()=>{
  const first = await fixture();
  const second = await fixture({[film]:{unitPrice:'91.23',provenance:{kind:'manual',reason:'NEW_SKU_DISPLAY_ONLY'}}},first.bundle);
  const state = second.bundle.estimateDraftRevisionState!,diff = state.diffs[0]!,before = JSON.stringify(state);
  const shown = requestEstimatePublicRevisionDiff(state,diff)!;
  expect(shown.changedRows.find(row=>row.rowId === film)).toMatchObject({titleRu:expected[0][1],afterUnitPrice:91.23});
  expect(shown.changedRows.map(({titleRu,beforeTitleRu,...rest})=>rest)).toEqual(diff.changedRows.map(({titleRu,beforeTitleRu,...rest})=>rest));
  expect(JSON.stringify(state)).toBe(before);
});

test('a manual new-SKU title and price remain authored through JSON replay, app and PDF',async()=>{
  const manual = 'Моя плёнка 14 × 2,6 м <заказ владельца>';
  const f = await fixture({[film]:{titleRu:manual,unitPrice:'91.23',quantity:'12',provenance:{kind:'manual',reason:'NEW_SKU_DISPLAY_ONLY'}}});
  const cold = JSON.parse(JSON.stringify(f.bundle)) as ConsumerRepairDraftBundle;
  const visible = buildRequestEstimateViewModel(cold)!.sections.flatMap(section=>section.items);
  const current = cold.estimateDraftRevisionState!.revisions[0]!;
  expect(visible.find(row=>row.sourceParameters?.rowCode === film)).toMatchObject({titleRu:manual,unitPrice:91.23});
  expect(buildCanonicalProcurementPreviewRows(current,visible).find(row=>row.rowId === film)).toMatchObject({titleRu:manual,unitPrice:91.23});
  const row = f.rows.find(row=>row.row_id === film)!;
  expect(row.quantity).toBe('12');expect(canonicalArtifactVisibleRowTitle(row)).toBe(manual);
  expect(canonicalArtifactSpecificationParts(row,f.parameters).flatMap(part=>part.parts)).not.toContain(expected[0][1]);
  const pdf = buildCanonicalProfessionalPdfProjection({revision:f.stored,rows:f.rows,workTitleRu:'Укрытие 2,6 м'});
  expect(pdf.html).toContain('&lt;заказ владельца&gt;');expect(pdf.html).not.toContain('<заказ владельца>');
});
