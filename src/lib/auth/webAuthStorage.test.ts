import { IDBFactory,IDBObjectStore as MemoryObjectStore } from "fake-indexeddb";
import { createWebAuthStorage,WEB_AUTH_DATABASE_NAME,WEB_AUTH_OBJECT_STORE } from "./webAuthStorage";

const key="sb-synthetic-auth-token",draftKey="rik.consumerRepair.synthetic-draft";
function legacy(initial:string|null="legacy-session"){
  const values=new Map<string,string>([[draftKey,'{"quantity":35,"unitPrice":77,"history":["saved"]}']]);
  if(initial!==null)values.set(key,initial);
  return {values,storage:{getItem:jest.fn((k:string)=>values.get(k)??null),
    setItem:jest.fn((_k:string,_v:string)=>{throw new Error("QuotaExceededError");}),
    removeItem:jest.fn((k:string)=>{values.delete(k);})}};
}
afterEach(()=>jest.restoreAllMocks());

test("reads a pre-migration session without touching its drafts or forcing a write",async()=>{
  const old=legacy(),before=[...old.values],storage=createWebAuthStorage(old.storage,new IDBFactory());
  expect(await storage.getItem(key)).toBe("legacy-session");
  expect([...old.values]).toEqual(before);expect(old.storage.setItem).not.toHaveBeenCalled();expect(old.storage.removeItem).not.toHaveBeenCalled();
});

test("persists a session across adapter recreation despite a full legacy quota, preserving drafts",async()=>{
  const old=legacy(),draft=old.values.get(draftKey),db=new IDBFactory();
  await createWebAuthStorage(old.storage,db).setItem(key,"new-session");
  expect(await createWebAuthStorage(old.storage,db).getItem(key)).toBe("new-session");
  expect(old.values.get(draftKey)).toBe(draft);expect(old.values.has(key)).toBe(false);expect(old.storage.setItem).not.toHaveBeenCalled();
  expect(old.storage.removeItem.mock.calls).toEqual([[key]]);
});

test("a committed new session remains authoritative if legacy retirement is denied",async()=>{
  const old=legacy(),db=new IDBFactory();old.storage.removeItem.mockImplementation(()=>{throw new Error("SecurityError");});
  await createWebAuthStorage(old.storage,db).setItem(key,"new-session");
  expect(old.values.get(key)).toBe("legacy-session");
  expect(await createWebAuthStorage(old.storage,db).getItem(key)).toBe("new-session");
});

test("logout never resurrects an old legacy token after reload, even if legacy removal fails",async()=>{
  const old=legacy(),db=new IDBFactory();old.storage.removeItem.mockImplementation(()=>{throw new Error("SecurityError");});
  await createWebAuthStorage(old.storage,db).removeItem(key);old.storage.getItem.mockClear();
  expect(await createWebAuthStorage(old.storage,db).getItem(key)).toBeNull();expect(old.storage.getItem).not.toHaveBeenCalled();
  expect(old.values.get(draftKey)).toBeDefined();expect(old.values.get(key)).toBe("legacy-session");
});

test("an aborted durable write keeps the previous session and drafts even after the put request succeeded",async()=>{
  const old=legacy(),before=[...old.values],db=new IDBFactory(),put=MemoryObjectStore.prototype.put;
  jest.spyOn(MemoryObjectStore.prototype,"put").mockImplementationOnce(function(this:IDBObjectStore,value:unknown,k?:IDBValidKey){
    const request=put.call(this,value,k);request.addEventListener("success",()=>this.transaction.abort(),{once:true});return request;
  });
  const storage=createWebAuthStorage(old.storage,db);
  await expect(storage.setItem(key,"not-committed-session")).rejects.toThrow(/abort/i);
  expect([...old.values]).toEqual(before);expect(old.storage.removeItem).not.toHaveBeenCalled();expect(await storage.getItem(key)).toBe("legacy-session");
});

test("failed database access does not fall back to a possibly superseded legacy session",async()=>{
  const old=legacy(),db=new IDBFactory();jest.spyOn(db,"open").mockImplementation(()=>{throw new Error("IndexedDB unavailable");});
  await expect(createWebAuthStorage(old.storage,db).getItem(key)).rejects.toThrow("IndexedDB unavailable");
  expect(old.storage.getItem).not.toHaveBeenCalled();expect(old.storage.removeItem).not.toHaveBeenCalled();
});

test("failed database writes cannot discard the previous legacy session",async()=>{
  const old=legacy(),before=[...old.values],db=new IDBFactory();jest.spyOn(db,"open").mockImplementation(()=>{throw new Error("IndexedDB unavailable");});
  await expect(createWebAuthStorage(old.storage,db).setItem(key,"new-session")).rejects.toThrow("IndexedDB unavailable");
  expect([...old.values]).toEqual(before);expect(old.storage.removeItem).not.toHaveBeenCalled();
});

test("concurrent refresh/logout calls preserve their invocation order and survive recreation",async()=>{
  const old=legacy(),db=new IDBFactory(),storage=createWebAuthStorage(old.storage,db);
  await Promise.all([storage.setItem(key,"first-session"),storage.removeItem(key),storage.setItem(key,"last-session")]);
  expect(await createWebAuthStorage(old.storage,db).getItem(key)).toBe("last-session");
});

test("a malformed durable record is rejected instead of reviving a legacy token",async()=>{
  const db=new IDBFactory(),old=legacy();
  await new Promise<void>((resolve,reject)=>{
    const request=db.open(WEB_AUTH_DATABASE_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(WEB_AUTH_OBJECT_STORE);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const database=request.result,tx=database.transaction(WEB_AUTH_OBJECT_STORE,"readwrite");
      tx.objectStore(WEB_AUTH_OBJECT_STORE).put({malformed:true},key);
      tx.oncomplete=()=>{database.close();resolve();};tx.onabort=()=>reject(tx.error);
    };
  });
  await expect(createWebAuthStorage(old.storage,db).getItem(key)).rejects.toThrow("Invalid browser auth storage record");
  expect(old.storage.getItem).not.toHaveBeenCalled();
});

test("browsers without IndexedDB retain their existing storage semantics",()=>{
  const old=legacy(),storage=createWebAuthStorage(old.storage,undefined);
  expect(storage).toBe(old.storage);expect(storage.getItem(key)).toBe("legacy-session");
  expect(()=>storage.setItem(key,"new-session")).toThrow("QuotaExceededError");
  expect(old.values.get(key)).toBe("legacy-session");
});
