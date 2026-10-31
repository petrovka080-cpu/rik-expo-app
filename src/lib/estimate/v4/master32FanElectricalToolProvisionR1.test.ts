import {fanPreparedOpeningReferencePublicationRequestR614 as publicationRequestR614} from '../../../../scripts/estimate/r4a13/prepareMaster32FanElectricalToolProvisionR1';
import referenceMethodR610 from '../../../../data/estimate-benchmarks/source-packs/fan-prepared-opening-reference-method-r610-r1.json';
import {fanPreparedOpeningReferenceAdmissionInputR610 as referenceInputR610} from './master32FanElectricalToolProvisionR1';
import {resolvePrimaryMeasureSelectionV1 as referencePrimaryR610} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {auditCanonicalPublisherSuccessorOperationResourcesR1 as auditPublisher} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {auditCanonicalEstimateOperationResourcesV1 as auditResources} from '../backendPlatform/canonicalEstimateOperationComposition';
import {parseCanonicalPublicResourcePresentationV1 as parse} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {manufacturerDoorFanFactoryKitsPackR1 as factoryPack} from './manufacturerDoorFanFactoryKitsR1';
import { appendMaster32FanElectricalToolProvisionR1 as append, master32FanElectricalParentR1 as parent,
  master32FanElectricalToolProvisionPackR1 as pack, assertMaster32FanElectricalToolProvisionR1 as validate,
  master32FanElectricalCompletenessR1 as completeness } from './master32FanElectricalToolProvisionR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../backendPlatform/canonicalEstimateCompileCore';
import { canonicalEstimateStableJson } from '../backendPlatform/canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from '../backendPlatform/canonicalEstimateSha256';
import { validateIndependentCompletenessMapReferences } from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

function input(choice = pack.factoryChoices[0], n = 5, f = 2): Record<string, unknown> {
  return { [pack.factorySelectorId]: choice, [pack.factoryCountId]: n,
    [pack.selectorId]: pack.selectedMethod, [pack.compatibilityId]: pack.compatibleChoice, [pack.frontCountId]: f };
}
async function compile(key: string, parameters: Record<string, unknown>, before = false,
  rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {}) {
  const d = before ? parent(key) : append(key), t = pack.targets.find(t => t.key === key)!;
  return compileCanonicalEstimateCore({ operation: 'recalculate', catalogId: t.catalogId, compilerVersion: pack.contract,
    primaryMeasureParameterId: pack.factoryChoices.includes(String(parameters[pack.factorySelectorId])) ? pack.factoryCountId : 'q',
    parameterDefinitions: [...d.parameters], formulaDefinitions: [...d.formulas], resourceDefinitions: [...d.resources],
    submittedParameters: parameters, confirmedParameters: {}, rowOverrides, priceItems: [], currencyCode: 'KGS',
    maximumResourceRows: d.resources.length, hashJson: v => canonicalEstimateSha256HexText(canonicalEstimateStableJson(v)) });
}

it.each(pack.targets.map(t => t.key))('retains exact v4 graph and all original factory owners/bindings for %s', key => {
  const a = parent(key), before = JSON.stringify(a), b = append(key, a);
  expect([a.parameters.length, a.formulas.length, a.resources.length]).toEqual([17, 99, 99]);
  expect([b.parameters.length, b.formulas.length, b.resources.length]).toEqual([23, 127, 127]);
  expect(b.parameters.slice(0, 17)).toEqual(a.parameters); expect(b.formulas.slice(0, 99)).toEqual(a.formulas);
  for (const old of a.resources) {
    const actual = b.resources.find(r => r.row_id === old.row_id)!;
    const forwarded=pack.oldNeedRowIds.includes(old.row_id);
    if (old.row_id !== pack.closedOldNeedRowId){
     if(!forwarded)expect(actual).toEqual(old);
     else {const {row_sha256:_a,resource_graph:ag,...ab}=actual,{row_sha256:_b,resource_graph:bg,...bb}=old;
      expect(ab).toEqual(bb);const {operationCompositionV1:_ao,publicResourcePresentationV1:_ap,...ar}=ag,{operationCompositionV1:_bo,publicResourcePresentationV1:_bp,...br}=bg;expect(ar).toEqual(br);}
    }
    else {
      expect(actual.formula_id).toBe(old.formula_id); expect(actual.resource_graph.costTreatment).toBe(old.resource_graph.costTreatment);
      expect(actual.cost_owner_id).toBe(old.cost_owner_id);
      const { completionNeedTransitionV1, ...source } = actual.source_metadata!;
      expect(source).toEqual(old.source_metadata);
      expect(completionNeedTransitionV1).toEqual({ featureContract: pack.contract, selectedMethodParameterId: pack.selectorId,
        resolvedOnlyForMethod: pack.selectedMethod, resolvedThroughPaidOwnerRowId: pack.ownerRowId,
        automaticLegacyPriceOrQuantityTransferAllowed: false });
    }
  }
  expect(JSON.stringify(a)).toBe(before);
  expect(() => append(key, { ...a, resources: a.resources.slice(1) })).toThrow('EXACT_FAN_V4_PARENT_REQUIRED');
});

