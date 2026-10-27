import {isCanonicalAreaVariantV1,canonicalPublicWorkSqlV1,CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1} from './canonicalPublicCatalogVisibilityV1';
describe('public work selection with measured geometry',()=>{
 test.each(['base','master','expanded'])('removes area presets from %s selection',namespace=>{
  for(const size of['small','medium','large'])expect(isCanonicalAreaVariantV1(`canonical-work:${namespace}:wall_plaster_${size}_area`)).toBe(true);
 });
 test('keeps physical and technological conditions rather than matching area words anywhere',()=>{
  for(const id of['canonical-work:base:wall_plaster_standard','canonical-work:base:wall_plaster_wet_zone',
   'canonical-work:master:asphalt_level_small_area_s2716','canonical-work:master:metal_flat_interior_oil_two_coats_ma25_krer15_04_030_02',
   'external-reference:base:wall_small_area'])expect(isCanonicalAreaVariantV1(id)).toBe(false);
 });
 test('applies the policy before group count and pagination',()=>{
  expect(CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1.indexOf(canonicalPublicWorkSqlV1('d'))).toBeLessThan(CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1.indexOf('count(*)over()'));
  expect(CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1.indexOf('count(*)over()')).toBeLessThan(CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1.indexOf('where $3'));
  expect(()=>canonicalPublicWorkSqlV1("d;delete")).toThrow('CANONICAL_CATALOG_SQL_ALIAS_INVALID');
 });
});
