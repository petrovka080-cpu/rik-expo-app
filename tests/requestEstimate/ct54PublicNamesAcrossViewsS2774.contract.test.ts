import {createHash} from 'node:crypto';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {ct54ReadyFacadeDefinitionS2763, ct54ReadyFacadeControlFactsS2763} from '../../src/lib/estimate/v4/ct54ReadyFacadeSeriesS2763';
import {ct54RectangularProtectionDefinitionS2770,ct54ProtectionPackS2770} from '../../src/lib/estimate/v4/ct54RectangularProtectionS2770';
import {canonicalEstimateRevisionRowFromStorage} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {adaptCanonicalRevisionToStructuredEstimate} from '../../src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateCatalogItem,type CanonicalEstimateRevisionView} from '../../src/lib/estimate/backendPlatform/contracts';
import {buildStructuredEstimateRequestDraft} from '../../src/lib/estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection} from '../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection';
import type {ConsumerRepairDraftBundle,ConsumerRepairRequestItem} from '../../src/lib/consumerRequests/consumerRequestTypes';
import {buildRequestEstimateViewModel,requestEstimatePublicRevisionDiff} from '../../src/features/consumerRepair/requestEstimateViewModel';
import {consumerRepairRowPublicResourcePresentation} from '../../src/features/consumerRepair/consumerRepairRowMetadata';
import {buildCanonicalProcurementPreviewRows} from '../../src/features/consumerRepair/canonicalProcurementPreviewRows';
import {buildCanonicalProcurementProjection,canonicalArtifactSpecificationParts,canonicalArtifactVisibleRowTitle,type CanonicalArtifactRow} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {buildCanonicalProfessionalPdfProjection,CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION} from '../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {canonicalPublicEstimateRowNameRu} from '../../src/lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';

const catalogId='canonical-work:base:facade_interior_facade_paint_install_standard';
const paint='paint:ct54-simple-ready-facade:ct54_15l-order';
const film='paint:ct54-rectangular-protection:film-order';
const tape='paint:ct54-rectangular-protection:tape-order';
const expected=[
  [paint,'Силикатная краска Ceresit CT54 Silicate Aero, канистра 15 л','30'],
  [film,'Укрывная плёнка с верхней лентой tesa 4369, рулон 14 × 1,8 м','1'],
  [tape,'Лента для трёх сторон укрытия tesa 4363, рулон 25 м × 50 мм','1'],
] as const;
const hash=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');

