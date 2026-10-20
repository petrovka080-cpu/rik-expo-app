import fixture from '../../../../data/estimate-benchmarks/fixtures/facade-ceresit-ct190-kz-material-subworks-r1.json';
import {facadeMineralWoolOperationCompositionR2,facadeMineralWoolOperationsR2} from './facadeMineralWoolOperationCompositionR2';
import {facadeCeresitCt190SuccessorDefinitionR1,facadeCeresitCt190PackR1 as pack,
 facadeCeresitCt190ChoiceParameterR1 as choice} from './facadeCeresitCt190MaterialSubworksR1';
import {FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT as oldFacts} from './facadeMineralWoolInstallationR1';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections,
 canonicalEstimateWorkProcess} from '../backendPlatform/canonicalEstimateOperationComposition';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildCanonicalProfessionalPdfProjection} from '../backendPlatform/canonicalProfessionalPdf';
import {canonicalPublicResourceRowKindV1,parseCanonicalPublicResourcePresentationV1,canonicalPublicResourceDisplayPresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import publicBindings from '../../../../data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json';
import {canonicalArtifactVisibleRowTitle,canonicalArtifactPreliminaryNeeds,type CanonicalArtifactRevision} from '../backendPlatform/canonicalEstimateArtifactContract';
import {consumerRepairRowIsTechnicalDetail,consumerRepairRowProcessNote,registerConsumerRepairRowVerifiedPresentation} from '../../../features/consumerRepair/consumerRepairRowMetadata';
import {floorConcreteUnderlayerDefinitionR1 as concreteDefinition,floorConcreteUnderlayerPackR1 as concretePack,
 floorConcreteUnderlayerScenarioFactsR1 as concreteFacts} from './floorConcreteUnderlayerKrer11Column09R1';
import {floorCementScreed20mmDefinitionR1 as screedDefinition,floorCementScreed20mmPackR1 as screedPack,
 floorCementScreed20mmScenarioFactsR1 as screedFacts} from './floorCementScreed20mmKrer11Column01R1';
import {floorConcreteSimplePresentationR2,floorScreed20mmSimplePresentationR2} from './floorSimpleResourcePresentationR2';

const old=facadeCeresitCt190SuccessorDefinitionR1(),next=facadeMineralWoolOperationCompositionR2();
const ct=pack.prefix+':dry-mix-order',labour='rc09:facade_mineral_wool_install';
const facts={...oldFacts,...fixture.facts,[choice]:pack.selectedValueRu};
const compile=(d:AutomaticOwnerDefinition,parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>compileCanonicalEstimateCore({
 operation:'recalculate',catalogId:pack.catalogId,compilerVersion:'facade-operation-composition-r2',primaryMeasureParameterId:'area_m2',
 parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
 submittedParameters:parameters,confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,
 hashJson:async value=>estimateDeterministicHash(value)});
const provenance={kind:'manual' as const,reason:'Explicit acceptance example, not an actual project offer'};
function artifactRevision(result:Awaited<ReturnType<typeof compile>>):CanonicalArtifactRevision {
 return {id:'test-facade',release_id:'test-release',catalog_id:pack.catalogId,checksum_sha256:estimateDeterministicHash(result),
  row_count:result.rows.length,input_parameters:result.parameters,totals:result.totals,currency_code:'KGS',
  amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
}

it('retains every existing parameter, formula, resource identity, inclusion, quantity unit and cost owner',()=>{
 expect(next.parameters).toEqual(old.parameters);expect(next.formulas).toEqual(old.formulas);
 expect(next.resources).toHaveLength(29);
 next.resources.forEach((row,index)=>{
  const prior=old.resources[index]!;
  const {resource_graph:graph,row_sha256:_hash,...values}=row;
  const {resource_graph:oldGraph,row_sha256:_oldHash,...oldValues}=prior;
  expect(values).toEqual(oldValues);
  const {operationCompositionV1:_operation,operationCostBoundaryNoteRu:_boundary,publicResourcePresentationV1:_presentation,...unchanged}=graph;
  const {operationCompositionV1:_previousOperation,publicResourcePresentationV1:_oldPresentation,...previousUnchanged}=oldGraph;
  expect(unchanged).toEqual(previousUnchanged);
 });
});

it('assigns all old and new resources to actual execution steps, with no general flat remainder',()=>{
 const input=next.resources.map(row=>({rowId:row.row_id,titleRu:row.title_ru,operation:row.resource_graph.operationCompositionV1}));
 const sections=canonicalEstimateResourceOperationSections(input);
 expect(sections).toHaveLength(7);expect(sections.every(section=>section.operation?.processRole==='PROCESS')).toBe(true);
 expect(sections.map(section=>section.operation!.operationTitleRu)).toEqual(facadeMineralWoolOperationsR2.map(step=>step.title));
 expect(sections.flatMap(section=>section.resourceIds).sort()).toEqual(next.resources.map(row=>row.row_id).sort());
 for(const row of next.resources)expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).length).toBeGreaterThan(0);
 expect(sections.find(section=>section.operation!.operationId.endsWith(':mechanical-fixing'))!.resourceIds).toContain('rc09:facade_disc_dowel_200mm_metal_pin');
 expect(sections.find(section=>section.operation!.operationId.endsWith(':handling'))!.resourceIds).toContain('rc09:facade_insulation_lift');
 expect(sections.find(section=>section.operation!.operationId.endsWith(':preparation'))!.resourceIds).toContain('rc09:facade_insulation_pullout_control');
});

it('links shared mix, water, tools, lift and existing montage labour without copying paid resource rows',()=>{
 const sections=canonicalEstimateResourceOperationSections(next.resources.map(row=>({rowId:row.row_id,titleRu:row.title_ru,operation:row.resource_graph.operationCompositionV1})));
 for(const id of [ct,labour,'rc09:facade_insulation_lift',pack.prefix+':water-used',pack.prefix+':open-mixing-tools']){
  expect(sections.filter(section=>section.resourceIds.includes(id))).toHaveLength(1);
  expect(sections.some(section=>section.sharedResources.some(shared=>shared.rowId===id))).toBe(true);
 }
 expect(next.resources.filter(row=>row.row_id===ct)).toHaveLength(1);
 expect(next.resources.find(row=>row.row_id===labour)!.resource_graph.operationCostBoundaryNoteRu).toContain('повторное начисление запрещено');
});

it('does not resurrect optional starter/fire stages through shared labour or lift when their physical resource is absent',async()=>{
 const result=await compile(next,facts);
 const ids=new Set([...result.rows,...result.preliminaryNeeds].map(row=>row.row_id));
 const visible=next.resources.filter(row=>ids.has(row.row_id)).map(row=>({rowId:row.row_id,titleRu:row.title_ru,operation:row.resource_graph.operationCompositionV1}));
 expect(ids.has('rc09:facade_start_profile')).toBe(false);expect(ids.has('rc09:mineral_wool_fire_barrier_lamella')).toBe(false);
 const sections=canonicalEstimateResourceOperationSections(visible);
 expect(sections.some(section=>section.operation?.operationId.endsWith(':start-profile')||section.operation?.operationId.endsWith(':fire-barrier'))).toBe(false);
 expect(canonicalEstimateWorkProcess(visible).flatMap(group=>group.operations).some(operation=>operation.operationId.endsWith(':fire-barrier'))).toBe(false);
 expect(sections.every(section=>section.operation!==null)).toBe(true);
});

it.each([
 ['selected100',facts,{[ct]:{unitPrice:'77',provenance}},'84700'],
 ['selected120',{...facts,ct190_base_layer_area_m2:'120'},{[ct]:{unitPrice:'77',provenance}},'92400'],
 ['selectedExcluded',facts,{[ct]:{unitPrice:'77',provenance,includedInEstimate:false,includedInProcurement:false}},'0'],
 ['legacyManual',{...oldFacts,[choice]:pack.legacyValueRu},{'rc09:facade_mineral_wool_adhesive':{quantity:'77',unitPrice:'2',provenance,titleRu:'Saved manual adhesive'}},'154'],
] as const)('keeps actual compiler amounts and saved edits for %s',async(_name,parameters,overrides,amount)=>{
 const before=await compile(old,parameters,overrides),after=await compile(next,parameters,overrides);
 const monetary=(rows:typeof after.rows)=>rows.map(row=>({id:row.row_id,quantity:row.quantity,unit:row.unit_id,price:row.unit_price,amount:row.amount,
  included:row.included_in_estimate,procurement:row.included_in_procurement,title:row.title_ru}));
 expect(after.totals.amount).toBe(amount);expect(after.totals).toEqual(before.totals);expect(monetary(after.rows)).toEqual(monetary(before.rows));
 expect(after.preliminaryNeeds.map(row=>row.row_id)).toEqual(before.preliminaryNeeds.map(row=>row.row_id));
});

it('ignores malformed conditional shared references rather than showing an unrelated optional operation',()=>{
 const row=next.resources.find(row=>row.row_id===labour)!;
 const primary=canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1)[0]!;
 expect(canonicalEstimateOperationReferences({...primary,additionalOperations:[{...primary,operationId:'bad',whenResourcePresent:[]}]})).toHaveLength(1);
});

