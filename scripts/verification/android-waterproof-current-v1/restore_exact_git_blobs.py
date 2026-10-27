"""Restore reviewed checkout bytes from one bounded raw git blob batch.
The expected SHA256 stays authoritative; no normalization or relabeling.
All blobs pass before any source file is replaced. No Git/index mutation.
"""
import argparse,ctypes,hashlib,json,os,pathlib,re,subprocess,tempfile,time
HERE=pathlib.Path(__file__).resolve().parent;MIB=1048576
def sha(p):
 with pathlib.Path(p).open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
def safe(root,rel):
 assert isinstance(rel,str)and rel and not any(c in rel for c in '\\:\r\n\0')and not pathlib.PurePosixPath(rel).is_absolute(),'UNSAFE_GIT_PATH'
 assert all(p not in ('','.','..','.git')for p in rel.split('/')),'UNSAFE_GIT_PATH'
 p=(root/rel).resolve();assert p.is_relative_to(root.resolve()),'GIT_PATH_ESCAPES_ROOT';return p
class PI(ctypes.Structure):
 _fields_=[('cb',ctypes.c_ulong),*[(n,ctypes.c_size_t)for n in ['CommitTotal','CommitLimit','CommitPeak','PhysicalTotal','PhysicalAvailable','SystemCache','KernelTotal','KernelPaged','KernelNonpaged','PageSize']],('HandleCount',ctypes.c_ulong),('ProcessCount',ctypes.c_ulong),('ThreadCount',ctypes.c_ulong)]
class PMC(ctypes.Structure):
 _fields_=[('cb',ctypes.c_ulong),('PageFaultCount',ctypes.c_ulong),*[(n,ctypes.c_size_t)for n in ['PeakWorkingSetSize','WorkingSetSize','QuotaPeakPagedPoolUsage','QuotaPagedPoolUsage','QuotaPeakNonPagedPoolUsage','QuotaNonPagedPoolUsage','PagefileUsage','PeakPagefileUsage','PrivateUsage']]]
def available():
 p=PI();p.cb=ctypes.sizeof(p);fn=ctypes.WinDLL('psapi',use_last_error=True).GetPerformanceInfo
 fn.argtypes=[ctypes.POINTER(PI),ctypes.c_ulong];fn.restype=ctypes.c_int
 assert fn(ctypes.byref(p),p.cb),'GIT_PREFLIGHT_MEMORY_QUERY';return p.PhysicalAvailable*p.PageSize,(p.CommitLimit-p.CommitTotal)*p.PageSize
def rss(pid):
 kernel=ctypes.WinDLL('kernel32',use_last_error=True);fn=kernel.OpenProcess;fn.argtypes=[ctypes.c_ulong,ctypes.c_int,ctypes.c_ulong];fn.restype=ctypes.c_void_p
 h=fn(0x1010,False,pid)
 if not h:return 0
 try:
  p=PMC();p.cb=ctypes.sizeof(p);read=ctypes.WinDLL('psapi',use_last_error=True).GetProcessMemoryInfo
  read.argtypes=[ctypes.c_void_p,ctypes.POINTER(PMC),ctypes.c_ulong];read.restype=ctypes.c_int
  return p.WorkingSetSize if read(h,ctypes.byref(p),p.cb)else 0
 finally:kernel.CloseHandle.argtypes=[ctypes.c_void_p];kernel.CloseHandle(h)
def batch(root,commit,paths,temporary):
 assert sha(HERE/'owned_launcher_job.py')=='9b7f796d63045d06a72991a319bfc6e251fc4212ef0e10611b76060aea969242'
 assert sha(HERE/'owned_launcher_job_snapshot_retry_v1.py')=='eca1e2d3a3a420a90d874c4a87f92faf37a35fc6e13ea2d9b13bf27fa92d19c1'
 from owned_launcher_job_snapshot_retry_v1 import OwnedLauncherJob
 request=temporary/'requests';request.write_bytes(''.join(commit+':'+p+'\n'for p in paths).encode())
 output=temporary/'raw';error=temporary/'stderr';free,commit_free=available();assert free>=1280*MIB and commit_free>=512*MIB,'GIT_PREFLIGHT_HEADROOM'
 job=OwnedLauncherJob();child=None;start=time.monotonic();peak=0
 try:
  with request.open('rb')as stdin,output.open('wb')as stdout,error.open('wb')as stderr:
   child=subprocess.Popen(['git','-c','core.packedGitLimit=16m','-c','core.packedGitWindowSize=4m','-c','core.deltaBaseCacheLimit=8m','-C',str(root),'cat-file','--batch'],stdin=stdin,stdout=stdout,stderr=stderr,creationflags=subprocess.CREATE_NO_WINDOW|0x00000004)
   job.assign_and_resume_suspended(child)
   while True:
    peak=max(peak,rss(os.getpid())+sum(rss(p)for p in job.pids()));free,commit_free=available()
    assert peak<=128*MIB and free>=1280*MIB and commit_free>=512*MIB,'GIT_PREFLIGHT_RESOURCE_STOP'
    assert output.stat().st_size<=512*MIB and time.monotonic()-start<60,'GIT_PREFLIGHT_SIZE_OR_TIME_STOP'
    code=child.poll()
    if code is not None:break
    time.sleep(.02)
   assert code==0,'GIT_RAW_BATCH_FAILED'
 finally:
  job.terminate()
  if child:child.wait(timeout=5)
  assert not job.pids(),'GIT_PREFLIGHT_OWNED_CHILD_REMAINS'
  job.close()
 return output,dict(batchProcesses=1,peakCombinedRssBytes=peak,elapsedSeconds=time.monotonic()-start,noOwnedProcessStillRunning=True)
