import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json=Record<string,any>;

const SPEC_PATH=resolve("C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md");
const SPEC_SHA256="4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT="691acb78d55c38ef447a4d91c0bc798992e58dbc";
const SEARCH_RELEASE_ID=String(process.env.R58_SEARCH_RELEASE_ID??"").trim();
const DEFINITION_RELEASE_ID=String(process.env.R58_TARGET_RELEASE_ID??"94443669-8f5b-5cc7-b364-2f8e9f9e3506").trim();
const API_ROOT=String(process.env.R58_CANONICAL_API_ROOT??"http://127.0.0.1:8777/canonical-estimate").replace(/\/+$/u,"");
const OUTPUT=resolve(".release-runtime/p0-one-monolith-r58/evidence/09-search/R58_SEARCH_API_GATE.json");
const EXPECTED=Object.freeze({"ла":1226,"ро":1244,"со":607,"др":16,
  "ла или ро или со или др":2219});
const EXPECTED_INVENTORY=Object.freeze({"ла":3678,"ро":4128,"со":1462,"др":825});
const MANDATORY=Object.freeze([
  ["ламинат","flooring_interior_laminate_install_large_area"],
  ["бетонные тумбы","r58-real:reinforced-concrete-equipment-pedestal"],
  ["асфальтирование парковки","built-in-ai-1000:0702"],
  ["демонтаж асфальта","built-in-ai-1000:0670"],
  ["армокаркас во влажной зоне","concrete_foundation_interior_reinforcement_frame_reinforce_wet_zone"],
  ["свайный фундамент моста","r58-real:bridge-bored-pile-installation"],
  ["гкл перегородка","drywall_ceiling_interior_drywall_partition_install_large_area"],
  ["электромонтаж кабеля","electrical_interior_power_cable_lay_large_area"],
  ["водоснабжение","expanded-template:village_water_supply_preliminary_boq_expanded_complex_v1"],
  ["hvac помещения","expanded-template:HVAC_plant_room_preliminary_boq_expanded_complex_v1"],
  ["штукатурка","r58-real:wall-plaster-application"],
  ["габионная стена","r58-real:gabion-wall-construction"],
  ["кладка с перемычками","r58-real:masonry-wall-openings-lintels"],
  ["кровельная система","r58-real:roofing-membrane-system"],
  ["железобетонный элемент","r58-real:monolithic-reinforced-concrete"],
  ["отделочное покрытие","r58-real:finish-coating-application"],
] as const);

function invariant(value:unknown,code:string):asserts value {if(!value)throw new Error(code);}
function sha256(value:Buffer|string):string {return createHash("sha256").update(value).digest("hex");}
function git(args:string[]):string {return execFileSync("git",args,{encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30_000}).trim();}
function percentile(values:number[],fraction:number):number {
  const sorted=[...values].sort((left,right)=>left-right);
  return sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)]??0;
}
function writeJson(path:string,value:unknown):void {
  mkdirSync(dirname(path),{recursive:true});const temporary=`${path}.tmp-${process.pid}`;
  writeFileSync(temporary,`${JSON.stringify(value,null,2)}\n`,"utf8");renameSync(temporary,path);
}

async function api(path:string):Promise<Json> {
  const started=performance.now();
  const response=await fetch(`${API_ROOT}/${path.replace(/^\/+/,"")}`,{
    headers:{Accept:"application/json",Authorization:"Bearer local-r58-cumulative-proof"},
    signal:AbortSignal.timeout(30_000),
  });
  const payload=await response.json().catch(()=>null) as Json|null;
  if(!response.ok)throw new Error(`R58_SEARCH_HTTP_${response.status}:${path}:${JSON.stringify(payload)}`);
  return {...payload,__httpDurationMs:Number((performance.now()-started).toFixed(3))};
}