// Two independently measured existing owners are a display fixture. This does
// not admit a new whole-estimate definition or close any unresolved norm.
async function fixture(overrides:CanonicalEstimateRevisionView['amendmentContract']['rowOverrides']={},previous?:ConsumerRepairDraftBundle) {
  const painting=ct54ReadyFacadeDefinitionS2763(),protection=ct54RectangularProtectionDefinitionS2770();
  const parameters={...ct54ReadyFacadeControlFactsS2763,q:'100',facade_norm_area_m2:'120',selected_paint_can_l:'15',
    ct54_15l_stock_cans:'0',ct54_15l_reserve_cans:'0',ct54_15l_supplier_can_multiple:'1',
    ct54_protection_method:ct54ProtectionPackS2770.exactChoiceRu,ct54_protection_site:ct54ProtectionPackS2770.exactSiteRu,
    ct54_protection_rectangle_count:'4',ct54_protection_cut_width_m:'1.2',ct54_protection_cut_height_m:'1.5',
    ct54_protection_film_stock:'0',ct54_protection_film_reserve:'0',ct54_protection_film_supplier_multiple:'1',
    ct54_protection_tape_stock:'0',ct54_protection_tape_reserve:'0',ct54_protection_tape_supplier_multiple:'1'};
  const compile=(definition:typeof painting)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId,compilerVersion:'ct54-public-name-display-fixture',
    parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
    submittedParameters:Object.fromEntries(Object.entries(parameters).filter(([id])=>definition.parameters.some(p=>p.parameter_id===id))),
    confirmedParameters:{},rowOverrides:Object.fromEntries(Object.entries(overrides).filter(([id])=>definition.resources.some(r=>r.row_id===id))),
    currencyCode:'KGS',maximumResourceRows:definition.resources.length,hashJson:hash});
  const first=await compile(painting),second=await compile(protection);
  // Independent owner compiles both start at ordinal 1. A composed saved
  // revision requires one contiguous document order without duplicate ordinals.
  const rows=[...first.rows,...second.rows].map((row,index)=>({...row,ordinal:index+1})) as CanonicalArtifactRow[];
  const stored={id:previous?'44444444-4444-4444-8444-444444444444':'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',
    catalog_id:catalogId,definition_version_id:'33333333-3333-4333-8333-333333333333',checksum_sha256:hash({rows,parameters}),
    row_count:rows.length,input_parameters:parameters,totals:first.totals,currency_code:'KGS',
    amendment_contract:{parameterSources:{preliminaryNeeds:[...first.preliminaryNeeds,...second.preliminaryNeeds]}}};
  const transport=projectCanonicalEstimatePreliminaryNeedTransport(stored);
  const catalog:CanonicalEstimateCatalogItem={catalogId,releaseId:stored.release_id,namespace:'global',workKey:'ct54-public-name-fixture',
    titleRu:'Окраска фасада',domain:'facade',definitionVersion:1,applicability:{},professionalMetadata:{},parameterSchema:[]};
  const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:stored.id,parentRevisionId:previous?'11111111-1111-4111-8111-111111111111':null,
    releaseId:stored.release_id,catalogId,revisionNumber:previous?2:1,status:'ready',currencyCode:'KGS',parameters,totals:first.totals,
    rowCount:rows.length,checksumSha256:stored.checksum_sha256,compilerVersion:'ct54-public-name-display-fixture',createdAt:'2026-10-15T00:00:00Z',
    amendmentContract:{rowOverrides:overrides,customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds};
  const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))});
  const draft=buildStructuredEstimateRequestDraft(payload);
  const items=draft.items.map((item,index)=>({...item,id:'name-fixture-'+index,requestDraftId:'name-fixture'})) as ConsumerRepairRequestItem[];
  const bundle=appendCanonicalBackendRevisionProjection({previousBundle:previous??null,nextBundle:{draft:{id:'name-fixture'},items,
    structuredEstimatePayload:draft.structuredEstimatePayload} as ConsumerRepairDraftBundle,payload});
  return {bundle,rows,stored,parameters};
}

test('three actual CT54 order rows have one clear name in app, procurement and PDF without changing saved amounts',async()=>{
  const f=await fixture(),snapshot=JSON.stringify(f);
  const visible=buildRequestEstimateViewModel(f.bundle)!.sections.flatMap(section=>section.items);
  const current=f.bundle.estimateDraftRevisionState!.revisions[0]!;
  const preview=buildCanonicalProcurementPreviewRows(current,visible);
  const procurement=buildCanonicalProcurementProjection({revision:f.stored,procurementRows:f.rows.filter(row=>row.included_in_procurement),sourceRows:f.rows});
  const pdf=buildCanonicalProfessionalPdfProjection({revision:f.stored,rows:f.rows,workTitleRu:'Окраска фасада'});
  expect(preview).toHaveLength(3);expect(procurement.rows).toHaveLength(3);
  for(const [id,name,quantity] of expected){
    expect(visible.find(row=>row.sourceParameters?.rowCode===id)?.titleRu).toBe(name);
    expect(preview.find(row=>row.rowId===id)?.titleRu).toBe(name);
    expect(procurement.rows.find(row=>row.rowId===id)).toMatchObject({titleRu:name,quantity});
    expect(canonicalArtifactVisibleRowTitle(f.rows.find(row=>row.row_id===id)!)).toBe(name);
    expect(pdf.html).toContain('<strong>'+name+'</strong>');
  }
  expect(f.rows.find(row=>row.row_id==='paint:ct54-simple-ready-facade:labor')?.quantity).toBe('17.136');
  const paintRow=f.rows.find(row=>row.row_id===paint)!;
  expect(paintRow.title_ru).toContain('один цвет и партия');
  expect(canonicalArtifactSpecificationParts(paintRow,f.parameters).flatMap(part=>part.parts)).toContain(paintRow.title_ru);
  const filmItem=visible.find(row=>row.sourceParameters?.rowCode===film)!;
  const filmRow=f.rows.find(row=>row.row_id===film)!;
  const details=consumerRepairRowPublicResourcePresentation(filmItem)!.detailsRu;
  expect(details.filter(detail=>detail===filmRow.title_ru)).toHaveLength(1);
  const parts=canonicalArtifactSpecificationParts(filmRow,f.parameters).find(part=>part.parameterId==='resource_presentation_v1')!;
  expect(parts.parts.filter(detail=>detail===filmRow.title_ru)).toHaveLength(1);
  expect(parts.value).toBe(parts.parts.join('; '));
  expect(CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).not.toBe('canonical-professional-pdf.r4-a13-s27-69-required-resource-template49');
  expect(JSON.stringify(f)).toBe(snapshot);
});

