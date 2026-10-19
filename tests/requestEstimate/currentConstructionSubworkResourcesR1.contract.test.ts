import {appendFloorSandSmallRoomStraightedgeR1} from '../../src/lib/estimate/v4/floorSandSmallRoomStraightedgeControlR1';
import {steelWaterDn15InstallationDefinitionR1} from '../../src/lib/estimate/v4/steelWaterDn15InstallationQuantityR1';
import {roundDuct00101QuantityDefinitionR1} from '../../src/lib/estimate/v4/galvanizedRoundDuct200Normal00101QuantityR1';
import {foundationSideHotBitumenDefinitionR1} from '../../src/lib/estimate/v4/foundationSideHotBitumenTwoCoatsKrer08R1';
import {facadeDownpipes00801QuantityDefinitionR1} from '../../src/lib/estimate/v4/facadeFlashingsWithDownpipes00801QuantityR1';
import {foundationRubblePreparationDefinitionR1} from '../../src/lib/estimate/v4/foundationRubbleSidePreparation00308CompletionR1';
import {manualBackfill06101QuantityDefinitionR1} from '../../src/lib/estimate/v4/manualBackfillSoil106101QuantityR1';
import {ceramicSkirting03904CompletionDefinitionR1} from '../../src/lib/estimate/v4/ceramicSkirting03904CompletionR1';
import {ventPitotCapProjectReferenceDefinitionR1} from '../../src/lib/estimate/v4/ventPitotPortCapsProjectPReferenceR1';
import {p31Ep341213PhysicalReferenceDefinitionR1} from '../../src/lib/estimate/v4/p31Ep341213PhysicalReferenceR1';
import {simpleCementLime01601QuantityDefinitionR1} from '../../src/lib/estimate/v4/simpleCementLimeStoneWall01601QuantityR1';
import {brickColumn00303QuantityDefinitionR1} from '../../src/lib/estimate/v4/brickRectangularColumn00303QuantityR1';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {canonicalEstimateOperationReference,canonicalEstimateResourceOperationSections} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {compileCanonicalEstimateCore} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';

const profiles:ReadonlyArray<readonly[string,()=>AutomaticOwnerDefinition]>=[
 ['floor straightedge',appendFloorSandSmallRoomStraightedgeR1],['steel DN15',steelWaterDn15InstallationDefinitionR1],
 ['round duct200',roundDuct00101QuantityDefinitionR1],['bitumen00307',foundationSideHotBitumenDefinitionR1],
 ['facade00801',facadeDownpipes00801QuantityDefinitionR1],['rubble00308',foundationRubblePreparationDefinitionR1],
 ['backfill06101',manualBackfill06101QuantityDefinitionR1],['skirting03904',ceramicSkirting03904CompletionDefinitionR1],
 ['vent project caps',ventPitotCapProjectReferenceDefinitionR1],['P31 side plates',p31Ep341213PhysicalReferenceDefinitionR1],
 ['plaster01601',simpleCementLime01601QuantityDefinitionR1],['brick columns00303',brickColumn00303QuantityDefinitionR1],
];

test.each(profiles)('%s carries every resource through the shared operation renderer without an orphan or second primary row',(_name,build)=>{
 const d=build();
 for(const resource of d.resources)expect(canonicalEstimateOperationReference(resource.resource_graph.operationCompositionV1)).not.toBeNull();
 const sections=canonicalEstimateResourceOperationSections(d.resources.map(r=>({rowId:r.row_id,titleRu:r.title_ru,operation:r.resource_graph.operationCompositionV1})));
 expect(sections.every(section=>section.operation!==null)).toBe(true);
 const primaryRows=sections.flatMap(section=>section.resourceIds);
 expect(primaryRows.slice().sort()).toEqual(d.resources.map(r=>r.row_id).sort());
 expect(new Set(primaryRows).size).toBe(d.resources.length);
 const knownRows=new Set(d.resources.map(r=>r.row_id));
 for(const section of sections)for(const shared of section.sharedResources){
  expect(knownRows.has(shared.rowId)).toBe(true);expect(section.resourceIds).not.toContain(shared.rowId);
 }
});

const simpleConfig={
 contract:'TEST_ONLY operation declaration',semanticOwner:'test:source-owner',sourceId:'test:source',normId:'test:norm',
 sourceMetadata:{source_title:'Тестовая подработка',source_document_version:'TEST_ONLY',definition_hash:'e'.repeat(64),exact_locator:'TEST_ONLY',artifact_sha256:'e'.repeat(64)},
 applicabilityRu:'TEST_ONLY exact compiler regression',ordinary:[{id:'q',title:'Фактический объём',valueType:'decimal' as const,unitId:'m2',kind:'ordinary' as const,min:0}],profile:[],conditional:[],
 rows:[{rowId:'test:whole-labor',formulaId:'test:formula',title:'Общий труд',section:'Тест',category:'labor',unitId:'man_hour',expression:'q*2',procurement:false}],excludedUnownedAssumptions:[],
};
test('existing callers retain their graph and receive no invented operation without an explicit source opt-in',()=>{
 const d=buildAutomaticConstructionOwnerR1(simpleConfig);expect(d.resources[0]!.resource_graph).not.toHaveProperty('operationCompositionV1');
});
test('operation metadata preserves actual shared-core quantity, price, total and resource identity',async()=>{
 const before=buildAutomaticConstructionOwnerR1(simpleConfig),after=buildAutomaticConstructionOwnerR1({...simpleConfig,operationCompositionGroupId:'test:source-owner'});
 expect(after.parameters).toEqual(before.parameters);expect(after.formulas).toEqual(before.formulas);expect(after.runtimeInput).toEqual(before.runtimeInput);
 const compile=(d:AutomaticOwnerDefinition)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:'canonical-work:test:operation',compilerVersion:'TEST_ONLY',primaryMeasureParameterId:'q',
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{q:'3'},confirmedParameters:{},
  rowOverrides:{'test:whole-labor':{unitPrice:'17',provenance:{kind:'manual',reason:'TEST_ONLY'}}},priceItems:[],currencyCode:'KGS',maximumResourceRows:1,hashJson:async x=>estimateDeterministicHash(x)});
 const a=await compile(before),b=await compile(after);expect(b.rows).toHaveLength(1);expect(b.rows[0]).toMatchObject({row_id:'test:whole-labor',quantity:'6',unit_price:'17',amount:'102'});
 expect(b.totals).toEqual(a.totals);expect(b.preliminaryNeeds).toEqual(a.preliminaryNeeds);
 expect(canonicalEstimateOperationReference((b.rows[0]!.calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph.operationCompositionV1)).not.toBeNull();
});
