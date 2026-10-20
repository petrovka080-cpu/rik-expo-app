/** Presentation only. Every original row and requirement remains in the
 * immutable revision; only indistinguishable, unpriced pending alternatives
 * of one physical resource can share a public row. */
export type CanonicalPublicResourceAlternativeInputV1=Readonly<{
 id:string;sourceRowId:string;scopeId:string;titleRu:string;unitId:string;quantity:unknown;
 preliminary:boolean;unitPrice:unknown;amount:unknown;manual:boolean;graph:unknown;
}>;
export type CanonicalPublicResourceAlternativesV1={contractVersion:'canonical-public-resource-alternatives/v1';groupId:string;sourceRowIds:string[]};
function object(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;}
export function parseCanonicalPublicResourceAlternativesV1(value:unknown):CanonicalPublicResourceAlternativesV1|null{
 const v=object(value);if(!v||Object.keys(v).sort().join('|')!=='contractVersion|groupId|sourceRowIds'
  ||v.contractVersion!=='canonical-public-resource-alternatives/v1'||typeof v.groupId!=='string'||!v.groupId.trim()||v.groupId.length>1000
  ||!Array.isArray(v.sourceRowIds)||v.sourceRowIds.length<2||v.sourceRowIds.length>8
  ||v.sourceRowIds.some(id=>typeof id!=='string'||!id.trim()||id.length>1000)||new Set(v.sourceRowIds).size!==v.sourceRowIds.length)return null;
 const parsed=v as CanonicalPublicResourceAlternativesV1;
 return {contractVersion:'canonical-public-resource-alternatives/v1',groupId:parsed.groupId,sourceRowIds:[...parsed.sourceRowIds].sort()};
}
export function canonicalPublicHiddenResourceAlternativeIdsV1(rows:readonly CanonicalPublicResourceAlternativeInputV1[]):Set<string>{
 const groups=new Map<string,CanonicalPublicResourceAlternativeInputV1[]>(),hidden=new Set<string>();
 for(const row of rows){
  const raw=object(object(row.graph)?.publicResourceAlternativesV1);
  if(!raw||typeof raw.groupId!=='string'||!row.scopeId.trim())continue;
  const key=JSON.stringify([row.scopeId,raw.groupId]),group=groups.get(key)??[];group.push(row);groups.set(key,group);
 }
 for(const group of groups.values()){
  if(group.length<2||new Set(group.map(row=>row.id)).size!==group.length||new Set(group.map(row=>row.sourceRowId)).size!==group.length)continue;
  const first=group[0]!,base=parseCanonicalPublicResourceAlternativesV1(object(first.graph)?.publicResourceAlternativesV1);if(!base)continue;
  if(group.some(row=>{
   const d=parseCanonicalPublicResourceAlternativesV1(object(row.graph)?.publicResourceAlternativesV1);
   return !d||JSON.stringify(d)!==JSON.stringify(base)||!d.sourceRowIds.includes(row.sourceRowId)||!row.id||!row.preliminary||row.manual
    ||row.unitPrice!=null||row.amount!=null||row.titleRu!==first.titleRu||row.unitId!==first.unitId
    ||String(row.quantity??'')!==String(first.quantity??'');
  }))continue;
  const representative=group.find(row=>object(row.graph)?.costTreatment==='OWN_COST')??first;
  for(const row of group)if(row!==representative)hidden.add(row.id);
 }
 return hidden;
}
