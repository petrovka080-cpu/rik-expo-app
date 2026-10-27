import {
  buildCanonicalProfessionalPdfProjection,
  canonicalProfessionalPdfCategory,
  CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER,
  CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
  assertCanonicalProfessionalPdfJobRendererVersion,
  assertCanonicalProfessionalPdfMoneyCells,
} from "./canonicalProfessionalPdf";
import type { CanonicalArtifactRow } from "./canonicalEstimateArtifactContract";
import { canonicalArtifactUnit, buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "./canonicalEstimateArtifactContract";
import { canonicalEstimateParameterChoiceLabelRu } from "./canonicalEstimateParameterSemantics";
import { publicBoqDisplayNameRu } from "../publicBoqNaming";
import { compilePressureSewerPipelineR1, PRESSURE_SEWER_PIPELINE_SHORT_INPUT } from "../v4/pressureSewerPipelineR1";
import unresolvedCeiling from '../../../../data/estimate-benchmarks/fixtures/master24-ceiling-unresolved-included-pdf-r1.json';
import geometryCatalogs from '../../../../data/estimate-benchmarks/fixtures/master24-ordinary-geometry-current-catalogs-r1.json';
import type {CanonicalEstimateCatalogItem} from './contracts';

// This unit suite isolates HTML layout/money from artifact admission. It does
// not admit its synthetic rows as a real technology. Actual saved composition
// refusal and quantity-only approval run without mocks in artifact/owner suites.
// Production build keeps the strict assert; structural defects remain real here.
jest.mock('./canonicalEstimateSavedOperationAcceptanceV1',()=>{
  const actual=jest.requireActual<typeof import('./canonicalEstimateSavedOperationAcceptanceV1')>('./canonicalEstimateSavedOperationAcceptanceV1');
  return {...actual,assertCanonicalEstimateSavedArtifactStructureV1:(acceptance:Parameters<typeof actual.assertCanonicalEstimateSavedArtifactStructureV1>[0])=>{
    if(acceptance.status==='STRUCTURE_INVALID')actual.assertCanonicalEstimateSavedArtifactStructureV1(acceptance);
  }};
});

// Synthetic layout/money fixtures declare one real test process. This does
// not enrich producer output or saved captures and proves no independent kit.
const syntheticPdfOperation={contractVersion:'canonical-operation-resource/v1',groupId:'test-layout',
  groupTitleRu:'Проверочная работа',operationId:'test-layout:install',operationTitleRu:'Выполнить монтаж проверочного узла',
  completionCriterionRu:'Проверочный узел установлен',processRole:'PROCESS',processOrdinal:-1};
function syntheticTrace<T extends Record<string,unknown> = Record<string,never>>(trace:T = {} as T) {
  const graph=trace.resourceGraph!=null&&typeof trace.resourceGraph==='object'&&!Array.isArray(trace.resourceGraph)
    ? trace.resourceGraph as Record<string,unknown>:{};
  return {...trace,resourceGraph:{operationCompositionV1:syntheticPdfOperation,...graph}} as T & {
    resourceGraph:(T extends {resourceGraph:infer G}?G:Record<string,never>) & {operationCompositionV1:typeof syntheticPdfOperation}};
}

// Independent synthetic display fixture: deliberately not the real saved ceiling
// capture. Its one declared process permits quantity/money assertions while the
// unchanged native capture must fail the common operation-structure barrier.
function syntheticIncludedQuantityFixture(): {owner:CanonicalArtifactRow;savedNeed:CanonicalArtifactRow} {
  const owner:CanonicalArtifactRow={...rows(1)[0]!,row_id:'synthetic-ceiling:owner',category:'work',
    title_ru:'Монтаж проверочного потолка',unit_id:'m2',quantity:'300',unit_price:'100',amount:'30000',
    currency_code:'KGS',procurement_eligible:false,included_in_procurement:false};
  const title='Труд устройства шва проверочного потолка';
  const savedNeed:CanonicalArtifactRow={...rows(1)[0]!,row_id:'synthetic-ceiling:included-labor',ordinal:1,
    category:'labor',title_ru:title,unit_id:'man_hour',quantity:null,unit_price:null,amount:null,
    ownership_status:'PRELIMINARY_NEED',need_state:'QUANTITY_REQUIRED',included_in_estimate:false,
    included_in_procurement:false,procurement_eligible:false,
    calculation_trace:syntheticTrace({needState:'QUANTITY_REQUIRED',resourceGraph:{
      costTreatment:'INCLUDED_IN_RESOURCE_ROWS',includedInResourceOwnerRowId:owner.row_id,
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:title,
        nameRu:title,resourceKind:'LABOR',brandAndModelRu:null,specificationRu:null,detailsRu:[]}}})};
  return {owner,savedNeed};
}
function assertNativeCeilingStructureHold() {
  const before=JSON.stringify(unresolvedCeiling);
  expect(()=>buildCanonicalProfessionalPdfProjection({revision:revision(1),rows:[unresolvedCeiling.owner],
    preliminaryNeeds:[{...unresolvedCeiling.need,included_in_estimate:false,included_in_procurement:false,ownership_status:'PRELIMINARY_NEED'}],workTitleRu:'Потолок ГКЛ П112.1'}))
    .toThrow(expect.objectContaining({code:'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID',
      operationResourceAcceptanceV1:expect.objectContaining({issues:expect.arrayContaining([{
        code:'RELATED_OPERATION_INVALID_OR_DUPLICATED',rowId:unresolvedCeiling.owner.row_id}])})}));
  expect(JSON.stringify(unresolvedCeiling)).toBe(before);
}
// These are already synthetic title/layout rows. A source-bound public name
// makes their intentionally verbose saved title compatible with the same guard.
function syntheticPublicTitleTrace(row:CanonicalArtifactRow,nameRu:string,resourceKind:string) {
  const trace=row.calculation_trace as Record<string,unknown>;
  const graph=(trace.resourceGraph??{}) as Record<string,unknown>;
  return syntheticTrace({...trace,resourceGraph:{...graph,publicResourcePresentationV1:{
    contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu,
    resourceKind,brandAndModelRu:null,specificationRu:null,detailsRu:[]}}});
}

test('renders service hours through the shared unit label without changing the saved service or quantity', () => {
  const source = [{...rows(1)[0]!, row_id:'service-hours', category:'service', unit_id:'service_hour',
    title_ru:'Геодезический контроль конструкции', quantity:'2.75', unit_price:null, amount:null}];
  const before = JSON.stringify(source);
  const projection = buildCanonicalProfessionalPdfProjection({revision:revision(1),rows:source,workTitleRu:'Контроль конструкции'});
  expect(canonicalArtifactUnit(source[0]!)).toBe('ч');
  expect(projection.html).toContain('<td class="unit">ч</td>');
  expect(projection.html).toContain('<td class="numeric">2,75</td>');
  expect(projection.html).not.toContain('service_hour');
  expect(JSON.stringify(source)).toBe(before);
});

test.each(['Требуется цена','Включено в № 1','Без доплаты','Не суммируется','—','уточнить','NaN сом','<span>100,00 сом</span>'])(
  'the common PDF guard rejects a non-numeric money cell: %s', caption => {
    expect(() => assertCanonicalProfessionalPdfMoneyCells(`<table><tr><td class="money">${caption}</td></tr></table>`))
      .toThrow(expect.objectContaining({code:'ARTIFACT_MONEY_CELL_PRESENTATION_INVALID'}));
  },
);

test.each(['','0,00 сом','1\u00a0294,65 сом','12\u202f345,00 USD','-100,00 EUR'])(
  'the common PDF guard accepts a numeric money cell or an empty field: %s', value => {
    expect(() => assertCanonicalProfessionalPdfMoneyCells(`<td class="numeric money">${value}</td>`)).not.toThrow();
  },
);

test('PDF identifies the saved corrected geometry beside the original request without printing an application norm',()=>{
  const schema=geometryCatalogs.items.ceiling.parameterSchema as CanonicalEstimateCatalogItem['parameterSchema'];
  const values={room_length_m:'20',room_width_m:'15',ceiling_height_m:'3',ceiling_drop_m:'0.1',p112_emac_joint_labor_hours:'7'};
  const saved={...revision(1),catalog_id:geometryCatalogs.items.ceiling.catalogId,
    source_request_text:'Потолок ГКЛ, опуск потолка 250 мм.',input_parameters:values,
    amendment_contract:{parameterSources:{userParameters:values}}};
  const before=JSON.stringify(saved),projection=buildCanonicalProfessionalPdfProjection({revision:saved,rows:rows(1),
    workTitleRu:'Потолок ГКЛ',parameterSchema:schema});
  const line=projection.html.match(/<div class="notice current-measurements">(.*?)<\/div>/su)?.[1];
  expect(line).toBeDefined();expect(line).toContain('Данные расчёта:');
  expect(line).toContain('0,1 м');expect(line).toContain('20 м');expect(line).toContain('15 м');
  expect(line).not.toContain('250');expect(line).not.toContain('p112_');
  const norm=schema.find(parameter=>parameter.parameterId==='p112_emac_joint_labor_hours')!;
  expect(line).not.toContain(norm.titleRu);expect(projection.html).toContain('опуск потолка 250 мм.');
  expect(JSON.stringify(saved)).toBe(before);
  const legacy=buildCanonicalProfessionalPdfProjection({revision:saved,rows:rows(1),workTitleRu:'Потолок ГКЛ'});
  expect(legacy.html).not.toContain('current-measurements');
});

