import { euroflexRecycling50MaterialsS2775Config } from './prepareS2775EuroflexRecycling50Materials';
import { resolveMasterSingleDefinitionBindingRowIds } from './prepareMasterSingleDefinitionSuccessorR1';
import {
  assertMasterSingleDefinitionAppendParentAnchorR1, assertMasterSingleDefinitionAppendSnapshotR1,
  assertMasterSingleDefinitionAppendUnchangedR1, assertMasterSingleDefinitionCompositeSourceR1,
  lockMasterSingleDefinitionAppendPreconditionsR1, masterSingleDefinitionAppendLockKeysR1,
  readMasterSingleDefinitionAppendPreconditionsR1,
  type MasterSingleDefinitionAppendGuardInput,
} from './masterSingleDefinitionAppendGuardsR1';

const config = euroflexRecycling50MaterialsS2775Config();
const input = (): MasterSingleDefinitionAppendGuardInput => ({ config,
  successorReleaseId: 'test-new-definition-release', successorSearchReleaseId: 'test-new-search-release',
  compositeSourceArtifactSha256: 'a'.repeat(64),
});
const snapshot = () => ({
  parent: { id: config.parentReleaseId, status: 'prepared', activated_at: null,
    definition_count: 10457, source_manifest_sha256: 'b'.repeat(64), sealed_at: '2026-10-15T00:00:00.000Z' },
  parentSearch: { id: config.parentSearchReleaseId, status: 'draft', activated_at: null,
    sealed_at: null, snapshot_sha256: 'c'.repeat(64) },
  parentTargetCount: 0, catalogDefinitionCount: 0, identities: [], parentSearchTargetCount: 0,
  group: null, ordinalCollisionCount: 0, successorReleaseCount: 0, successorSearchReleaseCount: 0, source: null,
});

describe('shared single-definition composite bindings', () => {
  it('preserves the legacy single-row declaration and locator behavior', () => {
    const legacy = { binding: { ...config.binding, additionalRowIds: undefined }, projectSourcePackagePath: 'legacy-package' };
    expect(resolveMasterSingleDefinitionBindingRowIds(legacy, config.resourceDefinitions, ['first', 'second']))
      .toEqual([config.binding.rowId]);
  });

  it('orders every declared composite resource by its persisted physical ordinal', () => {
    expect(resolveMasterSingleDefinitionBindingRowIds(config, [...config.resourceDefinitions].reverse(), ['one-locator']))
      .toEqual([config.binding.rowId, ...config.binding.additionalRowIds!]);
    expect(new Set(resolveMasterSingleDefinitionBindingRowIds(config, config.resourceDefinitions, ['one-locator'])).size).toBe(15);
  });

  const invalidBindings: Array<[readonly string[], string]> = [
    [[], 'COMPOSITE_BINDING_ADDITIONAL_ROWS_REQUIRED'],
    [[''], 'COMPOSITE_BINDING_EMPTY_ROW_ID'],
    [[config.binding.rowId], 'COMPOSITE_BINDING_DUPLICATE_ROW_ID'],
    [['missing-row'], 'COMPOSITE_BINDING_UNKNOWN_ROW_ID'],
  ];
  it.each(invalidBindings)('rejects an invalid independent binding declaration %j', (additionalRowIds, code) => {
    expect(() => resolveMasterSingleDefinitionBindingRowIds({ binding: { ...config.binding, additionalRowIds } },
      config.resourceDefinitions, ['one-locator'])).toThrow(code);
  });

  it.each([0, 2])('rejects %i locators for a composite source', count => {
    const locators = Array.from({ length: count }, (_, index) => `locator-${index}`);
    expect(() => resolveMasterSingleDefinitionBindingRowIds(config, config.resourceDefinitions, locators)).toThrow('COMPOSITE_BINDING_REQUIRES_ONE_LOCATOR');
  });

  it('rejects project-package locators in the new composite mode', () => {
    expect(() => resolveMasterSingleDefinitionBindingRowIds({ ...config, projectSourcePackagePath: 'project-package' },
      config.resourceDefinitions, ['one-locator'])).toThrow('COMPOSITE_BINDING_PROJECT_PACKAGE_UNSUPPORTED');
  });
});

