import { encodeEstimateRevisionAsyncStorageRecord as encode, decodeEstimateRevisionAsyncStorageRecord as decode } from "../../src/lib/platform/estimateRevisionAsyncStorageRecordCodec";
import { AsyncStorageEstimateRevisionDurableStore, ASYNC_STORAGE_COMPACTION_MAX_INSPECTED_RECORDS } from "../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";
import { createDurableEnvelope, durableRevisionRecordKey, stableEstimateRevisionChecksum, type RevisionBundle } from "../../src/lib/platform/estimateRevisionDurableStore.contract";

const prefix = "rik.estimate_revision_durable.v1:";
const fixture = (id: string, evidence = ""): RevisionBundle => ({
  draft: { id, consumerUserId: "capacity-test", status: "draft", title: "Проверка истории", problemText: "Контроль", repairType: "road_construction", createdAt: "2026-10-11T00:00:00Z", updatedAt: "2026-10-11T00:00:00Z" },
  items: [], media: [], pdfs: [], projectExecutionDrafts: [], marketplaceLink: { requestDraftId: id, publishedRequestId: null, linkedAt: null },
  durableHistorySummary: null, editableEstimateSnapshot: null, estimateDraftRevisionState: null, estimateRevisionState: null, structuredEstimatePayload: null,
  events: evidence ? [{ id: "source", requestDraftId: id, eventType: "canonical_revision_saved", userId: "capacity-test", createdAt: "2026-10-11T00:00:00Z", payload: { evidence } }] : [],
} as unknown as RevisionBundle);

it('writes and cold-reopens a first draft in an empty store before any compaction cursor exists',async()=>{
  const values=new Map<string,string>(),storage={getItem:async(key:string)=>values.get(key)??null,
    setItem:async(key:string,value:string)=>{values.set(key,value);},removeItem:async(key:string)=>{values.delete(key);}};
  const input=fixture('first-empty-store');
  expect((await new AsyncStorageEstimateRevisionDurableStore(storage).writeBundleAtomically(input.draft.id,null,input)).status).toBe('WRITTEN');
  expect(await new AsyncStorageEstimateRevisionDurableStore(storage).readBundle(input.draft.id)).toEqual(input);
});

function oldStore(chunked: boolean, repetitions = chunked ? 22000 : 1500) {
  const values = new Map<string, string>(), old = fixture("retained-approved-history", "История, ручные данные, PDF и закупка; 😀 ".repeat(repetitions));
  const serializedBundle = JSON.stringify(old), checksum = stableEstimateRevisionChecksum(serializedBundle), version = "old:content:" + checksum;
  const envelope = JSON.stringify(createDurableEnvelope({ key: old.draft.id, version, previousVersion: null, checksum, serializedBundle }));
  const revisionKey = prefix + durableRevisionRecordKey(old.draft.id, version);
  if (chunked) {
    const chunks = Array.from({ length: Math.ceil(envelope.length / 200000) }, (_, i) => envelope.slice(i * 200000, (i + 1) * 200000));
    const serializedChecksum = stableEstimateRevisionChecksum(envelope);
    chunks.forEach((text, i) => values.set(revisionKey + ":chunk:" + serializedChecksum + ":" + i, text));
    values.set(revisionKey, JSON.stringify({ schemaVersion: "estimate_revision_durable_chunk_manifest_v1", key: old.draft.id, version, chunkCount: chunks.length, serializedLength: envelope.length, serializedChecksum }));
  } else values.set(revisionKey, envelope);
  values.set(prefix + "@pointer:" + old.draft.id, JSON.stringify({ schemaVersion: "estimate_revision_durable_pointer_v1", currentVersion: version, previousVersion: null }));
  values.set(prefix + "__logical_key_index__", JSON.stringify({ schemaVersion: "estimate_revision_durable_logical_key_index_v1", keys: [old.draft.id] }));
  values.set(prefix + "__revision_index__:" + old.draft.id, JSON.stringify({ schemaVersion: "estimate_revision_durable_revision_index_v1", versions: [version] }));
  const originals = new Map(values), bytes = () => [...values.values()].reduce((n, v) => n + Buffer.byteLength(v), 0);
  let capacity = bytes() + 32, quotaFailures = 0, deleted = 0, writes = 0, reads = 0;
  const storage = {
    getItem: async (k: string) => { reads++; return values.get(k) ?? null; },
    setItem: async (k: string, v: string) => { writes++; if (bytes() - Buffer.byteLength(values.get(k) ?? "") + Buffer.byteLength(v) > capacity) { quotaFailures++; throw new Error("database or disk is full"); } values.set(k, v); },
    removeItem: async (k: string) => { deleted++; values.delete(k); },
    multiGet: async (keys: readonly string[]) => keys.map(k => [k, values.get(k) ?? null] as const),
  };
  return { values, originals, old, version, storage, bytes, setCapacity: (n: number) => { capacity = n; }, stats: () => ({ quotaFailures, deleted, writes, reads }) };
}

