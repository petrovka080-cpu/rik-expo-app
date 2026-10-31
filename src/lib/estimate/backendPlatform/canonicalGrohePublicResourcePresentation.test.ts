import {basinMixerGroheProjectResourcesR2} from '../v4/basinMixerGroheProjectResourcesR2';
import {basinMixerGrohe33265002PackR1 as pack} from '../v4/basinMixerGrohe33265002KitR1';
import {canonicalPublicResourceDisplayPresentationV1 as display, canonicalPublicResourceRowKindV1 as kind} from './canonicalPublicResourcePresentationV1';
import {canonicalEstimateResourceOperationSections as sections} from './canonicalEstimateOperationComposition';
import {canonicalArtifactPublicResourcePresentationV1 as artifact} from './canonicalEstimateArtifactContract';
import {consumerRepairRowProcessNote} from '../../../features/consumerRepair/consumerRepairRowMetadata';

const resources=basinMixerGroheProjectResourcesR2().resources;
const get=(key:string)=>resources.find(row=>row.row_id===pack.prefix+':'+key)!;
const input=(key:string)=>{const row=get(key);return {rowId:row.row_id,titleRu:row.title_ru,
 descriptor:row.resource_graph.publicResourcePresentationV1,costTreatment:row.resource_graph.costTreatment};};

it('shows a concise kit and installation while retaining exact specifications and all source data',()=>{
 const before=JSON.stringify(resources);
 const kit=display(input('kit-order'))!;
 expect(kit.nameRu).toBe('Смеситель с подводкой, креплением и донным клапаном');
 expect(kit.specificationRu).toContain('33265002');expect(kit.specificationRu).toContain('4005176861543');
 expect(kit.detailsRu).toEqual(['Гибкая подводка, крепление и донный клапан входят в комплект.']);
 expect(display(input('complete-installation-work'))?.detailsRu).toEqual(['Крепление, подключение и местная проверка входят в цену монтажа.']);
 for(const component of pack.components){
  const projected=display(input(component.id))!;
  expect(projected.detailsRu).toEqual(['Входит в комплект смесителя; отдельно не покупать.']);
  expect(projected.specificationRu).toContain('33265002');
 }
 expect(JSON.stringify(resources)).toBe(before);
 expect(JSON.stringify(get('kit-order').source_metadata)).toContain(pack.source.sha256);
});

it('keeps source process notes separate from paid resources and retains every subwork reference',()=>{
 for(const operation of pack.operations)expect(kind(input('process-'+operation.id))).toBe('PROCESS_NOTE');
 const visible=resources.filter(row=>kind({rowId:row.row_id,titleRu:row.title_ru,
  descriptor:row.resource_graph.publicResourcePresentationV1,costTreatment:row.resource_graph.costTreatment})==='RESOURCE');
 const grouped=sections(visible.map(row=>({rowId:row.row_id,titleRu:display({rowId:row.row_id,titleRu:row.title_ru,
  descriptor:row.resource_graph.publicResourcePresentationV1})?.nameRu??row.title_ru,operation:row.resource_graph.operationCompositionV1})));
 for(const operation of pack.operations){
  const section=grouped.find(section=>section.operation?.operationId===pack.prefix+':operation:'+operation.id)!;
  expect(section).toBeDefined();
  expect([...section.resourceIds,...section.sharedResources.map(resource=>resource.rowId)]).toContain(pack.prefix+':complete-installation-work');
 }
});

it('keeps a priced, purchased or manually changed process row visible',()=>{
 const row=input('process-mounting');
 for(const change of [{unitPrice:'1'},{amount:'3'},{includedInEstimate:true},{includedInProcurement:true},{manualTitleOverride:true}])
  expect(kind({...row,...change})).toBe('RESOURCE');
});

it('preserves manual names, replacement products and invalid or stale source descriptors',()=>{
 const row=input('kit-order');
 expect(display({...row,manualTitleOverride:true})).toBeNull();
 expect(display({...row,titleRu:'Другой смеситель 12345'})).toBeNull();
 expect(display({...row,descriptor:{bad:true}})).toBeNull();
 expect(display({...row,rowId:'another-row'})?.detailsRu.join(' ')).toContain('Официальная страница');
});

it('uses the same concise projection in documents and keeps unresolved work explicit',()=>{
 const row=get('kit-order');
 expect(artifact({row_id:row.row_id,title_ru:row.title_ru,calculation_trace:{resourceGraph:row.resource_graph}})).toEqual(display(input('kit-order')));
 for(const need of pack.needs){
  const value=display(input('open-'+need.id))!;
  expect(value.detailsRu).toHaveLength(1);expect(value.detailsRu[0]!.length).toBeLessThan(90);
  expect(kind(input('open-'+need.id))).toBe('PROCESS_NOTE');
  expect(get('open-'+need.id).source_metadata?.missingFact).toBe(need.reasonRu);
 }
});

it('reopens saved GROHE process notes without a transient registered presentation',()=>{
 for(const need of pack.needs){
  const row=get('open-'+need.id);
  const item={id:row.row_id,titleRu:row.title_ru,unitPrice:null,
   sourceParameters:{rowCode:row.row_id,canonicalCostTreatment:row.resource_graph.costTreatment}};
  const reopened=JSON.parse(JSON.stringify(item));
  const before=JSON.stringify(reopened);
  expect(consumerRepairRowProcessNote(reopened)).toBe(display(input('open-'+need.id))!.detailsRu.join(' '));
  expect(JSON.stringify(reopened)).toBe(before);
  for(const changed of [{unitPrice:0},{titleRu:'Другой ресурс'},
   {sourceParameters:{...reopened.sourceParameters,includedInEstimate:true}},
   {sourceParameters:{...reopened.sourceParameters,includedInProcurement:true}},
   {sourceParameters:{...reopened.sourceParameters,canonicalManualTitleOverride:true}}]){
   expect(consumerRepairRowProcessNote({...reopened,...changed})).toBeNull();
  }
 }
});
