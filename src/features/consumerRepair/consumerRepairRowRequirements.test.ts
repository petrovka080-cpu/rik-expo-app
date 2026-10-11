import { consumerRepairRowRequirementNotice, consumerRepairRowHasSourceManagedQuantity } from './consumerRepairRowMetadata';
import { buildRequestEstimateSourceGates } from './requestEstimateViewModel';
import type { ConsumerRepairRequestItem } from '../../lib/consumerRequests/consumerRequestTypes';
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
  expect(notice).toContain('Для расчёта нужен подтверждённый источник: Норма труда монтажа.');
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
  expect(buildRequestEstimateSourceGates([publicItem(item)],tables)).toEqual([]);
  for(const unavailable of [undefined,{r2:{...tables.r2!,parameterSchemaHash:'other'}},
    {r2:{...tables.r2!,requirementsById:{[id]:{...requirement,guideShortRu:null}}}}]) {
    expect(consumerRepairRowRequirementNotice(item,unavailable)).toContain('подтверждённый источник');
    expect(consumerRepairRowHasSourceManagedQuantity(item,unavailable)).toBe(true);
    expect(buildRequestEstimateSourceGates([publicItem(item)],unavailable)).toHaveLength(1);
  }
  expect(JSON.stringify(item)).toBe(before);
});

test('a different unresolved application norm retains its source gate even with an authored guide', () => {
  const item={id:'unknown-labour',quantity:null,sourceParameters:{canonicalPreliminaryNeed:true,
    missingParameterRequirements:[{...norm,guideShortRu:'Подтверждённая норма труда пока не найдена.'}]}};
  expect(consumerRepairRowRequirementNotice(item)).toContain('подтверждённый источник');
  expect(buildRequestEstimateSourceGates([publicItem(item)])).toHaveLength(1);
  expect(consumerRepairRowHasSourceManagedQuantity(item)).toBe(true);
});

test('mixed source and object requirements remain distinct and keep a known zero visible', () => {
  const notice=consumerRepairRowRequirementNotice({quantity:0,sourceParameters:{missingParameterRequirements:[norm,stock,norm]}});
  expect(notice).toContain('Количество 0 сохранено');
  expect(notice).toContain('Заполните в исходных данных: Доступно на объекте.');
  expect(notice.match(/Норма труда монтажа/g)).toHaveLength(1);
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
  expect(consumerRepairRowRequirementNotice(item,tables)).toContain('источник: Норма труда монтажа.');
  expect(consumerRepairRowRequirementNotice(item,{r1:{...tables.r1!,revisionId:'foreign'}})).toContain('источник: labor.');
  expect(consumerRepairRowRequirementNotice(item)).not.toContain('Заполните');
});