it('resolves a conditional shared operation by source identity when Android rows have presentation ids',()=>{
 const rows=next.resources.map(row=>({rowId:'ui:'+row.row_id,sourceRowId:row.row_id,titleRu:row.title_ru,operation:row.resource_graph.operationCompositionV1}));
 const sections=canonicalEstimateResourceOperationSections(rows);
 expect(sections.find(section=>section.operation?.operationId.endsWith(':start-profile'))?.sharedResources.some(row=>row.rowId==='ui:'+labour)).toBe(true);
 expect(canonicalEstimateWorkProcess(rows).flatMap(group=>group.operations).some(operation=>operation.operationId.endsWith(':fire-barrier'))).toBe(true);
});

it('prints simple subworks with their real resources; counters are absent and process conditions are notes',async()=>{
 const result=await compile(next,facts,{[ct]:{unitPrice:'77',provenance}});
 const before=JSON.stringify(result);
 const revision=artifactRevision(result);
 const projection=buildCanonicalProfessionalPdfProjection({revision,
  rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:'Утепление фасада'});
 const table=projection.html.split('<table class="client">')[1]!.split('</table>')[0]!;
 for(const title of ['Общий предварительный расход','Мешки CT 190 к заказу','Остаток CT 190 после работы',
  'Свободный остаток','Недостающее количество','Непокрытый резерв','Нижняя граница воды','Верхняя граница воды',
  'Уточнение времени использования смеси'])expect(table).not.toContain(title);
 for(const name of ['Приклеить плиты утеплителя 120 мм','Клей Ceresit CT 190 для утеплителя, мешок 25 кг',
  'Вода для приготовления клея','Фасадная стеклосетка','Работа по нанесению защитного слоя'])expect(table).toContain(name);
 expect(table).toContain('Примечание: Перед работой уточнить допустимое время использования приготовленного клея.');
 expect(table).not.toContain('<strong>Работа по приклеиванию утеплителя</strong>');
 expect(table).toContain('Повторно эту работу не начислять.');
 expect(table).not.toContain('Подготовка основания и защита фасада — общий ресурс');
 expect(table).toContain('Инструмент</td>');
 expect(table).not.toContain('Работы и ресурсы сметы');expect(projection.categoryTotals.material).toBe(84700);
 expect(JSON.stringify(result)).toBe(before);
 const attachment=table.indexOf('Приклеить плиты утеплителя 120 мм'),base=table.indexOf('Нанести защитный слой со стеклосеткой');
 expect(table.indexOf('Клей Ceresit CT 190 для утеплителя, мешок 25 кг')).toBeGreaterThan(attachment);
 expect(table.indexOf('Фасадная стеклосетка')).toBeGreaterThan(base);
});

