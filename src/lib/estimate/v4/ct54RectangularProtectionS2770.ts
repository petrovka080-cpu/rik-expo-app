import pack from '../../../../data/estimate-benchmarks/source-packs/ct54-rectangular-protection-eight-s27-70.json';
import {buildAutomaticConstructionOwnerR1, type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const ct54ProtectionPackS2770 = pack;
export const ct54ProtectionPrefixS2770 = 'paint:ct54-rectangular-protection';
export const ct54ProtectionChoiceIdS2770 = 'ct54_protection_method';
export const ct54ProtectionChoiceS2770 = {kind:'equals' as const,parameterId:ct54ProtectionChoiceIdS2770,value:pack.exactChoiceRu};
export const ct54ProtectionOtherS2770 = {kind:'equals' as const,parameterId:ct54ProtectionChoiceIdS2770,value:pack.otherChoiceRu};
const prefix = ct54ProtectionPrefixS2770;
const n = 'ct54_protection_rectangle_count', w = 'ct54_protection_cut_width_m', h = 'ct54_protection_cut_height_m';
const site = 'ct54_protection_site';
const active = {kind:'and' as const,operands:[ct54ProtectionChoiceS2770,{kind:'equals' as const,parameterId:site,value:pack.exactSiteRu}]};
export const ct54ProtectionFilmReplacementS2770 = active;
const filmRolls = `ceil(${n}/floor(14/${w}))`;
const tapeKitLength = `(${w}+2*${h})`;
const tapeKitRolls = `ceil(${n}/floor(25/${tapeKitLength}))`;
const tapeLengthLowerBound = `max(ceil(${n}*${tapeKitLength}/25),ceil(${n}/floor(25/${w})),ceil(2*${n}/floor(25/${h})))`;
// Consecutive complete kits give an explicit feasible cut layout. Equality to
// a lower bound from total length and continuous piece counts proves that this
// layout uses the minimum roll count.
// Keep the original tape need when that proof is unavailable; do not order an
// inflated kit count or pretend ceil(total length / roll length) is a layout.
export const ct54ProtectionTapeReplacementS2770 = {kind:'and',operands:[active,
  {kind:'not',operand:{kind:'formula_greater_than',expression:`${tapeKitRolls}-${tapeLengthLowerBound}`,unitId:'item',value:0}},
]};

export function ct54RectangularProtectionDefinitionS2770() {
  const conditional: AutomaticParameterSpec[] = [
    {id:ct54ProtectionChoiceIdS2770,title:'Как укрывают неокрашиваемые элементы',valueType:'enum',unitId:null,kind:'conditional',values:[pack.otherChoiceRu,pack.exactChoiceRu]},
    {id:site,title:'Границы укрытия и пригодность крепления',valueType:'enum',unitId:null,kind:'conditional',values:[pack.exactSiteRu],requiredWhen:ct54ProtectionChoiceS2770},
    {id:n,title:'Число одинаковых прямоугольных укрытий',valueType:'integer',unitId:'item',kind:'conditional',min:1,max:1000,requiredWhen:ct54ProtectionChoiceS2770},
    {id:w,title:'Ширина одного конверта раскроя с фактическими припусками, м',valueType:'decimal',unitId:'m',kind:'conditional',min:0.001,max:14,requiredWhen:ct54ProtectionChoiceS2770},
    {id:h,title:'Высота одного конверта раскроя с фактическими припусками, м',valueType:'decimal',unitId:'m',kind:'conditional',min:0.001,max:1.8,requiredWhen:ct54ProtectionChoiceS2770},
  ];
  for (const [kind,title] of [['film','укрытия4369,14м×1,8м'],['tape','ленты4363,25м×50мм']] as const) {
    for (const [suffix,label,min] of [['stock','Пригодные целые рулоны',0],['reserve','Сохранить нераспечатанных рулонов',0],['supplier_multiple','Кратность поставки в рулонах',1]] as const) {
      conditional.push({id:`ct54_protection_${kind}_${suffix}`,title:`${label}: ${title}`,valueType:'integer',unitId:'item',kind:'conditional',min,max:100000,requiredWhen:ct54ProtectionChoiceS2770});
    }
  }
  const rows: AutomaticRowSpec[] = [];
  const add = (suffix:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={}) => rows.push({
    rowId:prefix+':'+suffix,formulaId:prefix+':formula:'+suffix,title,unitId,expression,
    section:'protection',category:'material',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:active,inputParameterIds:[site],...extra,
  });
  add('covered-area','Фактическая площадь прямоугольных конвертов укрытия','m2',`${n}*${w}*${h}`);
  add('film-strip-area','Полосы укрытия4369 по раскрою; интегрированная верхняя лента включена','m2',`${n}*${w}*1.8`);
  add('film-tail','Неразрезанные концевые отрезки открытых рулонов4369 — пригодность для других работ проверяется отдельно','m',`(${filmRolls})*14-${n}*${w}`);
  add('film-trim','Обрезки по высоте укрытий — не автоматическая норма отходов или вывоза','m2',`${n}*${w}*(1.8-${h})`);
  add('tape-length','Дополнительная лента на две боковые и нижнюю стороны; без повторной верхней ленты','m',`${n}*${tapeKitLength}`);
  for (const [kind,opened,title] of [['film',filmRolls,'Укрытие tesa4369,14м×1,8м с интегрированной верхней лентой'],['tape',tapeKitRolls,'Лента tesa4363,25м×50мм для трёх остальных сторон']] as const) {
    const stock=`ct54_protection_${kind}_stock`,reserve=`ct54_protection_${kind}_reserve`,quantum=`ct54_protection_${kind}_supplier_multiple`;
    const owner=prefix+':'+kind+'-order';
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'item',consumed:opened,stock,reserve,quantum});
    add(kind+'-opened','Рулоны, открываемые по карте раскроя: '+title,'item',opened);
    add(kind+'-order',title+' — новый заказ в целых рулонах','item',`ceil(max(0,(${opened})+${reserve}-${stock})/${quantum})*${quantum}`,{...balance.owner,procurement:true,costTreatment:'OWN_COST'});
    add(kind+'-remaining','Нераспечатанные рулоны после раскроя: '+title,'item',balance.remaining,{purchaseBalanceOwnerRowId:owner});
    add(kind+'-free','Свободные нераспечатанные рулоны сверх сохраняемого резерва: '+title,'item',balance.free,{purchaseBalanceOwnerRowId:owner});
  }
  const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:'ct54_rectangular_project_cut_plan_v1',
    sourceMetadata:{source_title:pack.titleRu,source_document_version:'tesa2026 +4369 25/02/25',definition_hash:pack.sources.tesa2026.sha256,artifact_sha256:pack.sources.tesa2026.sha256,exact_locator:pack.sources.tesa2026.locator},
    applicabilityRu:pack.scopeRu,ordinary:[],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.excludedRu});
  return {...built,
    parameters:built.parameters.map(p=>p.truth_metadata.visibility_role==='INTERNAL_ONLY'?p:({...p,truth_metadata:{...p.truth_metadata,source_confirmation_required:false,value_source_role:'PROJECT_SPECIFIC_INPUT',
      visible_when:p.parameter_id===ct54ProtectionChoiceIdS2770?{kind:'literal',value:true}:ct54ProtectionChoiceS2770,
      provenance:{...(p.truth_metadata.provenance&&typeof p.truth_metadata.provenance==='object'?p.truth_metadata.provenance:{}),consumer_input_role_v1:p.parameter_id.includes('_stock')||p.parameter_id.includes('_reserve')||p.parameter_id.includes('_supplier_multiple')?'ADVANCED_OPTION':[n,w,h].includes(p.parameter_id)?'OBJECT_GEOMETRY':'OBJECT_FACT'}}})),
    resources:built.resources.map(r=>{
      const isTapeRoll=r.row_id.startsWith(prefix+':tape-')&&r.row_id!==prefix+':tape-length';
      const {row_sha256:_old,...body}=r;
      const value={...body,inclusion_ast:isTapeRoll?ct54ProtectionTapeReplacementS2770:r.inclusion_ast,
        resource_graph:{...r.resource_graph,fullTechnicalAcceptance:false,geometryNotPaintAreaCoefficient:true,
          integratedTopTapeIncludedOnce:true,cutOffsNotDisposalWaste:true,
          operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':cut-and-mask',operationTitleRu:pack.titleRu,processOrdinal:5,completionCriterionRu:'Полная геометрия конвертов и пригодность крепления известны; целые рулоны и пригодные остатки учтены один раз.'},
          publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:pack.titleRu,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:pack.scopeRu,
            detailsRu:['Количество выведено из геометрии принятой карты раскроя, а не из нормы на площадь окраски.','Рулоны и остатки одного изделия учитываются отдельно от пригодных обрезков; последние не объявляются отходами.','Новые рулоны не наследуют старую цену плёнки за м² или ленты за м.']}},
        source_metadata:{...r.source_metadata,sourceRole:'PROJECT_GEOMETRY_DERIVED_CUT_PLAN',sourceNormQuantityAccepted:true,full_technical_acceptance:false,
          manufacturerDimensionsOnly:true,geometryRuleIsNotManufacturerConsumptionRate:true,noAdditionalPaidLabour:true,
          source_artifact_sha256:pack.sources.tesa2026.sha256,exact_locator:pack.sources.tesa2026.locator,
          normativeTrace:[{sourceId:pack.sourceId,normId:'ct54_rectangular_project_cut_plan_v1',source_definition_hash:pack.sources.tesa2026.sha256,exact_locator:pack.sources.tesa2026.locator,sourceRole:'MANUFACTURER_PRODUCT_DIMENSIONS_WITH_EXPLICIT_PROJECT_GEOMETRY'}]}};
      return {...value,row_sha256:estimateDeterministicHash(value)};
    }),
  };
}
