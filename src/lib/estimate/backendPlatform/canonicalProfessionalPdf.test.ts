import {
  buildCanonicalProfessionalPdfProjection,
  canonicalProfessionalPdfCategory,
  CANONICAL_PROFESSIONAL_PDF_CATEGORY_ORDER,
  CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
  assertCanonicalProfessionalPdfJobRendererVersion,
} from "./canonicalProfessionalPdf";
import type { CanonicalArtifactRow } from "./canonicalEstimateArtifactContract";
import { canonicalArtifactUnit, buildCanonicalProcurementProjection } from "./canonicalEstimateArtifactContract";
import { canonicalEstimateParameterChoiceLabelRu } from "./canonicalEstimateParameterSemantics";
import { publicBoqDisplayNameRu } from "../publicBoqNaming";
import { compilePressureSewerPipelineR1, PRESSURE_SEWER_PIPELINE_SHORT_INPUT } from "../v4/pressureSewerPipelineR1";

test("versioned professional PDF jobs reject an obsolete worker and retain legacy compatibility", () => {
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION })).not.toThrow();
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({})).not.toThrow();
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.old" }))
    .toThrow(expect.objectContaining({ code: "ARTIFACT_RENDERER_VERSION_MISMATCH" }));
  expect(() => assertCanonicalProfessionalPdfJobRendererVersion({ rendererVersion: "canonical-professional-pdf.r4-a13-s27-37-work-process" }))
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
test('PDF shows each source-owned stage actual inputs without replacing a missing independent measure by primary q',()=>{
 const source=rows(3).map((row,index)=>({...row,calculation_trace:{resourceGraph:{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',parameterIds:[['q','roof_screed_area_m2','roof_valley_length_m'][index]!]},operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'control',groupTitleRu:'Контроль',operationId:'stage'+index,operationTitleRu:['Покрытие','Стяжка','Ендовы'][index],completionCriterionRu:'Контроль'}}}}));
 const labels={q:'Площадь покрытия, м²',roof_screed_area_m2:'Площадь стяжки, м²',roof_valley_length_m:'Длина ендов, м'};
 const r={...revision(3),input_parameters:{q:'40',roof_screed_area_m2:'20',roof_valley_length_m:'20'}};
 const html=buildCanonicalProfessionalPdfProjection({revision:r,rows:source,workTitleRu:'Кровля',parameterTitlesRu:labels}).html;
 expect(html).toContain('Исходные данные этапа: Площадь покрытия, м²: 40');expect(html).toContain('Исходные данные этапа: Площадь стяжки, м²: 20');expect(html).toContain('Исходные данные этапа: Длина ендов, м: 20');
 expect(html).not.toContain('roof_screed_area_m2');
 const missing=buildCanonicalProfessionalPdfProjection({revision:{...r,input_parameters:{...r.input_parameters,roof_screed_area_m2:null}},rows:source,workTitleRu:'Кровля',parameterTitlesRu:labels}).html;
 expect(missing).not.toContain('Исходные данные этапа: Площадь стяжки');
});

test.each(['LEGACY_SOURCE_REQUIRED','OBJECT_FACT_REQUIRED','REQUIRED_RESOURCE_EXCLUDED','USER_EXCLUDED'])('fully priced rows retain the actual source/scope reason instead of asking for prices: %s',status=>{
  const source=rows(1),check={...rows(1)[0]!,row_id:'source-check',ordinal:2,quantity:status==='USER_EXCLUDED'?'0':null,unit_price:null,amount:null,included_in_estimate:false,included_in_procurement:false,ownership_status:'PRELIMINARY_NEED',calculation_trace:{resourceGraph:{scopeRequirementDecisionV1:{contractVersion:'canonical-scope-requirement-decision/v1',rowId:'source-check',groupId:'system',groupTitleRu:'Система кровли',titleRu:'Проверка системы',reasonRu:'Нормы требуют проверки',kind:'OBJECT_SCOPE',status,coveringRowIds:[],originalRowIds:[],missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false}}}};
  const numeric=status==='USER_EXCLUDED';
  const projection=buildCanonicalProfessionalPdfProjection({revision:revision(numeric?2:1),rows:numeric?[...source,check]:source,preliminaryNeeds:numeric?[]:[check],workTitleRu:'CONTROL'});
  expect(projection.missingPriceRowCount).toBe(0);expect(projection.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
  expect(projection.html).toContain('Состав одного этапа ещё не завершён приложением');
  expect(projection.html).toContain('<strong>полный итог не рассчитан</strong>');
  expect(projection.html).not.toContain('Полный итог: требуется уточнение цен.');
  expect(projection.html).not.toContain('<strong>требуется уточнение цен</strong>');
  expect(projection.html).toContain('<strong>Позиций расчёта</strong><br>1');
  expect(projection.html).toContain('<strong>Количество известно</strong><br>1; ещё не рассчитано 0');
  expect(source).toHaveLength(1);
});

test('ordinary PDF keeps essential specifications without explanatory paragraphs while quantity and cost remain unknown',()=>{
  const sourceTitle='Ручной инструмент штукатурки — обеспечение требует проверки';
  const need={...rows(1)[0]!,title_ru:sourceTitle,quantity:null,unit_price:null,amount:null,included_in_estimate:false,included_in_procurement:false,
    ownership_status:'PRELIMINARY_NEED',calculation_trace:{resourceGraph:{publicResourcePresentationV1:{
      contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:sourceTitle,nameRu:'Штукатурный инструмент по этапам',brandAndModelRu:null,
      specificationRu:'Для ручной гипсовой штукатурки',detailsRu:['На потолок раствор наносится соколом.','Покупка комплекта на каждый участок не подтверждена <script>.','На потолок раствор наносится соколом.']}}}};
  const snapshot=JSON.stringify(need),projection=buildCanonicalProfessionalPdfProjection({revision:revision(0),rows:[],preliminaryNeeds:[need],workTitleRu:'Штукатурка'});
  expect(projection.html.match(/<tr class="preliminary-need-specification">/gu)).toHaveLength(1);
  expect(projection.html).toContain('<strong>Штукатурный инструмент по этапам:</strong> Для ручной гипсовой штукатурки');
  expect(projection.html).not.toContain('На потолок раствор наносится соколом.');
  expect(projection.html).not.toContain('Покупка комплекта на каждый участок');
  expect(projection.html).not.toContain('<script>');expect(projection.html).toContain('Не рассчитано');
  expect(projection).toMatchObject({rowCount:1,pricedRowCount:0,preliminaryNeedCount:1,grandTotalStatus:'PARTIAL_NEEDS_PRICE'});expect(JSON.stringify(need)).toBe(snapshot);
  for(const trace of [{...need.calculation_trace,manualTitleOverride:true},{resourceGraph:{publicResourcePresentationV1:{...need.calculation_trace.resourceGraph.publicResourcePresentationV1,sourceTitleRu:'Другое изделие'}}}]){
    const suppressed=buildCanonicalProfessionalPdfProjection({revision:revision(0),rows:[],preliminaryNeeds:[{...need,calculation_trace:trace}],workTitleRu:'Штукатурка'});
    expect(suppressed.html).not.toContain('<tr class="preliminary-need-specification">');expect(suppressed.html).not.toContain('На потолок раствор наносится соколом.');
  }
});

test('ordinary PDF omits even the largest explanatory resource profile without changing row counts',()=>{
  const title='Ручной инструмент',details=Array.from({length:16},(_,i)=>`Этап ${i+1}: ${'Проверить пригодность инструмента. '.repeat(24)}`);
  const need={...rows(1)[0]!,title_ru:title,quantity:null,unit_price:null,amount:null,included_in_estimate:false,included_in_procurement:false,
    calculation_trace:{resourceGraph:{publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:title,nameRu:title,brandAndModelRu:null,specificationRu:null,detailsRu:details}}}};
  const projection=buildCanonicalProfessionalPdfProjection({revision:revision(0),rows:[],preliminaryNeeds:[need],workTitleRu:'Штукатурка'});
  expect(projection.html).not.toContain('<tr class="preliminary-need-specification">');
  for(const detail of details)expect(projection.html).not.toContain(detail);expect(projection.rowCount).toBe(1);expect(projection.pricedRowCount).toBe(0);
});

const categories = ["material", "labor", "equipment", "service", "transport"];

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
        ? { specificationRu: "Толщина и марка уточняются по проекту", inputParameterIds: ["roof_area_m2"] }
        : { formulaExplanationRu: "Количество принято из immutable revision" },
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
      calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE', titleSpecificationMode:'APPEND',
        titleSpecificationParameterIds:['waste_mode'], titleSpecificationSeparator:' — ',
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:'Принятая схема обращения',
          detailsRu:['Постоянное пояснение должно оставаться в объяснении расчёта']}}}};
    source[1] = {...source[1]!,row_id:'waste-service',category:'service',title_ru:`Дополнительная услуга — ${service}`,
      quantity:'1.25',unit_id:'t',unit_price:null,amount:null,
      calculation_trace:{resourceGraph:{costTreatment:'OWN_COST',titleSpecificationMode:'APPEND',
        titleSpecificationParameterIds:['service_contents'],titleSpecificationSeparator:' — '}}};
    const saved = {...revision(2),input_parameters:{waste_mode:mode,service_contents:service}},before=JSON.stringify({source,saved});
    const pdf = buildCanonicalProfessionalPdfProjection({revision:saved,rows:source,workTitleRu:'Разборка каменной шашки'});
    expect(pdf.html).toContain('Материалы остаются на объекте; внешний вывоз не нужен');
    expect(pdf.html).toContain('Дополнительная услуга — Согласованная тара &lt;контроль&gt;');
    expect(pdf.html).not.toContain('Постоянное пояснение');
    expect(pdf.html).not.toContain('<контроль>');
    expect(pdf).toMatchObject({rowCount:2,pricedRowCount:0,missingPriceRowCount:1,grandTotalStatus:'PARTIAL_NEEDS_PRICE'});
    expect(pdf.html).toContain('<td class="numeric">1,25</td>');
    expect(JSON.stringify({source,saved})).toBe(before);
    source[1] = {...source[1]!,title_ru:'Согласованное ручное название',calculation_trace:{...(source[1]!.calculation_trace as Record<string, unknown>),manualTitleOverride:true}};
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
      calculation_trace:{resourceGraph:{titleSpecificationMode:'APPEND',titleSpecificationParameterIds:['contents','reference'],
        titleSpecificationParameterLabelsRu:{contents:'Состав спуска и погрузки',reference:'Спецификация услуги'},titleSpecificationSeparator:' — '}}};
    const saved = {...revision(1),input_parameters:{contents,reference}};
    const before = JSON.stringify({source,saved});
    const pdf = buildCanonicalProfessionalPdfProjection({revision:saved,rows:source,workTitleRu:'Разборка асфальтового покрытия'});
    expect(pdf.html).toContain('со снятым асфальтовым покрытием пола');
    for (const selected of [contents,reference]) expect(pdf.html.split(selected).length-1).toBe(1);
    expect(pdf.html.split('Состав спуска и погрузки:').length-1).toBe(1);
    expect(pdf.html).toContain('<td class="numeric">1,25</td>');
    expect(JSON.stringify({source,saved})).toBe(before);
    source[0] = {...source[0]!,title_ru:'Ручное название со снятой асфальтовым покрытием',calculation_trace:{manualTitleOverride:true}};
    expect(buildCanonicalProfessionalPdfProjection({revision:saved,rows:source,workTitleRu:'Разборка асфальтового покрытия'}).html)
      .toContain('<strong>Ручное название со снятой асфальтовым покрытием</strong>');
  });
  it("prints compact resource cells without the Silenzio application bullet lists while preserving estimate and buyer data", () => {
    const source=rows(1);
    source[0]={...source[0]!,title_ru:'Упаковка EGGER Silenzio Duo 1222949, 10 м²',unit_id:'pcs',quantity:'4',unit_price:'2500',amount:'10000',
      calculation_trace:{specificationRu:'Длинная спецификация, которую пользователь убрал из строк PDF',resourceGraph:{
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:'Упаковка EGGER Silenzio Duo 1222949, 10 м²',
          specificationRu:'XPS HD и встроенная пароизоляция',detailsRu:['Применение: минеральное основание и плавающая укладка','Наличие, резерв и кратность поставщика задаются явно']}}}};
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
      calculation_trace: { purchaseBalance: { ownerRowId: "water", unitId: "m3", consumed: "3.2", plannedConsumption: "3.2",
        stock: "0", reserve: "0", effectiveOrder: "5.1", remaining: "1.9", freeBeyondReserve: "1.9",
        consumptionShortage: "0", reserveDeficit: "0", quantum: null } } };
    sourceRows[1] = { ...sourceRows[1]!, title_ru: "Листы опалубки", category: "equipment", unit_id: "piece_day", quantity: "1624",
      calculation_trace: { resourceGraph: { supplyMode: "RENTAL_RETURNABLE", returnable: true,
        sourceScheduleParameterIds: ["sheets", "days"], rentalDurationParameterId: "days" } } };
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
    expect(projection.html).toContain("Аренда: 58 шт. на 28 сут.; расчёт оплаты 1 624 шт.·сут");
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
    expect(canonicalArtifactUnit({ unit_id: "shift", calculation_trace: { displayUnitRu: "чел.-смена" } })).toBe("чел.-смена");
    expect(["m", "item", "machine_hour", "unknown_custom_unit"].map(unit_id => canonicalArtifactUnit({ unit_id })))
      .toEqual(["м", "шт.", "маш.-ч", "unknown_custom_unit"]);
  });
  it("projects the real pressure-sewer technology in Russian across UI, choices and PDF without changing revision rows", async () => {
    const compiled = await compilePressureSewerPipelineR1({ ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT });
    const snapshot = JSON.stringify(compiled);
    const source = compiled.rows.find(row => row.row_id === "rc09:psp_pipeline_install_acceptance")!;
    const label = "прокладка ПНД-трубы в открытой траншее со стыковой сваркой";
    expect(source.title_ru).toContain("HDPE_BUTT_FUSION_OPEN_TRENCH");
    expect(canonicalEstimateParameterChoiceLabelRu("psp_installation_technology", "HDPE_BUTT_FUSION_OPEN_TRENCH"))
      .toBe(label);
    const projection = buildCanonicalProfessionalPdfProjection({
      revision: revision(compiled.rows.length), rows: compiled.rows,
      workTitleRu: "Напорная канализация",
    });
    expect(projection.html).toContain(label);
    expect(projection.html).not.toContain("HDPE_BUTT_FUSION_OPEN_TRENCH");
    expect(projection.html).not.toContain('<h2>Процесс работ</h2>');
    expect(projection.html).not.toContain('<li>Монтаж трубы, фасонных частей, арматуры и камер</li>');
    expect(projection.html).not.toContain('Сохранённые подработы; последовательность выполнения ещё не задана.');
    expect(projection.html).not.toContain('Подработы этой сметы ещё не раскрыты');
    expect(typeof source.title_ru).toBe("string");
    expect(publicBoqDisplayNameRu({ sourceNameRu: String(source.title_ru), rowType: "work" }))
      .toBe(`Строительство и приёмка напорного канализационного трубопровода — ${label}`);
    expect(projection.rowCount).toBe(compiled.rows.length);
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

    expect(CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).toBe("canonical-professional-pdf.r4-a13-s27-69-selected-scope-template48");
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
    expect(projection.html).toContain("Механизмы");
    expect(projection.html).toContain("Услуги");
    expect(projection.html).toContain("Доставка");
    expect(projection.html).toContain("Требуется цена");
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
    expect(projection.html).toContain("<strong>Статус:</strong> Полная");
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
    expect(projection.html).toContain("ДЕМО / VALIDATION_FIXTURE: подтверждение проекта отсутствует &lt;script&gt;");
    expect(projection.html).toContain("ДЕМО / VALIDATION_FIXTURE — испытательный документ.");
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
    compositionRows[0]!.calculation_trace = {
      resourceGraph: { costTreatment: "INCLUDED_IN_RESOURCE_ROWS" },
    };
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
    expect(projection.html).toContain("Не применяется");
    expect(projection.html).toContain("Не суммируется");
    const resourceTable = projection.html.slice(projection.html.indexOf('<table class="client">'));
    expect(resourceTable.indexOf("Профессиональная позиция 1"))
      .toBeLessThan(resourceTable.indexOf("Профессиональная позиция 2"));
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
      calculation_trace: { resourceGraph: { operationCompositionV1: operation } },
    }));
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(0), rows: [], preliminaryNeeds: needs,
      workTitleRu: "Переход", parameterTitlesRu: { "source-one": "Подтверждённая норма", "source-two": "Подтверждённая норма" } });
    expect(projection.rowCount).toBe(2);
    expect(projection.preliminaryNeedCount).toBe(2);
    expect(projection.html).toContain("Электроды");
    expect(projection.html).toContain("Монтажный механизм");
    expect(projection.html).toContain("2 (условия не подтверждены)");
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
    for (const index of [1, 3]) source[index]!.calculation_trace = { resourceGraph: { operationCompositionV1: operation } };
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
      source[index]!.calculation_trace = { resourceGraph: { operationCompositionV1: {
        contractVersion: 'canonical-operation-resource/v1', groupId: 'pipeline', groupTitleRu: 'Монтаж трубопровода',
        operationId: `step-${index}`, operationTitleRu: title, completionCriterionRu: 'По проекту',
        processRole: 'PROCESS', processOrdinal: index,
      } } };
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
    source[0]!.calculation_trace = { resourceGraph: { operationCompositionV1: {
      contractVersion: 'canonical-operation-resource/v1', groupId: 'pipe', groupTitleRu: 'Монтаж трубы',
      operationId: 'straight', operationTitleRu: 'Прямые стыки', completionCriterionRu: 'Сварены',
      additionalOperations: [{ operationId: 'nodes', operationTitleRu: 'Фитинги узлов', completionCriterionRu: 'Сварены' }],
    } } };
    const snapshot = JSON.stringify(source);
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(1), rows: source, workTitleRu: 'Монтаж трубы' });
    const baseline = buildCanonicalProfessionalPdfProjection({ revision: revision(1), rows: [{ ...source[0]!, calculation_trace: {} }], workTitleRu: 'Монтаж трубы' });
    expect(projection.html).not.toContain('<li>Прямые стыки<div class="muted">');
    expect(projection.html).not.toContain('<li>Фитинги узлов<div class="muted">');
    expect(projection.html).not.toContain('одна строка ресурса для нескольких подработ');
    expect(projection.html.match(/Сварочный аппарат &lt;PP-R&gt;/gu)).toHaveLength(2);
    expect(projection.html).toContain('общий ресурс, учтён в разделе «Прямые стыки»');
    expect(projection.html).toContain('Сварочный аппарат &lt;PP-R&gt;');
    expect(projection.html).not.toContain('<PP-R>');
    expect(projection.rowCount).toBe(1);
    expect(projection.pricedRowCount).toBe(baseline.pricedRowCount);
    expect(projection.categoryTotals).toEqual(baseline.categoryTotals);
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it("keeps paid and included resources without inline owner explanations or changes to quantities and totals", () => {
    const source = rows(3);
    source[0]!.title_ru = 'Сварочный труд <img src=x> & оператор';
    source[0]!.category = "labor";
    source[0]!.section = "labor";
    source[0]!.calculation_trace = { resourceGraph: { operationCompositionV1: {
      contractVersion: "canonical-operation-resource/v1", groupId: "embedded", groupTitleRu: "Закладные",
      operationId: "labor", operationTitleRu: "Труд", completionCriterionRu: "Работы завершены.",
    } } };
    for (const [index, category] of [[1, "equipment"], [2, "material"]] as const) {
      source[index] = { ...source[index]!, category, included_in_estimate: false, included_in_procurement: false,
        unit_price: null, amount: null, calculation_trace: { specificationRu: "Проектная комплектация", resourceGraph: {
          costTreatment: "INCLUDED_IN_RESOURCE_ROWS", includedInResourceOwnerRowId: "row-1",
        } } };
    }
    const before = JSON.stringify(source);
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(3), rows: source, workTitleRu: "Закладные" });
    expect(projection.html.match(/Сварочный труд &lt;img src=x&gt; &amp; оператор/gu)).toHaveLength(1);
    expect(projection.html.match(/<td class="money">Не суммируется<\/td>/gu)).toHaveLength(2);
    expect(projection.html).not.toContain("стоимость учитывается в труде и механизмах");
    expect(projection.html).not.toContain("<img");
    expect(projection.html).not.toContain("Проектная комплектация");
    expect(projection).toMatchObject({ pricedRowCount: 1, missingPriceRowCount: 0, nonPayableRowCount: 2,
      categoryTotals: { material: 0, equipment: 0, work: 200 } });
    expect(JSON.stringify(source)).toBe(before);
  });

  it("resolves an included owner chain and leaves missing, excluded, cyclic and preliminary owners unclaimed", () => {
    const source = rows(3);
    for (const index of [1, 2]) source[index] = { ...source[index]!, included_in_estimate: false,
      included_in_procurement: false, unit_price: null, amount: null, calculation_trace: { resourceGraph: {
        costTreatment: "INCLUDED_IN_RESOURCE_ROWS", includedInResourceOwnerRowId: `row-${index}`,
      } } };
    const project = () => buildCanonicalProfessionalPdfProjection({ revision: revision(3), rows: source, workTitleRu: "Цепочка включения" });
    expect(project().html).not.toContain("стоимость включена в позицию");
    expect(project().nonPayableRowCount).toBe(2);
    for (const ownerId of ["missing", "row-3", "preliminary"]) {
      source[1]!.calculation_trace = { resourceGraph: { costTreatment: "INCLUDED_IN_RESOURCE_ROWS", includedInResourceOwnerRowId: ownerId } };
      const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(3), rows: source,
        preliminaryNeeds: [{ ...rows(1)[0]!, row_id: "preliminary", ordinal: 3, included_in_estimate: false,
          quantity: null, unit_price: null, amount: null, ownership_status: "PRELIMINARY_NEED" }], workTitleRu: "Без владельца" });
      expect(projection.html).not.toContain("стоимость включена в позицию");
      expect(projection.html.match(/<td class="money">Не суммируется<\/td>/gu)).toHaveLength(2);
      expect(projection.categoryTotals.material).toBe(200);
      expect(projection.html).not.toContain("стоимость учитывается в труде и механизмах");
    }
    source[1]!.calculation_trace = { resourceGraph: { costTreatment: "INCLUDED_IN_RESOURCE_ROWS", includedInResourceOwnerRowId: "row-1" } };
    source[0]!.included_in_estimate = false;
    expect(project().html).not.toContain("стоимость включена в позицию");
  });

  it("keeps non-payable money columns without repeating control or exclusion explanations", () => {
    const source = rows(4);
    for (const [index, costTreatment] of [[1, "CONTROL_OR_DOCUMENT"], [2, "INFORMATIONAL_SCOPE"], [3, "SEPARATE_RESOURCE"]] as const) {
      source[index] = { ...source[index]!, included_in_estimate: false, calculation_trace: { resourceGraph: {
        costTreatment, includedInResourceOwnerRowId: "row-1",
      } } };
    }
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(4), rows: source, workTitleRu: "Состав" });
    expect(projection.html).not.toContain("Контрольная или исполнительная позиция; отдельно не суммируется.");
    expect(projection.html).not.toContain("Условие выполнения работ; отдельно не суммируется.");
    expect(projection.html).not.toContain("Позиция исключена из итога сохранённой версии.");
    expect(projection.html.match(/<td class="money">Не применяется<\/td>/gu)).toHaveLength(3);
    expect(projection.html.match(/<td class="money">Не суммируется<\/td>/gu)).toHaveLength(3);
    expect(projection).toMatchObject({pricedRowCount:1,nonPayableRowCount:3,categoryTotals:{material:200}});
    expect(projection.html).not.toContain("стоимость включена в позицию");
  });

  it("escapes titles and omits specification markup without creating embedded links", () => {
    const maliciousRows = rows(1);
    maliciousRows[0]!.title_ru = '<script>alert("row")</script><a href="javascript:alert(1)">link</a>';
    maliciousRows[0]!.calculation_trace = {
      specificationRu: '<img src=x onerror="alert(2)">',
      inputParameterIds: ["safe_parameter"],
    };
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
      calculation_trace: { resourceGraph: { costTreatment: "INFORMATIONAL_SCOPE" } },
    })).toBe("work");
    expect(canonicalProfessionalPdfCategory({ category: "delivery" })).toBe("transport");
  });
  it("prints physical material and machine categories and exact saved quantities without charging informational consumption", () => {
    const source=rows(3);
    source[0]={...source[0]!,category:'material',section:'Монтаж',unit_id:'t',quantity:'0.007300000',included_in_estimate:false,included_in_procurement:false,unit_price:null,amount:null,
      calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE'}}};
    source[1]={...source[1]!,category:'material',section:'Монтаж',unit_id:'t',quantity:'0.002400000',included_in_estimate:false,included_in_procurement:false,unit_price:null,amount:null,
      calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE'}}};
    source[2]={...source[2]!,category:'equipment',section:'Монтаж',unit_id:'machine_hour',quantity:'0.660000000',included_in_estimate:false,included_in_procurement:false,unit_price:null,amount:null,
      calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE'}}};
    const before=JSON.stringify(source),projection=buildCanonicalProfessionalPdfProjection({revision:revision(3),rows:source,workTitleRu:'Монтаж'});
    expect(projection.html).toContain('<td class="numeric">0,0073</td>');expect(projection.html).toContain('<td class="numeric">0,0024</td>');
    expect(projection.html.match(/<td>Материалы<\/td>/gu)).toHaveLength(2);expect(projection.html.match(/<td>Механизмы<\/td>/gu)).toHaveLength(1);
    expect(projection.html.match(/Не суммируется/gu)).toHaveLength(3);expect(projection).toMatchObject({pricedRowCount:0,missingPriceRowCount:0,nonPayableRowCount:3,categoryTotals:{material:0,equipment:0}});
    expect(canonicalProfessionalPdfCategory({category:'material',calculation_trace:{resourceGraph:{costTreatment:'CONTROL_OR_DOCUMENT'}}})).toBe('service');
    expect(JSON.stringify(source)).toBe(before);
  });
  it("keeps paid material kit amounts out of equipment totals inside an equipment operation", () => {
    const material = { ...rows(1)[0]!, section: "Оборудование армирования", category: "material", title_ru: "Полный комплект оснастки станка", unit_id: "set", quantity: "3", amount: "300" };
    const machine = { ...rows(1)[0]!, row_id: "machine", ordinal: 1, section: "Оборудование армирования", category: "equipment", unit_id: "machine_hour", amount: "500" };
    const projection = buildCanonicalProfessionalPdfProjection({ revision: revision(2), rows: [material, machine], workTitleRu: "Армирование" });
    expect(canonicalProfessionalPdfCategory(material)).toBe("material");
    expect(projection.categoryTotals).toMatchObject({ material: 300, equipment: 500 });
    expect(projection.html).toContain("<td>Материалы</td>");
    expect(projection.html).toContain("<td>Механизмы</td>");
  });
});
