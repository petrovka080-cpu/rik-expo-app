import {createHash as currentC11CryptoHash} from 'node:crypto';
import {resolve as currentC11Resolve} from 'node:path';
import {drywallC11ActualRetainedModelR2 as actualC11Model} from './drywallC11LayeredGeometryR1';
import {prepareC11CurrentPhysicalDraftR2,prepareC11CurrentPhysicalConfigR2} from '../../../../scripts/estimate/r4a13/prepareDrywallC11LayeredGeometryR1';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1 as currentC11Candidate} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainParentBindingsOptInR1 as currentC11RetainedOptIn,prepareMasterRetainedBindingRepresentativeR1 as currentC11RetainedRepresentative} from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
import {canonicalEstimateSavedOperationAcceptanceV1 as currentC11SavedAcceptance} from '../backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import type {CanonicalEstimateCatalogItem as CurrentC11Catalog} from '../backendPlatform/contracts';
import {canonicalEstimateRevisionDetailFromStorage as currentC11SavedMapper} from '../backendPlatform/canonicalEstimateRevisionReadMapper';
import {buildConsumerCanonicalParameterSession as currentC11ParameterSession} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import {buildCanonicalParameterCards as currentC11ParameterCards} from '../../estimatePresentation/buildCanonicalParameterCards';
import {readFileSync as readCurrentC11Fixture} from 'node:fs';
import {drywallC11CurrentPhysicalContinuationR1 as physicalC11,drywallC11CurrentPhysicalPackR1 as physicalPack,
 drywallC11PhysicalFactR1 as physicalFact,drywallC11PhysicalUnknownR1 as physicalUnknown,
 drywallC11CurrentPhysicalCompletenessR1 as physicalCompleteness} from './drywallC11LayeredGeometryR1';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {canonicalEstimateResourceOperationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import captured from '../../../../.release-runtime/r568/master29-floor-drywall/partition-parent.json';
import oracle from '../../../../data/estimate-benchmarks/fixtures/drywall-c11-layered-geometry-r1-small-normal-boundary.json';
import {appendDrywallC11LayeredGeometryR1 as append,compileDrywallC11LayeredGeometryR1 as compile,drywallC11LayeredGeometryPackR1 as pack,
 drywallC11LayeredCompletenessR1 as completeness,drywallC11LayeredPrimarySelectionR1 as primary} from './drywallC11LayeredGeometryR1';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {verifyMaster29PhysicalPrimaryProjectionR1,master29SubjectCatalogR1,assertMaster29IncludedPhysicalOwnersR1} from '../../../../scripts/estimate/r4a13/master29FloorDrywallSubjectVerificationR1';
import {canonicalPublicResourceRowKindV1,parseCanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {buildCanonicalBaselinePlan} from '../backendPlatform/canonicalConsumerPromptPlanServerR1';
import {resolvePrimaryMeasureSelectionV1,assertCanonicalPrimaryMeasureSelectionV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
type Parent=Parameters<typeof append>[0];
const parent=captured.capturedParent as unknown as Parent,identity={definitionVersionId:captured.capturedParent.definition.id,definitionSha256:captured.capturedParent.definition.definition_sha256},
 facts=(key:string,L='4',H='2.75')=>({[pack.selector.id]:pack.profiles.find(p=>p.key===key)!.value,partition_length_m:L,partition_height_m:H}),
 id=(key:string,suffix:string)=>'drywall:c11:'+key+':'+suffix,
 physical=(r:Awaited<ReturnType<typeof compile>>)=>r.rows.map(r=>[r.row_id,r.quantity,r.unit_id,r.unit_price,r.amount,r.cost_owner_id,r.included_in_estimate,r.included_in_procurement]),
 needs=(key:string)=>pack.unknownNeeds.filter(n=>n.key!=='inner-tape'||key==='three-layer').map(n=>id(key,'open-'+n.key));
const raw=(d:Pick<Parent,'parameters'|'formulas'|'resources'>,values:Record<string,unknown>,rowOverrides:Record<string,Record<string,unknown>>={},primaryId='area_m2')=>
 compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:primaryId,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:values,confirmedParameters:pack.legacyRuntime.input,
  rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async v=>hash(v)});

it('retains exact current C111 v6 formulas, row identities, source metadata, owners and its legacy baseline',async()=>{
 const before=hash(parent),d=append(parent,identity);expect(hash(parent)).toBe(before);expect(d.parameters).toHaveLength(181);expect(d.formulas).toHaveLength(212);expect(d.resources).toHaveLength(212);
 expect(d.formulas.slice(0,50)).toEqual(parent.formulas);
 for(const old of parent.resources){const next=d.resources.find(r=>r.row_id===old.row_id)!;expect(next.source_metadata).toEqual(old.source_metadata);expect(next.resource_graph).toEqual(old.resource_graph);
  expect(next.formula_id).toBe(old.formula_id);expect(next.cost_owner_id).toBe(old.cost_owner_id);expect(next.unit_id).toBe(old.unit_id);expect(next.procurement_eligible).toBe(old.procurement_eligible);}
 const original=await raw(parent,{area_m2:'30'}),omitted=await compile(parent,identity,{area_m2:'30'}),explicit=await compile(parent,identity,{area_m2:'30',[pack.selector.id]:pack.selector.legacyValue});
 expect(physical(omitted)).toEqual(physical(original));expect(physical(explicit)).toEqual(physical(original));expect(omitted.preliminaryNeeds).toHaveLength(original.preliminaryNeeds.length);
});
it('preserves saved C111 manual quantity/name/referenceprice and amount without transferring it to layered branches',async()=>{
 const rowId='material:c111:board',edits={[rowId]:{quantity:'7',unitPrice:'120.5',titleRu:'Мои сохранённые листы',provenance:{kind:'manual',reason:'Saved legacy revision'}}},d=append(parent,identity);
 const before=await raw(parent,{area_m2:'30'},edits),after=await raw(d,{area_m2:'30',[pack.selector.id]:pack.selector.legacyValue},edits);
 expect(physical(after)).toEqual(physical(before));expect(after.rows.find(r=>r.row_id===rowId)).toMatchObject({quantity:'7',unit_price:'120.5',amount:'843.5',title_ru:'Мои сохранённые листы'});
 const exact=await compile(parent,identity,{...facts('two-layer'),area_m2:'999',c111_cleaning_water_l_m2:'99'});
 expect(exact.parameters.partition_area_m2).toBe('11');expect(exact.rows.some(r=>r.row_id===rowId)).toBe(false);expect(exact.preliminaryNeeds.some(n=>n.row_id===id('two-layer','open-washing-water'))).toBe(true);
});
it.each(oracle.cases)('independent $profile $case geometry counts pieces/layers/water without cloning an area table',async c=>{
 const r=await compile(parent,identity,{[pack.selector.id]:pack.profiles.find(p=>p.key===c.profile)!.value,...c.facts}),get=(suffix:string)=>r.rows.find(row=>row.row_id===id(c.profile,suffix));
 expect(Number(r.parameters.partition_area_m2)).toBe(Number(c.expected.area));
 for(const key of ['board','track','stud','anchor','screw25','screw35'] as const)expect(Number(get(key+'-order')?.quantity)).toBe(c.expected[key]);
 if(c.expected.screw55===null)expect(get('screw55-order')).toBeUndefined();else expect(Number(get('screw55-order')?.quantity)).toBe(c.expected.screw55);
 expect(Number(get('joint-compound-consumed')?.quantity)).toBeCloseTo(c.expected.jointCompoundConsumedKg,10);expect(Number(get('joint-compound-order')?.quantity)).toBe(c.expected.jointCompoundOrderKg);
 expect(Number(get('mixing-water-order')?.quantity)).toBeCloseTo(c.expected.mixingWaterL,10);expect(Number(get('outer-joint-tape-consumed')?.quantity)).toBeCloseTo(c.expected.outerJointTapeM,10);
 expect(Number(get('board-offcuts')?.quantity)).toBeCloseTo(c.expected.boardOffcutsM2,10);expect(r.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(needs(c.profile).sort());
});
it.each(pack.profiles)('$key has actual readonly area through client/compiler/writer/adapter/ViewModel/PDF',async profile=>{
 const d=append(parent,identity),catalog=master29SubjectCatalogR1(d,pack.catalogId,'Монтаж перегородки из гипсокартона',primary),values=facts(profile.key),
  plan=buildCanonicalBaselinePlan({catalog,prompt:'Монтаж перегородки из гипсокартона',parameterOverrides:values});
 const area=catalog.parameterSchema.find(p=>p.parameterId==='partition_area_m2')!;
 expect(area.guide).toMatchObject({guideKind:'DERIVED_VALUE_RULE',sourceRole:'ENGINEERING_DESIGN',guideVersion:pack.contract,
  sourceDocument:pack.geometry.rule.sourceDocument,sourceLocator:pack.geometry.rule.locator,sourceSnapshotHash:pack.geometry.rule.sha256,
  applicability:pack.scopeRu,verifiedAt:pack.geometry.rule.verifiedAt,guideValidationPolicy:'MANDATORY_BLOCK'});
 expect(area.normativeLinks).toEqual([{sourceId:pack.geometry.rule.sourceDocument,documentTitleRu:pack.geometry.rule.sourceDocument,
  editionStatus:pack.contract,locator:pack.geometry.rule.locator,applicabilityRu:pack.scopeRu,verifiedAt:pack.geometry.rule.verifiedAt,verifiedSource:'ENGINEERING_DESIGN'}]);
 expect(plan.primaryMeasureParameterId).toBe('partition_area_m2');expect(plan.parameters).not.toHaveProperty('partition_area_m2');expect(plan.parameters).not.toHaveProperty('area_m2');
 const r=await compile(parent,identity,values),proof=await verifyMaster29PhysicalPrimaryProjectionR1({catalogId:pack.catalogId,definitionVersionId:identity.definitionVersionId,
  titleRu:'Монтаж перегородки из гипсокартона',definition:d,result:r,submittedParameters:values,primaryParameterId:'partition_area_m2',expectedArea:'11',expectedPhysicalNeedRowIds:needs(profile.key)});
 expect(proof.identityTitle).toBe('Монтаж перегородки из гипсокартона — 11 м²');expect(proof.status).toBe('PASS_ACTUAL_WRITER_ADAPTER_VIEWMODEL_PDF_AREA');
});
it('asks only missing geometry, rejects999area and rejects geometry outside the supported15m/3m boundary',async()=>{
 const d=append(parent,identity),catalog=master29SubjectCatalogR1(d,pack.catalogId,'Монтаж перегородки из гипсокартона',primary);
 expect(()=>buildCanonicalBaselinePlan({catalog,prompt:'Монтаж перегородки',parameterOverrides:{[pack.selector.id]:pack.profiles[0]!.value}}))
  .toThrow(expect.objectContaining({name:'CanonicalBaselineContractMissingError',missingParameterIds:expect.arrayContaining(['partition_length_m','partition_height_m'])}));
 await expect(compile(parent,identity,{...facts('two-layer'),partition_area_m2:'999'})).rejects.toBeDefined();
 await expect(compile(parent,identity,facts('two-layer','15.001','3'))).rejects.toBeDefined();await expect(compile(parent,identity,facts('three-layer','4','3.001'))).rejects.toBeDefined();
});
it('saved legacyarea/new-root negative keeps old facts and exact m2 identity without layer multiplication',()=>{
 const d=append(parent,identity),schema=master29SubjectCatalogR1(d,pack.catalogId,'Монтаж перегородки',primary).parameterSchema,submitted=Object.freeze({...facts('three-layer'),area_m2:'77'});
 expect(resolvePrimaryMeasureSelectionV1({selectionMetadata:primary,parameterSchema:schema,submittedParameters:submitted})).toMatchObject({kind:'RESOLVED',primaryMeasure:{parameterId:'partition_area_m2',unitId:'m2'}});
 expect(()=>assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:primary,parameterSchema:schema,submittedParameters:submitted,parentPrimaryMeasure:{parameterId:'area_m2',unitId:'m2'}}))
  .toThrow(expect.objectContaining({code:'PRIMARY_MEASURE_NEW_ROOT_REQUIRED',httpStatus:422}));expect(submitted.area_m2).toBe('77');
});
it('independent162-entry whole-kit oracle covers categories, units, operations and all actual physical gaps',()=>{
 const d=append(parent,identity),map=completeness();expect(map.entries).toHaveLength(162);
 expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 for(const profile of pack.profiles)for(const need of pack.unknownNeeds.filter(n=>n.key!=='inner-tape'||profile.key==='three-layer')){
  const row=d.resources.find(r=>r.row_id===id(profile.key,'open-'+need.key))!,expected=map.entries.find(e=>e.resolution.rowId===row.row_id)!;
  expect(row.category).toBe(need.category);expect(row.unit_id).toBe(need.unitId);expect(expected.unitId).toBe(need.unitId||null);expect(expected.category).toBe(need.category);
  expect(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(o=>o.operationId)).toEqual(expected.requiredOperationIds);
  expect(canonicalPublicResourceRowKindV1({titleRu:row.title_ru,descriptor:row.resource_graph.publicResourcePresentationV1,costTreatment:row.resource_graph.costTreatment,rowId:row.row_id,graph:row.resource_graph,category:row.category})).toBe('RESOURCE');}
 const missing=d.resources.filter(r=>r.row_id!==id('three-layer','open-inner-tape'));
 expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:missing}).length).toBeGreaterThan(0);
});
it.each(pack.profiles)('$key one area owner includes unknown labour; second labour payment mutation is rejected',async profile=>{
 const d=append(parent,identity),owner=id(profile.key,'whole-work'),labour=id(profile.key,'open-labour'),included=needs(profile.key);
 assertMaster29IncludedPhysicalOwnersR1(d,{workOwnerRowId:owner,includedRowIds:included});
 const bad=JSON.parse(JSON.stringify(d)) as ReturnType<typeof append>,row=bad.resources.find(r=>r.row_id===labour)!;
 (row.resource_graph as Record<string,unknown>).costTreatment='OWN_COST';(row as unknown as {cost_owner_id:string}).cost_owner_id=labour;
 expect(()=>assertMaster29IncludedPhysicalOwnersR1(bad,{workOwnerRowId:owner,includedRowIds:included})).toThrow(/SECOND_LABOUR/);
 const r=await raw(d,facts(profile.key),{[owner]:{unitPrice:'77',provenance:{kind:'manual',reason:'One whole-work owner'}},
  [labour]:{quantity:'7',unitPrice:'120.5',provenance:{kind:'manual',reason:'Reference included physical hours'}}},'partition_area_m2'),saved=[...r.rows,...r.preliminaryNeeds].find(n=>n.row_id===labour)!;
 expect(r.totals.amount).toBe('847');expect(saved.quantity).toBe('7');expect(saved.unit_price).toBe('120.5');expect(saved.selected).toBe(false);
 const proof=await verifyMaster29PhysicalPrimaryProjectionR1({catalogId:pack.catalogId,definitionVersionId:identity.definitionVersionId,titleRu:'Монтаж перегородки из гипсокартона',
  definition:d,result:r,submittedParameters:facts(profile.key),primaryParameterId:'partition_area_m2',expectedArea:'11',expectedAmount:'847',
  rowOverrides:{[owner]:{unitPrice:'77',provenance:{kind:'manual',reason:'One whole-work owner'}},
   [labour]:{quantity:'7',unitPrice:'120.5',provenance:{kind:'manual',reason:'Reference included physical hours'}}},
  expectedIncludedManualPhysicalRows:[{rowId:labour,quantity:'7',unitPrice:'120.5',unitId:'man_hour'}]});
 expect(proof.manualPhysicalRows).toEqual([{rowId:labour,quantity:'7',unitPrice:'120.5',unitId:'man_hour',includedInEstimate:false,amount:null}]);expect(proof.totalAmount).toBe('847');
});
it('new public names are functional and calculated balances never become another purchased material',()=>{
 const d=append(parent,identity),newRows=d.resources.filter(r=>r.row_id.startsWith('drywall:c11:'));
 expect(newRows).toHaveLength(162);for(const r of newRows){expect(r.title_ru).not.toMatch(/КНАУФ|KNAUF|C11[123]|Фуген|Тифенгрунд|TN\s*\d/iu);
  expect(parseCanonicalPublicResourcePresentationV1(r.resource_graph.publicResourcePresentationV1)).not.toBeNull();
  const detail=r.row_id.endsWith('-consumed')||r.row_id.endsWith('-remaining');
  expect(Object.keys(r.resource_graph.publicResourcePresentationV1 as object)).toHaveLength(detail?7:6);
  expect(canonicalPublicResourceRowKindV1({titleRu:r.title_ru,descriptor:r.resource_graph.publicResourcePresentationV1,costTreatment:r.resource_graph.costTreatment,rowId:r.row_id,
   includedInEstimate:false,includedInProcurement:false,unitPrice:detail?'120.5':null,graph:r.resource_graph,category:r.category})).toBe(detail?'CALCULATION_DETAIL':'RESOURCE');}
 expect(newRows.filter(r=>r.resource_graph.publicResourcePresentationV1&&(r.resource_graph.publicResourcePresentationV1 as {rowKind:string}).rowKind==='CALCULATION_DETAIL')).toHaveLength(54);
 expect(pack.fullTechnicalAcceptance).toBe(false);expect(pack.counts.newFullTechnologies).toBe(0);
});


