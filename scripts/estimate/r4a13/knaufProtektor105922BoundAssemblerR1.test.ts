import {createHash} from 'node:crypto';
import fixture from '../../../data/estimate-benchmarks/fixtures/knauf-protektor105922-current-seven-r1.json';
import bindingPack from '../../../data/estimate-benchmarks/source-packs/knauf-protektor105922-registry-binding-r1.json';
import payload from '../../../data/estimate-benchmarks/source-packs/knauf-protektor105922-composite-locator-r1.json';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {knaufProtektor105922PackR1 as pack} from '../../../src/lib/estimate/v4/knaufProtektor105922ForwardR1';
import {canonicalPublisherPriceBindingIsCompatible, canonicalPublisherQuantityScopeIsConsistent} from './canonicalDefinitionPublisherR1';
import {prepareKnaufProtektor105922BoundSevenR1, type KnaufProtektorBoundAssemblerInputR1,
  type KnaufProtektorRegistrySourceR1, type KnaufProtektorRegistryLocatorR1} from './knaufProtektor105922BoundAssemblerR1';
import {knaufTechnicalParameterSchemaSha256S2769} from './s2763KnaufInteriorPlasterMaterialsOverlay';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

type Json = Record<string,any>;
const hash = (value:unknown) => createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex');
// Every f000... ID, created_at, unobserved historical registry payload and
// context evidence hash below is SYNTHETIC UNIT DATA, not a registered identity,
// transaction result, price record or proof of collision absence. Only parents,
// six projected source anchors and three historical locators are actual data.
const syntheticUuid = (n:number) => 'f0000000-0000-5000-8000-'+String(n).padStart(12,'0');
const createdAt = '2000-01-01T00:00:00.000Z';
const owner = pack.ownerRowId;
const newSourceIds = [syntheticUuid(100),syntheticUuid(101),syntheticUuid(102)];
const newLocatorId = syntheticUuid(110);
const scopePrefix = 'rik-expo-app.s27-63.knauf-interior-plaster-conditional-composition-five.v1:';
const labourPrefix = 'rik-expo-app.s27-63.knauf-interior-plaster-base-labour-six.v1:';
const pick = (row:Json,keys:readonly string[]) => Object.fromEntries(keys.map(key=>[key,row[key]]));
const resourceSemanticKeys = ['row_id','ordinal','section','category','title_ru','row_type','unit_id','formula_id',
  'inclusion_ast','resource_graph','semantic_owner','cost_owner_id','procurement_eligible','source_metadata'];
const formulaSemanticKeys = ['formula_id','output_unit_id','expression_source','ast','input_parameter_ids','ast_sha256'];

