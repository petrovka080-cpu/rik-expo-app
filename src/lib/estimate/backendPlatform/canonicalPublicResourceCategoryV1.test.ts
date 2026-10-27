import {canonicalPublicResourceKindFromCategoryV1 as financialKind} from './canonicalPublicResourcePresentationV1';
import {
  CANONICAL_PUBLIC_RESOURCE_KINDS_V1,parseCanonicalPublicResourcePresentationV1 as parse,
  canonicalPublicResourcePresentationMatchesV1 as matches,
  canonicalPublicResourceCategoryTitleRuV1 as label,
  canonicalPublicResourceDisplayPresentationV1 as display,
  bindCanonicalPublicResourceSavedTitleV1 as bind,
} from './canonicalPublicResourcePresentationV1';
import {normalizeCanonicalEstimateRowCategory} from './canonicalEstimateRowCategory';
const old={contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:'Исходный ресурс',
  nameRu:'Ресурс',brandAndModelRu:null,specificationRu:null,detailsRu:[]};
it('accepts legacy six/seven keys and optional kind alone or with role, rejects malformed shapes',()=>{
  expect(parse(old)).not.toBeNull();expect(parse({...old,rowKind:'PROCESS_NOTE'})).not.toBeNull();
  for(const resourceKind of CANONICAL_PUBLIC_RESOURCE_KINDS_V1){
    expect(parse({...old,resourceKind})).not.toBeNull();
    expect(parse({...old,rowKind:'PROCESS_NOTE',resourceKind})).not.toBeNull();
  }
  for(const resourceKind of [null,undefined,'tool','UNKNOWN',[],{toString:()=> 'TOOL'}])
    expect(parse({...old,resourceKind})).toBeNull();
  expect(parse({...old,rowKind:{toString:()=> 'PROCESS_NOTE'}})).toBeNull();
  expect(parse({...old,resourceKind:'TOOL',quantity:2})).toBeNull();
  const {detailsRu:_details,...missing}=old;expect(parse({...missing,resourceKind:'TOOL'})).toBeNull();
});
it('requires exact saved title and rejects stale/manual taxonomy without name heuristics',()=>{
  const descriptor={...old,resourceKind:'TOOL'};
  expect(label({titleRu:old.sourceTitleRu,descriptor,category:'equipment'})).toBe('Инструмент');
  expect(label({titleRu:'Другая дрель',descriptor,category:'equipment'})).toBe('Оборудование');
  expect(label({titleRu:old.sourceTitleRu,descriptor,manualTitleOverride:true,category:'equipment'})).toBe('Оборудование');
  expect(label({titleRu:'Сверло карандаш механизм',category:''})).toBeNull();
  expect(label({titleRu:old.sourceTitleRu,descriptor:{...descriptor,resourceKind:'bad'},category:'tool'})).toBe('Инструмент');
  expect(label({titleRu:old.sourceTitleRu,graph:{publicResourcePresentationV1:descriptor},category:'equipment'})).toBe('Инструмент');
});
it('maps all ten authored types and leaves financial buckets unchanged',()=>{
  const labels=['Материалы','Расходники','Инструмент','Оснастка','Оборудование','Механизмы','Труд','Услуги','Доставка','Средства защиты'];
  CANONICAL_PUBLIC_RESOURCE_KINDS_V1.forEach((resourceKind,index)=>expect(label({titleRu:old.sourceTitleRu,
    descriptor:{...old,resourceKind},category:'equipment'})).toBe(labels[index]));
  expect(normalizeCanonicalEstimateRowCategory('', 'tool')).toBe('equipment');
  expect(label({titleRu:'Ресурс',category:'equipment'})).toBe('Оборудование');
});
it('matches includes taxonomy and saved-title binding preserves kind without changing commercial state',()=>{
  const descriptor={...old,resourceKind:'ACCESSORY'};
  expect(matches(descriptor,{...descriptor})).toBe(true);
  expect(matches(descriptor,{...descriptor,resourceKind:'TOOL'})).toBe(false);
  expect(matches(old,descriptor)).toBe(false);
  const graph={publicResourcePresentationV1:descriptor,quantity:'2.50',unitPrice:'17',amount:'42.50',ownerId:'same'};
  const before=JSON.stringify(graph);
  const bound=bind({graph,sourceTitleRu:old.sourceTitleRu,savedTitleRu:old.sourceTitleRu+' — 8 мм',
    appendedSpecificationRu:'8 мм',manualTitleOverride:false});
  expect(label({titleRu:old.sourceTitleRu+' — 8 мм',graph:bound})).toBe('Оснастка');
  expect(bound).toMatchObject({quantity:'2.50',unitPrice:'17',amount:'42.50',ownerId:'same'});
  expect(JSON.stringify(graph)).toBe(before);
  expect(display({titleRu:old.sourceTitleRu,descriptor})?.resourceKind).toBe('ACCESSORY');
  expect(bind({graph,sourceTitleRu:old.sourceTitleRu,savedTitleRu:'Ручное имя',appendedSpecificationRu:null,
    manualTitleOverride:true})).toBe(graph);
});

it('uses only exact persisted financial category tokens for the kind fallback',()=>{
  for(const category of ['labor','work'])expect(financialKind(category)).toBe('LABOR');
  for(const category of ['transport','delivery'])expect(financialKind(category)).toBe('TRANSPORT');
  expect(financialKind('service')).toBe('SERVICE');expect(financialKind('material')).toBe('MATERIAL');
  expect(financialKind('tool')).toBe('TOOL');expect(financialKind('equipment')).toBe('EQUIPMENT');
  for(const category of ['',null,undefined,'LABOR',' labor ','construction_work','Дрель','materials'])
    expect(financialKind(category)).toBeNull();
});
