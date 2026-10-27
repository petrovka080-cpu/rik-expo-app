// WORK candidate. Uses the canonical factory/FormulaGraph and does not publish.
import pack from '../../../../data/estimate-benchmarks/source-packs/knauf-protektor105922-seven-forward-r1.json';
import {buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition,
  type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1, effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const knaufProtektor105922PackR1 = pack;
export const knaufProtektor105922OwnerR1 = pack.ownerRowId;
export const knaufProtektor105922PrefixR1 = pack.prefix;
export const knaufProtektor105922FactsR1 = {
  count:'knauf_corner_105922_count',length:'knauf_corner_105922_length_mm',
  stock:'knauf_corner_105922_usable_stock_bars',reserve:'knauf_corner_105922_retained_reserve_bars',
  multiple:'knauf_corner_105922_bundle_multiple',product:'knauf_corner_105922_product',
  exposure:'knauf_corner_105922_exposure_finish',cutFit:'knauf_corner_105922_cut_fit',
} as const;
const f = knaufProtektor105922FactsR1, c = pack.choiceRu;
const choice = 'interior_plaster_material_system',scope = 'knauf_scope_external_corner_scope';
const eq = (parameterId:string,value:string):AutomaticInclusionCondition => ({kind:'equals',parameterId,value});
const all = (...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition => ({kind:'and',operands});
const manual = eq(choice,c.manual);
const selected = all(manual,eq(scope,c.hasCorners));
export const knaufProtektor105922OriginalScopeR1 = {kind:'and',operands:[manual,
  {kind:'not',operand:eq(scope,c.noCorners)}]};
export const knaufProtektor105922GeometryScopeR1 = all(selected,
  eq(f.product,c.product),eq(f.exposure,c.exposure),eq(f.cutFit,c.cutFit),
  {kind:'greater_than',parameterId:f.length,value:1500},
  {kind:'less_than_or_equal',parameterId:f.length,value:3000});
const geometryFacts = [f.count,f.length,f.product,f.exposure,f.cutFit];
const source = pack.sources[0]!;

/** Source dimensions and explicit project facts, never an area consumption
 * norm or second evaluator. The original no-corners guard remains a conjunct.
 * The paid owner deliberately stays visible as a need outside the bounded
 * geometry; a manual quantity cannot replace the missing derived allocation. */
export function knaufProtektor105922DefinitionR1():AutomaticOwnerDefinition {
  const conditional:AutomaticParameterSpec[] = [
    {id:scope,title:'Есть внешние углы под профиль?',kind:'conditional',valueType:'enum',unitId:null,
      values:[c.hasCorners,c.noCorners,c.unknown],requiredWhen:manual},
    {id:f.count,title:'Количество одинаковых непрерывных углов, шт.',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,requiredWhen:selected},
    {id:f.length,title:'Длина одного непрерывного угла, мм',kind:'conditional',valueType:'decimal',unitId:'mm',min:0.000001,requiredWhen:selected},
    {id:f.stock,title:'Пригодные целые профили длиной 3 м в наличии, шт.',kind:'conditional',valueType:'integer',unitId:'pcs',min:0,requiredWhen:selected},
    {id:f.reserve,title:'Оставить целые профили длиной 3 м после работ, шт.',kind:'conditional',valueType:'integer',unitId:'pcs',min:0,requiredWhen:selected},
    {id:f.multiple,title:'Кратность поставки в пачках по 25 профилей',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,requiredWhen:selected},
    {id:f.product,title:'Исполнение углового профиля',kind:'conditional',valueType:'enum',unitId:null,
      values:[c.product,c.otherProduct,c.unknown],requiredWhen:selected},
    {id:f.exposure,title:'Помещение и последующая отделка',kind:'conditional',valueType:'enum',unitId:null,
      values:[c.exposure,c.otherExposure,c.unknown],requiredWhen:selected},
    {id:f.cutFit,title:'Пригодность целого профиля для каждого угла',kind:'conditional',valueType:'enum',unitId:null,
      values:[c.cutFit,c.otherCutFit,c.unknown],requiredWhen:selected},
  ];
  const allocatedRow = pack.prefix+':allocated-bars';
  const allocated = effectiveResourceQuantityParameterId(allocatedRow);
  const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId:pack.ownerRowId,orderUnitId:'m',
    consumed:`3*${allocated}`,stock:`3*${f.stock}`,reserve:`3*${f.reserve}`,quantum:`75*${f.multiple}`,
    manualQuantumViolationPolicy:'retain-raw-and-block-quantum'});
  const expressions:Record<string,string> = {
    'installed-length':`${f.count}*${f.length}/1000`, 'allocated-bars':f.count,
    'cut-remainder':`${f.count}*(3-${f.length}/1000)`,
    'ordered-bars':`${balance.effective}/3`, 'manufacturer-bundles':`${balance.effective}/75`,
    remaining:balance.remaining,'free-after-reserve':balance.free,
    'consumption-shortage':balance.consumptionShortage,'reserve-deficit':balance.reserveDeficit,
  };
  const physicalRows = new Set(['installed-length','allocated-bars','cut-remainder']);
  const rows:AutomaticRowSpec[] = pack.informationRows.map(info=>({
    rowId:pack.prefix+':'+info.suffix,formulaId:pack.prefix+':formula:'+info.suffix,
    section:'Угловой штукатурный профиль: расход и поставка',category:'material',
    title:info.titleRu,unitId:info.unitId,expression:expressions[info.suffix]!,
    inclusion:knaufProtektor105922GeometryScopeR1,inputParameterIds:geometryFacts,
    procurement:false,costTreatment:'INFORMATIONAL_SCOPE',
    ...(info.suffix === 'allocated-bars' ? {effectiveQuantityOutput:{parameterId:allocated,unitId:'pcs'}} : {}),
    ...(!physicalRows.has(info.suffix) ? {purchaseBalanceOwnerRowId:pack.ownerRowId} : {}),
  }));
  rows.push({rowId:pack.ownerRowId,formulaId:pack.ownerFormulaId,
    section:'Угловой штукатурный профиль: заказ',category:'material',title:pack.publicOwnerNameRu,
    unitId:'m',expression:`75*${f.multiple}*ceil(max(0,3*${allocated}+3*${f.reserve}-3*${f.stock})/(75*${f.multiple}))`,
    inclusion:manual,inputParameterIds:Object.values(f),titleParameterIds:[f.product],
    procurement:true,costTreatment:'OWN_COST',...balance.owner});
  const built = buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,
    sourceId:pack.sourceIdCandidate,normId:pack.normIdCandidate,
    sourceMetadata:{source_title:'Protektor 1007Z, артикул 105922: размеры и упаковка',
      source_document_version:source.edition,definition_hash:source.sha256,
      artifact_sha256:source.sha256,exact_locator:source.exactLocator},
    applicabilityRu:pack.scopeRu,ordinary:[
      {id:'q',title:'Площадь штукатурки, м²',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0.001},
      {id:choice,title:'Технология на этом участке',kind:'ordinary',valueType:'enum',unitId:null,values:[c.legacy,c.manual]},
    ],conditional,profile:[],rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:pack.excludedUnownedAssumptions});
  const parameters = built.parameters.map(p=>p.truth_metadata.visibility_role === 'INTERNAL_ONLY' ? p : {
    ...p,truth_metadata:{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',
      source_confirmation_required:false,preliminary_compilation_allowed:true,
      visible_when:p.parameter_id === 'q' || p.parameter_id === choice ? {kind:'literal',value:true}
        : p.parameter_id === scope ? manual : selected,
      provenance:{consumer_input_role_v1:['q',choice,scope,f.count,f.length].includes(p.parameter_id)?'OBJECT_FACT':'ADVANCED_OPTION'},
      guide:{...p.truth_metadata.guide as object,
        guide_short_ru:p.parameter_id === f.length
          ? 'Укажите длину одного прямого непрерывного угла. Этот вариант охватывает только длины больше 1500 мм и не больше 3000 мм; пригодность раскроя подтверждается отдельно.'
          : p.parameter_id === f.stock || p.parameter_id === f.reserve
            ? 'Только пригодные целые профили Protektor 1007Z, артикул 105922, длина 3 м. Старый общий запас и остатки раскроя автоматически не переносятся. Если неизвестно, оставьте пустым.'
            : p.parameter_id === f.multiple
              ? 'Укажите подтверждённую кратность поставщика в заводских пачках по 25 профилей. Это не паллеты. Значение 1 не подставляется автоматически.'
              : `${p.title_ru}: укажите подтверждённый факт. Неизвестное не заменяется нулём или выбранным товаром.`}}});
  const resources = built.resources.map(r=>{
    const info = pack.informationRows.find(item=>pack.prefix+':'+item.suffix === r.row_id);
    const formula = built.formulas.find(item=>item.formula_id === r.formula_id)!;
    const {row_sha256:_oldHash,...body} = r;
    const next = {...body,
      inclusion_ast:{kind:'and',operands:[knaufProtektor105922OriginalScopeR1,r.inclusion_ast]},
      resource_graph:{...r.resource_graph,
        ...(info ? {derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',
          mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:formula.input_parameter_ids,
          reasonRu:'Измените исходные размеры, целые профили, заказ или условия поставки. Расчётную строку нельзя заменять ручным количеством.'}} : {}),
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
          sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
          detailsRu:info?[info.detailRu]:pack.publicOwnerDetailsRu}},
      source_metadata:{...r.source_metadata,sourceRole:'SOURCE_PRODUCT_GEOMETRY_PENDING_REGISTRY',
        sourceNormQuantityAccepted:false,full_technical_acceptance:false,sourceRegistryLocatorId:null,
        normativeTrace:[],sourceEvidence:pack.sources.map(s=>({sourceArtifactId:s.sourceArtifactId,
          sha256:s.sha256,exactLocator:s.exactLocator})),
        geometrySourceContract:pack.contract,newLabourHours:0,savedRevisionMigration:false}};
    return {...next,row_sha256:estimateDeterministicHash(next)};
  });
  return {...built,parameters,resources};
}
