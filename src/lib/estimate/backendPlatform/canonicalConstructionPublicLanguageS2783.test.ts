import socketPublicPack from '../../../../data/estimate-benchmarks/source-packs/socket-complete-surface-2pe-project-r266.json';
import {elecorMechanicalProjectFixingsDefinitionR1 as electricalDefinition, compileElecorMechanicalProjectFixingsR1 as compileElectrical,
  elecorMechanicalProjectFixingsControlInputR1 as electricalFacts, elecorMechanicalProjectFixingsOwnerR1 as electricalOwner,
  elecorMechanicalProjectFixingsPackR1 as electricalPack} from '../v4/elecorMechanicalProjectFixingsCompletionR1';
import {canonicalEstimateResourceOperationSections} from './canonicalEstimateOperationComposition';
import publicBindings from '../../../../data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json';
import simpleBindings from '../../../../data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json';
import {canonicalPublicEstimateWorkTitleRu as work,canonicalPublicEstimateRowNameRu as row,
  canonicalPublicEstimateRowDetailsRu as details,canonicalPublicEstimateParameterTitleRu as parameter,
  canonicalPublicEstimateParameterGuideRu,canonicalPublicEstimatePendingRowGuideRu,
  canonicalPublicEstimateTextRu,canonicalPublicEstimateRequestTextRu,canonicalPublicEstimateOperationReferenceRu} from './canonicalPublicEstimateLanguageRu';
import {canonicalPublicResourceDisplayPresentationV1 as presentation,bindCanonicalPublicResourceSavedTitleV1} from './canonicalPublicResourcePresentationV1';
import {canonicalArtifactVisibleRowTitle,canonicalArtifactSpecificationParts,CANONICAL_PROCUREMENT_GENERATOR_VERSION,
  canonicalArtifactPreliminaryNeeds,buildCanonicalProcurementProjection} from './canonicalEstimateArtifactContract';
import {CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,buildCanonicalProfessionalPdfProjection} from './canonicalProfessionalPdf';
import {canonicalEstimateParameterChoiceLabelRu} from './canonicalEstimateParameterSemantics';
import {brickPartitionCraneModesR1} from '../v4/brickPartitionHalfKrer08Column05R1';
import {createHash} from 'node:crypto';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';
import {ct54ReadyFacadeDefinitionS2763,ct54ReadyFacadeControlFactsS2763} from '../v4/ct54ReadyFacadeSeriesS2763';
import {canonicalEstimateOperationReference} from './canonicalEstimateOperationComposition';
import type {CanonicalEstimateCatalogItem} from './contracts';

const binding=(rowId:string)=>publicBindings.bindings.find(x=>x.rowId===rowId)!;
const wp='hydrotest:internal-steel:dn50:krer16-005-01:',tp='ceramic-floor:cement-mortar:krer11-01-027-03:';

it.each([
 ['Щиты рамной опалубки Doka Frami Xlife','Щиты рамной опалубки'],
 ['Угловые элементы Doka Frami Xlife','Угловые элементы рамной опалубки'],
 ['Соединители щитов Doka Frami','Соединители щитов рамной опалубки'],
 ['Плоская стяжка Frami 10–80 см, артикул 588475000','Плоская стяжка для опалубки, 10–80 см'],
 ['Зажим плоской стяжки Frami, артикул 588434000','Зажим плоской стяжки опалубки'],
 ['Фундаментный зажим Frami, артикул 588452000','Фундаментный зажим опалубки'],
 ['Подкосы Doka 260 для выверки щитов','Подкосы для выверки щитов'],
 ['Перфорированная лента Frami 50×2 мм, артикул 588206000','Перфорированная лента для опалубки, 50 × 2 мм'],
])('uses the functional source-bound resource name across reused row namespaces: %s',(source,name)=>{
 for(const rowId of ['equipment:formwork:source','master212:concrete-cycle:r1:formwork:equipment:formwork:source']){
  const saved={row_id:rowId,title_ru:source,ordinal:0,category:'equipment',unit_id:'piece',quantity:'2.5',unit_price:'100',amount:'250',currency_code:'KGS',included_in_estimate:true,included_in_procurement:true,procurement_eligible:true,ownership_status:'OWNED',row_sha256:'a'.repeat(64)},before=JSON.stringify(saved);
  expect(row({rowId,titleRu:source})).toBe(name);expect(canonicalArtifactVisibleRowTitle(saved,{})).toBe(name);
  expect(row({rowId,titleRu:source,manualTitleOverride:true})).toBe(source);
  expect(row({rowId,titleRu:'Моя позиция: '+source})).toBe('Моя позиция: '+source);
  expect(JSON.stringify(saved)).toBe(before);
 }
});

it.each(['Монтаж комплекта — 5 set','Монтаж комплекта — 1,5 set','Монтаж комплекта — 1 000 set'])(
 'localizes only the saved system measure suffix without altering explicit manual titles: %s',source=>{
  expect(work(source)).toBe(source.replace(/set$/u,'компл.'));
  expect(work(source,{manualTitleOverride:true})).toBe(source);
 });