// Real R694 body snapshot is parsed at test runtime, never imported as an app
// definition or reconstructed from old50. Synthetic batchfacts below exercise
// existing compiler contracts; they are not site facts or engineering approval.
const currentC11Fixture=JSON.parse(readCurrentC11Fixture(currentC11Resolve(__dirname,'../../../../',physicalPack.current.actualBodyFixturePath),'utf8')) as {
 definition:{id:string;definition_sha256:string};parameters:AutomaticOwnerDefinition['parameters'];formulas:AutomaticOwnerDefinition['formulas'];resources:AutomaticOwnerDefinition['resources']};
const currentWholeC11=():AutomaticOwnerDefinition=>({parameters:JSON.parse(JSON.stringify(currentC11Fixture.parameters)),
 formulas:JSON.parse(JSON.stringify(currentC11Fixture.formulas)),resources:JSON.parse(JSON.stringify(currentC11Fixture.resources)),
 runtimeInput:{...pack.legacyRuntime.input,[pack.selector.id]:pack.selector.legacyValue},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['area_m2','partition_length_m','partition_height_m']}),
 readbackC11={catalogId:physicalPack.catalogId,definitionId:currentC11Fixture.definition.id,definitionSha256:currentC11Fixture.definition.definition_sha256,body:currentC11Fixture},
 physicalId=(branch:string,key:string)=>'c11-current-physical:'+branch+':'+key,
 physicalValues=(branch='c111',L=4,H=2.75)=>({[pack.selector.id]:physicalPack.profiles.find(p=>p.key===branch)!.value,...(branch==='c111'?{area_m2:L*H,c111_height_m:H}:{partition_length_m:L,partition_height_m:H})}),
 physicalBatch=(mixed=5.5,water=mixed*0.65,wash=1.1):Record<string,unknown>=>Object.fromEntries(physicalPack.facts.map(item=>[physicalFact(item.key),
  item.key==='mixed_dry_kg'?mixed:item.key==='mix_water_l'?water:item.key==='wash_water_l'?wash:item.key==='water_temperature_c'?15:
  item.key==='ambient_temperature_c'?20:'values' in item?item.values![0]:'TEST_ONLY_ACCEPTED_PPR_'+item.key])),
 physicalCompile=(branch='c111',values:Record<string,unknown>=physicalValues(branch),confirmed:Record<string,unknown>=physicalBatch(),
  overrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={})=>{
 const d=physicalC11(currentWholeC11(),readbackC11),profile=physicalPack.profiles.find(p=>p.key===branch)!;
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.catalogId,compilerVersion:physicalPack.contract,primaryMeasureParameterId:profile.primaryMeasureId,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:values,
  confirmedParameters:{...d.runtimeInput,...confirmed},rowOverrides:overrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async value=>hash(value)});
},physicalAny=(r:Awaited<ReturnType<typeof physicalCompile>>,rowId:string)=>[...r.rows,...r.preliminaryNeeds].find(row=>row.row_id===rowId),
 physicalDecision=(r:Awaited<ReturnType<typeof physicalCompile>>,branch:string,key:string)=>(physicalAny(r,physicalId(branch,'control:'+key))!.calculation_trace.resourceGraph as Record<string,any>).scopeRequirementDecisionV1,
 demoEdit={kind:'manual',reason:'TEST_ONLY existing physical water/work revision, not source approval'};

