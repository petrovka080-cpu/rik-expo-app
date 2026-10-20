"""CI only: restore exact reviewed public source bytes from this checkout's commit."""
from pathlib import Path
import argparse,hashlib,json,os,re,subprocess,sys

def main():
 p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--commit',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 assert os.environ.get('GITHUB_ACTIONS')=='true','CI_ONLY'
 root=Path(a.root).resolve();out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
 assert re.fullmatch('[a-f0-9]{40}',a.commit)
 assert subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()==a.commit
 rel='scripts/verification/gox-current-types-v1/input-manifest.json'
 raw=subprocess.check_output(['git','-C',str(root),'show',a.commit+':'+rel]);assert len(raw)<=2*1024*1024
 spec=json.loads(raw);assert spec['contract']=='gox-full-affected-types-source-snapshot/r1'
 assert spec['containsApplicationSecrets']is False and spec['savedHistoryIncluded']is False
 pins={**spec['sourcePins'],rel:hashlib.sha256(raw).hexdigest()};assert len(pins)<=6000
 helper=root/'scripts/verification/android-waterproof-current-v1'
 sys.path.insert(0,str(helper));from restore_exact_git_blobs import restore_exact_git_blobs
 report=restore_exact_git_blobs(root,a.commit,pins)
 report.update(sourceSnapshotKind=spec['snapshotKind'],seedProjectionSourceSha256=spec['originalSeedManifestSha256'],
  inputManifestSha256=hashlib.sha256(raw).hexdigest(),databaseOrApplicationRuntimeStarted=False)
 (out/'source-restore.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
 print(json.dumps(dict(status=report['status'],sourceCommit=a.commit,checkedPins=len(pins))))

if __name__=='__main__':main()