describe('shared append preconditions and immutable composite source', () => {
  it('rechecks the explicitly unique work key through the actual reader without extending legacy append policy', async () => {
    const append = config.catalogAppend!;
    expect(append.requireUniqueWorkKey).toBe(true);
    const query = jest.fn();
    query.mockImplementation(async (sql: string, values: unknown[]) => {
      if (sql.startsWith('select * from public.estimate_definition_release')) return { rows: [snapshot().parent] };
      if (sql.startsWith('select * from public.estimate_search_index_release')) return { rows: [snapshot().parentSearch] };
      if (sql.includes('count(*)::int value')) return { rows: [{ value: 0 }] };
      if (sql.startsWith('select catalog_id,namespace')) {
        expect(sql).toContain('or ($4::boolean and work_key=$5)');
        expect(values).toEqual([config.catalogId, append.identity.namespace, append.identity.sourceIdentity,
          expect.any(Boolean), append.identity.workKey]);
        return { rows: values[3] === true ? [{ catalog_id: 'another-catalog', source_identity: 'another-source', work_key: append.identity.workKey }] : [] };
      }
      return { rows: [] };
    });
    await expect(readMasterSingleDefinitionAppendPreconditionsR1({ query }, input()))
      .rejects.toThrow('APPEND_IDENTITY_OR_SOURCE_IDENTITY_COLLISION');
    const legacyInput = { ...input(), config: { ...config, catalogAppend: { ...append, requireUniqueWorkKey: undefined } } };
    await expect(readMasterSingleDefinitionAppendPreconditionsR1({ query }, legacyInput)).resolves.toMatchObject({ identities: [] });
  });

  it('accepts an absent target in the explicitly created group', () => {
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(input(), snapshot())).not.toThrow();
  });

  const collisions = ['parentTargetCount', 'catalogDefinitionCount', 'parentSearchTargetCount',
    'ordinalCollisionCount', 'successorReleaseCount', 'successorSearchReleaseCount'] as const;
  it.each(collisions)('rejects a new collision in %s', field => {
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(input(), { ...snapshot(), [field]: 1 })).toThrow('STOP_S2775_');
  });

  it('rejects existing catalog or source identities and an existing create-group', () => {
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(input(), { ...snapshot(), identities: [{ catalog_id: 'existing' }] }))
      .toThrow('APPEND_IDENTITY_OR_SOURCE_IDENTITY_COLLISION');
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(input(), { ...snapshot(), group: { group_id: 'existing' } }))
      .toThrow('APPEND_SEARCH_GROUP_ALREADY_EXISTS');
  });

  it.each(['group_name_ru', 'domain_id', 'system_id', 'subsystem_id', 'assembly_id', 'work_family_id', 'breadcrumb'])(
    'requires an exact existing group before joining: %s', field => {
      const append = config.catalogAppend!;
      const placement = { ...append.searchPlacement, groupMode: 'join' as const };
      const current = { ...input(), config: { ...config, catalogAppend: { ...append, searchPlacement: placement } } };
      const group = { group_id: placement.groupId, group_name_ru: placement.groupNameRu,
        domain_id: placement.domainId, system_id: placement.systemId, subsystem_id: placement.subsystemId,
        assembly_id: placement.assemblyId, work_family_id: placement.workFamilyId, breadcrumb: placement.breadcrumb };
      expect(() => assertMasterSingleDefinitionAppendSnapshotR1(current, { ...snapshot(), group })).not.toThrow();
      expect(() => assertMasterSingleDefinitionAppendSnapshotR1(current, { ...snapshot(), group: { ...group, [field]: 'changed' } }))
        .toThrow('APPEND_SEARCH_GROUP_DRIFT');
    },
  );

  it('rejects activated or sealed parent releases', () => {
    const before = snapshot();
    for (const after of [
      { ...before, parent: { ...before.parent, status: 'active' } },
      { ...before, parent: { ...before.parent, activated_at: '2026-10-15T01:00:00Z' } },
      { ...before, parentSearch: { ...before.parentSearch, status: 'active' } },
      { ...before, parentSearch: { ...before.parentSearch, activated_at: '2026-10-15T01:00:00Z' } },
      { ...before, parentSearch: { ...before.parentSearch, sealed_at: '2026-10-15T01:00:00Z' } },
    ]) expect(() => assertMasterSingleDefinitionAppendSnapshotR1(input(), after)).toThrow('APPEND_PARENT_');
  });

  it('binds the preflight to the same parent objects used to calculate inherited counts', () => {
    const before = snapshot();
    expect(() => assertMasterSingleDefinitionAppendParentAnchorR1(input(), before,
      { ...before.parent, definition_count: 10456 }, before.parentSearch)).toThrow('APPEND_PARENT_CHANGED_DURING_PREFLIGHT');
    expect(() => assertMasterSingleDefinitionAppendParentAnchorR1(input(), before,
      { ...before.parent, sealed_at: new Date(before.parent.sealed_at) }, before.parentSearch)).not.toThrow();
  });

  it('rejects parent, search and source tuple changes between preflight and write', () => {
    const before = snapshot();
    for (const after of [
      { ...before, parent: { ...before.parent, definition_count: 10458 } },
      { ...before, parentSearch: { ...before.parentSearch, snapshot_sha256: 'd'.repeat(64) } },
      { ...before, source: { id: 'new', artifact_sha256: 'a'.repeat(64) } },
    ]) expect(() => assertMasterSingleDefinitionAppendUnchangedR1(input(), before, after)).toThrow('APPEND_PREFLIGHT_CHANGED_BEFORE_WRITE');
  });

  it('requires absent or identical composite source bytes before write and identical bytes afterwards', () => {
    const current = input();
    expect(() => assertMasterSingleDefinitionCompositeSourceR1(current, null, 'BEFORE')).not.toThrow();
    expect(() => assertMasterSingleDefinitionCompositeSourceR1(current, { artifact_sha256: 'A'.repeat(64) }, 'BEFORE')).not.toThrow();
    expect(() => assertMasterSingleDefinitionCompositeSourceR1(current, { artifact_sha256: 'a'.repeat(64) }, 'AFTER')).not.toThrow();
    for (const artifact_sha256 of [null, '', 'b'.repeat(64)]) {
      expect(() => assertMasterSingleDefinitionCompositeSourceR1(current, { artifact_sha256 }, 'BEFORE')).toThrow('COMPOSITE_SOURCE_ARTIFACT_IMMUTABLE');
    }
    expect(() => assertMasterSingleDefinitionCompositeSourceR1(current, null, 'AFTER')).toThrow('COMPOSITE_SOURCE_ARTIFACT_PERSISTENCE');
    expect(() => assertMasterSingleDefinitionCompositeSourceR1({ ...current, compositeSourceArtifactSha256: '' }, null, 'BEFORE'))
      .toThrow('COMPOSITE_SOURCE_ARTIFACT_REQUIRED');
  });

  it('enforces the same source bytes for multi-row replacements and leaves legacy single-row mode unchanged', () => {
    const compositeReplacement = { ...input(), config: { ...config, catalogAppend: undefined } };
    expect(() => assertMasterSingleDefinitionCompositeSourceR1(compositeReplacement, { artifact_sha256: 'b'.repeat(64) }, 'BEFORE'))
      .toThrow('COMPOSITE_SOURCE_ARTIFACT_IMMUTABLE');
    expect(() => assertMasterSingleDefinitionCompositeSourceR1({ ...compositeReplacement, compositeSourceArtifactSha256: null },
      { artifact_sha256: 'legacy-value' }, 'BEFORE')).not.toThrow();
  });

  it('locks absent-row predicates in a fixed order without issuing publication DML', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const current = input();
    await lockMasterSingleDefinitionAppendPreconditionsR1(client, current);
    const calls = client.query.mock.calls;
    const keys = masterSingleDefinitionAppendLockKeysR1(current);
    expect(keys).toHaveLength(5);
    expect(keys).toEqual([...keys].sort());
    expect(calls.slice(0, 5).map(call => call[1][0])).toEqual(keys);
    expect(String(calls[5][0])).toMatch(/in share row exclusive mode/iu);
    expect(String(calls[5][0]).match(/public\.estimate_/gu)).toHaveLength(10);
    expect(calls).toHaveLength(10);
    expect(calls.slice(6).every(call => /for update$/iu.test(String(call[0])))).toBe(true);
    expect(calls.every(call => !/^\s*(?:insert|update|delete|begin|commit|rollback)\b/iu.test(String(call[0])))).toBe(true);
  });
});