async function walk(query:string,mode?:"ANY"|"ALL"|"PHRASE",tokens:string[]=[]):Promise<Json> {
  const ids:string[]=[];const durations:number[]=[];let cursor:string|null=null;let first:Json|null=null;
  let pages=0;
  do {
    const params=new URLSearchParams({query,pageSize:"100"});
    if(mode)params.set("mode",mode);
    for(const token of tokens)params.append("token",token);
    if(cursor)params.set("cursor",cursor);
    const page=await api(`search/catalog?${params.toString()}`);
    first??=page;pages+=1;durations.push(Number(page.durationMs));
    invariant(page.searchIndexReleaseId===SEARCH_RELEASE_ID,"R58_SEARCH_RELEASE_DRIFT");
    invariant(page.resultLevel==="LITERAL",`R58_SEARCH_LITERAL_LEVEL:${query}`);
    invariant(page.literalTotalCount===first.literalTotalCount,`R58_SEARCH_TOTAL_DRIFT:${query}`);
    invariant(page.searchMode===(mode??(query.includes(" или ")?"ANY":"PHRASE")),`R58_SEARCH_MODE:${query}`);
    for(const item of page.items as Json[]){
      invariant(item.catalogId&&item.definitionVersionId&&item.definitionReleaseId===DEFINITION_RELEASE_ID
        && item.estimateReady===true&&item.adjudicationClass==="EFFECTIVE_WORK",
      `R58_SEARCH_ITEM_NOT_READY:${query}:${item.catalogId}`);
      ids.push(String(item.catalogId));
    }
    cursor=page.nextCursor;
    invariant(pages<=50,`R58_SEARCH_CURSOR_UNBOUNDED:${query}`);
  } while(cursor);
  const total=Number(first?.literalTotalCount??-1);
  invariant(ids.length===total&&new Set(ids).size===total,`R58_SEARCH_CURSOR_WALK:${query}:${ids.length}/${new Set(ids).size}/${total}`);
  return {query,mode:first?.searchMode,tokens:first?.searchTokens,total,pages,unique:new Set(ids).size,
    firstPageCount:Math.min(100,total),idsSha256:sha256(ids.join("\n")),durations};
}