describe('SOURCE_ONLY whole C11 R919 physical continuation through existing compiler',()=>{
 it('requires actual181/212/212 body and exact semantic preimages rather than oldC11150 or reconstructed layered branches',()=>{
  const base=currentWholeC11();expect([base.parameters.length,base.formulas.length,base.resources.length]).toEqual([181,212,212]);
  expect(()=>physicalC11({...base,resources:base.resources.slice(0,50)},readbackC11)).toThrow('ACTUAL_CURRENT_WHOLE_R919_REQUIRED');
  expect(()=>physicalC11(base,{...readbackC11,definitionId:'oldC11150'})).toThrow('ACTUAL_CURRENT_WHOLE_R919_REQUIRED');
  expect(()=>physicalC11({...base,resources:base.resources.map(row=>row.row_id==='work:c111:worker'?{...row,cost_owner_id:'new-duplicate-owner'}:row)},readbackC11))
   .toThrow('CURRENT_SEMANTIC_PREIMAGE_REQUIRED:resource');
 });
 it('retains212 formulas, units, owner graphs, balances, original references/COST_SUMMARY roles and all73 old source quantities',()=>{
  const base=currentWholeC11(),before=hash(base),d=physicalC11(base,readbackC11);expect(hash(base)).toBe(before);
  expect(d.formulas.slice(0,212)).toEqual(base.formulas);expect(d.runtimeInput).toEqual(base.runtimeInput);
  for(const old of base.resources){const next=d.resources.find(row=>row.row_id===old.row_id)!;
   expect([next.formula_id,next.unit_id,next.inclusion_ast,next.cost_owner_id,next.procurement_eligible])
    .toEqual([old.formula_id,old.unit_id,old.inclusion_ast,old.cost_owner_id,old.procurement_eligible]);
   for(const[key,value]of Object.entries(old.resource_graph))if(key!=='operationCompositionV1')expect(next.resource_graph[key]).toEqual(value);
   const oldRefs=canonicalEstimateOperationReferences(old.resource_graph.operationCompositionV1),newRefs=canonicalEstimateOperationReferences(next.resource_graph.operationCompositionV1);
   for(const oldRef of oldRefs)expect(newRefs).toEqual(expect.arrayContaining([expect.objectContaining({operationId:oldRef.operationId,...(oldRef.processRole===undefined?{}:{processRole:oldRef.processRole})})]));
  }
  expect(d.resources.filter(row=>row.resource_graph.costTreatment==='OWN_COST').length).toBe(base.resources.filter(row=>row.resource_graph.costTreatment==='OWN_COST').length);
  expect(d.parameters.filter(p=>p.parameter_id.startsWith('c11_2_open_')||p.parameter_id.startsWith('c11_3_open_'))).toHaveLength(73);
  expect(d.resources.find(row=>row.row_id==='work:c111:worker')?.resource_graph.operationCompositionV1).toMatchObject({processRole:'COST_SUMMARY'});
 });
 it.each([{branch:'c111',mixed:5.5,board:'8',boardId:'material:c111:board',work:'10.78',workId:'work:c111:worker'},
  {branch:'two-layer',mixed:11,board:'16',boardId:'drywall:c11:two-layer:board-order',work:'11',workId:'drywall:c11:two-layer:whole-work'},
  {branch:'three-layer',mixed:16.5,board:'24',boardId:'drywall:c11:three-layer:board-order',work:'11',workId:'drywall:c11:three-layer:whole-work'}])(
  '$branch keeps one-face measure and current whole-material/owner scope; new physical counts remain UNKNOWN',async c=>{
   const r=await physicalCompile(c.branch,physicalValues(c.branch),physicalBatch(c.mixed));
   expect(physicalAny(r,c.boardId)?.quantity).toBe(c.board);expect(physicalAny(r,c.workId)?.quantity).toBe(c.work);
   expect(physicalAny(r,physicalId(c.branch,'control:water-lower'))?.quantity).toBe(String(c.mixed*0.6));
   expect(physicalAny(r,physicalId(c.branch,'function:water-measure'))?.quantity).toBeNull();
   expect(physicalDecision(r,c.branch,'method-facts').status).toBe('COMPLETED');expect(physicalDecision(r,c.branch,'physical-source-scope').status).toBe('PROJECT_SCOPE_OPEN');
   for(const other of physicalPack.profiles.filter(p=>p.key!==c.branch))expect([...r.rows,...r.preliminaryNeeds].some(row=>row.row_id.startsWith(physicalId(other.key,'')))).toBe(false);
  });
 it('small existing layered geometry keeps layer-count out of primary area and does not create a onepost/machine-time default',async()=>{
  const r=await physicalCompile('two-layer',physicalValues('two-layer',1.2,1),physicalBatch(1.2,0.78,0.1));
  expect(r.parameters.partition_area_m2).toBe('1.2');expect(physicalAny(r,'drywall:c11:two-layer:whole-work')?.quantity).toBe('1.2');
  expect(physicalAny(r,'drywall:c11:two-layer:open-labour')?.quantity).toBeNull();
  expect(physicalAny(r,physicalId('two-layer','control:water-upper'))?.quantity).toBe('0.84');
  expect(physicalAny(r,physicalId('two-layer','function:board-knife-blades'))?.quantity).toBeNull();
 });
 it.each([0,-1,Number.NaN])('zero/invalid length%s keeps existing currentgeometry validation',async L=>{
  await expect(physicalCompile('two-layer',physicalValues('two-layer',L))).rejects.toThrow();
 });
 it('unsupportedopenings/horizontaljoints, readonly facts, guessed sourcecounts and temperature outside chosen method refuse',async()=>{
  for(const value of ['OPENING_WITH_LINTEL','HORIZONTAL_JOINTS','WET_FIRE_CERTIFIED_OTHER_PROFILE'])
   await expect(physicalCompile('c111',physicalValues(),{...physicalBatch(),[physicalFact('opening_scope')]:value})).rejects.toThrow();
  await expect(physicalCompile('c111',{...physicalValues(),[physicalFact('system_reference')]:'consumer says compatible'})).rejects.toThrow();
  for(const q of [0,1,77])await expect(physicalCompile('c111',{...physicalValues(),[physicalUnknown('water-measure')]:q})).rejects.toThrow('unresolved application norm cannot be supplied');
  await expect(physicalCompile('c111',physicalValues(),{...physicalBatch(),[physicalFact('water_temperature_c')]:30.01})).rejects.toThrow();
  await expect(physicalCompile('c111',physicalValues(),physicalBatch(0,0))).rejects.toThrow();
 });
 it('recipe bounds follow actualdrymix and expose wrongwater even when purchasedbags/owneramount are large',async()=>{
  const r=await physicalCompile('c111',physicalValues(),physicalBatch(12,9),{'material:c111:fugen':{quantity:'25',provenance:demoEdit},'material:c111:water':{quantity:'20',provenance:demoEdit}});
  expect(physicalAny(r,physicalId('c111','control:water-lower'))?.quantity).toBe('7.2');expect(physicalAny(r,physicalId('c111','control:water-upper'))?.quantity).toBe('8.4');
  expect(physicalAny(r,physicalId('c111','control:water-over-recipe'))?.quantity).toBe('0.6');expect(physicalDecision(r,'c111','water-over-recipe').status).toBe('PROCESS_REQUIRED');
 });
 it.each([{water:3.3,shortage:false},{water:3.85,shortage:false},{water:3.29,shortage:true},{water:3.86,shortage:true}])(
  'actualrecipe boundary$water is checked separately from order quantum',async c=>{
   const r=await physicalCompile('c111',physicalValues(),physicalBatch(5.5,c.water));
   const shown=['water-under-recipe','water-over-recipe'].filter(key=>physicalAny(r,physicalId('c111','control:'+key))!=null);expect(shown.length>0).toBe(c.shortage);
  });
 it('manual accepted existingwater order updates supplycheck once while recipe still uses actualdrymass',async()=>{
  const r=await physicalCompile('two-layer',physicalValues('two-layer'),physicalBatch(12,7.8));
  expect(physicalAny(r,physicalId('two-layer','control:water-supply-shortage'))?.quantity).toBe('0.1');
  expect(physicalDecision(r,'two-layer','water-supply-shortage').status).toBe('PROCESS_REQUIRED');
  const changed=await physicalCompile('two-layer',physicalValues('two-layer'),physicalBatch(12,7.8),{'drywall:c11:two-layer:mixing-water-order':{quantity:'8',provenance:demoEdit}});
  expect(physicalAny(changed,physicalId('two-layer','control:water-supply-shortage'))).toBeUndefined();
  expect(physicalAny(changed,physicalId('two-layer','control:water-upper'))?.quantity).toBe('8.4');
  expect(changed.rows.filter(row=>row.row_id==='drywall:c11:two-layer:mixing-water-order')).toHaveLength(1);
 });
 it('missingreceiver stays an objectcondition alongside a sourceUNKNOWN washreceiver count',async()=>{
  const confirmed=physicalBatch();delete confirmed[physicalFact('waste_receiver')];const r=await physicalCompile('c111',physicalValues(),confirmed),
   need=r.preliminaryNeeds.find(row=>row.row_id===physicalId('c111','function:wash-water-receiver'))!;
  expect(need.missing_parameter_ids).toEqual(expect.arrayContaining([physicalFact('waste_receiver'),physicalUnknown('wash-water-receiver')]));
  expect(need.calculation_trace.unresolvedConditionParameterIds).toContain(physicalFact('waste_receiver'));
  expect(physicalDecision(r,'c111','method-facts').status).toBe('OBJECT_FACT_REQUIRED');
 });
 it('existing legacy labour is charged once, while both faceoperations see the same manually named owner',async()=>{
  const rowId='work:c111:worker',r=await physicalCompile('c111',physicalValues(),physicalBatch(),{[rowId]:{titleRu:'TEST_ONLY единый труд C111',unitPrice:'77',provenance:demoEdit}});
  expect(r.rows.filter(row=>row.row_id===rowId)).toHaveLength(1);expect(physicalAny(r,rowId)).toMatchObject({quantity:'10.78',unit_price:'77',amount:'830.06'});
  const sections=canonicalEstimateResourceOperationSections(r.rows.map(row=>({rowId:row.row_id,titleRu:row.title_ru,operation:(row.calculation_trace.resourceGraph as Record<string,unknown>).operationCompositionV1})));
  for(const face of ['clad-first','clad-second'])expect(sections.find(section=>section.operation?.operationId===physicalId('c111','operation:'+face))?.sharedResources)
   .toEqual(expect.arrayContaining([expect.objectContaining({rowId})]));
 });
 it('excluding mandatory board/jointscope opens existing wholecoverage without cloning a new paidcomponent',async()=>{
  for(const rowId of ['material:c111:board','material:c111:joint-tape']){
   const r=await physicalCompile('c111',physicalValues(),physicalBatch(),{[rowId]:{includedInEstimate:false,includedInProcurement:false,provenance:demoEdit}});
   expect(physicalDecision(r,'c111','whole-coverage').status).toBe('REQUIRED_RESOURCE_EXCLUDED');
  }
 });
 it('NONE insulation creates no phantomnew knife/accessory need while boardfaces remain',async()=>{
  const r=await physicalCompile('c111',{...physicalValues(),c111_insulation_mode:'NONE'});
  expect(physicalAny(r,physicalId('c111','function:insulation-knife-blade'))).toBeUndefined();
  expect(physicalAny(r,'material:c111:board')?.quantity).toBe('8');
  const sections=canonicalEstimateResourceOperationSections([...r.rows,...r.preliminaryNeeds].map(row=>({rowId:row.row_id,titleRu:row.title_ru,
   operation:(row.calculation_trace.resourceGraph as Record<string,unknown>).operationCompositionV1})));
  expect(sections.some(section=>section.operation?.operationId===physicalId('c111','operation:insulate'))).toBe(false);
 });
 it('independent physical map catches deleted addedfunctions/checks and wrongoperation consumers',()=>{
  const d=physicalC11(currentWholeC11(),readbackC11),map=physicalCompleteness(),validate=(resources:typeof d.resources)=>validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:resources});
  expect(map.sourceKind).toBe('PROJECT_SYSTEM');expect(physicalPack.sourceKindBasis).toMatch(/not a single manufacturer whole quantity norm/u);
  expect(validate(d.resources)).toEqual([]);expect(map.entries).toHaveLength(93);expect(map.fullTechnicalAcceptance).toBe(false);
  for(const rowId of [physicalId('c111','function:water-measure'),physicalId('two-layer','control:method-facts')])
   expect(validate(d.resources.filter(row=>row.row_id!==rowId))).toEqual(expect.arrayContaining([expect.stringMatching(/ROW_REFERENCE$/)]));
  const wrong=d.resources.map(row=>row.row_id===physicalId('c111','function:wash-water-receiver')?{...row,resource_graph:{...row.resource_graph,
   operationCompositionV1:d.resources.find(row=>row.row_id===physicalId('c111','function:depth-stop'))!.resource_graph.operationCompositionV1}}:row);
  expect(validate(wrong)).toEqual(expect.arrayContaining([expect.stringMatching(/OPERATION_BINDING$/)]));
 });
});

