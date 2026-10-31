import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import type { ChatMessage } from "../../src/lib/chat_api";

let mockParams={listingId:"listing-a"};
const mockFetch=jest.fn();
const mockSend=jest.fn();
const mockSubscribe=jest.fn((_listing:string,_callback:unknown)=>()=>{});
const mockScrollToEnd=jest.fn();
const mockAlert=jest.fn();
const mockIntent=jest.fn(()=>"00000000-0000-4000-8000-000000001000");
jest.mock("expo-router",()=>({useLocalSearchParams:()=>mockParams,router:{replace:()=>{}}}));
jest.mock("@expo/vector-icons",()=>({Ionicons:"Icon"}));
jest.mock("react-native-safe-area-context",()=>({SafeAreaView:"SafeAreaView"}));
jest.mock("react-native",()=>({View:"View",Text:"Text",Pressable:"Pressable",TextInput:"TextInput",ActivityIndicator:"ActivityIndicator",KeyboardAvoidingView:"KeyboardAvoidingView",ScrollView:"ScrollView",Platform:{OS:"web"},Alert:{alert:(...args:unknown[])=>mockAlert(...args)}}));
jest.mock("../../src/ui/FlashList",()=>{
  const React=require("react");
  return {FlashList:React.forwardRef((props:any,ref:unknown)=>{
    React.useImperativeHandle(ref,()=>({scrollToEnd:mockScrollToEnd}));
    return React.createElement("ChatList",props,props.ListHeaderComponent);
  })};
});
jest.mock("../../src/lib/chat_api",()=>({
  CHAT_BACKEND_HINT:"backend missing",CHAT_MESSAGE_PAGE_SIZE:100,
  createChatSendIntentId:()=>mockIntent(),fetchListingChatMessages:(...args:unknown[])=>mockFetch(...args),
  sendListingChatMessage:(...args:unknown[])=>mockSend(...args),markListingChatMessagesRead:async()=>{},
  deleteListingChatMessage:async()=>{},isChatBackendMissingError:()=>false,
  subscribeToListingChatMessages:(listing:string,callback:unknown)=>mockSubscribe(listing,callback),
}));
jest.mock("../../src/features/profile/currentProfileIdentity",()=>({loadCurrentProfileIdentity:async()=>({userId:"actor",fullName:"Actor"})}));
jest.mock("../../src/features/market/market.repository",()=>({loadMarketListingById:async()=>null}));
jest.mock("../../src/features/market/marketHome.config",()=>({MARKET_HOME_COLORS:{text:"#000",accentStrong:"#000"}}));
jest.mock("../../src/features/market/marketHome.data",()=>({buildMarketMapParams:()=>({})}));
jest.mock("../../src/lib/navigation/safeBack",()=>({safeBack:()=>{}}));
jest.mock("../../src/lib/navigation/coreRoutes",()=>({buildAssistantRoute:()=>"",buildMarketProductRoute:()=>"",buildSupplierMapRoute:()=>"",buildSupplierShowcaseRoute:()=>"",MARKET_AUCTIONS_ROUTE:"",MARKET_TAB_ROUTE:""}));
jest.mock("../../src/features/chat/ChatScreen.styles",()=>({styles:{}}));
import ChatScreen from "../../src/features/chat/ChatScreen";

const row=(n:number,extra:Partial<ChatMessage>={}):ChatMessage=>({id:`00000000-0000-4000-8000-${n.toString(16).padStart(12,"0")}`,created_at:`2026-10-29T00:00:00.${n.toString().padStart(6,"0")}Z`,user_id:"other",company_id:null,object_id:null,supplier_id:"listing-a",message_type:"text",content:String(n),mentions:[],read_by:["actor"],is_deleted:false,...extra});
const deferred=<T,>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return{promise,resolve};};
let tree:ReturnType<typeof TestRenderer.create>;
const list=()=>tree.root.findByType("ChatList" as never);
const change=(event:unknown)=>{const callback=mockSubscribe.mock.calls[mockSubscribe.mock.calls.length-1][1] as (event:unknown)=>void;callback(event);};
beforeEach(()=>{jest.useFakeTimers();mockParams={listingId:"listing-a"};mockFetch.mockReset();mockSend.mockReset();mockSubscribe.mockClear();mockIntent.mockClear();mockScrollToEnd.mockClear();mockAlert.mockClear();});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());jest.useRealTimers();});
const mount=async()=>{await act(async()=>{tree=TestRenderer.create(<ChatScreen/>);});};

