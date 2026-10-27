import type {AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';

/** The stock ledger contains only unopened cartridges. Opening removes the
 * whole cartridge from that ledger; unused opened material is a separate fact. */
export function unopenedCartridgeSupplyRowsR1(input:{
  prefix:string;productNameRu:string;capacityMl:number;inputParameterIds:readonly string[];
}):AutomaticRowSpec[]{
  if(!Number.isInteger(input.capacityMl)||input.capacityMl<=0)throw Error('EXACT_CARTRIDGE_CAPACITY_REQUIRED');
  const prefix=input.prefix,owner=`${prefix}:cartridge-order`,opened='planned_open_cartridges',volume=`${opened}*${input.capacityMl}`;
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'pcs',consumed:opened,
    stock:'unopened_stock_cartridges',reserve:'unopened_reserve_cartridges',quantum:'supplier_cartridge_multiple'});
  const info={costTreatment:'INFORMATIONAL_SCOPE' as const};
  const row=(id:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={}):AutomaticRowSpec=>({
    rowId:`${prefix}:${id}`,formulaId:`${prefix}:formula:${id}`,section:'opening',category:'material',title,unitId,expression,
    procurement:false,inputParameterIds:input.inputParameterIds,...extra});
  return [
    row('cartridges-opened','Картриджи по принятому плану вскрытия — выведены из невскрытого запаса','pcs',opened,{...info,purchaseBalanceOwnerRowId:owner}),
    row('opened-volume','Номинальный объём вскрываемых картриджей — без второй цены','ml',volume,info),
    row('opening-plan-coverage','Контроль номинального объёма плана вскрытия — без отдельной цены','ml',`(${volume})-planned_use_ml`,{
      ...info,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'ml',minimum:0,
        reasonRu:'План вскрытия картриджей не обеспечивает принятый общий расход материала; уточните план. Номинальный контроль не доказывает пригодность проектного узла.'}}),
    row('cartridge-order',input.productNameRu,'pcs','ceil(max(0,planned_open_cartridges+unopened_reserve_cartridges-unopened_stock_cartridges)/supplier_cartridge_multiple)*supplier_cartridge_multiple',{
      procurement:true,...balance.owner}),
    row('unopened-remaining','Пригодный остаток целых невскрытых картриджей — без второй цены','pcs',balance.remaining,{...info,purchaseBalanceOwnerRowId:owner}),
    row('unused-opened-volume','Неиспользованный объём после вскрытия — пригодность отдельно, в невскрытый запас не возвращён','ml',`(${volume})-planned_use_ml`,info),
  ];
}
