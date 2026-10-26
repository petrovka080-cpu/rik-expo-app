"""Full actual TypeScript program on an exact CI source snapshot, one owned job."""
from pathlib import Path
import argparse,ctypes,hashlib,json,os,re,subprocess,sys,time
import xml.etree.ElementTree as ET

def sha(p):
 with Path(p).open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
class PI(ctypes.Structure):
 _fields_=[('cb',ctypes.c_ulong),*[(n,ctypes.c_size_t)for n in ['CommitTotal','CommitLimit','CommitPeak','PhysicalTotal','PhysicalAvailable','SystemCache','KernelTotal','KernelPaged','KernelNonpaged','PageSize']],('HandleCount',ctypes.c_ulong),('ProcessCount',ctypes.c_ulong),('ThreadCount',ctypes.c_ulong)]
def memory():
 p=PI();p.cb=ctypes.sizeof(p);fn=ctypes.WinDLL('psapi',use_last_error=True).GetPerformanceInfo
 fn.argtypes=[ctypes.POINTER(PI),ctypes.c_ulong];fn.restype=ctypes.c_int;assert fn(ctypes.byref(p),p.cb)
 return p.PhysicalAvailable*p.PageSize,(p.CommitLimit-p.CommitTotal)*p.PageSize

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--root',required=True);parser.add_argument('--commit',required=True);parser.add_argument('--output',required=True);parser.add_argument('--test-entry',choices=['scripts/estimate/r4a13/concreteWholeHoleScopedIdentityPureR243.test.ts']);parser.add_argument('--panel-finite-r315',action='store_true');a=parser.parse_args()
 assert os.environ.get('GITHUB_ACTIONS')=='true'and os.name=='nt','WINDOWS_CI_ONLY'
 root=Path(a.root).resolve();restore_root=Path(a.output).resolve();assert restore_root.is_dir()
 pure=bool(a.test_entry);panel=bool(a.panel_finite_r315);assert not(pure and panel);test_mode=pure or panel
 out=restore_root/'panel-finite13-r315'/'02-config-and-finite13'if panel else restore_root/'hole-scoped-identity-only'if pure else restore_root
 if test_mode:out.mkdir(parents=True)
 assert out.is_dir()and not(out/'receipt.json').exists()
 assert re.fullmatch('[a-f0-9]{40}',a.commit)
 import psutil
 helpers=root/'scripts/verification/android-waterproof-current-v1';sys.path.insert(0,str(helpers))
 from owned_launcher_job_snapshot_retry_v1 import OwnedLauncherJob
 MiB=1024**2;job=None;child=None;owned={};error=None;code=None;peakrss=peakprivate=0;minfree=mincommit=2**63;start=time.monotonic();remaining=[];source_drift=[];dependency_drift=[];panel_meta=None;panel_pins={};panel_context=None
 manifest_path=root/'scripts/verification/gox-current-types-v1/input-manifest.json'
 restored=json.loads((restore_root/'source-restore.json').read_text(encoding='utf-8'))
 assert restored['sourceCommit']==a.commit and restored['inputManifestSha256']==sha(manifest_path),'BOOTSTRAP_MANIFEST_DRIFT'
 spec=json.loads(manifest_path.read_text(encoding='utf-8'))
 source=spec['sourcePins'];deps=spec['dependencyPins']
 def check(pins):
  changed=[]
  for rel,digest in pins.items():
   path=(root/rel).resolve();assert path.is_relative_to(root)and not path.is_symlink()
   if not path.is_file()or sha(path)!=digest:changed.append(rel)
  return changed
 try:
  assert spec['contract']=='gox-full-affected-types-source-snapshot/r1'
  assert subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()==a.commit
  restore_committed_runtime_json(root,out,spec,a.commit)
  if panel:panel_meta,panel_pins,panel_context=prepare_panel_finite_r315(root,out,spec,a.commit)
  source_drift=check({**source,**panel_pins});dependency_drift=check(deps)
  assert not source_drift,'SOURCE_PIN_DRIFT';assert not dependency_drift,'LOCKED_DEPENDENCY_PIN_DRIFT'
  if pure:
   prerequisite=json.loads((restore_root/'receipt.json').read_text(encoding='utf-8'))
   assert prerequisite['status']=='PASS_EXACT_CURRENT_CORE_FULL_TYPES_CI'and prerequisite['sourceSnapshotCommit']==a.commit,'EXACT_FULL_TYPES_PREREQUISITE'
  free,commit=memory();minfree=free;mincommit=commit
  assert free>=4096*MiB and commit>=3072*MiB,'FULL_TYPES_RESOURCE_ADMISSION'
  worker=root/'scripts/verification/gox-current-types-v1/typecheck.mjs';seed=root/'scripts/verification/gox-current-types-v1/seed-manifest.json'
  node=subprocess.check_output(['where.exe','node.exe'],text=True).splitlines()[0]
  run='gox_ci_'+os.environ['GITHUB_RUN_ID'];env=dict(os.environ);env.pop('NODE_OPTIONS',None)
  for key in ['PGPASSWORD','DATABASE_URL','R568_LOCAL_DATABASE_URL','SUPABASE_SERVICE_ROLE_KEY']:env.pop(key,None)
  if panel:
   for key in list(env):
    if any(word in key.upper()for word in ['PASSWORD','SECRET','TOKEN','DATABASE_URL','SUPABASE','PGHOST','PGUSER','PGPORT','PGDATABASE']):env.pop(key,None)
   env.update(NODE_OPTIONS='--max-old-space-size=768 --max-semi-space-size=8',NODE_ENV='test',EXPO_NO_DOTENV='1',EXPO_NO_TELEMETRY='1',ESTIMATE_MIGRATION_DATABASE_URL='',PANEL_R287_BOUND_CONTEXT_PATH=str(panel_context),PANEL_R287_ACTUAL_OUTPUT=str(out/'raw'))
  env.update(DELIVERY16_CURRENT_TSC_GUARD_RUN_ID=run,GOX_TYPES_OUTPUT_ROOT=out.as_posix())
  args=[node,'--max-old-space-size=2560','--max-semi-space-size=8',str(worker),str(out/'full-result.json'),
   '--expected-head',a.commit,'--seed-manifest-sha256',sha(seed),'--guard-run-id',run]
  if pure:
   args=[node,'--max-old-space-size=768','--max-semi-space-size=8','--import','tsx','--test','--test-concurrency=1',
    '--test-reporter=junit','--test-reporter-destination='+str(out/'scope.junit.xml'),str(root/a.test_entry)]
  if panel:
   args=[node,str(root/'node_modules/jest/bin/jest.js'),'--config',str(root/'jest.config.js'),'--runInBand','--bail','--no-cache','--coverage=false','--json','--outputFile',str(out/'actual-jest.json'),'--runTestsByPath',str(root/panel_meta['entry'])]
  maxrss=(1024 if test_mode else 3072)*MiB;maxprivate=(1024 if test_mode else 3584)*MiB;timeout=120 if test_mode else 1200
  job=OwnedLauncherJob()
  with(out/'compiler.stdout.log').open('xb')as stdout,(out/'compiler.stderr.log').open('xb')as stderr,(out/'samples.jsonl').open('x')as samples:
   child=subprocess.Popen(args,cwd=root,env=env,stdout=stdout,stderr=stderr,stdin=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW|0x00000004)
   job.assign_and_resume_suspended(child)
   while child.poll()is None:
    rss=private=0
    for pid in job.pids():
     try:
      process=psutil.Process(pid);owned[pid]=process.create_time();m=process.memory_info();rss+=m.rss;private+=m.private
     except psutil.NoSuchProcess:pass
    free,commit=memory();peakrss=max(peakrss,rss);peakprivate=max(peakprivate,private);minfree=min(minfree,free);mincommit=min(mincommit,commit)
    samples.write(json.dumps(dict(seconds=time.monotonic()-start,rss=rss,private=private,free=free,commit=commit))+'\n');samples.flush()
    assert rss<=maxrss and private<=maxprivate,'OWNED_TREE_CAP_STOP'
    assert free>=3072*MiB and commit>=512*MiB,'OS_RESERVE_STOP'
    assert time.monotonic()-start<timeout,'FULL_TYPES_TIMEOUT'
    time.sleep(.1)
   code=child.returncode
 except BaseException as exc:error=repr(exc)
 finally:
  if job:
   job.terminate()
   if child:child.wait(timeout=5)
   job.close()
  for pid,born in owned.items():
   try:
    if psutil.Process(pid).create_time()==born:remaining.append(pid)
   except psutil.NoSuchProcess:pass
  source_drift=check({**source,**panel_pins});dependency_drift=check(deps)
  result=json.loads((out/'full-result.json').read_text(encoding='utf-8'))if(out/'full-result.json').exists()else{}
  if pure:
   expected_names=sorted(['scope accepts exact captured current release without identity admission',*['scope rejects '+x for x in ['status','definitionReleaseId','searchReleaseId','headers','locators','identities','sources','headers','transactionRolledBack','databaseWrites','globalAbsenceClaim']]])
   junit=out/'scope.junit.xml';cases=[];junit_error=None
   try:
    if junit.is_file():cases=list(ET.parse(junit).getroot().iter('testcase'))
   except ET.ParseError as exc:junit_error=str(exc)
   names=sorted(c.attrib.get('name','')for c in cases)
   failures=[c.attrib.get('name')for c in cases if any(c.find(k)is not None for k in ['failure','error','skipped'])]
   exact=len(cases)==12 and names==expected_names and not failures and junit_error is None
   result={'status':'PASS_SCOPED_IDENTITY_TWELVE_CASES'if exact else'FAIL_SCOPED_IDENTITY_TESTS',
    'diagnostics':[],'harnessErrors':[]if exact else['EXACT_TWELVE_CASES_REQUIRED_NO_SKIP_OR_FAILURE'],
    'pureTestEntry':a.test_entry,'testCases':names,'failures':failures,'junitError':junit_error,'actualOrdinaryConfigConstructor':'UNRUN',
    'actualCalculationCoreEntries':0 if exact else None,'newQuantityScenarios':0,'newSourceOrIdentityAdmission':False}
   (out/'exact-test-audit.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
  if panel:
   try:
    assert error is None and code==0 and panel_meta is not None,'PANEL_STAGE_MUST_EXIT_CLEAN_BEFORE_AUDIT'
    result=audit_panel_finite_r315(root,out,panel_meta)
   except BaseException as exc:
    error=error or repr(exc);result={'status':'PANEL_FINITE13_NOT_ACCEPTED','diagnostics':[],'harnessErrors':[type(exc).__name__]}
   if not owned or peakrss<=0 or peakprivate<=0:error=error or 'PANEL_OWNED_RUNTIME_WITNESS_REQUIRED'
  passed=error is None and code==0 and result.get('status')==('PASS_ACTUAL_PANEL_ORDINARY_CONFIG_FINITE13_TEST_ONLY'if panel else'PASS_SCOPED_IDENTITY_TWELVE_CASES'if pure else'PASS_CURRENT_CANONICAL_AFFECTED_FULL_TYPESCRIPT_PROGRAM')and result.get('diagnostics')==[]and not remaining and not source_drift and not dependency_drift
  receipt=dict(status=('PASS_EXACT_PANEL_FINITE13_R315_CI'if panel else'PASS_EXACT_SCOPED_IDENTITY_TWELVE_TESTS_CI'if pure else'PASS_EXACT_CURRENT_CORE_FULL_TYPES_CI')if passed else'NOT_ACCEPTED',error=error,exitCode=code,sourceSnapshotCommit=a.commit,
   sourcePins=len(source),dependencyPins=len(deps),sourceDrift=source_drift,dependencyDrift=dependency_drift,
   diagnostics=len(result['diagnostics'])if'diagnostics'in result else None,harnessErrors=result.get('harnessErrors'),seedCount=len(result.get('seedFiles',[])),fullProgramFileCount=result.get('fullProgramFileCount'),
   resourcePolicy=dict(stage='PANEL_ORDINARY_CONFIG_FINITE13_R315'if panel else'SCOPED_IDENTITY_ONLY_TESTS'if pure else'FULL_TYPESCRIPT_PROGRAM',admissionPhysicalMiB=4096,admissionCommitMiB=3072,maxOwnedRssMiB=1024 if test_mode else 3072,maxOwnedPrivateMiB=1024 if test_mode else 3584,osPhysicalReserveMiB=3072,commitStopMiB=512,timeoutSeconds=120 if test_mode else 1200,heapMiB=768 if test_mode else 2560),
   peakOwnedRssBytes=peakrss,peakOwnedPrivateBytes=peakprivate,minimumPhysicalFreeBytes=minfree,minimumCommitHeadroomBytes=mincommit,remainingOwnedProcesses=remaining,
   elapsedSeconds=time.monotonic()-start,scopedTestResult=result if test_mode else None,panelFiniteR315=panel,typesReusedFromCommit='acc63ef2532e08c6668c1aa170259b5bb0bfbc47'if panel else None,runtimePinnedFiles=len(panel_pins)if panel else 0,ownedPids=sorted(owned),sourceApproval=False,FULL=False,applicationRuntimeStarted=False,databaseWrites=False,publicationPerformed=False,productionActivation=False)
  (out/'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps(receipt))
  if not passed:raise SystemExit(1)


def prepare_panel_finite_r315(root,out,spec,commit):
 import urllib.request
 meta_path=root/'scripts/verification/gox-current-types-v1/panel-finite-r315.json'
 assert meta_path.stat().st_size<=3*1024**2
 meta=json.loads(meta_path.read_text(encoding='utf-8'))
 assert meta['contract']=='panel-r315-single-existing-ci-guard-mode/v1'
 proof=meta['reuseTypes'];old_commit='acc63ef2532e08c6668c1aa170259b5bb0bfbc47'
 assert proof['commit']==old_commit and proof['status']=='PASS_ACTUAL_FULL_TYPES_CURRENT_OWNER_VISIBILITY_REPAIRS_R315'
 assert(proof['fullProgramFileCount'],proof['seedCount'],proof['actualDiagnostics'],proof['runId'])==(3635,754,0,40255053259)
 assert proof['sourceDrift']==proof['dependencyDrift']==proof['ownedRemaining']==[]
 before_raw=subprocess.check_output(['git','-C',str(root),'cat-file','blob',old_commit+':scripts/verification/gox-current-types-v1/input-manifest.json'])
 assert hashlib.sha256(before_raw).hexdigest()==meta['beforeInputManifestSha256'],'EXACT_R315_INPUT_MANIFEST_REQUIRED'
 before=json.loads(before_raw)
 allowed={'scripts/verification/gox-current-types-v1/guard.py','.github/workflows/gox-current-core-types-v1.yml'}
 extras={'scripts/verification/gox-current-types-v1/panel-finite-r315.json','scripts/verification/gox-current-types-v1/panel-finite-r315-semantic-audit.py','data/estimate-benchmarks/fixtures/panel-current-v5-full-catalog-parent-r315-ci.json','data/estimate-benchmarks/r568-local-developer-canonical-release.json','jest.config.js','babel.config.js','jest.setup.js','.release-runtime/r568/s27-51/electrical-series-primary/DVO_6560_6561_6562_OFFICIAL.pdf'}
 extras|=set(meta['heldRuntimeJsonInputs'])
 assert set(meta['allowedChangedExistingSources'])==allowed and set(meta['allowedExtraCommittedInputs'])==extras
 assert set(spec['sourcePins'])==set(before['sourcePins'])|extras,'UNREVIEWED_EXTRA_OR_REMOVED_SOURCE'
 assert {k for k,h in before['sourcePins'].items()if spec['sourcePins'][k]!=h}==allowed,'ONLY_HARNESS_BYTES_MAY_CHANGE'
 assert spec['dependencyPins']==before['dependencyPins'],'R315_TYPE_DEPENDENCY_BYTES_MUST_REMAIN_EXACT'
 assert spec['originalSeedManifestSha256']==before['originalSeedManifestSha256']==meta['unchangedSeedManifestSha256']
 assert sha(root/'scripts/verification/gox-current-types-v1/seed-manifest.json')==before['originalSeedManifestSha256']
 assert len(before['sourcePins'])==proof['sourcePins']==2482 and len(before['dependencyPins'])==proof['dependencyPins']==1234
 assert meta['entry']=='scripts/estimate/r4a13/panelReadyGridCurrentMasterR287.bound.test.ts'
 assert meta['policy']=={'admissionMiB':4096,'rssMiB':1024,'privateMiB':1024,'osStopMiB':3072,'timeoutSeconds':120}
 assert all(meta['runtimeVendorPins'].get(k)==h for k,h in before['dependencyPins'].items())
 assert len(meta['runtimeVendorPins'])==13095
 asset=meta['primaryPdf'];assert asset['officialUrl']=='https://cdn-01.iek.ru/media/original/cbe47a51d5727edf98648ff110070bd8a31798f4e93f423a3b3f57fba5e41fca.pdf'
 assert asset['sha256']=='cbe47a51d5727edf98648ff110070bd8a31798f4e93f423a3b3f57fba5e41fca'and asset['bytes']==1498721
 dest=(root/asset['logicalPath']).resolve();assert dest.is_relative_to(root)and not dest.is_symlink()
 if not dest.exists():
  temporary=out/'downloaded-official-pdf.part';assert not temporary.exists()
  try:
   with urllib.request.urlopen(asset['officialUrl'],timeout=30)as response,temporary.open('xb')as target:
    total=0
    while True:
     block=response.read(65536)
     if not block:break
     total+=len(block);assert total<=asset['bytes'],'PDF_RESPONSE_SIZE_CAP'
     target.write(block)
   assert temporary.stat().st_size==asset['bytes']and sha(temporary)==asset['sha256'],'OFFICIAL_PDF_EXACT_PIN_REQUIRED'
   dest.parent.mkdir(parents=True,exist_ok=True);os.replace(temporary,dest)
  except BaseException as exc:
   temporary.unlink(missing_ok=True)
   (out/'OFFICIAL_PDF_RETRIEVAL_HOLD.json').write_text(json.dumps({'status':'HOLD_OFFICIAL_PDF_RETRIEVAL_NOT_VERIFIED','verified':False,'errorType':type(exc).__name__},indent=2)+'\n',encoding='utf-8')
   raise RuntimeError('OFFICIAL_PDF_RETRIEVAL_HOLD:'+type(exc).__name__)from exc
 assert dest.stat().st_size==asset['bytes']and sha(dest)==asset['sha256'],'OFFICIAL_PDF_EXISTING_PIN_DRIFT'
 parent=meta['parentFixture'];assert parent['sha256']=='a0933ccc34829c29e084bf74a1e0841714fff941ab52b015de85dc433e6fa403'
 parent_path=(root/parent['logicalPath']).resolve();assert parent_path.is_relative_to(root)and parent_path.stat().st_size==parent['bytes']and sha(parent_path)==parent['sha256']
 pins={**meta['selectedRuntimePins'],**meta['runtimeVendorPins'],parent['logicalPath']:parent['sha256']}
 assert all(not k.startswith('/')and'..'not in Path(k).parts for k in pins)
 context=out/'panel-bound-context.json';assert not context.exists()
 context.write_text(json.dumps({'sourceRoot':str(root),'currentFullParent':{'path':str(parent_path),'sha256':parent['sha256']}},indent=2)+'\n',encoding='utf-8')
 (out/'types-reuse-source-equality.json').write_text(json.dumps({'status':'REUSED_ACTUAL_R315_FULL_TYPES_UNCHANGED_COMPILED_SOURCES_ROOTS_AND_DEPENDENCIES','actualTypes':proof,'sourceSnapshotCommit':commit,'beforeInputManifestSha256':meta['beforeInputManifestSha256'],'exactChangedHarnessOnly':sorted(allowed),'exactAdditionalInputs':sorted(extras),'runtimeVendorPins':len(meta['runtimeVendorPins']),'typecheckExecuted':False,'sourceApproval':False,'FULL':False},indent=2)+'\n',encoding='utf-8')
 return meta,pins,context

def audit_panel_finite_r315(root,out,meta):
 from decimal import Decimal
 raw=out/'raw';D=out.parent;S=root;p={'entry':meta['entry']};observed={}
 def read(path):
  path=Path(path);assert path.stat().st_size<=4*1024**2;return json.loads(path.read_text(encoding='utf-8-sig'))
 def ref(path):return {'path':str(path),'sha256':sha(path),'bytes':Path(path).stat().st_size}
 def save(path,value):
  path=Path(path);assert path.resolve().is_relative_to(out.resolve())and not path.exists()
  with path.open('x',encoding='utf-8',newline='\n')as stream:json.dump(value,stream,ensure_ascii=False,indent=2);stream.write('\n')
 audit=meta['semanticAudit'];path=root/audit['logicalPath'];assert sha(path)==audit['sha256']
 scope={'Path':Path,'Decimal':Decimal,'read':read,'save':save,'ref':ref,'raw':raw,'D':D,'S':S,'p':p,'observed':observed}
 exec(compile(path.read_text(encoding='utf-8'),str(path),'exec'),scope)
 observed.update(diagnostics=[],harnessErrors=[],sourceApproval=False,PPR='HOLD',quoteScope='HOLD',FULL=False)
 save(out/'exact-panel-finite13-audit.json',observed);return observed



def restore_committed_runtime_json(root,out,spec,commit):
 meta=json.loads((root/'scripts/verification/gox-current-types-v1/panel-finite-r315.json').read_text(encoding='utf-8'))
 held=meta['heldRuntimeJsonInputs'];canonical=json.dumps(held,sort_keys=True,separators=(',',':')).encode()
 assert len(held)==307 and hashlib.sha256(canonical).hexdigest()=='64fb24a23506a140c5a4ece2b220fcc1ca97313f91b02bf02b5160166d82f0da','EXACT_REVIEWED_307_RUNTIME_JSON_INPUT_SET'
 assert all(k.startswith('node_modules/')and k.endswith('.json')and'..'not in Path(k).parts and any(marker in k for marker in ['/.vite/vitest/','/android/build/','/android/.cxx/'])for k in held)
 assert not(set(held)&set(spec['dependencyPins'])),'NO_ACCEPTED_TYPE_DEPENDENCY_OVERWRITE'
 assert all(spec['sourcePins'].get(k)==h==meta['runtimeVendorPins'].get(k)for k,h in held.items()),'HELD_BYTES_MUST_MATCH_BOTH_PREVIOUS_VENDOR_AND_NEW_COMMITTED_SOURCE_PINS'
 from restore_exact_git_blobs import restore_exact_git_blobs
 result=restore_exact_git_blobs(root,commit,held)
 assert result['status']=='PASS_RAW_GIT_PIN_BYTES'and result['checkedPins']==307 and result['sourceCommit']==commit and result.get('noOwnedProcessStillRunning',result['batchProcesses']==0)is True and result['noGitMetadataMutation']is True
 assert all((root/k).is_file()and not(root/k).is_symlink()and sha(root/k)==h for k,h in held.items())
 report=out/'committed-runtime-json-restoration.json';assert not report.exists()
 body={'contract':'exact-held-runtime-json-restoration-before-source-guard/v1','status':'PASS_EXACT_COMMITTED_RUNTIME_JSON_RESTORATION_BEFORE_GUARD','sourceCommit':commit,'approvedInputCount':307,'approvedHeldBytes':2512250,'approvedKeyMapSha256':'64fb24a23506a140c5a4ece2b220fcc1ca97313f91b02bf02b5160166d82f0da','actualRestore':result,'Node':0,'SQL':0,'sourceApproval':False,'FULL':False}
 with report.open('x',encoding='utf-8',newline='\n')as stream:json.dump(body,stream,indent=2);stream.write('\n')


if __name__=='__main__':main()
