import { consumerRepairRowRequirementNotice, consumerRepairRowHasSourceManagedQuantity, consumerRepairRowSourceManagedQuantityReason, consumerRepairRowIsTechnicalDetail, consumerRepairRowIsNonPayable } from './consumerRepairRowMetadata';
import { buildRequestEstimateSourceGates } from './requestEstimateViewModel';
import type { ConsumerRepairRequestItem } from '../../lib/consumerRequests/consumerRequestTypes';
import type { ConsumerRepairDraftBundle } from '../../lib/consumerRequests/consumerRequestTypes';
import {consumerEstimateUnresolvedQuantityItems,consumerEstimateUnpricedPayableItems} from '../../lib/consumerRequests/consumerEstimateReadiness';
import type { CanonicalParameterRequirementTables } from '../../lib/consumerRequests/consumerCanonicalParameterRequirements';

const norm = {parameterId:'labor',titleRu:'Норма труда монтажа',sourceConfirmationRequired:true,
  visibilityRole:'INTERNAL_ONLY',valueSourceRole:'UNRESOLVED_APPLICATION_NORM',unitId:'man_hour',guideShortRu:null} as const;
const stock = {parameterId:'stock',titleRu:'Доступно на объекте',sourceConfirmationRequired:false};
const publicItem=(item:{id:string;quantity:null;sourceParameters:Record<string,unknown>}):ConsumerRepairRequestItem=>({
  ...item,requestDraftId:'CONTROL_DRAFT',itemType:'material',titleRu:'Контрольная потребность',currency:'KGS',
  source:'custom',editableByConsumer:true,createdAt:'2026-10-11T00:00:00Z',
});

test('application norms do not direct the customer to an inaccessible input', () => {
  const item={quantity:null,sourceParameters:{missingParameterRequirements:[norm]}};
  const before=JSON.stringify(item),notice=consumerRepairRowRequirementNotice(item);
  expect(notice).toContain('Приложение пока не рассчитало эту позицию.');
  expect(notice).not.toContain('Заполните');expect(JSON.stringify(item)).toBe(before);
});

test('unknown primer scope asks for a fact through the exact revision without admitting a quantity or a norm', () => {
  const id='betogrund_undetermined_need_kg';
  const guide='Проверьте, нужно ли ещё грунтовать бетон. Если нужно — укажите оставшуюся непрогрунтованную площадь.';
  const requirement={...norm,parameterId:id,titleRu:'Неопределённая потребность в грунтовании',unitId:'kg',guideShortRu:guide};
  const reference={contractVersion:'canonical-parameter-requirements/v1',revisionId:'r2',releaseId:'release',parameterSchemaHash:'scope-hash'} as const;
  const tables:CanonicalParameterRequirementTables={r2:{...reference,requirementsById:{[id]:requirement}}};
  const item={id:'unknown-primer',quantity:null,sourceParameters:{canonicalPreliminaryNeed:true,
    canonicalParameterRequirementReference:reference,canonicalBackendRevisionId:'r2',canonicalBackendReleaseId:'release',
    missingParameterIds:[id],sourceManagedMissingParameterIds:[id]}};
  const before=JSON.stringify(item);
  expect(consumerRepairRowRequirementNotice(item,tables)).toBe(guide);
  expect(consumerRepairRowHasSourceManagedQuantity(item,tables)).toBe(true);
  expect(consumerRepairRowSourceManagedQuantityReason(item,tables)).toContain('необходимости грунтования');
  expect(buildRequestEstimateSourceGates([publicItem(item)],tables)).toEqual([]);
  for(const unavailable of [undefined,{r2:{...tables.r2!,parameterSchemaHash:'other'}},
    {r2:{...tables.r2!,requirementsById:{[id]:{...requirement,guideShortRu:null}}}}]) {
    expect(consumerRepairRowRequirementNotice(item,unavailable)).toContain('Приложение пока не рассчитало');
    expect(consumerRepairRowHasSourceManagedQuantity(item,unavailable)).toBe(true);
    expect(consumerRepairRowSourceManagedQuantityReason(item,unavailable)).toContain('вводить норму вручную не требуется');
    expect(buildRequestEstimateSourceGates([publicItem(item)],unavailable)).toHaveLength(1);
  }
  expect(JSON.stringify(item)).toBe(before);
});

