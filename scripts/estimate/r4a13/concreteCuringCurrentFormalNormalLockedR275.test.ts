import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Client} from 'pg';
import consumers from '../../../data/estimate-benchmarks/source-packs/concrete-curing-five-consumers-route-r124.json';
import {concreteCuringRollerCurrentCaptureR108, concreteCuringRollerWholeMasterConfigR108,
  concreteCuringRollerRegistryInputR145, verifyConcreteCuringRollerRetainedConfigR108} from './prepareConcreteCuringRollerWholePostR108';
import {readMasterRetainedBindingPreconditionsR1, lockMasterRetainedBindingPreconditionsR1,
  assertMasterRetainedBindingPreflightUnchangedR1, masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import type {MasterExistingNormativeRegistryReuseR1} from './prepareMasterSingleDefinitionSuccessorR1';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';

import {captureMasterScopedNormativeRegistryPreimageR1, resolveMasterScopedNormativeRegistryOptInR1,
  readMasterScopedNormativeRegistryPreconditionsR1, assertMasterScopedNormativeRegistryUnchangedR1}
  from './masterScopedNormativeRegistryPreimageR1';

const digest = (value: unknown) => createHash('sha256').update(stable(value)).digest('hex');
test('one current curing parent and genuine repeated formal registry capture retain normal and locked zero-DML guards', async () => {
  const sourceRoot = resolve(__dirname, '../../..'), output = process.env.CONCRETE_REGISTRY_R275_OUTPUT;
  assert(output); mkdirSync(output, {recursive: true});
  const save = (name: string, value: unknown) => writeFileSync(resolve(output, name), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  const pointer = JSON.parse(readFileSync('C:/dev/rik-expo-app-r4a5-dc4f0ce7/data/estimate-benchmarks/r568-local-developer-canonical-release.json', 'utf8'));
  assert.equal(pointer.productionAccessed, false);
  let coreEntries = 0;
  const context = {sourceRoot, outputRoot: output, releaseId: String(pointer.definitionReleaseId),
    searchReleaseId: String(pointer.searchReleaseId), onCoreEntry: () => {coreEntries++; throw Error('R275_MUST_NOT_RERUN_ACCEPTED_32_CORE');}};
  const targetKey = process.env.CONCRETE_REGISTRY_R275_CONSUMER_KEY;
  assert(typeof targetKey === 'string' && ['foundation-slab','strip-foundation','beam','column'].includes(targetKey) && consumers.entries.some(entry => entry.key === targetKey), 'EXACT_ONE_REGISTERED_CONSUMER_KEY_REQUIRED');
  const selectedConsumers = consumers.entries.filter(entry => entry.key === targetKey);
  assert.equal(selectedConsumers.length, 1);
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
  save('PURE_REUSE_BEFORE_DATABASE_R275.json', {status: 'PASS_PURE_CONFIG_REUSE_ONLY_NOT_REAL_EXISTING_REGISTRY',
    consumers: configs.length, crossConsumerSourceEquality: 'REUSE_PRIOR_FIVE_PURE_PROOF_NOT_RERUN', simulatedTimestampNotCurrent: true,
    fullRetainedRepresentativeChecks: selectedConsumers.length, malformedDeclarationsRejected: 2, coreEntries: 0,
    allFiveIdentityProofAlreadyPassedAtPriorSourceCut: true});
  const rawUrl = process.env.ESTIMATE_MIGRATION_DATABASE_URL; assert(rawUrl);
  const url = new URL(rawUrl);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '55432'); assert.equal(url.pathname, '/rik_r4_runtime_b5_v2');
  const client = new Client({connectionString: rawUrl, connectionTimeoutMillis: 5000, application_name: 'gox-root-curing-formal-normal-locked-r275'});
  const queries: {sqlSha256: string; valuesSha256: string; rowsSha256: string; rows: number}[] = [];
  const q = {query: async (sql: string, values?: unknown[]) => {
    assert(/^(?:select|show|lock\s+table|set\s+local)\b/iu.test(sql.trim()), 'ONLY_EXISTING_SELECT_SETTINGS_AND_LOCKS_ALLOWED');
    const result = await client.query(sql, values);
    queries.push({sqlSha256: digest(sql), valuesSha256: digest(values ?? []), rowsSha256: digest(result.rows), rows: result.rows.length});
    return result;
  }};
  const accepted: Record<string, unknown>[] = [];
  let rollback = false;
  try {
    await client.connect();
    for (let i = 0; i < configs.length; i++) {
      const baseConfig=configs[i]!, baseInput=generated[i]!, entry=selectedConsumers[i]!;
      const formalInput={...baseInput,config:baseConfig};
      await client.query('begin isolation level repeatable read read only');
      await q.query("set local timezone='UTC'");await q.query("set local statement_timeout='10000ms'");
      const firstFormal=await captureMasterScopedNormativeRegistryPreimageR1(client,formalInput);
      save('FORMAL_FIRST_CAPTURE_R275.json',firstFormal);
      const secondFormal=await captureMasterScopedNormativeRegistryPreimageR1(client,formalInput);
      save('FORMAL_SECOND_CAPTURE_R275.json',secondFormal);
      assert.deepEqual(firstFormal,secondFormal,'SAME_RR_FULL_PG_RAW_SCOPED_CAPTURE_TWICE');
      await client.query('rollback');rollback=true;
      const config={...baseConfig,capturedScopedNormativeRegistry:firstFormal};
      const managedInput=concreteCuringRollerRegistryInputR145(config);
      const input={...managedInput,config};
      const resolvedScoped=resolveMasterScopedNormativeRegistryOptInR1(input);assert(resolvedScoped,'REAL_FORMAL_CAPTURE_OPT_IN_REQUIRED');
      const expected = concreteCuringRollerCurrentCaptureR108(sourceRoot, entry.catalogId).capture;
      await client.query('begin isolation level read committed');
      await q.query("set local timezone='UTC'"); await q.query("set local statement_timeout='10000ms'");
      await q.query("set local lock_timeout='5s'");
      const backend = await q.query("select pg_backend_pid() backend_pid,current_setting('application_name') application_name");
      assert.equal(backend.rows[0]?.application_name, 'gox-root-curing-formal-normal-locked-r275');
      save('00_OWNED_SERVER_READ_SESSION_R275.json', {key: entry.key, ...backend.rows[0], atUtc: new Date().toISOString()});
      save('01_BEFORE_NORMAL_R275.json', {key: entry.key, atUtc: new Date().toISOString()});
      const scopedBefore=await readMasterScopedNormativeRegistryPreconditionsR1(client,resolvedScoped,'BEFORE');
      save('FORMAL_NORMAL_BEFORE_R275.json',scopedBefore);
      const before = await readMasterRetainedBindingPreconditionsR1(client, input);
      const beforeSha = masterRetainedParentCaptureSha256R1(before.capture);
      assert.equal(beforeSha, masterRetainedParentCaptureSha256R1(expected));
      save('02_AFTER_NORMAL_BEFORE_LOCK_R275.json', {key: entry.key, captureSha256: beforeSha, atUtc: new Date().toISOString()});
      await lockMasterRetainedBindingPreconditionsR1(client, input);
      save('03_LOCKED_BEFORE_REREAD_R275.json', {key: entry.key, atUtc: new Date().toISOString()});
      const scopedLocked=await readMasterScopedNormativeRegistryPreconditionsR1(client,resolvedScoped,'LOCKED_BEFORE');
      save('FORMAL_LOCKED_BEFORE_R275.json',scopedLocked);
      assertMasterScopedNormativeRegistryUnchangedR1(resolvedScoped,scopedBefore,scopedLocked);
      const locked = await readMasterRetainedBindingPreconditionsR1(client, input);
      save('04_AFTER_LOCKED_REREAD_R275.json', {key: entry.key, atUtc: new Date().toISOString()});
      assertMasterRetainedBindingPreflightUnchangedR1(input, before, locked);
      assert.equal(masterRetainedParentCaptureSha256R1(locked.capture), beforeSha);
      assert.equal(before.newSources.length, 0); assert.equal(locked.newSources.length, 0);
      assert.equal(before.newLocators.length, 0); assert.equal(locked.newLocators.length, 0);
      await client.query('rollback'); rollback = true;
      const result = {key: entry.key, catalogId: entry.catalogId, currentPointerReleaseId: config.parentReleaseId,
        captureSha256: beforeSha, normalSnapshotSha256: digest(before), lockedSnapshotSha256: digest(locked),
        oldSourceArrays: Object.keys(before.capture.baseline.normative_source_ids).length,
        oldBindings: before.capture.bindings.length, currentNewRegistryAbsent: true,
        wholeRowsAndMetadataPreserved: true, transactionRolledBack: true,
        genuineRepeatedFormalCaptureSha256:firstFormal.captureSha256,
        exactScopedRawSourceRows:firstFormal.sourceRows.length,exactScopedRawLocatorRows:firstFormal.locatorRows.length,
        sameFormalNormalLockedRawScope:true,formalCaptureProjection:firstFormal.projection,sourceAuthorityGranted:false};
      accepted.push(result); save(entry.key + '_NORMAL_LOCKED_PASS_R275.json', result);
    }
    assert.equal(accepted.length, 1); assert.equal(accepted[0]!.key, targetKey); assert.equal(coreEntries, 0);
    save('FINAL_NORMAL_LOCKED_ACCEPTANCE_R275.json', {status: 'PASS_CURRENT_EXACT_CONSUMER_FORMAL_SCOPE_AND_NORMAL_LOCKED_PRECONDITIONS_NOT_PUBLICATION',
      accepted, harnessSettingsQueries: queries, existingGuardQueriesNotIncludedInHarnessJournal: true, databaseWrites: 0, publicationAttempted: false, coreEntries: 0,
      realExistingRegistryReuse: 'UNRUN_UNTIL_FIRST_PUBLICATION_AND_FRESH_FULL_REGISTRY_CAPTURE',
      readOnlyTransactionClaim: false, lockOnlyReadCommittedTransactions: true, allTransactionsRolledBack: true,
      wholeFamilyAccepted: false, newFULL: 0});
  } catch (error) {
    try {await client.query('rollback'); rollback = true;} catch {}
    save('FIRST_FAILURE_NORMAL_LOCKED_R275.json', {status: 'NOT_ACCEPTED', error: String((error as Error).message),
      completedConsumers: accepted, queries, rollback, databaseWrites: 0, coreEntries});
    throw error;
  } finally {await client.end();}
}, 110000);
