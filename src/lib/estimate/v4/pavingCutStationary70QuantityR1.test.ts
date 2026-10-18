import {
  evaluatePavingCutStationary70QuantitiesR1 as evaluate,
  pavingCutStationary70QuantityDefinitionR1 as definition,
  pavingCutStationary70QuantityPackR1 as pack,
  pavingCutStationary70MethodR1 as method,
  pavingCutStationary70PrefixR1 as prefix,
  pavingCutStationary70PrimaryR1 as primary,
} from './pavingCutStationary70QuantityR1';
import { pavingTileDefinitionS2754, pavingTileSourcePackS2754 } from './pavingTilePreparedBaseS2754';
import { validateCanonicalEstimateParameters } from '../backendPlatform/parameterConstraints';
import { compileFormulaGraph, evaluateFormulaGraph } from '../backendPlatform/formulaGraph';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import {
  resolveCanonicalManualPurchaseSupplyBlockV1,
  resolveCanonicalPurchaseBalanceV1,
} from '../backendPlatform/canonicalPurchaseBalanceV1';
import { assertMasterSingleDefinitionAppendSnapshotR1,
  type MasterSingleDefinitionAppendGuardInput } from '../../../../scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1';

const facts = (cutM = '12.5'): Record<string, unknown> => ({
  [primary]: cutM, paver_thickness_mm: '70', cutting_method: method,
  actual_cut_layout_reference: 'TEST_ONLY: measured cut schedule; not a real project',
  paver_70mm_product_reference: 'TEST_ONLY: exact paver70mm specification',
  stationary_cut_method_statement_reference: 'TEST_ONLY: stationary cutting method reference',
});
const quantities = (cutM: string) => Object.fromEntries(evaluate(facts(cutM)).rows.map(row => [
  row.rowIdProposal.slice(prefix.length + 1), row.quantity,
]));
const consumed = () => quantities('12.5')['diamond-disc-consumed'];
// Shared supply primitives are tested prospectively. The quantity adapter exposes NO order.
const supply = () => ({ knownDiscConsumption: consumed(), stock: '0', reserve: '0', quantum: '1' });
const declared = new Set(['knownDiscConsumption', 'stock', 'reserve', 'quantum']);
const balance = {
  unitId: 'piece', consumedExpression: 'knownDiscConsumption', stockExpression: 'stock',
  reserveExpression: 'reserve', orderQuantumExpression: 'quantum',
  manualQuantumViolationPolicy: 'retain-raw-and-block-quantum',
};
const futureOrderOwner = prefix + ':disc-order';