function syntheticInput():KnaufProtektorBoundAssemblerInputR1 {
  const parents = fixture.parents.map(entry=>({parent:structuredClone(entry.parent) as PurchaseGroupRepresentative,
    manifest:structuredClone(entry.manifest),searchDocument:structuredClone(entry.searchDocument)}));
  const sources:KnaufProtektorRegistrySourceR1[] = bindingPack.historicalObservedSourceProjections.map(row=>({
    id:row.id,source_key:row.source_key,title_ru:row.title_ru,authority:row.authority,
    official_url:row.official_url,artifact_sha256:row.artifact_sha256,effective_from:null,effective_to:null,
    metadata:{contract:row.contract,sourceId:row.logical_source_id,sourceArtifactId:row.logical_artifact_id,
      sourceRole:row.source_role,syntheticMissingFullFields:true},created_at:createdAt}));
  for(const [index,kind] of ['ceiling','wall'].entries()) sources.push({id:syntheticUuid(800+index),
    source_key:labourPrefix+kind,title_ru:'Синтетическая полная строка для unit-проверки наследования',
    authority:'SYNTHETIC_UNIT_FIXTURE',official_url:null,artifact_sha256:'a'.repeat(64),
    effective_from:null,effective_to:null,metadata:{syntheticUnitFixture:true},created_at:createdAt});
  const locators:KnaufProtektorRegistryLocatorR1[] = structuredClone(bindingPack.historicalObservedLocatorRows);
  const missingRegistryFixtures = [
    ['b395a873-bbb7-5352-8e55-5f2863d32a91',scopePrefix+'additional_abrasive_process'],
    ['0971f49b-5b5e-5c7e-82ac-d14411eb84c3',scopePrefix+'beacon_method'],
    ['0e67f242-0340-58a6-823c-1d361d62bf5f',scopePrefix+'reinforcement_scope'],
    ['c26118b7-1d9d-591f-89c5-2361075fa80a',labourPrefix+'ceiling'],
    ['1fec0e52-dfd9-5dda-8ff1-8c0cec19a40e',labourPrefix+'wall'],
  ] as const;
  for(const [id,sourceKey] of missingRegistryFixtures) {
    const locator = {syntheticUnitFixture:true,sourceKey};
    locators.push({id,source_id:sources.find(row=>row.source_key === sourceKey)!.id,
      locator_key:sourceKey,locator,excerpt_sha256:hash(locator)});
  }
  const observedSources = [...structuredClone(sources),...bindingPack.newSources.map((expected,index)=>({
    ...structuredClone(expected.proposedRowWithoutIdOrCreatedAt),id:newSourceIds[index]!,created_at:createdAt}))];
  return {parents,registry:{inheritedPreimage:{sources,locators},observed:{sources:observedSources,
    locators:[...structuredClone(locators),{id:newLocatorId,source_id:newSourceIds[0]!,
      locator_key:bindingPack.composite.locatorKey,locator:structuredClone(payload),excerpt_sha256:hash(payload)}]}},
    context:{parentDefinitionReleaseId:fixture.gate.definitionReleaseId,parentSearchReleaseId:fixture.gate.searchReleaseId,
      parentPointerSha256:fixture.gate.currentPointerAtCaptureSha256,successorReleaseId:syntheticUuid(1),
      sourceHead:'a'.repeat(40),sourceTree:'b'.repeat(40),sourceFreezeSha256:'c'.repeat(64),acceptanceEvidenceSha256:'d'.repeat(64),
      identities:parents.map((item,index)=>({catalogId:String(item.parent.definition.catalog_id),
        definitionId:syntheticUuid(10+index),baselineId:syntheticUuid(30+index),baselineKey:'SYNTHETIC-BOUND-UNIT:'+index,
        resourceIds:Object.fromEntries([...item.parent.resources.map(row=>String(row.row_id)),
          ...pack.informationRows.map(row=>pack.prefix+':'+row.suffix)]
          .map((rowId,rowIndex)=>[rowId,syntheticUuid(10000+index*1000+rowIndex)]))}))}};
}

