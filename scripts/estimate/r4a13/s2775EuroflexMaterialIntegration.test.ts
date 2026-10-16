import { createHash } from 'node:crypto';
import {
  compileEuroflexRecycling50MaterialsR1, euroflexRecycling50MaterialDefinitionR1,
  euroflexRecycling50PrimaryMeasureParameterIdR1 as primary,
  euroflexRecycling50SourcePackR1 as pack,
} from '../../../src/lib/estimate/v4/euroflexRecycling50MaterialsR1';
import { buildCanonicalRevisionIdentity } from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import { parseCanonicalPublicResourcePresentationV1 } from '../../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import { getProfessionalUnitDefinition } from '../../../src/lib/estimate/professionalUnitRegistry';
import {
  buildMasterCapabilityMatrix, buildMasterScopeReadiness,
  resolveMasterSingleDefinitionBindingRowIds, validateIndependentCompletenessMapReferences,
} from './prepareMasterSingleDefinitionSuccessorR1';
import { canonicalPublisherQuantityScopeIsConsistent } from './canonicalDefinitionPublisherR1';
import { euroflexRecycling50MaterialsS2775Config } from './prepareS2775EuroflexRecycling50Materials';

const catalogId = 'canonical-work:master:rubber_playground_surface_euroflex_recycling_50mm_rectangular';
const definition = euroflexRecycling50MaterialDefinitionR1();
const prefix = 'euroflex:recycling-50mm:';
// Explicit validation facts, never runtime object defaults.
const facts = {
  surface_length_along_rows_mm: 6000, surface_width_across_rows_mm: 4000,
  equipment_max_free_fall_height_m: 1.2,
  prepared_base_condition: pack.applicability.preparedBaseValueRu,
  fall_zone_condition: pack.applicability.fallZoneValueRu,
  full_usable_stock_pcs: 10, full_reserve_pcs: 2, full_supply_quantum_pcs: 5,
  half_usable_stock_pcs: 2, half_reserve_pcs: 1, half_supply_quantum_pcs: 4,
  full_supply_specification: 'Красная плитка 500 × 500 × 50 мм, поставка по 5 шт.',
  half_supply_specification: 'Красная половинная плитка 500 × 250 × 50 мм, поставка по 4 шт.',
};
const hashText = (value: string) => createHash('sha256').update(value).digest('hex');
const identityInput = (parameters: Record<string, unknown>) => ({
  catalogId, parentRevisionId: null,
  requestIdentity: { sourceRequestText: 'Материалы для покрытия площадки EUROFLEX Recycling 50 мм', primaryMeasureParameterId: primary },
  definition: { id: 'test-euroflex-definition', title_ru: 'Материалы покрытия EUROFLEX Recycling 50 мм', domain: 'landscaping' },
  parameterDefinitions: [...definition.parameters], parameters, effectiveUserParameters: facts,
  baselineAssumptions: {}, parent: null, searchReleaseId: 'test-only-search', compilerVersion: pack.contract, hashText,
});

