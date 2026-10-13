import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from './canonicalEstimateCompileCore';
import {canonicalOperationSelectionKeyV1, parseCanonicalCompositionSelectionV1, assertCanonicalCompositionSelectionReleaseMigrationV1,planCanonicalCompositionSelectionV1,canonicalCompositionOperationMigrationBindingsV1 as operationBindings,canonicalCompositionSelectionCanMigrateWithBindingsV1 as canMigrate} from './canonicalEstimateCompositionSelectionV1';
import {canonicalManualExclusionMigrationBindings as rowBindings} from './canonicalManualPriceReleaseMigration';
import {buildAutomaticConstructionOwnerR1} from '../v4/automaticConstructionOwnerR1';
import {compileFormulaGraph} from './formulaGraph';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalEstimateOperationReference, canonicalEstimateResourceOperationSections} from './canonicalEstimateOperationComposition';
import {canonicalUserCommandSemanticPayloadV1} from './canonicalUserCommandIntentV1';

/** Arithmetic control only: these rates are not admitted construction norms. */
function fixture(aggregation: 'SUM'|'MAX'='SUM'): CanonicalEstimateCompileCoreInput {
  const expressions=['q*0.0009','p*0.0004'];
  const def=buildAutomaticConstructionOwnerR1({contract:'composition-test',semanticOwner:'test',sourceId:'SYNTHETIC',normId:'NOT_A_NORM',
    sourceMetadata:{source_title:'Synthetic arithmetic control',source_document_version:'test',definition_hash:'a'.repeat(64),exact_locator:'test',artifact_sha256:'a'.repeat(64)},
    applicabilityRu:'Synthetic control only',ordinary:['q','p'].map(id=>({id,title:id,kind:'ordinary',valueType:'decimal',unitId:'m2',min:0})),
    profile:[],conditional:[],deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:[],rows:[
      {rowId:'truck',formulaId:'total',section:'Equipment',category:'equipment',title:'Shared truck',unitId:'machine_hour',
        expression:aggregation==='SUM'?expressions.join('+'):`max(${expressions.join(',')})`,costTreatment:'OWN_COST',
        effectiveQuantityOutput:{parameterId:'active_hours',unitId:'machine_hour'}},
      {rowId:'counter',formulaId:'counter',section:'Control',category:'equipment',title:'Dependent physical counter',unitId:'machine_hour',expression:'active_hours',costTreatment:'INFORMATIONAL_SCOPE'},
    ]});
  const operation={contractVersion:'canonical-operation-resource/v1' as const,groupId:'roof',groupTitleRu:'Roof',operationId:'field',operationTitleRu:'Field',completionCriterionRu:'Field done'};
  const primer={...operation,operationId:'primer',operationTitleRu:'Primer'};
  const resources=structuredClone([...def.resources]);
  resources[0]!.resource_graph.operationCompositionV1={...operation,additionalOperations:[primer]};
  resources[0]!.resource_graph.operationQuantityContributionsV1={contractVersion:'canonical-operation-quantity-contributions/v1',aggregation,
    contributions:[{operationKey:canonicalOperationSelectionKeyV1(operation),formulaId:'field_part'},
      {operationKey:canonicalOperationSelectionKeyV1(primer),formulaId:'primer_part'}],sourceEvidence:[{sha256:'a'.repeat(64),locator:'Synthetic test, not a norm'}]};
  const formulas=[...def.formulas,...expressions.map((source,i)=>{
    const graph=compileFormulaGraph(source);return {...def.formulas[0]!,formula_id:i===0?'field_part':'primer_part',ast:graph.ast,
      input_parameter_ids:graph.inputParameterIds,ast_sha256:estimateDeterministicHash(graph.ast)};
  })];
  return {operation:'recalculate',compilerVersion:'test',catalogId:'TEST',primaryMeasureParameterId:'q',
    parameterDefinitions:[...def.parameters],resourceDefinitions:resources,formulaDefinitions:formulas,
    submittedParameters:{q:'40',p:'40'},confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:10,hashJson:estimateDeterministicHash,
    rowOverrides:{truck:{unitPrice:'100',titleRu:'Saved manual name',provenance:{kind:'manual'}}}};
}
const selection=(ops:string[]=[],rows:string[]=[])=>({contractVersion:'canonical-estimate-composition-selection/v1' as const,excludedOperationKeys:ops,excludedRowIds:rows});
const row=(r:Awaited<ReturnType<typeof compileCanonicalEstimateCore>>,id:string)=>r.rows.find(row=>row.row_id===id)!;

