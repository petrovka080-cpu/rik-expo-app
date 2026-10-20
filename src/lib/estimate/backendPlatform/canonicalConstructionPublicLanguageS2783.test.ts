import publicBindings from '../../../../data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json';
import simpleBindings from '../../../../data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json';
import {canonicalPublicEstimateWorkTitleRu as work,canonicalPublicEstimateRowNameRu as row,
  canonicalPublicEstimateRowDetailsRu as details,canonicalPublicEstimateParameterTitleRu as parameter,
  canonicalPublicEstimateParameterGuideRu,canonicalPublicEstimatePendingRowGuideRu,
  canonicalPublicEstimateTextRu,canonicalPublicEstimateRequestTextRu} from './canonicalPublicEstimateLanguageRu';
import {canonicalPublicResourceDisplayPresentationV1 as presentation} from './canonicalPublicResourcePresentationV1';
import {canonicalArtifactVisibleRowTitle,canonicalArtifactSpecificationParts,CANONICAL_PROCUREMENT_GENERATOR_VERSION} from './canonicalEstimateArtifactContract';
import {CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION} from './canonicalProfessionalPdf';
import {canonicalEstimateParameterChoiceLabelRu} from './canonicalEstimateParameterSemantics';
import {brickPartitionCraneModesR1} from '../v4/brickPartitionHalfKrer08Column05R1';

const binding=(rowId:string)=>publicBindings.bindings.find(x=>x.rowId===rowId)!;
const wp='hydrotest:internal-steel:dn50:krer16-005-01:',tp='ceramic-floor:cement-mortar:krer11-01-027-03:';

it.each(publicBindings.workBindings)('uses the exact authored work label and retains its system measure: $sourceTitleRu',b=>{
 expect(work(b.sourceTitleRu)).toBe(b.nameRu);
 expect(work(b.sourceTitleRu+' — 35,5 м²')).toBe(b.nameRu+' — 35,5 м²');
 expect(work('Моя смета: '+b.sourceTitleRu)).toBe('Моя смета: '+b.sourceTitleRu);
 expect(work(b.sourceTitleRu,{manualTitleOverride:true})).toBe(b.sourceTitleRu);
 expect(b.detailsRu).toContain(b.sourceTitleRu);
});
it('keeps exact product marks, dimensions, packaging and payment units in public names',()=>{
 const channel=binding('electrical:elecor-60x40-single-route:channel-order');
 expect(row({rowId:channel.rowId,titleRu:channel.sourceTitleRu})).toContain('60 × 40 мм, CKK10-060-040-1-K01-018: упаковка 18 м, 9 секций по 2 м');
 const fastener=binding('legrand:p31-blind-ep-joint:fastener-order');
 expect(row({rowId:fastener.rowId,titleRu:fastener.sourceTitleRu})).toContain('341895 BTRCC М6');
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
 expect(CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).toContain('template62');
 expect(CANONICAL_PROCUREMENT_GENERATOR_VERSION).toBe('canonical-procurement.r17-simple-grohe-details');
 const b=binding(wp+'whole-worker');expect(b.sourceTitleRu).toContain('разряда5,3');expect(b.nameRu).not.toContain('разряда5,3');
 expect(details({rowId:b.rowId,titleRu:b.sourceTitleRu})).toEqual([]);
 expect(b.detailsRu?.join(' ')).toContain('разряда5,3');
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
