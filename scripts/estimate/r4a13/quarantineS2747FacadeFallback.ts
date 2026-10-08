import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Client } from 'pg';

// Append withdrawal evidence to the existing immutable defect ledger. R3
// admission consumes the annotation without rewriting sealed source records.
const releaseId = 'f0720637-6a4d-58be-8710-3380c5e83e65';
const outputRoot = '.release-runtime/r568/s27-47';
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Target = { id: string; release_id: string; catalog_id: string; definition_sha256: string;
  content_status: string; content_gate_status: string; baseline_id: string; input_values: Record<string, unknown> };

async function run() {
  assert.equal(process.cwd().replaceAll('\\', '/'), 'C:/dev/rik-expo-app-r4a5-dc4f0ce7');
  assert.equal(execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8', windowsHide: true }).trim(), 'codex/r4-a5-clean-08b18902');
  const apply = process.argv.includes('--apply');
  const client = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2', application_name: 's2747-facade-admission-withdrawal' });
  await client.connect();
  try {
    await client.query('begin isolation level serializable');
    await client.query("set local lock_timeout='5s'");
    await client.query("select pg_advisory_xact_lock(hashtext('s2747-facade-admission-withdrawal'))");
    const migration = readFileSync('supabase/migrations/20261008111000_s2747_definition_withdrawal_admission.sql', 'utf8');
    if (!(await client.query("select to_regprocedure('public.estimate_definition_withdrawal_reason_v1(uuid)') present")).rows[0].present) {
      await client.query(migration.replace(/^begin;$/mu, '').replace(/^commit;$/mu, ''));
    }
    const targets = (await client.query<Target>(`
      select d.id,d.release_id,d.catalog_id,d.definition_sha256,d.content_status,d.content_gate_status,
        b.id baseline_id,b.input_values
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join lateral (select * from public.estimate_approved_template_baseline b
        where b.definition_version_id=d.id order by accepted_at desc,id limit 1) b on true
      where m.release_id=$1 and d.passport->'contentPack'->>'calculatorId'='highRiseGlazingCalculator'
      order by d.catalog_id for update of d`, [releaseId])).rows;
    assert.equal(targets.length, 18, 'S2747_EXACT_PROVEN_CALCULATOR_DEPENDENCY_REQUIRED');
    assert(targets.some(t => t.id === 'a85126d7-1ee1-5371-a37a-299438512029' && t.catalog_id === 'canonical-work:expanded:roof_lanterns'));
    for (const target of targets) {
      assert.equal(target.input_values.floors, 15);
      assert.equal(target.input_values.glazing_area_m2 ?? target.input_values.facade_area_m2, 5000);
      assert(['CANDIDATE_READY', 'REAL_WORK_BLOCKED'].includes(target.content_status));
    }
    const ids = targets.map(t => t.id);
    const snapshot = async () => ({
      manifests: sha((await client.query("select count(*) count,md5(string_agg(md5(to_jsonb(m)::text),'' order by catalog_id)) hash from public.estimate_cumulative_manifest_entry m where release_id=$1", [releaseId])).rows),
      revisions: sha((await client.query("select count(*) count,md5(string_agg(md5(to_jsonb(r)::text),'' order by id)) hash from public.estimate_revision r")).rows),
      definitions: sha((await client.query(`select count(*) count,md5(string_agg(md5(to_jsonb(d)::text),'' order by id)) hash from public.estimate_definition_version d where id=any($1::uuid[])`, [ids])).rows),
      unrelatedAdmission: sha((await client.query("select count(*) count,md5(string_agg(md5(id::text||content_status||content_gate_status),'' order by id)) hash from public.estimate_definition_version where not(id=any($1::uuid[]))", [ids])).rows),
      baselines: sha((await client.query("select count(*) count,md5(string_agg(md5(to_jsonb(b)::text),'' order by id)) hash from public.estimate_approved_template_baseline b where definition_version_id=any($1::uuid[])", [ids])).rows),
    });
    const before = await snapshot();
    const targetHash = sha(targets.map(t => ({ id: t.id, catalogId: t.catalog_id, hash: t.definition_sha256, baselineId: t.baseline_id, inputs: t.input_values })));
    if (apply) {
      const rollback = JSON.parse(readFileSync(`${outputRoot}/facade-admission-rollback.json`, 'utf8'));
      assert.equal(rollback.targetHash, targetHash, 'S2747_ROLLBACK_TARGET_DRIFT');
      assert.equal(rollback.integrity, true);
    }
    let changed = 0;
    for (const target of targets) {
      const defectKey = `s2747-facade-fallback:${target.id}`;
      const hex = sha(defectKey);
      const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
      const reason = 'Расчёт по этому паспорту признан недостоверным: неизвестная площадь объекта заменялась шаблонными 5 000 м². Состав и цены требуют проверки применимости к выбранной работе. История сохранена; новый расчёт, подтверждение, PDF и заказ требуют исправленного паспорта.';
      const affected = [{ calculatorId: 'highRiseGlazingCalculator', baselineId: target.baseline_id, unsupportedObjectDefaults: target.input_values }];
      const result = await client.query(`insert into public.estimate_definition_defect_record
        (id,defect_key,release_id,predecessor_release_id,catalog_id,predecessor_definition_version_id,
         successor_definition_version_id,defect_class,root_cause_ru,affected_resources,before_sha256,after_sha256,evidence_sha256,contract_version)
        values($1,$2,$3,$4,$5,$6,null,'TECHNOLOGY_APPLICABILITY_WITHDRAWN',$7,$8::jsonb,$9,$9,$10,'CANONICAL_DEFINITION_WITHDRAWAL_V1')
        on conflict(defect_key) do nothing returning id`,
      [id, defectKey, releaseId, target.release_id, target.catalog_id, target.id, reason, JSON.stringify(affected), target.definition_sha256, sha(affected)]);
      changed += result.rowCount ?? 0;
      const saved = (await client.query('select before_sha256,evidence_sha256,predecessor_definition_version_id from public.estimate_definition_defect_record where defect_key=$1', [defectKey])).rows[0];
      assert.equal(saved.before_sha256, target.definition_sha256);
      assert.equal(saved.evidence_sha256, sha(affected));
      assert.equal(saved.predecessor_definition_version_id, target.id);
    }
    const remaining = (await client.query(`select count(*)::int count from public.estimate_definition_version
      where id=any($1::uuid[]) and public.estimate_definition_withdrawal_reason_v1(id) is null`, [ids])).rows[0].count;
    assert.equal(remaining, 0);
    const mustReject = async (sql: string, values: string[], expected: string) => {
      await client.query('savepoint forbidden_mutation');
      let rejected = false;
      try { await client.query(sql, values); }
      catch (error) { rejected = error instanceof Error && error.message.includes(expected); }
      await client.query('rollback to savepoint forbidden_mutation');
      assert(rejected, `S2747_EXPECTED_DATABASE_REJECTION:${expected}`);
    };
    await mustReject("update public.estimate_definition_version set content_gate_status='RED' where id=$1", [ids[0]], 'sealed estimate definition release is immutable');
    await mustReject("delete from public.estimate_definition_defect_record where defect_key=$1", [`s2747-facade-fallback:${ids[0]}`], 'definition defect record is immutable');
    // Exercise the database admission trigger without writing a synthetic job
    // or relying on an unrelated expired capability to reject it first.
    await client.query('create temporary table estimate_compile_job(operation text,parent_revision_id uuid,target_release_id uuid,catalog_id text) on commit drop');
    await client.query('create trigger withdrawal_probe before insert on pg_temp.estimate_compile_job for each row execute function public.estimate_enforce_definition_withdrawal_v1()');
    for (const target of targets) {
      await mustReject("insert into pg_temp.estimate_compile_job(operation,target_release_id,catalog_id) values('compile',$1,$2)", [releaseId, target.catalog_id], 'DEFINITION_CONTENT_WITHDRAWN');
    }
    for (const operation of ['pdf', 'professional_pdf', 'procurement']) {
      await mustReject('insert into pg_temp.estimate_compile_job(operation,parent_revision_id) values($1,$2)', [operation, '303c4e68-0309-43ec-9284-fa1e04b4e863'], 'DEFINITION_CONTENT_WITHDRAWN');
    }
    const after = await snapshot();
    assert.deepEqual(after, before, 'S2747_UNRELATED_OR_IMMUTABLE_DATA_CHANGED');
    const receipt = { contract: 's27-47-existing-r3-admission-withdrawal:v1', applied: apply, integrity: true,
      targetReleaseId: releaseId, targetHash, targets, changedAdmissionCount: changed, before, after,
      migrationSha256: createHash('sha256').update(migration).digest('hex'),
      negativeChecks: { sealedDefinitionUnchanged: true, withdrawalImmutable: true, compileBlocked: 18, artifactKindsBlocked: 3 },
      reason: 'Unconfirmed 5000m2/15floor baseline; 17 definitions also share indistinguishable additive glass rows; local review prices do not establish a compatible product offer.',
      newAcceptedTypes: 0, capturedAt: new Date().toISOString() };
    await client.query(apply ? 'commit' : 'rollback');
    mkdirSync(outputRoot, { recursive: true });
    writeFileSync(`${outputRoot}/facade-admission-${apply ? 'apply' : 'rollback'}.json`, JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({ applied: apply, changed, targets: targets.length, integrity: true, targetHash }));
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { await client.end(); }
}
if (require.main === module) run().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