it('retains set in ordinary names and unknown units, and preserves exact authored work naming',()=>{
 expect(work('Набор set для монтажа')).toBe('Набор set для монтажа');
 expect(work('Монтаж комплекта — 5 unregistered-set')).toBe('Монтаж комплекта — 5 unregistered-set');
 const b=publicBindings.workBindings[0]!;
 expect(work(b.sourceTitleRu+' — 5 set')).toBe(b.nameRu+' — 5 компл.');
});

it.each(publicBindings.workBindings)('uses the exact authored work label and retains its system measure: $sourceTitleRu',b=>{
 expect(work(b.sourceTitleRu)).toBe(b.nameRu);
 expect(work(b.sourceTitleRu+' — 35,5 м²')).toBe(b.nameRu+' — 35,5 м²');
 expect(work('Моя смета: '+b.sourceTitleRu)).toBe('Моя смета: '+b.sourceTitleRu);
 expect(work(b.sourceTitleRu,{manualTitleOverride:true})).toBe(b.sourceTitleRu);
 expect(b.detailsRu).toContain(b.sourceTitleRu);
});
it('keeps physical dimensions, grades and payment units in names and exact product codes in details',()=>{
 const channel=binding('electrical:elecor-60x40-single-route:channel-order');
 expect(row({rowId:channel.rowId,titleRu:channel.sourceTitleRu})).toContain('60 × 40 мм, упаковка 18 м: 9 секций по 2 м');
 expect(details({rowId:channel.rowId,titleRu:channel.sourceTitleRu}).join(' ')).toContain('CKK10-060-040-1-K01-018');
 const fastener=binding('legrand:p31-blind-ep-joint:fastener-order');
 expect(row({rowId:fastener.rowId,titleRu:fastener.sourceTitleRu})).toContain('Болт М6 с гайкой');
 expect(details({rowId:fastener.rowId,titleRu:fastener.sourceTitleRu}).join(' ')).toContain('341895 BTRCC M6');
 expect(row({rowId:fastener.rowId,titleRu:fastener.sourceTitleRu})).toContain('одна сборка');
 const brick=binding('masonry:brick-partition:krer08-02-002-05:brick');
 expect(row({rowId:brick.rowId,titleRu:brick.sourceTitleRu})).toContain('М100, 250 × 120 × 65 мм');
});
it('does not rename a manual row, another row ID, or a replaced product',()=>{
 const b=binding(tp+'ready-mortar-m150-order');
 expect(row({rowId:b.rowId,titleRu:b.sourceTitleRu,manualTitleOverride:true})).toBe(b.sourceTitleRu);
 expect(row({rowId:'another-row',titleRu:b.sourceTitleRu})).toBe(b.sourceTitleRu);
 expect(row({rowId:b.rowId,titleRu:'Мой раствор М200, 0,03 м³'})).toBe('Мой раствор М200, 0,03 м³');
 expect(details({rowId:b.rowId,titleRu:b.sourceTitleRu,manualTitleOverride:true})).toEqual([]);
});
it('keeps selected specifications separate from the concise name through the shared artifact projection',()=>{
 const b=binding(tp+'ready-mortar-m150-order'),spec='Поставка №7: М150, 0,03 м³, артикул EXACT-SKU-150';
 const saved=b.sourceTitleRu+' — '+spec;
 const descriptor={contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:saved,nameRu:b.sourceTitleRu,
  brandAndModelRu:null,specificationRu:spec,detailsRu:['Подтверждённая поставочная спецификация.']};
 const projected=presentation({rowId:b.rowId,titleRu:saved,descriptor});
 expect(projected?.nameRu).toBe(b.nameRu);expect(projected?.specificationRu).toBe(spec);
 const savedRow={row_id:b.rowId,title_ru:saved,ordinal:0,included_in_estimate:true,included_in_procurement:true,
  procurement_eligible:true,ownership_status:'OWNED',calculation_trace:{resourceGraph:{publicResourcePresentationV1:descriptor}}};
 const before=JSON.stringify(savedRow);expect(canonicalArtifactVisibleRowTitle(savedRow)).toBe(b.nameRu);
 expect(canonicalArtifactSpecificationParts(savedRow,{}).flatMap(part=>part.parts)).toContain(spec);expect(JSON.stringify(savedRow)).toBe(before);
 expect(canonicalArtifactVisibleRowTitle({...savedRow,calculation_trace:{...savedRow.calculation_trace,manualTitleOverride:true}})).toBe(saved);
});
it('keeps the six hydraulic obligations visible with concrete public task details',()=>{
 const needs=publicBindings.bindings.filter(x=>x.rowId.startsWith(wp+'open:'));expect(needs).toHaveLength(6);
 for(const b of needs){const concise=simpleBindings.bindings.find(binding=>binding.rowId===b.rowId&&binding.sourceTitleRu===b.sourceTitleRu)!;
  expect(concise).toBeDefined();expect(row({rowId:b.rowId,titleRu:b.sourceTitleRu})).toBe(concise.nameRu);expect(concise.nameRu.length).toBeLessThan(100);
  expect(details({rowId:b.rowId,titleRu:b.sourceTitleRu}).join(' ')).not.toMatch(/exactcatalog|snapshot admission|row_id|canonical-work:/u);}
 expect(row({rowId:wp+'hydraulic-plant-consumed',titleRu:binding(wp+'hydraulic-plant-consumed').sourceTitleRu})).toBe('Установка для гидроиспытания трубопровода');
 expect(row({rowId:tp+'truck5t-hired',titleRu:binding(tp+'truck5t-hired').sourceTitleRu})).toContain('с водителем');
});
it('renames only the exact parameter title, leaving units and unrelated dimensions to their own contracts',()=>{
 const b=publicBindings.parameterBindings.find(x=>x.parameterId==='net_partition_area_m2'&&!('catalogId' in x))!;
 expect(parameter(b.parameterId,b.sourceTitleRu)).toBe(b.nameRu);
 expect(parameter('other-area',b.sourceTitleRu)).toBe(b.sourceTitleRu);
 expect(parameter(b.parameterId,'Площадь армированной перегородки толщиной 250 мм')).toBe('Площадь армированной перегородки толщиной 250 мм');
});

