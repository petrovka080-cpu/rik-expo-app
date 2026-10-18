import { euroflexRecycling50MaterialsS2775Config } from './prepareS2775EuroflexRecycling50Materials';
import { resolveMasterSingleDefinitionBindingRowIds, resolveMasterSingleDefinitionBindingApplicabilityByRowId,
  type MasterSingleDefinitionSuccessorConfig } from './prepareMasterSingleDefinitionSuccessorR1';
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

describe('opt-in per-row applicability within the existing composite locator',()=>{
  const resources=[{row_id:'install',ordinal:0},{row_id:'prep',ordinal:1}];
  const make=():Pick<MasterSingleDefinitionSuccessorConfig,'binding'|'projectSourcePackagePath'>=>({
    binding:{rowId:'prep',additionalRowIds:['install'],applicability:{shared:true}},
  });
  it('keeps legacy shared applicability and does not mutate the source objects',()=>{
    const c=make(),before=JSON.stringify(c);
    const result=resolveMasterSingleDefinitionBindingApplicabilityByRowId(c,resources,['one']);
    expect(Object.keys(result)).toEqual(['install','prep']);
    expect(result.install).toBe(c.binding.applicability);expect(result.prep).toBe(c.binding.applicability);
    expect(JSON.stringify(c)).toBe(before);
  });
  it('persists distinct installation and preparation columns without blending their source volumes',()=>{
    const c=make(),map={install:{exactColumn:'18-03-001-01',sourceVolumeParameterId:'installed_kw'},
      prep:{exactColumn:'18-03-001-04',sourceVolumeParameterId:'prepared_subset_kw'}};
    const result=resolveMasterSingleDefinitionBindingApplicabilityByRowId({...c,binding:{...c.binding,applicabilityByRowId:map}},resources,['one']);
    expect(result).toEqual(map);expect(result.install).not.toHaveProperty('shared');expect(result.prep).not.toHaveProperty('shared');
  });
  it('preserves the legacy single-row path with multiple locators when the opt-in is omitted',()=>{
    const c={binding:{rowId:'legacy',applicability:{legacy:true}},projectSourcePackagePath:'legacy-package'};
    expect(resolveMasterSingleDefinitionBindingApplicabilityByRowId(c,[],['first','second'])).toEqual({legacy:{legacy:true}});
  });
  it.each([
    ['explicit undefined',undefined],['null map',null],['array map',[]],['empty map',{}],
    ['missing preparation row',{install:{exactColumn:'01'}}],
    ['unknown extra row',{install:{exactColumn:'01'},prep:{exactColumn:'04'},extra:{exactColumn:'04'}}],
    ['null row',{install:{exactColumn:'01'},prep:null}],
    ['array row',{install:{exactColumn:'01'},prep:[]}],
    ['empty row',{install:{exactColumn:'01'},prep:{}}],
  ])('rejects %s before a plan can be published',(_label,map)=>{
    const c=make();expect(()=>resolveMasterSingleDefinitionBindingApplicabilityByRowId({
      ...c,binding:{...c.binding,applicabilityByRowId:map as unknown as Record<string,Record<string,unknown>>}},resources,['one'])).toThrow('BINDING_APPLICABILITY');
  });
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

describe('optional captured emitted-source absence in the shared append guard', () => {
  const capturedInput = (): MasterSingleDefinitionAppendGuardInput => ({
    ...input(), config: { ...config, catalogAppend: { ...config.catalogAppend!,
      capturedSourcePreimage: { sourceKey: config.sourceId, expected: null } } },
  });
  const appeared = (artifact_sha256: string | null) => ({
    id: 'source-created-after-capture', source_key: config.sourceId, artifact_sha256,
  });

  it('accepts the exact captured absence at preflight and locked reread', () => {
    const current = capturedInput(), before = snapshot();
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(current, before)).not.toThrow();
    expect(() => assertMasterSingleDefinitionAppendUnchangedR1(current, before, snapshot())).not.toThrow();
  });

  it.each(['a'.repeat(64), 'b'.repeat(64), null])(
    'rejects a source appearing before preflight or locked reread regardless of artifact %s', artifact => {
      const current = capturedInput(), after = { ...snapshot(), source: appeared(artifact) };
      expect(() => assertMasterSingleDefinitionAppendSnapshotR1(current, after))
        .toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');
      expect(() => assertMasterSingleDefinitionAppendUnchangedR1(current, snapshot(), after))
        .toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');
    },
  );

  it('does not substitute matching live preflight/reread tuples for the captured absence', () => {
    const alreadyAppeared = { ...snapshot(), source: appeared('a'.repeat(64)) };
    expect(() => assertMasterSingleDefinitionAppendUnchangedR1(capturedInput(), alreadyAppeared, alreadyAppeared))
      .toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');
  });

  it('requires explicit null from the reader rather than an omitted source result', () => {
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(capturedInput(), { ...snapshot(), source: undefined }))
      .toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');
  });

  const malformedCaptures: Array<[string, unknown]> = [
    ['null', null], ['empty object', {}], ['array', []],
    ['different case', { sourceKey: config.sourceId.toUpperCase(), expected: null }],
    ['empty key', { sourceKey: '', expected: null }],
    ['missing expected null', { sourceKey: config.sourceId, expected: undefined }],
    ['existing preimage unsupported', { sourceKey: config.sourceId, expected: {} }],
    ['boolean expected unsupported', { sourceKey: config.sourceId, expected: false }],
  ];
  it.each(malformedCaptures)('rejects a malformed or differently keyed absence declaration %s', (_label, capture) => {
    // Deliberately bypass the static type to exercise untrusted runtime config shapes.
    const current = { ...input(), config: { ...config, catalogAppend: { ...config.catalogAppend!,
      capturedSourcePreimage: capture } } } as unknown as MasterSingleDefinitionAppendGuardInput;
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(current, snapshot()))
      .toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_INVALID');
  });

  it('enforces captured absence independently of the optional composite artifact gate', () => {
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1({ ...capturedInput(), compositeSourceArtifactSha256: null },
      { ...snapshot(), source: appeared('a'.repeat(64)) })).toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');
  });

  it('preserves legacy identical-artifact source reuse when the new field is omitted', () => {
    const legacy = input(), before = { ...snapshot(), source: appeared('a'.repeat(64)) };
    expect(legacy.config.catalogAppend?.capturedSourcePreimage).toBeUndefined();
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(legacy, before)).not.toThrow();
    expect(() => assertMasterSingleDefinitionAppendUnchangedR1(legacy, before, before)).not.toThrow();
  });

  const readerMock = (getSource: () => ReturnType<typeof appeared> | null) => ({
    query: jest.fn().mockImplementation(async (sql: string, values: unknown[]) => {
      if (sql.startsWith('select * from public.estimate_definition_release')) return { rows: [snapshot().parent] };
      if (sql.startsWith('select * from public.estimate_search_index_release')) return { rows: [snapshot().parentSearch] };
      if (sql.includes('count(*)::int value')) return { rows: [{ value: 0 }] };
      if (sql.startsWith('select id::text,source_key,artifact_sha256')) {
        expect(values).toEqual([config.sourceId]);
        const source = getSource();
        return { rows: source == null ? [] : [source] };
      }
      return { rows: [] };
    }),
  });

  it('uses the actual shared reader and existing locks to reject the same-artifact race before DML', async () => {
    let actual: ReturnType<typeof appeared> | null = null;
    const client = readerMock(() => actual), current = capturedInput();
    const before = await readMasterSingleDefinitionAppendPreconditionsR1(client, current);
    expect(before.source).toBeNull();
    actual = appeared('a'.repeat(64));
    await lockMasterSingleDefinitionAppendPreconditionsR1(client, current);
    await expect(readMasterSingleDefinitionAppendPreconditionsR1(client, current))
      .rejects.toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');
    const calls = client.query.mock.calls;
    expect(calls.filter(call => String(call[0]).startsWith('select id::text,source_key,artifact_sha256'))).toHaveLength(2);
    expect(calls.some(call => String(call[0]).includes('in share row exclusive mode'))).toBe(true);
    expect(calls.every(call => !/^\s*(?:insert|update|delete|begin|commit|rollback)\b/iu.test(String(call[0])))).toBe(true);
  });

  it('rejects an identical-artifact source already present at the first actual reader call', async () => {
    const client = readerMock(() => appeared('a'.repeat(64)));
    await expect(readMasterSingleDefinitionAppendPreconditionsR1(client, capturedInput()))
      .rejects.toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');
  });
});
