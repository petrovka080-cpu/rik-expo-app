const mockActor="aaaaaaaa-0000-4000-8000-000000000001";
const mockListing="bbbbbbbb-0000-4000-8000-000000000001";
let mockRows: Record<string,any>[]=[];
let mockLoseResponse=false, mockReadbackUnavailable=false;
const mockSubscribe=jest.fn((_params:unknown)=>()=>{});
const mockBff=jest.fn(async(_request:unknown)=>({status:"unavailable"}));
const mockFrom=jest.fn((table:string)=>{
  const filters: [string,unknown][]=[]; const orders: [string,boolean][]=[];
  let cursor:string|undefined, write: Record<string,any>|undefined;
  const source=()=>table==="chat_messages"?mockRows:table==="user_profiles"?[{user_id:mockActor,full_name:"Actor"}]:table==="companies"?[{id:"cccccccc-0000-4000-8000-000000000001",owner_user_id:mockActor}]:[];
  const rows=()=>source().filter(r=>filters.every(([k,v])=>r[k]===v));
  const q:any={
    select:()=>q,eq:(key:string,value:unknown)=>{filters.push([key,value]);return q;},
    not:()=>q,in:()=>q,limit:()=>q,
    order:(key:string,{ascending}: {ascending:boolean})=>{orders.push([key,ascending]);return q;},
    or:(value:string)=>{cursor=value;return q;},
    range:async(from:number,to:number)=>{
      let result=rows();
      if(cursor){const timestamp=cursor.match(/^created_at\.lt\.([^,]+),/)?.[1];const id=cursor.match(/id\.lt\.([\da-f-]+)\)$/)?.[1];
        if(!timestamp||!id)throw new Error("Bad cursor filter");
        result=result.filter(r=>r.created_at<timestamp||(r.created_at===timestamp&&r.id<id));}
      result=[...result].sort((a,b)=>{for(const[k,asc]of orders){const n=String(a[k]).localeCompare(String(b[k]));if(n)return asc?n:-n;}return 0;});
      return{data:result.slice(from,to+1),error:null};
    },
    upsert:(payload:Record<string,any>,options:unknown)=>{
      expect(options).toEqual({onConflict:"id",ignoreDuplicates:true});write=payload;return q;
    },
    maybeSingle:async()=>{
      if(write){const existing=mockRows.find(r=>r.id===write!.id);let inserted:Record<string,any>|null=null;
        if(!existing){inserted={...write,is_deleted:false,created_at:"2026-10-29T00:00:01.123456Z",read_by:[]};mockRows.push(inserted);}
        if(mockLoseResponse){mockLoseResponse=false;return{data:null,error:{message:"Network response lost after commit"}};}
        return{data:inserted,error:null};
      }
      if(table==="chat_messages"&&mockReadbackUnavailable){mockReadbackUnavailable=false;return{data:null,error:{message:"Temporary readback failure"}};}
      return{data:rows()[0]??null,error:null};
    },
  };return q;
});
jest.mock("react-native-get-random-values",()=>({}));
jest.mock("../../src/lib/supabaseClient",()=>({supabase:{from:(table:string)=>mockFrom(table)}}));
jest.mock("../../src/lib/api/_core",()=>({client:{},normalizePage:({pageSize}:{pageSize:number},{maxRows}:{maxRows:number})=>({from:0,to:Math.min(pageSize,maxRows)-1})}));
jest.mock("../../src/lib/assistant_store_read.bff.client",()=>({callAssistantStoreReadBff:(request:unknown)=>mockBff(request)}));
jest.mock("../../src/lib/chat.auth.transport",()=>({getCurrentChatAuthUser:async()=>({data:{user:{id:mockActor}},error:null})}));
jest.mock("../../src/lib/realtime/realtime.client",()=>({subscribeChannel:(params:unknown)=>mockSubscribe(params)}));

import {fetchListingChatMessages,sendListingChatMessage,subscribeToListingChatMessages} from "../../src/lib/chat_api";
import {normalizeChatMessageCursor} from "../../src/lib/assistant_store_read.bff.contract";
import {isAssistantStoreReadBffRequestDto} from "../../src/lib/assistant_store_read.bff.handler";

const id=(n:number)=>`00000000-0000-4000-8000-${n.toString(16).padStart(12,"0")}`;
const message=(n:number)=>({id:id(n),user_id:mockActor,supplier_id:mockListing,is_deleted:false,message_type:"text",content:String(n),mentions:[],created_at:`2026-10-29T00:00:00.${(Math.floor(n/3)*500).toString().padStart(6,"0")}Z`});
beforeEach(()=>{mockRows=[];mockLoseResponse=false;mockReadbackUnavailable=false;mockFrom.mockClear();mockBff.mockClear();mockSubscribe.mockClear();});

