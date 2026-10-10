import {normalizePublicBoqNameRu,publicBoqDisplayNameRu,buildPublicBoqProcurementNamingProjection} from './publicBoqNaming';

it.each(['1:3','1 : 3','0,5:1','0.5:1','1:2:4'])('preserves the numeric specification ratio %s in every material naming projection',ratio=>{
  const sourceNameRu='Готовый тяжёлый отделочный цементный раствор '+ratio+' — поставка по спецификации';
  expect(normalizePublicBoqNameRu({sourceNameRu})).toBe(sourceNameRu);
  expect(publicBoqDisplayNameRu({sourceNameRu,rowType:'material'})).toBe(sourceNameRu);
  expect(buildPublicBoqProcurementNamingProjection({sourceNameRu,unit:'m3',catalogOrPriceListReference:''}).publicNameRu).toBe(sourceNameRu);
});
it('normalizes a full-width numeric colon and retains ordinary prose separators',()=>{
  expect(normalizePublicBoqNameRu({sourceNameRu:'Раствор 1：3: поставочная спецификация 1:3'})).toBe('Раствор 1:3 — поставочная спецификация 1:3');
  expect(normalizePublicBoqNameRu({sourceNameRu:'Материал: исполнение по проекту'})).toBe('Материал — исполнение по проекту');
  expect(normalizePublicBoqNameRu({sourceNameRu:'Материал:: исполнение'})).toBe('Материал — исполнение');
});
it('keeps existing explicit product naming and supplier-readiness rules',()=>{
  expect(normalizePublicBoqNameRu({sourceNameRu:'Бетон М350 (B25) для основания'})).toBe('Бетон М350 (B25)');
  expect(publicBoqDisplayNameRu({sourceNameRu:'Нормативный расход: цементный раствор 1:3',rowType:'service'})).toBe('Нормативный расход: цементный раствор 1:3');
  expect(buildPublicBoqProcurementNamingProjection({sourceNameRu:'Раствор 1:3',unit:'m3',catalogOrPriceListReference:''}).canBeProcuredByName).toBe(true);
});