it('scopes the inspected brick questions to their catalog and explains quantities, supplies and references',()=>{
 const catalogId='canonical-work:master:brick_partition_half_unreinforced_upto4m_krer08_02_002_05';
 const fields=publicBindings.parameterBindings.filter(b=>'catalogId' in b&&b.catalogId===catalogId);
 expect(fields).toHaveLength(34);expect(new Set(fields.map(b=>b.parameterId)).size).toBe(33);
 for(const b of fields){
  expect(parameter(b.parameterId,b.sourceTitleRu,{catalogId})).toBe(b.nameRu);
  expect(canonicalPublicEstimateParameterGuideRu(b.parameterId,b.nameRu,{catalogId})).toBe(b.guideRu);
  expect(b.guideRu?.length).toBeGreaterThan(90);
  expect(canonicalPublicEstimateParameterGuideRu(b.parameterId,b.nameRu,{catalogId:'other-physical-work'})).toBeUndefined();
 }
 const timber=fields.find(b=>b.parameterId==='timber_quantum')!;
 expect(parameter(timber.parameterId,timber.sourceTitleRu,{catalogId:'other-physical-work'})).toBe(timber.sourceTitleRu);
 expect(timber.guideRu).toContain('число штук в это поле не вводят');
 expect(fields.find(b=>b.parameterId==='brick_quantum')?.guideRu).toContain('число кирпичей на поддоне');
 expect(fields.find(b=>b.parameterId==='net_area_opening_deduction_reference')?.guideRu).toContain('ссылка на документ');
});

it('distinguishes actual crane choices without overriding an authored contextual label',()=>{
 expect(canonicalEstimateParameterChoiceLabelRu('crane_fulfillment',brickPartitionCraneModesR1.own)).toBe('Своя техника');
 expect(canonicalEstimateParameterChoiceLabelRu('crane_fulfillment',brickPartitionCraneModesR1.hired)).toBe('Аренда техники');
 const {canonicalPublicEstimateChoiceLabelRu:choice}=jest.requireActual('./canonicalPublicEstimateLanguageRu') as typeof import('./canonicalPublicEstimateLanguageRu');
 expect(choice('Аренда крана по моему договору',brickPartitionCraneModesR1.hired)).toBe('Аренда крана по моему договору');
 expect(canonicalEstimateParameterChoiceLabelRu('selected_delivery_selection','NOT_SELECTED')).toBe('Не добавлять отдельную доставку');
});
it('versions new document projections while historical artifact bytes and source titles remain independent',()=>{
 expect(CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).toBe('canonical-professional-pdf.r4-a13-readable-saved-report-template92');
 expect(CANONICAL_PROCUREMENT_GENERATOR_VERSION).toBe('canonical-procurement.r28-public-selected-specification');
 const b=binding(wp+'whole-worker');expect(b.sourceTitleRu).toContain('разряда5,3');expect(b.nameRu).not.toContain('разряда5,3');
 expect(details({rowId:b.rowId,titleRu:b.sourceTitleRu})).toEqual([]);
 expect(b.detailsRu?.join(' ')).toContain('разряда5,3');
});

it.each([
 ['Два слоя CT54 на готовом простом фасаде — шесть существующих типов','Окраска подготовленного цементного фасада в два слоя'],
 ['Окраска простого фасада Ceresit CT54 по готовой цементной штукатурке с готовых лесов, два слоя','Окраска цементной штукатурки фасада в два слоя с готовых лесов'],
 ['Перемешивание готовой CT54','Перемешать готовую фасадную краску'],
 ['Два ручных слоя CT54 — один владелец труда','Нанести фасадную краску в два слоя вручную'],
])('names the saved facade operation without a brand while retaining its scope: %s',(source,name)=>{
 expect(work(source)).toBe(name);expect(work(source+' — 35,5 м²')).toBe(name+' — 35,5 м²');
 expect(work(source,{manualTitleOverride:true})).toBe(source);
 expect(work(source+' с другой технологией')).toBe(source+' с другой технологией');
});

