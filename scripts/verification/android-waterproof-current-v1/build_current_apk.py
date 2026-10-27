"""Exact public snapshot -> serial official Metro/Hermes/Expo/WaterProof APK.
No PG, auth login, writer, deployment, emulator or signing changes. A prepares
the fresh sanitized public runtime capture and separately accepts downloaded UI.
"""
import argparse,base64,ctypes,hashlib,importlib.util,json,os,pathlib,re,shutil,subprocess,sys,time,zipfile
from datetime import datetime,timezone
HERE=pathlib.Path(__file__).resolve().parent
MIB=1048576
PUBLIC_KEYS=set('EXPO_PUBLIC_APP_ENV EXPO_PUBLIC_RELEASE_LABEL EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT EXPO_PUBLIC_BUILD_COMMIT EXPO_PUBLIC_BUILD_BRANCH EXPO_PUBLIC_BUILD_TIME EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT LOCAL_DEVELOPER_MASTER_SHA256'.split())
CERT='fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c'
def sha(p):
 with pathlib.Path(p).open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
def read(p):return json.loads(pathlib.Path(p).read_text(encoding='utf-8-sig'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def inside(root,rel):
 assert isinstance(rel,str)and'\\'not in rel and not pathlib.PurePosixPath(rel).is_absolute()and all(x not in ['.','..','']for x in rel.split('/')),'UNSAFE_RELATIVE_PATH'
 p=(root/rel).resolve();assert p.is_relative_to(root.resolve()),'PATH_ESCAPES_ROOT';return p
def utc(value):return datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(timezone.utc)
class PERFORMANCE_INFORMATION(ctypes.Structure):
 _fields_=[('cb',ctypes.c_ulong),('CommitTotal',ctypes.c_size_t),('CommitLimit',ctypes.c_size_t),('CommitPeak',ctypes.c_size_t),('PhysicalTotal',ctypes.c_size_t),('PhysicalAvailable',ctypes.c_size_t),('SystemCache',ctypes.c_size_t),('KernelTotal',ctypes.c_size_t),('KernelPaged',ctypes.c_size_t),('KernelNonpaged',ctypes.c_size_t),('PageSize',ctypes.c_size_t),('HandleCount',ctypes.c_ulong),('ProcessCount',ctypes.c_ulong),('ThreadCount',ctypes.c_ulong)]
def memory():
 p=PERFORMANCE_INFORMATION();p.cb=ctypes.sizeof(p)
 fn=ctypes.WinDLL('psapi',use_last_error=True).GetPerformanceInfo
 fn.argtypes=[ctypes.POINTER(PERFORMANCE_INFORMATION),ctypes.c_ulong];fn.restype=ctypes.c_int
 if not fn(ctypes.byref(p),p.cb):raise ctypes.WinError(ctypes.get_last_error())
 return dict(availablePhysicalBytes=p.PhysicalAvailable*p.PageSize,commitHeadroomBytes=(p.CommitLimit-p.CommitTotal)*p.PageSize)
def metadata(xml,name):
 lines=xml.splitlines();matches=[]
 for i,line in enumerate(lines):
  if re.search(r'\bE: meta-data\b',line):
   indent=len(line)-len(line.lstrip());block=[]
   for nxt in lines[i+1:]:
    if re.search(r'\bE:',nxt)and len(nxt)-len(nxt.lstrip())<=indent:break
    block.append(nxt)
   text='\n'.join(block)
   if '"'+name+'"'in text:matches.append(text)
 assert len(matches)==1,'PACKAGED_METADATA_MISSING_OR_DUPLICATE:'+name
 return matches[0]
def validate_contract(s,root,snapshot):
 assert set(s)==set('contract status sourceSnapshotCommit variant abi certificateSha256 noPrivateDataTransferred freshOwnerRuntimeReadPerformed capturedAt maximumCaptureAgeSeconds usableUntil publicEnvironment canonicalSourceHead sourceIdentity pair capabilityId runtimeEvidenceSha256 sourcePins native48Pins sourceManifest'.split()),'UNAPPROVED_BUILD_CONTRACT_FIELD'
 assert s['contract']=='gox-public-android-waterproof-build/r1'and s['status']=='FRESH_PUBLIC_RUNTIME_CAPTURE_FOR_ANDROID_CI'
 assert s['sourceSnapshotCommit']==snapshot and re.fullmatch('[a-f0-9]{40}',snapshot)
 assert s['variant']=='waterProof'and s['abi']=='x86_64'and s['certificateSha256']==CERT
 assert s['noPrivateDataTransferred']is True and s['freshOwnerRuntimeReadPerformed']is True
 now=datetime.now(timezone.utc);assert 0<=(now-utc(s['capturedAt'])).total_seconds()<=s['maximumCaptureAgeSeconds']<=1800,'STALE_PUBLIC_RUNTIME_CAPTURE'
 assert utc(s['usableUntil'])>now,'EXPIRED_BUILD_INPUTS'
 env=s['publicEnvironment'];assert isinstance(env,dict)and set(env)==PUBLIC_KEYS and all(isinstance(v,str)for v in env.values()),'UNAPPROVED_OR_MISSING_ENVIRONMENT_KEY'
 assert re.fullmatch('[a-f0-9]{40}',s['canonicalSourceHead'])and set(s['sourceIdentity'])=={'sourceTreeHash','productSourceHash','jsBundleFingerprint'}
 assert all(re.fullmatch('[a-f0-9]{64}',v)for v in s['sourceIdentity'].values())and set(s['pair'])=={'definitionReleaseId','searchReleaseId'}
 assert all(re.fullmatch('[a-f0-9-]{36}',v)for v in [*s['pair'].values(),s['capabilityId']])
 expected={'EXPO_PUBLIC_BUILD_COMMIT':s['canonicalSourceHead'],'EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH':s['sourceIdentity']['sourceTreeHash'],
  'EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH':s['sourceIdentity']['productSourceHash'],'EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT':s['sourceIdentity']['jsBundleFingerprint'],
  'EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID':s['pair']['definitionReleaseId'],'EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID':s['pair']['searchReleaseId'],
  'EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID':s['capabilityId'],'EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL':'http://10.0.2.2:8765'}
 for key,value in expected.items():assert env.get(key)==value,'PUBLIC_RUNTIME_TUPLE_MISMATCH:'+key
 assert s['runtimeEvidenceSha256']and re.fullmatch('[a-f0-9]{64}',s['runtimeEvidenceSha256'])
 # The public anon/publishable client key is permitted, session/refresh/service keys are not.
 key=env.get('EXPO_PUBLIC_SUPABASE_ANON_KEY','')
 if key.count('.')==2:
  body=key.split('.')[1];claims=json.loads(base64.urlsafe_b64decode(body+'='*((4-len(body)%4)%4)));assert claims.get('role')=='anon','NON_ANON_KEY'
 else:assert key.startswith('sb_publishable_'),'PUBLIC_ANON_OR_PUBLISHABLE_KEY_REQUIRED'
 for pins in [s['sourcePins'],s['native48Pins']]:
  assert pins
  for rel,h in pins.items():assert re.fullmatch('[a-f0-9]{64}',h)and sha(inside(root,rel))==h,'SOURCE_PREIMAGE_CHANGED:'+rel
 assert len(s['native48Pins'])==48
 assert s['native48Pins']==read(HERE/'native48-reference.json'),'NATIVE48_BASELINE_CHANGED'
 assert all(s['sourcePins'].get(k)==v for k,v in s['native48Pins'].items()),'NATIVE48_NOT_IN_EXACT_SOURCE_MANIFEST'
 assert s['native48Pins']['android/app/debug.keystore']=='221e0a3106aa4c3ccc154e0a418b55020b3f9ea6e84f92e8749cd9e2f39f5e58'
 manifest=inside(root,s['sourceManifest']['path']);assert sha(manifest)==s['sourceManifest']['sha256']
 captured=read(manifest);assert captured['sourcePins']==s['sourcePins'],'EXACT_SNAPSHOT_FILE_SET_CHANGED'
 return expected
def inventory(root,dirs):
 return sorted([dict(path=p.relative_to(root).as_posix(),bytes=p.stat().st_size,sha256=sha(p))for d in dirs for p in d.rglob('*')if p.is_file()],key=lambda x:x['path'])
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',required=True);ap.add_argument('--spec',required=True);ap.add_argument('--spec-sha256',required=True);ap.add_argument('--source-commit',required=True);ap.add_argument('--output',required=True);ap.add_argument('--contract-only',action='store_true');a=ap.parse_args()
 root=pathlib.Path(a.root).resolve();out=pathlib.Path(a.output).resolve();assert not out.exists();out.mkdir(parents=True)
 assert sha(a.spec)==a.spec_sha256;s=read(a.spec)
 assert s['sourceSnapshotCommit']==a.source_commit,'WRONG_SNAPSHOT_BEFORE_RAW_RESTORE'
 from restore_exact_git_blobs import restore_exact_git_blobs
 manifest=s['sourceManifest'];manifest_restore=restore_exact_git_blobs(root,a.source_commit,{manifest['path']:manifest['sha256']})
 assert read(inside(root,manifest['path']))['sourcePins']==s['sourcePins'],'RESTORED_MANIFEST_PIN_SET_DIFFERS'
 # The whole product has more files than one raw-restore batch admits.
 # Reuse the existing helper serially; its6000pins/512MiB total/64MiB blob,
 #128MiB owned memory and60s bounds remain unchanged for every invocation.
 batches=[];group={};group_bytes=0;covered=[]
 for rel,digest in sorted(s['sourcePins'].items()):
  item=inside(root,rel);item_bytes=item.stat().st_size if item.is_file()else 0
  if group and(len(group)>=1000 or group_bytes+item_bytes>128*MIB):
   batches.append(restore_exact_git_blobs(root,a.source_commit,group));covered.extend(group);group={};group_bytes=0
  group[rel]=digest;group_bytes+=item_bytes
 if group:batches.append(restore_exact_git_blobs(root,a.source_commit,group));covered.extend(group)
 assert covered==sorted(s['sourcePins']),'SERIAL_RAW_RESTORE_COVERAGE_MISMATCH'
 assert all(sha(inside(root,rel))==digest for rel,digest in s['sourcePins'].items()),'SERIAL_RAW_RESTORE_FINAL_SOURCE_DRIFT'
 source_restore=dict(status='PASS_SERIAL_EXISTING_BOUNDED_RAW_RESTORE_UNION',checkedPins=len(covered),batches=batches,allOriginalPerBatchLimitsUnchanged=True,noGitMetadataMutation=True)
 write(out/'source-raw-restoration.json',dict(manifest=manifest_restore,source=source_restore))
 identity_literals=validate_contract(s,root,a.source_commit)
 assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==a.source_commit
 assert not subprocess.check_output(['git','diff','--name-only'],cwd=root),'TRACKED_SOURCE_DIRTY'
 if a.contract_only:write(out/'contract-result.json',dict(status='PASS_CONTRACT_ONLY',buildStarted=False));return
 import psutil
 assert sha(HERE/'owned_launcher_job.py')=='9b7f796d63045d06a72991a319bfc6e251fc4212ef0e10611b76060aea969242'
 assert sha(HERE/'owned_launcher_job_snapshot_retry_v1.py')=='eca1e2d3a3a420a90d874c4a87f92faf37a35fc6e13ea2d9b13bf27fa92d19c1'
 from owned_launcher_job_snapshot_retry_v1 import OwnedLauncherJob
 env={k:v for k,v in os.environ.items()if not(k.startswith(('EXPO_PUBLIC_','LOCAL_DEVELOPER_','SUPABASE_','SENTRY_'))or k in ['NODE_OPTIONS','NODE_PATH','CI','EXPO_OVERRIDE_METRO_CONFIG'])}
 env.update(s['publicEnvironment']);env.update(EXPO_NO_DOTENV='1',EXPO_NO_TELEMETRY='1',SENTRY_DISABLE_AUTO_UPLOAD='true',NODE_OPTIONS='--max-old-space-size=1024 --max-semi-space-size=8')
 sdk=pathlib.Path(os.environ.get('ANDROID_HOME',os.environ.get('ANDROID_SDK_ROOT','')));java=pathlib.Path(os.environ['JAVA_HOME'])/'bin/java.exe';node=shutil.which('node');assert node and sdk.is_dir()and java.is_file()
 receipts=[];check_source=lambda:all(sha(inside(root,k))==v for k,v in s['sourcePins'].items())
 def run(label,argv,cap=1024,timeout=300):
  assert check_source(),'SOURCE_DRIFT_BEFORE_'+label
  admission=memory();assert admission['availablePhysicalBytes']>=(3584+cap+64)*MIB and admission['commitHeadroomBytes']>=(cap+1024)*MIB,'RESOURCE_ADMISSION_'+label
  job=OwnedLauncherJob();child=None;peak=private=0;started=time.monotonic();error=None;code=None;owned={}
  try:
   with(out/(label+'.stdout.log')).open('wb')as stdout,(out/(label+'.stderr.log')).open('wb')as stderr:
    child=subprocess.Popen([str(v)for v in argv],cwd=root,env=env,stdin=subprocess.DEVNULL,stdout=stdout,stderr=stderr,creationflags=subprocess.CREATE_NO_WINDOW|0x00000004)
    job.assign_and_resume_suspended(child)
    while True:
     rss=pr=0
     for pid in job.pids():
      try:q=psutil.Process(pid);owned[pid]=q.create_time();m=q.memory_info();rss+=m.rss;pr+=m.private
      except psutil.NoSuchProcess:pass
     cm=psutil.Process().memory_info();rss+=cm.rss;pr+=cm.private;peak=max(peak,rss);private=max(private,pr)
     assert rss<=cap*MIB and pr<=(cap+512)*MIB,'OWNED_TREE_MEMORY_CAP_'+label
     current=memory();assert current['availablePhysicalBytes']>=3584*MIB and current['commitHeadroomBytes']>=512*MIB,'OS_HEADROOM_STOP_'+label
     assert time.monotonic()-started<timeout,'PHASE_TIMEOUT_'+label
     code=child.poll()
     if code is not None:break
     time.sleep(.1)
    assert code==0,'PHASE_EXIT_'+label+':'+str(code)
  except BaseException as e:error=repr(e);raise
  finally:
   job.terminate()
   if child:child.wait(timeout=10)
   job.close();remaining=[]
   for pid,ctime in owned.items():
    try:
     if psutil.Process(pid).create_time()==ctime:remaining.append(pid)
    except psutil.NoSuchProcess:pass
   receipt=dict(phase=label,exitCode=code,error=error,elapsedSeconds=time.monotonic()-started,peakCombinedRssBytes=peak,peakCombinedPrivateBytes=private,admission=admission,endMemory=memory(),remainingOwnedProcesses=remaining,foreignProcessesTerminated=False)
   write(out/(label+'.receipt.json'),receipt);receipts.append(receipt);assert not remaining
  assert check_source(),'SOURCE_DRIFT_AFTER_'+label
  return(out/(label+'.stdout.log')).read_text(encoding='utf8',errors='replace')
 npm_cli=pathlib.Path(node).parent/'node_modules/npm/bin/npm-cli.js';assert npm_cli.is_file()
 run('npm-ci',[node,npm_cli,'ci'],1536,900)
 # Existing fingerprint implementation must reproduce the captured canonical tuple.
 text=run('source-identity',[node,'--import','tsx','scripts/dev/printLocalDeveloperBuildIdentity.ts'],256)
 assert json.loads(text)==s['sourceIdentity'],'APK_SNAPSHOT_PRODUCT_IDENTITY_DIFFERS_FROM_FRESH_RUNTIME'
 dirs=[root/'android/app/build/generated/assets/createBundleWaterProofJsAndAssets',root/'android/app/build/generated/res/createBundleWaterProofJsAndAssets',root/'android/app/build/generated/assets/createWaterProofUpdatesResources']
 assert all(not p.exists()for p in dirs),'FRESH_GENERATED_DIRECTORIES_REQUIRED'
 for d in dirs:d.mkdir(parents=True)
 bundle=dirs[0]/'index.android.bundle';entry=root/'index.js'
 run('metro-export',[node,'--max-old-space-size=1024','--max-semi-space-size=8',root/'node_modules/expo/node_modules/@expo/cli/build/bin/cli','export:embed','--platform','android','--dev','false','--minify','false','--max-workers','1','--reset-cache','--entry-file',entry,'--bundle-output',bundle,'--assets-dest',dirs[1]],2048,900)
 found=set();carry=b'';client_binding=None
 with bundle.open('rb')as stream:
  while chunk:=stream.read(MIB):
   block=carry+chunk
   found.update(k for k,v in identity_literals.items()if str(v).encode()in block)
   index=block.find(b'function resolveFunctionUrl() {')
   if index>=0 and len(block)-index>=1200:client_binding=block[index:index+1200]
   carry=block[-4096:]
 assert found==set(identity_literals),'MISSING_EMBEDDED_RUNTIME_IDENTITY'
 assert client_binding and b'var configured = String("http://10.0.2.2:8765").trim();'in client_binding,'ACTUAL_CANONICAL_CLIENT_TRANSPORT_BINDING_MISMATCH'
 phase_inputs=dict(sourceHead=s['canonicalSourceHead'],sourceTree=s['sourceIdentity']['sourceTreeHash'],jsBundleFingerprint=s['sourceIdentity']['jsBundleFingerprint'],capabilityId=s['capabilityId'],definitionReleaseId=s['pair']['definitionReleaseId'],searchReleaseId=s['pair']['searchReleaseId'])
 js=dict(status='PASS_OFFICIAL_EMBEDDED_JS_EXPORT_ONLY',inputs=phase_inputs,artifact=dict(files=inventory(root,dirs[:2]),bundleSha256=sha(bundle)))
 source_js_bytes=bundle.stat().st_size;source_js_sha=sha(bundle)
 # The source bundle stays in the private CI workspace, not in uploaded artifacts.
 run('hermes',[root/'node_modules/react-native/sdks/hermesc/win64-bin/hermesc.exe','-w','-emit-binary','-max-diagnostic-width=80','-O','-out',str(bundle)+'.hbc',bundle],2304,900)
 os.replace(str(bundle)+'.hbc',bundle)
 with bundle.open('rb')as stream:assert stream.read(8).hex()=='c61fbc03c103191f'
 hermes=dict(status='PASS_HERMES_COMPILE_ONLY',inputs=phase_inputs,artifact=dict(sourceJsSha256=source_js_sha,sourceJsBytes=source_js_bytes,bytecodeSha256=sha(bundle),bytecodeBytes=bundle.stat().st_size))
 scheduler=out/'metro-single-worker.cjs';scheduler.write_text('const canonical=require('+json.dumps(str(root/'metro.config.js'))+');module.exports={...canonical,maxWorkers:1};\n',encoding='utf8')
 env['EXPO_OVERRIDE_METRO_CONFIG']=str(scheduler)
 run('expo-updates',[node,'--max-old-space-size=1024','--max-semi-space-size=8',root/'node_modules/expo-updates/utils/build/createUpdatesResources.js','android',root,dirs[2],'all',entry],2048,900);env.pop('EXPO_OVERRIDE_METRO_CONFIG')
 updates=dict(status='PASS_OFFICIAL_EXPO_UPDATES_RESOURCES_ONLY',inputs=phase_inputs,artifact=dict(files=inventory(root,dirs[2:]),fingerprint=(dirs[2]/'fingerprint').read_text().strip()))
 assert read(dirs[2]/'app.manifest')['assets']and re.fullmatch('[a-f0-9]{40}|[a-f0-9]{64}',updates['artifact']['fingerprint'])
 precomputed=dict(status='PASS_CURRENT_SOURCE_PRECOMPUTED_PHASE_UNION',sourceHead=s['canonicalSourceHead'],sourceTree=s['sourceIdentity']['sourceTreeHash'],jsBundleFingerprint=s['sourceIdentity']['jsBundleFingerprint'],files=inventory(root,dirs));write(out/'precomputed.json',precomputed)
 init=(HERE/'precomputed.init.gradle').read_text(encoding='utf8').replace('@ROOT_JSON@',json.dumps(str(root))).replace('@RECEIPT_JSON@',json.dumps(str(out/'precomputed.json')))
 (out/'precomputed.init.gradle').write_text(init,encoding='utf8')
 glog=run('gradle',[java,'-Xmx64m','-Xms64m','-Dorg.gradle.appname=gradlew','-classpath',root/'android/gradle/wrapper/gradle-wrapper.jar','org.gradle.wrapper.GradleWrapperMain',':app:assembleWaterProof','-p','android','--no-daemon','--max-workers=1','--stacktrace','-Dorg.gradle.workers.max=1','-Dorg.gradle.daemon=false','-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=512m -XX:+UseSerialGC','-Pkotlin.compiler.execution.strategy=in-process','-PreactNativeArchitectures=x86_64','-Pandroid.enablePngCrunchInReleaseBuilds=false','--init-script',out/'precomputed.init.gradle'],3072,1500)
 for task in ['createBundleWaterProofJsAndAssets','createWaterProofUpdatesResources']:assert 'VERIFIED_PRECOMPUTED_PHASE :app:'+task+' files='in glog
 assert inventory(root,dirs)==precomputed['files']
 apk=root/'android/app/build/outputs/apk/waterProof/app-waterProof.apk';assert apk.is_file()
 aapt=sdk/'build-tools/36.0.0/aapt2.exe';signer=sdk/'build-tools/36.0.0/lib/apksigner.jar';apk_sha=sha(apk)
 badging=run('apk-badging',[aapt,'dump','badging',apk],256);xml=run('apk-manifest',[aapt,'dump','xmltree',apk,'--file','AndroidManifest.xml'],256)
 cert=run('apk-signature',[java,'-Xmx128m','-jar',signer,'verify','--verbose','--print-certs',apk],256)
 assert re.findall(r'Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]+)',cert)==[CERT]
 for term in["package: name='com.azisbek_dzhantaev.rikexpoapp'","versionCode='13'","targetSdkVersion:'36'","minSdkVersion:'24'"]:assert term in badging
 assert 'application-debuggable'not in badging and re.findall(r"'([^']+)'",re.search(r'^native-code:(.*)$',badging,re.M).group(1))==['x86_64']
 assert re.search(r'android:value[^=]*=(?:false\b|0x0\b|"false")',metadata(xml,'expo.modules.updates.ENABLED'))and'NEVER'in metadata(xml,'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH')
 assert re.search(r'android:usesCleartextTraffic[^=]*=(?:true\b|0xffffffff\b|"true")',xml)
 resources=run('apk-resources',[aapt,'dump','resources',apk],512)
 policy_ref=re.search(r'android:networkSecurityConfig\([^)]*\)=@(0x[a-fA-F0-9]+)',xml);assert policy_ref
 record=re.search(r'^    resource '+re.escape(policy_ref.group(1))+r' xml/network_security_config\r?\n      \(\) \(file\) (res/\S+) type=XML\s*$',resources,re.M);assert record
 policy=run('apk-network-policy',[aapt,'dump','xmltree',apk,'--file',record.group(1)],256)
 assert policy.count('E: base-config')==1 and policy.count('E: domain-config')==1 and'E: debug-overrides'not in policy
 left,right=policy.split('E: domain-config');assert 'cleartextTrafficPermitted=false'in left and'cleartextTrafficPermitted=true'in right and'includeSubdomains=false'in right
 assert re.findall(r"T: '([^']+)'",policy)==['10.0.2.2']
 assert sha(HERE/'resource_verifier.py')=='069685f36bb61e095e9f1834515bfaa6b0ca964a808c8a86468f19bbb8a4d1f7'
 module_spec=importlib.util.spec_from_file_location('existing_resource_verifier',HERE/'resource_verifier.py');module=importlib.util.module_from_spec(module_spec);module_spec.loader.exec_module(module)
 verified=module.verify_resources(root=root,apk_path=apk,dump_text=resources,dump_source_apk_sha256=apk_sha,js=js,hermes=hermes,updates=updates,precomputed=precomputed,allow_actual_aapt_png_crunch=False)
 assert verified['status']=='PASS_RESOURCE_PACKAGING_ONLY'and all(row['method']=='exact-sha256'for row in verified['checks'])
 with zipfile.ZipFile(apk)as z:
  assert'lib/x86_64/libhermes.so'in z.namelist()
  assert{v.split('/')[1]for v in z.namelist()if v.startswith('lib/')and v.count('/')==2}=={'x86_64'}
 assert sha(apk)==apk_sha and check_source()and utc(s['usableUntil'])>datetime.now(timezone.utc),'END_IDENTITY_OR_INPUT_EXPIRED'
 shutil.copyfile(apk,out/'app-waterProof.apk')
 write(out/'apk-result.json',dict(status='PASS_EXACT_CURRENT_SNAPSHOT_APK_PACKAGING_ONLY',sourceSnapshotCommit=a.source_commit,canonicalSourceHead=s['canonicalSourceHead'],sourceIdentity=s['sourceIdentity'],pair=s['pair'],buildSpecSha256=a.spec_sha256,apkSha256=apk_sha,
  signatureSha256=CERT,resources=verified,phaseReceipts=receipts,installedOnDevice=False,androidUiAccepted=False,publicationPerformed=False,credentialsPrinted=False))
if __name__=='__main__':main()
