// WORK quantity candidate. No registered consumer binding or machine-price admission.
import pack from '../../../../data/estimate-benchmarks/source-packs/hydrotest-internal-steel-dn50-krer16-005-01-r1.json';
import {
  buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
  type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec,
} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1, effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const hydrotestSteelPackR1 = pack;
export const hydrotestSteelPrefixR1 = pack.prefix;
const prefix = pack.prefix, length = pack.primaryMeasureParameterId;
const rowId = (id:string) => prefix + ':' + id;
const positiveLength = {kind:'greater_than' as const, parameterId:length, value:0};
const gapParameter = (id:string) => 'hydro_open_' + id.replaceAll('-', '_');

/** Source quantities are useful before a registered consumer is chosen. This
 * factory does not approve a point-to-metre conversion or a new catalog ID. */
export function hydrotestSteelDefinitionR1():AutomaticOwnerDefinition {
  if (pack.normId !== '16-07-005-01' || pack.catalogBinding !== null || pack.publicationAllowed
      || pack.materials.length !== 4 || pack.operations.length !== 8 || pack.gaps.length !== 6
      || pack.machine.paidPriceOwnerAdmitted || pack.machine.operatorRole !== null
      || pack.machine.operationScope !== null || pack.machine.machinePriceCoverageRequired !== null
      || pack.machine.noAdditionalOperatorNormAdmitted) throw Error('HYDROTEST_WORK_SOURCE_BOUNDARY_REQUIRED');
  const facts = [...pack.scopeFacts, ...pack.projectReferenceFacts, ...pack.projectNumericFacts].map(f=>f.id);
  const conditional:AutomaticParameterSpec[] = [
    ...pack.scopeFacts.map(f=>({id:f.id, title:f.titleRu, valueType:'enum' as const, unitId:null,
      kind:'conditional' as const, values:[f.value], requiredWhen:positiveLength})),
    ...pack.projectReferenceFacts.map(f=>({id:f.id, title:f.titleRu, valueType:'text' as const, unitId:null,
      kind:'conditional' as const, requiredWhen:positiveLength})),
    ...pack.projectNumericFacts.map(f=>({id:f.id, title:f.titleRu, valueType:'decimal' as const, unitId:f.unitId,
      kind:'conditional' as const, min:f.min, ...('max' in f?{max:f.max}:{}), requiredWhen:positiveLength})),
  ];
  const rows:AutomaticRowSpec[] = [];
  const add = (id:string, title:string, category:string, unitId:string, expression:string, extra:Partial<AutomaticRowSpec>={}) => rows.push({
    rowId:rowId(id), formulaId:rowId('formula:'+id), section:pack.titleRu, category, title, unitId, expression,
    procurement:false, inputParameterIds:facts, ...extra,
  });
  add('whole-worker', 'Труд рабочих среднего разряда5,3: весь исходный цикл гидроиспытания', 'labor', 'man_hour', `${length}*5.01/100`);
  // Unknown exact machine coverage resolves to null in the existing generic
  // helper. Keeping this definition non-payable prevents a scalar-price escape.
  add('hydraulic-plant-consumed', pack.machine.titleRu+' — нормативное время, цена пока не допущена',
    'equipment', 'machine_hour', `${length}*1.5/100`, {costTreatment:'INFORMATIONAL_SCOPE'});
  for (const m of pack.materials) {
    const key = m.parameterPrefix, consumedId = m.id+'-consumed';
    const effective = effectiveResourceQuantityParameterId(rowId(consumedId));
    const consumed = m.sourceUnitId === m.orderUnitId ? effective : effective+'*1000';
    if (!(m.sourceUnitId===m.orderUnitId && m.sourceToOrderMultiplier==='1')
        && !(m.sourceUnitId==='t' && m.orderUnitId==='kg' && m.sourceToOrderMultiplier==='1000'))
      throw Error('HYDROTEST_ORDER_UNIT_CONVERSION_NOT_ADMITTED');
    conditional.push({id:key+'_specification', title:'Точная поставочная спецификация: '+m.nameRu,
      valueType:'text', unitId:null, kind:'conditional', requiredWhen:positiveLength});
    for (const [suffix,title,min] of [['stock','Пригодное совместимое наличие',0], ['reserve','Сохраняемый резерв',0],
      ['quantum','Фактическая кратность поставки',0.000000001]] as const)
      conditional.push({id:key+'_'+suffix, title:title+': '+m.nameRu, valueType:'decimal', unitId:m.orderUnitId,
        kind:'conditional', min, requiredWhen:positiveLength});
    conditional.push({id:key+'_stock_reference', title:'Подтверждение совместимости имеющегося материала: '+m.nameRu,
      valueType:'text', unitId:null, kind:'conditional', requiredWhen:{kind:'greater_than',parameterId:key+'_stock',value:0}});
    add(consumedId, 'Нормативный расход: '+m.nameRu, 'material', m.sourceUnitId, `${length}*${m.ratePer100M}/100`, {
      costTreatment:'INFORMATIONAL_SCOPE', effectiveQuantityOutput:{parameterId:effective,unitId:m.sourceUnitId}, purchaseBalanceOwnerRowId:rowId(m.id),
    });
    const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId(m.id), orderUnitId:m.orderUnitId, consumed,
      stock:key+'_stock', reserve:key+'_reserve', quantum:key+'_quantum'});
    add(m.id, m.nameRu, 'material', m.orderUnitId,
      `ceil(max(0,(${consumed})+${key}_reserve-${key}_stock)/${key}_quantum)*${key}_quantum`, {
        ...balance.owner, procurement:true, inputParameterIds:[...facts,key+'_specification',key+'_stock_reference'],
        titleParameterIds:[key+'_specification'],
      });
    for (const [id,title,unit,expression] of [
      ['packages','Партии к заказу','pcs',balance.packages],
      ['remaining','Остаток после нормативного расхода',m.orderUnitId,balance.remaining],
      ['free','Свободный остаток сверх резерва',m.orderUnitId,balance.free],
      ['shortage','Недостаток для нормативного расхода',m.orderUnitId,balance.consumptionShortage],
      ['reserve-deficit','Непокрытый сохраняемый резерв',m.orderUnitId,balance.reserveDeficit],
    ] as const) add(m.id+':'+id, title+': '+m.nameRu, 'material', unit, expression, {
      costTreatment:'INFORMATIONAL_SCOPE', purchaseBalanceOwnerRowId:rowId(m.id),
      ...(['shortage','reserve-deficit'].includes(id)?{inclusion:{kind:'formula_greater_than' as const,expression,unitId:m.orderUnitId,value:0}}:{}),
    });
  }
  for (const o of pack.operations) add(o.id, o.nameRu+' — включено в исходный труд', 'work', 'm', length,
    {costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  // These are application/source obligations, never requests for an invented
  // user quantity or a guessed separate price. Known project facts gate the
  // physical calculation but cannot establish missing application evidence.
  for (const gap of pack.gaps) {
    conditional.push({id:gapParameter(gap.id), title:gap.titleRu, valueType:'decimal', unitId:null, kind:'conditional', min:0});
    add('open:'+gap.id, gap.titleRu, 'service', '', gapParameter(gap.id));
  }
  const base = buildAutomaticConstructionOwnerR1({contract:pack.contract, semanticOwner:prefix, sourceId:pack.sourceId, normId:pack.normId,
    sourceMetadata:{source_title:pack.titleRu, source_document_version:pack.source.edition, definition_hash:pack.source.sha256,
      artifact_sha256:pack.source.sha256, exact_locator:pack.source.locatorRu}, applicabilityRu:pack.scopeRu,
    ordinary:[{id:length,title:'Проектная длина внутреннего стального водопровода с арматурой и фасонными частями по §2.5',
      valueType:'decimal',unitId:'m',kind:'ordinary',min:0.000000001}], profile:[], conditional, rows,
    deferMissingProjectFactsToRows:true, excludedUnownedAssumptions:pack.excludedRu});
  const formulaById = new Map(base.formulas.map(f=>[f.formula_id,f]));
  if (base.resources.length !== pack.expectedDefinitionRows) throw Error('HYDROTEST_EXACT_ROW_COVERAGE_REQUIRED');
  return {...base,
    parameters:base.parameters.map(p=>{
      if (p.parameter_id.startsWith('hydro_open_')) return {...p, truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,
        'Конкретные задача, источник и владелец доказательства заданы source-pack. Ручные0/1, цена или projectreference не заменяют source/application review и не создают дополнительной нормы.')};
      if (p.truth_metadata.visibility_role==='INTERNAL_ONLY') return p;
      const guide = p.truth_metadata.guide as Record<string,unknown>;
      const material = pack.materials.find(m=>p.parameter_id.startsWith(m.parameterPrefix+'_'));
      const numericFact = pack.projectNumericFacts.find(f=>f.id===p.parameter_id);
      return {...p, required:p.parameter_id===length, truth_metadata:{...p.truth_metadata,
        value_source_role:p.parameter_id===length?'USER_INPUT':'PROJECT_SPECIFIC_INPUT', source_confirmation_required:false,
        provenance:{consumer_input_role_v1:p.parameter_id===length?'OBJECT_GEOMETRY':'OBJECT_FACT'},
        guide:{...guide, verified_at:pack.verifiedAt,
          guide_short_ru:numericFact?numericFact.basis:material?.identityGuideRu??guide.guide_short_ru}}};
    }),
    resources:base.resources.map(r=>{
      const key = r.row_id.slice(prefix.length+1), material = pack.materials.find(m=>key===m.id||key===m.id+'-consumed'||key.startsWith(m.id+':'));
      const order = material != null && key===material.id;
      const gap = pack.gaps.find(g=>key==='open:'+g.id), operation = pack.operations.find(o=>key===o.id);
      const physical = key==='whole-worker'||key==='hydraulic-plant-consumed'||Boolean(material&&key===material.id+'-consumed');
      const control = Boolean(material&&!order&&!physical);
      const sourceCode = key==='whole-worker'?pack.labor.sourceCode:key==='hydraulic-plant-consumed'?pack.machine.sourceCode:material?.sourceCode??null;
      const formula = formulaById.get(r.formula_id)!;
      const {row_sha256:_old,...body} = r;
      const value = {...body, cost_owner_id:operation?rowId('whole-worker'):r.cost_owner_id,
        resource_graph:{...r.resource_graph,
          ...(operation?{parentCostOwnerId:rowId('whole-worker'),includedInResourceOwnerRowId:rowId('whole-worker')}:{}),
          ...(!gap&&!order?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',
            unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],
            reasonRu:'Количество исходного расхода, включённой операции или баланса рассчитывается из параметров. Ручной заказ изменяется в отдельной материальной строке.'}}:{}),
          operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
            operationId:prefix+':cycle:'+ (gap?.id??'hydraulic-test'),operationTitleRu:gap?gap.titleRu:pack.titleRu,
            processOrdinal:gap?90:10,completionCriterionRu:gap?'Закрыть конкретное source/application доказательство без выдуманной доплаты.':'Выполнить утверждённую программу испытания; исходный состав005 не доказывает приёмку объекта.'},
          publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
            brandAndModelRu:null,specificationRu:material?.nameRu??null,detailsRu:gap?[gap.sourceOrFactRu,'Владелец: '+gap.missingFactOwnerRu,gap.acceptanceRu]:[
              pack.scopeRu,
              ...(key==='hydraulic-plant-consumed'?[pack.machine.publicPriceBoundaryRu]:[]),
              ...(key==='whole-worker'?['5,01ч на100м — единый труд8 операций. Управление/обслуживание машины не подставляется повторно в этот труд.']:[]),
              ...(material?[material.identityGuideRu,'Нормативный расход не заменяется количеством заказа; наличие, резерв, кратность и пригодность заданы отдельными фактическими параметрами.']:[]),
              ...(operation?['Оплата труда уже в единой строке5,01ч/100м; дополнительные часы, комплекты и их цены не придуманы.']:[]),
            ]}},
        source_metadata:{...r.source_metadata,
          normativeTrace:gap||order||control?[]:((r.source_metadata?.normativeTrace??[]) as Record<string,unknown>[]).map(t=>({...t,sourceRole:'OFFICIAL_NORM'})),
          sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':order?'DERIVED_PURCHASE_BALANCE':control?'DERIVED_PURCHASE_CONTROL':'OFFICIAL_NORM',
          normativeResourceCode:physical?sourceCode:null, exact_column:pack.normId, exact_locator:pack.source.locatorRu,
          source_artifact_sha256:pack.source.sha256, sourceQuantityDenominatorM:100,
          sourceQuantityAccepted:physical, derivedFromSourceResourceCode:material?.sourceCode??null,
          full_technical_acceptance:false, registeredConsumerBindingPending:true,
          ...(key==='hydraulic-plant-consumed'?{machinePriceScopeStatus:'MACHINE_PRICE_SCOPE_PENDING',
            machineCoverageAdmissionPending:true,machinePriceOwnerAdmitted:false,codeSpecificOperatorRole:null,
            codeSpecificOperationScope:null,generalMachineCostBoundarySource:pack.guidance}:{}),
          ...(gap?{missingEvidenceTask:gap.titleRu,missingEvidenceOwner:gap.missingFactOwnerRu,
            missingEvidenceSource:gap.sourceOrFactRu,quantityUnitUnconfirmed:true,extraPaymentNotAssumed:true}:{}),
        }};
      return {...value,row_sha256:estimateDeterministicHash(value)};
    }),
  };
}

