import publicBindings from '../../../../data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json';
import {canonicalPublicEstimateWorkTitleRu as work,canonicalPublicEstimateRowNameRu as row,
  canonicalPublicEstimateRowDetailsRu as details,canonicalPublicEstimateParameterTitleRu as parameter} from './canonicalPublicEstimateLanguageRu';
import {canonicalPublicResourceDisplayPresentationV1 as presentation} from './canonicalPublicResourcePresentationV1';
import {canonicalArtifactVisibleRowTitle,canonicalArtifactSpecificationParts,CANONICAL_PROCUREMENT_GENERATOR_VERSION} from './canonicalEstimateArtifactContract';
import {CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION} from './canonicalProfessionalPdf';

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
 for(const b of needs){expect(row({rowId:b.rowId,titleRu:b.sourceTitleRu})).toBe(b.nameRu);expect(b.nameRu.length).toBeLessThan(100);
  expect(details({rowId:b.rowId,titleRu:b.sourceTitleRu}).join(' ')).not.toMatch(/exactcatalog|snapshot admission|row_id|canonical-work:/u);}
 expect(row({rowId:wp+'hydraulic-plant-consumed',titleRu:binding(wp+'hydraulic-plant-consumed').sourceTitleRu})).toContain('без отдельной оплаты');
 expect(row({rowId:tp+'truck5t-hired',titleRu:binding(tp+'truck5t-hired').sourceTitleRu})).toContain('с водителем');
});
it('renames only the exact parameter title, leaving units and unrelated dimensions to their own contracts',()=>{
 const b=publicBindings.parameterBindings.find(x=>x.parameterId==='net_partition_area_m2')!;
 expect(parameter(b.parameterId,b.sourceTitleRu)).toBe(b.nameRu);
 expect(parameter('other-area',b.sourceTitleRu)).toBe(b.sourceTitleRu);
 expect(parameter(b.parameterId,'Площадь армированной перегородки толщиной 250 мм')).toBe('Площадь армированной перегородки толщиной 250 мм');
});
it('versions new document projections while historical artifact bytes and source titles remain independent',()=>{
 expect(CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).toContain('template54');
 expect(CANONICAL_PROCUREMENT_GENERATOR_VERSION).toBe('canonical-procurement.r13-construction-public-names');
 const b=binding(wp+'whole-worker');expect(b.sourceTitleRu).toContain('разряда5,3');expect(b.nameRu).not.toContain('разряда5,3');
 expect(details({rowId:b.rowId,titleRu:b.sourceTitleRu}).join(' ')).toContain('разряда5,3');
});
