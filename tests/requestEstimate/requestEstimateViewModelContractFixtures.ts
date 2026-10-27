import type {ConsumerRepairDraftBundle,ConsumerRepairRequestItem} from '../../src/lib/consumerRequests/consumerRequestTypes';
import {buildRequestEstimateViewModel} from '../../src/features/consumerRepair/requestEstimateViewModel';

/** UI contract fixture only, not an engine result or actual project readback.
 * Source-derived foundation/manual-catalog scenario from the existing
 * requestEstimateBoqCatalogTestHelpers FOUNDATION_PROMPT and MANUAL_CATALOG_ITEM.
 * Like canonicalConsumerRepairRevisionFixture, it builds already supplied rows
 * without prompt compilation, backend audit, repository state or pricing runs.
 * These literal prices/counts exercise UI null/zero/edit semantics only. Engine,
 * catalog and backend integration helpers/tests remain independently unchanged.
 */
export function foundationDraftWithManualCatalogItem():ConsumerRepairDraftBundle{
 const id='test-only-foundation-view-model',createdAt='2026-10-27T00:00:00.000Z';
 const item=(key:string,titleRu:string,itemType:ConsumerRepairRequestItem['itemType'],category:string,
  quantity:number,unit:string,unitPrice:number):ConsumerRepairRequestItem=>({
   id:key,requestDraftId:id,titleRu,itemType,category,quantity,unit,unitPrice,totalPrice:quantity*unitPrice,currency:'KGS',
   source:'ai_suggested',editableByConsumer:true,createdAt,
   sourceParameters:{includedInEstimate:true,fixtureKind:'SOURCE_ONLY_VIEW_MODEL_CONTRACT_NOT_ENGINE_OUTPUT'},
  });
 const manual:ConsumerRepairRequestItem={...item('test-only-manual-catalog','Бетон М300 из catalog_items','material','material',2,'m3',5000),
  source:'catalog_item',catalogItemId:'catalog_items_beton_m300',sourceId:'catalog_items',sourceLabel:'catalog_items',
  confidence:'high',addedBy:'user'};
 return{draft:{id,consumerUserId:'request-estimate-test-user',title:'ленточный фундамент',
   problemText:'смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м',repairType:'foundation',
   city:'Бишкек',status:'draft',aiSummaryRu:'Ленточный фундамент: материалы, работы и доставка.',missingData:[],createdAt},
  items:[item('test-only-foundation-material','Бетон для фундамента','material','material',1,'m3',5000),
   item('test-only-foundation-work','Устройство фундамента','work','work',1,'m3',1000),
   item('test-only-foundation-delivery','Доставка материалов','service','delivery',1,'trip',2000),manual],
  media:[],pdfs:[],projectExecutionDrafts:[],events:[],marketplaceLink:{id:id+':marketplace',requestDraftId:id,status:'not_sent',createdAt}};
}
export function foundationViewModel(){return buildRequestEstimateViewModel(foundationDraftWithManualCatalogItem());}