it.each([false, true])("recovers native quota by lossless same-key replacements, retaining exact legacy CAS and mixed records (chunked=%s)", async chunked => {
  const f = oldStore(chunked), store = new AsyncStorageEstimateRevisionDurableStore(f.storage);
  expect(await store.readBundle(f.old.draft.id)).toEqual(f.old);
  const result = await store.writeBundleAtomically("new-draft", null, fixture("new-draft", "Новая подтверждённая запись; ".repeat(2000)));
  expect(result.status).toBe("WRITTEN");expect(f.stats().quotaFailures).toBeGreaterThan(0);
  expect(f.stats().deleted).toBe(0);
  for (const [key, text] of f.originals) if (key.includes("@revision:") || key.includes("@pointer:")) expect(decode(f.values.get(key)!)).toBe(text);
  const reopened = new AsyncStorageEstimateRevisionDurableStore(f.storage);
  expect(await reopened.readBundle(f.old.draft.id)).toEqual(f.old);
  expect(await reopened.readBundle("new-draft")).toEqual(fixture("new-draft", "Новая подтверждённая запись; ".repeat(2000)));
  const conflict = await reopened.writeBundleAtomically(f.old.draft.id, "wrong-token", f.old);
  expect(conflict.status).toBe("FAILED");if (conflict.status === "FAILED") expect(conflict.error.currentVersion).toBe(f.version);
});

it("prepares room before the first large envelope write instead of waiting for quota failure", async()=>{
  const f=oldStore(true,120000);f.setCapacity(f.bytes()+8192);
  const store=new AsyncStorageEstimateRevisionDurableStore(f.storage);
  const result=await store.writeBundleAtomically('prepared-draft',null,fixture('prepared-draft','Новые сохранённые цены и история; '.repeat(40000)));
  expect(result.status).toBe('WRITTEN');expect(f.stats().quotaFailures).toBe(0);expect(f.stats().deleted).toBe(0);
  expect(await new AsyncStorageEstimateRevisionDurableStore(f.storage).readBundle(f.old.draft.id)).toEqual(f.old);
  expect(await new AsyncStorageEstimateRevisionDurableStore(f.storage).readBundle('prepared-draft')).toEqual(fixture('prepared-draft','Новые сохранённые цены и история; '.repeat(40000)));
});

it("reclaims enough bytes for a large chunk batch after a bounded pre-scan, beyond the former eight-record limit",async()=>{
  const f=oldStore(true,120000),orphans=Array.from({length:254},(_,i)=>'a-orphan-'+String(i).padStart(3,'0'));
  f.values.set(prefix+'__logical_key_index__',JSON.stringify({schemaVersion:'estimate_revision_durable_logical_key_index_v1',keys:[...orphans,f.old.draft.id]}));
  f.setCapacity(f.bytes()+8192);
  const storage={...f.storage,multiSet:async(entries:readonly(readonly[string,string])[])=>{for(const [key,value]of entries)await f.storage.setItem(key,value);}};
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',parts:string[]=[];let state=17431;
  for(let part=0;part<600;part++){let text='';for(let i=0;i<10000;i++){state^=state<<13;state^=state>>>17;state^=state<<5;text+=alphabet[(state>>>0)&63];}parts.push(text);}
  const incoming=fixture('0-new-large',parts.join(''));
  const result=await new AsyncStorageEstimateRevisionDurableStore(storage).writeBundleAtomically(incoming.draft.id,null,incoming);
  expect(result.status).toBe('WRITTEN');expect(f.stats().quotaFailures).toBeGreaterThan(0);
  const changed=[...f.originals].filter(([key,text])=>key.includes(':chunk:')&&f.values.get(key)!==text);
  expect(changed.length).toBeGreaterThan(8);for(const [key,text]of changed)expect(decode(f.values.get(key)!)).toBe(text);
  expect(await new AsyncStorageEstimateRevisionDurableStore(storage).readBundle(incoming.draft.id)).toEqual(incoming);
  expect(await new AsyncStorageEstimateRevisionDurableStore(storage).readBundle(f.old.draft.id)).toEqual(f.old);
  expect(f.stats().deleted).toBe(0);
});

