import bindings from '../../data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json';
import {ct29ExistingMineralGeometryPackR1,ct29ExistingMineralPrefixS2754} from '../../src/lib/estimate/v4/ct29ExistingMineralSeriesS2754';
import {buildCt29IndoorGeometryDefinitionR1} from '../../src/lib/estimate/v4/ct29IndoorPlasterS2754';
import {canonicalPublicResourceDisplayPresentationV1 as display} from '../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';

const definition=buildCt29IndoorGeometryDefinitionR1(ct29ExistingMineralGeometryPackR1(1),ct29ExistingMineralPrefixS2754(1)),prefix='plaster:ct29-existing:cement-lime-indoor:';
test('all19 ordinaryCT29 rows have exact consumer names without printed norms, recipes or source locators',()=>{
 const before=JSON.stringify(definition),authored=bindings.bindings.filter(binding=>binding.rowId.startsWith(prefix));
 expect(authored).toHaveLength(19);
 for(const row of definition.resources){
  const visible=display({rowId:row.row_id,titleRu:row.title_ru,descriptor:row.resource_graph.publicResourcePresentationV1})!;
  expect(visible).not.toBeNull();
  expect(visible.sourceTitleRu).toBe(row.title_ru);
  expect(visible.nameRu).toBe(authored.find(binding=>binding.rowId===row.row_id)!.nameRu);
  expect([visible.nameRu,...visible.detailsRu].join(' ')).not.toMatch(/Норматив|КРЕР|разряд|1\.8|5\.7|6\.2|PDF|§|net|рецепт/iu);
 }
 expect(display({rowId:prefix+'labor',titleRu:definition.resources.find(row=>row.row_id===prefix+'labor')!.title_ru,
  descriptor:definition.resources.find(row=>row.row_id===prefix+'labor')!.resource_graph.publicResourcePresentationV1})!.nameRu)
  .toBe('Работа штукатура с обычным инвентарём');
 expect(JSON.stringify(definition)).toBe(before);
});
test('exact wording cannot overwrite a user title or borrow a different resource specification',()=>{
 const row=definition.resources.find(resource=>resource.row_id===prefix+'mixer')!;
 expect(display({rowId:row.row_id,titleRu:'Мой миксер',descriptor:row.resource_graph.publicResourcePresentationV1,manualTitleOverride:true})).toBeNull();
 expect(display({rowId:row.row_id,titleRu:'Другая модель',descriptor:row.resource_graph.publicResourcePresentationV1})).toBeNull();
 expect(display({rowId:row.row_id,titleRu:row.title_ru,descriptor:{nameRu:'Broken'}})).toBeNull();
 expect(row.source_metadata?.normativeTrace).toBeTruthy();
});
