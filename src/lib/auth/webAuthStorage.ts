import { registerTimeout } from "../lifecycle/timerRegistry";

export const WEB_AUTH_DATABASE_NAME = "rik-supabase-auth-v1";
export const WEB_AUTH_OBJECT_STORE = "sessions";
const IO_TIMEOUT_MS = 5000;

type LegacyStorage = Pick<Storage,"getItem"|"setItem"|"removeItem">;
export type WebAuthStorage = {
  getItem(key:string):string|null|Promise<string|null>;
  setItem(key:string,value:string):void|Promise<void>;
  removeItem(key:string):void|Promise<void>;
};

/** One SDK client, with durable Web session storage independent of the small
 * localStorage quota used by existing drafts. Only SDK-supplied keys are read
 * or retired. A committed null is a logout tombstone, not a missing record.
 */
export function createWebAuthStorage(legacy:LegacyStorage,indexedDb?:IDBFactory):WebAuthStorage {
  if(!indexedDb)return legacy;
  let databasePromise:Promise<IDBDatabase>|null=null;
  const openDatabase=():Promise<IDBDatabase>=>{
    if(databasePromise)return databasePromise;
    const opening=new Promise<IDBDatabase>((resolve,reject)=>{
      const request=indexedDb.open(WEB_AUTH_DATABASE_NAME,1);
      let settled=false;
      const fail=(error:unknown)=>{
        if(settled)return;settled=true;timeout.dispose();reject(error);
      };
      const timeout=registerTimeout("auth_storage:open",()=>fail(new Error("Browser auth storage open timed out")),IO_TIMEOUT_MS);
      request.onupgradeneeded=()=>{
        if(settled){request.transaction?.abort();return;}
        if(!request.result.objectStoreNames.contains(WEB_AUTH_OBJECT_STORE))request.result.createObjectStore(WEB_AUTH_OBJECT_STORE);
      };
      request.onsuccess=()=>{
        const database=request.result;
        if(settled){database.close();return;}
        settled=true;timeout.dispose();
        database.onversionchange=()=>{database.close();if(databasePromise===opening)databasePromise=null;};
        resolve(database);
      };
      request.onerror=()=>fail(request.error??new Error("Browser auth storage could not be opened"));
      request.onblocked=()=>fail(new Error("Browser auth storage open is blocked"));
    });
    databasePromise=opening;
    void opening.catch(()=>{if(databasePromise===opening)databasePromise=null;});
    return opening;
  };

  const transaction=async(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest):Promise<unknown>=>{
    const database=await openDatabase();
    return new Promise((resolve,reject)=>{
      const tx=database.transaction(WEB_AUTH_OBJECT_STORE,mode);
      let settled=false,result:unknown;
      const fail=(error:unknown)=>{if(settled)return;settled=true;timeout.dispose();reject(error);};
      const timeout=registerTimeout("auth_storage:transaction",()=>{
        try{tx.abort();}catch{/* Already completed; keep the failure explicit. */}
        fail(new Error("Browser auth storage transaction timed out"));
      },IO_TIMEOUT_MS);
      tx.oncomplete=()=>{if(settled)return;settled=true;timeout.dispose();resolve(result);};
      tx.onabort=()=>fail(tx.error??new Error("Browser auth storage transaction aborted"));
      tx.onerror=()=>fail(tx.error??new Error("Browser auth storage transaction failed"));
      try{
        const request=action(tx.objectStore(WEB_AUTH_OBJECT_STORE));
        request.onsuccess=()=>{result=request.result;};
        request.onerror=()=>fail(request.error??new Error("Browser auth storage request failed"));
      }catch(error){
        try{tx.abort();}catch{/* No pending transaction remains. */}
        fail(error);
      }
    });
  };
  let pending:Promise<unknown>=Promise.resolve();
  const serial=<T>(action:()=>Promise<T>):Promise<T>=>{
    const next=pending.then(action,action);
    pending=next.then(()=>undefined,()=>undefined);
    return next;
  };
  const retireLegacy=(key:string)=>{
    // The committed IDB value/tombstone stays authoritative if this cleanup
    // fails. No draft/cache key is enumerated, cleared or evicted.
    try{legacy.removeItem(key);}catch{/* The durable session already committed. */}
  };
  return {
    getItem:key=>serial(async()=>{
      const value=await transaction("readonly",store=>store.get(key));
      if(value===undefined)return legacy.getItem(key);
      if(value===null||typeof value==="string")return value;
      throw new Error("Invalid browser auth storage record");
    }),
    setItem:(key,value)=>serial(async()=>{
      await transaction("readwrite",store=>store.put(value,key));
      retireLegacy(key);
    }),
    removeItem:key=>serial(async()=>{
      await transaction("readwrite",store=>store.put(null,key));
      retireLegacy(key);
    }),
  };
}
