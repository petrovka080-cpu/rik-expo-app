import {
  CANONICAL_REVIEWED_PUBLIC_WORK_GROUPS_V1, CANONICAL_PUBLIC_WORK_PROJECTION_CTE_V1,
  CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1, canonicalPublicWorkKeyV1, canonicalReviewedPublicWorkV1,
  canonicalPublicWorkNameV1, canonicalPublicWorkCardMetadataV1,
} from './canonicalPublicCatalogVisibilityV1';
import { CANONICAL_CATALOG_RANKING_ALGORITHM } from './catalogLiteralSearchSql';

const master = (name: string) => `canonical-work:master:${name}_standard`;
const publicKey = (id: string, group: string) => canonicalPublicWorkKeyV1(id, group);
const groutFloor = 'wg:base:tile_stone_interior_tile_floor_grout';
const groutWall = 'wg:base:tile_stone_interior_tile_wall_grout';
const pipeGroup = 'plumbing_hep2o15_visible_cold_s2754';
const pipeIds = [15, 22, 28].flatMap(diameter => ['horizontal', 'vertical'].map(orientation =>
  master(`hep2o${diameter}_visible_${orientation}_cold_line_two_straight_connectors`)));

function profiles(ids: string[], groupId: string) {
  return { catalog_id: ids[0], group_id: groupId, public_work_key: publicKey(ids[0]!, groupId),
    condition_profiles: ids.map((catalogId, index) => ({
      catalogId, groupId, conditionId: 'standard', conditionKind: 'standard',
      canonicalNameRu: `Exact source Wavin Hep2O ${index}`, definitionVersionId: `definition-${index}`,
      definitionReleaseId: 'release', primaryUom: 'linear_m', operationKind: 'NEW_INSTALLATION',
      publicationState: 'ADMITTED_BACKEND', selectable: true, technologyVariant: `method-${index}`,
    })) };
}

test('size and joint are internal exact floor/wall grout profiles, not twelve public work types', () => {
  const sizes = ['5x5cm_2mm', '5x5cm_3mm', '10x10cm_2mm', '10x20cm_3mm', '15x15cm_3mm', '20x20cm_5mm'];
  for (const [surface, group] of [['floor', groutFloor], ['wall', groutWall]] as const) {
    const ids = sizes.map(size => master(`ce40_glazed_ceramic_ready_${surface}_${size}`));
    expect(new Set(ids.map(id => publicKey(id, group)))).toEqual(new Set([group]));
    const card = profiles(ids, group), before = JSON.stringify(card);
    const view = canonicalPublicWorkCardMetadataV1(card, new Map(), true);
    expect(view.conditionProfiles.map(profile => profile.conditionTitleRu)).toEqual([
      'Плитка 5 × 5 см, шов 2 мм', 'Плитка 5 × 5 см, шов 3 мм', 'Плитка 10 × 10 см, шов 2 мм',
      'Плитка 10 × 20 см, шов 3 мм', 'Плитка 15 × 15 см, шов 3 мм', 'Плитка 20 × 20 см, шов 5 мм',
    ]);
    expect(new Set(view.conditionProfiles.map(profile => profile.conditionId)).size).toBe(6);
    expect(view.conditionProfiles.map(profile => profile.catalogId)).toEqual(ids);
    expect(JSON.stringify(card)).toBe(before);
  }
  expect(groutFloor).not.toBe(groutWall);
});

test('putty substrates share one result per wall or ceiling, retaining the actual substrate choice', () => {
  const wall = 'putty_ct126_dry_wall_s2754', ceiling = 'putty_ct126_dry_ceiling_s2754';
  for (const [surface, group] of [['wall', wall], ['ceiling', ceiling]] as const) {
    const ids = ['ct19_ready_smooth_concrete', 'ct7_ready_cement', 'ct7_ready_cement_lime'].map(base =>
      master(`ct126_manual_dry_interior_${base}_${surface}_2_10mm`));
    expect(new Set(ids.map(id => publicKey(id, group)))).toEqual(new Set([group]));
    const view = canonicalPublicWorkCardMetadataV1(profiles(ids, group), new Map(), true);
    expect(view.conditionProfiles.map(profile => profile.conditionTitleRu)).toEqual([
      'Гладкий бетон, ручное нанесение 2–10 мм', 'Цементная штукатурка, ручное нанесение 2–10 мм',
      'Цементно-известковая штукатурка, ручное нанесение 2–10 мм',
    ]);
    expect(canonicalPublicWorkNameV1('Ceresit CT126 source', ids[0]!, group))
      .toBe(surface === 'wall' ? 'Шпаклевание стен' : 'Шпаклевание потолка');
  }
  expect(wall).not.toBe(ceiling);
});

