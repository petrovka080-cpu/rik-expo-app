import fs from 'node:fs';
import path from 'node:path';
import {
  CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1, CANONICAL_PUBLIC_WORK_PROJECTION_CTE_V1,
  CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1, canonicalPublicWorkKeyV1, canonicalPublicWorkKeySqlV1,
  canonicalPublicConditionIdV1, canonicalPublicWorkCardMetadataV1, canonicalPublicWorkProfileIdsV1,
  canonicalPublicWorkNameV1, deduplicateCanonicalPublicWorkRowsV1, assertCanonicalNewWorkCatalogIdV1,
} from './canonicalPublicCatalogVisibilityV1';
import { CANONICAL_CATALOG_LITERAL_SEARCH_SQL, CANONICAL_CATALOG_RANKING_ALGORITHM } from './catalogLiteralSearchSql';

const root = 'canonical-work:base:ventilation_interior_fan_install';
const standard = `${root}_standard`, wet = `${root}_wet_zone`;
function card() {
  return { catalog_id: standard, public_catalog_id: standard, public_work_key: root,
    condition_profiles: [
      { catalogId: standard, definitionVersionId: 'standard-definition', definitionReleaseId: 'release',
        conditionId: 'standard', primaryUom: 'm', operationKind: 'NEW_INSTALLATION', technologyVariant: 'method-a',
        publicationState: 'ADMITTED_BACKEND', selectable: true },
      { catalogId: wet, definitionVersionId: 'wet-definition', definitionReleaseId: 'release',
        conditionId: 'wet_zone', primaryUom: 'set', operationKind: 'REPAIR', technologyVariant: 'method-b',
        publicationState: 'ADMITTED_BACKEND', selectable: true },
    ] };
}