export function compileHydrotestSteelR1(catalogId:string,input:Record<string,unknown>) {
  if (catalogId!==pack.workOnlyTestCatalogId) throw Error('HYDROTEST_ACTUAL_CURRENT_CONSUMER_BINDING_REVIEW_REQUIRED');
  return compileAutomaticConstructionOwnerR1({catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:length,
    definition:hydrotestSteelDefinitionR1(),submittedParameters:input});
}

/** Independently transcribed source categories plus declared purchase controls;
 * no global catalog completeness or full technical acceptance claim. */
export function hydrotestSteelCompletenessMapR1() {
  const entry = (id:string,category:string,unitId:string|null,quantityRule:string,specification:string,extra:Record<string,unknown>={}) => ({
    expectedResourceId:pack.normId+':'+id,operationId:'steel-water-hydrotest',category,unitId,quantityRule,specification,
    condition:pack.scopeRu,sourceId:pack.sourceId,formulaId:rowId('formula:'+id),resolution:{kind:'ROW',rowId:rowId(id)},...extra,
  });
  return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
    evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,pack.source.locatorRu,pack.guidance.officialUrl],entries:[
      entry('whole-worker','labor','man_hour','EXACT_OFFICIAL_5_01_PER_100_M','Единый труд всех8 операций, разряд5,3'),
      entry('hydraulic-plant-consumed','equipment','machine_hour','EXACT_OFFICIAL_1_5_PER_100_M_PRICE_PENDING','04-0440: нормативное время сохранено; эксплуатационная цена и кодовая роль не допущены'),
      ...pack.materials.flatMap(m=>[
        entry(m.id+'-consumed','material',m.sourceUnitId,'EXACT_OFFICIAL_RATE_PER_100_M',m.sourceCode+': '+m.ratePer100M+' '+m.sourceUnitId+'/100м'),
        entry(m.id,'material',m.orderUnitId,'DERIVED_PURCHASE_BALANCE_FROM_EXACT_CONSUMPTION_STOCK_RESERVE_QUANTUM',m.nameRu),
        ...pack.materialBalanceControls.map(id=>entry(m.id+':'+id,'material',id==='packages'?'pcs':m.orderUnitId,
          'DERIVED_EFFECTIVE_PURCHASE_BALANCE_CONTROL',m.nameRu+': '+id)),
      ]),
      ...pack.operations.map(o=>entry(o.id,'work','m','INCLUDED_OPERATION_NO_ARBITRARY_LABOR_SPLIT',o.nameRu,
        {resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:rowId(o.id),parentRowId:rowId('whole-worker')}})),
      ...pack.gaps.map(g=>entry('open:'+g.id,'service',null,'SOURCE_APPLICATION_EVIDENCE_REQUIRED_NO_GUESSED_QUANTITY',g.titleRu)),
    ]};
}