it.each([
 ['q','Площадь работ, м² (CT54 — за вычетом проёмов)','Площадь окраски фасада за вычетом проёмов, м²'],
 ['ct54_15l_stock_cans','Пригодное наличие целых канистр CT54 15л выбранного цвета и партии','Пригодные целые канистры фасадной краски по 15 л выбранного цвета и партии'],
 ['ct54_15l_reserve_cans','Сохраняемый резерв целых канистр CT54 15л','Целые канистры фасадной краски по 15 л, которые оставить в запасе'],
 ['ct54_15l_supplier_can_multiple','Кратность поставщика в канистрах CT54 15л','Кратность поставки фасадной краски в канистрах по 15 л'],
])('names the exact facade measurement while preserving other fields and manual names: %s',(id,source,name)=>{
 expect(parameter(id,source)).toBe(name);
 expect(parameter('another-parameter',source)).toBe(source);
 expect(parameter(id,'Мой выбор: '+source)).toBe('Мой выбор: '+source);
 expect(row({titleRu:source,manualTitleOverride:true})).toBe(source);
 expect(work(source,{manualTitleOverride:true})).toBe(source);
});

it('projects actual saved facade operations into PDF and procurement without altering source rows',async()=>{
 const d=ct54ReadyFacadeDefinitionS2763(),result=await compileCanonicalEstimateCore({operation:'compile',catalogId:'canonical-work:base:facade_interior_facade_paint_apply_standard',
  compilerVersion:'public-facade-operation-regression',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:{...ct54ReadyFacadeControlFactsS2763,selected_paint_can_l:'15',ct54_15l_stock_cans:'0',ct54_15l_reserve_cans:'0',ct54_15l_supplier_can_multiple:'1'},
  confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:d.resources.length,
  hashJson:value=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
 const revision={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',catalog_id:'canonical-work:base:facade_interior_facade_paint_apply_standard',
  checksum_sha256:'a'.repeat(64),row_count:result.rows.length,input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',
  amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds,userParameters:{q:result.parameters.q,
   ct54_15l_stock_cans:'0',ct54_15l_reserve_cans:'0',ct54_15l_supplier_can_multiple:'1'}}}};
 const before=JSON.stringify({revision,rows:result.rows}),needs=canonicalArtifactPreliminaryNeeds(revision),
  pdf=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows,preliminaryNeeds:needs,workTitleRu:'Окраска фасада',
   parameterSchema:d.parameters.map(p=>({parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,
    titleRu:p.title_ru,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,
    visibilityRole:p.truth_metadata.visibility_role,valueSourceRole:p.truth_metadata.value_source_role,
    formulaConsumers:d.formulas.filter(f=>f.input_parameter_ids.includes(p.parameter_id)).map(f=>f.formula_id)})) as CanonicalEstimateCatalogItem['parameterSchema']}),
  procurement=buildCanonicalProcurementProjection({revision,procurementRows:result.rows.filter(r=>r.included_in_procurement),sourceRows:result.rows});
 for(const source of ['Перемешивание готовой CT54','Два ручных слоя CT54 — один владелец труда']){
  const name=work(source);expect(before).toContain(source);expect(pdf.html).toContain(name);expect(pdf.html).not.toContain(source);
  const operations=[...result.rows,...needs].map(r=>(r.calculation_trace as Record<string,unknown>|undefined)?.resourceGraph as Record<string,unknown>|undefined)
   .map(g=>canonicalEstimateOperationReference(g?.operationCompositionV1));
  const operation=operations.find(op=>op?.operationTitleRu===source);expect(operation).toBeDefined();
  expect(canonicalPublicEstimateOperationReferenceRu(operation??null)?.operationTitleRu).toBe(name);
 }
 expect(procurement.operationGroups.length).toBeGreaterThan(0);
 expect(procurement.operationGroups.flatMap(g=>[g.operation.groupTitleRu,g.operation.operationTitleRu]).join(' ')).not.toMatch(/CT54|Ceresit|один владелец/iu);
 expect(procurement.operationGroups.every(g=>g.operation.groupId==='paint:ct54-simple-ready-facade')).toBe(true);
 for(const id of ['q','ct54_15l_stock_cans','ct54_15l_reserve_cans','ct54_15l_supplier_can_multiple']){
  const field=d.parameters.find(p=>p.parameter_id===id)!;
  expect(field.title_ru).toContain('CT54');
  expect(pdf.html).toContain(parameter(id,field.title_ru));
  expect(pdf.html).not.toContain(field.title_ru);
 }
 for(const field of d.parameters.filter(p=>/CT54|Ceresit|tesa/iu.test(p.title_ru))){
  expect(parameter(field.parameter_id,field.title_ru)).not.toMatch(/CT54|Ceresit|tesa/iu);
  expect(parameter(field.parameter_id,'Моё поле: '+field.title_ru)).toBe('Моё поле: '+field.title_ru);
 }
 expect(JSON.stringify({revision,rows:result.rows})).toBe(before);
});

it.each(['CONTROL_ONLY QA exact source-compatible supply, not supplier offer',
 'CONTROL_ONLY QA source-compatible project reference','CONTROL_ONLY QA consignment document R39; not actual shipment',
 'CONTROL_ONLY QA: not an actual contract or supplier order','CONTROL_ONLY-QA-R39',
 'VALIDATION_FIXTURE_ONLY: исходные данные не подтверждены','TEST_ONLY: кирпич М100'])
 ('projects internal example annotations into ordinary Russian in public names and requests: %s',value=>{
 const result=canonicalPublicEstimateTextRu(value);
 expect(result).not.toMatch(/CONTROL_ONLY|VALIDATION_FIXTURE|FIXTURE_ONLY|TEST_ONLY|\bQA\b|source-compatible|supplier offer|not actual/iu);
 expect(result).toContain('Проверочный пример');
 expect(canonicalPublicEstimateRequestTextRu(value)).toBe(result);
 expect(row({titleRu:value,manualTitleOverride:true})).toBe(result);
 expect(work(value,{manualTitleOverride:true})).toBe(result);
});