test('the actual5992source definitions become2048public work keys while all exact profiles survive', () => {
  const source = JSON.parse(fs.readFileSync(path.resolve('data/estimate-catalog/work-items/work-catalog-10000.json'), 'utf8'));
  const before = JSON.stringify(source);
  const groups = new Map<string, string[]>();
  for (const row of source.items) {
    const id = `canonical-work:base:${row.work_key}`;
    const key = canonicalPublicWorkKeyV1(id);
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  expect(source.items).toHaveLength(5992);
  expect(groups.size).toBe(2048);
  expect([...groups.values()].flat()).toHaveLength(5992);
  expect(new Set([...groups.values()].flat()).size).toBe(5992);
  expect([...groups].every(([key, ids]) => ids.includes(`${key}_standard`))).toBe(true);
  expect(JSON.stringify(source)).toBe(before);
});

test('groups registered conditions on the complete action key, preserving namespaces and actual results', () => {
  for (const condition of ['standard', 'wet_zone', 'technical_room', 'high_load', 'repair', 'access_limited', 'finish_ready', 'commercial']) {
    expect(canonicalPublicWorkKeyV1(`${root}_${condition}`)).toBe(root);
    expect(canonicalPublicConditionIdV1(`${root}_${condition}`)).toBe(condition);
    expect(() => assertCanonicalNewWorkCatalogIdV1(`${root}_${condition}`)).not.toThrow();
  }
  expect(canonicalPublicWorkKeyV1('canonical-work:master:ventilation_interior_fan_install_standard')).not.toBe(root);
  expect(canonicalPublicWorkKeyV1('canonical-work:base:ventilation_interior_fan_repair_standard')).not.toBe(root);
  for (const id of ['canonical-work:expanded:facade_insulation_high_rise', 'canonical-work:expanded:pressure_pipeline_industrial',
    'canonical-work:expanded:concrete_repair', 'external-reference:base:fan_install_wet_zone', `${root}_wet_zone_s2716`]) {
    expect(canonicalPublicWorkKeyV1(id)).toBe(id);
  }
  expect(() => canonicalPublicWorkKeySqlV1('d;delete')).toThrow('CANONICAL_CATALOG_SQL_ALIAS_INVALID');
});

test('each selected profile keeps exact definition, unit, operation and its OWN admission', () => {
  const row = card(), before = JSON.stringify(row);
  const standardDecision = { allowed: true, catalogId: standard }, wetDecision = { allowed: false, catalogId: wet };
  const admissions = new Map([
    [standard, { status: 'PROFESSIONAL_READY', decision: standardDecision }],
    [wet, { status: 'QUARANTINED', decision: wetDecision }],
  ]);
  const view = canonicalPublicWorkCardMetadataV1(row, admissions, true);
  expect(canonicalPublicWorkProfileIdsV1(row)).toEqual([standard, wet]);
  expect(view.conditionProfiles[0]).toMatchObject({ catalogId: standard, definitionVersionId: 'standard-definition',
    definitionReleaseId: 'release', primaryUom: 'm', operationKind: 'NEW_INSTALLATION', estimateReady: true });
  expect(view.conditionProfiles[1]).toMatchObject({ catalogId: wet, definitionVersionId: 'wet-definition',
    definitionReleaseId: 'release', primaryUom: 'set', operationKind: 'REPAIR', estimateReady: false, selectableMode: 'NONE' });
  expect(view.conditionProfiles[1]!.contentAdmission).toBe(wetDecision);
  expect(view.conditionProfiles[1]!.contentAdmission).not.toBe(standardDecision);
  expect(canonicalPublicWorkCardMetadataV1(row, admissions, false).conditionProfiles.every(p => !p.estimateReady)).toBe(true);
  expect(canonicalPublicWorkCardMetadataV1(row, new Map(), true).conditionProfiles.every(p => !p.estimateReady)).toBe(true);
  expect(JSON.stringify(row)).toBe(before);
});

test('general or fuzzy matches never auto-pick standard; exact legacy ID selects only that same profile', () => {
  const row = card();
  expect(canonicalPublicWorkCardMetadataV1(row, new Map(), true).matchedConditionCatalogId).toBeNull();
  expect(canonicalPublicWorkCardMetadataV1({ ...row, exact_catalog_id: true, matched_condition_catalog_id: wet }, new Map(), true)
    .matchedConditionCatalogId).toBe(wet);
  expect(canonicalPublicWorkCardMetadataV1({ ...row, exact_catalog_id: false, matched_condition_catalog_id: wet }, new Map(), true)
    .matchedConditionCatalogId).toBeNull();
  expect(canonicalPublicWorkCardMetadataV1({ ...row, exact_catalog_id: true, matched_condition_catalog_id: `${root}_repair` }, new Map(), true)
    .matchedConditionCatalogId).toBeNull();
  expect(canonicalPublicWorkNameV1('Монтаж вентилятора в стандартной зоне', standard)).toBe('Монтаж вентилятора');
  expect(canonicalPublicWorkNameV1('Ремонт бетона', 'canonical-work:expanded:concrete_repair')).toBe('Ремонт бетона');
});

test('fuzzy collapse keeps the best actual profile before totals/hash/cursor and preserves other namespaces', () => {
  const bestWet = { catalog_id: standard, public_catalog_id: standard, source_catalog_id: wet, stable_order_key: '06-001-a' };
  const laterStandard = { ...bestWet, source_catalog_id: standard, stable_order_key: '06-005-a' };
  const master = { catalog_id: 'canonical-work:master:fan_install_standard', stable_order_key: '06-006-b' };
  const ranked = [bestWet, laterStandard, master];
  const visible = deduplicateCanonicalPublicWorkRowsV1(ranked);
  expect(visible).toEqual([bestWet, master]);
  expect(visible[0]).toBe(bestWet);
  expect(visible.filter(row => row.stable_order_key > bestWet.stable_order_key)).toEqual([master]);
  expect(ranked).toHaveLength(3);
});

test('literal/group projection counts public works before pagination and retains child lookup terms', () => {
  expect(CANONICAL_PUBLIC_WORK_PROJECTION_CTE_V1).toContain('group by public_work_key');
  expect(CANONICAL_PUBLIC_WORK_PROJECTION_CTE_V1).toContain("(condition_id='standard') desc,catalog_id");
  expect(CANONICAL_PUBLIC_WORK_PROJECTION_CTE_V1).toContain("'definitionVersionId',definition_version_id");
  const literal = CANONICAL_CATALOG_LITERAL_SEARCH_SQL;
  expect(literal).toContain('from public.estimate_search_document source');
  expect(literal).toContain('projection.member_catalog_id=original.catalog_id');
  expect(literal).toContain('partition by target.catalog_id');
  expect(literal.indexOf('from filtered where resolved_ordinal=1')).toBeLessThan(literal.indexOf('select count(*)::bigint literal_total_count'));
  expect(literal.indexOf('from deduplicated')).toBeLessThan(literal.indexOf('where $7::text'));
  expect(CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1.indexOf('distinct on(projection.public_catalog_id)'))
    .toBeLessThan(CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1.indexOf('count(*)over()'));
  expect(CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1.indexOf('count(*)over()'))
    .toBeLessThan(CANONICAL_PUBLIC_SEARCH_GROUP_SQL_V1.indexOf('where $3::text'));
  expect(CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1).toBe('single-work-with-internal-conditions-v3');
  expect(CANONICAL_CATALOG_RANKING_ALGORITHM).toBe('exact-id-coverage-single-work-conditions-v3');
});

test('the ordinary server applies one projection to fuzzy/group/literal and leaves exact catalog read in place', () => {
  const server = fs.readFileSync(path.resolve('scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts'), 'utf8').replace(/\r\n/gu, '\n');
  expect(server).toContain('const publicRanked = deduplicateCanonicalPublicWorkRowsV1(ranked)');
  expect(server.indexOf('const publicRanked =')).toBeLessThan(server.indexOf('publicRanked.map((row) => [row.catalog_id'));
  expect(server).toContain('fuzzy_total_count: publicRanked.length');
  expect(server).toContain('publicRanked\n    .filter');
  expect(server).toContain('cursor.rankingAlgorithm !== CANONICAL_CATALOG_RANKING_ALGORITHM');
  expect(server).toContain('cursor.catalogVisibilityVersion !== CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1');
  expect(server).toContain('...canonicalPublicWorkProfileIdsV1(row)');
  const direct = server.slice(server.indexOf('if (request.method === "GET" && path.length === 2 && path[0] === "catalog")'));
  expect(direct).toContain('where manifest.catalog_id=$1');
  expect(direct).toContain('[catalogId]');
  expect(direct).not.toContain('canonicalPublicWorkKeyV1(catalogId)');
  expect(server).toContain('catalog_id=any($2::text[]) and adjudication_class=\'EFFECTIVE_WORK\' and selectable and definition_version_id is not null');
  expect(server).toContain('admissions.get(catalogId)?.status !== "PROFESSIONAL_READY"');
});
