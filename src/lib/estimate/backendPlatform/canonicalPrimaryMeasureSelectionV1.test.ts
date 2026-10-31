import {PRIMARY_MEASURE_SELECTION_V1 as contract, resolvePrimaryMeasureSelectionV1 as resolve,
  type PrimaryMeasureSelectionV1, type PrimaryMeasureSelectionParameterV1} from './canonicalPrimaryMeasureSelectionV1';

// Generic fixture deliberately has no SKU or trade-specific code.
const metadata: PrimaryMeasureSelectionV1 = {contract, selectorParameterId: 'composition', selections: [
  {selectorValue: 'Existing assembly', primaryMeasureParameterId: 'q', unitId: 'point'},
  {selectorValue: 'Complete product', primaryMeasureParameterId: 'install_count', unitId: 'item'},
]};
const schema: PrimaryMeasureSelectionParameterV1[] = [
  {parameterId: 'q', valueType: 'decimal', unitId: 'point', visibilityRole: 'USER_INPUT', formulaConsumers: ['legacy:quantity']},
  {parameterId: 'composition', valueType: 'enum', visibilityRole: 'USER_INPUT',
    constraints: {values: ['Existing assembly', 'Complete product']}},
  {parameterId: 'install_count', valueType: 'integer', unitId: 'item', visibilityRole: 'USER_INPUT', formulaConsumers: ['product:quantity']},
];
const legacy = {composition: 'Existing assembly', q: '100'};
const product = {composition: 'Complete product', install_count: '3'};
const input = (submittedParameters: Record<string, unknown> = product) => ({
  selectionMetadata: metadata, parameterSchema: schema, submittedParameters,
});
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('optional conditional primary measure v1', () => {
  test('absent metadata leaves the old chooser entirely untouched', () => {
    expect(resolve({parameterSchema: [], submittedParameters: {}, explicitPrimaryMeasureParameterId: 'old:q',
      parentPrimaryMeasure: {parameterId: 'old:q', unitId: 'point'}})).toEqual({kind: 'LEGACY_PATH_UNCHANGED'});
  });
  test.each([null, {}, {contract: 'future/v2'}, [], 'q'])('present invalid metadata never falls back: %p', selectionMetadata => {
    expect(resolve({...input(), selectionMetadata})).toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'INVALID_METADATA'});
  });
  test.each([
    [legacy, {parameterId: 'q', unitId: 'point'}],
    [product, {parameterId: 'install_count', unitId: 'item'}],
  ])('resolves the selected branch and exact unit: %p', (facts, primaryMeasure) => {
    expect(resolve(input(facts))).toMatchObject({kind: 'RESOLVED', primaryMeasure});
  });
  test('product wins even when ordinal-zero q also has a historical default', () => {
    expect(resolve(input({...product, q: '100'}))).toMatchObject({kind: 'RESOLVED', primaryMeasure: {parameterId: 'install_count', unitId: 'item'}});
  });
  test('does not infer branch or product count from q', () => {
    expect(resolve(input({q: '100'}))).toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'SELECTION_REQUIRED'});
  });
  test.each(['unknown', ' Complete product', 1, false, ['Complete product']])('unknown selection %p requests clarification', composition => {
    expect(resolve(input({composition, q: '100'}))).toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'UNKNOWN_SELECTION'});
  });
  test('does not read an inherited selector property', () => {
    const facts = Object.create({composition: 'Complete product'}) as Record<string, unknown>;
    expect(resolve(input(facts))).toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'SELECTION_REQUIRED'});
  });
  test('duplicate selector branches are ambiguous even when they point at the same measure', () => {
    const m = copy(metadata); (m.selections as unknown[]).push(m.selections[1]);
    expect(resolve({...input(), selectionMetadata: m})).toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'AMBIGUOUS_METADATA'});
  });
  test('partial finite domain is rejected before a seemingly valid branch resolves', () => {
    expect(resolve({...input(legacy), selectionMetadata: {...metadata, selections: metadata.selections.slice(0, 1)}}))
      .toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'INCOMPLETE_SELECTOR_COVERAGE'});
  });
  test.each([
    {unitId: 'point'}, {valueType: 'enum'}, {visibilityRole: 'INTERNAL_ONLY'}, {formulaConsumers: []},
    {formulaConsumers: ['']}, {unitId: undefined},
  ])('a branch must target a valid connected numeric user measure: %p', patch => {
    expect(resolve({...input(), parameterSchema: schema.map(p => p.parameterId === 'install_count' ? {...p, ...patch} : p)}))
      .toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'INVALID_PRIMARY_DEFINITION'});
  });
  test('a missing primary parameter is not substituted by another numeric parameter', () => {
    expect(resolve({...input(), parameterSchema: schema.filter(p => p.parameterId !== 'install_count')}))
      .toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'INVALID_PRIMARY_DEFINITION'});
  });
  test('duplicate schema identities do not depend on insertion order', () => {
    expect(resolve({...input(), parameterSchema: [...schema, {...schema[0]!, unitId: 'item'}]}))
      .toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'INVALID_PARAMETER_SCHEMA'});
  });
  test('an unfixed text selector cannot masquerade as a finite enum', () => {
    expect(resolve({...input(), parameterSchema: schema.map(p => p.parameterId === 'composition' ? {...p, valueType: 'text'} : p)}))
      .toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'INVALID_SELECTOR_DEFINITION'});
  });
  test('explicit API primary must agree with the selected measure', () => {
    expect(resolve({...input(), explicitPrimaryMeasureParameterId: 'q'}))
      .toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'EXPLICIT_PRIMARY_MISMATCH'});
    expect(resolve({...input(), explicitPrimaryMeasureParameterId: 'install_count'})).toMatchObject({kind: 'RESOLVED'});
  });
  test('a parent in points requires a new root for item count, with no values/rows/prices carried forward', () => {
    const facts = {...product, q: '100', rowOverrides: {legacy: {quantity: '77'}}, prices: {legacy: '2'}};
    const before = copy(facts);
    expect(resolve({...input(facts), parentPrimaryMeasure: {parameterId: 'q', unitId: 'point'}})).toEqual({
      kind: 'NEW_ROOT_REQUIRED', primaryMeasure: {parameterId: 'install_count', unitId: 'item'},
      parentPrimaryMeasure: {parameterId: 'q', unitId: 'point'}, selectorParameterId: 'composition', selectorValue: 'Complete product',
      carryForward: {parameters: false, rowOverrides: false, prices: false},
      questionRu: 'У сохранённой сметы другая основная мера. Создайте новую смету и отдельно укажите её объём и цены.',
    });
    expect(facts).toEqual(before);
  });
  test('same parent measure continues the ordinary revision route', () => {
    expect(resolve({...input(legacy), parentPrimaryMeasure: {parameterId: 'q', unitId: 'point'}})).toMatchObject({kind: 'RESOLVED'});
  });
  test('editor resolves a new branch before carrying stale parent primary; server still rejects the old-primary child request', () => {
    const parentPrimaryMeasure = {parameterId: 'q', unitId: 'point'};
    // Editor intent discovery does not misrepresent the saved parent's q as a
    // fresh user choice. It proposes a new ordinary root with fresh item input.
    expect(resolve({...input(product), parentPrimaryMeasure})).toMatchObject({
      kind: 'NEW_ROOT_REQUIRED', primaryMeasure: {parameterId: 'install_count', unitId: 'item'},
      carryForward: {parameters: false, rowOverrides: false, prices: false},
    });
    // The actual existing child/API request remains strict: old explicit q is
    // not silently replaced by N, even if the editor failed to intercept it.
    expect(resolve({...input(product), parentPrimaryMeasure, explicitPrimaryMeasureParameterId: 'q'}))
      .toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'EXPLICIT_PRIMARY_MISMATCH'});
    expect(resolve({...input(legacy), parentPrimaryMeasure, explicitPrimaryMeasureParameterId: 'q'}))
      .toMatchObject({kind: 'RESOLVED', primaryMeasure: {parameterId: 'q', unitId: 'point'}});
  });
  test('same parameter id with a different parent unit also requires a new root', () => {
    expect(resolve({...input(legacy), parentPrimaryMeasure: {parameterId: 'q', unitId: 'item'}})).toMatchObject({kind: 'NEW_ROOT_REQUIRED'});
  });
  test.each([null, {}, {parameterId: 'q'}])('invalid parent %p is never silently migrated', parentPrimaryMeasure => {
    expect(resolve({...input(), parentPrimaryMeasure})).toMatchObject({kind: 'CLARIFICATION_REQUIRED', reason: 'INVALID_PARENT_PRIMARY'});
  });
  test('resolver outputs neither quantity nor price and does not mutate frozen catalog or facts', () => {
    const deepFreeze = (x: unknown): void => { if (x && typeof x === 'object') { Object.freeze(x); Object.values(x).forEach(deepFreeze); } };
    const request = copy(input({...product, q: '100'})); deepFreeze(request);
    const result = resolve(request);
    expect(result).toEqual({kind: 'RESOLVED', primaryMeasure: {parameterId: 'install_count', unitId: 'item'},
      selectorParameterId: 'composition', selectorValue: 'Complete product'});
  });

  describe('explicit derived physical measure in a selected branch', () => {
    const areaMetadata = {contract, selectorParameterId:'composition', selections:[
      metadata.selections[0]!, {selectorValue:'Measured rectangle',primaryMeasureParameterId:'area_m2',unitId:'m2'},
    ]};
    const area:PrimaryMeasureSelectionParameterV1 = {
      parameterId:'area_m2',valueType:'decimal',unitId:'m2',visibilityRole:'INTERNAL_ONLY',
      valueSourceRole:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',runtimeProfileClassification:'PRELIMINARY_SOURCE_FORMULA',
      provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
      guide:{sourceDocument:'reviewed-geometry',sourceLocator:'Rectangle length multiplied by width',sourceSnapshotHash:'a'.repeat(64)},
      normativeLinks:[{sourceId:'reviewed-geometry'}],formulaConsumers:['work:area'],
    };
    const areaSchema = [schema[0]!, {...schema[1]!,constraints:{values:['Existing assembly','Measured rectangle']}},area];
    const areaInput = {selectionMetadata:areaMetadata,parameterSchema:areaSchema,
      submittedParameters:{composition:'Measured rectangle',length_m:'10',width_m:'10',area_m2:'999'}};
    test('selects the readonly m2 identity without returning a supplied area or converting length',()=>{
      const before=copy(areaInput);
      expect(resolve(areaInput)).toEqual({kind:'RESOLVED',primaryMeasure:{parameterId:'area_m2',unitId:'m2'},
        selectorParameterId:'composition',selectorValue:'Measured rectangle'});
      expect(areaInput).toEqual(before);
    });
    test('accepts an existing compiler-owned effective output identity',()=>{
      expect(resolve({...areaInput,parameterSchema:areaSchema.map(p=>p.parameterId==='area_m2'
        ? {...p,valueSourceRole:'COMPILER_DERIVED_RESOURCE_QUANTITY',runtimeProfileClassification:undefined,guide:undefined,normativeLinks:undefined,provenance:undefined}:p)}))
        .toMatchObject({kind:'RESOLVED',primaryMeasure:{parameterId:'area_m2',unitId:'m2'}});
    });
    test.each<Partial<PrimaryMeasureSelectionParameterV1>>([
      {valueSourceRole:'UNRESOLVED_APPLICATION_NORM'}, {valueSourceRole:'BACKEND_DERIVED'},
      {runtimeProfileClassification:'ASSUMPTION'}, {provenance:{consumer_input_role_v1:'OBJECT_FACT'}},
      {guide:undefined}, {guide:{...area.guide!,sourceDocument:''}},
      {guide:{...area.guide!,sourceLocator:''}}, {guide:{...area.guide!,sourceSnapshotHash:'bad'}},
      {normativeLinks:[]}, {formulaConsumers:[]}, {unitId:'linear_m'}, {visibilityRole:'USER_DERIVED_READONLY'},
    ])('rejects an unproved derived identity %p',patch=>{
      expect(resolve({...areaInput,parameterSchema:areaSchema.map(p=>p.parameterId==='area_m2'?{...p,...patch}:p)}))
        .toMatchObject({kind:'CLARIFICATION_REQUIRED',reason:'INVALID_PRIMARY_DEFINITION'});
    });
    test('requires a fresh root when a saved length identity changes to computed area',()=>{
      expect(resolve({...areaInput,parentPrimaryMeasure:{parameterId:'length_m',unitId:'linear_m'}}))
        .toMatchObject({kind:'NEW_ROOT_REQUIRED',primaryMeasure:{parameterId:'area_m2',unitId:'m2'},
          carryForward:{parameters:false,rowOverrides:false,prices:false}});
      expect(resolve({...areaInput,explicitPrimaryMeasureParameterId:'length_m'}))
        .toMatchObject({kind:'CLARIFICATION_REQUIRED',reason:'EXPLICIT_PRIMARY_MISMATCH'});
    });
  });
});
