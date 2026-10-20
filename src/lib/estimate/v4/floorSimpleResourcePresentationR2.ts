import {floorConcreteUnderlayerDefinitionR1, floorConcreteUnderlayerPackR1 as concrete} from './floorConcreteUnderlayerKrer11Column09R1';
import {floorCementScreed20mmDefinitionR1, floorCementScreed20mmPackR1 as screed} from './floorCementScreed20mmKrer11Column01R1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import type {CanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';

/** A successor presentation, never an edit to a historical definition. The
 * source's complete resource identity, units, arithmetic and cost owner survive. */
function simplify(definition:AutomaticOwnerDefinition,pack:typeof concrete|typeof screed):AutomaticOwnerDefinition {
 const resources=definition.resources.map(resource=>{
  if(!resource.row_id.startsWith(pack.prefix+':'))throw Error('FLOOR_PUBLIC_RESOURCE_SOURCE_REQUIRED');
  const key=resource.row_id.slice(pack.prefix.length+1),graph=resource.resource_graph;
  const material=pack.materials.find(m=>key.startsWith(m.id+'-'));
  const note=key==='open-machine-price-scope'?'Уточнить состав цены техники и где уже оплачена работа оператора.':
   key==='open-project-additions'?'Сверить состав пола с проектом. Армирование, гидроизоляцию и другие дополнительные работы учитывать отдельно, если они нужны.':
   key==='open-base-and-project-method'?'До начала работы проверить основание и проектный состав пола. При необходимости отдельно учесть ремонт основания.':
   key==='open-quality-acceptance'||key==='open-control-and-protection'?'До начала работы согласовать проверку качества и защиту слоя. Отдельные испытания и дополнительные материалы учитывать после уточнения.':null;
  const counter=typeof graph.purchaseBalanceOwnerRowId==='string'
   ||graph.physicalNormOwnerRowId===resource.row_id||key==='operator-information'||key.startsWith('included-');
  const rowKind:CanonicalPublicResourcePresentationV1['rowKind']=note?'PROCESS_NOTE':counter?'CALCULATION_DETAIL':undefined;
  const name=key==='whole-labor'?(pack===concrete?'Работа по устройству бетонной подстилки':'Работа по устройству стяжки 20 мм'):
   material&&key===material.id+'-order'?(material.id==='bitumen-latex-mastic'?'Битумно-латексная мастика':material.titleRu):
   resource.title_ru.replace(': собственная эксплуатация',', собственный').replace(': аренда',', аренда');
  const previous=graph.publicResourcePresentationV1 as CanonicalPublicResourcePresentationV1|undefined;
  const presentation:CanonicalPublicResourcePresentationV1={contractVersion:'canonical-public-resource-presentation/v1',
   sourceTitleRu:resource.title_ru,nameRu:name,brandAndModelRu:null,
   specificationRu:material?.specificationRu??null,detailsRu:note?[note]:[],...(rowKind?{rowKind}:{})};
  const operation=graph.operationCompositionV1 as Record<string,unknown>|undefined;
  const target=key==='open-project-additions'?'planning':key==='open-base-and-project-method'?'preparation':null;
  const targetOperation=target?definition.resources.map(r=>r.resource_graph.operationCompositionV1 as Record<string,unknown>|undefined)
   .find(o=>o?.operationId===pack.prefix+':operation:'+target):null;
  if(target&&!targetOperation)throw Error('FLOOR_PUBLIC_NOTE_OPERATION_REQUIRED');
  const {additionalOperations:_shared,...targetPrimary}=targetOperation??{};
  const {row_sha256:_old,...body}=resource;
  const changed={...body,resource_graph:{...graph,publicResourcePresentationV1:presentation,
   ...(targetOperation?{operationCompositionV1:targetPrimary}:{}),
  }};
  if(!previous||!operation)throw Error('FLOOR_EXISTING_PUBLIC_COMPOSITION_REQUIRED');
  return {...changed,row_sha256:estimateDeterministicHash(changed)};
 });
 return {...definition,resources};
}

export const floorConcreteSimplePresentationR2=()=>simplify(floorConcreteUnderlayerDefinitionR1(),concrete);
export const floorScreed20mmSimplePresentationR2=()=>simplify(floorCementScreed20mmDefinitionR1(),screed);