it.each(pack.targets.flatMap(t => pack.factoryChoices.map(choice => [t.key, choice])))('matches independent whole station F2/N5 oracle for %s %s', async (key, choice) => {
  const r = await compile(key, { ...input(choice), q: 999 });
  // Literal independent inventory. Neither keys/counts nor values are generated from pack.parts.
  const expected: Record<string, string> = {
    provision: '2', stripper: '2', 'jacket-tool': '2', 'jacket-cap': '2', 'jacket-spare-blade': '2', 'needle-pliers': '2',
    'driver-slot15': '2', 'driver-slot20': '2', 'driver-slot25': '2', 'driver-slot30': '2', 'driver-ph0': '2',
    'driver-ph00': '2', 'driver-holder': '2', 'driver-ph1': '2', 'driver-ph2': '2',
    'voltage-indicator': '2', 'indicator-prods': '4', 'indicator-lead': '2', 'prod-shrouds': '4',
    prover: '2', 'prover-cells': '12', 'prover-hanger': '2', 'instrument-case': '2', 'tool-case': '2', 'clean-cloth': '2',
  };
  expect(r.rows.filter(row => row.row_id.startsWith(pack.prefix + ':'))).toHaveLength(25);
  for (const [suffix, quantity] of Object.entries(expected)) expect(r.rows.find(row => row.row_id === pack.prefix + ':' + suffix))
    .toMatchObject({ quantity, unit_id: suffix === 'provision' ? 'set' : 'item', included_in_procurement: false });
  const oldNeeds = r.preliminaryNeeds.filter(n => pack.oldNeedRowIds.includes(n.row_id));
  expect(oldNeeds.map(n => n.row_id).sort()).toEqual(pack.oldNeedRowIds.filter(id => id !== pack.closedOldNeedRowId).sort());
  expect(oldNeeds).toHaveLength(13); expect(oldNeeds.every(n => n.quantity === null)).toBe(true);
  for (const n of pack.additionalNeeds) expect(r.preliminaryNeeds.find(row => row.row_id === n.rowId)?.quantity).toBeNull();
  // The factory plastic screwdriver remains exactly N for timer and is never tool-post coverage.
  const plastic = r.rows.filter(row => row.row_id.endsWith(':setting-screwdriver'));
  expect(plastic).toHaveLength(choice.includes('без таймера') ? 0 : 1);
  for (const row of plastic) expect(row.quantity).toBe('5');
});

