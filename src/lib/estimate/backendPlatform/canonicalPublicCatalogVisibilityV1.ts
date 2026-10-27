/** Selection projection only. Area presets retain their existing retirement rule.
 * Conditional definitions remain in the SAME release as exact internal profiles;
 * public grouping never redirects a compile, revises history or migrates prices. */
export const CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1 = 'single-work-with-internal-conditions-v3';
export const CANONICAL_AREA_VARIANT_ID_PATTERN_V1 = '^canonical-work:[^:]+:.*_(small|medium|large)_area$';
export const CANONICAL_CONDITION_VARIANT_ID_PATTERN_V1 = '^canonical-work:(base|master):.*_(technical_room|access_limited|finish_ready|high_load|commercial|wet_zone|standard|repair)$';
const areaVariant = new RegExp(CANONICAL_AREA_VARIANT_ID_PATTERN_V1, 'u');
const conditionVariant = new RegExp(CANONICAL_CONDITION_VARIANT_ID_PATTERN_V1, 'u');
const conditionSuffix = /_(technical_room|access_limited|finish_ready|high_load|commercial|wet_zone|standard|repair)$/u;
const conditionTitles: Readonly<Record<string, string>> = {
  standard: 'Обычные условия', wet_zone: 'Влажная зона', technical_room: 'Техническое помещение',
  high_load: 'Повышенная нагрузка', repair: 'С ремонтом основания', access_limited: 'Ограниченный доступ',
  finish_ready: 'Чистовая сдача', commercial: 'Коммерческий объект', record_specific: 'Основной вариант',
};

type ReviewedPublicWorkMember = Readonly<{
  workKey: string; choiceRu: string; conditionChoicesRu?: Readonly<Record<string, string>>;
}>;
type ReviewedPublicWorkGroup = Readonly<{
  groupId: string; publicWorkKey: string; publicNameRu: string; members: readonly ReviewedPublicWorkMember[];
}>;
/** Reviewed existing registry relationships, bounded by BOTH group and exact
 * member work key. A group alone is never evidence of the same physical result.
 * No definition, norm, resource, price, unit or object quantity is merged. */
