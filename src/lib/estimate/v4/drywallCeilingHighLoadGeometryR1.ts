import pack from '../../../../data/estimate-benchmarks/source-packs/drywall-ceiling-high-load-geometry-r1.json';
import { buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { canonicalEstimateSha256HexText } from '../backendPlatform/canonicalEstimateSha256';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';

export const DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_CATALOG_ID = pack.catalogId;
export const DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_SOURCE_PACK = pack;
export const DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_SOURCE_SHA256 = '1c9f73c727d983e28db193b9bbd83413dcb7a802cba00930df1ea4ef3c192ad6';
export const DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_PREFIX = 'ceiling:p1121:high-load';
const P = DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_PREFIX;
const R = (key: string) => `${P}:${key}`;

/** Definition-owned formula DAG, evaluated only by the canonical FormulaGraph.
 * No browser calculator, submitted fastener counts, per-run definitions or
 * area-only extrapolation. A factory dry joint kit supplies its own clips. */
const derived = [
  ['area_m2', 'Измеренная площадь прямоугольного потолка', 'm2', 'room_length_m*room_width_m'],
  ['p112_installation_height_m', 'Верхняя монтажная отметка анкеров', 'm', 'ceiling_height_m+ceiling_drop_m'],
  ['p112_perimeter_m', 'Внешний периметр', 'm', '2*(room_length_m+room_width_m)'],
  ['p112_bays_x', 'Поля длиной не более 15 м', 'item', 'ceil(room_length_m/15)'],
  ['p112_bays_y', 'Поля шириной не более 15 м', 'item', 'ceil(room_width_m/15)'],
  ['p112_bay_l_m', 'Чистая длина поля с учётом 20 мм швов', 'm', '(room_length_m-(p112_bays_x-1)*0.02)/p112_bays_x'],
  ['p112_bay_w_m', 'Чистая ширина поля с учётом 20 мм швов', 'm', '(room_width_m-(p112_bays_y-1)*0.02)/p112_bays_y'],
  ['p112_bay_count', 'Количество независимых полей', 'item', 'p112_bays_x*p112_bays_y'],
  ['p112_clad_area_m2', 'Чистая площадь обшивки, без открытых 20 мм швов', 'm2', 'p112_bay_count*p112_bay_l_m*p112_bay_w_m'],
  ['p112_expansion_m', 'Деформационные швы между полями', 'm', '(p112_bays_x-1)*p112_bays_y*p112_bay_w_m+(p112_bays_y-1)*p112_bays_x*p112_bay_l_m'],
  ['p112_main_lines', 'Основные профили одного поля, шаг ≤500 мм', 'item', 'ceil((p112_bay_w_m-0.2)/0.5)+1'],
  ['p112_bearing_lines', 'Несущие профили одного поля, шаг ≤500 мм', 'item', 'ceil((p112_bay_l_m-0.1)/0.5)+1'],
  ['p112_hangers_per_main', 'Подвесы одной линии, шаг ≤800 мм', 'item', 'ceil((p112_bay_l_m-0.2)/0.8)+1'],
  ['p112_main_piece_count', 'Целые 3 м ПП на одну основную линию', 'item', 'ceil((p112_bay_l_m-0.01)/3)'],
  ['p112_bearing_piece_count', 'Целые 3 м ПП на одну несущую линию', 'item', 'ceil((p112_bay_w_m-0.01)/3)'],
  ['p112_sheet_rows', 'Ряды листов шириной ≤1200 мм', 'item', 'ceil(p112_bay_w_m/1.2)'],
  ['p112_sheet_even_rows', 'Ряды с целым стартовым листом', 'item', 'ceil(p112_sheet_rows/2)'],
  ['p112_sheet_odd_rows', 'Ряды со стартовым 1000 мм фрагментом', 'item', 'floor(p112_sheet_rows/2)'],
  ['p112_sheet_even_count', 'Исходные листы полного стартового ряда', 'item', 'ceil(p112_bay_l_m/2.5)'],
  ['p112_sheet_odd_count', 'Исходные листы смещённого ряда', 'item', '1+ceil(max(0,p112_bay_l_m-1)/2.5)'],
  ['p112_last_row_width_m', 'Ширина последнего ряда', 'm', 'p112_bay_w_m-(p112_sheet_rows-1)*1.2'],
  ['p112_last_row_even', 'Последний ряд имеет целый старт', 'item', 'p112_sheet_rows-2*floor(p112_sheet_rows/2)'],
  ['p112_even_screw_lines', 'Линии TN в целом стартовом ряду, включая обе кромки стыков', 'item', 'p112_bearing_lines+p112_sheet_even_count-1'],
  ['p112_odd_screw_lines', 'Линии TN в смещённом ряду, включая обе кромки стыков', 'item', 'p112_bearing_lines+p112_sheet_odd_count-1'],
  ['p112_thin_last_row', 'Перераскрой двух последних рядов при полосе менее 30 мм', 'item', 'ceil(max(0,0.03-p112_last_row_width_m)/0.03)'],
  ['p112_last_row_screws', 'TN на одну линию последнего ряда, шаг ≤150 мм', 'item', 'ceil(max(0,p112_last_row_width_m-0.03)/0.15)+1'],
  ['p112_transverse_joint_m', 'Суммарная длина торцевых стыков', 'm',
    'p112_bay_count*(1.2*((p112_sheet_even_rows-p112_last_row_even)*(p112_sheet_even_count-1)+(p112_sheet_odd_rows-1+p112_last_row_even)*(p112_sheet_odd_count-1))+p112_last_row_width_m*(p112_last_row_even*(p112_sheet_even_count-1)+(1-p112_last_row_even)*(p112_sheet_odd_count-1))+0.6*p112_thin_last_row*(2*p112_last_row_even-1)*(p112_sheet_even_count-p112_sheet_odd_count))'],
  ['p112_joint_m', 'Фактические продольные и торцевые стыки обшивки', 'm',
    'p112_bay_count*(p112_sheet_rows-1)*p112_bay_l_m+p112_transverse_joint_m'],
  ['p112_sheet_count', 'Исходные 2500×1200 мм листы на обшивку', 'item',
    'p112_bay_count*(p112_sheet_even_rows*p112_sheet_even_count+p112_sheet_odd_rows*p112_sheet_odd_count)'],
  ['p112_expansion_profile_count', 'Целые 3 м профили EMAC NDP на независимые швы', 'item', '(p112_bays_x-1)*ceil(p112_bay_w_m/3)'],
  ['p112_tn_count', 'TN25 всего по раскладке', 'item',
    'p112_bay_count*(9*((p112_sheet_even_rows-p112_last_row_even)*p112_even_screw_lines+(p112_sheet_odd_rows-1+p112_last_row_even)*p112_odd_screw_lines)+p112_last_row_screws*(p112_last_row_even*p112_even_screw_lines+(1-p112_last_row_even)*p112_odd_screw_lines)+4*p112_thin_last_row*(2*p112_last_row_even-1)*(p112_even_screw_lines-p112_odd_screw_lines))'],
] as const;

const stages = [
  ['setout', 'Разметка уровня, профилей и мест подвесов', 'area_m2', 'm2'],
  ['suspend', 'Металлические анкеры и подвесы 40 кг', 'p112_bay_count*p112_main_lines*p112_hangers_per_main', 'item'],
  ['frame', 'Монтаж и выравнивание двухуровневого каркаса', 'area_m2', 'm2'],
  ['clad', 'Однослойная обшивка ГСП-А 12.5 мм с разбежкой стыков', 'p112_clad_area_m2', 'm2'],
  ['expansion', 'Деформационные швы независимых полей', 'p112_expansion_m', 'm'],
  ['joint', 'Заделка стыков Q1, примыканий и головок TN', 'p112_joint_m', 'm'],
  ['prime', 'Грунтование обшивки перед последующей отделкой', 'p112_clad_area_m2', 'm2'],
  ['accept', 'Уборка рабочего места и поэтапная приёмка', 'area_m2', 'm2'],
] as const;
type Stage = typeof stages[number][0];
type RowBinding = {stage: Stage; source: number; included?: boolean; tool?: boolean; owner?: string;
  baseNorm?: boolean; sourceGap?: boolean; heightNorm?: boolean};
const operation = (stage: Stage) => {
  const item = stages.find(s => s[0] === stage)!;
  return { operationId: R('operation:'+stage), operationTitleRu: item[1], processOrdinal: stages.indexOf(item)+1,
    processRole: 'PROCESS' as const,
    completionCriterionRu: stage === 'expansion'
      ? 'Установлены свободно подвижные EMAC NDP, комплектные клипсы чередуются; оба поля каркаса независимы, шов не заполнен шпаклёвкой.'
      : 'Количество рассчитано из геометрии выбранной системы; монтаж, пригодность основания и приёмка проверяются отдельно.' };
};

export function buildDrywallCeilingHighLoadGeometryR1(): AutomaticOwnerDefinition {
  const rows: AutomaticRowSpec[] = [];
  const bindings = new Map<string, RowBinding>();
  const add = (key: string, title: string, unitId: string, expression: string,
    binding: RowBinding, extra: Partial<AutomaticRowSpec> = {}) => {
    rows.push({rowId:R(key),formulaId:R('formula:'+key),section:pack.titleRu,category:'material',title,unitId,expression,
      procurement:true,...extra}); bindings.set(R(key),binding);
  };
  const hasJoint = {kind:'formula_greater_than' as const,expression:'p112_expansion_m',unitId:'m',value:0};
  const withinBaseHeight = {kind:'less_than_or_equal' as const,parameterId:'p112_installation_height_m',value:4};
  const aboveBaseHeight = {kind:'greater_than' as const,parameterId:'p112_installation_height_m',value:4};
  const known = {kind:'greater_than' as const,parameterId:'area_m2',value:0};
  add('material:pp-main','ПП 60×27×0.6, 3 м: основные профили','item','p112_bay_count*p112_main_lines*p112_main_piece_count',{stage:'frame',source:0});
  add('material:pp-bearing','ПП 60×27×0.6, 3 м: несущие профили','item','p112_bay_count*p112_bearing_lines*p112_bearing_piece_count',{stage:'frame',source:0});
  add('material:extensions','КНАУФ-удлинитель ПП 60×27','item','p112_bay_count*(p112_main_lines*(p112_main_piece_count-1)+p112_bearing_lines*(p112_bearing_piece_count-1))',{stage:'frame',source:0});
  add('material:connectors','КНАУФ-соединители односторонние анкерные для каркаса','item','2*p112_bay_count*p112_main_lines*p112_bearing_lines',{stage:'frame',source:0});
  add('material:hangers','Прямой КНАУФ-подвес 125 мм, 40 кг','item','p112_bay_count*p112_main_lines*p112_hangers_per_main',{stage:'suspend',source:0});
  add('material:anchors','Металлические потолочные анкеры 6×40 мм в железобетон','item','p112_bay_count*p112_main_lines*p112_hangers_per_main',{stage:'suspend',source:0});
  add('material:ln','Шурупы LN 3.5×11 для прямых подвесов','item','2*p112_bay_count*p112_main_lines*p112_hangers_per_main',{stage:'suspend',source:0});
  add('material:board','ГСП-А ПЛУК 12.5×1200×2500 мм: целые листы','item','p112_sheet_count',{stage:'clad',source:0});
  add('material:tn','Шурупы TN 3.5×25 по фактическим линиям обшивки','item','p112_tn_count',{stage:'clad',source:0});
  add('material:joint-tape','Бумажная армирующая лента КНАУФ, рулон 50 м','item','ceil(p112_joint_m/50)',{stage:'joint',source:2});
  add('material:separation-tape','КНАУФ-Треннфикс, рулон 50 м: внешний периметр','item','ceil(p112_perimeter_m/50)',{stage:'joint',source:0});
  add('material:fugen','КНАУФ-Фуген для Q1: мешок 25 кг','item','ceil(p112_clad_area_m2*0.25/25)',{stage:'joint',source:2});
  add('material:water','Чистая вода для приготовления шпаклёвки','l','p112_clad_area_m2*0.25*0.7',{stage:'joint',source:2});
  // Physical bevel area: 2/3 of12.5mm, angle22.5deg to the edge normal.
  // sqrt(2+sqrt(2))/2 is cos(22.5deg); no fabricated20mm treatment band.
  add('material:primer','КНАУФ-Тифенгрунд, ведро 5 кг: поверхность и реальные фаски','item',
    'ceil((p112_clad_area_m2+2*p112_transverse_joint_m*(0.0125*2/3)*2/sqrt(2+sqrt(2)))*0.1/5)',{stage:'prime',source:3});
  add('material:expansion-profile','EMAC Novotapajuntas NDP NTDPP50BL3: профиль 3 м с 5 клипсами S','item',
    'p112_expansion_profile_count',{stage:'expansion',source:5},{inclusion:hasJoint});
  add('material:expansion-clips','Комплектные клипсы EMAC S: по 5 на профиль, включены в его цену','item',
    '5*p112_expansion_profile_count',{stage:'expansion',source:5,included:true,owner:R('material:expansion-profile')},
    {inclusion:hasJoint,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  add('work:whole','Полный монтаж каркаса П112.1 и сухих швов EMAC: все стадии и оснащение','m2','area_m2',{stage:'setout',source:4},
    {category:'work',procurement:false});
  // Published P112 base quantities, never a second paid owner or observed tool hours.
  // The dry EMAC joint keeps an independent unresolved source obligation below.
  const includedReference = {procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const};
  add('reference:base-labor','Работа монтажников, включённая в монтаж потолка','man_hour','area_m2/100*92',
    {stage:'frame',source:4,included:true,baseNorm:true},{category:'labor',...includedReference,inclusion:withinBaseHeight});
  add('reference:electric-snips','Электроножницы, включённые в монтаж потолка','machine_hour','area_m2/100*0.14',
    {stage:'frame',source:4,included:true,baseNorm:true},{category:'equipment',...includedReference,inclusion:withinBaseHeight});
  add('reference:perforator','Электроперфоратор, включённый в монтаж потолка','machine_hour','area_m2/100*0.61',
    {stage:'suspend',source:4,included:true,baseNorm:true},{category:'equipment',...includedReference,inclusion:withinBaseHeight});
  add('reference:screwdriver','Шуруповёрт, включённый в монтаж потолка','machine_hour','area_m2/100*2',
    {stage:'clad',source:4,included:true,baseNorm:true},{category:'equipment',...includedReference,inclusion:withinBaseHeight});
  // Material geometry still applies above the proven normative work-height boundary.
  // Four actual quantity needs replace the inapplicable reference hours there.
  add('labor:height-source-gap','Труд монтажников для верхней монтажной отметки','man_hour','p112_above_height_labor_hours',
    {stage:'frame',source:4,included:true,sourceGap:true,heightNorm:true},{category:'labor',...includedReference,inclusion:aboveBaseHeight});
  add('equipment:snips-height-source-gap','Электроножницы для верхней монтажной отметки','machine_hour','p112_above_height_snips_hours',
    {stage:'frame',source:4,included:true,sourceGap:true,heightNorm:true},{category:'equipment',...includedReference,inclusion:aboveBaseHeight});
  add('equipment:perforator-height-source-gap','Электроперфоратор для верхней монтажной отметки','machine_hour','p112_above_height_perforator_hours',
    {stage:'suspend',source:4,included:true,sourceGap:true,heightNorm:true},{category:'equipment',...includedReference,inclusion:aboveBaseHeight});
  add('equipment:screwdriver-height-source-gap','Шуруповёрт для верхней монтажной отметки','machine_hour','p112_above_height_screwdriver_hours',
    {stage:'clad',source:4,included:true,sourceGap:true,heightNorm:true},{category:'equipment',...includedReference,inclusion:aboveBaseHeight});
  add('labor:emac-joint-source-gap','Труд монтажа сухого шва и его совмещение с монтажом потолка','man_hour',
    'p112_emac_joint_labor_hours',{stage:'expansion',source:5,included:true,sourceGap:true},
    {category:'labor',...includedReference,inclusion:hasJoint});
  for (const [id,title,expression,unit] of stages) add('stage:'+id,title,unit,expression,{stage:id,source:0,included:true},
    {category:'work',procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',...(id==='expansion'?{inclusion:hasJoint}:{})});
  add('scope:tools-access','Предоставление инструмента, подъёмника листов, подмостей, СИЗ и уборки в полном м² монтаже','',
    'p112_tools_scope',{stage:'setout',source:0,tool:true},{category:'service',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:known});
  const conditional: AutomaticParameterSpec[] = [
    ...derived.map(([id,title,unitId])=>({id,title,unitId,valueType:'decimal' as const,kind:'conditional' as const,min:0})),
    {id:'p112_tools_scope',title:'Предоставление оснащения полного монтажа',unitId:null,valueType:'decimal',kind:'internal'},
    {id:'p112_emac_joint_labor_hours',title:'Источник приложения: труд сухого шва и совмещение с базовым монтажом',
      unitId:'man_hour',valueType:'decimal',kind:'internal',min:0},
    ...([
      ['p112_above_height_labor_hours','Труд монтажников','man_hour'],
      ['p112_above_height_snips_hours','Электроножницы','machine_hour'],
      ['p112_above_height_perforator_hours','Электроперфоратор','machine_hour'],
      ['p112_above_height_screwdriver_hours','Шуруповёрт','machine_hour'],
    ] as const).map(([id,title,unitId])=>({id,title:'Источник приложения: '+title+' при верхней монтажной отметке вне базовой нормы',
      unitId,valueType:'decimal' as const,kind:'internal' as const,min:0})),
  ];
  const built = buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:P,sourceId:pack.sources[0].id,normId:pack.contract,
    sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.sources[0].edition,
      definition_hash:DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_SOURCE_SHA256,artifact_sha256:DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_SOURCE_SHA256,
      exact_locator:pack.sources[0].locatorRu},applicabilityRu:pack.system.baseScopeRu,
    ordinary:[
      {id:'room_length_m',title:'Длина прямоугольного помещения, м',unitId:'m',valueType:'decimal',kind:'ordinary',min:1,max:120},
      {id:'room_width_m',title:'Ширина поперёк швов, от 1 до 15 м',unitId:'m',valueType:'decimal',kind:'ordinary',min:1,max:15},
      {id:'ceiling_height_m',title:'Высота готового потолка от пола, м',unitId:'m',valueType:'decimal',kind:'ordinary',min:2,max:4},
      {id:'ceiling_drop_m',title:'Опуск готового потолка от перекрытия, м',unitId:'m',valueType:'decimal',kind:'ordinary',min:0.1,max:0.15},
    ],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:[pack.system.baseScopeRu,pack.system.loadMeaningRu,...pack.readiness.openAuthorObligationsRu]});
  const byDerived = new Map<string,string>(derived.map(([id,,,expression])=>[id,expression]));
  const parameters = built.parameters.map(parameter => {
    const expression = byDerived.get(parameter.parameter_id);
    if(parameter.parameter_id==='p112_emac_joint_labor_hours'||parameter.parameter_id.startsWith('p112_above_height_')) return {...parameter,truth_metadata:{
      ...parameter.truth_metadata,source_confirmation_required:false,visibility_role:'INTERNAL_ONLY',
      value_source_role:'UNRESOLVED_APPLICATION_NORM',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
      unresolved_norm_reason:parameter.parameter_id==='p112_emac_joint_labor_hours'
        ?pack.baseNorm.jointGap.reasonRu:pack.baseNorm.heightGap.reasonRu}};
    return {...parameter,truth_metadata:{...parameter.truth_metadata,source_confirmation_required:false,
      ...(expression?{visibility_role:'INTERNAL_ONLY',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',
        provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},runtime_profile_classification:'PRELIMINARY_SOURCE_FORMULA',
        runtime_profile_value:true,preliminary_compilation_allowed:true,
        preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression,
          explicitValuePolicy:'REQUIRE_MATCH',when:{kind:'literal',value:true}}}:{}),
    }};
  });
  const whole=R('work:whole');
  const rowFormulaInputs=new Map(built.formulas.map(formula=>[formula.formula_id,formula.input_parameter_ids]));
  const derivedInputs=new Map<string,string[]>(derived.map(([id,,,expression])=>[id,compileFormulaGraph(expression).inputParameterIds]));
  const resourceInputs=(ids:string[]):string[]=>{
    const expanded=new Set(ids);
    const visit=(id:string)=>{for(const dependency of derivedInputs.get(id)??[]){
      if(!expanded.has(dependency)){expanded.add(dependency);visit(dependency);}
    }};
    for(const id of ids)visit(id);
    return [...expanded];
  };
  const resources=built.resources.map(resource=>{
    const b=bindings.get(resource.row_id)!,source=pack.sources[b.source],isWhole=resource.row_id===whole;
    const owner=b.owner??whole;
    const {row_sha256:_old,...body}=resource;
    const changed={...body,...(b.included||b.tool?{cost_owner_id:owner}:{}),
      resource_graph:{...resource.resource_graph,scopeContextParameterIds:['room_length_m','room_width_m','ceiling_height_m','ceiling_drop_m'],
        inputParameterIds:resourceInputs([...(Array.isArray(resource.resource_graph.inputParameterIds)?resource.resource_graph.inputParameterIds as string[]:[]),
          ...(rowFormulaInputs.get(resource.formula_id)??[]),
          'ceiling_height_m','ceiling_drop_m']),
        ...(b.included||b.tool?{parentCostOwnerId:owner,includedInResourceOwnerRowId:owner}:{}),
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:P,groupTitleRu:pack.titleRu,
          ...operation(b.stage),...(isWhole?{processRole:'COST_SUMMARY',processOrdinal:0,additionalOperations:stages.map(s=>operation(s[0]))}:{}),
          ...(b.baseNorm&&resource.category==='labor'?{additionalOperations:stages.filter(s=>s[0]!=='expansion').map(s=>operation(s[0]))}:{}),
        },
        ...(b.tool?{scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:P,groupTitleRu:pack.titleRu,
          titleRu:resource.title_ru,reasonRu:pack.commercialScopeRu,exactScopeWhen:known,coveringRowIds:[whole],originalRowIds:[],costExclusionBreaksScopeV1:true,
          sourceEvidence:[{sha256:source.sha256,locator:source.locatorRu},{sha256:canonicalEstimateSha256HexText(pack.commercialScopeRu),locator:'Явно объявленный коммерческий состав одной㎡цены; почасовая норма не заявлена.'}]}}:{}),
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,
          brandAndModelRu:resource.category==='material'?(b.source>=5?'EMAC':'КНАУФ'):null,
          detailsRu:b.baseNorm?['Ресурс включён в общую оплату монтажа потолка; отдельная плата не добавляется.']:
            b.sourceGap?['Ресурс входит в общую оплату монтажа; применимое количество требует подтверждения источником приложения.']:
              b.owner?['Комплектная деталь входит в стоимость заводского профиля и не оплачивается повторно.']:
                isWhole||b.included||b.tool?[pack.commercialScopeRu]:
                  ['Количество материала определено раскладкой и выбранной заводской упаковкой.'],
          ...(!b.owner&&(b.included||b.tool)?{rowKind:'PROCESS_NOTE'}:{})}},
      source_metadata:{...resource.source_metadata,official_url:source.url,artifact_sha256:source.sha256,exact_locator:source.locatorRu,
        sourceRole:b.heightNorm?'UNRESOLVED_RESOURCE_ABOVE_BASE_NORM_WORK_HEIGHT':b.sourceGap?'UNRESOLVED_EMAC_LABOR_AND_BASE_NORM_COMBINATION':
          b.baseNorm?'INCLUDED_KRER10_05_011_01_BASE_NORM_REFERENCE':b.owner?'FACTORY_KIT_INCLUDED_QUANTIFIED_COMPONENT':
            b.included||b.tool||isWhole?'DECLARED_FULL_WORK_COMMERCIAL_SCOPE':'SOURCE_SPECIFIC_GEOMETRIC_LAYOUT',
        normativeTrace:[{sourceId:source.id,normId:b.baseNorm?pack.baseNorm.code:pack.contract+':'+b.stage,source_url:source.url,exact_locator:source.locatorRu,
          source_definition_hash:source.sha256}],
        ...(b.baseNorm?{baseNormCode:pack.baseNorm.code,baseNormMeasurementM2:pack.baseNorm.measurementM2,
          baseNormMeasurementParameterId:pack.baseNorm.measurementParameterId,baseNormApplicabilityEvidence:pack.baseNorm.applicabilityEvidenceRu,
          baseNormGeneralApplicationSource:pack.sources[8],baseNormCoefficient:1,observedToolHoursClaimed:false,
          baseNormMaximumInstallationHeightM:4,baseNormHeightParameterId:'p112_installation_height_m',
          separatePaymentAllowed:false,fullMixedSystemHoursVerified:false}:
          b.sourceGap?{unresolved_norm_reason:b.heightNorm?pack.baseNorm.heightGap.reasonRu:pack.baseNorm.jointGap.reasonRu,
            applicableWhen:b.heightNorm?'p112_installation_height_m>4':'p112_expansion_m>0',
            separatePaymentAllowed:false,fullMixedSystemHoursVerified:false}:{}),
        selectedSystem:'KNAUF_P112_1_500_500_800_MAX_0_5_KN_M2',geometryRequired:true,
        full_technical_acceptance:false,selectedMaterialGeometryQuantitiesComplete:true,selectedScopeQuantitiesComplete:false,
        baseKnaufNormQuantitiesVerified:true,automaticGenericPriceInheritanceAllowed:false,
        sourceAuthorObligations:pack.readiness.openAuthorObligationsRu}};
    return {...changed,row_sha256:estimateDeterministicHash(changed)};
  });
  return {...built,parameters,resources};
}

export const DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_DEFINITION=buildDrywallCeilingHighLoadGeometryR1();
export function compileDrywallCeilingHighLoadGeometryR1(input:Record<string,unknown>) {
  return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'area_m2',
    definition:DRYWALL_CEILING_HIGH_LOAD_GEOMETRY_R1_DEFINITION,submittedParameters:input});
}