describe("chat latest page and older keyset history",()=>{
  it("shows message235 on reload and pages all235 messages without overlap or missing timestamp ties",async()=>{
    mockRows=Array.from({length:235},(_,i)=>message(i+1));
    const latest=await fetchListingChatMessages(mockListing);
    expect(latest).toHaveLength(100);expect(latest[latest.length-1]?.content).toBe("235");
    const seen=[...latest];let page=latest;
    while(page.length===100){page=await fetchListingChatMessages(mockListing,100,{createdAt:page[0].created_at,id:page[0].id});seen.push(...page);}
    expect(seen).toHaveLength(235);expect(new Set(seen.map(r=>r.id)).size).toBe(235);
    expect(seen.map(r=>Number(r.content)).sort((a,b)=>a-b)).toEqual(Array.from({length:235},(_,i)=>i+1));
  });
  it("preserves microseconds while normalizing timezone and rejects cursor filter injection",async()=>{
    expect(normalizeChatMessageCursor({createdAt:"2026-10-29T05:30:00.123456+05:30",id:id(1)})).toEqual({createdAt:"2026-10-29T00:00:00.123456Z",id:id(1)});
    await expect(fetchListingChatMessages(mockListing,100,{createdAt:"2026-10-29T00:00:00Z),supplier_id.neq.x",id:id(1)})).rejects.toThrow("CHAT_CURSOR_INVALID");
    expect(mockFrom).not.toHaveBeenCalled();
    expect(isAssistantStoreReadBffRequestDto({operation:"chat.listing.messages.list",args:{listingId:mockListing,before:{createdAt:"2026-10-29T00:00:00Z",id:"x)"}}})).toBe(false);
  });
  it("keeps other listings and deleted messages out of the latest page",async()=>{
    mockRows=[message(1),{...message(2),is_deleted:true},{...message(3),supplier_id:id(50)}];
    expect((await fetchListingChatMessages(mockListing)).map(r=>r.content)).toEqual(["1"]);
  });
  it("preserves database precision with an engine that accepts only standard milliseconds",()=>{
    const nativeParse=Date.parse.bind(Date);
    const parser=jest.spyOn(Date,"parse").mockImplementation(value=>/\.\d{4,}/.test(value)?NaN:nativeParse(value));
    try {
      expect(normalizeChatMessageCursor({createdAt:"2026-10-29T05:30:00.123456+05:30",id:id(1)})).toEqual({createdAt:"2026-10-29T00:00:00.123456Z",id:id(1)});
    } finally {parser.mockRestore();}
  });
});

describe("chat stable send intent against existing primary key",()=>{
  it("reads back a committed send whose response was lost",async()=>{
    mockLoseResponse=true;
    const row=await sendListingChatMessage(mockListing,"hello",id(500));
    expect(row.id).toBe(id(500));expect(mockRows).toHaveLength(1);
  });
  it("retries an unresolved send using the same id without inserting twice",async()=>{
    mockLoseResponse=true;mockReadbackUnavailable=true;
    await expect(sendListingChatMessage(mockListing,"hello",id(500))).rejects.toThrow();
    expect((await sendListingChatMessage(mockListing,"hello",id(500))).id).toBe(id(500));
    expect(mockRows).toHaveLength(1);
  });
  it("a distinct intent permits identical text and a reused intent never overwrites content",async()=>{
    await sendListingChatMessage(mockListing,"hello",id(500));
    await expect(sendListingChatMessage(mockListing,"changed",id(500))).rejects.toThrow();
    await sendListingChatMessage(mockListing,"hello",id(501));
    expect(mockRows.map(r=>r.content)).toEqual(["hello","hello"]);
  });
  it("supplies normalized realtime updates for in-place read receipt reconciliation",()=>{
    const onChange=jest.fn();subscribeToListingChatMessages(mockListing,onChange);
    const subscription=mockSubscribe.mock.calls[0][0] as unknown as {onEvent:(event:unknown)=>void};
    subscription.onEvent({payload:{eventType:"UPDATE",new:{...message(1),read_by:[mockActor]},old:{id:id(1)}}});
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({eventType:"UPDATE",id:id(1),message:expect.objectContaining({read_by:[mockActor]})}));
  });
});