export const CANONICAL_REVIEWED_PUBLIC_WORK_GROUPS_V1: readonly ReviewedPublicWorkGroup[] = [
  { groupId: "wg:base:earthworks_interior_trench_excavate", publicWorkKey: "wg:base:earthworks_interior_trench_excavate",
    publicNameRu: "Разработка траншеи", members: [
      {"workKey": "canonical-work:base:earthworks_interior_trench_excavate", "choiceRu": "Основная технология разработки траншеи"},
      {"workKey": "canonical-work:master:manual_trench_sloped_depth_upto2m_soil1_actual_bank_m3_krer01_02_057_01", "choiceRu": "Ручной способ, откосы, глубина до 2 м, грунт группы 1"},
    ] },
  { groupId: "wg:base:electrical_interior_lighting_install", publicWorkKey: "wg:base:electrical_interior_lighting_install",
    publicNameRu: "Монтаж светильника", members: [
      {"workKey": "canonical-work:base:electrical_interior_lighting_install", "choiceRu": "Основной состав монтажа освещения", "conditionChoicesRu": {"standard": "Накладной светодиодный светильник 36 Вт IP40", "technical_room": "Светодиодная панель 36 Вт, 4000 К, IP40 в решётке 600 × 600 мм", "high_load": "Светодиодная панель 36 Вт, 4000 К, IP40 в решётке 600 × 600 мм", "wet_zone": "Основной состав монтажа освещения"}},
      {"workKey": "canonical-work:master:led_panel_dvo6560_6562_existing_600mm_grid", "choiceRu": "Потолочная панель в готовой решётке 600 × 600 мм"},
    ] },
  { groupId: "wg:base:flooring_interior_baseboard_glue", publicWorkKey: "wg:base:flooring_interior_baseboard_glue",
    publicNameRu: "Приклеивание плинтуса", members: [
      {"workKey": "canonical-work:base:flooring_interior_baseboard_glue", "choiceRu": "Предоставленный плинтус"},
      {"workKey": "canonical-work:master:forbo232_ready_wood_skirting_glue_concrete", "choiceRu": "Готовый деревянный плинтус, приклеивание к бетону"},
    ] },
  { groupId: "wg:base:flooring_interior_subfloor_lay", publicWorkKey: "wg:base:flooring_interior_subfloor_lay",
    publicNameRu: "Устройство основания под напольное покрытие", members: [
      {"workKey": "canonical-work:base:flooring_interior_subfloor_lay", "choiceRu": "Основной состав основания под покрытие"},
      {"workKey": "canonical-work:master:ceresit_cn87_50mm_ready_separation_layer_manual", "choiceRu": "Стяжка 50 мм на готовом разделительном слое, ручной способ, без подогрева"},
    ] },
  { groupId: "wg:base:plaster_paint_interior_wall_plaster_apply", publicWorkKey: "wg:base:plaster_paint_interior_wall_plaster_apply",
    publicNameRu: "Оштукатуривание стен внутри помещения", members: [
      {"workKey": "canonical-work:base:plaster_paint_interior_wall_plaster_apply", "choiceRu": "Основной состав оштукатуривания стен", "conditionChoicesRu": {"standard": "Гипсовая смесь, 15 мм, механизированное нанесение"}},
      {"workKey": "canonical-work:master:ct29_existing_cement_lime_plaster_indoor", "choiceRu": "Готовая цементно-известковая штукатурка внутри помещения"},
      {"workKey": "canonical-work:master:ct29_existing_cement_plaster_indoor", "choiceRu": "Готовая цементная штукатурка внутри помещения"},
      {"workKey": "canonical-work:master:ct29_manual_indoor_prepared_low_absorption_concrete_plaster", "choiceRu": "Готовый бетон с низкой впитываемостью внутри помещения, ручной способ"},
    ] },
  { groupId: "wg:base:tile_stone_interior_ceramic_tile_lay", publicWorkKey: "wg:base:tile_stone_interior_ceramic_tile_lay",
    publicNameRu: "Укладка керамической плитки", members: [
      {"workKey": "canonical-work:base:tile_stone_interior_ceramic_tile_lay", "choiceRu": "Основной состав укладки керамической плитки"},
      {"workKey": "canonical-work:master:ceramic_tile_up_to_10cm_cm11_ct17_indoor_cement_floor", "choiceRu": "Плитка до 10 см, зуб 4 мм, впитывающая цементная стяжка внутри помещения"},
    ] },
  { groupId: "wg:base:tile_stone_interior_tile_floor_grout", publicWorkKey: "wg:base:tile_stone_interior_tile_floor_grout",
    publicNameRu: "Затирка швов плиточного пола", members: [
      {"workKey": "canonical-work:base:tile_stone_interior_tile_floor_grout", "choiceRu": "Основной состав затирки плиточного пола"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_floor_10x10cm_2mm", "choiceRu": "Плитка 10 × 10 см, шов 2 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_floor_10x20cm_3mm", "choiceRu": "Плитка 10 × 20 см, шов 3 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_floor_15x15cm_3mm", "choiceRu": "Плитка 15 × 15 см, шов 3 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_floor_20x20cm_5mm", "choiceRu": "Плитка 20 × 20 см, шов 5 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_floor_5x5cm_2mm", "choiceRu": "Плитка 5 × 5 см, шов 2 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_floor_5x5cm_3mm", "choiceRu": "Плитка 5 × 5 см, шов 3 мм"},
    ] },
  { groupId: "wg:base:tile_stone_interior_tile_wall_grout", publicWorkKey: "wg:base:tile_stone_interior_tile_wall_grout",
    publicNameRu: "Затирка швов плиточной стены", members: [
      {"workKey": "canonical-work:base:tile_stone_interior_tile_wall_grout", "choiceRu": "Основной состав затирки плиточной стены"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_wall_10x10cm_2mm", "choiceRu": "Плитка 10 × 10 см, шов 2 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_wall_10x20cm_3mm", "choiceRu": "Плитка 10 × 20 см, шов 3 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_wall_15x15cm_3mm", "choiceRu": "Плитка 15 × 15 см, шов 3 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_wall_20x20cm_5mm", "choiceRu": "Плитка 20 × 20 см, шов 5 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_wall_5x5cm_2mm", "choiceRu": "Плитка 5 × 5 см, шов 2 мм"},
      {"workKey": "canonical-work:master:ce40_glazed_ceramic_ready_wall_5x5cm_3mm", "choiceRu": "Плитка 5 × 5 см, шов 3 мм"},
    ] },
  { groupId: "wg:expanded:curbs", publicWorkKey: "wg:expanded:curbs",
    publicNameRu: "Установка бортового камня", members: [
      {"workKey": "canonical-work:expanded:curbs", "choiceRu": "Основной состав установки бортового камня"},
      {"workKey": "canonical-work:master:concrete_kerb_install_cement_concrete_pavement", "choiceRu": "Бетонный бортовой камень при цементобетонном покрытии"},
      {"workKey": "canonical-work:master:concrete_kerb_install_other_pavement", "choiceRu": "Бетонный бортовой камень при другом покрытии"},
      {"workKey": "canonical-work:master:granite_kerb_1gp_install_cement_concrete_pavement", "choiceRu": "Гранитный бортовой камень 1ГП при цементобетонном покрытии"},
    ] },
  { groupId: "wg:expanded:road_marking", publicWorkKey: "wg:expanded:road_marking",
    publicNameRu: "Нанесение дорожной разметки", members: [
      {"workKey": "canonical-work:expanded:road_marking", "choiceRu": "Основной состав нанесения разметки"},
      {"workKey": "canonical-work:master:road_marking_continuous_100mm_pf133_darkgrey_actual_line_km_krer27_09_016_01", "choiceRu": "Сплошная линия шириной 100 мм, тёмно-серая эмаль"},
    ] },
  { groupId: "wg:expanded:sidewalks", publicWorkKey: "wg:expanded:sidewalks:tile_laying",
    publicNameRu: "Укладка тротуарной плитки", members: [
      {"workKey": "canonical-work:master:paving_tile_prepared_base_40_pieces_m2_no_cut", "choiceRu": "Готовое основание, плитка 40 шт./м², без резки"},
      {"workKey": "canonical-work:master:paving_tile_prepared_base_55_pieces_m2_no_cut", "choiceRu": "Готовое основание, плитка 55 шт./м², без резки"},
      {"workKey": "canonical-work:master:paving_tile_prepared_base_90_pieces_m2_no_cut", "choiceRu": "Готовое основание, плитка 90 шт./м², без резки"},
    ] },
  { groupId: "putty_ct126_dry_ceiling_s2754", publicWorkKey: "putty_ct126_dry_ceiling_s2754",
    publicNameRu: "Шпаклевание потолка", members: [
      {"workKey": "canonical-work:master:ct126_manual_dry_interior_ct19_ready_smooth_concrete_ceiling_2_10mm", "choiceRu": "Гладкий бетон, ручное нанесение 2–10 мм"},
      {"workKey": "canonical-work:master:ct126_manual_dry_interior_ct7_ready_cement_ceiling_2_10mm", "choiceRu": "Цементная штукатурка, ручное нанесение 2–10 мм"},
      {"workKey": "canonical-work:master:ct126_manual_dry_interior_ct7_ready_cement_lime_ceiling_2_10mm", "choiceRu": "Цементно-известковая штукатурка, ручное нанесение 2–10 мм"},
    ] },
  { groupId: "putty_ct126_dry_wall_s2754", publicWorkKey: "putty_ct126_dry_wall_s2754",
    publicNameRu: "Шпаклевание стен", members: [
      {"workKey": "canonical-work:master:ct126_manual_dry_interior_ct19_ready_smooth_concrete_wall_2_10mm", "choiceRu": "Гладкий бетон, ручное нанесение 2–10 мм"},
      {"workKey": "canonical-work:master:ct126_manual_dry_interior_ct7_ready_cement_lime_wall_2_10mm", "choiceRu": "Цементно-известковая штукатурка, ручное нанесение 2–10 мм"},
      {"workKey": "canonical-work:master:ct126_manual_dry_interior_ct7_ready_cement_wall_2_10mm", "choiceRu": "Цементная штукатурка, ручное нанесение 2–10 мм"},
    ] },
  { groupId: "wg:master:ct29_exterior_existing_mineral_plaster", publicWorkKey: "wg:master:ct29_exterior_existing_mineral_plaster",
    publicNameRu: "Штукатурное выравнивание наружных стен", members: [
      {"workKey": "canonical-work:master:ct29_existing_cement_lime_plaster_exterior", "choiceRu": "Готовая цементно-известковая штукатурка снаружи здания"},
      {"workKey": "canonical-work:master:ct29_existing_cement_plaster_exterior", "choiceRu": "Готовая цементная штукатурка снаружи здания"},
    ] },
  { groupId: "demolition_floor_coverings_krer_4604010_s2754", publicWorkKey: "demolition_floor_coverings_krer_4604010_s2754",
    publicNameRu: "Снятие напольного покрытия", members: [
      {"workKey": "canonical-work:master:demolition_board_floor_covering", "choiceRu": "Дощатое покрытие"},
      {"workKey": "canonical-work:master:demolition_end_grain_wood_block_floor_covering", "choiceRu": "Торцовые деревянные бруски"},
      {"workKey": "canonical-work:master:demolition_metal_plate_1000mm_floor_covering", "choiceRu": "Металлические плиты 100 × 100 см"},
      {"workKey": "canonical-work:master:demolition_metal_plate_300mm_floor_covering", "choiceRu": "Металлические плиты 30 × 30 см"},
      {"workKey": "canonical-work:master:demolition_parquet_floor_covering", "choiceRu": "Паркетное покрытие"},
    ] },
  { groupId: "demolition_concrete_floor_bases_krer4604009_s2754", publicWorkKey: "demolition_concrete_floor_bases_krer4604009_s2754",
    publicNameRu: "Разборка бетонного основания пола", members: [
      {"workKey": "canonical-work:master:demolition_concrete_floor_base_brick_rubble_460400902", "choiceRu": "Бетонное основание на кирпичном щебне"},
      {"workKey": "canonical-work:master:demolition_concrete_floor_base_gravel_460400901", "choiceRu": "Бетонное основание на гравии"},
    ] },
  { groupId: "plumbing_hep2o15_visible_cold_s2754", publicWorkKey: "plumbing_hep2o15_visible_cold_s2754",
    publicNameRu: "Монтаж открытого участка трубопровода холодной воды", members: [
      {"workKey": "canonical-work:master:hep2o15_visible_horizontal_cold_line_two_straight_connectors", "choiceRu": "Диаметр 15 мм, горизонтальный участок, две прямые муфты"},
      {"workKey": "canonical-work:master:hep2o15_visible_vertical_cold_line_two_straight_connectors", "choiceRu": "Диаметр 15 мм, вертикальный участок, две прямые муфты"},
      {"workKey": "canonical-work:master:hep2o22_visible_horizontal_cold_line_two_straight_connectors", "choiceRu": "Диаметр 22 мм, горизонтальный участок, две прямые муфты"},
      {"workKey": "canonical-work:master:hep2o22_visible_vertical_cold_line_two_straight_connectors", "choiceRu": "Диаметр 22 мм, вертикальный участок, две прямые муфты"},
      {"workKey": "canonical-work:master:hep2o28_visible_horizontal_cold_line_two_straight_connectors", "choiceRu": "Диаметр 28 мм, горизонтальный участок, две прямые муфты"},
      {"workKey": "canonical-work:master:hep2o28_visible_vertical_cold_line_two_straight_connectors", "choiceRu": "Диаметр 28 мм, вертикальный участок, две прямые муфты"},
    ] },
  { groupId: "wg:master:pvc_roof_concrete_1_2mm_krer12", publicWorkKey: "wg:master:pvc_roof_concrete_1_2mm_krer12",
    publicNameRu: "Укладка и крепление ПВХ-мембраны толщиной 1,2 мм", members: [
      {"workKey": "canonical-work:master:roof_pvc_1_2mm_concrete_ready_insulation_krer12", "choiceRu": "Готовый утеплитель на бетонном основании, основной состав"},
      {"workKey": "canonical-work:master:roof_pvc_1_2mm_krer12_cleaner_472219_volume", "choiceRu": "Очиститель по объёмному паспорту"},
    ] },
  { groupId: "granite_kerb_1gp_other_270201004_s2758", publicWorkKey: "wg:expanded:curbs",
    publicNameRu: "Установка бортового камня", members: [
      {"workKey": "canonical-work:master:granite_kerb_1gp_install_other_pavement", "choiceRu": "Гранитный бортовой камень 1ГП при другом покрытии"},
    ] },

];
const reviewedPublicWorkMembers = new Map<string, { group: ReviewedPublicWorkGroup; member: ReviewedPublicWorkMember }>();
for (const group of CANONICAL_REVIEWED_PUBLIC_WORK_GROUPS_V1) {
  for (const member of group.members) {
    const key = `${group.groupId}\u001f${member.workKey}`;
    if (reviewedPublicWorkMembers.has(key)) throw new Error('CANONICAL_REVIEWED_PUBLIC_WORK_MEMBER_DUPLICATE');
    reviewedPublicWorkMembers.set(key, { group, member });
  }
}
export function canonicalReviewedPublicWorkV1(catalogId: string, groupId?: string) {
  const workKey = conditionVariant.test(catalogId) ? catalogId.replace(conditionSuffix, '') : catalogId;
  return reviewedPublicWorkMembers.get(`${groupId ?? ''}\u001f${workKey}`) ?? null;
}
function sqlLiteral(value: string): string { return `'${value.replace(/'/gu, "''")}'`; }
const reviewedPublicWorkValuesSql = CANONICAL_REVIEWED_PUBLIC_WORK_GROUPS_V1.flatMap(group =>
  group.members.map(member => `(${[group.groupId, member.workKey, group.publicWorkKey, member.choiceRu].map(sqlLiteral).join(',')})`)).join(',\n');

export function isCanonicalAreaVariantV1(catalogId: string): boolean { return areaVariant.test(catalogId); }
export function assertCanonicalNewWorkCatalogIdV1(catalogId: string): void {
  if (isCanonicalAreaVariantV1(catalogId)) throw new Error('CANONICAL_AREA_CATALOG_VARIANT_RETIRED');
}
function sqlAlias(alias: string): string {
  if (!/^[a-z][a-z0-9_]*$/u.test(alias)) throw new Error('CANONICAL_CATALOG_SQL_ALIAS_INVALID');
  return alias;
}
/** This predicate remains AREA ONLY: publishers must retain conditional profiles. */
export function canonicalPublicWorkSqlV1(alias: string): string {
  return `${sqlAlias(alias)}.catalog_id !~ '${CANONICAL_AREA_VARIANT_ID_PATTERN_V1}'`;
}
export function canonicalPublicWorkKeyV1(catalogId: string, groupId?: string): string {
  return canonicalReviewedPublicWorkV1(catalogId, groupId)?.group.publicWorkKey
    ?? (conditionVariant.test(catalogId) ? catalogId.replace(conditionSuffix, '') : catalogId);
}
export function canonicalPublicConditionIdV1(catalogId: string): string {
  return conditionVariant.test(catalogId) ? catalogId.match(conditionSuffix)![1]! : 'record_specific';
}
export function canonicalPublicWorkKeySqlV1(alias: string): string {
  const id = `${sqlAlias(alias)}.catalog_id`;
  return `case when ${id} ~ '${CANONICAL_CONDITION_VARIANT_ID_PATTERN_V1}' then regexp_replace(${id},'_(technical_room|access_limited|finish_ready|high_load|commercial|wet_zone|standard|repair)$','') else ${id} end`;
}

/** Shared by literal, fuzzy and group routes BEFORE counting or pagination. The
 * complete work/action key and namespace form the default boundary. Only exact
 * reviewed members use a shared existing registry group result. Unit and
 * operation differences belong to the selected profile (no conversions/defaults).
 * Expanded named physical methods such as high_rise/industrial remain distinct. */
export const CANONICAL_PUBLIC_WORK_PROJECTION_CTE_V1 = `
public_work_candidates as materialized(
 select d.*,coalesce(reviewed.public_work_key,${canonicalPublicWorkKeySqlV1('d')}) public_work_key,
  reviewed.choice_ru reviewed_choice_ru,
  case when d.catalog_id ~ '${CANONICAL_CONDITION_VARIANT_ID_PATTERN_V1}'
   then substring(d.catalog_id from '_(technical_room|access_limited|finish_ready|high_load|commercial|wet_zone|standard|repair)$')
   else 'record_specific' end condition_id
 from public.estimate_search_document d
 left join(values ${reviewedPublicWorkValuesSql}) reviewed(group_id,member_work_key,public_work_key,choice_ru)
  on reviewed.group_id=d.group_id and reviewed.member_work_key=${canonicalPublicWorkKeySqlV1('d')}
 where d.search_release_id=$1 and d.adjudication_class='EFFECTIVE_WORK' and d.selectable
  and ${canonicalPublicWorkSqlV1('d')}
),public_work_profile_groups as materialized(
 select public_work_key,
  (array_agg(catalog_id order by (condition_id='standard') desc,catalog_id))[1] public_catalog_id,
  jsonb_agg(jsonb_build_object('catalogId',catalog_id,'definitionVersionId',definition_version_id,
   'definitionReleaseId',definition_release_id,'conditionId',catalog_id,'conditionKind',condition_id,
   'groupId',group_id,'choiceRu',reviewed_choice_ru,'canonicalNameRu',canonical_name_ru,
   'technologyVariant',technology_variant,'primaryUom',primary_uom,'operationKind',operation_kind,
   'publicationState',publication_state,'selectable',selectable)
   order by (condition_id='standard') desc,catalog_id) condition_profiles
 from public_work_candidates group by public_work_key
),public_work_projection as materialized(
 select member.catalog_id member_catalog_id,profile.public_work_key,profile.public_catalog_id,profile.condition_profiles
 from public_work_candidates member join public_work_profile_groups profile using(public_work_key)
)`;

type PublicWorkRow = Record<string, any>;
type PublicAdmission = { status: string; decision: unknown };
/** Fuzzy scoring still uses each original profile's terms. Collapse the sorted
 * scores before hashing/counting/pagination, keeping the best matched profile. */
export function deduplicateCanonicalPublicWorkRowsV1<T extends PublicWorkRow>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter(row => {
    const id = String(row.public_catalog_id ?? row.catalog_id);
    if (seen.has(id)) return false;
    seen.add(id); return true;
  });
}
export function canonicalPublicWorkProfileIdsV1(row: PublicWorkRow): string[] {
  return Array.isArray(row.condition_profiles) ? row.condition_profiles.map((profile: PublicWorkRow) => String(profile.catalogId)) : [];
}
export function canonicalPublicWorkCardMetadataV1(row: PublicWorkRow,
  admissions: ReadonlyMap<string, PublicAdmission>, userCompileAllowed: boolean) {
  const profiles = Array.isArray(row.condition_profiles) ? row.condition_profiles as PublicWorkRow[] : [];
  return {
    publicWorkKey: String(row.public_work_key ?? row.catalog_id),
    publicCatalogId: String(row.public_catalog_id ?? row.catalog_id),
    // A general name/alias match never silently selects a different technology.
    matchedConditionCatalogId: row.exact_catalog_id === true && profiles.some(p => p.catalogId === row.matched_condition_catalog_id)
      ? String(row.matched_condition_catalog_id) : null,
    conditionProfiles: profiles.map(profile => {
      const admission = admissions.get(String(profile.catalogId));
      const conditionKind = String(profile.conditionKind ?? canonicalPublicConditionIdV1(String(profile.catalogId)));
      const reviewed = canonicalReviewedPublicWorkV1(String(profile.catalogId), String(profile.groupId ?? row.group_id ?? ''));
      const choice = reviewed?.member.conditionChoicesRu?.[conditionKind] ?? profile.choiceRu ?? reviewed?.member.choiceRu;
      const condition = conditionTitles[conditionKind] ?? conditionTitles.record_specific!;
      const conditionTitleRu = choice
        ? [choice, !['standard', 'record_specific'].includes(conditionKind) ? condition : null].filter(Boolean).join(' — ')
        : condition;
      const estimateReady = userCompileAllowed && profile.selectable === true && Boolean(profile.definitionVersionId)
        && profile.publicationState === 'ADMITTED_BACKEND' && admission?.status === 'PROFESSIONAL_READY';
      return {
        catalogId: String(profile.catalogId), definitionVersionId: profile.definitionVersionId,
        definitionReleaseId: profile.definitionReleaseId, conditionId: String(profile.catalogId),
        titleRu: String(profile.canonicalNameRu ?? conditionTitleRu),
        conditionTitleRu,
        technologyVariant: profile.technologyVariant, primaryUom: String(profile.primaryUom),
        operationKind: String(profile.operationKind), publicationState: profile.publicationState,
        estimateReady, contentAdmission: admission?.decision ?? null,
        selectableMode: estimateReady ? 'PROFESSIONAL' as const : 'NONE' as const,
        nonselectableReasonRu: estimateReady ? null : 'Этот вариант пока недоступен для расчёта.',
      };
    }),
  };
}
/** Public card only. Exact selected definitions keep their own names/scopes. */
export function canonicalPublicWorkNameV1(name: string, catalogId: string, groupId?: string, publicWorkKey?: string): string {
  const publicGroup = CANONICAL_REVIEWED_PUBLIC_WORK_GROUPS_V1.find(group => group.publicWorkKey === publicWorkKey);
  if (publicGroup) return publicGroup.publicNameRu;
  const reviewed = canonicalReviewedPublicWorkV1(catalogId, groupId);
  if (reviewed) return reviewed.group.publicNameRu;
  if (!conditionVariant.test(catalogId)) return name;
  return name.replace(/\s+(?:в стандартной зоне|во влажной зоне|в техническом помещении|для высокой нагрузки|с локальным ремонтом основания|при ограниченном доступе|под чистовую сдачу|для коммерческого объекта)$/iu, '').trim();
}

export const CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1 = `
with ${CANONICAL_PUBLIC_WORK_PROJECTION_CTE_V1},members as materialized(
 select distinct on(projection.public_catalog_id) r.id search_release_id,r.snapshot_sha256,r.taxonomy_version,r.group_relation_version,
  g.group_id,g.group_name_ru,d.catalog_id,d.definition_version_id,d.definition_release_id,d.canonical_name_ru,
  d.publication_state,d.catalog_origin,d.operation_kind,d.technology_variant,
  projection.public_work_key,projection.public_catalog_id,projection.condition_profiles
 from public.estimate_search_index_release r
 join public.estimate_search_group g on g.search_release_id=r.id
 join public.estimate_search_group_membership m on m.search_release_id=g.search_release_id and m.group_id=g.group_id
 join public_work_projection projection on projection.member_catalog_id=m.catalog_id
 join public.estimate_search_document d on d.search_release_id=r.id and d.catalog_id=projection.public_catalog_id
 where r.id=$1 and g.group_id=$2 and d.adjudication_class='EFFECTIVE_WORK' and d.selectable
  and ${canonicalPublicWorkSqlV1('d')}
 order by projection.public_catalog_id
),numbered as(
 select m.*,count(*)over()member_count,row_number()over(order by catalog_id)-1 ordinal from members m
)
select * from numbered where $3::text is null or catalog_id>$3
order by catalog_id limit least(greatest(coalesce($4::integer,50),1),100)`;