it("bounds orphan logical-key visits and resumes past them on later writes after restart",async()=>{
  const f=oldStore(false),keys=Array.from({length:900},(_,i)=>'orphan-'+String(i).padStart(4,'0'));
  f.values.set(prefix+'__logical_key_index__',JSON.stringify({schemaVersion:'estimate_revision_durable_logical_key_index_v1',keys:[...keys,f.old.draft.id]}));
  f.setCapacity(f.bytes()+1024*1024);
  for(let pass=0;pass<5;pass++){
    const before=f.stats().reads;
    const result=await new AsyncStorageEstimateRevisionDurableStore(f.storage).writeBundleAtomically('new-'+pass,null,fixture('new-'+pass));
    expect(result.status).toBe('WRITTEN');
    // Actual write/CAS/index/readback adds a small fixed number outside the
    // preparation scan. Orphan entries must not trigger an unbounded scan.
    expect(f.stats().reads-before).toBeLessThan(ASYNC_STORAGE_COMPACTION_MAX_INSPECTED_RECORDS+30);
  }
  const key=prefix+durableRevisionRecordKey(f.old.draft.id,f.version);
  expect(f.values.get(key)).not.toBe(f.originals.get(key));expect(decode(f.values.get(key)!)).toBe(f.originals.get(key));
  expect(await new AsyncStorageEstimateRevisionDurableStore(f.storage).readBundle(f.old.draft.id)).toEqual(f.old);
});

it("does not starve a later RAW key behind two 129-chunk compressed retained versions",async()=>{
  const f=oldStore(true,120000),baseKey=prefix+durableRevisionRecordKey(f.old.draft.id,f.version);
  const first=JSON.parse(f.values.get(baseKey)!);
  const serialized=[...f.values.keys()].filter(k=>k.startsWith(baseKey+':chunk:')).map(k=>f.values.get(k)!).join('');
  function seed(version:string,body:string){
    const key=prefix+durableRevisionRecordKey(f.old.draft.id,version),checksum=stableEstimateRevisionChecksum(body),parts:string[]=[];
    for(let start=0,i=0;start<body.length;i++){
      let end=i===128?body.length:Math.min(body.length,start+Math.ceil(body.length/129));
      if(end<body.length&&body.charCodeAt(end-1)>=0xd800&&body.charCodeAt(end-1)<=0xdbff)end--;
      parts.push(body.slice(start,end));start=end;
    }
    expect(parts).toHaveLength(129);
    parts.forEach((part,i)=>f.values.set(key+':chunk:'+checksum+':'+i,encode(part)));
    f.values.set(key,JSON.stringify({...first,key:f.old.draft.id,version,chunkCount:parts.length,serializedLength:body.length,serializedChecksum:checksum}));
  }
  for(const k of [...f.values.keys()])if(k.startsWith(baseKey+':chunk:'))f.values.delete(k);
  seed(f.version,serialized);const previous='previous:'+f.version;
  seed(previous,JSON.stringify({...JSON.parse(serialized),version:previous}));
  f.values.set(prefix+'@pointer:'+f.old.draft.id,JSON.stringify({schemaVersion:'estimate_revision_durable_pointer_v1',currentVersion:f.version,previousVersion:previous}));
  const last=fixture('z-last-retained','Точная сохранённая история; '.repeat(6000)),text=JSON.stringify(last),checksum=stableEstimateRevisionChecksum(text),version='old:'+checksum;
  const raw=JSON.stringify(createDurableEnvelope({key:last.draft.id,version,previousVersion:null,checksum,serializedBundle:text}));
  const rawKey=prefix+durableRevisionRecordKey(last.draft.id,version);f.values.set(rawKey,raw);
  f.values.set(prefix+'@pointer:'+last.draft.id,JSON.stringify({schemaVersion:'estimate_revision_durable_pointer_v1',currentVersion:version,previousVersion:null}));
  f.values.set(prefix+'__logical_key_index__',JSON.stringify({schemaVersion:'estimate_revision_durable_logical_key_index_v1',keys:[f.old.draft.id,last.draft.id]}));
  f.setCapacity(f.bytes()+1024*1024);
  for(let i=0;i<3;i++)expect((await new AsyncStorageEstimateRevisionDurableStore(f.storage).writeBundleAtomically('a-new-'+i,null,fixture('a-new-'+i))).status).toBe('WRITTEN');
  expect(f.values.get(rawKey)).not.toBe(raw);expect(decode(f.values.get(rawKey)!)).toBe(raw);
  expect(await new AsyncStorageEstimateRevisionDurableStore(f.storage).readBundle(f.old.draft.id)).toEqual(f.old);
  expect(await new AsyncStorageEstimateRevisionDurableStore(f.storage).readBundle(last.draft.id)).toEqual(last);
  expect(f.stats().deleted).toBe(0);
});

it("keeps failure bounded and legacy history readable when recovered capacity remains insufficient", async () => {
  const f = oldStore(false), store = new AsyncStorageEstimateRevisionDurableStore(f.storage);
  f.setCapacity(100);const result = await store.writeBundleAtomically("new-draft", null, fixture("new-draft"));
  expect(result.status).toBe("FAILED");expect(f.stats().writes).toBeLessThanOrEqual(2);expect(f.stats().deleted).toBe(0);
  expect(await store.recoverLastValid(f.old.draft.id)).toEqual(f.old);
  expect(await store.readBundle("new-draft")).toBeNull();
});