describe('EUROFLEX partial material profile integration through the shared core', () => {
  it('verifies the exact publication config, two pinned primary documents and partial source closure without DB access', async () => {
    const config = euroflexRecycling50MaterialsS2775Config();
    expect(config.applicability.primaryMeasureParameterId).toBe(primary);
    expect(config.search.primaryUom).toBe('m2');
    expect(config.runtimeProfileInput).toEqual({});
    expect(config.catalogAppend?.searchPlacement.groupMode).toBe('create');
    expect(await config.verifyCore()).toMatchObject({
      status: 'GREEN_S2775_CONFIG_SOURCE_AND_PARTIAL_SCOPE_CONNECTION',
      bindingRowCount: 15, independentObligationCount: 13, unresolvedDefinitionRowCount: 9,
      measuredPrimaryUnit: 'm2', validationGeometryAreaM2: '24', fullTechnicalAcceptance: false, acceptedNewCompleteTypes: 0,
    });
  });

  it('binds the measured m2 output to revision identity and retains it on recalculation', async () => {
    const compiled = await compileEuroflexRecycling50MaterialsR1(catalogId, facts);
    expect(compiled.parameters[primary]).toBe('24');
    const identity = await buildCanonicalRevisionIdentity(identityInput(compiled.parameters));
    expect(identity).toMatchObject({ primaryMeasureParameterId: primary, primaryMeasureValue: '24', primaryMeasureUnitId: 'm2' });
    expect(identity.displayTitleRu).toContain('24 м²');
    const recalculated = await buildCanonicalRevisionIdentity({ ...identityInput(compiled.parameters),
      parentRevisionId: 'test-parent', requestIdentity: { sourceRequestText: 'Изменённый текст', primaryMeasureParameterId: 'surface_length_along_rows_mm' },
      parent: { revision_contract_version: identity.contractVersion, source_request_text: identity.sourceRequestText, primary_measure_parameter_id: primary },
    });
    expect(recalculated.primaryMeasureParameterId).toBe(primary);
    expect(recalculated.primaryMeasureUnitId).toBe('m2');
  });

  it('keeps two independent payable supply owners and eight open installation needs', async () => {
    const compiled = await compileEuroflexRecycling50MaterialsR1(catalogId, facts);
    const ownMaterials = compiled.rows.filter(row => definition.resources.some(resource => resource.row_id === row.row_id
      && resource.resource_graph.costTreatment === 'OWN_COST' && resource.category === 'material'));
    expect(ownMaterials.map(row => row.row_id).sort()).toEqual([prefix + 'full-order', prefix + 'half-order']);
    expect(compiled.preliminaryNeeds.map(need => need.row_id).sort()).toEqual(
      pack.unresolvedApplicableResourceRowIds.filter(id => id !== prefix + 'open-layout').sort());
    expect(compiled.preliminaryNeeds.every(need => need.quantity == null)).toBe(true);
    expect(definition.runtimeInput).toEqual({});
  });

  it('does not give unknown stock, reserve or supplier quantum a default', async () => {
    const compiled = await compileEuroflexRecycling50MaterialsR1(catalogId, {
      surface_length_along_rows_mm: 6000, surface_width_across_rows_mm: 4000,
    });
    for (const role of ['full', 'half']) {
      const order = compiled.preliminaryNeeds.find(need => need.row_id === prefix + role + '-order');
      expect(order).toBeDefined();
      expect(order?.quantity).toBeNull();
      expect(order?.procurement_readiness).not.toBe('READY');
      for (const suffix of ['usable_stock_pcs', 'reserve_pcs', 'supply_quantum_pcs']) {
        expect(definition.parameters.find(parameter => parameter.parameter_id === `${role}_${suffix}`)?.default_value).toBeNull();
      }
    }
  });

  it('does not manufacture an area identity while the measured geometry is absent', async () => {
    const compiled = await compileEuroflexRecycling50MaterialsR1(catalogId, {});
    expect(compiled.parameters).not.toHaveProperty(primary);
    expect(compiled.preliminaryNeeds.some(need => need.missing_parameter_ids.includes('surface_length_along_rows_mm'))).toBe(true);
    // The writer only accepts a missing identity explicitly owned by a need.
    // Geometry dependencies do not pretend that the derived area was supplied.
    await expect(buildCanonicalRevisionIdentity({ ...identityInput(compiled.parameters), preliminaryNeeds: compiled.preliminaryNeeds }))
      .rejects.toMatchObject({ code: 'PRIMARY_MEASURE_REQUIRED' });
    await expect(buildCanonicalRevisionIdentity(identityInput({}))).rejects.toMatchObject({ code: 'PRIMARY_MEASURE_REQUIRED' });
  });

  it('links thirteen independent source obligations and declares nine unresolved definition rows', () => {
    expect(pack.independentCompletenessMap.entries).toHaveLength(13);
    expect(validateIndependentCompletenessMapReferences({ completenessMap: pack.independentCompletenessMap,
      formulaDefinitions: definition.formulas, resourceDefinitions: definition.resources })).toEqual([]);
    expect(pack.unresolvedApplicableResourceRowIds).toHaveLength(9);
    expect(canonicalPublisherQuantityScopeIsConsistent({
      passport: { decision: buildMasterScopeReadiness(pack.unresolvedApplicableResourceRowIds, definition.resources),
        capability_matrix: buildMasterCapabilityMatrix(pack.unresolvedApplicableResourceRowIds, definition.resources) },
      parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources,
      baseline: { input_values: {} },
    })).toBe(true);
  });

  it('binds the independently declared fifteen calculated rows in physical resource order', () => {
    const [rowId, ...additionalRowIds] = pack.normativeBindingRowIds;
    const declared = resolveMasterSingleDefinitionBindingRowIds({ binding: { rowId, additionalRowIds, applicability: {} } }, definition.resources, ['composite-locator']);
    expect(declared).toEqual(pack.normativeBindingRowIds);
    expect(declared).toHaveLength(15);
    expect(new Set(declared).size).toBe(15);
    expect(declared.some(id => id.includes(':open-'))).toBe(false);
  });

  it('uses a public human-hour unit only for unresolved installation labor', () => {
    const labor = definition.resources.find(row => row.row_id === prefix + 'open-installation-labor')!;
    expect(labor).toMatchObject({ row_type: 'labor', unit_id: 'man_hour' });
    expect(labor.resource_graph.normalizedUom).toBe('man_hour');
    expect(definition.formulas.find(formula => formula.formula_id === labor.formula_id)?.output_unit_id).toBe('man_hour');
    expect(getProfessionalUnitDefinition('man_hour')?.displayRu).toBe('чел.-ч');
    expect(definition.parameters.find(parameter => parameter.parameter_id === 'unresolved_installation_labor')?.truth_metadata)
      .toMatchObject({ visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM' });
    for (const key of ['delivery', 'protection-cleanup', 'safety-acceptance']) {
      const service = definition.resources.find(row => row.row_id === prefix + 'open-' + key)!;
      expect(service.unit_id).toBe('service');
      expect(service.resource_graph.normalizedUom).toBe('service');
      expect(definition.formulas.find(formula => formula.formula_id === service.formula_id)?.output_unit_id).toBe('service');
    }
    expect(getProfessionalUnitDefinition('service')?.displayRu).toBe('усл.');
  });

  it('preserves ordinary Russian names, both exact factory formats and the two primary traces', () => {
    for (const resource of definition.resources) {
      const presentation = parseCanonicalPublicResourcePresentationV1(resource.resource_graph.publicResourcePresentationV1);
      expect(presentation).not.toBeNull();
      expect(presentation?.sourceTitleRu).toBe(resource.title_ru);
      expect(presentation?.nameRu).not.toMatch(/euroflex:|effective_resource_|unresolved_/u);
    }
    for (const [role, dimensions] of [['full', '500 × 500 × 50 мм'], ['half', '500 × 250 × 50 мм']]) {
      const resource = definition.resources.find(row => row.row_id === prefix + role + '-order')!;
      expect(resource.title_ru).toContain(dimensions);
      expect(resource.unit_id).toBe('pcs');
      expect(resource.source_metadata?.normativeTrace).toEqual(expect.arrayContaining(pack.sources.map(source => expect.objectContaining({
        sourceId: source.id, source_definition_hash: source.sha256, official_url: source.officialUrl,
      }))));
    }
  });
});