it('preserves ordinary QA product codes, source ratios and user-authored names',()=>{
 for(const value of ['Кирпич М100, 250 × 120 × 65 мм, артикул QA-100','Раствор 1:3 — EXACT-SKU-150',
  'Моя мембрана LOGICROOF V-RP 1,5 мм']){
  expect(row({titleRu:value,manualTitleOverride:true})).toBe(value);
  expect(work(value,{manualTitleOverride:true})).toBe(value);
 }
});

it('keeps the saved example specification immutable while projecting its name, details and procurement value',()=>{
 const b=binding('masonry:brick-partition:krer08-02-002-05:brick');
 const spec='CONTROL_ONLY QA exact source-compatible supply, not supplier offer';
 const saved={row_id:b.rowId,title_ru:b.sourceTitleRu+' — '+spec,ordinal:0,included_in_estimate:true,
  included_in_procurement:true,procurement_eligible:true,ownership_status:'OWNED',calculation_trace:{resourceGraph:{
   titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — ',titleSpecificationParameterIds:['brick_spec'],
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
    sourceTitleRu:b.sourceTitleRu+' — '+spec,nameRu:b.sourceTitleRu,brandAndModelRu:null,
    specificationRu:spec,detailsRu:['Проверочный пример; проектные данные не подтверждены.']}}}};
 const parameters={brick_spec:spec},before=JSON.stringify({saved,parameters});
 expect(canonicalArtifactVisibleRowTitle(saved,parameters)).toBe(b.nameRu);
 const specifications=canonicalArtifactSpecificationParts(saved,parameters);
 expect(JSON.stringify(specifications)).not.toMatch(/CONTROL_ONLY|\bQA\b|supplier offer/u);
 expect(specifications[0]?.value).toBe('Проверочный пример; поставка не подтверждена');
 expect(specifications.flatMap(s=>s.parts).join(' ')).toContain('поставка не подтверждена');
 expect(JSON.stringify({saved,parameters})).toBe(before);
});