it("prepends an older page without scrolling the reader to the end",async()=>{
  const latest=Array.from({length:100},(_,i)=>row(i+101));
  const older=Array.from({length:100},(_,i)=>row(i+1));
  mockFetch.mockResolvedValueOnce(latest).mockResolvedValueOnce(older);await mount();
  await act(async()=>tree.root.findByProps({testID:"chat-load-older-button"}).props.onPress());
  expect(mockFetch.mock.calls[1]).toEqual(["listing-a",100,{createdAt:latest[0].created_at,id:latest[0].id}]);
  expect(list().props.data).toHaveLength(200);expect(list().props.data[0].id).toBe(older[0].id);
  mockScrollToEnd.mockClear();await act(async()=>list().props.onContentSizeChange());
  expect(mockScrollToEnd).not.toHaveBeenCalled();
});
it("applies a realtime read receipt without reloading the history",async()=>{
  mockFetch.mockResolvedValue([row(1),row(2)]);await mount();
  await act(async()=>change({eventType:"UPDATE",id:row(2).id,message:row(2,{read_by:["actor","reader"]})}));
  await act(async()=>jest.advanceTimersByTime(300));
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(list().props.data[1].read_by).toEqual(["actor","reader"]);
});
it("does not overwrite a realtime edit with an earlier HTTP response",async()=>{
  const pending=deferred<ChatMessage[]>();const initial=[row(1),row(2)];const edited=[row(1),row(2,{content:"edited"})];
  mockFetch.mockResolvedValueOnce(initial).mockImplementationOnce(()=>pending.promise).mockResolvedValue(edited);await mount();
  await act(async()=>{change({eventType:"INSERT",id:row(3).id,message:row(3)});jest.advanceTimersByTime(250);});
  await act(async()=>change({eventType:"UPDATE",id:row(2).id,message:edited[1]}));
  await act(async()=>pending.resolve(initial));
  expect(list().props.data[1].content).toBe("edited");
  await act(async()=>jest.advanceTimersByTime(250));
  expect(list().props.data[1].content).toBe("edited");
});
it("ignores a response from the previous chat after changing listing",async()=>{
  const pending=deferred<ChatMessage[]>();mockFetch.mockImplementationOnce(()=>pending.promise).mockResolvedValue([row(99,{supplier_id:"listing-b"})]);await mount();
  mockParams={listingId:"listing-b"};await act(async()=>tree.update(<ChatScreen/>));
  await act(async()=>pending.resolve([row(1)]));
  expect(list().props.data.map((r:ChatMessage)=>r.content)).toEqual(["99"]);
});
it("retains one send intent across an ambiguous failure and retry",async()=>{
  mockFetch.mockResolvedValue([]);mockSend.mockRejectedValueOnce(new Error("response lost")).mockResolvedValue(row(1000,{user_id:"actor",content:"hello"}));await mount();
  await act(async()=>tree.root.findByProps({testID:"chat-composer-input"}).props.onChangeText("hello"));
  await act(async()=>tree.root.findByProps({testID:"chat-send-button"}).props.onPress());
  expect(tree.root.findByProps({testID:"chat-composer-input"}).props.value).toBe("hello");
  await act(async()=>tree.root.findByProps({testID:"chat-send-button"}).props.onPress());
  expect(mockSend.mock.calls[0][2]).toBe(mockSend.mock.calls[1][2]);expect(mockIntent).toHaveBeenCalledTimes(1);
  expect(list().props.data).toHaveLength(1);expect(tree.root.findByProps({testID:"chat-composer-input"}).props.value).toBe("");
});