test.each(['PROCESS_NOTE','CALCULATION_DETAIL'])(
  'a saved included labor quantity need stays explicit despite display role %s', rowKind => {
    assertNativeCeilingStructureHold();
    const {owner,savedNeed}=syntheticIncludedQuantityFixture(),trace=savedNeed.calculation_trace as {resourceGraph:Record<string,unknown>&{publicResourcePresentationV1:Record<string,unknown>}};
    const need:CanonicalArtifactRow={...savedNeed,ownership_status:'PRELIMINARY_NEED',amount:null,
      included_in_estimate:false,included_in_procurement:false,
      calculation_trace:{...trace,resourceGraph:{...trace.resourceGraph,
        publicResourcePresentationV1:{...trace.resourceGraph.publicResourcePresentationV1,rowKind}}}};
    const before=JSON.stringify({owner,need});
    const projection=buildCanonicalProfessionalPdfProjection({revision:revision(1),rows:[owner],
      preliminaryNeeds:[need],workTitleRu:'Потолок ГКЛ П112.1'});
    expect(projection.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
    expect(projection.pricedRowCount).toBe(1);expect(projection.missingPriceRowCount).toBe(0);
    expect(projection.categoryTotals.work).toBe(30000);
    expect(projection.html).toContain('<strong>Позиций сметы</strong><br>2');
    expect(projection.html).toContain('<strong>Количество известно</strong><br>1; ещё не рассчитано 1');
    expect(projection.html).toContain(savedNeed.title_ru);
    expect(projection.html).toContain('Не рассчитано');
    expect(projection.html).toContain('Ещё не рассчитано позиций: 1.');
    expect(projection.html).not.toMatch(/Включено в №|Без доплаты/u);
    const needRows=[...projection.html.matchAll(/<tr class="preliminary-need">([\s\S]*?)<\/tr>/gu)];
    expect(needRows.length).toBeGreaterThan(0);
    for(const [,html]of needRows)expect([...html!.matchAll(/<td class="money">(.*?)<\/td>/gu)].map(match=>match[1])).toEqual(['','']);
    expect(projection.html.match(/<td class="money">30\u00a0000,00 сом<\/td>/gu)).toHaveLength(1);
    expect(projection.html).toContain('<strong>полный итог не рассчитан</strong>');
    expect(projection.html).not.toContain('p112_emac_joint_labor_hours');
    expect(projection.html).not.toContain('Нужно уточнить условия, указанные в примечаниях');
    expect(JSON.stringify({owner,need})).toBe(before);
  },
);

test.each(['4.625', 0, null])('a pending physical quantity %s retains its saved unit price only as a reference', quantity => {
  assertNativeCeilingStructureHold();
  const {owner,savedNeed:source}=syntheticIncludedQuantityFixture();
  const need: CanonicalArtifactRow = {...source,ownership_status:'PRELIMINARY_NEED',need_state:'QUANTITY_REQUIRED',
    quantity,unit_price:'1294.65',amount:null,currency_code:'KGS',included_in_estimate:false,included_in_procurement:false,
    calculation_trace:{...(source.calculation_trace as Record<string,unknown>),manualQuantityOverride:quantity!=null,manualPriceOverride:true}};
  const before=JSON.stringify({owner,need});
  const projection=buildCanonicalProfessionalPdfProjection({revision:revision(1),rows:[owner],preliminaryNeeds:[need],workTitleRu:'Потолок ГКЛ'});
  expect(projection.html).toContain('<td class="money">1\u00a0294,65 сом</td>');
  expect(projection.html).toContain(`<td class="numeric">${quantity==null?'Не рассчитано':quantity===0?'0':'4,625'}</td>`);
  // A supplied quantity and unresolved readiness are independent. Neither a
  // pending source condition nor a legitimate zero makes a value unknown.
  expect(projection.html).toContain(`<strong>Количество известно</strong><br>${quantity==null?1:2}; ещё не рассчитано ${quantity==null?1:0}`);
  const needRows=[...projection.html.matchAll(/<tr class="preliminary-need">([\s\S]*?)<\/tr>/gu)];
  expect(needRows.length).toBeGreaterThan(0);
  for(const [,html]of needRows)expect([...html!.matchAll(/<td class="money">(.*?)<\/td>/gu)].map(match=>match[1])).toEqual(['1\u00a0294,65 сом','']);
  expect(projection.html.match(/<td class="money">30\u00a0000,00 сом<\/td>/gu)).toHaveLength(1);
  expect(projection.pricedRowCount).toBe(1);
  expect(projection.missingPriceRowCount).toBe(0);
  expect(projection.preliminaryNeedCount).toBe(1);
  expect(projection.categoryTotals.work).toBe(30000);
  expect(projection.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
  expect(selectCanonicalArtifactRows([owner,need]).procurementRows.some(row=>row.row_id===need.row_id)).toBe(false);
  expect(JSON.stringify({owner,need})).toBe(before);
});

test("versioned professional PDF jobs reject an obsolete worker and retain legacy compatibility", () => {
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION })).not.toThrow();
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({})).not.toThrow();
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.old" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-public-selected-specification-template80" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-s27-37-work-process" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-s27-75-manual-supply-confirmation-template51" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-s27-75-subwork-resources-template52" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-operation-resource-presentation-template60" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-operation-resource-presentation-template62" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-unresolved-included-quantity-template63" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-current-saved-geometry-template64" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-saved-pending-reference-price-template65" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-no-inline-notes-template67" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  for (const invalid of [null, [], { rendererVersion: null }]) {
    expect(() => assertCanonicalProfessionalPdfJobRendererVersion(invalid))
      .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  }
});

function revision(rowCount: number) {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    release_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    catalog_id: "canonical-work:roof",
    checksum_sha256: "f".repeat(64),
    row_count: rowCount,
    revision_number: 7,
    currency_code: "KGS",
    totals: { amount: "0" },
    input_parameters: { roof_area_m2: 216, confirmed: true },
    primary_measure_value: "216",
    primary_measure_unit_id: "m2",
    created_at: "2026-09-04T10:30:00.000Z",
  };
}
test('public PDF translates saved fixture annotations without presenting them as a supplier confirmation',()=>{
 const source=rows(1),spec='CONTROL_ONLY QA exact source-compatible supply, not supplier offer';
 source[0]={...source[0]!,title_ru:'Кирпич М100 — '+spec,calculation_trace:syntheticTrace({resourceGraph:{
  titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — ',titleSpecificationParameterIds:['brick_spec'],
  publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
   sourceTitleRu:'Кирпич М100 — '+spec,nameRu:'Кирпич М100',brandAndModelRu:null,specificationRu:spec,detailsRu:[]}}})};
 const saved={...revision(1),source_request_text:'CONTROL_ONLY QA кирпичная перегородка; не заказ поставщику',
  input_parameters:{brick_spec:spec}},before=JSON.stringify({source,saved});
 const html=buildCanonicalProfessionalPdfProjection({revision:saved,rows:source,workTitleRu:'TEST_ONLY Перегородка'}).html;
 expect(html).not.toMatch(/CONTROL_ONLY|VALIDATION_FIXTURE|FIXTURE_ONLY|TEST_ONLY|\bQA\b|source-compatible|supplier offer/u);
 expect(html).toContain('Проверочный пример');expect(html).toContain('поставка не подтверждена');
 expect(html).toContain('Кирпич М100');expect(JSON.stringify({source,saved})).toBe(before);
});

test('excluded own-cost row retains its saved reference price without returning it to any total',()=>{
 const source=rows(1);source[0]={...source[0]!,included_in_estimate:false,included_in_procurement:false,unit_price:'125',amount:'1464.38',currency_code:'KGS',
  calculation_trace:syntheticTrace({resourceGraph:{costTreatment:'OWN_COST'},manualAmendment:{kind:'manual'}})};
 const before=JSON.stringify(source),projection=buildCanonicalProfessionalPdfProjection({revision:revision(1),rows:source,workTitleRu:'Контроль сохранённой цены'});
 expect(projection.html).toContain('<td class="money">125,00 сом</td>');expect(projection.html.match(/<td class="money"><\/td>/gu)).toHaveLength(1);expect(projection.pricedRowCount).toBe(0);expect(projection.categoryTotals.work).toBe(0);expect(JSON.stringify(source)).toBe(before);
});