async function main():Promise<void> {
  invariant(/^[0-9a-f-]{36}$/u.test(SEARCH_RELEASE_ID),"R58_SEARCH_RELEASE_ID_REQUIRED");
  invariant(sha256(readFileSync(SPEC_PATH))===SPEC_SHA256,"R58_SEARCH_SPEC_DRIFT");
  const branch=git(["branch","--show-current"]),head=git(["rev-parse","HEAD"]),tree=git(["rev-parse","HEAD^{tree}"]);
  invariant(branch==="codex/p0-one-monolith-r5","R58_SEARCH_BRANCH_DRIFT");
  invariant(git(["status","--porcelain=v1"])==="","R58_SEARCH_DIRTY_WORKTREE");
  git(["merge-base","--is-ancestor",BASE_COMMIT,head]);
  const runtime=await api("runtime-manifest");
  invariant(runtime.sourceHead===head&&runtime.sourceTree===tree&&runtime.specSha256===SPEC_SHA256,
    "R58_SEARCH_RUNTIME_SOURCE_DRIFT");
  invariant(runtime.searchRelease?.id===SEARCH_RELEASE_ID&&runtime.searchRelease?.status==="draft",
    "R58_SEARCH_DIAGNOSTIC_RELEASE_DRIFT");
  await api(`search/catalog?query=${encodeURIComponent("ла или ро или со или др")}&pageSize=100`);
  const walks:Json[]=[];
  for(const query of Object.keys(EXPECTED)){
    const result=await walk(query);
    invariant(result.total===EXPECTED[query as keyof typeof EXPECTED],`R58_SEARCH_FINAL_ORACLE:${query}:${result.total}`);
    walks.push(result);
  }
  const repeat=await walk("ла или ро или со или др","ANY",["ла","ро","со","др"]);
  invariant(repeat.total===EXPECTED["ла или ро или со или др"]&&repeat.idsSha256===walks.at(-1)?.idsSha256,
    "R58_SEARCH_ANY_REPEAT_DRIFT");
  const inventory:Json={};
  for(const [query,expected] of Object.entries(EXPECTED_INVENTORY)){
    const result=await api(`search/catalog?query=${encodeURIComponent(query)}&pageSize=1&auditInventory=true`);
    invariant(result.inventoryLiteralTotalCount===expected,`R58_SEARCH_INVENTORY_ORACLE:${query}:${result.inventoryLiteralTotalCount}`);
    inventory[query]=expected;
  }
  const laminate=await api(`search/catalog?query=${encodeURIComponent("ламин")}&pageSize=100`);
  invariant(laminate.literalTotalCount===1&&laminate.items[0]?.catalogId==="flooring_interior_laminate_install_large_area"
    && laminate.items[0]?.estimateReady===true,"R58_SEARCH_LAMINATE_LITERAL_RED");
  const laminateQuantity=await api(`search/catalog?query=${encodeURIComponent("монтаж ламината 1547 кв метров")}&pageSize=100`);
  invariant(laminateQuantity.searchText==="монтаж ламината"&&laminateQuantity.parsedQuantity===1547
    && laminateQuantity.parsedUnit==="м²"&&laminateQuantity.items[0]?.catalogId==="flooring_interior_laminate_install_large_area",
  "R58_SEARCH_LAMINATE_QUANTITY_RED");
  const pieces=await api(`search/catalog?query=${encodeURIComponent("бетонные тумбы 10 штук")}&pageSize=100`);
  invariant(pieces.searchText==="бетонные тумбы"&&pieces.parsedQuantity===10&&pieces.parsedUnit==="шт",
    "R58_SEARCH_PIECES_QUANTITY_RED");
  invariant(pieces.literalTotalCount===1
    && pieces.items[0]?.catalogId==="r58-real:reinforced-concrete-equipment-pedestal"
    && pieces.items[0]?.estimateReady===true,"R58_SEARCH_PIECES_WORK_RED");
  const reference=await api(`search/catalog?query=${encodeURIComponent("бетонные тумбы")}&scope=REFERENCES&pageSize=100`);
  invariant(reference.literalTotalCount===0,"R58_SEARCH_REFERENCE_SCOPE_LEAK");
  const mandatory:Json[]=[];
  for(const [query,catalogId] of MANDATORY){
    const result=await api(`search/catalog?query=${encodeURIComponent(query)}&pageSize=100`);
    invariant(result.items.some((item:Json)=>item.catalogId===catalogId&&item.definitionReleaseId===DEFINITION_RELEASE_ID
      && item.estimateReady===true),`R58_SEARCH_MANDATORY_JOURNEY_RED:${query}:${catalogId}`);
    mandatory.push({query,catalogId,total:result.literalTotalCount,matched:true});
  }
  const fuzzy=await api(`search/catalog?query=${encodeURIComponent("ламенат")}&pageSize=100`);
  invariant(fuzzy.resultLevel==="FUZZY"&&fuzzy.items[0]?.catalogId==="flooring_interior_laminate_install_large_area"
    && fuzzy.items[0]?.matchType==="T6_TYPO_TRANSLITERATION_SUGGESTION","R58_SEARCH_FUZZY_RED");
  const groupId=String(laminate.items[0].groupId);let groupCursor:string|null=null;const groupIds:string[]=[];let groupTotal=-1;
  do {const group=await api(`search/groups/${encodeURIComponent(groupId)}?pageSize=100${groupCursor?`&cursor=${encodeURIComponent(groupCursor)}`:""}`);
    groupTotal=group.totalCount;for(const item of group.items as Json[])groupIds.push(String(item.catalogId));groupCursor=group.nextCursor;
  } while(groupCursor);
  invariant(groupIds.length===groupTotal&&new Set(groupIds).size===groupTotal
    && groupIds.includes("flooring_interior_laminate_install_large_area"),"R58_SEARCH_GROUP_WALK_RED");
  const durations=walks.flatMap((row)=>row.durations as number[]).concat(repeat.durations as number[]);
  const p95=percentile(durations,0.95);
  invariant(p95<=250,`R58_SEARCH_P95_RED:${p95}`);
  const evidence={schemaVersion:"p0-one-monolith-r58-search-api-gate.v1",capturedAt:new Date().toISOString(),
    specSha256:SPEC_SHA256,source:{branch,head,tree,descendantOf691acb78:true},apiRoot:API_ROOT,
    definitionReleaseId:DEFINITION_RELEASE_ID,searchReleaseId:SEARCH_RELEASE_ID,
    walks,repeatAny:repeat,inventoryOracle:inventory,laminate:{literal:laminate.literalTotalCount,
      catalogId:laminate.items[0].catalogId,quantity:laminateQuantity.parsedQuantity,unit:laminateQuantity.parsedUnit},
    piecesQuantity:{quantity:pieces.parsedQuantity,unit:pieces.parsedUnit,catalogId:pieces.items[0].catalogId},
    mandatoryJourneys:mandatory,mandatoryDenominator:`${mandatory.length}/16`,referenceScopeLeak:reference.literalTotalCount,
    fuzzy:{total:fuzzy.fuzzyTotalCount,
      firstCatalogId:fuzzy.items[0].catalogId},group:{groupId,total:groupTotal,unique:new Set(groupIds).size},
    performance:{samples:durations.length,p95Ms:p95,maxMs:Math.max(...durations)},duplicateCatalogIds:0,
    legacyFirst15Cap:false,activeSearchReleaseSwitched:false,activeDefinitionReleaseSwitched:false,
    runtime8081Switched:false,terminalGreenClaimed:false,status:"GREEN_R58_SEARCH_API_DRAFT_NOT_ACTIVE"};
  writeJson(OUTPUT,evidence);process.stdout.write(`${JSON.stringify(evidence,null,2)}\n`);
}

void main().catch((error:unknown)=>{process.stderr.write(`${error instanceof Error?error.stack??error.message:String(error)}\n`);process.exitCode=1;});