it('uses the same authored names and roles in the editor, saved revision and artifact projections',async()=>{
 const result=await compile(next,facts);
 for(const row of [...result.rows,...result.preliminaryNeeds]){
  const graph=(row.calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph;
  const descriptor=parseCanonicalPublicResourcePresentationV1(graph.publicResourcePresentationV1)!;
  expect(descriptor).not.toBeNull();
  const item={id:String(row.row_id),titleRu:String(row.title_ru),quantity:row.quantity==null?null:Number(row.quantity),unitPrice:null,
   sourceParameters:{canonicalCostTreatment:graph.costTreatment,canonicalPreliminaryNeed:'need_sha256'in row,
    includedInEstimate:row.included_in_estimate,includedInProcurement:row.included_in_procurement}};
  registerConsumerRepairRowVerifiedPresentation(item,descriptor,descriptor);
  if(descriptor.rowKind==='CALCULATION_DETAIL')expect(consumerRepairRowIsTechnicalDetail(item)).toBe(true);
  if(descriptor.rowKind==='PROCESS_NOTE'){
   expect(consumerRepairRowIsTechnicalDetail(item)).toBe(false);expect(consumerRepairRowProcessNote(item)).toBe(descriptor.detailsRu.join(' '));
  }
  expect(canonicalArtifactVisibleRowTitle(row)).toBe(descriptor.nameRu);
 }
});

it('cannot hide a paid, purchased, manually renamed or stale physical resource using a display role',()=>{
 const descriptor={contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:'Материал',
  nameRu:'Материал',brandAndModelRu:null,specificationRu:null,detailsRu:[],rowKind:'CALCULATION_DETAIL'};
 const input={titleRu:'Материал',descriptor,costTreatment:'INFORMATIONAL_SCOPE'};
 expect(canonicalPublicResourceRowKindV1(input)).toBe('CALCULATION_DETAIL');
 for(const override of [{includedInEstimate:true},{includedInProcurement:true},{unitPrice:'0'},{amount:'0'},
  {costTreatment:'OWN_COST'},{manualTitleOverride:true},{titleRu:'Другой материал'},
  {descriptor:{...descriptor,rowKind:'HIDE'}}])expect(canonicalPublicResourceRowKindV1({...input,...override})).toBe('RESOURCE');
 expect(parseCanonicalPublicResourcePresentationV1({...descriptor,rowKind:null})).toBeNull();
 for(const changed of [{unitPrice:0},{sourceParameters:{canonicalCostTreatment:'INFORMATIONAL_SCOPE',includedInEstimate:true}},
  {sourceParameters:{canonicalCostTreatment:'INFORMATIONAL_SCOPE',includedInProcurement:true}},
  {sourceParameters:{canonicalCostTreatment:'INFORMATIONAL_SCOPE',canonicalManualTitleOverride:true}}]){
  const item={id:'test',titleRu:'Материал',quantity:1,sourceParameters:{canonicalCostTreatment:'INFORMATIONAL_SCOPE'},...changed};
  registerConsumerRepairRowVerifiedPresentation(item,parseCanonicalPublicResourcePresentationV1(descriptor));
  expect(consumerRepairRowIsTechnicalDetail(item)).toBe(false);
 }
});

it('also repairs names and disclosure roles for existing saved facade and floor rows without changing their raw descriptors',()=>{
 const sources=[old,concreteDefinition(),screedDefinition()],successors=[next,floorConcreteSimplePresentationR2(),floorScreed20mmSimplePresentationR2()];
 expect(publicBindings.bindings.filter(binding=>sources.some(source=>source.resources.some(row=>row.row_id===binding.rowId)))).toHaveLength(118);
 sources.forEach((definition,index)=>definition.resources.forEach(resource=>{
  const before=JSON.stringify(resource),descriptor=resource.resource_graph.publicResourcePresentationV1;
  const expected=parseCanonicalPublicResourcePresentationV1(successors[index]!.resources.find(row=>row.row_id===resource.row_id)!.resource_graph.publicResourcePresentationV1)!;
  const input={rowId:resource.row_id,titleRu:resource.title_ru,descriptor};
  const display=canonicalPublicResourceDisplayPresentationV1(input);
  expect(display?.nameRu).toBe(expected.nameRu);expect(display?.rowKind).toBe(expected.rowKind);
  expect(canonicalPublicResourceDisplayPresentationV1({...input,manualTitleOverride:true})).toBeNull();
  expect(canonicalPublicResourceDisplayPresentationV1({...input,titleRu:'Другой материал',descriptor:null})).toBeNull();
  expect(JSON.stringify(resource)).toBe(before);
 }));
});

it.each([
 ['Бетонная подстилка',floorConcreteSimplePresentationR2,concreteDefinition,concretePack,concreteFacts('10')],
 ['Цементная стяжка',floorScreed20mmSimplePresentationR2,screedDefinition,screedPack,screedFacts('100')],
] as const)('removes balance and duplicate machine counters from the actual %s PDF while retaining every physical resource',async(title,build,previous,source,parameters)=>{
 const d=build(),before=JSON.stringify(d);
 const result=await compileCanonicalEstimateCore({operation:'compile',catalogId:source.proposedIdentity.catalogId,
  compilerVersion:'cross-estimate-public-view-r2',primaryMeasureParameterId:source.measurement.parameterId,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:parameters,confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
 const revision={...artifactRevision(result),catalog_id:source.proposedIdentity.catalogId};
 const projection=buildCanonicalProfessionalPdfProjection({revision,
  rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:title});
 const table=projection.html.split('<table class="client">')[1]!.split('</table>')[0]!;
 expect(table).not.toMatch(/exact source-compatible|supplier offer|CONTROL_ONLY/u);
 for(const counter of ['Нормативный расход:','Нормативная работа','Свободный остаток','Непокрытый резерв',
  'Единицы кратности заказа','Пригодное наличие:','Кратность поставки:'])expect(table).not.toContain(counter);
 for(const material of source.materials)expect(table).toContain(material.id==='bitumen-latex-mastic'?'Битумно-латексная мастика':material.titleRu);
 expect(table).toContain('Примечание: Уточнить состав цены техники');
 expect(table).not.toContain('Состав ставок механизмов и учёт труда оператора');
 expect(table).not.toContain('Уточнить дополнительные детали пола');
 const old=previous();expect(d.parameters).toEqual(old.parameters);expect(d.formulas).toEqual(old.formulas);
 for(const row of d.resources){
  const prior=old.resources.find(r=>r.row_id===row.row_id)!;
  const {resource_graph:_graph,row_sha256:_hash,...values}=row;
  const {resource_graph:_oldGraph,row_sha256:_oldHash,...oldValues}=prior;
  expect(values).toEqual(oldValues);
 }
 expect(JSON.stringify(d)).toBe(before);
});