it.each(['method', 'compatibility', 'fronts'])('keeps old electrical aggregate when %s is absent, not zero/standard/default', async missing => {
  const p = input();
  delete p[missing === 'method' ? pack.selectorId : missing === 'compatibility' ? pack.compatibilityId : pack.frontCountId];
  const r = await compile('fan-wet', p);
  for (const id of pack.oldNeedRowIds) expect(r.preliminaryNeeds.find(n => n.row_id === id)?.quantity).toBeNull();
  expect(r.rows.some(row => row.row_id === pack.ownerRowId)).toBe(false);
  if (missing === 'fronts') expect(r.preliminaryNeeds.find(n => n.row_id === pack.ownerRowId)?.quantity).toBeNull();
});
it.each([pack.unresolvedMethod, undefined])('keeps14 old needs for ordinary factory inputs, unresolved method %s', async method => {
  const r = await compile('fan-standard', { [pack.factorySelectorId]: pack.factoryChoices[0], [pack.factoryCountId]: 5,
    ...(method ? { [pack.selectorId]: method } : {}), q: 100 });
  expect(r.rows.some(row => row.row_id.startsWith(pack.prefix + ':'))).toBe(false);
  for (const id of pack.oldNeedRowIds) expect(r.preliminaryNeeds.find(n => n.row_id === id)?.quantity).toBeNull();
});
it('does not infer dry compatible electrical workfront from wet catalog or selected factory kit', async () => {
  const p = { ...input(), [pack.compatibilityId]: pack.unconfirmedChoice };
  const r = await compile('fan-wet', p);
  expect(r.rows.some(row => row.row_id === pack.ownerRowId)).toBe(false);
  expect(r.preliminaryNeeds.find(n => n.row_id === pack.closedOldNeedRowId)?.quantity).toBeNull();
  expect(pack.compatibilityObjectFactsRu.join(' ')).toContain('Влажная зона каталога сама по себе');
  expect(pack.engineeringMethod.actualTestResultsAccepted).toBe(false);
});
it.each([0, -1, 1.5, 6, 1000001])('rejects invalid/excessive F=%s against N5', async f => {
  await expect(compile('fan-standard', input(pack.factoryChoices[0], 5, f))).rejects.toBeDefined();
});
it('rejects foreign method/object fit and protected source-norm injection', async () => {
  await expect(compile('fan-wet', { ...input(), [pack.selectorId]: 'single screwdriver' })).rejects.toBeDefined();
  await expect(compile('fan-wet', { ...input(), [pack.compatibilityId]: 'arbitrary cable or terminal' })).rejects.toBeDefined();
  await expect(compile('fan-wet', { ...input(), factory_fan_onsite_electrical_tools_quantity: 1 })).rejects.toBeDefined();
});
it('does not multiply reusable stations by serial fan count or infer future batteries/service', async () => {
  const one = await compile('fan-standard', input(pack.factoryChoices[0], 1, 1));
  const many = await compile('fan-standard', input(pack.factoryChoices[0], 100, 1));
  for (const key of ['provision', 'voltage-indicator', 'prover']) {
    expect(one.rows.find(r => r.row_id === pack.prefix + ':' + key)?.quantity).toBe('1');
    expect(many.rows.find(r => r.row_id === pack.prefix + ':' + key)?.quantity).toBe('1');
  }
  expect(many.rows.find(r => r.row_id === pack.prefix + ':prover-cells')?.quantity).toBe('6');
  for (const need of pack.additionalNeeds) expect(many.preliminaryNeeds.find(n => n.row_id === need.rowId)?.quantity).toBeNull();
});
it('has one priced provision owner, no child procurement/payment or inherited generic price', async () => {
  const provenance = { kind: 'manual' as const, reason: 'Exact initially usable station provision quote' };
  const r = await compile('fan-standard', input(), false, {
    [pack.ownerRowId]: { unitPrice: '100', provenance }, [pack.prefix + ':prover']: { unitPrice: '999', provenance },
  });
  expect(Number(r.totals.amount)).toBe(200);
  for (const part of pack.parts) {
    const row = r.rows.find(r => r.row_id === part.rowId)!;
    expect(row.included_in_estimate).toBe(false); expect(row.included_in_procurement).toBe(false);
  }
  for (const row of append('fan-standard').resources.filter(r => r.row_id.startsWith(pack.prefix + ':')))
    expect(row.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);
});
it('uses only actual F numeric dependencies for every derived edit policy and existing using operations', () => {
  for (const t of pack.targets) {
    const d = append(t.key);
    for (const r of d.resources.filter(r => r.row_id.startsWith(pack.prefix + ':') && !r.row_id.includes(':need:'))) {
      const formula = d.formulas.find(f => f.formula_id === r.formula_id)!;
      expect(formula.input_parameter_ids).toEqual([pack.frontCountId]);
      expect((r.resource_graph.derivedQuantityEditPolicyV1 as { parameterIds: string[] }).parameterIds).toEqual(formula.input_parameter_ids);
      expect(r.resource_graph.operationCompositionV1).toMatchObject({ groupId: t.groupId, operationId: pack.actualUseOperationId, operationTitleRu:'Установка и подключение вытяжного вентилятора' });
    }
  }
  const d = append('fan-standard'), id = pack.ownerRowId;
  expect(() => validate({ ...d, resources: d.resources.map(r => r.row_id === id ? { ...r, resource_graph: { ...r.resource_graph,
    derivedQuantityEditPolicyV1: { parameterIds: [pack.factoryCountId] } } } : r) }, 'fan-standard')).toThrow('DEPENDENCY_INVALID');
});
it('independently rejects missing detector/proving accessories, units, paid children and coordinated roster omission', () => {
  const d = append('fan-standard');
  for (const key of ['stripper', 'jacket-cap', 'jacket-spare-blade', 'driver-slot25', 'voltage-indicator', 'indicator-lead',
    'prod-shrouds', 'prover', 'prover-cells', 'instrument-case']) {
    expect(() => validate({ ...d, resources: d.resources.filter(r => r.row_id !== pack.prefix + ':' + key) }, 'fan-standard')).toThrow('INVENTORY');
  }
  const part = pack.parts.find(p => p.key === 'prover-cells')!;
  expect(() => validate({ ...d, resources: d.resources.map(r => r.row_id === part.rowId ? { ...r, unit_id: 'set' } : r) }, 'fan-standard')).toThrow('INVENTORY');
  expect(() => validate({ ...d, resources: d.resources.map(r => r.row_id === part.rowId ? { ...r, resource_graph: { ...r.resource_graph, costTreatment: 'OWN_COST' } } : r) }, 'fan-standard')).toThrow('INVENTORY');
  const index = pack.parts.findIndex(p => p.key === 'prover-cells'), removed = pack.parts.splice(index, 1)[0];
  try { expect(() => validate({ ...d, resources: d.resources.filter(r => r.row_id !== removed.rowId) }, 'fan-standard')).toThrow('FIXED_COMPLETE_ROSTER'); }
  finally { pack.parts.splice(index, 0, removed); }
  expect(() => validate({ ...d, parameters: d.parameters.map(p => p.parameter_id === pack.frontCountId ? { ...p, unit_id: 'm' } : p) }, 'fan-standard')).toThrow('EXPLICIT_FRONT_FACT');
});
it.each(pack.targets.map(t => t.key))('preserves all legacy quantities/titles/prices/totals for %s', async key => {
  const id = parent(key).resources[0].row_id, p = { q: 100, [pack.factorySelectorId]: 'Прежний общий расчёт' };
  const overrides = { [id]: { quantity: '7', titleRu: 'Сохранённое собственное имя', unitPrice: '120.5',
    provenance: { kind: 'manual' as const, reason: 'Prior saved revision values' } } };
  const a = await compile(key, p, true, overrides), b = await compile(key, p, false, overrides);
  expect(b.rows).toEqual(a.rows); expect(b.preliminaryNeeds).toEqual(a.preliminaryNeeds); expect(b.totals).toEqual(a.totals);
});
it('keeps all17 potential needs/source protections and no FULL, classI PE proof or timer-adjustment substitution', () => {
  for (const t of pack.targets) {
    const d = append(t.key), map = completeness(t.key);
    expect(map.unresolvedOnsiteNeedRowIds).toHaveLength(17);
    expect(map.unresolvedOnsiteNeedRowIds).toEqual(expect.arrayContaining(pack.oldNeedRowIds));
    expect(map.conditionalCompleteProvision.resolvedNeedRowIds).toEqual(['factory-fan:onsite:electrical-tools']);
    expect(map.conditionalCompleteProvision.selectedScopeUnresolvedNeedRowIds).toHaveLength(16);
    expect(map.fullTechnicalAcceptance).toBe(false); expect(map.completeInstallation).toBe(false);
    expect(validateIndependentCompletenessMapReferences({ completenessMap: map, formulaDefinitions: d.formulas, resourceDefinitions: d.resources })).toEqual([]);
    for (const n of pack.additionalNeeds) expect(d.parameters.find(p => p.parameter_id === n.parameterId)?.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
    for (const r of d.resources.filter(r => r.row_id.startsWith(pack.prefix + ':'))) {
      expect(r.title_ru).not.toMatch(/Wiha|Martindale|VI15000|PD690|T150|PRV240|KNIPEX/iu);
      expect(r.source_metadata?.actualElectricalTestsOrSafeIsolationProved).toBe(false);
    }
  }
  expect(pack.parts.some(p => /T150|PRV240|PE.continuity/iu.test(p.sourceBoundary))).toBe(false);
  expect(pack.parts.find(p => p.key === 'voltage-indicator')?.sourceBoundary).toContain('VI15000 Rev2');
  expect(pack.parts.find(p => p.key === 'prover-cells')?.perFront).toBe('6');
  expect(pack.parts.some(p => /AAA|tester-cells/.test(p.key))).toBe(false);
  expect(pack.engineeringMethod.manufacturerQuantityNormClaimed).toBe(false);
});

it.each(pack.targets.map(t=>t.key))('expands one real station into24 named resources without manufactured access/cable closure: %s',key=>{
 const d=append(key),owner=d.resources.find(r=>r.row_id===pack.ownerRowId)!;
 expect(pack.parts).toHaveLength(24);
 for(const part of pack.parts){const row=d.resources.find(r=>r.row_id===part.rowId)!;
  expect(row.title_ru).toBe(part.titleRu);expect(row.category).toBe(part.category);expect(row.unit_id).toBe(part.unitId);
  expect(row.cost_owner_id).toBe(owner.row_id);expect(row.procurement_eligible).toBe(false);
  expect(row.resource_graph.operationCompositionV1).toMatchObject({operationId:pack.actualUseOperationId,operationTitleRu:'Установка и подключение вытяжного вентилятора'});
  expect((row.resource_graph.publicResourcePresentationV1 as {resourceKind:string}).resourceKind).toBeTruthy();
 }
 for(const [key,kind] of [['stripper','TOOL'],['driver-ph1','TOOL'],['jacket-spare-blade','ACCESSORY'],['prover-cells','CONSUMABLE'],['voltage-indicator','EQUIPMENT']])
  expect(d.resources.find(r=>r.row_id===pack.prefix+':'+key)!.resource_graph.publicResourcePresentationV1).toMatchObject({resourceKind:kind});
 for(const need of pack.additionalNeeds)expect(d.resources.find(r=>r.row_id===need.rowId)!.resource_graph.operationCompositionV1).toMatchObject({operationId:need.rowId+':operation',operationTitleRu:need.titleRu});
 expect(completeness(key).conditionalCompleteProvision.resolvedNeedRowIds).toEqual([pack.closedOldNeedRowId]);
 expect(completeness(key).conditionalCompleteProvision.completeInstallation).toBe(false);
});
it.each(pack.targets.map(t=>t.key))('forwards exact retained need operation metadata and rejects old resource headings: %s',key=>{
 const d=append(key),map=completeness(key),prior=parent(key);
 for(const id of pack.oldNeedRowIds){const row=d.resources.find(r=>r.row_id===id)!,old=prior.resources.find(r=>r.row_id===id)!,entry=map.entries.find((e:{resolution?:{rowId?:string}})=>e.resolution?.rowId===id);
  expect(row.formula_id).toBe(old.formula_id);expect(row.unit_id).toBe(old.unit_id);expect(row.category).toBe(old.category);expect(row.cost_owner_id).toBe(old.cost_owner_id);
  const op=row.resource_graph.operationCompositionV1 as {operationId:string;operationTitleRu:string};
  expect(entry.requiredOperationIds).toEqual([op.operationId]);
  if(id.endsWith(':drill')||id.endsWith(':drill-bit')||id.endsWith(':marking-pencil')||id.endsWith(':screwdriver')||id.endsWith(':ppe')){
   expect(op.operationId).toBe(pack.actualUseOperationId);expect(op.operationTitleRu).toBe('Установка и подключение вытяжного вентилятора');
   const resources=d.resources.map(r=>r.row_id===id?{...r,resource_graph:{...r.resource_graph,operationCompositionV1:old.resource_graph.operationCompositionV1}}:r);
   expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:resources}).length).toBeGreaterThan(0);
  }
 }
});
it.each(pack.targets.map(t=>t.key))('preserves all arithmetic and need quantities across retained metadata forward: %s',async key=>{
 const d=append(key),old=parent(key),oldById=new Map(old.resources.map(r=>[r.row_id,r]));
 const pre=d.resources.map(r=>{const p=oldById.get(r.row_id);if(!p||!pack.oldNeedRowIds.includes(r.row_id))return r;return{...r,resource_graph:{...r.resource_graph,operationCompositionV1:p.resource_graph.operationCompositionV1,publicResourcePresentationV1:p.resource_graph.publicResourcePresentationV1}};});
 const project=(r:Awaited<ReturnType<typeof compile>>)=>({rows:r.rows.map(({row_id,quantity,unit_id,unit_price,amount,included_in_estimate,included_in_procurement})=>({row_id,quantity,unit_id,unit_price,amount,included_in_estimate,included_in_procurement})),needs:r.preliminaryNeeds.map(({row_id,quantity,need_state,missing_parameter_ids})=>({row_id,quantity,need_state,missing_parameter_ids})),totals:r.totals});
 for(const parameters of [input(),{q:5,[pack.factorySelectorId]:factoryPack.legacyChoice}]){
  const run=(resources:typeof d.resources)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:pack.targets.find(t=>t.key===key)!.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:pack.factoryChoices.includes(String(parameters[pack.factorySelectorId]))?pack.factoryCountId:'q',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:resources.length,hashJson:v=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v))});
  expect(project(await run(d.resources))).toEqual(project(await run(pre)));
 }
});
it('builds the flat prepared-opening reference directly from exact sources with all real stages and explicit object choices',()=>{
 const source=referenceMethodR610,input=referenceInputR610(source.catalogId),d=input.model,map=input.independentCompletenessMap;
 expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);
 expect(d.resources).toHaveLength(21);expect(map.entries).toHaveLength(21);expect(map.operationRoster).toHaveLength(7);
 expect(d.parameters.some(p=>p.parameter_id==='q'||p.parameter_id===factoryPack.countParameterId)).toBe(false);
 expect(d.resources.some(r=>r.row_id.startsWith('ventilation_interior_fan_install_standard_'))).toBe(false);
 const isolate=map.operationRoster.find((o:any)=>o.operationId.endsWith(':isolate'))!,connect=map.operationRoster.find((o:any)=>o.operationId.endsWith(':connect'))!,functionCheck=map.operationRoster.find((o:any)=>o.operationId.endsWith(':function-check'))!;
 expect(isolate.processOrdinal).toBeLessThan(connect.processOrdinal);expect(connect.processOrdinal).toBeLessThan(functionCheck.processOrdinal);
 expect(map.operationRoster.every((o:any)=>!o.completionCriterionRu.includes('не подтверждают'))).toBe(true);
 expect(map.operationRoster.some((o:any)=>/battery-renewal|tool-maintenance|periodic-testing/.test(o.operationId))).toBe(false);
 expect(map.operationRequirements.every((o:any)=>Object.keys(o.requirements).length===10)).toBe(true);
 expect(map.operationRequirements.flatMap((o:any)=>Object.values(o.requirements)).some((c:any)=>c.status!=='NOT_APPLICABLE'&&!(c.rowIds?.length))).toBe(false);
 expect(auditPublisher({resourceDefinitions:d.resources,independentComposition:map}).definitionAdmissionAllowed).toBe(true);
 expect(d.parameters.every(p=>p.default_value===null)).toBe(true);
 expect(d.resources.every(r=>Array.isArray(r.resource_graph.inputParameterIds)&&r.resource_graph.inputParameterIds.includes(source.projectReferenceId))).toBe(true);
 const request=publicationRequestR614();expect(request.status).toBe('STOP_SOURCE_HELD');expect(request.executableConfig).toBeNull();
 expect(request.current).toBeNull();expect(request.capturedScopedNormativeRegistry).toBeNull();
 expect(request.preparationFields.resourceDefinitions).toEqual(d.resources);
 expect(request.partialQuantityClassification).toHaveLength(5);expect(request.partialQuantityClassification.every(r=>!r.deferredProjectQuantityBasisEligible&&r.measurementUnitKnown)).toBe(true);
 expect(request.omittedModes).toEqual(['catalogAppend','retainParentBindings','reuseExistingNormativeRegistry']);
 expect(d.resources.every(r=>r.source_metadata?.automaticGenericPriceInheritanceAllowed===false)).toBe(true);
 expect(()=>referenceInputR610('canonical-work:base:ventilation_interior_fan_install_wet_zone')).toThrow('EXACT_SOURCE_SCOPE');
 const schema=d.parameters.map(p=>({parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:String(p.truth_metadata.visibility_role),constraints:p.constraints_json??{},
  formulaConsumers:d.formulas.filter(f=>f.input_parameter_ids.includes(p.parameter_id)).map(f=>f.formula_id)}));
 for(const old of ['q',factoryPack.countParameterId])expect(referencePrimaryR610({selectionMetadata:input.applicability.primaryMeasureSelectionV1,parameterSchema:schema,
  submittedParameters:input.referenceDemoInput,parentPrimaryMeasure:{parameterId:old,unitId:'set'}})).toMatchObject({kind:'NEW_ROOT_REQUIRED',carryForward:{parameters:false,rowOverrides:false,prices:false}});
});
it('runs the same ordinary core for the explicit reference demo, preserving unknown amounts and one factory procurement owner',async()=>{
 const source=referenceMethodR610,input=referenceInputR610(source.catalogId),d=input.model;
 const compiled=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:source.contract,catalogId:source.catalogId,primaryMeasureParameterId:source.primaryCountId,
  parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input.referenceDemoInput,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
 const profile=factoryPack.profiles.find(p=>p.key==='axial-100-plain')!;
 expect(compiled.rows.find(r=>r.row_id===profile.ownerRowId)?.quantity).toBe('2');
 expect(compiled.rows.filter(r=>r.included_in_procurement).map(r=>r.row_id)).toEqual([profile.ownerRowId]);
 expect(compiled.preliminaryNeeds.map(r=>r.row_id).sort()).toEqual([...source.unknownQuantityRows].sort());
 for(const need of compiled.preliminaryNeeds){expect(need.quantity).toBeNull();expect(need.unit_id).toBe(source.rows.find(row=>row.rowId===need.row_id)!.unitId);}
 for(const key of source.selectedToolKeys){const part=pack.parts.find(p=>p.key===key)!;expect(compiled.rows.find(r=>r.row_id===part.rowId)?.quantity).toBe(part.perFront);}
 const unknown=new Set(compiled.preliminaryNeeds.map(r=>r.row_id));
 const runtime=auditResources({requireIndependentComposition:true,independentComposition:input.independentCompletenessMap,
  resources:d.resources.map(r=>{const presentation=parse(r.resource_graph.publicResourcePresentationV1)!;return{rowId:r.row_id,nameRu:presentation.nameRu,sourceNameRu:r.title_ru,resourceKind:presentation.resourceKind,
   unitId:r.unit_id,operation:r.resource_graph.operationCompositionV1,publicNameVerified:true,quantityKnown:!unknown.has(r.row_id)};})});
 expect(runtime.definitionAdmissionAllowed).toBe(true);expect(runtime.completeClaimAllowed).toBe(false);expect(runtime.pdfAllowed).toBe(true);expect(runtime.issues.filter(i=>i.code==='RESOURCE_UNIT_UNRESOLVED')).toHaveLength(0);
});
