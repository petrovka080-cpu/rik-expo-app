/** Fixed input capture inside the existing NORMAL_LOCKED_THREE owned window.
 * No candidate/publication or test replacement. ROOT reviews captures after close. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Client} from 'pg';
import {parseOwnedFiletimeControlR1} from './ownedControlFiletimeTransportR1';
import {captureMasterElectricalCurrentParentReadOnlyR1,MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1,assertMonolithicWallCurrentMembershipR1,inventoryMasterMonolithicWallCurrentBytesR1,MONOLITHIC_WALL_INVENTORY_IDENTITY_SQL_R1} from '../estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
import {captureMasterSocketCurrentRegistryReadOnlyR1} from '../estimate/r4a13/masterScopedNormativeRegistryPreimageR1';

const ROOT='C:\\dev\\rik-expo-app-r4a5-dc4f0ce7';
const POINTER='data/estimate-benchmarks/r568-local-developer-canonical-release.json';
const POINTER_SHA='9b6322feb70e38191e7fe171d82dadebfe47816890d4c339f890477ebc83a258';
const need=(value:unknown,code:string):void=>{if(!value)throw Error('PANEL_SOCKET_CAPTURE_'+code);};
const sha=(bytes:Buffer|string):string=>createHash('sha256').update(bytes).digest('hex');
const readJson=(file:string,cap:number):Record<string,any>=>{const bytes=fs.readFileSync(file);need(bytes.length<=cap,'INPUT_BYTE_CAP');return parseOwnedFiletimeControlR1(bytes.toString('utf8'));};
const SELECT_PREFIXES=['select current_setting(','with scoped as materialized (','select (octet_length(source_metadata::text)<=524288'];
const CONTROL=new Set(['BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY','ROLLBACK',"set local timezone='UTC'","set local statement_timeout='4000ms'","set local lock_timeout='1000ms'","set local idle_in_transaction_session_timeout='15000ms'"]);
export function assertFixedPanelSocketReadSqlR1(sql:string):void{
 need(typeof sql==='string'&&!sql.includes(';'),'SINGLE_STATEMENT_ONLY');
 if(CONTROL.has(sql)||sql===MONOLITHIC_WALL_INVENTORY_IDENTITY_SQL_R1)return;
 const lower=sql.trim().toLowerCase();
 need(SELECT_PREFIXES.some(prefix=>lower.startsWith(prefix))&&!/\b(insert|update|delete|merge|copy|create|alter|drop|truncate|grant|revoke|lock|call|do|pg_sleep|set_config|nextval)\b/iu.test(sql),'FIXED_READ_SQL_ONLY');
}
// Diagnostic metadata only: no error text, SQL, URLs, paths or payloads.
const CAPTURE_PHASES=['PRECHECK','CONTROL_READ','SOURCE_PINS','CLIENT_CREATE','CONNECT','SESSION','WALL_READ','PANEL_READ','SOCKET_READ','REGISTRY_READ','ROLLBACK','CLIENT_CLOSE','POST_READ','WALL_OUTPUT','ELECTRICAL_OUTPUT'] as const;
type CapturePhase=typeof CAPTURE_PHASES[number];
let capturePhase:CapturePhase='PRECHECK';
const CAPTURE_SYMBOLS=new Set(['STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_FIXED_WALL_COMPLETE_RAW_SCOPE','STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_FIXED_WALL_COMPLETE_RAW_MEMBERSHIP','ELECTRICAL_CURRENT_FIXED_WALL_COMPLETE_RAW_SCOPE',"PANEL_SOCKET_CAPTURE_NUMERIC_INVENTORY_ONLY_NOT_FULL_CAPTURE","PANEL_SOCKET_CAPTURE_COMPLETE_NUMERIC_INVENTORY_ROLLED_BACK","ELECTRICAL_CURRENT_NUMERIC_INVENTORY_IDENTITY","ELECTRICAL_CURRENT_NUMERIC_INVENTORY_DIAGNOSIS","STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_NUMERIC_INVENTORY_SCOPE","STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_NUMERIC_INVENTORY_DIAGNOSIS","STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_FIXED_WALL_BASELINE_PROFILE","ELECTRICAL_CURRENT_ACTUAL_FK_CLOSURE","ELECTRICAL_CURRENT_CURRENT_MEMBERSHIP_SINGLE","ELECTRICAL_CURRENT_CURRENT_PARENT_IDENTITY","ELECTRICAL_CURRENT_ELECTRICAL_CURRENT","ELECTRICAL_CURRENT_ELECTRICAL_CURRENT_","ELECTRICAL_CURRENT_FIXED_CURRENT_SELECTOR","ELECTRICAL_CURRENT_PASSPORT_IDENTITY_SINGLE","ELECTRICAL_CURRENT_RAW_OBJECT","ELECTRICAL_CURRENT_RAW_ROWS","ELECTRICAL_CURRENT_READ_DEADLINE","ELECTRICAL_CURRENT_READ_ONLY_RR_UTC_REQUIRED","ELECTRICAL_CURRENT_SOURCE_METADATA_CAP","ELECTRICAL_CURRENT_SOURCE_METADATA_LOSSLESS_ROUNDTRIP","ELECTRICAL_CURRENT_UTC","MONOLITHIC_WALL_CURRENT_MEMBERSHIP_DRIFT","MONOLITHIC_WALL_CURRENT_MEMBERSHIP_REQUIRED","OWNED_CONTROL_BYTE_CAP","OWNED_CONTROL_DUPLICATE_OR_INVALID_KEYS","OWNED_CONTROL_EXACT_ONE_FILETIME_FIELD_REQUIRED","OWNED_CONTROL_EXACT_TWO_FILETIME_FIELDS_REQUIRED","OWNED_CONTROL_EXACT_UINT64_NUMERIC_LEXEME_REQUIRED","OWNED_CONTROL_KEY_REQUIRED","OWNED_CONTROL_OBJECT_REQUIRED","OWNED_CONTROL_OTHER_NUMBER_MUST_BE_SAFE_INTEGER","OWNED_CONTROL_OWNER_SCHEMA_REQUIRED","OWNED_CONTROL_POSTGRES_SCHEMA_REQUIRED","PANEL_SOCKET_CAPTURE_ACTUAL_OWNED_CONTEXT","PANEL_SOCKET_CAPTURE_COMMAND_BYTES","PANEL_SOCKET_CAPTURE_COMPLETE_ROLLED_BACK_READ","PANEL_SOCKET_CAPTURE_COMPLETE_WALL_ROLLED_BACK_READ","PANEL_SOCKET_CAPTURE_CURRENT_POINTER_BYTES","PANEL_SOCKET_CAPTURE_DECIMAL_UINT64_STRING","PANEL_SOCKET_CAPTURE_EXACT_CANONICAL_ARGUMENT","PANEL_SOCKET_CAPTURE_EXACT_SOURCE_INPUT_PIN","PANEL_SOCKET_CAPTURE_EXISTING_URL_REF","PANEL_SOCKET_CAPTURE_FINITE_DB_VERIFICATION","PANEL_SOCKET_CAPTURE_FIXED_CURRENT_POINTER","PANEL_SOCKET_CAPTURE_FIXED_MONOLITHIC_WALL_CURRENT_INPUT_READ_ONLY_NOT_ADMISSION","PANEL_SOCKET_CAPTURE_FIXED_PANEL_SOCKET_CURRENT_INPUT_READ_ONLY_NOT_ADMISSION","PANEL_SOCKET_CAPTURE_FIXED_PRELUDE_REQUIRED","PANEL_SOCKET_CAPTURE_FIXED_READ_SQL_ONLY","PANEL_SOCKET_CAPTURE_INPUT_BYTE_CAP","PANEL_SOCKET_CAPTURE_INPUT_DRIFT_AFTER_READ","PANEL_SOCKET_CAPTURE_MONOLITHIC_WALL_CURRENT_INPUTS","PANEL_SOCKET_CAPTURE_NORMAL_LOCKED_THREE","PANEL_SOCKET_CAPTURE_ORIGINAL_DEADLINE_OR_STOP","PANEL_SOCKET_CAPTURE_OUTPUT_BYTE_CAP","PANEL_SOCKET_CAPTURE_PANEL_SOCKET_CAPTURE_","PANEL_SOCKET_CAPTURE_PANEL_SOCKET_CURRENT_INPUTS","PANEL_SOCKET_CAPTURE_ROLLBACK","PANEL_SOCKET_CAPTURE_SINGLE_STATEMENT_ONLY","PANEL_SOCKET_CAPTURE_UNREVIEWED_REQUIRES_ROOT_COMPARISON","PANEL_SOCKET_CAPTURE_UTC","STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_ATOMIC_ROW_OR_BYTE_CAP","STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_ATOMIC_WRAPPER_COUNT","STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_READ_ONLY_RR_UTC_REQUIRED","STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_SCOPE_READ_DEADLINE","STOP_SOCKET_CURRENT_INPUTS_SCOPED_REGISTRY_ATOMIC_ROW_OR_BYTE_CAP","STOP_SOCKET_CURRENT_INPUTS_SCOPED_REGISTRY_ATOMIC_WRAPPER_COUNT","STOP_SOCKET_CURRENT_INPUTS_SCOPED_REGISTRY_READ_ONLY_RR_UTC_REQUIRED","STOP_SOCKET_CURRENT_INPUTS_SCOPED_REGISTRY_SCOPE_READ_DEADLINE"]);
const CAPTURE_SQLSTATES=new Set(['08001','08006','08P01','22001','22003','22P02','25006','40001','40P01','42501','42601','42703','42883','42P01','53300','53400','55P03','57014','57P01','57P02','57P03']);
const CAPTURE_BUDGET_COLLECTIONS=['membership','definition','baseline','parameters','formulas','resources','bindings','normativeLocators','normativeSources','contentPassport','publicIdentity'] as const;
const CAPTURE_BUDGET_KEYS=['rows','rawMax','wireMax','wire','used','left','rowCap','rawCap','wireCap','totalCap'] as const;
function captureOwnDataR1(value:object,key:string):unknown{try{const d=Object.getOwnPropertyDescriptor(value,key);return d&&Object.hasOwn(d,'value')?d.value:undefined;}catch{return undefined;}}
export function safeCaptureAtomicBudgetR1(error:object):Record<string,number|string>|null{
 try{
  const d=captureOwnDataR1(error,'atomicBudget');if(!d||typeof d!=='object'||Array.isArray(d))return null;
  if(JSON.stringify(Object.keys(d).sort())!==JSON.stringify(['collection',...CAPTURE_BUDGET_KEYS].sort()))return null;
  const collection=captureOwnDataR1(d,'collection');if(typeof collection!=='string'||!CAPTURE_BUDGET_COLLECTIONS.includes(collection as typeof CAPTURE_BUDGET_COLLECTIONS[number]))return null;
  const out:Record<string,number|string>={collection};
  for(const key of CAPTURE_BUDGET_KEYS){const v=captureOwnDataR1(d,key);if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0||v>1099511627775)return null;out[key]=v;}
  return out;
 }catch{return null;}
}
export function safeCurrentCaptureFailureR1(error:unknown,phase:string):Readonly<{contract:string;phase:string;symbol:string;errorClass:string;sqlState:string|null;sourceFrame:{file:string;line:number;column:number}|null;atomicBudget:Record<string,number|string>|null}>{
 const result={contract:'fixed-current-capture-failure/r1',phase:CAPTURE_PHASES.includes(phase as CapturePhase)?phase:'PRECHECK',symbol:'UNCLASSIFIED_FAILURE',errorClass:'UnknownError',sqlState:null as string|null,sourceFrame:null as {file:string;line:number;column:number}|null,atomicBudget:null as Record<string,number|string>|null};
 try{
  if(!error||typeof error!=='object')return result;
  const message=captureOwnDataR1(error,'message'),name=captureOwnDataR1(error,'name'),code=captureOwnDataR1(error,'code'),stack=captureOwnDataR1(error,'stack');
  result.errorClass=error instanceof SyntaxError?'SyntaxError':error instanceof TypeError?'TypeError':error instanceof RangeError?'RangeError':error instanceof Error?'Error':'UnknownError';
  if(message==='STOP_ELECTRICAL_CURRENT_SCOPED_REGISTRY_ATOMIC_ROW_OR_BYTE_CAP'||message==='STOP_SOCKET_CURRENT_INPUTS_SCOPED_REGISTRY_ATOMIC_ROW_OR_BYTE_CAP')result.atomicBudget=safeCaptureAtomicBudgetR1(error);
  if(typeof message==='string'&&message.length<=160&&CAPTURE_SYMBOLS.has(message))result.symbol=message;
  if(typeof name==='string'&&['Error','TypeError','RangeError','SyntaxError','AssertionError','DatabaseError'].includes(name))result.errorClass=name;
  if(typeof code==='string'&&CAPTURE_SQLSTATES.has(code))result.sqlState=code;
  if(typeof stack==='string'){
   const frames=stack.slice(0,8192).split(/\r?\n/u).slice(1,25);
   for(const frame of frames){
    const match=frame.match(/(?:[\\/])(capturePanelSocketCurrentInputsR1\.ts|masterSingleDefinitionRetainParentBindingsR1\.ts|masterScopedNormativeRegistryPreimageR1\.ts|ownedControlFiletimeTransportR1\.ts):(\d{1,6}):(\d{1,5})(?:\)|$)/u);
    if(match&&Number(match[2])>0&&Number(match[3])>0){result.sourceFrame={file:match[1]!,line:Number(match[2]),column:Number(match[3])};break;}
   }
  }
 }catch{/* Error accessors are not a diagnostic payload. */}
 if(JSON.stringify(result).length>=600)result.sourceFrame=null;
 return result;
}
async function main():Promise<void>{
 need(process.argv.length===3&&path.resolve(process.cwd()).toLowerCase()===ROOT.toLowerCase(),'EXACT_CANONICAL_ARGUMENT');
 const commandPath=path.resolve(process.argv[2]!),stage=path.dirname(commandPath),commandBytes=fs.readFileSync(commandPath);
 need(commandBytes.length<=4*1024*1024,'COMMAND_BYTES');
 const command=JSON.parse(commandBytes.toString('utf8').replace(/^\uFEFF/,'')),db=command.db;
 need(command.commandRole==='FINITE_DB_VERIFICATION'&&db?.group==='NORMAL_LOCKED_THREE'&&['PANEL_SOCKET_CURRENT_INPUTS','MONOLITHIC_WALL_CURRENT_INPUTS','MONOLITHIC_WALL_NUMERIC_INVENTORY_ONLY','MONOLITHIC_WALL_COMPLETE_RAW_INPUTS_R2'].includes(db.capturePrelude),'FIXED_PRELUDE_REQUIRED');
 const rawWallMode=db.capturePrelude==='MONOLITHIC_WALL_COMPLETE_RAW_INPUTS_R2';
 const wallMode=db.capturePrelude==='MONOLITHIC_WALL_CURRENT_INPUTS',inventoryMode=db.capturePrelude==='MONOLITHIC_WALL_NUMERIC_INVENTORY_ONLY';
 capturePhase='CONTROL_READ';
 const incoming=JSON.parse(process.env.GOX_DB_VERIFICATION_CONTEXT??'null');
 const owner=readJson(path.join(stage,'DB_OWNER_CONTEXT.json'),16384),pg=readJson(path.join(stage,'DB_PG_OWNED.json'),16384);
 need(incoming?.commandSha256===sha(commandBytes)&&owner.commandSha256===incoming.commandSha256&&
  owner.commandPath===commandPath&&owner.rootThreadId===db.rootThreadId&&owner.instanceNonce===db.instanceNonce&&
  incoming.rootThreadId===owner.rootThreadId&&incoming.instanceNonce===owner.instanceNonce&&
  JSON.stringify(pg.context)===JSON.stringify(owner)&&pg.port===55432&&
  Number.isSafeInteger(owner.childPid)&&owner.childPid>0&&typeof owner.childStartFiletime==='string'&&
  Number.isSafeInteger(pg.postgres?.pid)&&pg.postgres.pid>0&&typeof pg.postgres.startFiletime==='string','ACTUAL_OWNED_CONTEXT');
 const end=Date.parse(db.leaseEndUtc),started=performance.now();
 const alive=():void=>need(Number.isFinite(end)&&Date.now()<end&&performance.now()-started<45000&&
  !fs.existsSync(path.join(stage,'DB_STOP_REQUEST.json'))&&!fs.existsSync(path.join(stage,'DB_CANCEL_REQUEST.json')),'ORIGINAL_DEADLINE_OR_STOP');
 alive();
 const pointerBytes=fs.readFileSync(path.join(ROOT,POINTER));need(sha(pointerBytes)===POINTER_SHA,'CURRENT_POINTER_BYTES');
 const pointer=JSON.parse(pointerBytes.toString('utf8'));
 need(pointer.definitionReleaseId==='01417cef-3091-5012-844d-1bbd9e75cee1'&&pointer.searchReleaseId==='485d16ea-60f5-5c6c-b43a-5ea604945208','FIXED_CURRENT_POINTER');
 capturePhase='SOURCE_PINS';
 const sourceWitnessPins:Array<{path:string;sha256:string}>=[];
 for(const relative of ['scripts/verification/capturePanelSocketCurrentInputsR1.ts','scripts/verification/ownedControlFiletimeTransportR1.ts','scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',POINTER]){
  const file=path.join(ROOT,relative),pins=command.referenceInputPins.filter((pin:{path:string})=>path.resolve(pin.path).toLowerCase()===file.toLowerCase());
  need(pins.length===1&&pins[0].sha256===sha(fs.readFileSync(file)),'EXACT_SOURCE_INPUT_PIN');
  sourceWitnessPins.push({path:file,sha256:pins[0].sha256});
 }
 // Credential value is consumed only by pg; never serialized, logged or copied.
 capturePhase='CLIENT_CREATE';
 const connectionString=process.env.ESTIMATE_MIGRATION_DATABASE_URL;need(Boolean(connectionString),'EXISTING_URL_REF');
 const client=new Client({connectionString,connectionTimeoutMillis:4000,query_timeout:5000,statement_timeout:4000,application_name:inventoryMode?'fixed-wall-numeric-inventory':rawWallMode?'fixed-wall-complete-raw':wallMode?'fixed-monolithic-wall-current-inputs':'fixed-panel-socket-current-inputs'});
 const checked={query:async(sql:string,values?:unknown[])=>{alive();assertFixedPanelSocketReadSqlR1(sql);const result=await client.query(sql,values);alive();return result;}} as unknown as Pick<Client,'query'>;
 let transaction=false,rolledBack=false;
 let panel:Awaited<ReturnType<typeof captureMasterElectricalCurrentParentReadOnlyR1>>|undefined;
 let wall:typeof panel;
 let inventory:Awaited<ReturnType<typeof inventoryMasterMonolithicWallCurrentBytesR1>>|undefined;
 let socket:typeof panel,registry:Awaited<ReturnType<typeof captureMasterSocketCurrentRegistryReadOnlyR1>>|undefined;
 try{
  capturePhase='CONNECT';await client.connect();transaction=true;
  capturePhase='SESSION';
  await checked.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  for(const sql of ["set local timezone='UTC'","set local statement_timeout='4000ms'","set local lock_timeout='1000ms'","set local idle_in_transaction_session_timeout='15000ms'"])await checked.query(sql);
  const common={releaseId:pointer.definitionReleaseId,absoluteDeadlineUtc:db.leaseEndUtc};
  if(inventoryMode){
   capturePhase='WALL_READ';inventory=await inventoryMasterMonolithicWallCurrentBytesR1(checked,db.leaseEndUtc);
  }else if(wallMode||rawWallMode){
   capturePhase='WALL_READ';
   wall=await captureMasterElectricalCurrentParentReadOnlyR1(checked,{...common,catalogId:MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id,...(rawWallMode?{completeRawProfile:'FIXED_WALL_COMPLETE_RAW_READ_R2' as const}:{})});
  }else{
  capturePhase='PANEL_READ';
  panel=await captureMasterElectricalCurrentParentReadOnlyR1(checked,{...common,catalogId:'canonical-work:base:electrical_interior_lighting_install_technical_room'});
  capturePhase='SOCKET_READ';
  socket=await captureMasterElectricalCurrentParentReadOnlyR1(checked,{...common,catalogId:'canonical-work:base:electrical_interior_socket_install_standard'});
  capturePhase='REGISTRY_READ';
  registry=await captureMasterSocketCurrentRegistryReadOnlyR1(checked,db.leaseEndUtc);
  }
 }finally{
  const readPhase=capturePhase;
  try{capturePhase='ROLLBACK';if(transaction){await client.query('ROLLBACK');rolledBack=true;}}finally{
   const cleanupPhase=capturePhase;capturePhase='CLIENT_CLOSE';await client.end();capturePhase=cleanupPhase;
  }
  capturePhase=readPhase;
 }
 capturePhase='POST_READ';alive();
 if(inventoryMode){
  need(inventory&&rolledBack,'COMPLETE_NUMERIC_INVENTORY_ROLLED_BACK');
  need(fs.readFileSync(path.join(ROOT,POINTER)).equals(pointerBytes)&&fs.readFileSync(commandPath).equals(commandBytes),'INPUT_DRIFT_AFTER_READ');
  capturePhase='WALL_OUTPUT';
  const directory=path.join(stage,'monolithic-wall-numeric-inventory');fs.mkdirSync(directory);
  const write=(name:string,value:unknown)=>{const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');need(bytes.length<=65536,'OUTPUT_BYTE_CAP');const file=path.join(directory,name);alive();fs.writeFileSync(file,bytes,{flag:'wx'});return{path:file,sha256:sha(bytes)};};
  const output=write('NUMERIC_INVENTORY.json',inventory);alive();
  write('NUMERIC_INVENTORY_MANIFEST.json',{contract:'bound-monolithic-wall-numeric-inventory/r1',filetimeEncoding:'DECIMAL_UINT64_STRING',scope:'FIXED_ELEVEN_NUMERIC_ONLY_NOT_FULL_CAPTURE',
   context:owner,postgres:pg.postgres,commandSha256:sha(commandBytes),sourceFreeze:command.sourceFreeze,sourceWitnessPins,
   pointer:{sha256:POINTER_SHA,definitionReleaseId:pointer.definitionReleaseId,searchReleaseId:pointer.searchReleaseId},
   expectedMembership:MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1,actualIdentityEqualityVerified:inventory!.actualIdentityEqualityVerified,
   transaction:{isolation:'repeatable read',readOnly:true,timezone:'UTC',rolledBack},output,
   rawPayloadReturned:false,currentFullParentVerified:false,normalLockedFullGuardSatisfied:false,jestExecuted:false,normalPgClosureVerified:false,
   sourceAdmission:false,projectAuthenticated:false,full:false});alive();
  need(false,'NUMERIC_INVENTORY_ONLY_NOT_FULL_CAPTURE');
 }
 if(rawWallMode){
  need(wall&&rolledBack,'COMPLETE_WALL_ROLLED_BACK_READ');
  assertMonolithicWallCurrentMembershipR1(wall!.membership);
  need(fs.readFileSync(path.join(ROOT,POINTER)).equals(pointerBytes)&&fs.readFileSync(commandPath).equals(commandBytes),'INPUT_DRIFT_AFTER_READ');alive();
  capturePhase='WALL_OUTPUT';
  const directory=path.join(stage,'monolithic-wall-complete-raw-inputs');fs.mkdirSync(directory);
  const write=(name:string,value:unknown)=>{const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');need(bytes.length<=12*1024*1024,'OUTPUT_BYTE_CAP');const file=path.join(directory,name);alive();fs.writeFileSync(file,bytes,{flag:'wx'});return{path:file,sha256:sha(bytes)};};
  const rawBody={contract:'fixed-wall-complete-raw-parent/r2',rawRows:wall!.rawRows,rawRowsSha256:wall!.rawRowsSha256,
   readOnly:wall!.readOnly,sourceMetadataLosslessRoundtrip:wall!.sourceMetadataLosslessRoundtrip,sourceAdmission:false,normalLockedFullGuardSatisfied:false,full:false};
  const outputs={wall:write('wall-current-complete-raw-parent.json',rawBody)};
  const membership=Object.fromEntries(Object.keys(MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1).map(key=>[key,wall!.membership[key]]));
  write('CAPTURE_MANIFEST.json',{contract:'bound-monolithic-wall-complete-raw-witness/r2',filetimeEncoding:'DECIMAL_UINT64_STRING',scope:'FIXED_MONOLITHIC_WALL_COMPLETE_RAW_NOT_ADMISSION',
   context:owner,postgres:pg.postgres,commandSha256:sha(commandBytes),sourceFreeze:command.sourceFreeze,sourceWitnessPins,
   pointer:{sha256:POINTER_SHA,definitionReleaseId:pointer.definitionReleaseId,searchReleaseId:pointer.searchReleaseId},
   expectedMembership:MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1,membership,
   transaction:{isolation:'repeatable read',readOnly:true,timezone:'UTC',rolledBack},outputs,
   historicalBodyEquivalence:'UNREVIEWED_REQUIRES_ROOT_COMPARISON',normalLockedFullGuardSatisfied:false,sourceAdmission:false,projectAuthenticated:false,full:false});alive();return;
 }
 if(wallMode){
  need(wall&&rolledBack,'COMPLETE_WALL_ROLLED_BACK_READ');
  assertMonolithicWallCurrentMembershipR1(wall!.membership);
  need(fs.readFileSync(path.join(ROOT,POINTER)).equals(pointerBytes)&&fs.readFileSync(commandPath).equals(commandBytes),'INPUT_DRIFT_AFTER_READ');
  capturePhase='WALL_OUTPUT';
  const directory=path.join(stage,'monolithic-wall-current-inputs');fs.mkdirSync(directory);
  const write=(name:string,value:unknown)=>{const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');need(bytes.length<=12*1024*1024,'OUTPUT_BYTE_CAP');const file=path.join(directory,name);fs.writeFileSync(file,bytes,{flag:'wx'});return {path:file,sha256:sha(bytes)};};
  const outputs={wall:write('wall-current-full-parent.json',wall)};
  alive();
  write('CAPTURE_MANIFEST.json',{contract:'bound-monolithic-wall-current-read-witness/r2',filetimeEncoding:'DECIMAL_UINT64_STRING',scope:'FIXED_MONOLITHIC_WALL_CURRENT_INPUT_READ_ONLY_NOT_ADMISSION',
   context:owner,postgres:pg.postgres,commandSha256:sha(commandBytes),sourceFreeze:command.sourceFreeze,sourceWitnessPins,
   pointer:{sha256:POINTER_SHA,definitionReleaseId:pointer.definitionReleaseId,searchReleaseId:pointer.searchReleaseId},
   expectedMembership:MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1,membership:wall!.membership,
   transaction:{isolation:'repeatable read',readOnly:true,timezone:'UTC',rolledBack},outputs,
   historicalBodyEquivalence:'UNREVIEWED_REQUIRES_ROOT_COMPARISON',sourceAdmission:false,projectAuthenticated:false,full:false});
  alive();return;
 }
 alive();need(panel&&socket&&registry&&rolledBack,'COMPLETE_ROLLED_BACK_READ');
 need(fs.readFileSync(path.join(ROOT,POINTER)).equals(pointerBytes)&&fs.readFileSync(commandPath).equals(commandBytes),'INPUT_DRIFT_AFTER_READ');
 capturePhase='ELECTRICAL_OUTPUT';
 const directory=path.join(stage,'panel-socket-current-inputs');fs.mkdirSync(directory);
 const write=(name:string,value:unknown)=>{const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');need(bytes.length<=12*1024*1024,'OUTPUT_BYTE_CAP');const file=path.join(directory,name);fs.writeFileSync(file,bytes,{flag:'wx'});return {path:file,sha256:sha(bytes)};};
 const outputs={panel:write('panel-current-full-parent.json',panel),socket:write('socket-current-full-parent.json',socket),socketScope:write('socket-scoped-current-source-witness.json',registry)};
 alive();
 write('CAPTURE_MANIFEST.json',{contract:'bound-electrical-current-read-witness/r2',filetimeEncoding:'DECIMAL_UINT64_STRING',scope:'FIXED_PANEL_SOCKET_CURRENT_INPUT_READ_ONLY_NOT_ADMISSION',
  context:owner,postgres:pg.postgres,commandSha256:sha(commandBytes),sourceFreeze:command.sourceFreeze,sourceWitnessPins,
  pointer:{sha256:POINTER_SHA,definitionReleaseId:pointer.definitionReleaseId,searchReleaseId:pointer.searchReleaseId},
  transaction:{isolation:'repeatable read',readOnly:true,timezone:'UTC',rolledBack},outputs,
  historicalBodyEquivalence:'UNREVIEWED_REQUIRES_ROOT_COMPARISON',sourceAdmission:false,projectAuthenticated:false,full:false});
 alive();
}
// This verification source is executed only by the fixed canonical prelude.
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve('scripts/verification/capturePanelSocketCurrentInputsR1.ts')){
 main().catch((error:unknown)=>{process.stderr.write(JSON.stringify(safeCurrentCaptureFailureR1(error,capturePhase))+'\n');process.stderr.write('PANEL_SOCKET_CURRENT_CAPTURE_NOT_ACCEPTED\n');process.exitCode=1;});
}