test('explicit stage presentation uses declared shipment facts without exposing a backend output',()=>{
 const source=rows(1),operation={contractVersion:'canonical-operation-resource/v1',groupId:'delivery',groupTitleRu:'Доставка',operationId:'transport',operationTitleRu:'Перевозка партии',completionCriterionRu:'По документу'};
 source[0]!.calculation_trace=syntheticTrace({resourceGraph:{inputParameterIds:['cargo_kg'],operationCompositionV1:operation,
  stageInputPresentationV1:{contractVersion:'canonical-stage-input-presentation/v1',parameterIds:['cargo_kg']},
  derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',parameterIds:['server_count']}}});
 const before=JSON.stringify(source),html=buildCanonicalProfessionalPdfProjection({revision:{...revision(1),input_parameters:{cargo_kg:5000,server_count:3}},rows:source,
  workTitleRu:'Перевозка',parameterTitlesRu:{cargo_kg:'Масса партии, кг',server_count:'Служебное число рейсов'}}).html;
 expect(html).toContain('Исходные данные этапа: Масса партии, кг: 5');expect(html).not.toContain('Служебное число рейсов');expect(JSON.stringify(source)).toBe(before);
});

test.each([['undeclared'],['cargo_kg','cargo_kg'],[]])('invalid stage presentation %j cannot fall back to displaying a backend count',(...ids)=>{
 const source=rows(1);source[0]!.calculation_trace=syntheticTrace({resourceGraph:{inputParameterIds:['cargo_kg'],
  operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'delivery',groupTitleRu:'Доставка',operationId:'transport',operationTitleRu:'Перевозка партии',completionCriterionRu:'По документу'},
  stageInputPresentationV1:{contractVersion:'canonical-stage-input-presentation/v1',parameterIds:ids},
  derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',parameterIds:['server_count']}}});
 const html=buildCanonicalProfessionalPdfProjection({revision:{...revision(1),input_parameters:{cargo_kg:5000,server_count:3,undeclared:99}},rows:source,
  workTitleRu:'Перевозка',parameterTitlesRu:{cargo_kg:'Масса партии, кг',server_count:'Служебное число рейсов',undeclared:'Посторонний параметр'}}).html;
 expect(html).not.toContain('Исходные данные этапа:');expect(html).not.toContain('Служебное число рейсов');expect(html).not.toContain('Посторонний параметр');
});
test('PDF shows each source-owned stage actual inputs without replacing a missing independent measure by primary q',()=>{
 const source=rows(3).map((row,index)=>({...row,calculation_trace:syntheticTrace({resourceGraph:{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',parameterIds:[['q','roof_screed_area_m2','roof_valley_length_m'][index]!]},operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'control',groupTitleRu:'Контроль',operationId:'stage'+index,operationTitleRu:['Покрытие','Стяжка','Ендовы'][index],completionCriterionRu:'Контроль'}}})}));
 const labels={q:'Площадь покрытия, м²',roof_screed_area_m2:'Площадь стяжки, м²',roof_valley_length_m:'Длина ендов, м'};
 const r={...revision(3),input_parameters:{q:'40',roof_screed_area_m2:'20',roof_valley_length_m:'20'}};
 const html=buildCanonicalProfessionalPdfProjection({revision:r,rows:source,workTitleRu:'Кровля',parameterTitlesRu:labels}).html;
 expect(html).toContain('Исходные данные этапа: Площадь покрытия, м²: 40');expect(html).toContain('Исходные данные этапа: Площадь стяжки, м²: 20');expect(html).toContain('Исходные данные этапа: Длина ендов, м: 20');
 expect(html).not.toContain('roof_screed_area_m2');
 const missing=buildCanonicalProfessionalPdfProjection({revision:{...r,input_parameters:{...r.input_parameters,roof_screed_area_m2:null}},rows:source,workTitleRu:'Кровля',parameterTitlesRu:labels}).html;
 expect(missing).not.toContain('Исходные данные этапа: Площадь стяжки');
});

test.each(['LEGACY_SOURCE_REQUIRED','OBJECT_FACT_REQUIRED','REQUIRED_RESOURCE_EXCLUDED','USER_EXCLUDED'])('fully priced rows retain the actual source/scope reason instead of asking for prices: %s',status=>{
  const source=rows(1),check={...rows(1)[0]!,row_id:'source-check',ordinal:2,quantity:status==='USER_EXCLUDED'?'0':null,unit_price:null,amount:null,included_in_estimate:false,included_in_procurement:false,ownership_status:'PRELIMINARY_NEED',calculation_trace:syntheticTrace({resourceGraph:{scopeRequirementDecisionV1:{contractVersion:'canonical-scope-requirement-decision/v1',rowId:'source-check',groupId:'system',groupTitleRu:'Система кровли',titleRu:'Проверка системы',reasonRu:'Нормы требуют проверки',kind:'OBJECT_SCOPE',status,coveringRowIds:[],originalRowIds:[],missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false}}})};
  const numeric=status==='USER_EXCLUDED';
  const projection=buildCanonicalProfessionalPdfProjection({revision:revision(numeric?2:1),rows:numeric?[...source,check]:source,preliminaryNeeds:numeric?[]:[check],workTitleRu:'CONTROL'});
  expect(projection.missingPriceRowCount).toBe(0);expect(projection.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
  expect(projection.html).toContain('Состав одного этапа ещё не завершён приложением');
  expect(projection.html).toContain('<strong>полный итог не рассчитан</strong>');
  expect(projection.html).not.toContain('Полный итог: требуется уточнение цен.');
  expect(projection.html).not.toContain('<strong>требуется уточнение цен</strong>');
  expect(projection.html).toContain('<strong>Позиций сметы</strong><br>1');
  expect(projection.html).toContain('<strong>Количество известно</strong><br>1; ещё не рассчитано 0');
  if(status==='REQUIRED_RESOURCE_EXCLUDED')expect(projection.html).not.toContain('<tr class="scope-note">');
  expect(source).toHaveLength(1);
});

test('ordinary PDF keeps the position and its unknown quantity without inline specifications or explanatory paragraphs',()=>{
  const sourceTitle='Ручной инструмент штукатурки — обеспечение требует проверки';
  const need={...rows(1)[0]!,title_ru:sourceTitle,quantity:null,unit_price:null,amount:null,included_in_estimate:false,included_in_procurement:false,
    ownership_status:'PRELIMINARY_NEED',calculation_trace:syntheticTrace({resourceGraph:{publicResourcePresentationV1:{
      contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:sourceTitle,nameRu:'Штукатурный инструмент по этапам',brandAndModelRu:null,
      specificationRu:'Для ручной гипсовой штукатурки',detailsRu:['На потолок раствор наносится соколом.','Покупка комплекта на каждый участок не подтверждена <script>.','На потолок раствор наносится соколом.']}}})};
  const snapshot=JSON.stringify(need),projection=buildCanonicalProfessionalPdfProjection({revision:revision(0),rows:[],preliminaryNeeds:[need],workTitleRu:'Штукатурка'});
  expect(projection.html).not.toContain('<tr class="preliminary-need-specification">');
  expect(projection.html).toContain('<strong>Штукатурный инструмент по этапам</strong>');
  expect(projection.html).not.toContain('Для ручной гипсовой штукатурки');
  expect(projection.html).not.toContain('На потолок раствор наносится соколом.');
  expect(projection.html).not.toContain('Покупка комплекта на каждый участок');
  expect(projection.html).not.toContain('<script>');expect(projection.html).toContain('Не рассчитано');
  expect(projection).toMatchObject({rowCount:1,pricedRowCount:0,preliminaryNeedCount:1,grandTotalStatus:'PARTIAL_NEEDS_PRICE'});expect(JSON.stringify(need)).toBe(snapshot);
  for(const trace of [{...need.calculation_trace,manualTitleOverride:true},syntheticTrace({resourceGraph:{publicResourcePresentationV1:{...need.calculation_trace.resourceGraph.publicResourcePresentationV1,sourceTitleRu:'Другое изделие'}}})]){
    const suppressed=buildCanonicalProfessionalPdfProjection({revision:revision(0),rows:[],preliminaryNeeds:[{...need,calculation_trace:trace}],workTitleRu:'Штукатурка'});
    expect(suppressed.html).not.toContain('<tr class="preliminary-need-specification">');expect(suppressed.html).not.toContain('На потолок раствор наносится соколом.');
  }
});

test('ordinary PDF omits even the largest explanatory resource profile without changing row counts',()=>{
  const title='Ручной инструмент',details=Array.from({length:16},(_,i)=>`Этап ${i+1}: ${'Проверить пригодность инструмента. '.repeat(24)}`);
  const need={...rows(1)[0]!,title_ru:title,quantity:null,unit_price:null,amount:null,included_in_estimate:false,included_in_procurement:false,
    calculation_trace:syntheticTrace({resourceGraph:{publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:title,nameRu:title,brandAndModelRu:null,specificationRu:null,detailsRu:details}}})};
  const projection=buildCanonicalProfessionalPdfProjection({revision:revision(0),rows:[],preliminaryNeeds:[need],workTitleRu:'Штукатурка'});
  expect(projection.html).not.toContain('<tr class="preliminary-need-specification">');
  for(const detail of details)expect(projection.html).not.toContain(detail);expect(projection.rowCount).toBe(1);expect(projection.pricedRowCount).toBe(0);
});

test('ordinary estimate omits process prose and footer notes while retaining resources, unknown needs, shared references and immutable evidence',()=>{
 const owner=rows(1)[0]!,title='Служебное описание этапа',
  note={...owner,row_id:'process-note',ordinal:1,title_ru:title,category:'service',quantity:'1',unit_price:null,amount:null,
   included_in_estimate:false,included_in_procurement:false,ownership_status:'INCLUDED_COMPONENT',
   calculation_trace:syntheticTrace({resourceGraph:{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',includedInResourceOwnerRowId:owner.row_id,
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:title,nameRu:title,
     brandAndModelRu:null,specificationRu:null,detailsRu:['СЛУЖЕБНАЯ_ПРОЗА_НЕ_В_СМЕТЕ'],rowKind:'PROCESS_NOTE'}}})},
  snapshot=JSON.stringify([owner,note]),projection=buildCanonicalProfessionalPdfProjection({revision:revision(2),rows:[owner,note],workTitleRu:'Работы'});
 expect(projection.html).not.toContain('Примечание');expect(projection.html).not.toContain('<tr class="scope-note">');
 expect(projection.html).not.toContain('СЛУЖЕБНАЯ_ПРОЗА_НЕ_В_СМЕТЕ');expect(projection.html).not.toContain(title);
 expect(projection.html).toContain(String(owner.title_ru));expect(projection.pricedRowCount).toBe(1);
 expect(projection.html).toContain('<strong>Позиций сметы</strong><br>1');expect(JSON.stringify([owner,note])).toBe(snapshot);
});

const categories = ["material", "labor", "equipment", "service", "transport"];

test('keeps work before its own resources without moving resources into another subwork', () => {
  const source = rows(5);
  const titles = ['MATERIAL_A', 'LABOR_B', 'LABOR_A', 'SERVICE_A', 'MATERIAL_B'];
  const kinds = ['material', 'labor', 'work', 'service', 'material'];
  for (let index = 0; index < source.length; index++) {
    const operationId = index === 1 || index === 4 ? 'b' : 'a';
    source[index] = {...source[index]!, title_ru: titles[index]!, category: kinds[index]!,
      calculation_trace: syntheticTrace({resourceGraph: {operationCompositionV1: {
        contractVersion: 'canonical-operation-resource/v1', groupId: 'foundation', groupTitleRu: 'Фундамент',
        operationId, operationTitleRu: operationId === 'a' ? 'Подработа А' : 'Подработа Б',
        completionCriterionRu: 'По проекту', processOrdinal: operationId === 'a' ? 10 : 20,
      }}})};
  }
  const snapshot = JSON.stringify(source);
  const projection = buildCanonicalProfessionalPdfProjection({revision: revision(5), rows: source, workTitleRu: 'Фундамент'});
  const ordered = ['Подработа А</strong>', 'LABOR_A', 'MATERIAL_A', 'SERVICE_A', 'Подработа Б</strong>', 'LABOR_B', 'MATERIAL_B'];
  for (let index = 1; index < ordered.length; index++) {
    expect(projection.html.indexOf(ordered[index - 1]!)).toBeLessThan(projection.html.indexOf(ordered[index]!));
  }
  for (const title of titles) expect(projection.html.match(new RegExp(title, 'g'))).toHaveLength(1);
  expect(projection.rowCount).toBe(5);
  expect(projection.pricedRowCount).toBe(5);
  expect(JSON.stringify(source)).toBe(snapshot);
});

function rows(
  count: number,
  options: { missingAt?: number; longTitleAt?: number } = {},
): CanonicalArtifactRow[] {
  return Array.from({ length: count }, (_, index) => {
    const category = categories[index % categories.length];
    const missing = index === options.missingAt;
    return {
      row_id: `row-${index + 1}`,
      ordinal: index,
      section: category,
      category,
      title_ru: index === options.longTitleAt
        ? "Комплект фасонных деталей для устройства герметичного примыкания кровельного покрытия к парапету с защитой от атмосферных осадков"
        : `Профессиональная позиция ${index + 1}`,
      unit_id: index % 2 === 0 ? "m2" : "m3",
      quantity: index === 0 ? "12.3456" : "2",
      unit_price: missing ? null : "100",
      amount: missing ? null : "200",
      currency_code: "KGS",
      procurement_eligible: category === "material",
      included_in_estimate: true,
      included_in_procurement: category === "material",
      ownership_status: "OWNED",
      calculation_trace: index === options.longTitleAt
        ? syntheticTrace({ specificationRu: "Толщина и марка уточняются по проекту", inputParameterIds: ["roof_area_m2"] })
        : syntheticTrace({ formulaExplanationRu: "Количество принято из immutable revision" }),
      normative_trace: [{ sourceId: "СП КР", locator: `таблица ${index + 1}` }],
      row_sha256: String(index + 1).padStart(64, "0"),
    };
  });
}

describe("R4-A6 canonical professional PDF", () => {
  it("keeps selected waste boundaries and service contents in resource names without copying explanatory notes", () => {
    const mode = 'Материалы остаются на объекте; внешний вывоз не нужен';
    const service = 'Согласованная тара <контроль>';
    const source = rows(2);
    source[0] = {...source[0]!, row_id:'f09:stone_tile_floor_demolition:waste-plan',
      title_ru:`Обращение со снятой каменной шашкой — ${mode}`, quantity:'35.5', unit_id:'m2',
      unit_price:null, amount:null, included_in_estimate:false, included_in_procurement:false,
      calculation_trace:syntheticTrace({resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE', titleSpecificationMode:'APPEND',
        titleSpecificationParameterIds:['waste_mode'], titleSpecificationSeparator:' — ',
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:'Принятая схема обращения',
          detailsRu:['Постоянное пояснение должно оставаться в объяснении расчёта']}}})};
    source[1] = {...source[1]!,row_id:'waste-service',category:'service',title_ru:`Дополнительная услуга — ${service}`,
      quantity:'1.25',unit_id:'t',unit_price:null,amount:null,
      calculation_trace:syntheticTrace({resourceGraph:{costTreatment:'OWN_COST',titleSpecificationMode:'APPEND',
        titleSpecificationParameterIds:['service_contents'],titleSpecificationSeparator:' — '}})};
    const saved = {...revision(2),input_parameters:{waste_mode:mode,service_contents:service}},before=JSON.stringify({source,saved});
    const pdf = buildCanonicalProfessionalPdfProjection({revision:saved,rows:source,workTitleRu:'Разборка каменной шашки'});
    expect(pdf.html).toContain('Материалы остаются на объекте; внешний вывоз не нужен');
    expect(pdf.html).toContain('Дополнительная услуга — Согласованная тара &lt;контроль&gt;');
    expect(pdf.html).not.toContain('Постоянное пояснение');
    expect(pdf.html).not.toContain('<контроль>');
    expect(pdf).toMatchObject({rowCount:2,pricedRowCount:0,missingPriceRowCount:1,grandTotalStatus:'PARTIAL_NEEDS_PRICE'});
    expect(pdf.html).toContain('<td class="numeric">1,25</td>');
    expect(JSON.stringify({source,saved})).toBe(before);
    source[1] = {...source[1]!,title_ru:'Согласованное ручное название',calculation_trace:syntheticTrace({...(source[1]!.calculation_trace as Record<string, unknown>),manualTitleOverride:true})};
    const manual = buildCanonicalProfessionalPdfProjection({revision:saved,rows:source,workTitleRu:'Разборка каменной шашки'});
    expect(manual.html).toContain('<strong>Согласованное ручное название</strong>');
    expect(manual.html).not.toContain('Согласованная тара &lt;контроль&gt;');
  });
  it("prints each labelled semicolon service selection once without changing the saved title or facts", () => {
    const contents = 'Спуск вне КРЕР; труд, тара и погрузка включены';
    const reference = 'КП-001: полная услуга для подтверждённой массы';
    const source = rows(1);
    source[0] = {...source[0]!,row_id:'f09:asphalt_floor_covering_demolition:waste-onsite-service',category:'service',unit_id:'t',quantity:'1.25',
      title_ru:`Дополнительное обращение со снятой асфальтовым покрытием пола — Состав спуска и погрузки: ${contents}, Спецификация услуги: ${reference}`,
      calculation_trace:syntheticTrace({resourceGraph:{titleSpecificationMode:'APPEND',titleSpecificationParameterIds:['contents','reference'],
        titleSpecificationParameterLabelsRu:{contents:'Состав спуска и погрузки',reference:'Спецификация услуги'},titleSpecificationSeparator:' — '}})};
    source[0]!.calculation_trace=syntheticPublicTitleTrace(source[0]!,
      'Дополнительное обращение со снятым асфальтовым покрытием пола','SERVICE');
    const saved = {...revision(1),input_parameters:{contents,reference}};
    const before = JSON.stringify({source,saved});
    const pdf = buildCanonicalProfessionalPdfProjection({revision:saved,rows:source,workTitleRu:'Разборка асфальтового покрытия'});
    expect(pdf.html).toContain('со снятым асфальтовым покрытием пола');
    for (const selected of [contents,reference]) expect(pdf.html.split(selected).length-1).toBe(1);
    expect(pdf.html.split('Состав спуска и погрузки:').length-1).toBe(1);
    expect(pdf.html).toContain('<td class="numeric">1,25</td>');
    expect(JSON.stringify({source,saved})).toBe(before);
    source[0] = {...source[0]!,title_ru:'Ручное название со снятой асфальтовым покрытием',calculation_trace:syntheticTrace({manualTitleOverride:true})};
    expect(buildCanonicalProfessionalPdfProjection({revision:saved,rows:source,workTitleRu:'Разборка асфальтового покрытия'}).html)
      .toContain('<strong>Ручное название со снятой асфальтовым покрытием</strong>');
  });
  it("prints compact resource cells without the Silenzio application bullet lists while preserving estimate and buyer data", () => {
    const source=rows(1);
    source[0]={...source[0]!,title_ru:'Упаковка EGGER Silenzio Duo 1222949, 10 м²',unit_id:'pcs',quantity:'4',unit_price:'2500',amount:'10000',
      calculation_trace:syntheticTrace({specificationRu:'Длинная спецификация, которую пользователь убрал из строк PDF',resourceGraph:{
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:'Упаковка EGGER Silenzio Duo 1222949, 10 м²',
          specificationRu:'XPS HD и встроенная пароизоляция',detailsRu:['Применение: минеральное основание и плавающая укладка','Наличие, резерв и кратность поставщика задаются явно']}}})};
    const saved={...revision(1),totals:{amount:'10000'}},before=JSON.stringify({source,saved});
    const pdf=buildCanonicalProfessionalPdfProjection({revision:saved,rows:source,workTitleRu:'Ламинат'});
    const buyer=buildCanonicalProcurementProjection({revision:saved,procurementRows:source,sourceRows:source});
    expect(pdf.html).toContain('<strong>Упаковка EGGER Silenzio Duo 1222949, 10 м²</strong></td>');
    for(const removed of ['Длинная спецификация','XPS HD','Применение: минеральное','Наличие, резерв'])expect(pdf.html).not.toContain(removed);
    expect(pdf.html).toContain('<td class="numeric">4</td>');
    expect(pdf.categoryTotals.material).toBe(10000);expect(pdf).toMatchObject({rowCount:1,pricedRowCount:1,missingPriceRowCount:0,grandTotalStatus:'COMPLETE'});
    expect(buyer.rows[0]).toMatchObject({rowId:'row-1',titleRu:'Упаковка EGGER Silenzio Duo 1222949, 10 м²',quantity:'4',unitPrice:'2500',amount:'10000'});
    expect(JSON.stringify({source,saved})).toBe(before);
  });
  it("keeps procurement balances outside the PDF while retaining saved quantities and physical rental", () => {
    const sourceRows = rows(2);
    sourceRows[0] = { ...sourceRows[0]!, row_id: "water", title_ru: "Вода для ухода", unit_id: "m3", quantity: "5.1",
      calculation_trace: syntheticTrace({ purchaseBalance: { ownerRowId: "water", unitId: "m3", consumed: "3.2", plannedConsumption: "3.2",
        stock: "0", reserve: "0", effectiveOrder: "5.1", remaining: "1.9", freeBeyondReserve: "1.9",
        consumptionShortage: "0", reserveDeficit: "0", quantum: null } }) };
    sourceRows[1] = { ...sourceRows[1]!, title_ru: "Листы опалубки", category: "equipment", unit_id: "piece_day", quantity: "1624",
      calculation_trace: syntheticTrace({ resourceGraph: { supplyMode: "RENTAL_RETURNABLE", returnable: true,
        sourceScheduleParameterIds: ["sheets", "days"], rentalDurationParameterId: "days" } }) };
    const savedRevision = { ...revision(2), input_parameters: { sheets: 58, days: 28 } };
    const before = JSON.stringify({ sourceRows, savedRevision });
    const projection = buildCanonicalProfessionalPdfProjection({ revision: savedRevision, rows: sourceRows, workTitleRu: "Сохранённая смета" });
    for (const note of ["Потребность:", "Расчётная потребность к поставке:", "Пригодное наличие:", "Сохраняемый резерв:", "Заказ:", "Остаток:", "свободно сверх сохраняемого резерва:", "Кратность поставки:"]) {
      expect(projection.html).not.toContain(note);
    }
    expect(projection.html).toContain('<td class="numeric">5,1</td>');
    const procurement = buildCanonicalProcurementProjection({ revision: savedRevision,
      procurementRows: sourceRows.filter(row => row.included_in_procurement), sourceRows });
    expect(procurement.rows[0]?.purchaseBalance).toMatchObject({
      netQuantity: "3.2", effectiveOrder: "5.1", remaining: "1.9", stock: "0", reserve: "0", freeBeyondReserve: "1.9",
    });
    expect(projection.html).toContain("58 шт. × 28 сут.");expect(projection.html).toContain('1 624');
    expect(projection.categoryTotals).toMatchObject({ material: 200, equipment: 200 });
    expect(JSON.stringify({ sourceRows, savedRevision })).toBe(before);
  });

  it("marks an otherwise priced winter/water estimate preliminary when freeze-protection conditions are missing", () => {
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: { ...revision(1), input_parameters: { placement_winter_mode: true, placement_curing_method: "water" } },
      rows: rows(1), workTitleRu: "Зимний уход",
    });
    expect(projection.html).toContain("<strong>Статус:</strong> Предварительная");
    expect(projection.html).toContain("температурные условия");
    expect(projection.grandTotalStatus).toBe("COMPLETE");
    expect(projection.html).not.toContain("<strong>Статус:</strong> Полная");
  });

  it("labels equipment and access shifts in Russian without changing immutable source quantities or units", () => {
    const sourceRows = rows(2);
    sourceRows[0] = { ...sourceRows[0]!, category: "equipment", title_ru: "Подмости", unit_id: "shift", quantity: "1.250000000" };
    sourceRows[1] = { ...sourceRows[1]!, category: "work", title_ru: "Организация доступа", unit_id: "shift", quantity: "0.125000000" };
    const unresolved = { ...rows(1)[0]!, row_id: "access-need", ordinal: 2, unit_id: "shift", quantity: null,
      unit_price: null, amount: null, included_in_estimate: false, included_in_procurement: false,
      procurement_eligible: false, ownership_status: "PRELIMINARY_NEED" };
    const before = JSON.stringify({ sourceRows, unresolved });
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(2), rows: sourceRows, preliminaryNeeds: [unresolved], workTitleRu: "Подвесной потолок",
    });
    expect(projection.html.match(/<td class="unit">смена<\/td>/g)).toHaveLength(3);
    expect(projection.html).not.toContain('<td class="unit">shift</td>');
    expect(JSON.stringify({ sourceRows, unresolved })).toBe(before);
    expect(canonicalArtifactUnit({ unit_id: "shift", calculation_trace: syntheticTrace({ displayUnitRu: "чел.-смена" }) })).toBe("чел.-смена");
    expect(["m", "item", "machine_hour", "unknown_custom_unit"].map(unit_id => canonicalArtifactUnit({ unit_id })))
      .toEqual(["м", "шт.", "маш.-ч", "unknown_custom_unit"]);
  });
  it("keeps real pressure-sewer names immutable and holds PDF when its producer declares no operation structure", async () => {
    const compiled = await compilePressureSewerPipelineR1({ ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT });
    const snapshot = JSON.stringify(compiled);
    const source = compiled.rows.find(row => row.row_id === "rc09:psp_pipeline_install_acceptance")!;
    const label = "прокладка ПНД-трубы в открытой траншее со стыковой сваркой";
    expect(source.title_ru).toContain("HDPE_BUTT_FUSION_OPEN_TRENCH");
    expect(canonicalEstimateParameterChoiceLabelRu("psp_installation_technology", "HDPE_BUTT_FUSION_OPEN_TRENCH"))
      .toBe(label);
    expect(() => buildCanonicalProfessionalPdfProjection({
      revision: revision(compiled.rows.length), rows: compiled.rows,
      workTitleRu: "Напорная канализация",
    })).toThrow(expect.objectContaining({code:'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID'}));
    expect(typeof source.title_ru).toBe("string");
    expect(publicBoqDisplayNameRu({ sourceNameRu: String(source.title_ru), rowType: "work" }))
      .toBe(`Строительство и приёмка напорного канализационного трубопровода — ${label}`);
    expect(JSON.stringify(compiled)).toBe(snapshot);
    expect(publicBoqDisplayNameRu({ sourceNameRu: "Труба — PE100 SDR17 PN10 DN110", rowType: "material" }))
      .toBe("Труба — PE100 SDR17 PN10 DN110");
    expect(publicBoqDisplayNameRu({ sourceNameRu: "Заказное изделие — UNKNOWN_PRODUCT_ID", rowType: "material" }))
      .toBe("Заказное изделие — UNKNOWN_PRODUCT_ID");
  });
  it("renders the required client form without an internal technical appendix", () => {
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(45),
      rows: rows(45, { missingAt: 3, longTitleAt: 4 }),
      workTitleRu: "Монтаж кровельного покрытия",
      definitionVersionId: "99999999-8888-7777-6666-555555555555",
    });

    expect(CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).toBe("canonical-professional-pdf.r4-a13-verified-operation-composition-template86");
    expect(projection).toMatchObject({
      rowCount: 45,
      pricedRowCount: 44,
      missingPriceRowCount: 1,
      grandTotalStatus: "PARTIAL_NEEDS_PRICE",
      currencyCode: "KGS",
    });
    expect(Object.keys(projection.categoryTotals)).toEqual(CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER);
    expect(projection.html).toContain("Наименование");
    expect(projection.html).toContain("Категория");
    expect(projection.html).toContain("Цена за единицу");
    expect(projection.html).toContain("Материалы");
    expect(projection.html).toContain("Работы");
    expect(projection.html).toContain("Оборудование");
    expect(projection.html).toContain("Услуги");
    expect(projection.html).toContain("Доставка");
    expect(projection.html).not.toContain("Требуется цена");
    expect(projection.html.match(/<td class="money"><\/td>/gu)).toHaveLength(2);
    expect(projection.html).toContain("<strong>Статус:</strong> Предварительная");
    expect(projection.html).toContain("Стоимость рассчитана частично");
    expect(projection.html).toContain("Полный итог: требуется уточнение цен");
    expect(projection.html).not.toContain("Техническое приложение");
    expect(projection.html).not.toContain("roof_area_m2");
    expect(projection.html).not.toContain("Definition version");
    expect(projection.html).not.toContain("Checksum строки");
    expect(projection.footerTemplate).not.toContain("revision");
    expect(projection.footerTemplate).not.toContain("checksum");
    expect(projection.html).toContain("м²");
    expect(projection.html).toContain("м³");
    expect(projection.html).toContain("Составил");
    expect(projection.html).toContain("Проверил");
    expect(projection.html).toContain("Утвердил");
    expect(projection.html).not.toContain("developer mode");
    expect(projection.html).not.toContain("email");
  });

  it.each([1, 45, 100, 500, 1001])("preserves all %i rows without a fixed 45-row limit", (rowCount) => {
    const sourceRows = rows(rowCount, { longTitleAt: rowCount - 1 });
    const startedAt = Date.now();
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(rowCount),
      rows: sourceRows,
      workTitleRu: "Производственная смета",
    });
    expect(projection.rowCount).toBe(rowCount);
    expect(projection.missingPriceRowCount).toBe(0);
    expect(projection.grandTotalStatus).toBe("COMPLETE");
    expect(projection.html).toContain("<strong>Статус:</strong> Предварительная");
    expect(projection.html).toContain(String(sourceRows[sourceRows.length - 1]?.title_ru));
    expect(projection.html).toContain("break-inside:avoid");
    expect(projection.html).toContain("display:table-header-group");
    expect(projection.footerTemplate).toContain("Страница");
    expect(projection.footerTemplate).toContain('class="pageNumber"');
    expect(projection.footerTemplate).toContain('class="totalPages"');
    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });

  it("keeps zero distinct from null and blocks mixed currencies", () => {
    const zeroRows = rows(1);
    zeroRows[0]!.unit_price = "0";
    zeroRows[0]!.amount = "0";
    const zero = buildCanonicalProfessionalPdfProjection({
      revision: revision(1), rows: zeroRows, workTitleRu: "Нулевая цена",
    });
    expect(zero.grandTotalStatus).toBe("COMPLETE");
    expect(zero.html).toContain("0,00 сом");

    const mixed = rows(2);
    mixed[1]!.currency_code = "USD";
    expect(() => buildCanonicalProfessionalPdfProjection({
      revision: revision(2), rows: mixed, workTitleRu: "Смешанная валюта",
    })).toThrow("multiple currencies");

    const mixedWithoutPrice = rows(2);
    mixedWithoutPrice[1]!.unit_price = null;
    mixedWithoutPrice[1]!.amount = null;
    mixedWithoutPrice[1]!.currency_code = "USD";
    expect(() => buildCanonicalProfessionalPdfProjection({
      revision: revision(2), rows: mixedWithoutPrice, workTitleRu: "Смешанная валюта без цены",
    })).toThrow("multiple currencies");
  });

  it("does not present an unknown-price estimate as zero and keeps display numbering sequential", () => {
    const unknownPriceRows = rows(2);
    unknownPriceRows[0]!.ordinal = 17;
    unknownPriceRows[1]!.ordinal = 42;
    unknownPriceRows[0]!.unit_id = "m3_km";
    for (const row of unknownPriceRows) {
      row.unit_price = null;
      row.amount = null;
    }

    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(2),
      rows: unknownPriceRows,
      workTitleRu: "Смета без цен",
    });

    expect(projection.pricedRowCount).toBe(0);
    expect(projection.html).toContain("Цены не заполнены");
    expect(projection.html).toContain("м³·км");
    expect(projection.html).toContain('<td class="number">1</td>');
    expect(projection.html).toContain('<td class="number">2</td>');
    expect(projection.html).not.toContain('<td class="number">18</td>');
    expect(projection.html).not.toContain('<td class="number">43</td>');
    expect(projection.html).not.toContain("Оценено<br>0,00 сом");
    expect(projection.html).not.toContain("Стоимость рассчитана частично<br>0,00 сом");
  });

  it("uses the concise public asphalt name in the PDF without mutating canonical rows", () => {
    const sourceRows = rows(1);
    const verboseTitle = "нижний слой: горячая плотная мелкозернистая асфальтобетонная смесь типа А по КРЕР 27-06-020-01 + 27-06-021-01 при принятой толщине; марка и состав уточняются проектом и паспортом завода";
    sourceRows[0]!.title_ru = verboseTitle;
    sourceRows[0]!.calculation_trace=syntheticPublicTitleTrace(sourceRows[0]!,
      'Нижний слой: асфальтобетонная смесь типа А','MATERIAL');

    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(1),
      rows: sourceRows,
      workTitleRu: "Асфальтобетонное покрытие моста",
    });

    expect(projection.html).toContain("Нижний слой: асфальтобетонная смесь типа А");
    expect(projection.html).not.toContain("горячая плотная мелкозернистая");
    expect(sourceRows[0]!.title_ru).toBe(verboseTitle);
  });

  it("prints unresolved server-owned needs without inventing quantities or totals", () => {
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: { ...revision(1), source_request_text: "ДЕМО / VALIDATION_FIXTURE: подтверждение проекта отсутствует <script>" },
      rows: rows(1),
      preliminaryNeeds: [{
        calculation_trace: syntheticTrace(),
        row_id: "primer",
        ordinal: 1,
        section: "materials",
        category: "material",
        title_ru: "Совместимая грунтовка",
        unit_id: "kg",
        quantity: null,
        unit_price: null,
        included_in_estimate: false,
        included_in_procurement: false,
        procurement_eligible: false,
        ownership_status: "PRELIMINARY_NEED",
        row_sha256: "9".repeat(64),
        missing_parameter_ids: ["primer_consumption_kg_m2"],
      }],
      workTitleRu: "Подготовка потолка из ГКЛ",
      parameterTitlesRu: { primer_consumption_kg_m2: "Фактический полный расход совместимой грунтовки на квадратный метр" },
    });

    expect(projection.preliminaryNeedCount).toBe(1);
    expect(projection.grandTotalStatus).toBe("PARTIAL_NEEDS_PRICE");
    expect(projection.html).toContain("Совместимая грунтовка");
    expect(projection.html).toContain("Не рассчитано");
    expect(projection.html).toContain("Нерассчитанные позиции не включены в стоимость и закупку");
    expect(projection.html).not.toContain(">0 kg<");
    expect(projection.html).toContain("Проверочный пример: подтверждение проекта отсутствует &lt;script&gt;");
    expect(projection.html).toContain("Проверочный пример. Не является утверждённой проектной сметой.");
    expect(projection.html).not.toContain("VALIDATION_FIXTURE");
    expect(projection.html).not.toContain("Фактический полный расход совместимой грунтовки на квадратный метр");
    expect(projection.html).not.toContain("primer_consumption_kg_m2");
    expect(projection.html).not.toContain("<script>");
  });

  it("keeps non-payable canonical composition beside unresolved needs", () => {
    const compositionRows = rows(2);
    compositionRows[0]!.included_in_estimate = false;
    compositionRows[0]!.included_in_procurement = false;
    compositionRows[0]!.unit_price = null;
    compositionRows[0]!.amount = null;
    compositionRows[0]!.ownership_status = "OWNED_EXCLUDED";
    compositionRows[0]!.calculation_trace = syntheticTrace({
      resourceGraph: { costTreatment: "INCLUDED_IN_RESOURCE_ROWS" },
    });
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: {
        ...revision(2),
        totals: { amount: "200", includedRowCount: 1 },
      },
      rows: compositionRows,
      expectedProjectedRowCount: 2,
      preliminaryNeeds: [{
        ...rows(1)[0]!,
        row_id: "need-3",
        ordinal: 2,
        quantity: null,
        unit_price: null,
        amount: null,
        included_in_estimate: false,
        included_in_procurement: false,
        ownership_status: "PRELIMINARY_NEED",
      }],
      workTitleRu: "Уплотнение покрытия",
    });

    expect(projection).toMatchObject({
      rowCount: 3,
      pricedRowCount: 1,
      missingPriceRowCount: 0,
      nonPayableRowCount: 1,
      preliminaryNeedCount: 1,
    });
    expect(projection.html).not.toContain("Отдельно не оплачивается");
    expect(projection.html).not.toMatch(/<td class="money">(?:Не применяется|Не суммируется)/u);
    expect(projection.html).toContain('<td class="money"></td>');
    const resourceTable = projection.html.slice(projection.html.indexOf('<table class="client">'));
    // The declared operation displays labour first, then its resources. Source
    // storage order still does not create a second operation or payment owner.
    expect(resourceTable.indexOf("Профессиональная позиция 2"))
      .toBeLessThan(resourceTable.indexOf("Профессиональная позиция 1"));
  });

  it("fails closed when projected rows differ from revision truth", () => {
    expect(() => buildCanonicalProfessionalPdfProjection({
      revision: revision(2), rows: rows(1), workTitleRu: "Несовпадение",
    })).toThrow("row count differs");
  });

  it("prints every operation resource once and retains an entered preliminary value without repeated notes", () => {
    const operation = { contractVersion: "canonical-operation-resource/v1", groupId: "crossing", groupTitleRu: "Переход",
      operationId: "casing", operationTitleRu: "Сборка футляра", completionCriterionRu: "Стыки выполнены и проверены." };
    const needs = ["Электроды", "Монтажный механизм"].map((title, index) => ({ ...rows(1)[0]!,
      row_id: `need-${index}`, ordinal: index, title_ru: title, quantity: index === 0 ? "2" : null,
      included_in_estimate: false, included_in_procurement: false, unit_price: null, amount: null,
      ownership_status: "PRELIMINARY_NEED", missing_parameter_ids: ["source-one", "source-two"],
      calculation_trace: syntheticTrace({ resourceGraph: { operationCompositionV1: operation } }),
    }));
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(0), rows: [], preliminaryNeeds: needs,
      workTitleRu: "Переход", parameterTitlesRu: { "source-one": "Подтверждённая норма", "source-two": "Подтверждённая норма" } });
    expect(projection.rowCount).toBe(2);
    expect(projection.preliminaryNeedCount).toBe(2);
    expect(projection.html).toContain("Электроды");
    expect(projection.html).toContain("Монтажный механизм");
    expect(projection.html).toContain('<td class="numeric">2</td>');
    expect(projection.html).not.toContain("Предварительная потребность из определения");
    expect(projection.html).not.toContain("исходные сведения №");
    expect(projection.html).not.toContain("Исходные сведения для уточнения состава");
    expect(projection.html).not.toContain("Подтверждённая норма");
    expect(projection.html).not.toContain('Для завершения:');
    expect(projection.html).not.toContain('Стыки выполнены и проверены.');
    expect(projection.html).not.toContain("source-one");
    expect(projection.grandTotalStatus).toBe("PARTIAL_NEEDS_PRICE");
  });

  it("keeps noncontiguous curing resources together and keeps a placement pump outside the curing criterion", () => {
    const operation = { contractVersion: "canonical-operation-resource/v1", groupId: "pour", groupTitleRu: "Бетонирование",
      operationId: "curing", operationTitleRu: "Уход за бетоном", completionCriterionRu: "Уход выполнен по проекту." };
    const source = rows(4);
    for (const [index, title] of ["CONCRETE_SUPPLY", "CURING_LABOUR", "PLACEMENT_PUMP", "CURING_WATER"].entries()) source[index]!.title_ru = title;
    for (const index of [1, 3]) source[index]!.calculation_trace = syntheticTrace({ resourceGraph: { operationCompositionV1: operation } });
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(4), rows: source, workTitleRu: "Бетонирование" });
    expect(projection.rowCount).toBe(4);
    expect(projection.html).not.toContain('Для завершения:');
    expect(projection.html).not.toContain('Уход выполнен по проекту.');
    expect(projection.html.indexOf("PLACEMENT_PUMP")).toBeLessThan(projection.html.indexOf("Уход за бетоном</strong>"));
    expect(projection.html.indexOf("CURING_LABOUR")).toBeLessThan(projection.html.indexOf("CURING_WATER"));
    for (const title of ["CONCRETE_SUPPLY", "CURING_LABOUR", "PLACEMENT_PUMP", "CURING_WATER"]) expect(projection.html.match(new RegExp(title, "gu"))).toHaveLength(1);
  });

  it("omits the work process block while preserving subwork sections, costs and saved rows", () => {
    const source = rows(3);
    const before = buildCanonicalProfessionalPdfProjection({ revision: revision(3), rows: source, workTitleRu: 'Монтаж трубопровода' });
    for (const [index, title] of ['Прокладка труб', 'Сборка соединений', 'Испытания'].entries()) {
      source[index]!.calculation_trace = syntheticTrace({ resourceGraph: { operationCompositionV1: {
        contractVersion: 'canonical-operation-resource/v1', groupId: 'pipeline', groupTitleRu: 'Монтаж трубопровода',
        operationId: `step-${index}`, operationTitleRu: title, completionCriterionRu: 'По проекту',
        processRole: 'PROCESS', processOrdinal: index,
      } } });
    }
    const snapshot = JSON.stringify(source);
    const result = buildCanonicalProfessionalPdfProjection({ revision: revision(3), rows: source, workTitleRu: 'Монтаж трубопровода' });
    expect(result.html).not.toContain('<h2>Процесс работ</h2>');
    expect(result.html).not.toContain('<ol><li>Прокладка труб</li><li>Сборка соединений</li><li>Испытания</li></ol>');
    expect(result.html).not.toContain('<h3>Монтаж трубопровода</h3>');
    expect(result.html).not.toContain('<strong>Монтаж трубопровода — ');
    expect(result.html).toContain('<strong>Сборка соединений</strong>');
    expect(result.html).toContain('<table class="client">');
    expect(result.categoryTotals).toEqual(before.categoryTotals);
    expect(result.rowCount).toBe(before.rowCount);
    expect(result.pricedRowCount).toBe(before.pricedRowCount);
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it('shows a shared machine with one priced row and a reference in the related operation, preserving price and escaping its title', () => {
    const source = rows(1);
    source[0]!.title_ru = 'Сварочный аппарат <PP-R>';
    source[0]!.category = 'equipment';
    source[0]!.calculation_trace = syntheticTrace({ resourceGraph: { operationCompositionV1: {
      contractVersion: 'canonical-operation-resource/v1', groupId: 'pipe', groupTitleRu: 'Монтаж трубы',
      operationId: 'straight', operationTitleRu: 'Прямые стыки', completionCriterionRu: 'Сварены',
      additionalOperations: [{ operationId: 'nodes', operationTitleRu: 'Фитинги узлов', completionCriterionRu: 'Сварены' }],
    } } });
    const snapshot = JSON.stringify(source);
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(1), rows: source, workTitleRu: 'Монтаж трубы' });
    const baseline = buildCanonicalProfessionalPdfProjection({ revision: revision(1), rows: [{ ...source[0]!, calculation_trace: syntheticTrace({}) }], workTitleRu: 'Монтаж трубы' });
    expect(projection.html).not.toContain('<li>Прямые стыки<div class="muted">');
    expect(projection.html).not.toContain('<li>Фитинги узлов<div class="muted">');
    expect(projection.html).not.toContain('одна строка ресурса для нескольких подработ');
    expect(projection.html.match(/Сварочный аппарат &lt;PP-R&gt;/gu)).toHaveLength(2);
    const related = projection.html.split('<strong>Фитинги узлов</strong>')[1]!.split('</tbody>')[0]!;
    expect(related).toContain('<strong>Сварочный аппарат &lt;PP-R&gt;</strong>');
    expect(related).toContain('<td class="unit">м²</td>');
    expect(related).toContain('<td class="numeric">12,3456</td>');
    expect(related).toContain('<td class="number">1</td>');
    expect([...related.matchAll(/<td class="money">(.*?)<\/td>/gu)].map(match=>match[1]))
      .toEqual([expect.stringMatching(/^[\d\s\u00a0]+,\d{2} сом$/u), '']);
    expect(projection.html).not.toMatch(/resource-use-grid|operation-resource-use|Общие ресурсы/u);
    expect(related).not.toContain('Общие ресурсы, №');
    expect(projection.html).not.toContain('См. №1');expect(projection.html).not.toContain('class="shared-resource"');
    expect(projection.html).not.toContain('общий ресурс, учтён в разделе');
    expect(projection.html).toContain('Сварочный аппарат &lt;PP-R&gt;');
    expect(projection.html).not.toContain('<PP-R>');
    expect(projection.rowCount).toBe(1);
    expect(projection.pricedRowCount).toBe(baseline.pricedRowCount);
    expect(projection.categoryTotals).toEqual(baseline.categoryTotals);
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it('keeps an unknown shared physical provision visible at both operations without inventing zero or changing its payment', () => {
    const need = {...rows(1)[0]!, quantity: null, unit_price: null, amount: null,
      included_in_estimate: false, included_in_procurement: false, title_ru: 'Средства подачи материалов',
      calculation_trace: syntheticTrace({resourceGraph: {operationCompositionV1: {
        contractVersion: 'canonical-operation-resource/v1', groupId: 'finish', groupTitleRu: 'Отделка',
        operationId: 'supply', operationTitleRu: 'Подача', completionCriterionRu: 'Подано',
        additionalOperations: [{operationId: 'clean', operationTitleRu: 'Уборка', completionCriterionRu: 'Убрано'}],
      }}})};
    const snapshot = JSON.stringify(need);
    const result = buildCanonicalProfessionalPdfProjection({revision: revision(0), rows: [], preliminaryNeeds: [need], workTitleRu: 'Отделка'});
    const related = result.html.split('<strong>Уборка</strong>')[1]!.split('</tbody>')[0]!;
    expect(related).toContain('<strong>Средства подачи материалов</strong>');
    expect(related).toContain('<td class="numeric">Не рассчитано</td>');
    expect([...related.matchAll(/<td class="money">(.*?)<\/td>/gu)].map(match=>match[1])).toEqual(['','']);
    expect(related).not.toMatch(/· 0(?:\s|<)/u);
    expect(result.pricedRowCount).toBe(0);
    expect(result.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
    expect(JSON.stringify(need)).toBe(snapshot);
  });

  it("keeps paid and included resources without inline owner explanations or changes to quantities and totals", () => {
    const source = rows(3);
    source[0]!.title_ru = 'Сварочный труд <img src=x> & оператор';
    source[0]!.category = "labor";
    source[0]!.section = "labor";
    source[0]!.calculation_trace = syntheticTrace({ resourceGraph: { operationCompositionV1: {
      contractVersion: "canonical-operation-resource/v1", groupId: "embedded", groupTitleRu: "Закладные",
      operationId: "labor", operationTitleRu: "Труд", completionCriterionRu: "Работы завершены.",
    } } });
    for (const [index, category] of [[1, "equipment"], [2, "material"]] as const) {
      source[index] = { ...source[index]!, category, included_in_estimate: false, included_in_procurement: false,
        unit_price: null, amount: null, calculation_trace: syntheticTrace({ specificationRu: "Проектная комплектация", resourceGraph: {
          costTreatment: "INCLUDED_IN_RESOURCE_ROWS", includedInResourceOwnerRowId: "row-1",
        } }) };
    }
    const before = JSON.stringify(source);
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(3), rows: source, workTitleRu: "Закладные" });
    expect(projection.html.match(/Сварочный труд &lt;img src=x&gt; &amp; оператор/gu)).toHaveLength(1);
    expect(projection.html).not.toMatch(/Включено в №|Без доплаты/u);
    expect(projection.html.match(/<td class="money"><\/td>/gu)).toHaveLength(4);
    expect(projection.html).not.toContain("стоимость учитывается в труде и механизмах");
    expect(projection.html).not.toContain("<img");
    expect(projection.html).not.toContain("Проектная комплектация");
    expect(projection).toMatchObject({ pricedRowCount: 1, missingPriceRowCount: 0, nonPayableRowCount: 2,
      categoryTotals: { material: 0, equipment: 0, work: 200 } });
    expect(JSON.stringify(source)).toBe(before);
  });

  it('keeps money columns numeric or empty without price-required or included-cost captions', () => {
    const source=rows(3,{missingAt:1});
    source[2]={...source[2]!,included_in_estimate:false,included_in_procurement:false,unit_price:'300',amount:null,
      calculation_trace:syntheticTrace({resourceGraph:{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',includedInResourceOwnerRowId:'row-1'}})};
    const saved=JSON.stringify(source);
    const result=buildCanonicalProfessionalPdfProjection({revision:revision(3),rows:source,workTitleRu:'Отделка'});
    const tableRows=[...result.html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gu)].map(match=>match[1]!);
    const moneyFor=(title:string)=>{
      const matches=tableRows.filter(html=>html.includes(`<strong>${title}</strong>`));
      expect(matches).toHaveLength(1);
      return [...matches[0]!.matchAll(/<td class="money">([^<]*)<\/td>/gu)].map(match=>match[1]);
    };
    expect(moneyFor(String(source[0]!.title_ru))).toEqual(['100,00 сом','200,00 сом']);
    expect(moneyFor(String(source[1]!.title_ru))).toEqual(['','']);
    expect(moneyFor(String(source[2]!.title_ru))).toEqual(['300,00 сом','']);
    expect(result).toMatchObject({pricedRowCount:1,missingPriceRowCount:1,nonPayableRowCount:1});
    expect(JSON.stringify(source)).toBe(saved);
  });

  test.each(['material','tool','equipment','labor','service','transport'])(
    'the actual common renderer applies the same price rule to category %s', category => {
      const source = rows(2,{missingAt:1}).map((row,index)=>({...row,category,section:category,
        title_ru:`Ресурс категории ${category} ${index+1}`}));
      const snapshot = JSON.stringify(source);
      const result = buildCanonicalProfessionalPdfProjection({revision:revision(2),rows:source,workTitleRu:'Общая смета'});
      expect([...result.html.matchAll(/<td class="money">(.*?)<\/td>/gu)].map(match=>match[1]))
        .toEqual(['100,00 сом','200,00 сом','','']);
      for(const row of source) expect(result.html).toContain(`<strong>${row.title_ru}</strong>`);
      expect(result.rowCount).toBe(2);expect(result.pricedRowCount).toBe(1);expect(result.missingPriceRowCount).toBe(1);
      expect(result.html).not.toContain('<td>—</td>');
      expect(JSON.stringify(source)).toBe(snapshot);
    },
  );

  it('invokes the money-cell guard in the actual projection before returning a document',()=>{
    const source=rows(1);source[0]!.unit_price='NaN';
    expect(()=>buildCanonicalProfessionalPdfProjection({revision:revision(1),rows:source,workTitleRu:'Общая смета'}))
      .toThrow(expect.objectContaining({code:'ARTIFACT_MONEY_CELL_PRESENTATION_INVALID'}));
  });

  it("resolves an included owner chain and leaves missing, excluded, cyclic and preliminary owners unclaimed", () => {
    const source = rows(3);
    for (const index of [1, 2]) source[index] = { ...source[index]!, included_in_estimate: false,
      included_in_procurement: false, unit_price: null, amount: null, calculation_trace: syntheticTrace({ resourceGraph: {
        costTreatment: "INCLUDED_IN_RESOURCE_ROWS", includedInResourceOwnerRowId: `row-${index}`,
      } }) };
    const project = () => buildCanonicalProfessionalPdfProjection({ revision: revision(3), rows: source, workTitleRu: "Цепочка включения" });
    expect(project().html).not.toContain("стоимость включена в позицию");
    expect(project().nonPayableRowCount).toBe(2);
    for (const ownerId of ["missing", "row-3", "preliminary"]) {
      source[1]!.calculation_trace = syntheticTrace({ resourceGraph: { costTreatment: "INCLUDED_IN_RESOURCE_ROWS", includedInResourceOwnerRowId: ownerId } });
      const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(3), rows: source,
        preliminaryNeeds: [{ ...rows(1)[0]!, row_id: "preliminary", ordinal: 3, included_in_estimate: false,
          quantity: null, unit_price: null, amount: null, ownership_status: "PRELIMINARY_NEED" }], workTitleRu: "Без владельца" });
      expect(projection.html).not.toContain("стоимость включена в позицию");
      expect(projection.html.match(/<td class="money"><\/td>/gu)).toHaveLength(6);
      expect(projection.categoryTotals.material).toBe(200);
      expect(projection.html).not.toContain("стоимость учитывается в труде и механизмах");
    }
    source[1]!.calculation_trace = syntheticTrace({ resourceGraph: { costTreatment: "INCLUDED_IN_RESOURCE_ROWS", includedInResourceOwnerRowId: "row-1" } });
    source[0]!.included_in_estimate = false;
    expect(project().html).not.toContain("стоимость включена в позицию");
  });

  it("keeps non-payable money columns without repeating control or exclusion explanations", () => {
    const source = rows(4);
    for (const [index, costTreatment] of [[1, "CONTROL_OR_DOCUMENT"], [2, "INFORMATIONAL_SCOPE"], [3, "SEPARATE_RESOURCE"]] as const) {
      source[index] = { ...source[index]!, included_in_estimate: false, calculation_trace: syntheticTrace({ resourceGraph: {
        costTreatment, includedInResourceOwnerRowId: "row-1",
      } }) };
    }
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(4), rows: source, workTitleRu: "Состав" });
    expect(projection.html).not.toContain("Контрольная или исполнительная позиция; отдельно не суммируется.");
    expect(projection.html).not.toContain("Условие выполнения работ; отдельно не суммируется.");
    expect(projection.html).not.toContain("Позиция исключена из итога сохранённой версии.");
    expect(projection.html.match(/<td class="money">100,00 сом<\/td>/gu)).toHaveLength(4);
    expect(projection.html.match(/<td class="money"><\/td>/gu)).toHaveLength(3);
    expect(projection).toMatchObject({pricedRowCount:1,nonPayableRowCount:3,categoryTotals:{material:200}});
    expect(projection.html).not.toContain("стоимость включена в позицию");
  });

  it("escapes titles and omits specification markup without creating embedded links", () => {
    const maliciousRows = rows(1);
    maliciousRows[0]!.title_ru = '<script>alert("row")</script><a href="javascript:alert(1)">link</a>';
    maliciousRows[0]!.calculation_trace = syntheticTrace({
      specificationRu: '<img src=x onerror="alert(2)">',
      inputParameterIds: ["safe_parameter"],
    });
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(1),
      rows: maliciousRows,
      workTitleRu: '<iframe src="https://attacker.invalid"></iframe>',
    });

    expect(projection.html).toContain("&lt;script&gt;");
    expect(projection.html).not.toContain("onerror");
    expect(projection.html).toContain("&lt;iframe src=&quot;https://attacker.invalid&quot;&gt;");
    expect(projection.html).not.toMatch(/<script|<iframe|<img\s|<a\s+href/iu);
    expect(projection.html).not.toMatch(/href=["']javascript:/iu);
  });

  it("maps every public row to one of the five accepted categories", () => {
    expect(canonicalProfessionalPdfCategory({ category: "material" })).toBe("material");
    expect(canonicalProfessionalPdfCategory({ category: "labor" })).toBe("work");
    expect(canonicalProfessionalPdfCategory({ category: "equipment" })).toBe("equipment");
    expect(canonicalProfessionalPdfCategory({ category: "quality_control" })).toBe("service");
    expect(canonicalProfessionalPdfCategory({ category: "Исполнительная документация" })).toBe("service");
    expect(canonicalProfessionalPdfCategory({
      category: "labor",
      calculation_trace: syntheticTrace({ resourceGraph: { costTreatment: "INFORMATIONAL_SCOPE" } }),
    })).toBe("work");
    expect(canonicalProfessionalPdfCategory({ category: "delivery" })).toBe("transport");
  });
  it("prints physical material and machine categories and exact saved quantities without charging informational consumption", () => {
    const source=rows(3);
    source[0]={...source[0]!,category:'material',section:'Монтаж',unit_id:'t',quantity:'0.007300000',included_in_estimate:false,included_in_procurement:false,unit_price:null,amount:null,
      calculation_trace:syntheticTrace({resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE'}})};
    source[1]={...source[1]!,category:'material',section:'Монтаж',unit_id:'t',quantity:'0.002400000',included_in_estimate:false,included_in_procurement:false,unit_price:null,amount:null,
      calculation_trace:syntheticTrace({resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE'}})};
    source[2]={...source[2]!,category:'equipment',section:'Монтаж',unit_id:'machine_hour',quantity:'0.660000000',included_in_estimate:false,included_in_procurement:false,unit_price:null,amount:null,
      calculation_trace:syntheticTrace({resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE'}})};
    const before=JSON.stringify(source),projection=buildCanonicalProfessionalPdfProjection({revision:revision(3),rows:source,workTitleRu:'Монтаж'});
    expect(projection.html).toContain('<td class="numeric">0,0073</td>');expect(projection.html).toContain('<td class="numeric">0,0024</td>');
    expect(projection.html.match(/<td>Материалы<\/td>/gu)).toHaveLength(2);expect(projection.html.match(/<td>Оборудование<\/td>/gu)).toHaveLength(1);
    expect(projection.html.match(/<td class="money"><\/td>/gu)).toHaveLength(6);expect(projection).toMatchObject({pricedRowCount:0,missingPriceRowCount:0,nonPayableRowCount:3,categoryTotals:{material:0,equipment:0}});
    expect(canonicalProfessionalPdfCategory({category:'material',calculation_trace:syntheticTrace({resourceGraph:{costTreatment:'CONTROL_OR_DOCUMENT'}})})).toBe('service');
    expect(JSON.stringify(source)).toBe(before);
  });
  it("keeps paid material kit amounts out of equipment totals inside an equipment operation", () => {
    const material = { ...rows(1)[0]!, section: "Оборудование армирования", category: "material", title_ru: "Полный комплект оснастки станка", unit_id: "set", quantity: "3", amount: "300" };
    const machine = { ...rows(1)[0]!, row_id: "machine", ordinal: 1, section: "Оборудование армирования", category: "equipment", unit_id: "machine_hour", amount: "500" };
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(2), rows: [material, machine], workTitleRu: "Армирование" });
    expect(canonicalProfessionalPdfCategory(material)).toBe("material");
    expect(projection.categoryTotals).toMatchObject({ material: 300, equipment: 500 });
    expect(projection.html).toContain("<td>Материалы</td>");
    expect(projection.html).toContain("<td>Оборудование</td>");
  });
});

test('one declared operation contains all ten authored resource kinds without promoting resource names to headings',()=>{
  const kinds=['MATERIAL','CONSUMABLE','TOOL','ACCESSORY','EQUIPMENT','MECHANISM','LABOR','SERVICE','TRANSPORT','PPE'];
  const labels=['Материалы','Расходники','Инструмент','Оснастка','Оборудование','Механизмы','Труд','Услуги','Доставка','Средства защиты'];
  const source=rows(10).map((row,index)=>({...row,category:'equipment',title_ru:'Ресурс произвольный '+index,
    calculation_trace:syntheticTrace({resourceGraph:{operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',
      groupId:'room',groupTitleRu:'Монтаж узла',operationId:'install',operationTitleRu:'Установка и крепление узла',completionCriterionRu:'Закреплено'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
        sourceTitleRu:'Ресурс произвольный '+index,nameRu:'Ресурс произвольный '+index,
        brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:kinds[index]}}})}));
  const before=JSON.stringify(source),p=buildCanonicalProfessionalPdfProjection({revision:revision(10),rows:source,workTitleRu:'Монтаж узла'});
  expect(p.html.match(/<tr class="operation">/gu)).toHaveLength(1);
  expect(p.html).toContain('<strong>Установка и крепление узла</strong>');
  labels.forEach(label=>expect(p.html).toContain('<td>'+label+'</td>'));
  expect(p.categoryTotals.equipment).toBe(2000);
  expect(p.html).toContain('Инструмент, оборудование и механизмы');
  expect(JSON.stringify(source)).toBe(before);
});
test('shared typed equipment retains ordinal quantity and reference price, pays once, and keeps unknown accessory visible',()=>{
  const operation={contractVersion:'canonical-operation-resource/v1',groupId:'test',groupTitleRu:'Монтаж',
    operationId:'install',operationTitleRu:'Монтаж крепления',completionCriterionRu:'Закреплено',
    additionalOperations:[{operationId:'check',operationTitleRu:'Проверка крепления',completionCriterionRu:'Проверено'}]};
  const descriptor=(title:string,resourceKind:string)=>({contractVersion:'canonical-public-resource-presentation/v1',
    sourceTitleRu:title,nameRu:title,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind});
  const paid={...rows(1)[0]!,title_ru:'Инструмент сборки',category:'equipment',quantity:'2.5',unit_id:'piece',unit_price:'17',amount:'42.5',
    calculation_trace:syntheticTrace({resourceGraph:{operationCompositionV1:operation,publicResourcePresentationV1:descriptor('Инструмент сборки','TOOL')}})};
  const need={...rows(1)[0]!,row_id:'unknown',ordinal:1,title_ru:'Оснастка контроля',category:'equipment',quantity:null,unit_price:'9',amount:null,
    included_in_estimate:false,included_in_procurement:false,ownership_status:'PRELIMINARY_NEED',
    calculation_trace:syntheticTrace({resourceGraph:{operationCompositionV1:operation,publicResourcePresentationV1:descriptor('Оснастка контроля','ACCESSORY')}})};
  const before=JSON.stringify({paid,need}),p=buildCanonicalProfessionalPdfProjection({revision:revision(1),rows:[paid],preliminaryNeeds:[need],workTitleRu:'Монтаж'});
  const records=[...p.html.matchAll(/<tr(?: class="preliminary-need")?>[\s\S]*?<\/tr>/gu)].map(m=>m[0]);
  const tool=records.filter(r=>r.includes('<strong>Инструмент сборки</strong>'));
  expect(tool).toHaveLength(2);
  tool.forEach(r=>{expect(r).toContain('<td class="number">1</td>');expect(r).toContain('<td class="numeric">2,5</td>');
    expect(r).toContain('<td class="unit">шт.</td>');expect(r).toContain('17,00 сом');expect(r).toContain('<td>Инструмент</td>');});
  expect(tool.filter(r=>r.includes('42,50 сом'))).toHaveLength(1);
  expect(tool.filter(r=>r.includes('<td class="money"></td>'))).toHaveLength(1);
  expect(records.filter(r=>r.includes('<strong>Оснастка контроля</strong>')&&r.includes('Не рассчитано')&&r.includes('<td>Оснастка</td>'))).toHaveLength(2);
  expect(p.categoryTotals.equipment).toBe(42.5);expect(p.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
  expect(JSON.stringify({paid,need})).toBe(before);
});
test.each(['missing','resource-heading'])(
  'the direct common PDF path rejects a synthetic structural defect: %s',defect=>{
    const source=rows(1);const row=source[0]!;
    row.calculation_trace=defect==='missing'?{}:{resourceGraph:{operationCompositionV1:{...syntheticPdfOperation,
      operationTitleRu:String(row.title_ru)}}};
    const before=JSON.stringify(source);
    expect(()=>buildCanonicalProfessionalPdfProjection({revision:revision(1),rows:source,workTitleRu:'Проверка состава'}))
      .toThrow(expect.objectContaining({code:'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID'}));
    expect(JSON.stringify(source)).toBe(before);
  });
