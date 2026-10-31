"""Small raw Git bootstrap before hash-pinned helper imports (no build starts)."""
import argparse,hashlib,json,pathlib,re,subprocess,tempfile,os
PREFIX='scripts/verification/android-waterproof-current-v1/'
FILES=[PREFIX+n for n in ['bootstrap_exact_workflow.py','restore_exact_git_blobs.py','build_current_apk.py','owned_launcher_job.py','owned_launcher_job_snapshot_retry_v1.py','resource_verifier.py','native48-reference.json','precomputed.init.gradle']]
def bootstrap(root,commit,spec_path,spec_sha):
 root=pathlib.Path(root).resolve();assert re.fullmatch('[a-f0-9]{40}',commit)and re.fullmatch('[a-f0-9]{64}',spec_sha)
 assert re.fullmatch(re.escape(PREFIX)+r'inputs/[A-Za-z0-9._/-]+\.json',spec_path)and'..'not in spec_path
 assert subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()==commit
 paths=[spec_path,*FILES];raw=subprocess.check_output(['git','-C',str(root),'cat-file','--batch'],input=''.join(commit+':'+p+'\n'for p in paths).encode(),timeout=15)
 assert len(raw)<=4*1048576,'WORKFLOW_BOOTSTRAP_BATCH_TOO_LARGE'
 import io
 stream=io.BytesIO(raw);accepted=[]
 for rel in paths:
  m=re.fullmatch(rb'[a-f0-9]{40} blob ([0-9]+)\n',stream.readline(512));assert m,'WORKFLOW_BLOB_MISSING:'+rel
  count=int(m[1]);assert count<=2*1048576,'WORKFLOW_BLOB_TOO_LARGE'
  blob=stream.read(count);assert len(blob)==count and stream.read(1)==b'\n'
  if rel==spec_path:assert hashlib.sha256(blob).hexdigest()==spec_sha,'FRESH_SPEC_GIT_BLOB_SHA256_MISMATCH'
  accepted.append((rel,blob))
 assert stream.read(1)==b''
 restored=[]
 for rel,blob in accepted:
  p=root/rel;assert p.resolve().is_relative_to(root)
  if not p.is_file()or p.read_bytes()!=blob:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(blob);restored.append(rel)
 return dict(status='PASS_EXACT_WORKFLOW_GIT_BLOBS',workflowCommit=commit,restoredPaths=restored,batchProcesses=1,privateDataTransferred=False,noBuildStarted=True)
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--commit',required=True);p.add_argument('--path',required=True);p.add_argument('--sha256',required=True);p.add_argument('--report',required=True);a=p.parse_args()
 result=bootstrap(a.root,a.commit,a.path,a.sha256);pathlib.Path(a.report).write_text(json.dumps(result,indent=2)+'\n',encoding='utf8');print(json.dumps(dict(status=result['status'],restoredPaths=result['restoredPaths'])))
if __name__=='__main__':main()