test('SUM keeps active shared contributions and dependent output; restore uses current area and preserved manual price/name',async()=>{
  const input=fixture(),before=JSON.stringify(input),first=await compileCanonicalEstimateCore(input);
  expect(row(first,'truck')).toMatchObject({quantity:'0.052',unit_price:'100',title_ru:'Saved manual name'});
  const excluded=await compileCanonicalEstimateCore({...input,compositionSelectionV1:selection(['["roof","primer"]'])});
  expect(row(excluded,'truck').quantity).toBe('0.036');expect(row(excluded,'counter').quantity).toBe('0.036');
  expect(excluded.totals.amount).toBe('3.6');expect(excluded.derivedParameters.active_hours).toBe('0.036');
  const restored=await compileCanonicalEstimateCore({...input,submittedParameters:{q:'60',p:'60'},compositionSelectionV1:selection()});
  expect(row(restored,'truck')).toMatchObject({quantity:'0.078',unit_price:'100',title_ru:'Saved manual name'});
  expect(restored.totals.amount).toBe('7.8');expect(JSON.stringify(input)).toBe(before);
});

test('MAX does not sum overlapping tasks; the remaining owner is presented once',async()=>{
  const input=fixture('MAX'),result=await compileCanonicalEstimateCore({...input,compositionSelectionV1:selection(['["roof","field"]'])});
  expect(row(result,'truck').quantity).toBe('0.016');
  expect(canonicalEstimateOperationReference((row(result,'truck').calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph.operationCompositionV1)?.operationId).toBe('primer');
  expect(result.rows.filter(row=>row.included_in_estimate)).toHaveLength(1);
});

test('physical exclusion zeros dependencies; cost-only exclusion preserves physically available quantities',async()=>{
  const input=fixture(),physical=await compileCanonicalEstimateCore({...input,compositionSelectionV1:selection([],['truck'])});
  expect(row(physical,'truck')).toMatchObject({quantity:'0',unit_price:'100',included_in_estimate:false,included_in_procurement:false});
  expect(row(physical,'counter').quantity).toBe('0');expect(physical.totals.amount).toBe('0');
  const cost=await compileCanonicalEstimateCore({...input,rowOverrides:{truck:{includedInEstimate:false,provenance:{kind:'manual'}}}});
  expect(row(cost,'truck').quantity).toBe('0.052');expect(row(cost,'counter').quantity).toBe('0.052');
});

test('excluded contribution needs no unused geometry; unknown active geometry remains unresolved',async()=>{
  const input=fixture(),result=await compileCanonicalEstimateCore({...input,submittedParameters:{q:'40'},compositionSelectionV1:selection(['["roof","primer"]'])});
  expect(row(result,'truck').quantity).toBe('0.036');
  const unknown=await compileCanonicalEstimateCore({...input,submittedParameters:{p:'40'},compositionSelectionV1:selection(['["roof","primer"]'])});
  expect(unknown.preliminaryNeeds.find(need=>need.row_id==='truck')?.missing_parameter_ids).toContain('q');
});

test('unproved partition, duplicate scopes, changed units and unknown row identities fail closed',async()=>{
  expect(()=>parseCanonicalCompositionSelectionV1(selection([],['truck','truck']))).toThrow();
  await expect(compileCanonicalEstimateCore({...fixture(),compositionSelectionV1:selection([],['missing'])})).rejects.toMatchObject({code:'COMPOSITION_SELECTION_INVALID'});
  for(const mutate of [(input:CanonicalEstimateCompileCoreInput)=>delete input.resourceDefinitions[0]!.resource_graph.operationQuantityContributionsV1,
    (input:CanonicalEstimateCompileCoreInput)=>input.formulaDefinitions.find(formula=>formula.formula_id==='primer_part')!.output_unit_id='kg',
    (input:CanonicalEstimateCompileCoreInput)=>input.formulaDefinitions.find(formula=>formula.formula_id==='primer_part')!.ast={kind:'literal',value:'100'}]) {
    const input=fixture();mutate(input);
    await expect(compileCanonicalEstimateCore({...input,compositionSelectionV1:selection(['["roof","primer"]'])})).rejects.toBeDefined();
  }
});

test('manual shared quantity cannot silently survive a partial exclusion; name and price remain preserved by the original request',async()=>{
  const input=fixture();input.rowOverrides!.truck!.quantity='0.052';const before=JSON.stringify(input);
  await expect(compileCanonicalEstimateCore({...input,compositionSelectionV1:selection(['["roof","primer"]'])}))
    .rejects.toMatchObject({code:'COMPOSITION_MANUAL_QUANTITY_REVIEW_REQUIRED'});
  expect(JSON.stringify(input)).toBe(before);
});

test('excluded operations remain accessible when the shared resource owner moves to the other active stage',async()=>{
  const input=fixture(),result=await compileCanonicalEstimateCore({...input,compositionSelectionV1:selection(['["roof","field"]'])});
  const truck=row(result,'truck'),graph=(truck.calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph;
  const sections=canonicalEstimateResourceOperationSections([{rowId:'truck',titleRu:String(truck.title_ru),operation:graph.operationCompositionV1,
    sourceOperation:graph.originalOperationCompositionV1,excludedOperationKeys:['["roof","field"]']}]);
  expect(sections.find(section=>section.operation?.operationId==='field')).toMatchObject({physicallyExcluded:true,resourceIds:[]});
  expect(sections.find(section=>section.operation?.operationId==='primer')?.resourceIds).toEqual(['truck']);
});

test('physical exclusion and restoration of custom resources retain their manual input and price, including an originally unknown quantity',async()=>{
  const input=fixture();input.customRows=[{clientRowId:'extra',section:'Materials',category:'material',titleRu:'Manual resource',unitId:'kg',
    quantity:null,unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance:{kind:'manual'}}];
  const excluded=await compileCanonicalEstimateCore({...input,compositionSelectionV1:selection([],['manual:extra'])});
  expect(row(excluded,'manual:extra')).toMatchObject({quantity:'0',unit_price:'77',included_in_estimate:false});
  const restored=await compileCanonicalEstimateCore({...input,compositionSelectionV1:selection()});
  expect(restored.preliminaryNeeds.find(need=>need.row_id==='manual:extra')).toMatchObject({quantity:null,unit_price:'77'});
});

test('migration checks source/applicability/units and complete operation membership instead of just stable row IDs',()=>{
  const input=fixture(),from={resources:input.resourceDefinitions,formulas:input.formulaDefinitions,parameters:input.parameterDefinitions};
  expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection:selection(['["roof","primer"]']),from,to:structuredClone(from)})).not.toThrow();
  for(const mutate of [(to:typeof from)=>to.resources[0]!.unit_id='kg',
    (to:typeof from)=>to.resources[0]!.inclusion_ast={kind:'literal',value:false},
    (to:typeof from)=>to.resources[0]!.resource_graph.operationCompositionV1={...(to.resources[0]!.resource_graph.operationCompositionV1 as Record<string,unknown>),additionalOperations:[]}]) {
    const to=structuredClone(from);mutate(to);
    expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection:selection(['["roof","primer"]']),from,to}))
      .toThrow(expect.objectContaining({code:'COMPOSITION_SELECTION_MIGRATION_REVIEW_REQUIRED'}));
  }
});

