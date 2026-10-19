"""Execute the exact R13 source on the existing Windows CI service, with owned jobs."""
import ctypes, datetime, hashlib, json, os, pathlib, shutil, subprocess, sys, time
R=pathlib.Path('C:/dev/rik-expo-app-r4a5-dc4f0ce7')
S=R/'scripts/verification/current-core-wave-r13'
N=pathlib.Path('C:/Users/User/Documents/Codex/2026-10-19/new-chat/work')
OUT=R/'.release-runtime/current-core-wave-r13-ci'
assert pathlib.Path.cwd()==R
def sha(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,x):
 p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x',encoding='utf-8',newline='\n')as f:f.write(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
manifest=read(S/'manifest.json')
snapshot_head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert os.environ.get('GITHUB_ACTIONS')=='true' and snapshot_head==os.environ['GITHUB_SHA']
assert not OUT.exists();OUT.mkdir(parents=True);N.mkdir(parents=True,exist_ok=True)
restored=0
for rel,h in manifest['sourcePins'].items():
 p=R/rel;p.resolve().relative_to(R.resolve())
 if not p.exists()or sha(p)!=h:
  raw=subprocess.check_output(['git','cat-file','blob',snapshot_head+':'+rel]);assert hashlib.sha256(raw).hexdigest()==h
  p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw);restored+=1
 assert sha(p)==h,('SOURCE_PIN',rel)
for item in manifest['externalFiles']:
 p=pathlib.Path(item['destination']);normalized=p.as_posix()
 assert normalized.startswith(('C:/dev/rik-expo-app-r4a5-dc4f0ce7/','C:/Users/User/Documents/Codex/')) and '..'not in p.parts
 src=S/item['payload'];assert sha(src)==item['sha256']
 p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists():assert sha(p)==item['sha256']
 else:shutil.copyfile(src,p)
 assert sha(p)==item['sha256']
for name in ['owned_launcher_job.py','owned_launcher_job_snapshot_retry_v1.py']:
 assert sha(S/name)==manifest['helperPins'][name]
sys.path.insert(0,str(S));import psutil
from owned_launcher_job_snapshot_retry_v1 import OwnedLauncherJob
MiB=1024**2
class PI(ctypes.Structure):
 _fields_=[('cb',ctypes.c_ulong),*[(n,ctypes.c_size_t)for n in ['CommitTotal','CommitLimit','CommitPeak','PhysicalTotal','PhysicalAvailable','SystemCache','KernelTotal','KernelPaged','KernelNonpaged','PageSize']],('HandleCount',ctypes.c_ulong),('ProcessCount',ctypes.c_ulong),('ThreadCount',ctypes.c_ulong)]
get=ctypes.WinDLL('psapi',use_last_error=True).GetPerformanceInfo;get.argtypes=[ctypes.POINTER(PI),ctypes.c_ulong];get.restype=ctypes.c_int
def memory():
 p=PI();p.cb=ctypes.sizeof(p);assert get(ctypes.byref(p),p.cb)
 return p.PhysicalAvailable*p.PageSize,(p.CommitLimit-p.CommitTotal)*p.PageSize
node=shutil.which('node');assert node
assert subprocess.check_output([node,'--version'],text=True).strip()=='v20.19.6'
env=dict(os.environ)
for key in list(env):
 if key.startswith(('EXPO_PUBLIC_','LOCAL_DEVELOPER_','SUPABASE_','SENTRY_'))or key in ['NODE_OPTIONS','NODE_PATH']:env.pop(key,None)
stages=[]
def pinned_sources():
 for rel,h in manifest['sourcePins'].items():assert sha(R/rel)==h,('SOURCE_DRIFT',rel)
