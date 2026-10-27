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