test('history uses the same film title and preserves both sides of the saved price change',async()=>{
  const first=await fixture();
  const second=await fixture({[film]:{unitPrice:'10',provenance:{kind:'manual',reason:'DISPLAY_REGRESSION_ONLY'}}},first.bundle);
  const state=second.bundle.estimateDraftRevisionState!,diff=state.diffs[0]!,snapshot=JSON.stringify(state);
  const shown=requestEstimatePublicRevisionDiff(state,diff)!;
  expect(shown.changedRows.find(row=>row.rowId===film)).toMatchObject({titleRu:expected[1][1],afterUnitPrice:10});
  expect(shown.changedRows.map(({titleRu,beforeTitleRu,...rest})=>rest)).toEqual(diff.changedRows.map(({titleRu,beforeTitleRu,...rest})=>rest));
  expect(JSON.stringify(state)).toBe(snapshot);
});

test.each(['shape','contents'])('tampered descriptor %s remains outside verified view admission',async mode=>{
  const f=await fixture(),cold=JSON.parse(JSON.stringify(f.bundle)) as ConsumerRepairDraftBundle;
  const item=cold.items.find(row=>row.sourceParameters?.rowCode===film)!;
  const descriptor=item.sourceParameters!.canonicalPublicResourcePresentationV1 as object;
  item.sourceParameters={...item.sourceParameters,canonicalPublicResourcePresentationV1:mode==='shape'
    ?{...descriptor,unexpected:'Подделка'}:{...descriptor,detailsRu:['Поддельная детализация']}};
  const shown=buildRequestEstimateViewModel(cold)!.sections.flatMap(section=>section.items).find(row=>row.id===item.id)!;
  expect(consumerRepairRowPublicResourcePresentation(shown)).toBeNull();
});

test('a manual noisy title and price survive all views and a JSON replay byte-for-byte',async()=>{
  const manual='Моя краска: CT54, без цены';
  const f=await fixture({[paint]:{titleRu:manual,unitPrice:'91.23',provenance:{kind:'manual',reason:'DISPLAY_REGRESSION_ONLY'}}});
  const cold=JSON.parse(JSON.stringify(f.bundle)) as ConsumerRepairDraftBundle;
  const visible=buildRequestEstimateViewModel(cold)!.sections.flatMap(section=>section.items);
  const current=cold.estimateDraftRevisionState!.revisions[0]!;
  expect(visible.find(row=>row.sourceParameters?.rowCode===paint)).toMatchObject({titleRu:manual,unitPrice:91.23});
  expect(buildCanonicalProcurementPreviewRows(current,visible).find(row=>row.rowId===paint)).toMatchObject({titleRu:manual,unitPrice:91.23});
  const row=f.rows.find(row=>row.row_id===paint)!;
  expect(canonicalArtifactVisibleRowTitle(row)).toBe(manual);
  expect(canonicalArtifactSpecificationParts(row,f.parameters).flatMap(part=>part.parts)).not.toContain('Силикатная краска Ceresit CT54 Silicate Aero, канистра 15л, один цвет и партия');
});

test('different specifications and unregistered owners never borrow a CT54 alias',()=>{
  const title='Силикатная краска Ceresit CT54 Silicate Aero, канистра 15л, один цвет и партия';
  const changed=title+' — специальная поставка 1:3, 3×2,5 мм²';
  expect(canonicalPublicEstimateRowNameRu({rowId:paint,titleRu:changed})).toBe(changed);
  expect(canonicalPublicEstimateRowNameRu({rowId:'other-owner',titleRu:title})).toBe(title);
  expect(canonicalPublicEstimateRowNameRu({rowId:paint,titleRu:title,manualTitleOverride:true})).toBe(title);
});