test('interior and exterior plaster retain separate results while substrate/method stay explicit profiles', () => {
  const indoor = 'wg:base:plaster_paint_interior_wall_plaster_apply';
  const exterior = 'wg:master:ct29_exterior_existing_mineral_plaster';
  const inside = [master('ct29_existing_cement_plaster_indoor'), master('ct29_existing_cement_lime_plaster_indoor'),
    master('ct29_manual_indoor_prepared_low_absorption_concrete_plaster')];
  const outside = [master('ct29_existing_cement_plaster_exterior'), master('ct29_existing_cement_lime_plaster_exterior')];
  expect(new Set(inside.map(id => publicKey(id, indoor)))).toEqual(new Set([indoor]));
  expect(new Set(outside.map(id => publicKey(id, exterior)))).toEqual(new Set([exterior]));
  expect(indoor).not.toBe(exterior);
  expect(canonicalReviewedPublicWorkV1(inside[0]!, exterior)).toBeNull();
});

test('diameter/orientation profiles have unique opaque IDs and brand-free functional labels', () => {
  const row = profiles(pipeIds, pipeGroup), before = JSON.stringify(row);
  const view = canonicalPublicWorkCardMetadataV1(row, new Map(), true);
  expect(new Set(pipeIds.map(id => publicKey(id, pipeGroup)))).toEqual(new Set([pipeGroup]));
  expect(view.conditionProfiles.map(profile => profile.conditionId)).toEqual(pipeIds);
  expect(view.conditionProfiles.map(profile => profile.conditionTitleRu)).toEqual([
    'Диаметр 15 мм, горизонтальный участок, две прямые муфты', 'Диаметр 15 мм, вертикальный участок, две прямые муфты',
    'Диаметр 22 мм, горизонтальный участок, две прямые муфты', 'Диаметр 22 мм, вертикальный участок, две прямые муфты',
    'Диаметр 28 мм, горизонтальный участок, две прямые муфты', 'Диаметр 28 мм, вертикальный участок, две прямые муфты',
  ]);
  expect(view.conditionProfiles.map(profile => profile.titleRu)).toEqual(row.condition_profiles.map(profile => profile.canonicalNameRu));
  expect(view.conditionProfiles.map(profile => profile.definitionVersionId)).toEqual(['definition-0', 'definition-1', 'definition-2', 'definition-3', 'definition-4', 'definition-5']);
  expect(view.conditionProfiles.every(profile => profile.primaryUom === 'linear_m' && !profile.estimateReady)).toBe(true);
  expect(view.matchedConditionCatalogId).toBeNull();
  expect(JSON.stringify(row)).toBe(before);
});

test('the reviewed map requires both exact member key and existing group; unknown future technology stays distinct', () => {
  expect(canonicalReviewedPublicWorkV1(pipeIds[0]!, 'unrelated-group')).toBeNull();
  const newTechnology = master('hep2o99_visible_vertical_cold_line_two_straight_connectors');
  expect(canonicalReviewedPublicWorkV1(newTechnology, pipeGroup)).toBeNull();
  expect(publicKey(newTechnology, pipeGroup)).not.toBe(pipeGroup);
  expect(canonicalPublicWorkNameV1('Future source', newTechnology, pipeGroup)).toBe('Future source');
  expect(CANONICAL_PUBLIC_WORK_PROJECTION_CTE_V1).toContain('reviewed.group_id=d.group_id and reviewed.member_work_key=');
  expect(CANONICAL_PUBLIC_WORK_PROJECTION_CTE_V1).toContain("'conditionId',catalog_id,'conditionKind',condition_id");
});