test('command semantic identity distinguishes omitted, cleared and different exclusions, and normalizes order',()=>{
  expect(canonicalUserCommandSemanticPayloadV1({})).not.toEqual(canonicalUserCommandSemanticPayloadV1({compositionSelectionV1:null}));
  expect(canonicalUserCommandSemanticPayloadV1({compositionSelectionV1:selection([],['one'])}))
    .not.toEqual(canonicalUserCommandSemanticPayloadV1({compositionSelectionV1:selection([],['two'])}));
  expect(canonicalUserCommandSemanticPayloadV1({compositionSelectionV1:selection([],['two','one'])}))
    .toEqual(canonicalUserCommandSemanticPayloadV1({compositionSelectionV1:selection([],['one','two'])}));
});

test('projected operation proof covers every shared/reference member, unit and source; missing evidence stays blocked',()=>{
  const input=fixture(),from={resources:input.resourceDefinitions,formulas:input.formulaDefinitions,parameters:input.parameterDefinitions};
  const accepted=(to:typeof from,selected=selection(['["roof","primer"]']))=>canMigrate({selection:selected,
    fromRows:rowBindings(from),toRows:rowBindings(to),fromOperations:operationBindings(from),toOperations:operationBindings(to)});
  expect(accepted(structuredClone(from))).toBe(true);
  for(const change of [(to:typeof from)=>to.resources[0]!.unit_id='kg',
    (to:typeof from)=>to.resources[0]!.source_metadata={...to.resources[0]!.source_metadata,changedPrimarySource:true},
    (to:typeof from)=>to.resources[0]!.resource_graph.operationCompositionV1={...(to.resources[0]!.resource_graph.operationCompositionV1 as Record<string,unknown>),additionalOperations:[]}]){
    const to=structuredClone(from);change(to);expect(accepted(to)).toBe(false);
  }
  expect(accepted(from,selection(['["roof","missing"]']))).toBe(false);
  expect(accepted(from,selection([],['missing']))).toBe(false);
  expect(canMigrate({selection:selection()})).toBe(false);
});