it("retains atomic pointer semantics after process death with compressed physical records", async () => {
  const f = oldStore(false), store = new AsyncStorageEstimateRevisionDurableStore(f.storage, { failureInjector: point => { if (point === "before_pointer_switch") throw new Error("process death"); } });
  const result = await store.writeBundleAtomically("new-draft", null, fixture("new-draft", "Новая запись; ".repeat(4000)));
  expect(result.status).toBe("FAILED");expect(await store.readBundle("new-draft")).toBeNull();
  expect(await new AsyncStorageEstimateRevisionDurableStore(f.storage).recoverLastValid(f.old.draft.id)).toEqual(f.old);
});

it.each(["none", "after-compressed", "raw-before-cursor"])("visits every retained chunk once with finite cursor rotation on a new store (%s)", async mode => {
  const f = oldStore(true, 120000), originalBaseKey = [...f.values.keys()].find(k => k.includes("@revision:") && !k.includes(":chunk:"))!;
  const manifest = JSON.parse(f.values.get(originalBaseKey)!);
  const originalChunkKeys = [...f.values.keys()].filter(k => k.includes(":chunk:"));
  const body = originalChunkKeys.map(k => f.values.get(k)!).join("");
  // A valid old generation containing >64 chunks, not 64 new drafts.
  originalChunkKeys.forEach(k => f.values.delete(k));
  const parts: string[] = [];
  for (let start = 0; start < body.length;) {
    let end = Math.min(body.length, start + 50000);
    if (end < body.length && body.charCodeAt(end - 1) >= 0xd800 && body.charCodeAt(end - 1) <= 0xdbff) end--;
    parts.push(body.slice(start, end));start = end;
  }
  expect(parts.length).toBeGreaterThan(64);
  const checkpoint = 65;
  parts.forEach((part, i) => f.values.set(originalBaseKey + ":chunk:" + manifest.serializedChecksum + ":" + i, (mode === "raw-before-cursor" ? i >= checkpoint : i < checkpoint) ? encode(part) : part));
  expect(decode(f.values.get(originalBaseKey + ":chunk:" + manifest.serializedChecksum + ":0")!)).toBe(parts[0]);
  // The cursor is the persisted handoff after a preceding bounded pass.
  f.values.set(originalBaseKey, JSON.stringify({ ...manifest, chunkCount: parts.length }));
  if (mode !== "none") f.values.set(prefix + "__physical_record_compaction_cursor__", JSON.stringify({ key: f.old.draft.id, version: f.version, recordIndex: checkpoint }));
  const targetIndex = mode === "raw-before-cursor" ? 0 : checkpoint;
  const lateKey = originalBaseKey + ":chunk:" + manifest.serializedChecksum + ":" + targetIndex;
  const source = f.values.get(lateKey)!;
  f.setCapacity([...f.values.values()].reduce((n, v) => n + Buffer.byteLength(v), 0) + 32);
  const restarted = new AsyncStorageEstimateRevisionDurableStore(f.storage);
  expect(await restarted.readBundle(f.old.draft.id)).toEqual(f.old);
  const result = await restarted.writeBundleAtomically("next-draft", null, fixture("next-draft"));
  expect(result.status).toBe("WRITTEN");expect(decode(f.values.get(lateKey)!)).toBe(source);
  expect(await new AsyncStorageEstimateRevisionDurableStore(f.storage).readBundle(f.old.draft.id)).toEqual(f.old);
  expect(f.values.get(lateKey)).not.toBe(source);
  expect(JSON.parse(f.values.get(prefix + "__physical_record_compaction_cursor__")!).recordIndex).toBeGreaterThan(targetIndex);
});

it("checks bounded size, checksum, codec version, canonical base64 and exact Unicode without Node-only decoding", () => {
  const original = "Физическая запись 😀 с точными байтами; ".repeat(4000), encoded = encode(original);
  expect(encoded).not.toBe(original);expect(decode(encoded)).toBe(original);expect(decode("legacy" )).toBe("legacy");
  const record = JSON.parse(encoded);
  for (const patch of [{ rawByteLength: record.rawByteLength - 1 }, { rawByteLength: record.rawByteLength + 1 }, { rawByteLength: 2 * 1024 * 1024 + 1 }, { rawChecksum: "0".repeat(16) }, { codec: "other" }, { schemaVersion: "estimate_revision_async_storage_record_zlib_v2" }, { payload: record.payload.slice(0, -1) + "!" }]) expect(() => decode(JSON.stringify({ ...record, ...patch }))).toThrow();
});
