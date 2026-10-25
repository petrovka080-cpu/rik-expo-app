"""Full actual TypeScript program on an exact CI source snapshot, one owned job."""
from pathlib import Path
import argparse,ctypes,hashlib,json,os,re,subprocess,sys,time

def sha(p):
 with Path(p).open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
class PI(ctypes.Structure):
 _fields_=[('cb',ctypes.c_ulong),*[(n,ctypes.c_size_t)for n in ['CommitTotal','CommitLimit','CommitPeak','PhysicalTotal','PhysicalAvailable','SystemCache','KernelTotal','KernelPaged','KernelNonpaged','PageSize']],('HandleCount',ctypes.c_ulong),('ProcessCount',ctypes.c_ulong),('ThreadCount',ctypes.c_ulong)]
def memory():
 p=PI();p.cb=ctypes.sizeof(p);fn=ctypes.WinDLL('psapi',use_last_error=True).GetPerformanceInfo
 fn.argtypes=[ctypes.POINTER(PI),ctypes.c_ulong];fn.restype=ctypes.c_int;assert fn(ctypes.byref(p),p.cb)
 return p.PhysicalAvailable*p.PageSize,(p.CommitLimit-p.CommitTotal)*p.PageSize

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--root',required=True);parser.add_argument('--commit',required=True);parser.add_argument('--output',required=True);a=parser.parse_args()
 assert os.environ.get('GITHUB_ACTIONS')=='true'and os.name=='nt','WINDOWS_CI_ONLY'
 root=Path(a.root).resolve();out=Path(a.output).resolve();assert out.is_dir()and not(out/'receipt.json').exists()
 assert re.fullmatch('[a-f0-9]{40}',a.commit)
 import psutil
 helpers=root/'scripts/verification/android-waterproof-current-v1';sys.path.insert(0,str(helpers))
 from owned_launcher_job_snapshot_retry_v1 import OwnedLauncherJob
 MiB=1024**2;job=None;child=None;owned={};error=None;code=None;peakrss=peakprivate=0;minfree=mincommit=2**63;start=time.monotonic();remaining=[];source_drift=[];dependency_drift=[]
 manifest_path=root/'scripts/verification/gox-current-types-v1/input-manifest.json'
 restored=json.loads((out/'source-restore.json').read_text(encoding='utf-8'))
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
  source_drift=check(source);dependency_drift=check(deps)
  assert not source_drift,'SOURCE_PIN_DRIFT';assert not dependency_drift,'LOCKED_DEPENDENCY_PIN_DRIFT'
  free,commit=memory();minfree=free;mincommit=commit
  assert free>=4096*MiB and commit>=3072*MiB,'FULL_TYPES_RESOURCE_ADMISSION'
  worker=root/'scripts/verification/gox-current-types-v1/typecheck.mjs';seed=root/'scripts/verification/gox-current-types-v1/seed-manifest.json'
  node=subprocess.check_output(['where.exe','node.exe'],text=True).splitlines()[0]
  run='gox_ci_'+os.environ['GITHUB_RUN_ID'];env=dict(os.environ);env.pop('NODE_OPTIONS',None)
  env.update(DELIVERY16_CURRENT_TSC_GUARD_RUN_ID=run,GOX_TYPES_OUTPUT_ROOT=out.as_posix())
  args=[node,'--max-old-space-size=2560','--max-semi-space-size=8',str(worker),str(out/'full-result.json'),
   '--expected-head',a.commit,'--seed-manifest-sha256',sha(seed),'--guard-run-id',run]
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
    assert rss<=3072*MiB and private<=3584*MiB,'OWNED_TREE_CAP_STOP'
    assert free>=3072*MiB and commit>=512*MiB,'OS_RESERVE_STOP'
    assert time.monotonic()-start<1200,'FULL_TYPES_TIMEOUT'
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
  source_drift=check(source);dependency_drift=check(deps)
  result=json.loads((out/'full-result.json').read_text(encoding='utf-8'))if(out/'full-result.json').exists()else{}
  passed=error is None and code==0 and result.get('status')=='PASS_CURRENT_CANONICAL_AFFECTED_FULL_TYPESCRIPT_PROGRAM'and result.get('diagnostics')==[]and not remaining and not source_drift and not dependency_drift
  receipt=dict(status='PASS_EXACT_CURRENT_CORE_FULL_TYPES_CI'if passed else'NOT_ACCEPTED',error=error,exitCode=code,sourceSnapshotCommit=a.commit,
   sourcePins=len(source),dependencyPins=len(deps),sourceDrift=source_drift,dependencyDrift=dependency_drift,
   diagnostics=len(result['diagnostics'])if'diagnostics'in result else None,harnessErrors=result.get('harnessErrors'),seedCount=len(result.get('seedFiles',[])),fullProgramFileCount=result.get('fullProgramFileCount'),
   resourcePolicy=dict(stage='FULL_TYPESCRIPT_PROGRAM',admissionPhysicalMiB=4096,admissionCommitMiB=3072,maxOwnedRssMiB=3072,maxOwnedPrivateMiB=3584,osPhysicalReserveMiB=3072,commitStopMiB=512),
   peakOwnedRssBytes=peakrss,peakOwnedPrivateBytes=peakprivate,minimumPhysicalFreeBytes=minfree,minimumCommitHeadroomBytes=mincommit,remainingOwnedProcesses=remaining,
   elapsedSeconds=time.monotonic()-start,applicationRuntimeStarted=False,databaseWrites=False,publicationPerformed=False,productionActivation=False)
  (out/'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps(receipt))
  if not passed:raise SystemExit(1)

if __name__=='__main__':main()
