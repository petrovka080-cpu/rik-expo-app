"""Existing Windows CI guard: exact source, bounded child job, durable receipt."""
from pathlib import Path
import argparse, ctypes, hashlib, json, os, re, subprocess, sys, time


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


class PI(ctypes.Structure):
    _fields_ = [('cb', ctypes.c_ulong), *[(name, ctypes.c_size_t) for name in
        ['CommitTotal', 'CommitLimit', 'CommitPeak', 'PhysicalTotal', 'PhysicalAvailable',
         'SystemCache', 'KernelTotal', 'KernelPaged', 'KernelNonpaged', 'PageSize']],
        ('HandleCount', ctypes.c_ulong), ('ProcessCount', ctypes.c_ulong), ('ThreadCount', ctypes.c_ulong)]


def memory():
    info = PI(); info.cb = ctypes.sizeof(info)
    fn = ctypes.WinDLL('psapi', use_last_error=True).GetPerformanceInfo
    fn.argtypes = [ctypes.POINTER(PI), ctypes.c_ulong]; fn.restype = ctypes.c_int
    assert fn(ctypes.byref(info), info.cb), 'PERFORMANCE_INFO_FAILED'
    return info.PhysicalAvailable * info.PageSize, (info.CommitLimit - info.CommitTotal) * info.PageSize


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True); parser.add_argument('--commit', required=True)
    parser.add_argument('--output', required=True); parser.add_argument('--stage', choices=['types', 'jest'], default='types')
    parser.add_argument('--batch', choices=['contracts', 'owners', 'ui-render', 'ui-cold', 'ui-contract', 'ui-procurement', 'admission', 'developer-runtime'])
    args = parser.parse_args()
    root = Path(args.root).resolve(); out = Path(args.output).resolve()
    assert os.environ.get('GITHUB_ACTIONS') == 'true' and os.name == 'nt', 'WINDOWS_CI_ONLY'
    assert out.is_dir() and not (out / 'receipt.json').exists(), 'FRESH_OUTPUT_REQUIRED'
    assert re.fullmatch('[a-f0-9]{40}', args.commit), 'EXACT_COMMIT_REQUIRED'
    import psutil
    sys.path.insert(0, str(root / 'scripts/verification/android-waterproof-current-v1'))
    from owned_launcher_job_snapshot_retry_v1 import OwnedLauncherJob

    mib = 1024 ** 2
    maxrss, maxprivate, timeout = (3072, 3584, 1200) if args.stage == 'types' else (1024, 1024, 120)
    job = child = None; owned = {}; errors = []; code = None; result = {}; source = {}; deps = {}
    peakrss = peakprivate = 0; minfree = mincommit = None; start = time.monotonic()
    remaining = []; source_drift = ['UNCHECKED']; dependency_drift = ['UNCHECKED']
    closure = 'NO_CHILD_STARTED'; expected_paths = set(); actual_paths = set()
    head_before = head_after = seed_sha = run_id = None
    transform_cache_proof = transform_marker = transform_marker_sha = None

    def git_head():
        return subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True, timeout=20).strip()

    def check(pins):
        changed = []
        for rel, digest in pins.items():
            try:
                path = (root / rel).resolve()
                assert path.is_relative_to(root) and not path.is_symlink(), 'UNSAFE_PIN'
                if not path.is_file() or sha(path) != digest:
                    changed.append(rel)
            except BaseException as exc:
                changed.append(rel + ': ' + repr(exc))
        return changed

    try:
        manifest = root / 'scripts/verification/gox-current-types-v1/input-manifest.json'
        restored = json.loads(((out if args.stage == 'types' else out.parent) / 'source-restore.json').read_text('utf-8'))
        assert restored['sourceCommit'] == args.commit and restored['inputManifestSha256'] == sha(manifest), 'BOOTSTRAP_MANIFEST_DRIFT'
        spec = json.loads(manifest.read_text('utf-8'))
        assert spec['contract'] == 'gox-full-affected-types-source-snapshot/r1'
        source = spec['sourcePins']; deps = spec['dependencyPins']
        head_before = git_head(); assert head_before == args.commit, 'SOURCE_HEAD_BEFORE_DRIFT'
        source_drift = check(source); dependency_drift = check(deps)
        assert not source_drift, 'SOURCE_PIN_DRIFT'
        assert not dependency_drift, 'LOCKED_DEPENDENCY_PIN_DRIFT'
        seed = root / 'scripts/verification/gox-current-types-v1/seed-manifest.json'; seed_sha = sha(seed)
        run_id = 'gox_ci_' + os.environ['GITHUB_RUN_ID']
        node = subprocess.check_output(['where.exe', 'node.exe'], text=True, timeout=20).splitlines()[0]
        env = dict(os.environ); env.pop('NODE_OPTIONS', None)
        env.update(DELIVERY16_CURRENT_TSC_GUARD_RUN_ID=run_id, GOX_TYPES_OUTPUT_ROOT=out.as_posix())
        if args.stage == 'types':
            command = [node, '--max-old-space-size=2816', '--max-semi-space-size=8',
                str(root / 'scripts/verification/gox-current-types-v1/typecheck.mjs'), str(out / 'full-result.json'),
                '--expected-head', args.commit, '--seed-manifest-sha256', seed_sha, '--guard-run-id', run_id]
        else:
            assert args.batch is not None, 'EXACT_JEST_BATCH_REQUIRED'
            targets_spec = json.loads((root / 'scripts/verification/gox-current-types-v1/jest-targets.json').read_text('utf-8'))
            assert targets_spec['contract'] == 'gox-exact-affected-jest-batches/v1'
            targets = targets_spec['batches'][args.batch]
            assert targets and len(targets) == len(set(targets)) and all(t in source for t in targets), 'EXACT_TARGET_MEMBERSHIP'
            expected_paths = {(root / target).resolve().as_posix().casefold() for target in targets}
            # Native Jest source transforms are shared only inside this exact run.
            # Tests and fresh result files still execute independently in every batch.
            github_run_id = os.environ['GITHUB_RUN_ID']
            assert github_run_id.isdigit(), 'EXACT_CACHE_RUN_ID_REQUIRED'
            manifest_sha = sha(manifest)
            transform_dir = out.parent.parent / ('gox-jc-' + github_run_id + '-' + manifest_sha[:12])
            assert transform_dir.parent == out.parent.parent and not transform_dir.is_relative_to(root), 'CACHE_OUTSIDE_PRODUCT_REQUIRED'
            assert not transform_dir.is_symlink(), 'CACHE_SYMLINK_FORBIDDEN'
            transform_marker = transform_dir / 'ROOT_EXACT_INPUT_IDENTITY.json'
            cache_identity = dict(contract='gox-exact-run-jest-transform-cache/v1', sourceCommit=args.commit,
                githubRunId=github_run_id, inputManifestSha256=manifest_sha,
                jestConfigSha256=sha(root / 'jest.config.js'), babelConfigSha256=sha(root / 'babel.config.js'),
                packageLockSha256=sha(root / 'package-lock.json'), sourcePins=len(source), dependencyPins=len(deps), nodeExecutable=node)
            preexisting_cache = transform_dir.exists()
            if preexisting_cache:
                assert transform_marker.is_file() and not transform_marker.is_symlink(), 'CACHE_IDENTITY_REQUIRED'
                assert json.loads(transform_marker.read_text('utf-8')) == cache_identity, 'CACHE_SNAPSHOT_IDENTITY_MISMATCH'
            else:
                transform_dir.mkdir()
                with transform_marker.open('x', encoding='utf-8') as stream:
                    json.dump(cache_identity, stream, sort_keys=True)
            transform_marker_sha = sha(transform_marker)
            transform_cache_proof = dict(mode='NATIVE_TRANSFORMS_ONLY_FRESH_TEST_EXECUTION_AND_RESULTS',
                identity=cache_identity, markerSha256=transform_marker_sha, reusedWithinExactRun=preexisting_cache,
                identityVerifiedAfter=False)
            command = [node, '--max-old-space-size=768', '--max-semi-space-size=8', str(root / 'node_modules/jest/bin/jest.js'),
                '--config', str(root / 'jest.config.js'), '--runInBand', '--cache', '--cacheDirectory', str(transform_dir), '--bail=1', '--json',
                '--outputFile', str(out / 'jest-results.json'), '--runTestsByPath', *targets]
            env.update(EXPO_NO_DOTENV='1', EXPO_NO_TELEMETRY='1', CI='true')
        free, commit = memory(); minfree = free; mincommit = commit
        assert free >= 4096 * mib and commit >= 3072 * mib, 'RESOURCE_ADMISSION'
        job = OwnedLauncherJob()
        with (out / 'compiler.stdout.log').open('xb') as stdout, (out / 'compiler.stderr.log').open('xb') as stderr, (out / 'samples.jsonl').open('x') as samples:
            child = subprocess.Popen(command, cwd=root, env=env, stdout=stdout, stderr=stderr, stdin=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW | 0x00000004)
            owned[child.pid] = psutil.Process(child.pid).create_time()
            closure = 'UNCHECKED'
            job.assign_and_resume_suspended(child)
            while child.poll() is None:
                rss = private = 0
                for pid in job.pids():
                    try:
                        process = psutil.Process(pid); owned[pid] = process.create_time()
                        info = process.memory_info(); rss += info.rss; private += info.private
                    except psutil.NoSuchProcess:
                        pass
                free, commit = memory(); peakrss = max(peakrss, rss); peakprivate = max(peakprivate, private)
                minfree = min(minfree, free); mincommit = min(mincommit, commit)
                samples.write(json.dumps(dict(seconds=time.monotonic()-start, rss=rss, private=private, free=free, commit=commit))+'\n'); samples.flush()
                assert rss <= maxrss * mib and private <= maxprivate * mib, 'OWNED_TREE_CAP_STOP'
                assert free >= 3072 * mib and commit >= 512 * mib, 'OS_RESERVE_STOP'
                assert time.monotonic() - start < timeout, 'STAGE_TIMEOUT'
                time.sleep(.1)
            code = child.returncode
    except BaseException as exc:
        errors.append(repr(exc))
    finally:
        cleanup_errors = []
        if job is not None:
            try:
                job.terminate()
            except BaseException as exc:
                cleanup_errors.append('JOB_TERMINATE: ' + repr(exc))
            if child is not None:
                try:
                    child.wait(timeout=5)
                except BaseException as exc:
                    cleanup_errors.append('CHILD_WAIT: ' + repr(exc))
            try:
                remaining = list(job.pids())
                if remaining: cleanup_errors.append('JOB_PIDS_REMAIN')
            except BaseException as exc:
                cleanup_errors.append('JOB_MEMBERSHIP: ' + repr(exc))
            try:
                job.close()
            except BaseException as exc:
                cleanup_errors.append('JOB_CLOSE: ' + repr(exc))
        for pid, born in owned.items():
            try:
                if psutil.Process(pid).create_time() == born and pid not in remaining:
                    remaining.append(pid)
            except psutil.NoSuchProcess:
                pass
            except BaseException as exc:
                cleanup_errors.append('PROCESS_IDENTITY: ' + repr(exc))
        if child is not None:
            closure = 'CLOSED' if not remaining and not cleanup_errors else 'NOT_CLOSED'
        errors.extend(cleanup_errors)
        if source: source_drift = check(source)
        if deps: dependency_drift = check(deps)
        try:
            head_after = git_head()
        except BaseException as exc:
            errors.append('SOURCE_HEAD_AFTER: ' + repr(exc))
        try:
            result_path = out / ('full-result.json' if args.stage == 'types' else 'jest-results.json')
            result = json.loads(result_path.read_text('utf-8')) if result_path.is_file() else {}
        except BaseException as exc:
            errors.append('RESULT_PARSE: ' + repr(exc))
        if transform_cache_proof is not None:
            try:
                assert sha(transform_marker) == transform_marker_sha, 'CACHE_IDENTITY_CHANGED_DURING_STAGE'
                transform_cache_proof['identityVerifiedAfter'] = True
            except BaseException as exc:
                errors.append('TRANSFORM_CACHE_IDENTITY: ' + repr(exc))
        if args.stage == 'types':
            identity_ok = seed_sha is not None and run_id is not None and all([
                result.get('runId') == run_id, result.get('sourceHeadExpected') == args.commit,
                result.get('sourceHeadBefore') == args.commit, result.get('sourceHeadAfter') == args.commit,
                result.get('seedManifestExpectedSha256') == seed_sha, result.get('seedManifestSha256After') == seed_sha])
            result_ok = identity_ok and result.get('status') == 'PASS_CURRENT_CANONICAL_AFFECTED_FULL_TYPESCRIPT_PROGRAM' and result.get('diagnostics') == [] and result.get('harnessErrors') == []
        else:
            try:
                actual_paths = {Path(test['name']).resolve().as_posix().casefold() for test in result.get('testResults', [])}
            except BaseException as exc:
                errors.append('JEST_SUITE_IDENTITIES: ' + repr(exc))
            identity_ok = bool(expected_paths) and actual_paths == expected_paths
            result_ok = identity_ok and result.get('success') is True and result.get('numFailedTests') == 0 and result.get('numFailedTestSuites') == 0 and result.get('numPassedTests', 0) > 0 and result.get('numPendingTests') == 0 and result.get('numTodoTests', 0) == 0 and result.get('numPassedTestSuites') == len(expected_paths)
        passed = not errors and code == 0 and result_ok and closure == 'CLOSED' and not source_drift and not dependency_drift and head_before == head_after == args.commit
        receipt = dict(status=('PASS_EXACT_CURRENT_CORE_FULL_TYPES_CI' if args.stage == 'types' else 'PASS_EXACT_AFFECTED_JEST_BATCH_CI') if passed else 'NOT_ACCEPTED',
            errors=errors, exitCode=code, sourceSnapshotCommit=args.commit, sourceHeadBefore=head_before, sourceHeadAfter=head_after,
            sourcePins=len(source), dependencyPins=len(deps), sourceDrift=source_drift, dependencyDrift=dependency_drift,
            diagnostics=len(result.get('diagnostics', [])) if args.stage == 'types' else None, harnessErrors=result.get('harnessErrors'),
            seedCount=len(result.get('seedFiles', [])), fullProgramFileCount=result.get('fullProgramFileCount'), resultIdentityAccepted=identity_ok,
            stage=args.stage, batch=args.batch, expectedJestSuitePaths=sorted(expected_paths), actualJestSuitePaths=sorted(actual_paths),
            jestPassed=result.get('numPassedTests'), jestFailed=result.get('numFailedTests'),
            jestTransformCache=transform_cache_proof,
            resourcePolicy=dict(heapMiB=2816 if args.stage == 'types' else 768, admissionPhysicalMiB=4096, admissionCommitMiB=3072, maxOwnedRssMiB=maxrss, maxOwnedPrivateMiB=maxprivate, osPhysicalReserveMiB=3072, commitStopMiB=512, timeoutSeconds=timeout),
            peakOwnedRssBytes=peakrss, peakOwnedPrivateBytes=peakprivate, minimumPhysicalFreeBytes=minfree, minimumCommitHeadroomBytes=mincommit,
            ownedJobClosure=closure, remainingOwnedProcesses=remaining, elapsedSeconds=time.monotonic()-start,
            applicationRuntimeStarted=False, databaseWrites=False, publicationPerformed=False, productionActivation=False)
        with (out / 'receipt.json').open('x', encoding='utf-8') as stream:
            json.dump(receipt, stream, indent=2)
        print(json.dumps(receipt))
        if not passed: raise SystemExit(1)


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except BaseException as exc:
        # Initialization failures must remain distinguishable from a passed gate.
        try:
            destination = Path(sys.argv[sys.argv.index('--output') + 1]).resolve() / 'receipt.json'
            if destination.parent.is_dir() and not destination.exists():
                destination.write_text(json.dumps(dict(status='NOT_ACCEPTED', initializationError=repr(exc), ownedJobClosure='UNCHECKED', sourceDrift=['UNCHECKED'], dependencyDrift=['UNCHECKED'])), encoding='utf-8')
        finally:
            raise
