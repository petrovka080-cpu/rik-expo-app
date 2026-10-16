import pack from '../../../../data/estimate-benchmarks/source-packs/ct54-rectangular-protection-eight-s27-70.json';
import tesa2600Pack from '../../../../data/estimate-benchmarks/source-packs/ct54-tesa4369-2600-eight-forward-r1.json';
import {buildAutomaticConstructionOwnerR1, type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const ct54ProtectionPackS2770 = pack;
export const ct54ProtectionPrefixS2770 = 'paint:ct54-rectangular-protection';
export const ct54ProtectionChoiceIdS2770 = 'ct54_protection_method';
export const ct54ProtectionChoiceS2770 = {kind:'equals' as const,parameterId:ct54ProtectionChoiceIdS2770,value:pack.exactChoiceRu};
export const ct54ProtectionOtherS2770 = {kind:'equals' as const,parameterId:ct54ProtectionChoiceIdS2770,value:pack.otherChoiceRu};

type ProtectionVariant = Readonly<{
  pack: Pick<typeof pack, 'contract' | 'sourceId' | 'titleRu' | 'scopeRu' | 'exactChoiceRu' | 'otherChoiceRu' | 'exactSiteRu' | 'sources' | 'excludedRu'>;
  prefix: string;
  parameterPrefix: string;
  filmRollWidthM: 1.8 | 2.6;
  choices: readonly string[];
  filmShortTitleRu: string;
  tapeShortTitleRu: string;
  filmTitleRu: string;
  tapeTitleRu: string;
  requireAllGeometryFacts?: true;
  exclusivePositiveCutDimensions?: true;
  publicNames?: Readonly<Record<string, string>>;
  cutWidthTitleRu?: string;
  cutHeightTitleRu?: string;
  publicDetailsRu?: Readonly<Record<string, readonly string[]>>;
}>;

const legacyVariant: ProtectionVariant = {
  pack, prefix: ct54ProtectionPrefixS2770, parameterPrefix: 'ct54_protection', filmRollWidthM: 1.8,
  choices: [pack.otherChoiceRu, pack.exactChoiceRu],
  filmShortTitleRu: 'укрытия4369,14м×1,8м', tapeShortTitleRu: 'ленты4363,25м×50мм',
  filmTitleRu: 'Укрытие tesa4369,14м×1,8м с интегрированной верхней лентой',
  tapeTitleRu: 'Лента tesa4363,25м×50мм для трёх остальных сторон',
};

export const ct54Tesa2600PackR1 = tesa2600Pack;
export const ct54Tesa2600PrefixR1 = 'paint:ct54-rectangular-protection:tesa2600';
export const ct54Tesa2600ParameterPrefixR1 = 'ct54_tesa2600';
const tesa2600Variant: ProtectionVariant = {
  pack: tesa2600Pack, prefix: ct54Tesa2600PrefixR1, parameterPrefix: ct54Tesa2600ParameterPrefixR1,
  filmRollWidthM: 2.6, choices: [pack.otherChoiceRu, pack.exactChoiceRu, tesa2600Pack.exactChoiceRu],
  filmShortTitleRu: 'плёнка tesa 4369, рулон 14 × 2,6 м',
  tapeShortTitleRu: 'лента tesa 4363, рулон 25 м × 50 мм, для укрытия 2,6 м',
  filmTitleRu: 'Укрывная плёнка с верхней лентой tesa 4369, рулон 14 × 2,6 м',
  tapeTitleRu: 'Лента для трёх сторон укрытия tesa 4363, рулон 25 м × 50 мм',
  requireAllGeometryFacts: true,
  exclusivePositiveCutDimensions: true,
  cutWidthTitleRu: 'Ширина одного укрытия с припусками, м',
  cutHeightTitleRu: 'Высота одного укрытия с припусками, м',
  publicDetailsRu: {
    "covered-area": [
      "Площадь одинаковых укрытий по фактической ширине и высоте с припусками, м².",
      "Это справочная геометрия укрытий, а не площадь окраски или норма расхода на м² окраски.",
      "Отдельно в закупку и стоимость не включается."
    ],
    "film-strip-area": [
      "Площадь полос плёнки tesa 4369 полной ширины 2,6 м до обрезки по высоте, м².",
      "Верхняя лента уже входит в плёнку и не покупается повторно.",
      "Отдельно в закупку и стоимость не включается."
    ],
    "film-tail": [
      "Суммарная длина концевых отрезков открытых рулонов tesa 4369 шириной 2,6 м, м.",
      "Пригодность этих отрезков для другого применения проверяется отдельно; они не являются нормой отходов или вывоза.",
      "Это не целые нераспечатанные рулоны; отдельно в закупку и стоимость не включается."
    ],
    "film-trim": [
      "Площадь обрезков по высоте полос плёнки tesa 4369 шириной 2,6 м, м².",
      "Повторное применение требует проверки; эта площадь не является нормой отходов или вывоза.",
      "Отдельно в закупку и стоимость не включается."
    ],
    "tape-length": [
      "Справочная длина ленты tesa 4363 на две боковые и нижнюю стороны укрытий, м.",
      "Верхняя лента уже входит в плёнку tesa 4369 и здесь повторно не учитывается.",
      "Это длина для раскроя, а не дополнительный заказ; отдельно в закупку и стоимость не включается."
    ],
    "film-opened": [
      "Справочное число открываемых рулонов плёнки tesa 4369 размером 14 × 2,6 м по карте раскроя.",
      "Верхняя лента включена в плёнку. Это не дополнительный заказ; отдельно в закупку и стоимость не включается."
    ],
    "film-order": [
      "Заказ плёнки tesa 4369 размером 14 × 2,6 м учитывается в целых рулонах; верхняя лента входит в изделие.",
      "Цена задаётся за один целый рулон tesa 4369 размером 14 × 2,6 м и не переносится из цены плёнки за м².",
      "Автоматический заказ учитывает подтверждённые наличие целых рулонов, резерв и кратность поставки этой плёнки."
    ],
    "film-remaining": [
      "Справочное число целых нераспечатанных рулонов плёнки tesa 4369 размером 14 × 2,6 м после раскроя.",
      "Концевые отрезки и обрезки по высоте сюда не входят. Отдельно в закупку и стоимость не включается."
    ],
    "film-free": [
      "Справочное число целых нераспечатанных рулонов плёнки tesa 4369 размером 14 × 2,6 м сверх сохраняемого резерва.",
      "Концевые отрезки и обрезки по высоте сюда не входят. Отдельно в закупку и стоимость не включается."
    ],
    "tape-opened": [
      "Справочное число открываемых рулонов ленты tesa 4363 размером 25 м × 50 мм по раскрою целых комплектов на укрытие.",
      "Комплект содержит две боковые и нижнюю стороны. Это не дополнительный заказ; отдельно в закупку и стоимость не включается."
    ],
    "tape-order": [
      "Заказ ленты tesa 4363 размером 25 м × 50 мм учитывается в целых рулонах.",
      "Цена задаётся за один целый рулон tesa 4363 размером 25 м × 50 мм и не переносится из цены ленты за метр.",
      "Лента нужна только на две боковые и нижнюю стороны; верхняя лента уже входит в плёнку tesa 4369.",
      "Автоматический заказ учитывает подтверждённый раскрой целых комплектов и отдельные наличие, резерв и кратность поставки этой ленты."
    ],
    "tape-remaining": [
      "Справочное число целых нераспечатанных рулонов ленты tesa 4363 размером 25 м × 50 мм после раскроя.",
      "Неполные отрезки не считаются целыми рулонами. Отдельно в закупку и стоимость не включается."
    ],
    "tape-free": [
      "Справочное число целых нераспечатанных рулонов ленты tesa 4363 размером 25 м × 50 мм сверх сохраняемого резерва.",
      "Неполные отрезки не считаются целыми рулонами. Отдельно в закупку и стоимость не включается."
    ]
  },
  publicNames: {
    'covered-area': 'Площадь прямоугольных укрытий плёнкой tesa 4369, 14 × 2,6 м',
    'film-strip-area': 'Полосы плёнки tesa 4369 шириной 2,6 м; верхняя лента включена',
    'film-tail': 'Концевые остатки открытых рулонов tesa 4369, 14 × 2,6 м',
    'film-trim': 'Обрезки по высоте плёнки tesa 4369 шириной 2,6 м',
    'tape-length': 'Длина ленты tesa 4363 для двух боковых и нижней сторон укрытия 2,6 м',
    'film-order': 'Укрывная плёнка с верхней лентой tesa 4369, рулон 14 × 2,6 м',
    'tape-order': 'Лента для трёх сторон укрытия tesa 4363, рулон 25 м × 50 мм',
  },
};

/** One existing cut-plan factory. A new width is an explicit, disjoint SKU
 * branch; the historical function below keeps its original IDs and data. */
function protectionGeometry(variant: ProtectionVariant) {
  const {pack, parameterPrefix} = variant;
  const n = parameterPrefix+'_rectangle_count', w = parameterPrefix+'_cut_width_m', h = parameterPrefix+'_cut_height_m';
  const site = parameterPrefix+'_site';
  const choice = {kind:'equals' as const,parameterId:ct54ProtectionChoiceIdS2770,value:pack.exactChoiceRu};
  const active = {kind:'and' as const,operands:[choice,{kind:'equals' as const,parameterId:site,value:pack.exactSiteRu}]};
  const filmRolls = `ceil(${n}/floor(14/${w}))`;
  const tapeKitLength = `(${w}+2*${h})`;
  const tapeKitRolls = `ceil(${n}/floor(25/${tapeKitLength}))`;
  const tapeLengthLowerBound = `max(ceil(${n}*${tapeKitLength}/25),ceil(${n}/floor(25/${w})),ceil(2*${n}/floor(25/${h})))`;
  // Complete three-edge kits supply an explicit feasible layout. Its equality
  // to the existing total/piece lower bound proves the minimum roll count.
  // A gap keeps the original tape need; ceil(total length/25) is not a layout.
  const tapeReplacement = {kind:'and',operands:[active,
    {kind:'not',operand:{kind:'formula_greater_than',expression:`${tapeKitRolls}-${tapeLengthLowerBound}`,unitId:'item',value:0}},
  ]};
  return {n,w,h,site,choice,active,filmRolls,tapeKitLength,tapeKitRolls,tapeReplacement};
}
const legacyGeometry = protectionGeometry(legacyVariant);
const tesa2600Geometry = protectionGeometry(tesa2600Variant);
export const ct54ProtectionFilmReplacementS2770 = legacyGeometry.active;
export const ct54ProtectionTapeReplacementS2770 = legacyGeometry.tapeReplacement;
export const ct54Tesa2600FilmReplacementR1 = tesa2600Geometry.active;
export const ct54Tesa2600TapeReplacementR1 = tesa2600Geometry.tapeReplacement;

export function ct54RectangularProtectionDefinitionS2770() {
  return buildRectangularProtection(legacyVariant);
}

/** Fresh successor gate only. Complete 1.8 m inputs retain their quantities;
 * an unknown height cannot become an admitted film order, including manual. */
export function ct54RectangularProtectionForwardDefinitionS2770() {
  return buildRectangularProtection({...legacyVariant,requireAllGeometryFacts:true});
}

/** Forward authoring only; selection/defaults of existing revisions are not migrated. */
export function ct54Tesa2600DefinitionR1() {
  return buildRectangularProtection(tesa2600Variant);
}

function buildRectangularProtection(variant: ProtectionVariant) {
  const {pack,prefix,parameterPrefix,filmRollWidthM} = variant;
  const {n,w,h,site,choice,active,filmRolls,tapeKitLength,tapeKitRolls,tapeReplacement} = protectionGeometry(variant);
  const conditional: AutomaticParameterSpec[] = [
    {id:ct54ProtectionChoiceIdS2770,title:'Как укрывают неокрашиваемые элементы',valueType:'enum',unitId:null,kind:'conditional',values:variant.choices},
    {id:site,title:'Границы укрытия и пригодность крепления',valueType:'enum',unitId:null,kind:'conditional',values:[pack.exactSiteRu],requiredWhen:choice},
    {id:n,title:'Число одинаковых прямоугольных укрытий',valueType:'integer',unitId:'item',kind:'conditional',min:1,max:1000,requiredWhen:choice},
    {id:w,title:variant.cutWidthTitleRu??'Ширина одного конверта раскроя с фактическими припусками, м',valueType:'decimal',unitId:'m',kind:'conditional',min:0.001,max:14,requiredWhen:choice},
    {id:h,title:variant.cutHeightTitleRu??'Высота одного конверта раскроя с фактическими припусками, м',valueType:'decimal',unitId:'m',kind:'conditional',min:0.001,max:filmRollWidthM,requiredWhen:choice},
  ];
  for (const [kind,title] of [['film',variant.filmShortTitleRu],['tape',variant.tapeShortTitleRu]] as const) {
    for (const [suffix,label,min] of [['stock','Пригодные целые рулоны',0],['reserve','Сохранить нераспечатанных рулонов',0],['supplier_multiple','Кратность поставки в рулонах',1]] as const) {
      conditional.push({id:`${parameterPrefix}_${kind}_${suffix}`,title:`${label}: ${title}`,valueType:'integer',unitId:'item',kind:'conditional',min,max:100000,requiredWhen:choice});
    }
  }
  const rows: AutomaticRowSpec[] = [];
  const add = (suffix:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={}) => rows.push({
    rowId:prefix+':'+suffix,formulaId:prefix+':formula:'+suffix,title:variant.publicNames?.[suffix]??title,unitId,expression,
    section:'protection',category:'material',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:active,inputParameterIds:variant.requireAllGeometryFacts?[site,n,w,h]:[site],...extra,
  });
  add('covered-area','Фактическая площадь прямоугольных конвертов укрытия','m2',`${n}*${w}*${h}`);
  add('film-strip-area','Полосы укрытия4369 по раскрою; интегрированная верхняя лента включена','m2',`${n}*${w}*${filmRollWidthM}`);
  add('film-tail','Неразрезанные концевые отрезки открытых рулонов4369 — пригодность для других работ проверяется отдельно','m',`(${filmRolls})*14-${n}*${w}`);
  add('film-trim','Обрезки по высоте укрытий — не автоматическая норма отходов или вывоза','m2',`${n}*${w}*(${filmRollWidthM}-${h})`);
  add('tape-length','Дополнительная лента на две боковые и нижнюю стороны; без повторной верхней ленты','m',`${n}*${tapeKitLength}`);
  for (const [kind,opened,title] of [['film',filmRolls,variant.filmTitleRu],['tape',tapeKitRolls,variant.tapeTitleRu]] as const) {
    const stock=`${parameterPrefix}_${kind}_stock`,reserve=`${parameterPrefix}_${kind}_reserve`,quantum=`${parameterPrefix}_${kind}_supplier_multiple`;
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
    parameters:built.parameters.map(p=>p.truth_metadata.visibility_role==='INTERNAL_ONLY'?p:({...p,...(variant.exclusivePositiveCutDimensions&&[w,h].includes(p.parameter_id)?{constraints_json:{...p.constraints_json,min:0,exclusiveMin:0}}:{}),truth_metadata:{...p.truth_metadata,source_confirmation_required:false,value_source_role:'PROJECT_SPECIFIC_INPUT',
      visible_when:p.parameter_id===ct54ProtectionChoiceIdS2770?{kind:'literal',value:true}:choice,
      provenance:{...(p.truth_metadata.provenance&&typeof p.truth_metadata.provenance==='object'?p.truth_metadata.provenance:{}),consumer_input_role_v1:p.parameter_id.includes('_stock')||p.parameter_id.includes('_reserve')||p.parameter_id.includes('_supplier_multiple')?'ADVANCED_OPTION':[n,w,h].includes(p.parameter_id)?'OBJECT_GEOMETRY':'OBJECT_FACT'}}})),
    resources:built.resources.map(r=>{
      const isTapeRoll=r.row_id.startsWith(prefix+':tape-')&&r.row_id!==prefix+':tape-length';
      const {row_sha256:_old,...body}=r;
      const value={...body,inclusion_ast:isTapeRoll?tapeReplacement:r.inclusion_ast,
        resource_graph:{...r.resource_graph,fullTechnicalAcceptance:false,geometryNotPaintAreaCoefficient:true,
          integratedTopTapeIncludedOnce:true,cutOffsNotDisposalWaste:true,
          operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,operationId:prefix+':cut-and-mask',operationTitleRu:pack.titleRu,processOrdinal:5,completionCriterionRu:'Полная геометрия конвертов и пригодность крепления известны; целые рулоны и пригодные остатки учтены один раз.'},
          publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:variant.publicNames?r.title_ru:pack.titleRu,nameRu:variant.publicNames?.[r.row_id.slice(prefix.length+1)]??r.title_ru,brandAndModelRu:null,specificationRu:pack.scopeRu,
            detailsRu:variant.publicDetailsRu?.[r.row_id.slice(prefix.length+1)]??['Количество выведено из геометрии принятой карты раскроя, а не из нормы на площадь окраски.','Рулоны и остатки одного изделия учитываются отдельно от пригодных обрезков; последние не объявляются отходами.','Новые рулоны не наследуют старую цену плёнки за м² или ленты за м.']}},
        source_metadata:{...r.source_metadata,sourceRole:'PROJECT_GEOMETRY_DERIVED_CUT_PLAN',sourceNormQuantityAccepted:true,full_technical_acceptance:false,
          manufacturerDimensionsOnly:true,geometryRuleIsNotManufacturerConsumptionRate:true,noAdditionalPaidLabour:true,
          source_artifact_sha256:pack.sources.tesa2026.sha256,exact_locator:pack.sources.tesa2026.locator,
          normativeTrace:[{sourceId:pack.sourceId,normId:'ct54_rectangular_project_cut_plan_v1',source_definition_hash:pack.sources.tesa2026.sha256,exact_locator:pack.sources.tesa2026.locator,sourceRole:'MANUFACTURER_PRODUCT_DIMENSIONS_WITH_EXPLICIT_PROJECT_GEOMETRY'}]}};
      return {...value,row_sha256:estimateDeterministicHash(value)};
    }),
  };
}