def run(argv,label,*,full=False):
 started=time.monotonic();job=child=None;owned={};error=None;code=None;rss_peak=private_peak=0;minfree=mincommit=2**63
 admission=(6720 if full else 4672)*MiB;commit_gate=(4160 if full else 3072)*MiB
 rss_cap=(3072 if full else 1024)*MiB;private_cap=(3584 if full else 1536)*MiB
 logs=[(OUT/(label+'-'+suffix+'.log')).open('xb')for suffix in ['stdout','stderr']]
 samples=(OUT/(label+'-samples.jsonl')).open('x',encoding='utf-8')
 try:
  pinned_sources()
  for _ in range(3):
   free,commit=memory();assert free>=admission and commit>=commit_gate,'RESOURCE_ADMISSION';time.sleep(.2)
  job=OwnedLauncherJob()
  child=subprocess.Popen(argv,cwd=R,env=env,stdin=subprocess.DEVNULL,stdout=logs[0],stderr=logs[1],creationflags=subprocess.CREATE_NO_WINDOW|0x00000004)
  owned[child.pid]=psutil.Process(child.pid).create_time();job.assign_and_resume_suspended(child)
  while True:
   rss=private=0
   for pid in job.pids():
    try:
     p=psutil.Process(pid);owned[pid]=p.create_time();m=p.memory_info();rss+=m.rss;private+=m.private
    except psutil.NoSuchProcess:pass
   m=psutil.Process().memory_info();rss+=m.rss;private+=m.private
   free,commit=memory();rss_peak=max(rss_peak,rss);private_peak=max(private_peak,private);minfree=min(minfree,free);mincommit=min(mincommit,commit)
   samples.write(json.dumps(dict(s=time.monotonic()-started,rss=rss,private=private,free=free,commit=commit))+'\n');samples.flush()
   assert free>=3584*MiB and commit>=512*MiB,'HEADROOM_STOP'
   assert rss<=rss_cap and private<=private_cap,'OWNED_TREE_CAP_STOP'
   assert time.monotonic()-started<(1200 if full else 180),'BOUNDED_TIMEOUT'
   code=child.poll()
   if code is not None:break
   time.sleep(.1)
  if code!=0:error='CHILD_EXIT_'+str(code)
 except BaseException as e:error=repr(e)
 finally:
  if job:
   job.terminate()
   if child:
    try:child.wait(timeout=5)
    except subprocess.TimeoutExpired:error=error or 'OWNED_CHILD_WAIT_TIMEOUT'
   job.close()
  samples.close()
  for f in logs:f.close()
  remaining=[]
  for pid,created in owned.items():
   try:
    if psutil.Process(pid).create_time()==created:remaining.append(pid)
   except psutil.NoSuchProcess:pass
  if remaining:error=error or 'OWNED_PROCESSES_REMAIN'
  try:pinned_sources()
  except BaseException as e:error=error or repr(e)
  receipt=dict(stage=label,status='PASS_EXECUTION'if not error else'NOT_ACCEPTED',error=error,exitCode=code,argv=argv,snapshotHead=snapshot_head,originalSourceFreeze=manifest['originalSourceFreeze'],elapsedSeconds=time.monotonic()-started,peakCombinedRssBytes=rss_peak,peakCombinedPrivateBytes=private_peak,minimumAvailablePhysicalBytes=None if minfree==2**63 else minfree,minimumCommitHeadroomBytes=None if mincommit==2**63 else mincommit,noOwnedProcessStillRunning=not remaining,remainingOwnedProcesses=remaining,foreignProcessesTerminated=False,rssCapBytes=rss_cap,privateCapBytes=private_cap,osReserveBytes=3072*MiB,earlyStopPhysicalBytes=3584*MiB,admissionPhysicalBytes=admission,admissionCommitBytes=commit_gate)
  write(OUT/(label+'-receipt.json'),receipt);stages.append(receipt)
  print(json.dumps({k:receipt[k]for k in ['stage','status','error','elapsedSeconds','peakCombinedRssBytes']}),flush=True)
 return error is None