describe('PROTEKTOR bound seven assembler: actual parents and explicitly synthetic registry inputs',()=> {
  let input:KnaufProtektorBoundAssemblerInputR1;
  let before:KnaufProtektorBoundAssemblerInputR1;
  let result:ReturnType<typeof prepareKnaufProtektor105922BoundSevenR1>;
  beforeAll(()=> {
    input = syntheticInput();before = structuredClone(input);
    result = prepareKnaufProtektor105922BoundSevenR1(input);
  });

  test('one common clone per actual parent remaps only one logical binding: 196+7, old203 inputs immutable',()=> {
    expect(input).toStrictEqual(before);
    expect(result.plans).toHaveLength(7);
    let unrelated = 0;
    for(const plan of result.plans) {
      const parent = input.parents.find(item=>item.parent.definition.catalog_id === plan.definition.catalog_id)!.parent;
      const identity = input.context.identities.find(item=>item.catalogId === plan.definition.catalog_id)!;
      expect(plan.definition.id).toBe(identity.definitionId);
      expect(plan.definition.definition_version).toBe(Number(parent.definition.definition_version)+1);
      expect(plan.baseline.source_definition_version_id).toBe(parent.definition.id);
      expect(plan.baseline.supersedes_baseline_id).toBe(parent.baseline.id);
      expect(plan.bindings).toHaveLength(29);
      expect(new Set(plan.bindings.map(b=>b.resource_spec_id)).size).toBe(29);
      for(const old of parent.bindings) {
        const next = plan.bindings.find(b=>b.resource_spec_id === identity.resourceIds[old.row_id])!;
        expect(next.definition_version_id).toBe(identity.definitionId);
        if(old.row_id === owner) {
          expect(next.locator_id).toBe(newLocatorId);
          expect(next.applicability.retainedOriginalBindingApplicability).toStrictEqual(old.applicability);
          expect(next.applicability.retainedOriginalInclusionAst).toStrictEqual(parent.resources.find(row=>row.row_id === owner)!.inclusion_ast);
        } else {
          expect(next.locator_id).toBe(old.locator_id);expect(next.applicability).toStrictEqual(old.applicability);unrelated++;
        }
      }
    }
    expect(unrelated).toBe(196);
  });

  test('all112 unrelated resource/formula semantic payloads per parent remain exact',()=> {
    for(const plan of result.plans) {
      const parent = input.parents.find(item=>item.parent.definition.catalog_id === plan.definition.catalog_id)!.parent;
      expect(plan.resources).toHaveLength(122);expect(plan.formulas).toHaveLength(122);
      for(const old of parent.resources.filter(row=>row.row_id !== owner)) {
        expect(pick(plan.resources.find(row=>row.row_id === old.row_id)!,resourceSemanticKeys)).toStrictEqual(pick(old,resourceSemanticKeys));
      }
      for(const old of parent.formulas.filter(row=>row.formula_id !== pack.ownerFormulaId)) {
        expect(pick(plan.formulas.find(row=>row.formula_id === old.formula_id)!,formulaSemanticKeys)).toStrictEqual(pick(old,formulaSemanticKeys));
      }
    }
  });

  test('exact16 old defaults retain values and refreshed common baseline provenance; newfacts have none',()=> {
    let count = 0;
    for(const plan of result.plans) {
      const parent = input.parents.find(item=>item.parent.definition.catalog_id === plan.definition.catalog_id)!.parent;
      expect(plan.baseline.input_values).toStrictEqual(parent.baseline.input_values);
      expect(plan.baseline.input_classification).toStrictEqual(parent.baseline.input_classification);
      expect(plan.baseline.parameter_schema_sha256).toBe(knaufTechnicalParameterSchemaSha256S2769(plan.parameters));
      for(const old of parent.parameters) {
        const p = plan.parameters.find(item=>item.parameter_id === old.parameter_id)!;
        expect(p.default_value).toStrictEqual(old.default_value);
        if(old.default_value != null) {
          count++;
          const provenance = p.truth_metadata.provenance, binding = provenance.approvedTemplateBinding;
          expect(p.approved_template_baseline_id).toBe(plan.baseline.id);
          expect(provenance.sourceDefinitionVersionId).toBe(parent.definition.id);
          expect(provenance.sourceReleaseId).toBe(input.context.successorReleaseId);
          expect(provenance.approvedTemplateBaselineId).toBe(plan.baseline.id);
          expect(binding).toMatchObject({baselineId:plan.baseline.id,definitionVersionId:parent.definition.id,
            targetDefinitionVersionId:plan.definition.id,parameterId:p.parameter_id,value:old.default_value,
            inputClassification:'ASSUMPTION',parameterSchemaSha256:plan.baseline.parameter_schema_sha256,
            acceptanceEvidenceSha256:input.context.acceptanceEvidenceSha256});
          expect(binding.formulaConsumerIds).toStrictEqual(plan.baseline.formula_consumer_ids[p.parameter_id]);
          expect(binding.resourceConsumerRowIds).toStrictEqual(plan.baseline.resource_consumer_row_ids[p.parameter_id]);
          expect(binding.normativeSourceIds).toStrictEqual(plan.baseline.normative_source_ids[p.parameter_id]);
        }
      }
      for(const id of bindingPack.newFactParameterIds) {
        expect(plan.parameters.find(p=>p.parameter_id === id)!.default_value).toBeNull();
        expect(Object.hasOwn(plan.baseline.input_values,id)).toBe(false);
      }
    }
    expect(count).toBe(16);
  });

  test('single metre paidowner keeps manual policy, inclusion and readable shared presentation with typed optout',()=> {
    for(const plan of result.plans) {
      const parent = input.parents.find(item=>item.parent.definition.catalog_id === plan.definition.catalog_id)!.parent;
      const row = plan.resources.find(item=>item.row_id === owner)!;
      expect(plan.resources.filter(item=>item.row_id === owner && item.resource_graph.costTreatment === 'OWN_COST')).toHaveLength(1);
      expect(row.unit_id).toBe('m');expect(row.cost_owner_id).toBe(owner);
      expect(row.source_metadata.automaticGenericPriceInheritanceAllowed).toBe(false);
      expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:parent.resources.find(item=>item.row_id === owner)!,
        targetResource:row,sourceBindingPriceKey:owner})).toBe(false);
      expect(row.inclusion_ast.operands[0]).toStrictEqual(parent.resources.find(item=>item.row_id === owner)!.inclusion_ast);
      expect(row.resource_graph.purchaseBalanceV1.manualQuantumViolationPolicy).toBe('retain-raw-and-block-quantum');
      const presentation = row.resource_graph.publicResourcePresentationV1;
      expect(presentation.nameRu).toBe('Угловой профиль для штукатурки');
      expect(presentation.detailsRu).toContain(payload.publicPresentation.plainSupplierWarningRu);
      expect(payload.publicPresentation.plainSupplierWarningRu).toContain('Если поставщик подтвердил');
      expect(payload.publicPresentation.plainSupplierWarningRu).toContain('по 25');
      for(const info of pack.informationRows) {
        const infoRow = plan.resources.find(item=>item.row_id === pack.prefix+':'+info.suffix)!;
        expect(infoRow.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
        expect(infoRow.procurement_eligible).toBe(false);
        expect(infoRow.resource_graph.derivedQuantityEditPolicyV1.mode).toBe('PARAMETERS_ONLY');
        expect(infoRow.resource_graph.publicResourcePresentationV1.detailsRu).toStrictEqual([info.detailRu]);
      }
    }
  });

  test('common partialscope checks keep26 unrelated application needs; data assembly is never execution acceptance',()=> {
    for(const plan of result.plans) {
      expect(canonicalPublisherQuantityScopeIsConsistent(plan)).toBe(true);
      expect(plan.passport.decision.unresolvedResourceRowIds).toHaveLength(26);
      expect(plan.passport.decision.unresolvedResourceRowIds).toEqual(expect.arrayContaining(pack.installationCoverage.retainedResidualRowIds));
      expect(plan.definition.content_status).toBe('QUARANTINED');expect(plan.definition.content_gate_status).toBe('RED');
      expect(plan.passport.decision).toMatchObject({quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',
        activationAllowed:false,productionEligible:false,completeTechnicalEstimateAccepted:false});
    }
    expect(result).toMatchObject({transactionAuthenticated:false,collisionProofAccepted:false,publicationReady:false,
      commonPublisherPreflightExecuted:false,priceCompatibilityAccepted:false,oldRegistryRowsChanged:false,
      savedRevisionMigrationPerformed:false,sourceNeedsClosed:0,newCompleteTechnicalTypes:0});
  });

  test('full composite payload retains old scope; direct source closure differs from explicit nested corroboration',()=> {
    expect(result.compositeExcerptSha256).toBe(hash(payload));
    expect(payload.retainedScopeProof.oldQuantityAdmitted).toBe(false);
    expect(payload.retainedScopeProof.oldScopePromotedToQuantitativeNorm).toBe(false);
    for(const plan of result.plans) {
      const direct = [...new Set(Object.values(plan.baseline.normative_source_ids).flat())];
      expect(direct).toContain(bindingPack.composite.sourceKey);
      expect(direct).not.toContain(payload.retainedScopeProof.sourceKey);
      for(const key of bindingPack.composite.corroboratingSourceKeys) expect(direct).not.toContain(key);
      expect(plan.bindings.filter(row=>row.locator_id === newLocatorId)).toHaveLength(1);
    }
    expect(bindingPack.productionRegistry).toStrictEqual({sourceIds:null,locatorId:null,excerptSha256:null,
      collisionStatus:'UNKNOWN',transactionAccepted:false});
  });

  test('parent/identity order cannot substitute another group or change common clone output',()=> {
    const reordered = syntheticInput();reordered.parents=[...reordered.parents].reverse();
    reordered.context.identities=[...reordered.context.identities].reverse();
    expect(prepareKnaufProtektor105922BoundSevenR1(reordered).plans).toStrictEqual(result.plans);
  });
});