const currentC11Record=(value:unknown,label:string):Record<string,unknown>=>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('TEST_ONLY_C11_RECORD:'+label);return value as Record<string,unknown>;},
 currentC11Meters={c11_current_wash_meter_before_l:100,c11_current_wash_meter_after_l:102.5,c11_current_energy_meter_before_kwh:80,c11_current_energy_meter_after_kwh:83.4};
describe('SOURCE_ONLY actual R919 whole C11 quantity and ordinary continuation',()=>{
 it('typed current reader model preserves exact181 ordinals and212 formula ASTs/resources without baseline hydration',()=>{
  const typed=actualC11Model(currentC11Fixture),d=physicalC11(typed,{...readbackC11,body:typed});
  expect(typed.parameters).toEqual(currentC11Fixture.parameters);expect(typed.formulas).toEqual(currentC11Fixture.formulas);expect(typed.resources).toEqual(currentC11Fixture.resources);
  expect(d.parameters.slice(0,181).map(q=>[q.parameter_id,q.ordinal])).toEqual(typed.parameters.map(q=>[q.parameter_id,q.ordinal]));
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([227,305,305]);expect(d.runtimeInput).toEqual({});
  for(const old of typed.resources)expect(d.resources.find(row=>row.row_id===old.row_id)!.source_metadata).toEqual(old.source_metadata);
 });
 it('rejects a changed true body even when both arguments share a below-six-decimal constraint mutation',()=>{
  const altered=structuredClone(currentWholeC11()),q=altered.parameters[0]!;expect(q.constraints_json).not.toBeNull();
  q.constraints_json={...q.constraints_json,min:0.0000001};
  expect(()=>physicalC11(altered,{...readbackC11,body:altered})).toThrow('C11_ACTUAL_CURRENT_WHOLE_R919_REQUIRED');
  expect(()=>physicalC11(currentWholeC11(),{...readbackC11,catalogId:'other-family'})).toThrow('C11_ACTUAL_CURRENT_WHOLE_R919_REQUIRED');
 });
 it('known technology facts and absent batch quantities remain numerical needs rather than missing technology',async()=>{
  const confirmed=physicalBatch();for(const key of ['mixed_dry_kg','mix_water_l','wash_water_l','batch_reference','inventory_reference','contractor_scope_reference'])delete confirmed[physicalFact(key)];
  const r=await physicalCompile('two-layer',physicalValues('two-layer'),confirmed),need=physicalAny(r,physicalId('two-layer','control:water-lower'))!;
  expect(need).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});expect(currentC11Record(need.calculation_trace,'trace').unresolvedConditionParameterIds??[]).toEqual([]);
  expect(physicalDecision(r,'two-layer','method-facts').status).toBe('COMPLETED');expect(physicalDecision(r,'two-layer','physical-source-scope').status).toBe('PROJECT_SCOPE_OPEN');
  expect(physicalAny(r,'drywall:c11:two-layer:open-labour')?.quantity).toBeNull();
 });
 it('two dedicated meter balances calculate2.5L and3.4kWh without closing historical allocation norms or creating another purchase',async()=>{
  const r=await physicalCompile('two-layer',{...physicalValues('two-layer'),...currentC11Meters});
  expect(physicalAny(r,physicalId('two-layer','control:observed-wash-water'))?.quantity).toBe('2.5');
  expect(physicalAny(r,physicalId('two-layer','control:observed-electricity'))?.quantity).toBe('3.4');
  for(const key of ['observed-wash-water','observed-electricity'])expect(physicalAny(r,physicalId('two-layer','control:'+key))).toMatchObject({included_in_estimate:false,included_in_procurement:false});
  expect(physicalAny(r,'drywall:c11:two-layer:open-washing-water')?.quantity).toBeNull();expect(physicalAny(r,'drywall:c11:two-layer:open-electricity')?.quantity).toBeNull();
  expect(physicalDecision(r,'two-layer','physical-source-scope').status).toBe('PROJECT_SCOPE_OPEN');
 });
 it('a known meter start with absent end stays QUANTITY_REQUIRED and never becomes zero or a technology refusal',async()=>{
  const r=await physicalCompile('two-layer',{...physicalValues('two-layer'),c11_current_wash_meter_before_l:100}),need=physicalAny(r,physicalId('two-layer','control:observed-wash-water'))!;
  expect(need).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});expect(currentC11Record(need,'need').missing_parameter_ids).toContain('c11_current_wash_meter_after_l');
  const d=physicalC11(currentWholeC11(),readbackC11);expect(d.parameters.find(q=>q.parameter_id==='c11_current_wash_meter_after_l')?.constraints_json?.greaterThanOrEqualParameter).toBeUndefined();
  expect(d.resources.find(row=>row.row_id===physicalId('two-layer','control:observed-wash-water'))?.resource_graph.formulaOutputBoundsV1).toMatchObject({minimum:0,unitId:'l'});
  expect(currentC11Record(need.calculation_trace,'trace').unresolvedConditionParameterIds??[]).toEqual([]);expect(physicalDecision(r,'two-layer','method-facts').status).toBe('COMPLETED');
  const id=physicalId('two-layer','control:observed-wash-water'),manual=await physicalCompile('two-layer',{...physicalValues('two-layer'),c11_current_wash_meter_before_l:100},physicalBatch(),{[id]:{quantity:'2.5',provenance:{kind:'manual',reason:'TEST_ONLY cannot manufacture missing actual endreading'}}});
  expect(physicalAny(manual,id)).toMatchObject({quantity:'2.5',need_state:'QUANTITY_REQUIRED'});expect(currentC11Record(physicalAny(manual,id),'manualNeed').missing_parameter_ids).toContain('c11_current_wash_meter_after_l');
 });
 it('an end-only reading is a quantity hold while the documented technology remains applicable',async()=>{
  const r=await physicalCompile('two-layer',{...physicalValues('two-layer'),c11_current_wash_meter_after_l:102.5}),need=physicalAny(r,physicalId('two-layer','control:observed-wash-water'))!;
  expect(need).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});expect(currentC11Record(need,'need').missing_parameter_ids).toContain('c11_current_wash_meter_before_l');
  expect(currentC11Record(need.calculation_trace,'trace').unresolvedConditionParameterIds??[]).toEqual([]);
  expect(physicalDecision(r,'two-layer','method-facts').status).toBe('COMPLETED');expect(currentC11Record(need,'need').missing_parameter_ids).not.toContain(physicalFact('system_reference'));
 });
 it('explicit unchanged readings give real zero observations but no default supply or source closure',async()=>{
  const r=await physicalCompile('two-layer',{...physicalValues('two-layer'),c11_current_wash_meter_before_l:100,c11_current_wash_meter_after_l:100,c11_current_energy_meter_before_kwh:80,c11_current_energy_meter_after_kwh:80});
  for(const key of ['observed-wash-water','observed-electricity'])expect(physicalAny(r,physicalId('two-layer','control:'+key))?.quantity).toBe('0');
  expect(physicalAny(r,'drywall:c11:two-layer:open-washing-water')?.quantity).toBeNull();
 });
 it('negative dedicated balances refuse instead of clipping consumption to zero',async()=>{
  for(const input of [{c11_current_wash_meter_before_l:100,c11_current_wash_meter_after_l:99},{c11_current_energy_meter_before_kwh:80,c11_current_energy_meter_after_kwh:79}])
   await expect(physicalCompile('two-layer',{...physicalValues('two-layer'),...input})).rejects.toThrow();
 });
 it('known measured quantities never hide a missing receiver at its actual resource consumer and saved PDF',async()=>{
  const confirmed=physicalBatch();delete confirmed[physicalFact('waste_receiver')];const r=await physicalCompile('c111',{...physicalValues(),...currentC11Meters},confirmed),need=physicalAny(r,physicalId('c111','function:wash-water-receiver'))!;
  expect(need).toMatchObject({quantity:null,need_state:'CONDITION_REQUIRED'});expect(currentC11Record(need.calculation_trace,'trace').unresolvedConditionParameterIds).toContain(physicalFact('waste_receiver'));
  const saved={revision:{id:'TEST_ONLY',release_id:'TEST_ONLY',definition_version_id:'TEST_ONLY_R919',checksum_sha256:'a'.repeat(64),input_parameters:r.parameters},resources:[...r.rows,...r.preliminaryNeeds]},cold=JSON.parse(JSON.stringify(saved));
  expect(currentC11SavedAcceptance(cold).pdfAllowed).toBe(false);expect(currentC11SavedAcceptance(cold).issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_CONDITION_UNRESOLVED'})]));
 });
 it('inventory units and system-specific hardware do not turn chemical gloves into mechanical pairs or C111 machine rates into layered times',()=>{
  const d=physicalC11(currentWholeC11(),readbackC11);
  expect(d.resources.find(row=>row.row_id==='tool:c111:gloves')?.unit_id).toBe('piece');expect(d.resources.find(row=>row.row_id==='drywall:c11:two-layer:open-gloves')?.unit_id).toBe('pair');
  expect(physicalPack.retainedConsumerFunctionRules.gloveCompatibility).toMatch(/not an automatic/u);
  for(const key of ['labour','shears','perforator','driver'])expect(d.formulas.find(f=>f.formula_id==='drywall:c11:two-layer:formula:open-'+key)?.expression_source).toBe('c11_2_open_'+key);
  expect(d.formulas.find(f=>f.formula_id==='drywall:c11:two-layer:formula:screw35-consumed')?.expression_source).toContain('/0.25');
  expect(d.formulas.find(f=>f.formula_id==='drywall:c11:three-layer:formula:screw35-consumed')?.expression_source).toContain('/0.5');
  expect(d.parameters.find(q=>q.parameter_id==='c11_3_open_inner_tape')?.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
 });
 it('real retained PH2 and insulation knife consumers appear under physical stages without another owner or a phantom NONE stage',async()=>{
  const d=physicalC11(currentWholeC11(),readbackC11),bit=d.resources.find(row=>row.row_id==='tool:c111:ph2')!,refs=canonicalEstimateOperationReferences(bit.resource_graph.operationCompositionV1);
  for(const stage of ['clad-first','clad-second'])expect(refs.map(op=>op.operationId)).toContain(physicalId('c111','operation:'+stage));
  expect(bit.cost_owner_id).toBe(currentWholeC11().resources.find(row=>row.row_id===bit.row_id)!.cost_owner_id);
  const r=await physicalCompile('c111',{...physicalValues(),c111_insulation_mode:'NONE'});expect(physicalAny(r,physicalId('c111','function:insulation-knife-blade'))).toBeUndefined();
 });
 it('ordinary producer retains90 bindings and all existing source arrays and refuses absent scoped capture',async()=>{
  const pin=(path:string)=>({path,sha256:currentC11CryptoHash('sha256').update(readCurrentC11Fixture(path)).digest('hex')}),
   root=currentC11Resolve('C:/Users/User/Documents/Codex/2026-10-27/files-pasted-by-the-user-c-2/work/finishing/drywall-partition-current/continued-current'),
   pointer=pin('C:/dev/rik-expo-app-r4a5-dc4f0ce7/data/estimate-benchmarks/r568-local-developer-canonical-release.json'),current=currentC11Record(JSON.parse(readCurrentC11Fixture(pointer.path,'utf8')),'pointer'),
   proof=currentC11Record(JSON.parse(readCurrentC11Fixture(physicalPack.current.proofPath,'utf8')),'proof'),context={releaseId:String(proof.selectedReleaseId),searchReleaseId:String(current.searchReleaseId),
    outputRoot:currentC11Resolve(root,'ROOT_UNRUN_OUTPUT_NOT_CREATED'),master:pin('C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_24_2026-10-27.txt'),currentRelease:pointer,actualBodyProof:pin(physicalPack.current.proofPath),
    targetPreimage:pin(currentC11Resolve(root,'R919_REQUESTED_NEW_SOURCE_TARGET_PREIMAGE.json')),physicalSourcePack:pin(currentC11Resolve(__dirname,'../../../../data/estimate-benchmarks/source-packs/c11-current-physical-continuation-r1.json')),
    primarySourceArtifacts:physicalPack.primarySourceOrigins},draft=prepareC11CurrentPhysicalDraftR2(context);
  expect([draft.parameterDefinitions.length,draft.formulaDefinitions.length,draft.resourceDefinitions.length]).toEqual([227,305,305]);expect(draft.runtimeProfileInput).toEqual({});
  const candidate=currentC11Candidate(draft,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate,opt=currentC11RetainedOptIn(candidate)!;
  expect(opt).not.toBeNull();expect(opt.successorProvenanceContinuation?.contract).toBe('master-retained-binding-continuation/r1');
  expect(opt.successorProvenanceContinuation?.capturedSourceMetadata).toEqual(opt.capturedParent.definition.source_metadata);
  const captured=opt.capturedParent,newLocator=candidate.newLocators[0]!,representative=currentC11RetainedRepresentative(candidate,{
   parameters:draft.parameterDefinitions,formulas:draft.formulaDefinitions,resources:draft.resourceDefinitions,newBindings:[{row_id:physicalId('c111','control:method-facts'),locator_id:newLocator.id,applicability:draft.binding.applicability!}],
   successorProvenance:{contract:physicalPack.contract,sourceId:draft.sourceId,normId:draft.normId,parentDefinitionId:captured.definition.id,parentBaselineId:captured.baseline.id,capturedParentSha256:opt.capturedParentSha256}});
  expect(representative.expectedNormativeBindingCount).toBe(91);
  expect(representative.sourceMetadata.retainedParentBindingSuccessorV1).toEqual(captured.definition.source_metadata.retainedParentBindingSuccessorV1);
  expect(representative.sourceMetadata.retainedParentBindingContinuationV1).toBeDefined();
  for(const binding of captured.bindings){const row=captured.resources.find(resource=>resource.id===binding.resource_spec_id)!;expect(representative.bindings).toContainEqual({row_id:row.row_id,locator_id:binding.locator_id,applicability:binding.applicability});}
  for(const q of captured.parameters)expect(representative.normativeSourceIds[q.parameter_id]).toEqual(captured.baseline.normative_source_ids[q.parameter_id]);
  expect(representative.normativeSourceIds[physicalUnknown('water-measure')]).toEqual([]);expect(representative.normativeSourceIds.c11_current_wash_meter_before_l).toEqual([draft.sourceId]);
  expect(()=>prepareC11CurrentPhysicalConfigR2(context)).toThrow('STOP_C11_CURRENT_PHYSICAL_R2_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED');
  await expect(draft.verifyCore()).rejects.toThrow('STOP_C11_CURRENT_PHYSICAL_R2_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED');
 });
 it('real Core to saved-shaped cold input keeps4 editable meter readings and21 protected facts with no DB-save claim',async()=>{
  const submitted={...physicalValues('two-layer'),...currentC11Meters},r=await physicalCompile('two-layer',submitted),d=physicalC11(currentWholeC11(),readbackC11),catalog:CurrentC11Catalog={
   catalogId:physicalPack.catalogId,releaseId:'TEST_ONLY_R919',namespace:'global',domain:'drywall_ceiling',workKey:'drywall_ceiling_interior_drywall_partition_install_standard',titleRu:'Монтаж перегородки из гипсокартона',definitionVersion:8,applicability:{},professionalMetadata:{},
   parameterSchema:d.parameters.map(q=>{const t=currentC11Record(q.truth_metadata,'truth'),g=currentC11Record(t.guide,'guide');return{
    parameterId:q.parameter_id,ordinal:q.ordinal,valueType:q.value_type,unitId:q.unit_id,titleRu:q.title_ru,required:q.required,defaultValue:q.default_value,constraints:q.constraints_json,
    semanticParameterKey:t.semantic_parameter_key,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,preliminaryCompilationAllowed:t.preliminary_compilation_allowed,runtimeProfileClassification:t.runtime_profile_classification,
    requiredWhen:q.constraints_json?.requiredWhen??t.required_when,visibleWhen:t.visible_when,formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,
    guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,
     guideShortRu:g.guide_short_ru,guideVersion:g.guide_version,applicability:g.applicability,verifiedAt:g.verified_at}} as CurrentC11Catalog['parameterSchema'][number];})},
   stored={id:'11111111-1111-4111-8111-111111111111',release_id:catalog.releaseId,catalog_id:catalog.catalogId,definition_version_id:'TEST_ONLY_R919',definition_version:8,revision_number:1,status:'ready',currency_code:'KGS',price_snapshot_ids:[],
    input_parameters:r.parameters,user_input_snapshot:submitted,accepted_baseline_snapshot:physicalBatch(),assumption_snapshot:{},compiler_version:physicalPack.contract,checksum_sha256:'a'.repeat(64),created_at:'2026-10-28T00:00:00Z',totals:r.totals,row_count:r.rows.length,amendment_contract:{parameterSources:{preliminaryNeeds:r.preliminaryNeeds}}},
   cold=JSON.parse(JSON.stringify(stored)),before=JSON.stringify(cold),revision=currentC11SavedMapper(cold),session=currentC11ParameterSession({catalog,revision,draftId:'TEST_ONLY_C11_COLD'}),cards=currentC11ParameterCards({session,revision:null});
  for(const meter of physicalPack.measurementInputs)expect(cards.find(card=>card.key===meter.id)).toMatchObject({value:currentC11Meters[meter.id as keyof typeof currentC11Meters],editable:true});
  for(const f of physicalPack.facts)expect(cards.some(card=>card.key===physicalFact(f.key)&&card.editable)).toBe(false);
  expect(revision.parameters.c11_current_wash_meter_after_l).toBe(102.5);expect(JSON.stringify(cold)).toBe(before);
  const unknown=await physicalCompile('two-layer',physicalValues('two-layer')),unknownStored={...stored,input_parameters:unknown.parameters,user_input_snapshot:physicalValues('two-layer'),amendment_contract:{parameterSources:{preliminaryNeeds:unknown.preliminaryNeeds}}},
   unknownRevision=currentC11SavedMapper(JSON.parse(JSON.stringify(unknownStored))),unknownCards=currentC11ParameterCards({session:currentC11ParameterSession({catalog,revision:unknownRevision,draftId:'TEST_ONLY_C11_UNKNOWN_COLD'}),revision:null});
  for(const meter of physicalPack.measurementInputs)expect(unknownCards.find(card=>card.key===meter.id)).toMatchObject({editable:true,missing:true});

 });
});
