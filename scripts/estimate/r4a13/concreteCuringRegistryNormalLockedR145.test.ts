import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Client} from 'pg';
import consumers from '../../../data/estimate-benchmarks/source-packs/concrete-curing-five-consumers-route-r124.json';
import {concreteCuringRollerCurrentCaptureR108, concreteCuringRollerWholeMasterConfigR108,
  concreteCuringRollerRegistryInputR145, verifyConcreteCuringRollerRetainedConfigR108, concreteCuringIntegratedCurrentOracleR145} from './prepareConcreteCuringRollerWholePostR108';
import {readMasterIntegratedCuringCurrentR145, lockMasterIntegratedCuringCurrentR145,
  masterRetainParentBindingsOptInR1, masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import type {MasterExistingNormativeRegistryReuseR1} from './prepareMasterSingleDefinitionSuccessorR1';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';

const digest = (value: unknown) => createHash('sha256').update(stable(value)).digest('hex');
test('one complete parent per process: same pure reuse contract and real normal/locked zero-DML reads', async () => {
  const sourceRoot = resolve(__dirname, '../../..'), output = process.env.CONCRETE_REGISTRY_R145_OUTPUT;
  assert(output); mkdirSync(output, {recursive: true});
  const save = (name: string, value: unknown) => writeFileSync(resolve(output, name), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  const pointer = JSON.parse(readFileSync('C:/dev/rik-expo-app-r4a5-dc4f0ce7/data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
  assert.equal(pointer.productionAccessed, false);
  let coreEntries = 0;
  const targetKey = process.env.CONCRETE_REGISTRY_R145_CONSUMER_KEY;
  assert(typeof targetKey === 'string' && consumers.entries.some(entry => entry.key === targetKey), 'EXACT_ONE_REGISTERED_CONSUMER_KEY_REQUIRED');
  const selectedConsumers = consumers.entries.filter(entry => entry.key === targetKey);
  assert.equal(selectedConsumers.length, 1);
  const frozenOrigin = concreteCuringRollerCurrentCaptureR108(sourceRoot, selectedConsumers[0]!.catalogId);
  // This is the immutable R124 source-test origin, not current DB membership.
  // The historical search identity is the same one used by the R108 pure unit.
  const context = {sourceRoot, outputRoot: output, releaseId: frozenOrigin.membership.release_id,
    searchReleaseId: '9b042edf-ca06-50f6-969a-556e6d14547a', onCoreEntry: () => {coreEntries++; throw Error('R145_MUST_NOT_RERUN_CORE');}};
  const configs = selectedConsumers.map(entry => concreteCuringRollerWholeMasterConfigR108(context, entry.catalogId));
  const generated = configs.map(config => concreteCuringRollerRegistryInputR145(config));
  for (let i = 1; i < generated.length; i++) {
    assert.deepEqual(generated[i]!.newSource, generated[0]!.newSource);
    assert.deepEqual(generated[i]!.newLocators, generated[0]!.newLocators);
  }
  // Explicit simulation only. This timestamp is NOT a current database capture.
  const testOnlyReuse: MasterExistingNormativeRegistryReuseR1 = {contract: 'master-existing-normative-registry-reuse/r1',
    locatorExcerptHashKind: 'SOURCE_LOCATOR_TEXT_SHA256',
    source: {...generated[0]!.newSource, created_at: '2000-01-01T00:00:00.000001Z'}, locators: generated[0]!.newLocators};
  for (const entry of selectedConsumers) {
    const config = concreteCuringRollerWholeMasterConfigR108({...context, existingNormativeRegistry: testOnlyReuse}, entry.catalogId);
    assert(!Object.hasOwn(config.binding.retainParentBindings!, 'capturedSourcePreimage'));
    assert.deepEqual(config.binding.reuseExistingNormativeRegistry, testOnlyReuse);
    verifyConcreteCuringRollerRetainedConfigR108(config, path => resolve(sourceRoot, path));
  }
  const broken = structuredClone(testOnlyReuse);
  broken.source.metadata.useRestriction = 'unreviewed expansion';
  assert.throws(() => concreteCuringRollerWholeMasterConfigR108({...context, existingNormativeRegistry: broken}), /SOURCE_FACTS_OR_METADATA_DRIFT/);
  const missingLocator = {...testOnlyReuse, locators: []};
  assert.throws(() => concreteCuringRollerWholeMasterConfigR108({...context, existingNormativeRegistry: missingLocator}), /COMPLETE_LOCATOR_SET_REQUIRED/);
  assert.equal(coreEntries, 0);
  save('PURE_REUSE_BEFORE_DATABASE_R145.json', {status: 'PASS_PURE_CONFIG_REUSE_ONLY_NOT_REAL_EXISTING_REGISTRY',
    frozenOriginReleaseId: context.releaseId, frozenOriginSearchReleaseId: context.searchReleaseId,
    currentMembershipVerified: false,
    consumers: configs.length, crossConsumerSourceEquality: 'REUSE_PRIOR_FIVE_PURE_PROOF_NOT_RERUN', simulatedTimestampNotCurrent: true,
    fullRetainedRepresentativeChecks: selectedConsumers.length, malformedDeclarationsRejected: 2, coreEntries: 0,
    allFiveIdentityProofAlreadyPassedAtPriorSourceCut: true});

  // Ordinary new-source admission must still reject an already captured source.
  const duplicateSource={...generated[0]!.config.binding.retainParentBindings!.capturedParent.normativeSources[0]!};
  delete duplicateSource.created_at;
  assert.throws(()=>masterRetainParentBindingsOptInR1({...generated[0]!,newSource:duplicateSource}),/NEW_SOURCE_MUST_BE_DISTINCT_COMPLETE_ROW/);
  const oracle=concreteCuringIntegratedCurrentOracleR145(sourceRoot); // Before connect or any live read.
  assert.equal(selectedConsumers[0]!.catalogId,oracle.membership.catalog_id);
  assert.equal(pointer.definitionReleaseId,oracle.membership.release_id);
  assert.throws(()=>assertMasterIntegratedCuringRawOracleR145({...oracle.rawRows,membership:[]}),/PINNED_RAW_ORACLE_REQUIRED/);
  assert.throws(()=>assertMasterIntegratedCuringRawOracleR145({...oracle.rawRows,resources:[...oracle.rawRows.resources].reverse()}),/PINNED_RAW_ORACLE_REQUIRED/);
  assert.equal(isMasterIntegratedCuringAtomicSqlR1('with arbitrary as (select 1) select * from arbitrary'),false);
  let forbiddenQueries=0;
  const noSql:Pick<Client,'query'>={query:(async()=>{forbiddenQueries++;throw Error('NO_SQL_IN_ORACLE_NEGATIVE');}) as Client['query']};
  const negativeDeadline=new Date(Date.now()+1000).toISOString();
  await assert.rejects(()=>readMasterIntegratedCuringCurrentR145(noSql,{...oracle.rawRows,membership:[]},'NORMAL',negativeDeadline),/PINNED_RAW_ORACLE_REQUIRED/);
  await assert.rejects(()=>lockMasterIntegratedCuringCurrentR145(noSql,{...oracle.rawRows,definition:[]},negativeDeadline),/PINNED_RAW_ORACLE_REQUIRED/);
  await assert.rejects(()=>readMasterIntegratedCuringCurrentR145(noSql,oracle.rawRows,'NORMAL','2000-01-01T00:00:00.000Z'),/DEADLINE/);
  assert.equal(forbiddenQueries,0,'BAD_ORACLE_OR_EXPIRED_READ_MUST_NOT_QUERY');
  const absoluteDeadlineUtc=new Date(Date.now()+100000).toISOString(); // One unchanged finite test window, additionally bounded by the outer owned lease.
  const rawUrl = process.env.ESTIMATE_MIGRATION_DATABASE_URL; assert(rawUrl);
  const url = new URL(rawUrl);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '55432'); assert.equal(url.pathname, '/rik_r4_runtime_b5_v2');
  const client = new Client({connectionString: rawUrl, connectionTimeoutMillis: 5000, application_name: 'gox-root-concrete-normal-locked-r145'});
  // Diagnostic-only exact SQL signature copied from the existing retained reader.
  // No new query, parameter, authority, or parent substitution is introduced.
  const membershipSql = `select row_to_json(t)::text raw from (
    select release_id,catalog_id,definition_version_id,approved_template_baseline_id,definition_hash
    from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2 limit 2)t`;
  const membershipKeys = ['release_id', 'catalog_id', 'definition_version_id', 'approved_template_baseline_id', 'definition_hash'] as const;
  const safeMembership = (value: unknown): Record<string, string> | null => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== membershipKeys.length || !membershipKeys.every(key => Object.hasOwn(row, key))) return null;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
    if (!['release_id', 'definition_version_id', 'approved_template_baseline_id'].every(key => typeof row[key] === 'string' && uuid.test(row[key]))) return null;
    if (row.catalog_id !== selectedConsumers[0]!.catalogId || typeof row.catalog_id !== 'string' || row.catalog_id.length > 256) return null;
    if (typeof row.definition_hash !== 'string' || !/^[0-9a-f]{64}$/u.test(row.definition_hash)) return null;
    return Object.fromEntries(membershipKeys.map(key => [key, row[key] as string]));
  };
  const frozenMembership = safeMembership({release_id: frozenOrigin.membership.release_id,
    catalog_id: selectedConsumers[0]!.catalogId, definition_version_id: frozenOrigin.membership.definition_version_id,
    approved_template_baseline_id: frozenOrigin.membership.approved_template_baseline_id,
    definition_hash: selectedConsumers[0]!.expectedDefinitionSha256});
  let membershipPhase: 'NORMAL' | 'LOCKED' = 'NORMAL';
  const queries: {sqlSha256: string; valuesSha256: string; rowsSha256: string; rows: number}[] = [];
  const q = {query: async (sql: string, values?: unknown[]) => {
    assert(Date.now()<Date.parse(absoluteDeadlineUtc),'INTEGRATED_CURING_TEST_DEADLINE');
    assert(/^(?:select|show|lock\s+table|set\s+local)\b/iu.test(sql.trim())||isMasterIntegratedCuringAtomicSqlR1(sql), 'ONLY_EXISTING_SELECT_SETTINGS_AND_LOCKS_ALLOWED');
    const result = await client.query(sql, values);
    queries.push({sqlSha256: digest(sql), valuesSha256: digest(values ?? []), rowsSha256: digest(result.rows), rows: result.rows.length});
    if (sql === membershipSql) {
      const exactValues = values?.length === 2 && values[0] === pointer.definitionReleaseId && values[1] === selectedConsumers[0]!.catalogId;
      const exactColumn = result.fields.length === 1 && result.fields[0]?.name === 'raw' && result.fields[0]?.dataTypeID === 25;
      const boundedRows = result.rows.length <= 2;
      const observed: Record<string, string>[] = [];
      let safeRows = exactValues && exactColumn && boundedRows;
      if (safeRows) for (const row of result.rows) {
        if (Object.keys(row).length !== 1 || typeof row.raw !== 'string' || Buffer.byteLength(row.raw, 'utf8') > 2048) {safeRows = false; break;}
        let parsed: unknown;
        try {parsed = JSON.parse(row.raw);} catch {safeRows = false; break;}
        const safe = safeMembership(parsed);
        if (!safe) {safeRows = false; break;}
        observed.push(safe);
      }
      save(`MEMBERSHIP_${membershipPhase}_R145.json`, {
        status: 'DIAGNOSTIC_ONLY_NOT_CURRENT_PARENT_ACCEPTANCE',
        sqlSha256: digest(sql), valuesSha256: digest(values ?? []), rowsSha256: digest(result.rows), rowCount: result.rows.length,
        exactValues, exactColumn, boundedRows, safeFiveFieldProjection: safeRows,
        frozenOrigin: frozenMembership,
        observed: safeRows ? observed : [],
        unsafeOrUnexpectedResultOmitted: !safeRows,
        currentMembershipVerified: false, sourceAuthorityGranted: false});
    }
    return result;
  }};
  // Existing readers use only the string SQL overload; q forwards its unchanged arguments to this same client.
  const guardedClient: Pick<Client, 'query'> = {query: q.query as Client['query']};
  const accepted: Record<string, unknown>[] = [];
  let rollback = false;
  try {
    await client.connect();
    for (let i = 0; i < configs.length; i++) {
      const entry=selectedConsumers[i]!;

      await client.query('begin isolation level read committed');
      await q.query("set local timezone='UTC'");await q.query("set local statement_timeout='10000ms'");await q.query("set local lock_timeout='5s'");
      const backend=await q.query("select pg_backend_pid() backend_pid,current_setting('application_name') application_name");
      assert.equal(backend.rows[0]?.application_name,'gox-root-concrete-normal-locked-r145');
      membershipPhase='NORMAL';
      const before=await readMasterIntegratedCuringCurrentR145(guardedClient,oracle.rawRows,'NORMAL',absoluteDeadlineUtc);
      const beforeSha=masterRetainedParentCaptureSha256R1(before.capture);
      assert.equal(beforeSha,oracle.captureSha256);

      await lockMasterIntegratedCuringCurrentR145(guardedClient,oracle.rawRows,absoluteDeadlineUtc);
      membershipPhase='LOCKED';
      const locked=await readMasterIntegratedCuringCurrentR145(guardedClient,oracle.rawRows,'LOCKED',absoluteDeadlineUtc);
      assert.equal(masterRetainedParentCaptureSha256R1(locked.capture),beforeSha);
      assert.deepEqual(locked,before,'NORMAL_LOCKED_WHOLE_ORACLE_UNCHANGED');
      assert.equal(before.sourcePresent,true);assert.equal(locked.sourcePresent,true);
      assert.equal(before.sourceAdmission,false);assert.equal(locked.sourceAdmission,false);

      await client.query('rollback');rollback=true;
      const result={key:entry.key,catalogId:entry.catalogId,currentPointerReleaseId:pointer.definitionReleaseId,
        frozenOriginReleaseId:context.releaseId,frozenOriginSearchReleaseId:context.searchReleaseId,
        actualCurrentMembership:before.membership,lockedCurrentMembership:locked.membership,
        currentMembershipAndFullParentVerified:true,expectedRawFixtureSha256:'86ba91bad54617899e244a2906d5cd5ca71f8fb5d4db35d965ed41b527dd3975',
        captureSha256:beforeSha,rawRowsSha256:before.rawRowsSha256,sourceAlreadyIntegrated:true,newSourceAdmission:false,
        wholeRowsAndMetadataPreserved:true,transactionRolledBack:true,readOnlyTransactionClaim:false,
        full:false,sourceAuthorityGranted:false};
      accepted.push(result); save(entry.key + '_NORMAL_LOCKED_PASS_R145.json', result);
    }
    assert.equal(accepted.length, 1); assert.equal(accepted[0]!.key, targetKey); assert.equal(coreEntries, 0);
    save('FINAL_NORMAL_LOCKED_ACCEPTANCE_R145.json', {status: 'PASS_ONE_EXACT_CONSUMER_REAL_NORMAL_LOCKED_PRECONDITIONS_NOT_PUBLICATION',
      accepted, harnessSettingsQueries: queries, retainedGuardQueriesIncludedInHarnessJournal: true, databaseWrites: 0, publicationAttempted: false, coreEntries: 0,
      realExistingRegistryReuse: 'VERIFIED_ALREADY_INTEGRATED_NOT_NEW_SOURCE_ADMISSION',
      readOnlyTransactionClaim: false, lockOnlyReadCommittedTransactions: true, allTransactionsRolledBack: true,
      wholeFamilyAccepted: false, newFULL: 0});
  } catch (error) {
    try {await client.query('rollback'); rollback = true;} catch {}
    save('FIRST_FAILURE_NORMAL_LOCKED_R145.json', {status: 'NOT_ACCEPTED', error: String((error as Error).message),
      completedConsumers: accepted, queries, rollback, databaseWrites: 0, coreEntries});
    throw error;
  } finally {await client.end();}
}, 110000);

import {isMasterIntegratedCuringAtomicSqlR1,assertMasterIntegratedCuringRawOracleR145} from './masterScopedNormativeRegistryPreimageR1';
