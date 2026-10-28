import type { ChatMessage } from "../../src/lib/chat_api";
import { hasChatContentChanged, mergeChatMessages, reconcileLatestChatMessages } from "../../src/features/chat/chatThreadState";

const row = (n: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`,
  created_at: `2026-10-29T00:00:00.${n.toString().padStart(6, "0")}Z`,
  user_id: "actor", company_id: null, object_id: null, supplier_id: "listing",
  message_type: "text", content: String(n), mentions: [], is_deleted: false, ...extra,
});

describe("chat loaded history reconciliation", () => {
  it("preserves older loaded history and refreshes the latest window", () => {
    const previous = [1, 2, 3, 4, 5].map(n => row(n));
    const latest = [row(4, { content: "edited" }), row(5), row(6)];
    const result = reconcileLatestChatMessages(previous, latest, 3);
    expect(result.messages.map(m => m.content)).toEqual(["1", "2", "3", "edited", "5", "6"]);
    expect(result.resetHistory).toBe(false);
  });
  it("removes deleted rows from the refreshed window", () => {
    const result = reconcileLatestChatMessages([1,2,3,4].map(n=>row(n)),[row(2),row(4),row(5)],3);
    expect(result.messages.map(m=>m.content)).toEqual(["1","2","4","5"]);
  });
  it("resets a disjoint latest page so older paging cannot skip a hidden gap", () => {
    const result = reconcileLatestChatMessages([1,2,3].map(n=>row(n)),[100,101,102].map(n=>row(n)),3);
    expect(result.resetHistory).toBe(true);
    expect(result.messages.map(m=>m.content)).toEqual(["100","101","102"]);
  });
  it("a complete refresh clears stale older rows including an empty thread", () => {
    expect(reconcileLatestChatMessages([row(1),row(2)],[row(2)],100).messages).toEqual([row(2)]);
    expect(reconcileLatestChatMessages([row(1)],[],100).messages).toEqual([]);
  });
  it("deduplicates a send/realtime overlap and keeps microsecond order", () => {
    const result=mergeChatMessages([row(101),row(100)],[row(100,{read_by:["actor"]}),row(102)]);
    expect(result.map(m=>m.content)).toEqual(["100","101","102"]);
    expect(result[0].read_by).toEqual(["actor"]);
  });
  it("uses id for identical timestamps and removes explicit tombstones", () => {
    const a=row(2,{created_at:row(1).created_at});
    expect(mergeChatMessages([a,row(1)],[row(3)]).map(m=>m.content)).toEqual(["1","2","3"]);
    expect(mergeChatMessages([row(1),row(2)],[row(1,{is_deleted:true})])).toEqual([row(2)]);
  });
  it("does not turn a stale HTTP refresh into unread state after a realtime receipt", () => {
    const previous=[row(1,{read_by:["reader"]}),row(2)];
    const result=reconcileLatestChatMessages(previous,[row(1,{read_by:[]}),row(2)],2);
    expect(result.messages[0].read_by).toEqual(["reader"]);
    expect(hasChatContentChanged(row(1),row(1,{read_by:["reader"]}))).toBe(false);
    expect(hasChatContentChanged(row(1),row(1,{content:"edited"}))).toBe(true);
  });
});