def restore_exact_git_blobs(root,commit,pins):
 root=pathlib.Path(root).resolve();assert re.fullmatch('[a-f0-9]{40}',commit),'EXACT_GIT_COMMIT_REQUIRED'
 assert isinstance(pins,dict)and 0<len(pins)<=6000,'GIT_PIN_COUNT_OUT_OF_BOUND'
 assert subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()==commit,'GIT_HEAD_MISMATCH'
 changed=[];preimages={}
 for rel,expected in sorted(pins.items()):
  p=safe(root,rel);assert re.fullmatch('[a-f0-9]{64}',expected),'EXPECTED_SHA256_REQUIRED'
  actual=sha(p)if p.is_file()else None
  if actual!=expected:changed.append(rel);preimages[rel]=actual
 report=dict(status='PASS_RAW_GIT_PIN_BYTES',sourceCommit=commit,checkedPins=len(pins),restoredPaths=[],batchProcesses=0,noGitMetadataMutation=True)
 if not changed:return report
 with tempfile.TemporaryDirectory(prefix='gox-raw-git-',dir=root.parent)as directory:
  temp=pathlib.Path(directory);raw,measure=batch(root,commit,changed,temp);staged=[];total=0
  with raw.open('rb')as stream:
   for index,rel in enumerate(changed):
    header=stream.readline(512);match=re.fullmatch(rb'([0-9a-f]{40}|[0-9a-f]{64}) blob ([0-9]+)\n',header);assert match,'GIT_BLOB_MISSING_OR_NOT_BLOB:'+rel
    count=int(match[2]);total+=count;assert count<=64*MIB and total<=512*MIB,'GIT_BLOB_BYTES_OUT_OF_BOUND'
    staged_path=temp/('blob-'+str(index));digest=hashlib.sha256();left=count
    with staged_path.open('wb')as target:
     while left:
      block=stream.read(min(MIB,left));assert block,'TRUNCATED_GIT_BLOB';target.write(block);digest.update(block);left-=len(block)
    assert stream.read(1)==b'\n','GIT_BATCH_SEPARATOR'
    assert digest.hexdigest()==pins[rel],'GIT_BLOB_EXPECTED_SHA256_MISMATCH:'+rel
    staged.append((rel,staged_path))
   assert stream.read(1)==b'','GIT_BATCH_EXTRA_OUTPUT'
  # Preserve any later local edit; CI must not silently overwrite source drift.
  for rel,_ in staged:
   target=safe(root,rel);assert(sha(target)if target.is_file()else None)==preimages[rel],'SOURCE_CHANGED_DURING_RAW_RESTORE:'+rel
  for rel,p in staged:
   target=safe(root,rel);target.parent.mkdir(parents=True,exist_ok=True);os.replace(p,target)
  for rel in pins:assert sha(safe(root,rel))==pins[rel],'RESTORED_GIT_PIN_MISMATCH:'+rel
  report.update(measure);report.update(restoredPaths=changed,restoredBytes=total)
 return report
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--commit',required=True);p.add_argument('--path',required=True);p.add_argument('--sha256',required=True);p.add_argument('--report',required=True);a=p.parse_args()
 result=restore_exact_git_blobs(a.root,a.commit,{a.path:a.sha256});pathlib.Path(a.report).write_text(json.dumps(result,indent=2)+'\n',encoding='utf8');print(json.dumps(dict(status=result['status'],restoredPaths=result['restoredPaths'])))
if __name__=='__main__':main()