describe('WORK catalogue-null paving cut70 source quantities;23 prospective cases, NOT RUN by author', () => {
  it('EXACT_SOURCE_LENGTH_1', () => {
    expect(quantities('1')).toEqual({ 'whole-cutting-labor': '0.39', 'operator-information': '0.16',
      'stationary-machine-consumed': '0.16', 'diamond-disc-consumed': '0.014' });
  });

  it('EXACT_SOURCE_LENGTH_12_5', () => {
    expect(quantities('12.5')).toEqual({ 'whole-cutting-labor': '4.875', 'operator-information': '2',
      'stationary-machine-consumed': '2', 'diamond-disc-consumed': '0.175' });
  });

  it('EXACT_SOURCE_LENGTH_100', () => {
    expect(quantities('100')).toEqual({ 'whole-cutting-labor': '39', 'operator-information': '16',
      'stationary-machine-consumed': '16', 'diamond-disc-consumed': '1.4' });
  });

  it('AREA_WITHOUT_CUT_LENGTH', () => {
    const input = facts(); delete input[primary];
    expect(evaluate(input)).toMatchObject({ status: 'PROJECT_FACTS_MISSING', rows: [], missingParameterIds: [primary] });
    for (const alias of ['paving_area_m2', 'tile_density_per_m2', 'tile_count', 'point']) {
      expect(() => evaluate({ ...input, [alias]: '35.5' })).toThrow('unknown estimate parameters');
    }
    expect(definition().parameters.find(p => p.parameter_id === primary)).toMatchObject({ unit_id: 'm', default_value: null });
    expect(() => evaluate(facts('-1'))).toThrow('below minimum');
  });

  it('NO_CUT_EXISTING_PROFILE', () => {
    for (let index = 0; index < 3; index++) {
      const before = pavingTileDefinitionS2754(index), serialized = JSON.stringify(before);
      expect(before.parameters.find(p => p.parameter_id === 'no_cut_layout')?.constraints_json)
        .toMatchObject({ values: [pavingTileSourcePackS2754.noCutValue] });
      expect(() => validateCanonicalEstimateParameters(before.parameters, { paving_area_m2: '35.5', no_cut_layout: 'WITH_CUT' }))
        .toThrow('invalid enum no_cut_layout');
      evaluate(facts());
      expect(JSON.stringify(before)).toBe(serialized);
      expect(JSON.stringify(pavingTileDefinitionS2754(index))).toBe(serialized);
      expect(before.resources.some(row => row.row_id.startsWith(prefix))).toBe(false);
    }
  });

  it('HANDHELD_GRINDER_REJECTED', () => {
    expect(() => evaluate({ ...facts(), cutting_method: 'HAND_HELD_GRINDER' })).toThrow('invalid enum cutting_method');
    expect(pack.excludedColumns).toContain('27-07-005-05');
  });

  it('THICKNESS_NOT70_REJECTED', () => {
    for (const thickness of ['60', '80', '70.000001']) {
      expect(() => evaluate({ ...facts(), paver_thickness_mm: thickness })).toThrow();
    }
    expect(pack.excludedColumns).toEqual(['27-07-005-01', '27-07-005-02', '27-07-005-03',
      '27-07-005-05', '27-07-005-06', '27-07-005-07']);
  });

  it('MISSING_METHOD_OR_PRODUCT', () => {
    const input = facts(); delete input.cutting_method; delete input.paver_70mm_product_reference;
    const result = evaluate(input);
    expect(result.rows).toEqual([]);
    expect(result.missingParameterIds).toEqual(['cutting_method', 'paver_70mm_product_reference']);
    for (const id of ['cutting_method', 'paver_thickness_mm', 'actual_cut_layout_reference',
      'paver_70mm_product_reference', 'stationary_cut_method_statement_reference']) {
      expect(definition().parameters.find(p => p.parameter_id === id)).toMatchObject({ default_value: null,
        constraints_json: { requiredWhen: { kind: 'greater_than', parameterId: primary, value: 0 } } });
    }
    // Inactive zero does not invent a project confirmation or quantity default.
    expect(evaluate({ [primary]: '0' }).rows.every(row => row.quantity === '0')).toBe(true);
    expect(() => evaluate({ ...facts(), labour_rate: '0.01' })).toThrow('unknown estimate parameters');
  });

  it('MACHINE_NOMENCLATURE_UNRESOLVED', () => {
    const d = definition(), row = d.resources.find(r => r.row_id.endsWith(':stationary-machine-consumed'))!;
    expect(row.source_metadata).toMatchObject({ resource_code: '33-0667', machine_price_admission: false,
      printed_resource_name_ru: 'Станки плоскошлифовальные с прямоугольным столом и горизонтальным шпинделем высокой точности' });
    expect(row.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
    expect(evaluate(facts()).machinePriceAdmission).toBe(false);
    expect(() => evaluate({ ...facts(), approved_retail_saw: 'unproved substitute' })).toThrow('unknown estimate parameters');
  });

  it('NO_SECOND_OPERATOR_PRICE', () => {
    const r = evaluate(facts());
    expect(r.rows.find(row => row.rowIdProposal.endsWith(':operator-information'))).toMatchObject({
      quantity: '2', costTreatment: 'INFORMATIONAL_SCOPE', unitPrice: null, paymentAdmitted: false, procurementEligible: false,
    });
    expect(r.rows.filter(row => row.costTreatment === 'OWN_COST').map(row => row.rowIdProposal)).toEqual([prefix + ':whole-cutting-labor']);
    expect(() => evaluate({ ...facts(), operator_unit_price: '77' })).toThrow('unknown estimate parameters');
  });

  it('FRACTIONAL_DISC_IS_NOT_LIFETIME', () => {
    const r = evaluate(facts());
    expect(consumed()).toBe('0.175');
    expect(r).toMatchObject({ purchaseOrderOwner: null, reusableDiscLeftover: null, discUsefulLifeM: null });
    const disc = r.rows.find(row => row.rowIdProposal.endsWith(':diamond-disc-consumed'))!;
    for (const field of ['remaining', 'free', 'order', 'packages', 'stock', 'usefulLifeM']) expect(disc).not.toHaveProperty(field);
    expect(disc).toMatchObject({ procurementEligible: false, paymentAdmitted: false, unitPrice: null });
  });

  it('AGGREGATE_QUOTE_INCLUDES_BLADE', () => {
    // Quantity-only input refuses commercial assertions; it cannot erase an owner to reconcile a quote.
    const input = Object.freeze({ ...facts(), machine_quote_includes_blade: true, saved_disc_order: '1' });
    const before = JSON.stringify(input);
    expect(() => evaluate(input)).toThrow('unknown estimate parameters');
    expect(JSON.stringify(input)).toBe(before);
    expect(evaluate(facts()).purchaseOrderOwner).toBeNull();
  });

  it('AGGREGATE_QUOTE_UNKNOWN_SCOPE', () => {
    expect(() => evaluate({ ...facts(), machine_quote_price: null, machine_quote_scope: 'UNKNOWN' }))
      .toThrow('unknown estimate parameters');
    const r = evaluate(facts());
    expect(r.paymentAdmission).toBe(false);
    expect(r.purchaseOrderOwner).toBeNull();
  });

  it('WHOLE_NEW_BLADE_ORDER_PROSPECTIVE', () => {
    const b = effectivePurchaseBalanceExpressionsR1({ ownerRowId: futureOrderOwner, orderUnitId: 'piece',
      consumed: 'knownDiscConsumption', stock: 'stock', reserve: 'reserve', quantum: 'quantum' });
    const formula = compileFormulaGraph('ceil(max(0,knownDiscConsumption+reserve-stock)/quantum)*quantum');
    const order = evaluateFormulaGraph(formula, supply());
    expect(order).toBe('1');
    expect(b.owner.purchaseBalance).toMatchObject({ unitId: 'piece', consumedExpression: 'knownDiscConsumption' });
    const candidate = evaluate(facts());
    expect(candidate.purchaseOrderOwner).toBeNull();
    expect(candidate.reusableDiscLeftover).toBeNull();
    expect(candidate.rows.some(row => row.procurementEligible)).toBe(false);
  });

  it('USED_MOUNTED_BLADE_STOCK_UNKNOWN', () => {
    expect(() => evaluate({ ...facts(), mounted_used_blade_count: 1, remaining_blade_life_m: null }))
      .toThrow('unknown estimate parameters');
    expect(consumed()).toBe('0.175');
    expect(evaluate(facts()).reusableDiscLeftover).toBeNull();
  });

  it('MANUAL_ORDER_BELOW_REQUIREMENT', () => {
    // Pure shared balance contract only. No paid/procurement order is admitted by this candidate.
    const raw = Object.freeze({ quantity: '0', provenance: Object.freeze({ kind: 'manual', reason: 'TEST_ONLY saved value' }) });
    const before = JSON.stringify(raw);
    const b = resolveCanonicalPurchaseBalanceV1(balance, futureOrderOwner, 'piece', raw.quantity, supply(), declared);
    expect(b).toMatchObject({ consumed: '0.175', effectiveOrder: '0', consumptionShortage: '0.175', procurementReady: false });
    expect(JSON.stringify(raw)).toBe(before);
    expect(consumed()).toBe('0.175');
    expect(evaluate(facts()).purchaseOrderOwner).toBeNull();
  });

  it('MANUAL_FRACTIONAL_ORDER', () => {
    const raw = '0.500';
    const block = resolveCanonicalManualPurchaseSupplyBlockV1(balance, futureOrderOwner, 'piece', raw,
      { kind: 'manual', reason: 'TEST_ONLY raw saved quantity' }, supply(), declared);
    expect(block).toMatchObject({ rawManualQuantity: raw, quantum: '1', reasonCode: 'ORDER_QUANTUM_VIOLATION',
      procurementReady: false, physicalBalanceReady: false, derivedQuantityPublishable: false });
    expect(() => resolveCanonicalPurchaseBalanceV1(balance, futureOrderOwner, 'piece', raw, supply(), declared))
      .toThrow(expect.objectContaining({ code: 'ROW_AMENDMENT_INVALID' }));
  });

  it('SOURCE_CONSUMPTION_MANUAL_PIN', () => {
    expect(() => evaluate({ ...facts(), [prefix + ':diamond-disc-consumed']: '1' })).toThrow('unknown estimate parameters');
    expect(() => evaluate({ ...facts(), disc_rate_per_m: '1' })).toThrow('unknown estimate parameters');
    expect(consumed()).toBe('0.175');
  });

  it('SAVED_EXCLUSION_AND_PRELIMINARY_NEED', () => {
    const saved = Object.freeze({ rowOverrides: Object.freeze({ aggregate: Object.freeze({ includedInEstimate: false, unitPrice: '77' }) }),
      preliminaryNeeds: Object.freeze([{ row_id: 'existing-aggregate-only-fixture', title_ru: 'Сохранённое обязательство', missing_parameter_ids: ['scope'] }]) });
    const before = JSON.stringify(saved);
    // There is no saved-child/recalculate API here; historical fields are rejected intact, never consumed or migrated.
    expect(() => evaluate({ ...facts(), ...saved })).toThrow('unknown estimate parameters');
    expect(JSON.stringify(saved)).toBe(before);
    expect(evaluate(facts()).publicationAllowed).toBe(false);
  });

  it('UNKNOWN_EXTRA_QUANTITIES', () => {
    const r = evaluate(facts());
    expect(r.openNeeds.map(need => need.id)).toEqual(['stationary-equipment-source-mapping', 'blade-specification-purchase-contract',
      'site-preparation-protection-scope', 'utilities-cooling-dust-ppe', 'edge-quality-acceptance', 'waste-logistics-adjacent-reconciliation']);
    expect(r.openNeeds.every(need => need.unitId === null)).toBe(true);
    expect(r.rows).toHaveLength(4);
    expect(r.fullTechnicalAcceptance).toBe(false);
    for (const guess of ['water_l_per_m', 'energy_kwh_per_m', 'waste_trip_count', 'open_scope_qty']) {
      expect(() => evaluate({ ...facts(), [guess]: '1' })).toThrow('unknown estimate parameters');
    }
  });

  it('CURRENT_COMPATIBLE_OWNER_FOUND', () => {
    const r = evaluate(facts());
    expect(r).toMatchObject({ catalogId: null, catalogueClassification: 'PENDING_ROOT_CURRENT_SCOPE_REVIEW', publicationAllowed: false });
    expect(definition()).toMatchObject({ catalogId: null, publicationAllowed: false });
    expect(() => evaluate({ ...facts(), catalog_id: pavingTileSourcePackS2754.types[0].catalogId }))
      .toThrow('unknown estimate parameters');
    expect(pack.existingNoCutReferenceCatalogIds).toEqual(pavingTileSourcePackS2754.types.map(type => type.catalogId));
  });

  it('SOURCE_ABSENT_BUT_HEADERS_AMBIGUOUS', () => {
    expect(() => evaluate({ ...facts(), exact_source_count: 0, unresolved_candidate_headers: [] }))
      .toThrow('unknown estimate parameters');
    const r = evaluate(facts());
    expect(r.catalogId).toBeNull();
    expect(r.publicationAllowed).toBe(false);
    expect(r.catalogueClassification).toBe('PENDING_ROOT_CURRENT_SCOPE_REVIEW');
  });

  it('RACE_IDENTICAL_ARTIFACT_SOURCE_APPEARS', () => {
    // Synthetic common-guard snapshot only; reuse a known reference ID, assign NO cutting catalog ID.
    // This is not a runnable publisher config, current read, absence claim or proposed placement.
    const ref = pavingTileSourcePackS2754.types[0], groupId = 'wg:expanded:sidewalks';
    const input: MasterSingleDefinitionAppendGuardInput = {
      config: { stopCode: 'PAVING_CUT_QUANTITY_PURE_GUARD_FIXTURE', catalogId: ref.catalogId,
        parentReleaseId: 'PURE_PARENT_NOT_EXECUTABLE', parentSearchReleaseId: 'PURE_SEARCH_NOT_EXECUTABLE', sourceId: pack.sourceKeyProposal,
        catalogAppend: { capturedSourcePreimage: { sourceKey: pack.sourceKeyProposal, expected: null },
          identity: { namespace: 'global', domain: 'transport', sourceIdentity: 'krer27-2015:paving-tile:' + ref.column,
            workKey: ref.workKey, titleRu: ref.titleRu, denominatorEligible: true },
          searchPlacement: { groupMode: 'join', groupId, groupNameRu: 'Reference group fixture', domainId: 'transport', systemId: 'transport',
            subsystemId: groupId, assemblyId: groupId, workFamilyId: groupId, breadcrumb: ['Reference group fixture'],
            groupOracleDisposition: {}, membershipOrdinal: 0, independentDisposition: {}, elementType: 'WORK',
            operationKind: 'NEW_INSTALLATION', technologyVariant: 'PURE_ONLY', constructionState: 'NEW',
            normativeClassifiers: [], applicabilityTags: [], publicationState: 'ADMITTED_BACKEND', catalogOrigin: 'GLOBAL',
            adjudicationClass: 'EFFECTIVE_WORK', selectable: true } } },
      successorReleaseId: 'PURE_SUCCESSOR_NOT_EXECUTABLE', successorSearchReleaseId: 'PURE_SUCCESSOR_SEARCH_NOT_EXECUTABLE',
      compositeSourceArtifactSha256: pack.source.sha256,
    };
    const snapshot = { parent: { id: input.config.parentReleaseId, status: 'prepared', activated_at: null },
      parentSearch: { id: input.config.parentSearchReleaseId, status: 'draft', activated_at: null, sealed_at: null },
      parentTargetCount: 0, catalogDefinitionCount: 0, parentSearchTargetCount: 0, ordinalCollisionCount: 0,
      successorReleaseCount: 0, successorSearchReleaseCount: 0, identities: [], source: null,
      group: { group_id: groupId, group_name_ru: 'Reference group fixture', domain_id: 'transport', system_id: 'transport',
        subsystem_id: groupId, assembly_id: groupId, work_family_id: groupId, breadcrumb: ['Reference group fixture'] } };
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(input, snapshot)).not.toThrow();
    expect(() => assertMasterSingleDefinitionAppendSnapshotR1(input, { ...snapshot,
      source: { id: 'PURE_APPEARED_SOURCE', source_key: pack.sourceKeyProposal, artifact_sha256: pack.source.sha256 } }))
      .toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');
    expect(evaluate(facts()).catalogId).toBeNull();
  });
});
