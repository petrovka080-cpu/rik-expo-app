import {appendFloorSandSmallRoomStraightedgeR1, floorSandStraightedgeSyntheticFactsR1} from '../../lib/estimate/v4/floorSandSmallRoomStraightedgeControlR1';
import {floorSandThicknessControlSyntheticFactsR1} from '../../lib/estimate/v4/floorSandThicknessControlSpKr65R1';
import {buildMasterParameterCalculationConsumers} from '../../lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import type {CanonicalEstimateCatalogItem} from '../../lib/estimate/backendPlatform/contracts';
import {buildConsumerCanonicalPrecompileParameterSession} from './consumerCanonicalParameterEditor';
import {buildCanonicalParameterCards} from '../../lib/estimatePresentation/buildCanonicalParameterCards';
import {isCanonicalEstimateConsumerSuppliedParameter} from '../../lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
import {buildConsumerRepairCanonicalSessionPreview} from './consumerRepairCanonicalSessionPreview';

const definition=appendFloorSandSmallRoomStraightedgeR1();
const consumers=buildMasterParameterCalculationConsumers(definition);
const schema=definition.parameters.map(parameter=>{
 const t=parameter.truth_metadata as Record<string,any>,g=t.guide;
 return {parameterId:parameter.parameter_id,ordinal:parameter.ordinal,valueType:parameter.value_type,
  unitId:parameter.unit_id,titleRu:parameter.title_ru,required:parameter.required,defaultValue:null,
  constraints:parameter.constraints_json,semanticParameterKey:t.semantic_parameter_key,
  visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,
  requiredWhen:t.required_when,visibleWhen:t.visible_when,
  formulaConsumers:consumers.formulaConsumers[parameter.parameter_id],resourceBranchConsumers:consumers.resourceConsumers[parameter.parameter_id],
  guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,
   sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,
   guideShortRu:g.guide_short_ru,guideVersion:g.guide_version,applicability:g.applicability,verifiedAt:g.verified_at},
 } as CanonicalEstimateCatalogItem['parameterSchema'][number];
});
const catalog:CanonicalEstimateCatalogItem={catalogId:'canonical-work:master:floor_sand_underlayer_krer11_01_002_01',
 releaseId:'test-only-release',namespace:'global',workKey:'floor-sand',titleRu:'Песчаное основание',domain:'construction',
 definitionVersion:3,applicability:{},professionalMetadata:{},parameterSchema:schema};
const session=(parameters:Record<string,unknown>={})=>buildConsumerCanonicalPrecompileParameterSession({catalog,
 draftId:'CONTROL_ONLY_floor_questions',parameters:parameters as never,missingParameterIds:[],
 userExplicitParameterIds:Object.keys(parameters),textExtractedParameterIds:[]});
const cards=(parameters:Record<string,unknown>={})=>buildCanonicalParameterCards({session:session(parameters),revision:null});

test('both optional control choices are reachable before a measurement is invented',()=>{
 const initial=cards();
 for(const key of ['floor_sand_thickness_control_option','floor_sand_straightedge_option']){
  const card=initial.find(c=>c.key===key)!;
  expect(card).toBeDefined();expect(card.value).toBeNull();expect(card.editable).toBe(true);
  expect(card.missing).toBe(true);expect(card.requiredFor).toBe('better_accuracy');
  expect(card.choices?.some(c=>c.labelRu==='Данных пока нет или условия другие')).toBe(true);
  expect(card.guideShortRu).toMatch(/если/iu);
 }
 expect(initial.some(c=>c.key==='floor_sand_straightedge_observed_maximum_gap_mm')).toBe(false);
});

test('a chosen recorded branch exposes its actual object, plan and journal references with plain guidance',()=>{
 const facts={...floorSandThicknessControlSyntheticFactsR1('40','100'),...floorSandStraightedgeSyntheticFactsR1(true)};
 const shown=cards(facts);
 for(const key of ['floor_sand_control_room_reference','floor_sand_control_plan_reference',
  'floor_sand_straightedge_room_reference','floor_sand_straightedge_plan_reference',
  'floor_sand_straightedge_visual_reference','floor_sand_straightedge_journal_reference','floor_sand_straightedge_device_reference']){
  const card=shown.find(c=>c.key===key)!;expect(card).toBeDefined();expect(card.editable).toBe(true);
  expect(card.inputKind).toBe('text');expect(card.guideShortRu).toMatch(/например|Укажите/u);
  expect(card.labelRu.length).toBeLessThan(80);
 }
 const gap=shown.find(c=>c.key==='floor_sand_straightedge_observed_maximum_gap_mm')!;
 expect(gap.labelRu).toBe('Какой наибольший просвет измерен?');
 expect(gap.guideShortRu).toContain('Не подставляйте допустимое значение');
});

test('choosing unknown scope hides conditional measurement questions without supplying a default',()=>{
 const saved=session({...floorSandThicknessControlSyntheticFactsR1(),...floorSandStraightedgeSyntheticFactsR1(true)});
 const preview=buildConsumerRepairCanonicalSessionPreview({session:saved,draftValues:{
  floor_sand_thickness_control_option:'OTHER_OR_UNCONFIRMED_CONTROL_SCOPE',
  floor_sand_straightedge_option:'OTHER_OR_UNCONFIRMED_STRAIGHTEDGE_SCOPE'}})!;
 const shown=buildCanonicalParameterCards({session:preview,revision:null});
 expect(shown.some(c=>c.key==='floor_sand_straightedge_observed_maximum_gap_mm')).toBe(false);
 expect(shown.some(c=>c.key==='floor_sand_control_room_area_m2')).toBe(false);
 expect(shown.find(c=>c.key==='floor_sand_straightedge_option')?.value).toBe('OTHER_OR_UNCONFIRMED_STRAIGHTEDGE_SCOPE');
});

test('bound object guides cannot expose a professional norm or a generated quantity',()=>{
 const choice=schema.find(p=>p.parameterId==='floor_sand_straightedge_option')!;
 for(const patch of [{valueSourceRole:'UNRESOLVED_APPLICATION_NORM'},{valueSourceRole:'MANDATORY_NORM_VALUE'},
  {visibilityRole:'INTERNAL_ONLY'},{parameterId:'quantity_straightedge'},
  {guide:{...choice.guide,guideKind:'DERIVED_VALUE_RULE'}},{guide:{...choice.guide,sourceSnapshotHash:'unbound'}}]){
  expect(isCanonicalEstimateConsumerSuppliedParameter({...choice,...patch} as never)).toBe(false);
 }
});