test('source guard follows actual operation ownership, including a primary PROCESS with a REFERENCE_ONLY companion',()=>{
  const input=fixture(),resource=input.resourceDefinitions[1]!;
  resource.resource_graph.scopeRequirementV1={contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE'};
  resource.resource_graph.operationCompositionV1={contractVersion:'canonical-operation-resource/v1',groupId:'scope',groupTitleRu:'Scope',operationId:'check',operationTitleRu:'Check',completionCriterionRu:'Verified',processRole:'PROCESS',additionalOperations:[{operationId:'reference',operationTitleRu:'Reference',completionCriterionRu:'Reference only',processRole:'REFERENCE_ONLY'}]};
  const plan=(selected:ReturnType<typeof selection>)=>planCanonicalCompositionSelectionV1({selection:selected,resources:input.resourceDefinitions,formulas:input.formulaDefinitions});
  expect(()=>plan(selection(['["scope","check"]']))).toThrow(expect.objectContaining({code:'COMPOSITION_SELECTION_INVALID'}));
  expect(()=>plan(selection([],['counter']))).toThrow(expect.objectContaining({code:'COMPOSITION_SELECTION_INVALID'}));
  expect(plan(selection(['["scope","reference"]'])).decision('counter').excluded).toBe(false);
  expect(plan(selection(['["scope","reference"]'])).operationsExcludeRow('counter')).toBe(false);
  // A genuinely allocated shared check may retain an active owner; removing
  // every source-backed contribution must still fail closed.
  input.resourceDefinitions[0]!.resource_graph.scopeRequirementV1={contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE'};
  expect(plan(selection(['["roof","field"]'])).decision('truck').excluded).toBe(false);
  expect(plan(selection(['["roof","field"]'])).operationsExcludeRow('truck')).toBe(false);
  expect(()=>plan(selection(['["roof","field"]','["roof","primer"]']))).toThrow(expect.objectContaining({code:'COMPOSITION_SELECTION_INVALID'}));
});
test('operation exclusion remains observable with an independent saved row exclusion',()=>{
 const input=fixture(),plan=planCanonicalCompositionSelectionV1({selection:selection(['["roof","field"]','["roof","primer"]'],['truck']),resources:input.resourceDefinitions,formulas:input.formulaDefinitions});
 expect(plan.decision('truck').excludedBy).toBe('ROW');expect(plan.operationsExcludeRow('truck')).toBe(true);
 expect(plan.selection?.excludedRowIds).toContain('truck');
});
