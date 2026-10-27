import rawResourceNames from '../../../../data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json';
import {canonicalPublicEstimateWorkTitleRu as workTitle} from './canonicalPublicEstimateLanguageRu';
import {canonicalPublicResourceDisplayPresentationV1 as display} from './canonicalPublicResourcePresentationV1';
import {canonicalArtifactVisibleRowTitle,CANONICAL_PROCUREMENT_GENERATOR_VERSION} from './canonicalEstimateArtifactContract';
import {CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION} from './canonicalProfessionalPdf';
const roofRows=[
 ['roof:torch-two:krer12-002-09:upper_isoplast_ekp_4_5','Материал рулонный кровельный для верхнего слоя, изопласт ЭКП-4.5','Рулонный наплавляемый материал для верхнего слоя кровли'],
 ['roof:torch-two:krer12-002-09:lower_isoplast_epp_4','Материал рулонный кровельный для нижних слоев, изопласт ЭПП-4','Рулонный наплавляемый материал для нижнего слоя кровли'],
 ['roof:valley-torch-two:krer12-005-03:lower_isoplast_epp_4','Материал рулонный кровельный для нижних слоев, изопласт ЭПП-4','Рулонный наплавляемый материал для усиления ендов'],
] as const;
test.each(roofRows)('r52 exact source %s has one functional UI and PDF name', (rowId,titleRu,name)=>{
 const item={rowId,titleRu,descriptor:null};expect(display(item)?.nameRu).toBe(name);
 expect(display(item)?.brandAndModelRu).toBeNull();
 const raw=rawResourceNames.bindings.find(entry=>entry.rowId===rowId&&entry.sourceTitleRu===titleRu);if(!raw)throw Error('EXACT_SOURCE_ENTRY_REQUIRED');expect(raw.brandAndModelRu).toMatch(/Изопласт/u);
 const row={row_id:rowId,title_ru:titleRu,quantity:'41.4',unit_id:'m2',unit_price:null,included_in_estimate:false,included_in_procurement:false};
 const before=JSON.stringify(row);expect(canonicalArtifactVisibleRowTitle(row)).toBe(name);expect(JSON.stringify(row)).toBe(before);
});
test.each(roofRows)('r52 explicit manual title %s retains the saved user wording', (rowId,titleRu)=>{
 expect(display({rowId,titleRu,descriptor:null,manualTitleOverride:true})).toBeNull();
 expect(canonicalArtifactVisibleRowTitle({row_id:rowId,title_ru:titleRu,calculation_trace:{manualTitleOverride:true}})).toBe(titleRu);
});
test.each(roofRows)('r52 another source row %s gains no display authority', (rowId,titleRu)=>{
 expect(display({rowId:'foreign:'+rowId,titleRu,descriptor:null})).toBeNull();
});
test.each(roofRows)('r52 changed source title %s cannot reuse the exact entry', (rowId,titleRu)=>{
 expect(display({rowId,titleRu:titleRu+' — другой неподтверждённый материал',descriptor:null})).toBeNull();
});
test('r52 the ordinary PDF cache version changes when public resource output changes',()=>{
 expect(CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).toBe('canonical-professional-pdf.r4-a13-public-selected-specification-template82');
 expect(CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).not.toBe('canonical-professional-pdf.r4-a13-public-selected-specification-template81');
});

const valleyOperation='Наплавление двух дополнительных слоёв ЭПП-4 в ендовах';
test('r52 exact valley operation has a functional work title',()=>expect(workTitle(valleyOperation)).toBe('Наплавление двух дополнительных слоёв в ендовах'));
test('r52 valley operation retains its ordinary measured suffix',()=>expect(workTitle(valleyOperation+' — 12 м')).toBe('Наплавление двух дополнительных слоёв в ендовах — 12 м'));
test('r52 an explicit user work title remains unchanged',()=>expect(workTitle(valleyOperation,{manualTitleOverride:true})).toBe(valleyOperation));
test('r52 a one-layer operation cannot reuse the two-layer title',()=>{const other=valleyOperation.replace('двух','одного');expect(workTitle(other)).toBe(other);});
test('r52 another layer count has no authority from the exact valley entry',()=>{const other=valleyOperation.replace('двух','трёх');expect(workTitle(other)).toBe(other);});

test('r52 the ordinary procurement cache also versions changed public names',()=>{expect(CANONICAL_PROCUREMENT_GENERATOR_VERSION).toBe('canonical-procurement.r28-public-selected-specification');expect(CANONICAL_PROCUREMENT_GENERATOR_VERSION).not.toBe('canonical-procurement.r27-public-selected-specification');});