test('whole sidewalk, tile laying and cutting remain three public results; road and pavement are also distinct', () => {
  const group = 'wg:expanded:sidewalks';
  const whole = 'canonical-work:expanded:sidewalks';
  const cut = 'canonical-work:master:paving_tile_stationary_cut_70mm_actual_linear_m_krer27_07_005_04';
  const formats = [40, 55, 90].map(size => master(`paving_tile_prepared_base_${size}_pieces_m2_no_cut`));
  const keys = [whole, cut, ...formats].map(id => publicKey(id, group));
  expect(keys.slice(0, 2)).toEqual([whole, cut]);
  expect(new Set(keys)).toEqual(new Set([whole, cut, `${group}:tile_laying`]));
  expect(canonicalPublicWorkNameV1('source', formats[0]!, group)).toBe('Укладка тротуарной плитки');
  const asphalt = ['asphalt_concrete_pavement', 'road_construction', 'village_road_construction'].map(name => `canonical-work:expanded:${name}`);
  expect(asphalt.map(id => publicKey(id, 'wg:expanded:asphalt_concrete_pavement_route_family'))).toEqual(asphalt);
});

test('the exact granite other-pavement member joins curbs across its old group without absorbing unrelated members', () => {
  const oldGroup = 'granite_kerb_1gp_other_270201004_s2758';
  const other = master('granite_kerb_1gp_install_other_pavement');
  const cement = master('granite_kerb_1gp_install_cement_concrete_pavement');
  expect(publicKey(other, oldGroup)).toBe('wg:expanded:curbs');
  expect(publicKey(cement, 'wg:expanded:curbs')).toBe('wg:expanded:curbs');
  expect(canonicalReviewedPublicWorkV1(master('some_other_work'), oldGroup)).toBeNull();
  const view = canonicalPublicWorkCardMetadataV1(profiles([other], oldGroup), new Map(), true);
  expect(view.conditionProfiles[0]).toMatchObject({ catalogId: other, conditionId: other,
    conditionTitleRu: 'Гранитный бортовой камень 1ГП при другом покрытии', definitionVersionId: 'definition-0' });
  // An old group link returns the common representative, whose source group can
  // differ. The server-proven public key still gives the correct public name.
  expect(canonicalPublicWorkNameV1('raw source', 'canonical-work:expanded:curbs', oldGroup, 'wg:expanded:curbs'))
    .toBe('Установка бортового камня');
});

test('PVC cleaner is a source/profile choice of the same membrane installation, with exact definitions retained', () => {
  const group = 'wg:master:pvc_roof_concrete_1_2mm_krer12';
  const ids = ['canonical-work:master:roof_pvc_1_2mm_concrete_ready_insulation_krer12',
    'canonical-work:master:roof_pvc_1_2mm_krer12_cleaner_472219_volume'];
  expect(new Set(ids.map(id => publicKey(id, group)))).toEqual(new Set([group]));
  expect(canonicalPublicWorkNameV1('Source EKN', ids[1]!, group)).toBe('Укладка и крепление ПВХ-мембраны толщиной 1,2 мм');
  const view = canonicalPublicWorkCardMetadataV1(profiles(ids, group), new Map(), true);
  expect(view.conditionProfiles.map(profile => profile.conditionId)).toEqual(ids);
  expect(view.conditionProfiles.map(profile => profile.conditionTitleRu)).toEqual([
    'Готовый утеплитель на бетонном основании, основной состав', 'Очиститель по объёмному паспорту',
  ]);
});

test('all reviewed public names and parameter choices are functional, with fresh cursor/cache identities', () => {
  expect(CANONICAL_REVIEWED_PUBLIC_WORK_GROUPS_V1).toHaveLength(19);
  expect(CANONICAL_REVIEWED_PUBLIC_WORK_GROUPS_V1.flatMap(group => group.members)).toHaveLength(61);
  const forbidden = /Ceresit|Wavin|Hep2O|Forbo|Eurocol|ДВО|CE\s*40|CT\s*126|CT\s*29|CN\s*87|CM\s*11|472219/iu;
  for (const group of CANONICAL_REVIEWED_PUBLIC_WORK_GROUPS_V1) {
    expect(group.publicNameRu).not.toMatch(forbidden);
    for (const member of group.members) {
      expect(member.choiceRu.trim()).not.toBe(''); expect(member.choiceRu).not.toMatch(forbidden);
      for (const choice of Object.values(member.conditionChoicesRu ?? {})) expect(choice).not.toMatch(forbidden);
    }
  }
  expect(CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1).toBe('single-work-with-internal-conditions-v3');
  expect(CANONICAL_CATALOG_RANKING_ALGORITHM).toBe('exact-id-coverage-single-work-conditions-v3');
});