it('keeps the full timber characteristics and selected supply separate from its short saved name',()=>{
 const b=binding('masonry:brick-partition:krer08-02-002-05:timber'),spec='Проверочная поставка: брус по ведомости проекта';
 const saved={row_id:b.rowId,title_ru:b.sourceTitleRu+' — '+spec,ordinal:0,included_in_estimate:true,
  included_in_procurement:true,procurement_eligible:true,ownership_status:'OWNED',calculation_trace:{resourceGraph:{
  titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — ',titleSpecificationParameterIds:['timber_specification']}}};
 const before=JSON.stringify(saved),parameters={timber_specification:spec};
 expect(canonicalArtifactVisibleRowTitle(saved,parameters)).toBe('Обрезной хвойный брус');
 const full=canonicalArtifactSpecificationParts(saved,parameters).flatMap(part=>part.parts);
 expect(full).toContain(spec);expect(full).toContain(b.sourceTitleRu);expect(b.sourceTitleRu).toContain('IVсорта');
 expect(JSON.stringify(saved)).toBe(before);
 expect(canonicalArtifactVisibleRowTitle({...saved,calculation_trace:{...saved.calculation_trace,manualTitleOverride:true}},parameters)).toBe(saved.title_ru);
});

it('names all existing brick resources and open tasks without changing their physical scope',()=>{
 const prefix='masonry:brick-partition:krer08-02-002-05:',brick=publicBindings.bindings.filter(b=>b.rowId.startsWith(prefix));
 expect(brick).toHaveLength(24);
 for(const b of brick){expect(b.nameRu.length).toBeLessThan(100);expect(b.detailsRu?.join(' ')).toContain(b.sourceTitleRu);}
 for(const suffix of ['base-and-dpc','connections-lintels','access-boundary','tools-ppe','curing-protection','quality-control','external-logistics','cleanup-waste']){
  const b=binding(prefix+suffix);expect(canonicalPublicEstimatePendingRowGuideRu({rowId:b.rowId,titleRu:b.sourceTitleRu})).toMatch(/уточняет/u);
 }
 expect(binding(prefix+'crane-hired').nameRu).toContain('с машинистом');
 expect(work('Кладка неармированной перегородки по08-02-002-05')).toBe('Кладка перегородки');
});

it('gives every floor row a concise exact name and explains each pending service',()=>{
 const floor=publicBindings.bindings.filter(b=>b.rowId.startsWith('floor-underlayer:sand:krer11-01-002-01:'));
 expect(floor).toHaveLength(31);
 for(const b of floor){expect(row({rowId:b.rowId,titleRu:b.sourceTitleRu})).toBe(b.nameRu);
  expect(b.nameRu.length).toBeLessThan(80);expect(details({rowId:b.rowId,titleRu:b.sourceTitleRu}).join(' ')).toContain(b.sourceTitleRu);}
 for(const b of floor.filter(b=>b.rowId.includes(':open:'))){
  expect(canonicalPublicEstimatePendingRowGuideRu({rowId:b.rowId,titleRu:b.sourceTitleRu})).toMatch(/уточняет|уточняется/u);
  expect(canonicalPublicEstimatePendingRowGuideRu({rowId:b.rowId,titleRu:'Моя услуга'})).toBeUndefined();
 }
});
it('all floor input questions explain the fact, a safe next step and retain the exact title boundary',()=>{
 const floor=publicBindings.parameterBindings.filter(b=>b.parameterId.startsWith('floor_sand_'));
 expect(floor).toHaveLength(36);
 for(const b of floor){expect(parameter(b.parameterId,b.sourceTitleRu)).toBe(b.nameRu);
  expect(canonicalPublicEstimateParameterGuideRu(b.parameterId,b.nameRu)?.length).toBeGreaterThan(50);
  expect(canonicalPublicEstimateParameterGuideRu(b.parameterId,'Другое поле')).toBeUndefined();
 }
});


it('maps only inspected electrical field labels and exact SKU choices without changing saved values',()=>{
 const d=electricalDefinition(),before=JSON.stringify(d);
 for(const id of ['elecor_fixing_method','elecor_fixing_product_sku']){
  const p=d.parameters.find(p=>p.parameter_id===id)!;
  const b=publicBindings.parameterBindings.find(b=>b.parameterId===id&&b.sourceTitleRu===p.title_ru)!;
  expect(b).toBeDefined();expect(parameter(id,p.title_ru)).toBe(b.nameRu);
  expect(parameter('other-field',p.title_ru)).toBe(p.title_ru);
  expect(parameter(id,'Мой крепёж М8')).toBe('Мой крепёж М8');
 }
 const label='Комплект крепежа: дюбель 6 × 30 и винт 4,5 × 40 мм';
 expect(canonicalEstimateParameterChoiceLabelRu('elecor_fixing_product_sku','535463')).toBe(label);
 expect(canonicalEstimateParameterChoiceLabelRu('other-field','535463')).toBe('535463');
 expect(canonicalEstimateParameterChoiceLabelRu('elecor_fixing_product_sku','535464')).toBe('535464');
 expect(canonicalEstimateParameterChoiceLabelRu('elecor_fixing_product_sku','535463','Мой комплект крепежа')).toBe('Мой комплект крепежа');
 expect(d.parameters.find(p=>p.parameter_id==='elecor_fixing_product_sku')?.constraints_json?.values).toEqual(['535463']);
 expect(JSON.stringify(d)).toBe(before);
});

it('uses exact electrical source choice labels and retains unregistered or edited text',()=>{
 const fitValues=electricalDefinition(undefined,{endcapProjectQuantitySourceOnly:true}).parameters
  .find(p=>p.parameter_id==='elecor_endcap_fit')?.constraints_json?.values;
 if(!Array.isArray(fitValues)||typeof fitValues[0]!=='string')throw Error('TEST_ONLY_EXACT_EXISTING_ENDCAP_FIT');
 const source=[electricalPack.method,electricalPack.skuUnitAcceptance,electricalPack.projectNodeAcceptance,
  electricalPack.publicOwnerSpecificationRu,fitValues[0],socketPublicPack.acceptedQualification];
 const {canonicalPublicEstimateChoiceLabelRu:choice}=jest.requireActual('./canonicalPublicEstimateLanguageRu') as typeof import('./canonicalPublicEstimateLanguageRu');
 for(const value of source){
  const b=publicBindings.choiceBindings.find(b=>b.sourceValue===value)!;expect(b).toBeDefined();
  expect(choice(value)).toBe(b.nameRu);expect(choice('Мой вариант по ведомости',value)).toBe('Мой вариант по ведомости');
  expect(b.nameRu).not.toMatch(/DuoPower|Panhead|535463/u);
 }
 expect(choice('Другое изделие 535464')).toBe('Другое изделие 535464');
 expect(work('Монтаж кабель-канала ELECOR')).toBe('Монтаж кабель-канала');
 expect(work('Монтаж кабель-канала ELECOR',{manualTitleOverride:true})).toBe('Монтаж кабель-канала ELECOR');
});

it('keeps the existing electrical owner name source-bound with manual and replaced products',()=>{
 const r=electricalDefinition().resources.find(r=>r.row_id===electricalOwner)!;
 const descriptor=r.resource_graph.publicResourcePresentationV1,before=JSON.stringify(r);
 const display=presentation({rowId:r.row_id,titleRu:r.title_ru,descriptor});
 expect(display?.nameRu).toContain('дюбель 6 × 30 и винт 4,5 × 40');
 expect(display?.nameRu).not.toMatch(/fischer|DuoPower|Panhead|535463/u);
 expect(display?.specificationRu).toContain('50 дюбелей 6 × 30');
 expect(display?.specificationRu).not.toMatch(/DuoPower|Panhead/u);
 expect(presentation({rowId:r.row_id,titleRu:r.title_ru,descriptor,manualTitleOverride:true})).toBeNull();
 expect(row({rowId:r.row_id,titleRu:'Мой комплект М8',manualTitleOverride:true})).toBe('Мой комплект М8');
 expect(presentation({rowId:r.row_id,titleRu:'Другой крепёж 8 × 60 мм',descriptor})).toBeNull();
 const selected='Подтверждённая поставка: дюбель 6 × 30 мм и винт 4,5 × 40 мм, артикул TEST_ONLY_SKU',
  savedTitle=r.title_ru+' — '+selected,parameters={electrical_selected_specification:selected};
 const appendGraph=bindCanonicalPublicResourceSavedTitleV1({graph:r.resource_graph,sourceTitleRu:r.title_ru,
  savedTitleRu:savedTitle,appendedSpecificationRu:selected,manualTitleOverride:false});
 const appended=presentation({rowId:r.row_id,titleRu:savedTitle,descriptor:appendGraph.publicResourcePresentationV1,
  graph:{...appendGraph,titleSpecificationMode:'APPEND',titleSpecificationParameterIds:['electrical_selected_specification']},parameters});
 expect(appended?.nameRu).toContain('Комплект крепежа');expect(appended?.nameRu).not.toContain('TEST_ONLY_SKU');
 expect(appended?.detailsRu.join(' ')).toContain(selected);
 const replacedTitle='Другой крепёж 8 × 60 мм';
 const replaceGraph=bindCanonicalPublicResourceSavedTitleV1({graph:r.resource_graph,sourceTitleRu:r.title_ru,
  savedTitleRu:replacedTitle,appendedSpecificationRu:null,manualTitleOverride:false});
 expect(replaceGraph).toBe(r.resource_graph);
 expect(presentation({rowId:r.row_id,titleRu:replacedTitle,descriptor:replaceGraph.publicResourcePresentationV1,
  graph:{...replaceGraph,titleSpecificationMode:'REPLACE',titleSpecificationParameterIds:['electrical_selected_specification']},
  parameters:{electrical_selected_specification:replacedTitle}})).toBeNull();
 expect(row({rowId:r.row_id,titleRu:replacedTitle})).toBe(replacedTitle);
 expect(bindCanonicalPublicResourceSavedTitleV1({graph:r.resource_graph,sourceTitleRu:r.title_ru,
  savedTitleRu:'Мой комплект крепежа',appendedSpecificationRu:selected,manualTitleOverride:true})).toBe(r.resource_graph);
 expect(JSON.stringify(r)).toBe(before);
});

it('projects electrical saved quantities through shared operations PDF and procurement without copying owners',async()=>{
 const options={wholeOperationProjectFactsSourceOnly:true} as const,d=electricalDefinition(undefined,options),
  labour='electrical:elecor-60x40-single-route:whole-post:whole-labour';
 const first=(id:string)=>{const values=d.parameters.find(p=>p.parameter_id===id)?.constraints_json?.values;
  if(!Array.isArray(values)||typeof values[0]!=='string')throw Error('TEST_ONLY_ELECTRICAL_EXACT_EXISTING_CHOICE');return values[0];};
 const facts={...electricalFacts(),elecor_whole_post_method:first('elecor_whole_post_method'),
  elecor_whole_post_scope_fit:first('elecor_whole_post_scope_fit'),elecor_whole_post_price_scope:first('elecor_whole_post_price_scope'),
  elecor_whole_post_ppr_reference:'TEST_ONLY existing whole-post fixture, not actual PPR admission',elecor_whole_post_labour_hours:'5.5',
  elecor_whole_post_qa_count:'3',elecor_whole_post_qa_program_reference:'TEST_ONLY programme, not completed tests',
  elecor_whole_post_delivery_trips:'0',elecor_whole_post_waste_trips:'0'};
 const provenance={kind:'manual',reason:'TEST_ONLY saved display quantities and per-unit prices, no source admission'},
  overrides={[electricalOwner]:{unitPrice:'7',provenance},[labour]:{unitPrice:'11',provenance}},
  result=await compileElectrical(facts,overrides,options);
 const revision={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',
  catalog_id:electricalPack.catalogId,checksum_sha256:'a'.repeat(64),row_count:result.rows.length,
  input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',
  amendment_contract:{rowOverrides:overrides,parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
 type ElectricalSavedNamedRow = (typeof result.rows)[number] & Pick<(typeof d.resources)[number], 'title_ru'>;
 const before=JSON.stringify({revision,rows:result.rows}),owner=result.rows.find(r=>r.row_id===electricalOwner)! as ElectricalSavedNamedRow,
  whole=result.rows.find(r=>r.row_id===labour)! as ElectricalSavedNamedRow;
 expect(owner).toMatchObject({quantity:'50',unit_price:'7',amount:'350'});
 expect(whole).toMatchObject({quantity:'5.5',unit_price:'11',amount:'60.5'});
 const sections=canonicalEstimateResourceOperationSections([{rowId:whole.row_id,titleRu:whole.title_ru,
  operation:(whole.calculation_trace as Record<string,unknown>).resourceGraph &&
   ((whole.calculation_trace as Record<string,unknown>).resourceGraph as Record<string,unknown>).operationCompositionV1}]);
 expect(sections.flatMap(s=>s.resourceIds)).toEqual([labour]);
 expect(sections.flatMap(s=>s.sharedResources).map(r=>r.rowId)).toEqual(Array(5).fill(labour));
 const pdf=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows,
  preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:'Монтаж кабель-канала ELECOR'}),
  supply=buildCanonicalProcurementProjection({revision,procurementRows:result.rows.filter(r=>r.included_in_procurement),sourceRows:result.rows});
 const name=row({rowId:owner.row_id,titleRu:owner.title_ru});
 expect(pdf.html).toContain(name);expect(pdf.html).not.toContain('DuoPower');expect(pdf.html).not.toContain('Panhead');
 expect(pdf.html).not.toContain('Монтаж кабель-канала ELECOR');
 expect(supply.rows.filter(r=>r.rowId===electricalOwner)).toHaveLength(1);
 expect(supply.rows.find(r=>r.rowId===electricalOwner)).toMatchObject({titleRu:name,quantity:'50',unitPrice:'7',amount:'350'});
 expect(supply.rows.some(r=>r.rowId===labour)).toBe(false);
 expect(result.rows.filter(r=>r.row_id===labour)).toHaveLength(1);
 expect(canonicalArtifactVisibleRowTitle({...owner,calculation_trace:{...(owner.calculation_trace as Record<string,unknown>),manualTitleOverride:true}},result.parameters)).toBe(owner.title_ru);
 const manualTitle='Мой выбранный комплект крепежа 535463',manual=await compileElectrical(facts,
  {...overrides,[electricalOwner]:{...overrides[electricalOwner],titleRu:manualTitle}},options),
  manualOwner=manual.rows.find(r=>r.row_id===electricalOwner)!;
 expect(manualOwner).toMatchObject({title_ru:manualTitle,quantity:owner.quantity,unit_price:owner.unit_price,amount:owner.amount});
 expect((manualOwner.calculation_trace as Record<string,unknown>).manualTitleOverride).toBe(true);
 expect(canonicalArtifactVisibleRowTitle(manualOwner,manual.parameters)).toBe(manualTitle);
 expect(JSON.stringify({revision,rows:result.rows})).toBe(before);
});


// Exact title observed in the R456 native v2 capture; no new numeric recipe.
it('maps the actual current39 ELECOR work title through the shared binding and preserves user titles',()=>{
 const source='Материалы IEK ELECOR 60×40: прямой участок и крепёж по ППР — частичный состав',
  functional='Материалы для прямого участка кабель-канала 60 × 40 мм и крепёж по ППР';
 expect(publicBindings.workBindings.filter(b=>b.sourceTitleRu===source)).toHaveLength(1);
 expect(work(source)).toBe(functional);expect(work(source+' — 25 м')).toBe(functional+' — 25 м');
 expect(work(source,{manualTitleOverride:true})).toBe(source);
 expect(work('Мой участок: '+source)).toBe('Мой участок: '+source);
 const other=source.replace('60×40','80×40');expect(work(other)).toBe(other);
});

it('projects the current39 functional work title without changing electrical owner quantities prices or saved rows',async()=>{
 const source='Материалы IEK ELECOR 60×40: прямой участок и крепёж по ППР — частичный состав',
  functional='Материалы для прямого участка кабель-канала 60 × 40 мм и крепёж по ППР',
  provenance={kind:'manual',reason:'TEST_ONLY current39 work-title display; no real PPR or source admission'},
  overrides={[electricalOwner]:{unitPrice:'7',provenance}},result=await compileElectrical(electricalFacts(),overrides);
 const revision={id:'TEST_ONLY_CURRENT39_TITLE_REVISION',release_id:'TEST_ONLY_CURRENT39_TITLE_RELEASE',
  catalog_id:electricalPack.catalogId,checksum_sha256:'a'.repeat(64),row_count:result.rows.length,
  input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',
  amendment_contract:{rowOverrides:overrides,parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
 const before=JSON.stringify({revision,rows:result.rows,needs:result.preliminaryNeeds}),owner=result.rows.find(r=>r.row_id===electricalOwner);
 if(!owner||typeof owner.title_ru!=='string')throw Error('TEST_CURRENT39_EXISTING_NAMED_OWNER_REQUIRED');
 expect(owner).toMatchObject({row_id:electricalOwner,unit_id:'pcs',quantity:'50',unit_price:'7',amount:'350'});
 expect(result.rows.filter(r=>r.row_id===electricalOwner)).toHaveLength(1);expect(result.preliminaryNeeds).toHaveLength(7);
 const pdf=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:source}),
  supply=buildCanonicalProcurementProjection({revision,procurementRows:result.rows.filter(r=>r.included_in_procurement),sourceRows:result.rows});
 expect(pdf.html).toContain(functional);expect(pdf.html).not.toContain(source);
 expect(supply.rows.filter(r=>r.rowId===electricalOwner)).toHaveLength(1);
 expect(supply.rows.find(r=>r.rowId===electricalOwner)).toMatchObject({quantity:'50',unitPrice:'7',amount:'350'});
 expect(canonicalArtifactVisibleRowTitle(owner,result.parameters)).toBe(row({rowId:owner.row_id,titleRu:owner.title_ru}));
 expect(JSON.stringify({revision,rows:result.rows,needs:result.preliminaryNeeds})).toBe(before);
});