test('unresolved physical informational needs stay visible without becoming payable; known counters stay folded',()=>{
  for(const canonicalCostTreatment of ['INFORMATIONAL_SCOPE','INCLUDED_IN_RESOURCE_ROWS','CONTROL_OR_DOCUMENT']){
    const pending={quantity:null,sourceParameters:{canonicalCostTreatment,canonicalPreliminaryNeed:true,payable:false}};
    const before=JSON.stringify(pending);
    expect(consumerRepairRowIsTechnicalDetail(pending)).toBe(false);
    expect(consumerRepairRowIsNonPayable(pending)).toBe(true);
    expect(consumerRepairRowIsTechnicalDetail({...pending,sourceParameters:{...pending.sourceParameters,canonicalPreliminaryNeed:false},quantity:1})).toBe(true);
    expect(JSON.stringify(pending)).toBe(before);
  }
});

test('readiness counts unpaid physical and included needs without demanding a second price; excluded paid alternatives stay excluded',()=>{
  const pending=publicItem({id:'required-tool',quantity:null,sourceParameters:{canonicalPreliminaryNeed:true,includedInEstimate:false,canonicalCostTreatment:'INFORMATIONAL_SCOPE',payable:false}});
  const included=publicItem({...pending,id:'included-physical-resource',quantity:null,sourceParameters:{...pending.sourceParameters,canonicalCostTreatment:'INCLUDED_IN_RESOURCE_ROWS'}});
  const excluded=publicItem({...pending,id:'excluded-conditional-paid-alternative',quantity:null,sourceParameters:{...pending.sourceParameters,canonicalCostTreatment:'OWN_COST'}});
  const known={...pending,id:'known-informational-counter',quantity:1,sourceParameters:{...pending.sourceParameters,canonicalPreliminaryNeed:false}};
  const bundle={items:[pending,included,excluded,known]} as ConsumerRepairDraftBundle;
  expect(consumerEstimateUnresolvedQuantityItems(bundle).map(x=>x.id)).toEqual(['required-tool','included-physical-resource']);
  expect(consumerEstimateUnpricedPayableItems(bundle)).toEqual([]);
});

test('a different unresolved application norm retains its source gate even with an authored guide', () => {
  const item={id:'unknown-labour',quantity:null,sourceParameters:{canonicalPreliminaryNeed:true,
    missingParameterRequirements:[{...norm,guideShortRu:'Подтверждённая норма труда пока не найдена.'}]}};
  expect(consumerRepairRowRequirementNotice(item)).toContain('Приложение пока не рассчитало');
  expect(buildRequestEstimateSourceGates([publicItem(item)])).toHaveLength(1);
  expect(consumerRepairRowHasSourceManagedQuantity(item)).toBe(true);
});

test('mixed source and object requirements remain distinct and keep a known zero visible', () => {
  const notice=consumerRepairRowRequirementNotice({quantity:0,sourceParameters:{missingParameterRequirements:[norm,stock,norm]}});
  expect(notice).toContain('Количество 0 сохранено');
  expect(notice).toContain('Заполните в исходных данных: Доступно на объекте.');
  expect(notice.match(/Приложение/g)).toHaveLength(1);
});

test('ordinary object facts retain the input instruction', () => {
  expect(consumerRepairRowRequirementNotice({sourceParameters:{missingParameterRequirements:[stock]}}))
    .toBe('Заполните в исходных данных: Доступно на объекте.');
});

test('the compact table resolves only the exact saved revision and preserves source ownership when unavailable', () => {
  const reference={contractVersion:'canonical-parameter-requirements/v1',revisionId:'r1',releaseId:'release',parameterSchemaHash:'hash'} as const;
  const tables:CanonicalParameterRequirementTables={r1:{...reference,requirementsById:{labor:norm}}};
  const item={quantity:10,sourceParameters:{canonicalParameterRequirementReference:reference,canonicalBackendRevisionId:'r1',
    canonicalBackendReleaseId:'release',missingParameterIds:['labor'],sourceManagedMissingParameterIds:['labor']}};
  expect(consumerRepairRowRequirementNotice(item,tables)).toContain('Приложение пока не рассчитало');
  expect(consumerRepairRowRequirementNotice(item,{r1:{...tables.r1!,revisionId:'foreign'}})).toContain('Приложение пока не рассчитало');
  expect(consumerRepairRowRequirementNotice(item)).not.toContain('Заполните');
});
