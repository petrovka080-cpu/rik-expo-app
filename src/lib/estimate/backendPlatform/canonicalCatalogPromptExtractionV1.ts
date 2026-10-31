import {estimateRevisionUtf8ByteLength} from "../../platform/estimateRevisionDurableSerialization";
import {CanonicalEstimateApiError,type CanonicalCatalogPromptInputV1,
  type CanonicalCatalogPromptExtractionV1} from "./contracts";

type Catalog = CanonicalCatalogPromptInputV1;
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
function invalid():never{throw new CanonicalEstimateApiError("Данные запроса не соответствуют выбранной версии работы.",
  {code:"CATALOG_PROMPT_BINDING_INVALID",httpStatus:409});}
export function canonicalCatalogPromptSchemaV1(catalog:Catalog):CanonicalCatalogPromptExtractionV1["schema"]{
  return catalog.parameterSchema.map(({parameterId,ordinal,valueType,unitId,titleRu})=>({parameterId,ordinal,valueType,unitId,titleRu}));
}
export function assertCanonicalCatalogPromptExtractionV1(value:unknown,catalog:Catalog,prompt:string):asserts value is CanonicalCatalogPromptExtractionV1{
  if(!object(value)||value.contract!=="canonical-catalog-prompt-extraction/v1"
    ||typeof value.catalogId!=="string"||!value.catalogId||typeof value.releaseId!=="string"||!value.releaseId
    ||typeof value.definitionVersion!=="number"||!Number.isInteger(value.definitionVersion)||value.definitionVersion<1||typeof value.prompt!=="string"
    ||value.catalogId!==catalog.catalogId||value.releaseId!==catalog.releaseId
    ||value.definitionVersion!==catalog.definitionVersion||value.prompt!==prompt
    ||!Array.isArray(value.schema)||!Object.hasOwn(value,"concretePlacement"))invalid();
  const hasIdentity=Object.hasOwn(catalog,"immutableCalculationIdentityV1");
  if(Object.hasOwn(value,"immutableCalculationIdentityV1")!==hasIdentity)invalid();
  if(hasIdentity){
    const actual=value.immutableCalculationIdentityV1,expected=catalog.immutableCalculationIdentityV1;
    if(!object(actual)||!expected||Object.keys(actual).length!==4
      ||![actual.catalogId,actual.definitionVersionId,actual.definitionSha256,actual.approvedTemplateBaselineId].every(v=>typeof v==="string"&&v.length>0)
      ||actual.catalogId!==expected.catalogId||actual.catalogId!==catalog.catalogId
      ||actual.definitionVersionId!==expected.definitionVersionId||actual.definitionSha256!==expected.definitionSha256
      ||actual.approvedTemplateBaselineId!==expected.approvedTemplateBaselineId)invalid();
  }
  const expected=canonicalCatalogPromptSchemaV1(catalog);
  if(value.schema.length!==expected.length)invalid();
  for(let i=0;i<expected.length;i++){
    const actual=value.schema[i],entry=expected[i]!;
    if(!object(actual)||actual.parameterId!==entry.parameterId||actual.ordinal!==entry.ordinal
      ||actual.valueType!==entry.valueType||actual.unitId!==entry.unitId||actual.titleRu!==entry.titleRu)invalid();
  }
  if(value.concretePlacement===null)return;
  if(!object(value.concretePlacement))invalid();
  const ids=new Set(catalog.parameterSchema.map(p=>p.parameterId));
  for(const[id,v]of Object.entries(value.concretePlacement)){
    if(!ids.has(id)||!(typeof v==="string"||typeof v==="boolean"||typeof v==="number"&&Number.isFinite(v)))invalid();
  }
}
export function parseCanonicalCatalogPromptRequestV1(body:unknown):Readonly<{prompt:string;releaseId?:string}>{
  function fail():never{throw new CanonicalEstimateApiError("Нужен исходный текст запроса и корректная версия работы.",
    {code:"INVALID_ARGUMENT",httpStatus:400});}
  if(!object(body)||Object.keys(body).some(k=>k!=="prompt"&&k!=="releaseId")
    ||typeof body.prompt!=="string"||!body.prompt.trim()||body.prompt.trim().length>4000)fail();
  if(body.releaseId!==undefined&&(typeof body.releaseId!=="string"
    ||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.releaseId)))fail();
  return{prompt:body.prompt,...(body.releaseId===undefined?{}:{releaseId:body.releaseId as string})};
}

// Bounds only the new prompt POST. Existing catalog GET and compile contracts retain their limits.
export const MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1 = 64 * 1024;
export const MAX_CANONICAL_CATALOG_PROMPT_RESPONSE_BYTES_V1 = 4 * 1024 * 1024;
export function assertCanonicalCatalogPromptBytesV1(text:string,maximumBytes:number,side:"request"|"response"):void{
  if(estimateRevisionUtf8ByteLength(text)>maximumBytes)throw new CanonicalEstimateApiError(
    side==="request"?"Текст запроса слишком большой.":"Ответ каталога превышает допустимый размер.",
    {code:side==="request"?"REQUEST_TOO_LARGE":"CATALOG_PROMPT_RESPONSE_TOO_LARGE",httpStatus:side==="request"?413:502});
}
/** A bounded HTTP JSON reader, independent of normative parsing. Browser/Deno
 * streams stop before accumulating beyond the cap. RN without a reader uses
 * its Response.text transport and rejects an oversized decoded body. */
export async function readCanonicalCatalogPromptJsonV1(message:Pick<Response,"headers"|"body"|"text">,
  side:"request"|"response"):Promise<unknown>{
  const maximumBytes=side==="request"?MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1:MAX_CANONICAL_CATALOG_PROMPT_RESPONSE_BYTES_V1;
  const tooLarge=():never=>{throw new CanonicalEstimateApiError(
    side==="request"?"Текст запроса слишком большой.":"Ответ каталога превышает допустимый размер.",
    {code:side==="request"?"REQUEST_TOO_LARGE":"CATALOG_PROMPT_RESPONSE_TOO_LARGE",httpStatus:side==="request"?413:502});};
  const declared=message.headers.get("content-length");
  if(declared!==null&&/^\d+$/u.test(declared)&&Number(declared)>maximumBytes)tooLarge();
  let text:string;
  const reader=message.body?.getReader?.();
  if(reader){
    const chunks:Uint8Array[]=[];let size=0;
    try{
      for(;;){const part=await reader.read();if(part.done)break;
        size+=part.value.byteLength;
        if(size>maximumBytes){await reader.cancel().catch(()=>undefined);tooLarge();}
        chunks.push(part.value);
      }
    }finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    text=new TextDecoder().decode(bytes);
  }else{text=await message.text();}
  assertCanonicalCatalogPromptBytesV1(text,maximumBytes,side);
  try{return JSON.parse(text);}catch{throw new CanonicalEstimateApiError(
    side==="request"?"Некорректный JSON запроса.":"Некорректный ответ каталога.",
    {code:side==="request"?"INVALID_ARGUMENT":"CATALOG_PROMPT_RESPONSE_INVALID",httpStatus:side==="request"?400:502});}
}