try:
 seed=R/'.release-runtime/delivery16-integration/virtual-files.json'
 env['DELIVERY16_CURRENT_TSC_GUARD_RUN_ID']='core-r13-ci'
 type_out=N/'core-r13-ci-types.json'
 run([node,'--max-old-space-size=2048','--max-semi-space-size=8',str(N/'typecheck_construction_groups_r13.mjs'),str(type_out),'--expected-head',snapshot_head,'--seed-manifest-sha256',sha(seed),'--guard-run-id','core-r13-ci'],'full-types',full=True)
 if type_out.exists():
  report=read(type_out);shutil.copyfile(type_out,OUT/'full-types-result.json')
  for p in N.glob(type_out.name+'.*'):shutil.copyfile(p,OUT/p.name)
  assert report['allSeedFilesActuallyCompiled'] and len(report['seedFiles'])==manifest['typeSeedCount']
  for item in report.get('compilerFilesAfter',[]):
   p=pathlib.Path(item['path'])
   try:rel=p.relative_to(R).as_posix()
   except ValueError:raise AssertionError(('NONCANONICAL_PROGRAM_SOURCE',str(p)))
   if not rel.startswith('node_modules/'):
    assert manifest['sourcePins'].get(rel)==item['sha256'],('UNPINNED_OR_DIFFERENT_CI_GRAPH_SOURCE',rel)
 else:raise AssertionError('TYPE_REPORT_MISSING')
 # Fresh Node process for each suite; no skipped/failing suite is dropped.
 spec=read(N/'construction-groups-canonical-checks-r13/canonical-jest-construction-groups-inputs-r13.json')
 suite_results=[]
 for i,suite in enumerate(spec['suites']):
  output=OUT/(f'jest-{i:02d}-result.json')
  ok=run([node,'--max-old-space-size=384','--max-semi-space-size=8',str(R/'node_modules/jest/bin/jest.js'),'--config',str(N/'construction-groups-canonical-checks-r13/canonical-jest-construction-groups-config-r13.cjs'),'--runTestsByPath',suite['path'],'--runInBand','--json','--outputFile',str(output),'--silent','--no-cache'],f'jest-{i:02d}')
  result=read(output)if output.exists()else{}
  accepted=ok and result.get('success')is True and result.get('numFailedTests')==0 and result.get('numPendingTests')==0 and result.get('numTodoTests',0)==0 and result.get('numTotalTestSuites')==1 and result.get('numPassedTests',0)>0
  if suite['expectedPassingTests']is not None:accepted=accepted and result.get('numPassedTests')==suite['expectedPassingTests']
  suite_results.append(dict(path=suite['path'],expectedPassingTests=suite['expectedPassingTests'],passingTests=result.get('numPassedTests'),accepted=accepted))
 write(OUT/'jest-suite-summary.json',dict(suites=suite_results,passed=sum(x['passingTests']or 0 for x in suite_results),allSuitesAccepted=all(x['accepted']for x in suite_results)))
except BaseException as e:
 write(OUT/'driver-error.json',dict(error=repr(e)))
 print(repr(e),flush=True)
finally:
 all_types=read(OUT/'full-types-result.json')if(OUT/'full-types-result.json').exists()else{}
 jest=read(OUT/'jest-suite-summary.json')if(OUT/'jest-suite-summary.json').exists()else{}
 accepted=not(OUT/'driver-error.json').exists()and all_types.get('status')=='PASS_CURRENT_CANONICAL_AFFECTED_FULL_TYPESCRIPT_PROGRAM'and jest.get('allSuitesAccepted')is True and all(s['status']=='PASS_EXECUTION'for s in stages)
 write(OUT/'summary.json',dict(status='PASS_R13_EXACT_SOURCE_TYPES_AND35_JEST_SUITES_ONLY'if accepted else'NOT_ACCEPTED_R13_CI',snapshotHead=snapshot_head,originalSourceFreeze=manifest['originalSourceFreeze'],sourceFilesPinned=len(manifest['sourcePins']),restoredRawCheckoutFiles=restored,typeSeedCount=manifest['typeSeedCount'],typeProgramFiles=all_types.get('fullProgramFileCount'),typeDiagnostics=len(all_types.get('diagnostics',[])),jestPassingTests=jest.get('passed'),jestSuites=len(jest.get('suites',[])),stageCount=len(stages),astraCalls=0,SQL=False,publication=False,Web=False,Android=False,platformCoreDelivered=False))
 if not accepted:sys.exit(1)
