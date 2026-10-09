import { consumerRepairRowRequirementNotice } from './consumerRepairRowMetadata';
import type { CanonicalParameterRequirementTables } from '../../lib/consumerRequests/consumerCanonicalParameterRequirements';

const norm = {parameterId:'labor',titleRu:'Норма труда монтажа',sourceConfirmationRequired:true,
  visibilityRole:'INTERNAL_ONLY',valueSourceRole:'UNRESOLVED_APPLICATION_NORM',unitId:'man_hour',guideShortRu:null} as const;
const stock = {parameterId:'stock',titleRu:'Доступно на объекте',sourceConfirmationRequired:false};

test('application norms do not direct the customer to an inaccessible input', () => {
  const item={quantity:null,sourceParameters:{missingParameterRequirements:[norm]}};
  const before=JSON.stringify(item),notice=consumerRepairRowRequirementNotice(item);
  expect(notice).toContain('Для расчёта нужен подтверждённый источник: Норма труда монтажа.');
  expect(notice).not.toContain('Заполните');expect(JSON.stringify(item)).toBe(before);
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
