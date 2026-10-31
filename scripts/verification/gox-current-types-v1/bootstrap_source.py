"""CI only: restore exact reviewed public source bytes from this checkout's commit."""
from pathlib import Path
import argparse,hashlib,json,os,re,subprocess,sys,tempfile

def restore_bootstrap_helpers(root,commit,pins,out):
 helpers=['owned_launcher_job.py','owned_launcher_job_snapshot_retry_v1.py','restore_exact_git_blobs.py']
 staged=[];preimages={}
 with tempfile.TemporaryDirectory(prefix='gox-bootstrap-',dir=out)as directory:
  temporary=Path(directory).resolve();assert temporary.is_relative_to(out.resolve())
  for name in helpers:
   rel='scripts/verification/android-waterproof-current-v1/'+name;target=(root/rel).resolve()
   assert target.is_relative_to(root.resolve())and re.fullmatch('[a-f0-9]{64}',pins[rel])
   preimages[rel]=hashlib.sha256(target.read_bytes()).hexdigest()
   raw=temporary/name
   with raw.open('xb')as stream:
    subprocess.run(['git','-C',str(root),'cat-file','blob',commit+':'+rel],stdout=stream,stderr=subprocess.PIPE,check=True,timeout=20)
   assert raw.stat().st_size<=65536 and hashlib.sha256(raw.read_bytes()).hexdigest()==pins[rel],'BOOTSTRAP_HELPER_RAW_PIN_MISMATCH'
   staged.append((rel,raw))
  for rel,_ in staged:assert hashlib.sha256((root/rel).read_bytes()).hexdigest()==preimages[rel],'BOOTSTRAP_HELPER_SOURCE_DRIFT'
  for rel,raw in staged:os.replace(raw,root/rel)
  for rel,_ in staged:assert hashlib.sha256((root/rel).read_bytes()).hexdigest()==pins[rel]
 return len(staged)

def main():
 p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--commit',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 assert os.environ.get('GITHUB_ACTIONS')=='true','CI_ONLY'
 root=Path(a.root).resolve();out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
 assert re.fullmatch('[a-f0-9]{40}',a.commit)
 assert subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()==a.commit
 (out/'bootstrap-started.json').write_text(json.dumps(dict(status='BOOTSTRAP_STARTED',sourceCommit=a.commit)),encoding='utf-8')
 rel='scripts/verification/gox-current-types-v1/input-manifest.json'
 raw=subprocess.check_output(['git','-C',str(root),'show',a.commit+':'+rel]);assert len(raw)<=2*1024*1024
 spec=json.loads(raw);assert spec['contract']=='gox-full-affected-types-source-snapshot/r1'
 assert spec['containsApplicationSecrets']is False and spec['savedHistoryIncluded']is False
 pins={**spec['sourcePins'],rel:hashlib.sha256(raw).hexdigest()};assert len(pins)<=6000
 restored_helpers=restore_bootstrap_helpers(root,a.commit,pins,out)
 helper=root/'scripts/verification/android-waterproof-current-v1'
 sys.path.insert(0,str(helper));from restore_exact_git_blobs import restore_exact_git_blobs
 report=restore_exact_git_blobs(root,a.commit,pins)
 report.update(sourceSnapshotKind=spec['snapshotKind'],seedProjectionSourceSha256=spec['originalSeedManifestSha256'],
  inputManifestSha256=hashlib.sha256(raw).hexdigest(),bootstrapHelpersRestoredBeforeImport=restored_helpers,databaseOrApplicationRuntimeStarted=False)
 (out/'source-restore.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
 print(json.dumps(dict(status=report['status'],sourceCommit=a.commit,checkedPins=len(pins))))

if __name__=='__main__':main()