type Rejection = {name:string; mutate:(input:KnaufProtektorBoundAssemblerInputR1)=>void; code:string};
const rejections:Rejection[] = [
  {name:'pointer drift',mutate:i=>{i.context.parentPointerSha256='0'.repeat(64);},code:'SELECTED_PARENT_PAIR_OR_POINTER'},
  {name:'search pair drift',mutate:i=>{i.context.parentSearchReleaseId=syntheticUuid(200);},code:'SELECTED_PARENT_PAIR_OR_POINTER'},
  {name:'actual parent semantic drift',mutate:i=>{i.parents[0]!.parent.resources[0]!.title_ru+=' changed';},
    code:'KNAUF_PROTEKTOR105922_FORWARD:EXACT_CAPTURED_PARENT_PAYLOAD_REQUIRED'},
  {name:'manifest drift',mutate:i=>{i.parents[0]!.manifest.definition_hash='0'.repeat(64);},code:'CAPTURED_MANIFEST_OR_SEARCH'},
  {name:'search document drift',mutate:i=>{i.parents[0]!.searchDocument.syntheticUnexpected=true;},code:'CAPTURED_MANIFEST_OR_SEARCH'},
  {name:'missing one of seven parents',mutate:i=>{i.parents=i.parents.slice(1);},code:'EXACT_SEVEN_PARENTS'},
  {name:'duplicate target identity',mutate:i=>{i.context.identities=[...i.context.identities.slice(0,6),i.context.identities[0]!];},code:'EXACT_SEVEN_TARGET_IDENTITIES'},
  {name:'missing supplied resource UUID',mutate:i=>{delete (i.context.identities[0]!.resourceIds as Record<string,string>)[owner];},code:'EXACT_RESOURCE_ID_MAP'},
  {name:'old resource UUID reuse',mutate:i=>{(i.context.identities[0]!.resourceIds as Record<string,string>)[owner]=i.parents[0]!.parent.resources[0]!.id;},code:'NEW_IDS_REUSED_OR_DUPLICATE'},
  {name:'noncanonical supplied UUID',mutate:i=>{i.context.identities[0]!.definitionId='F0000000-0000-5000-8000-000000000010';},code:'NEW_DEFINITION_ID'},
  {name:'old baseline key reuse',mutate:i=>{i.context.identities[0]!.baselineKey=i.parents[0]!.parent.baseline.baseline_key;},code:'BASELINE_KEY_REUSES_PARENT'},
  {name:'duplicate new baseline key',mutate:i=>{i.context.identities[1]!.baselineKey=i.context.identities[0]!.baselineKey;},code:'DUPLICATE_NEW_BASELINE_KEY'},
  {name:'missing nested declaration source',mutate:i=>{i.registry.observed.sources=i.registry.observed.sources.filter(row=>row.id!==newSourceIds[1]);},code:'NEW_SOURCE_REQUIRED:declaration'},
  {name:'new source metadata drift despite same artifact and key',mutate:i=>{i.registry.observed.sources.find(row=>row.id===newSourceIds[2])!.metadata.doesNotProve=['changed'];},code:'NEW_SOURCE_FULL_CONTENT:moisture-scope'},
  {name:'old full source created_at drift',mutate:i=>{i.registry.observed.sources[0]!.created_at='2001-01-01T00:00:00.000Z';},code:'HISTORICAL_SOURCE_CHANGED'},
  {name:'old full source metadata drift',mutate:i=>{i.registry.observed.sources[0]!.metadata.extra='changed';},code:'HISTORICAL_SOURCE_CHANGED'},
  {name:'old full locator drift',mutate:i=>{i.registry.observed.locators[0]!.locator.extra='changed';},code:'HISTORICAL_LOCATOR_CHANGED'},
  {name:'unknown full source column',mutate:i=>{(i.registry.observed.sources[0]! as unknown as Json).extra='changed';},code:'REGISTRY_SOURCE_FULL_ROW:observed'},
  {name:'composite bound to declaration',mutate:i=>{i.registry.observed.locators.find(row=>row.id===newLocatorId)!.source_id=newSourceIds[1]!;},code:'COMPOSITE_LOCATOR_IDENTITY'},
  {name:'old scope quantitative promotion inside composite',mutate:i=>{i.registry.observed.locators.find(row=>row.id===newLocatorId)!.locator.retainedScopeProof.oldQuantityAdmitted=true;},code:'COMPOSITE_FULL_PAYLOAD'},
  {name:'old candidate digest is not the new copy-corrected excerpt',mutate:i=>{i.registry.observed.locators.find(row=>row.id===newLocatorId)!.excerpt_sha256=bindingPack.historicalCompositeCanonicalDigest;},code:'COMPOSITE_CANONICAL_EXCERPT'},
  {name:'global locator key collision in a different source',mutate:i=>{const row=structuredClone(i.registry.observed.locators.find(row=>row.id===newLocatorId)!);row.id=syntheticUuid(900);row.source_id=newSourceIds[1]!;i.registry.observed.locators.push(row);},code:'COMPOSITE_LOCATOR_GLOBAL_KEY_AMBIGUOUS'},
  {name:'unknown source expansion',mutate:i=>{const row=structuredClone(i.registry.observed.sources[0]!);row.id=syntheticUuid(901);row.source_key='synthetic-unrequested-source';i.registry.observed.sources.push(row);},code:'EXACT_OBSERVED_SOURCE_SET'},
  {name:'historical locator silently omitted from both read sets',mutate:i=>{const id=i.registry.inheritedPreimage.locators[0]!.id;i.registry.inheritedPreimage.locators=i.registry.inheritedPreimage.locators.filter(row=>row.id!==id);i.registry.observed.locators=i.registry.observed.locators.filter(row=>row.id!==id);},code:'EXACT_INHERITED_LOCATOR_SET'},
  {name:'invalid evidence reference',mutate:i=>{i.context.acceptanceEvidenceSha256='not-a-hash';},code:'ACCEPTANCE_EVIDENCE_SHA256'},
];
test.each(rejections)('bound assembler rejects $name before returning publication plans',({mutate,code})=> {
  const input = syntheticInput();mutate(input);
  expect(()=>prepareKnaufProtektor105922BoundSevenR1(input)).toThrow(code);
});
