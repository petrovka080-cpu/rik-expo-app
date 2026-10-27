import {canonicalPublicEstimateChoiceLabelRu,canonicalPublicEstimateRowNameRu,canonicalPublicEstimateRowDetailsRu,
  canonicalPublicEstimateSelectedSpecificationIsInRowNameRu} from './canonicalPublicEstimateLanguageRu';

type RecordValue=Readonly<Record<string,unknown>>;
const record=(v:unknown):RecordValue|null=>v!=null&&typeof v==='object'&&!Array.isArray(v)?v as RecordValue:null;
const text=(v:unknown):string|null=>typeof v==='string'&&v.trim()?v.trim():null;
const productSpecificationId=(id:string)=>/(?:_spec|_specification|_designation|_standard_and_grade|_class|_watertightness|_frost_resistance|_mobility)$/u.test(id);

/** Unstructured project selections retain their complete source value in
 * details. A public resource name contains the functional name and measurable
 * characteristics; document identities and commercial model text confer no
 * new material/technology admission. No quantity or saved descriptor changes. */
export function canonicalPublicPhysicalSpecificationPartsV1(value:string):readonly string[]{
  const number='\\d+(?:[.,]\\d+)?',unit='(?:мм|см|м²|м³|м2|м3|м|кг|т|л|мл|кВт|кВА|Вт|В|А|Гц|кН|Н|МПа|Па|mm|cm|m²|m³|m2|m3|m|kg|t|ml|l|kW|kVA|W|V|A|Hz|kN|MPa|Pa)';
  const patterns=[
    new RegExp('(?:^|[\\s,;(/])('+number+'(?:\\s*[×xх]\\s*'+number+'){1,2}\\s*'+unit+')(?![\\p{L}\\p{N}_])','gu'),
    new RegExp('(?:^|[\\s,;(/])((?:Ø|⌀|DN|Ду|диаметр)\\s*'+number+'(?:\\s*(?:мм|см|м|mm|cm|m))?)(?![\\p{L}\\p{N}_])','giu'),
    /(?:^|[\s,;(/])([AАBВМMПPФFW]\s?\d+(?:[.,]\d+)?[A-Za-zА-Яа-яЁё]*)(?![\p{L}\p{N}_])/gu,
    new RegExp('(?:^|[\\s,;(/])('+number+'\\s*'+unit+')(?![\\p{L}\\p{N}_])','gu'),
  ];
  const matches=patterns.flatMap(pattern=>[...value.matchAll(pattern)].map(m=>({start:m.index!+m[0].indexOf(m[1]!),end:m.index!+m[0].indexOf(m[1]!)+m[1]!.length,value:m[1]!})))
    .sort((a,b)=>a.start-b.start||b.end-a.end);
  const accepted:typeof matches=[];
  for(const m of matches)if(!accepted.some(a=>m.start<a.end&&m.end>a.start))accepted.push(m);
  return [...new Set(accepted.map(m=>canonicalPublicEstimateChoiceLabelRu(m.value)))];
}

export function canonicalPublicSelectedSpecificationV1(input:{
  rowId?:string;titleRu:string;graph:unknown;parameters?:RecordValue;manualTitleOverride?:boolean;compactPreliminaryNeed?:boolean;
}):Readonly<{nameRu:string;specificationRu:string|null;detailsRu:readonly string[]}>|null{
  if(input.manualTitleOverride||!input.parameters)return null;
  let graph=record(input.graph);
  // Compact saved needs deliberately omit their large calculation graph.
  // For an authenticated need, recover only a literal product selection that
  // exactly ends its saved title. This grants no quantity/source admission and
  // never rewrites the transport, stored need, raw evidence or manual title.
  if((!graph||Object.keys(graph).length===0)&&input.compactPreliminaryNeed){
    const candidates=Object.entries(input.parameters).filter(([id,v])=>productSpecificationId(id)&&typeof v==='string'&&v.trim()
      &&v.length<=2000&&input.titleRu.endsWith(' — '+v.trim())).sort((a,b)=>String(b[1]).length-String(a[1]).length);
    const id=candidates[0]?.[0];if(id)graph={titleSpecificationMode:'APPEND',titleSpecificationParameterIds:[id],titleSpecificationSeparator:' — '};
  }
  // These are the unchanged compiler defaults for historical definitions.
  if(!graph||(graph.titleSpecificationMode??'APPEND')!=='APPEND')return null;
  const rawIds=graph.titleSpecificationParameterIds??(graph.titleSpecificationParameterId?[graph.titleSpecificationParameterId]:null);
  if(!Array.isArray(rawIds)||rawIds.length===0||rawIds.length>8||rawIds.some(id=>typeof id!=='string'||!id.trim())||new Set(rawIds).size!==rawIds.length)return null;
  const ids=rawIds as string[],labels=record(graph.titleSpecificationParameterLabelsRu),separator=graph.titleSpecificationSeparator??' — ';
  if(separator!==' — '&&separator!==' ')return null;
  // Specification inputs identify a selected product, its class or designation.
  // Other APPEND inputs can define the service boundary itself: do not erase
  // such things as retained waste, supplied containers or included loading.
  if(!ids.every(productSpecificationId))return null;
  const values=ids.flatMap(id=>{
    const raw=input.parameters![id],value=typeof raw==='number'&&Number.isFinite(raw)?String(raw):text(raw);if(!value)return[];
    const label=text(labels?.[id]);return[label?label+': '+value:value];
  });
  const selected=values.join(', '),suffix=separator+selected;
  if(!selected||!input.titleRu.endsWith(suffix))return null;
  const base=input.titleRu.slice(0,-suffix.length).trim();if(!base)return null;
  const details=[...new Set([...values,...canonicalPublicEstimateRowDetailsRu({rowId:input.rowId,titleRu:base,sourceTitleRu:base})])];
  // Existing exact physical presentations remain the owner of their selected
  // dimensions. This branch is shared by every reusing work and catalog.
  if(canonicalPublicEstimateSelectedSpecificationIsInRowNameRu({rowId:input.rowId,titleRu:input.titleRu,sourceTitleRu:input.titleRu}))
    return{nameRu:canonicalPublicEstimateRowNameRu({rowId:input.rowId,titleRu:input.titleRu,sourceTitleRu:input.titleRu}),specificationRu:null,detailsRu:details};
  const name=canonicalPublicEstimateRowNameRu({rowId:input.rowId,titleRu:base,sourceTitleRu:base});
  const parts=canonicalPublicPhysicalSpecificationPartsV1(selected).filter(part=>!name.toLocaleLowerCase('ru-RU').includes(part.toLocaleLowerCase('ru-RU')));
  return{nameRu:name+(parts.length?', '+parts.join(', '):''),specificationRu:parts.length?parts.join(', '):null,detailsRu:details};
}
