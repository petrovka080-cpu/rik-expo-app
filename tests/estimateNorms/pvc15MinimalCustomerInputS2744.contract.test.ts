import { PVC15_MINIMAL_INPUT_DEFINITION_S2744 as definition, PVC15_CUSTOMER_FACT_IDS_S2744 } from '../../src/lib/estimate/v4/pvcRoofMinimalCustomerInputS2744';
import { PVC15_BASE, PVC15_SYSTEM } from '../../src/lib/estimate/v4/pvcRoofMembraneFullCompositionS2743';
import { compileAutomaticConstructionOwnerR1 } from '../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import { PVC15_FIELD_TRANSITION_DEFINITION_S2743 as historical } from '../../src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743';
import { buildConsumerCanonicalParameterSession } from '../../src/features/consumerRepair/consumerCanonicalParameterEditor';
import { buildMasterParameterCalculationConsumers } from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import type { CanonicalEstimateCatalogItem } from '../../src/lib/estimate/backendPlatform/contracts';
import type { CanonicalEstimateParameterSessionRevision } from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';
import { consumerCanonicalInheritedRecalculationInputs, consumerCanonicalExplicitAutomaticParameters } from '../../src/features/consumerRepair/consumerCanonicalReleaseMigration';
import { pvc15MinimalCustomerInputPublishConfigS2744 } from '../../scripts/estimate/r4a13/prepareS2744Pvc15MinimalCustomerInput';
import { pvc15OrdinaryQueryAliasesS2745 } from '../../scripts/estimate/r4a13/prepareS2745Pvc15SearchAliases';
import { buildCanonicalRevisionCommitPayload } from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import { mergeCanonicalEffectiveResourceQuantityProvenanceV1 } from '../../src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1';
import { buildCanonicalParameterCards } from '../../src/lib/estimatePresentation/buildCanonicalParameterCards';
import { canonicalArtifactPurchaseRequirement } from '../../src/lib/estimate/backendPlatform/canonicalPersistedPurchaseBalance';
import { buildCanonicalProfessionalPdfProjection } from '../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import { canonicalArtifactPreliminaryNeeds } from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';

const compile = (input: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({ definition,
  catalogId: 'canonical-work:base:roofing_interior_flat_roof_install_standard', primaryMeasureParameterId: 'area_m2', compilerVersion: 'minimal-input-control', submittedParameters: input });
describe('PVC15 size and object facts instead of a technical questionnaire', () => {
  test('preserves known consumption in the same saved need and PDF while leaving stock, packaging, order and cost unresolved', async () => {
    const result = await compile({ area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.verified, pvc15_base: PVC15_BASE.eps,
      edge_rail_length_m: 36, detail_membrane_mode: 'NOT_REQUIRED', pvc15_joint_transition_scope: 'Переход ПВХ–битум вне выбранного участка' });
    const demand = (id: string) => result.preliminaryNeeds.find(need => need.row_id === id)!;
    for (const [id, quantity] of [['rc09:reinforced_pvc_roof_membrane_1_5mm', '86.25'],
      ['rc09:pvc_membrane_telescopic_fastener', '300'], ['pvc15:separation:glass', '88.5']] as const) {
      const saved = demand(id);
      expect(saved.quantity).toBeNull();
      const requirement = canonicalArtifactPurchaseRequirement(saved);
      expect(requirement).toMatchObject({ quantity, conditional: false, labelRu: 'Предварительный расход' });
      expect(requirement).not.toHaveProperty('stock');
      expect(requirement).not.toHaveProperty('effectiveOrder');
    }
    const revision = { id: 'saved', release_id: 'current', catalog_id: 'PVC15',
      checksum_sha256: 'a'.repeat(64), row_count: result.rows.length, totals: result.totals, currency_code: 'KGS', input_parameters: result.parameters,
      amendment_contract: { parameterSources: { preliminaryNeeds: result.preliminaryNeeds } } };
    const pdf = buildCanonicalProfessionalPdfProjection({ revision, expectedProjectedRowCount: result.rows.length,
      rows: result.rows, preliminaryNeeds: canonicalArtifactPreliminaryNeeds(revision), workTitleRu: 'ПВХ-мембрана 75 м²' });
    expect(pdf.html).toContain('Предварительный расход: 86,25 м²');
    expect(pdf.html).toContain('Предварительный расход: 300 шт.');
    expect(pdf.html).toContain('Предварительный расход: 88,5 м²');
    expect(pdf.html).toContain('Точный заказ ещё не подтверждён');
    expect(result.rows.some(row => row.included_in_procurement)).toBe(false);
  });
  test('stores automatic quantities separately from facts and recomputes them after an area change', async () => {
    const facts = { area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.verified };
    const compiled = await compile(facts);
    const userParameters = mergeCanonicalEffectiveResourceQuantityProvenanceV1({ parameterDefinitions: definition.parameters,
      resourceDefinitions: definition.resources, formulaDefinitions: definition.formulas,
      userParameters: facts, derivedParameters: compiled.derivedParameters, separateDerivedProvenance: true });
    const payload = buildCanonicalRevisionCommitPayload({ rowCount: compiled.rows.length, currencyCode: 'KGS', totals: compiled.totals,
      checksumSha256: 'test', compilerVersion: 'test', parameters: compiled.parameters, baselineAssumptions: {},
      effectiveUserParameters: userParameters, derivedParameters: compiled.derivedParameters,
      parentRevisionId: 'existing', approvedTemplateBaselineId: null, identityContract: {} });
    expect(payload.parameterSources).toMatchObject({ userParameters: facts,
      derivedParameters: { pvc15_membrane_consumption_m2: '86.25', telescopic_fastener_quantity_piece: '300' } });
    expect(userParameters).not.toHaveProperty('pvc15_membrane_consumption_m2');
    const changed = await compile({ ...userParameters, area_m2: 154 });
    expect(changed.parameters.pvc15_membrane_consumption_m2).toBe('177.1');
    expect(changed.parameters.telescopic_fastener_quantity_piece).toBe('616');
    expect((await compile({ ...userParameters, pvc15_membrane_consumption_m2: 80.5 })).derivedParameters)
      .not.toHaveProperty('pvc15_membrane_consumption_m2');
  });
  test('retains existing search terms while adding ordinary roof queries only to existing PVC15 members', () => {
    const patch = pvc15OrdinaryQueryAliasesS2745({ catalog_id: 'canonical-work:base:roofing_interior_flat_roof_install_small_area',
      aliases: ['existing alias'], normalized_search_terms: ['existing alias'] });
    expect(patch.aliases).toContain('existing alias');
    expect(patch.searchTerms).toEqual(expect.arrayContaining(['existing alias', 'пвх кровля', 'пвх мембрана 1 5 мм']));
    expect(() => pvc15OrdinaryQueryAliasesS2745({ catalog_id: 'unrelated', aliases: [], normalized_search_terms: [] }))
      .toThrow('PVC15_SEARCH_TARGET_SCOPE');
  });
  test.each([75, 154, 5000])('automatically calculates the primary-source preliminary membrane and whole fastener demand for %s m²', async area => {
    const result = await compile({ area_m2: area, pvc15_system_profile: PVC15_SYSTEM.verified });
    expect(Number(result.parameters.pvc15_membrane_consumption_m2)).toBeCloseTo(area * 1.15, 9);
    expect(Number(result.parameters.telescopic_fastener_quantity_piece)).toBe(Math.ceil(area * 4));
    expect(result.parameters.reinforced_membrane_designation).toContain('LOGICROOF V-RP');
    expect(result.parameters).not.toHaveProperty('edge_rail_length_m');
    expect(result.parameters).not.toHaveProperty('hot_air_welder_machine_h');
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.rows.some(row => row.included_in_procurement)).toBe(false);
    for (const id of ['pvc15:labor:layout', 'pvc15:labor:fastening', 'pvc15:labor:welding']) {
      expect(result.rows.find(row => row.row_id === id)).toMatchObject({ quantity: String(area), unit_id: 'm2', unit_price: null, included_in_procurement: false });
    }
  });
  test('applies the glass-mat coefficient only to the compatible substrate and retains a project override', async () => {
    expect((await compile({ area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.verified, pvc15_base: PVC15_BASE.eps })).parameters.pvc15_separation_area_m2).toBe('88.5');
    expect((await compile({ area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.verified, pvc15_base: PVC15_BASE.mineral })).parameters).not.toHaveProperty('pvc15_separation_area_m2');
    const custom = await compile({ area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.verified, pvc15_membrane_consumption_m2: 80.5, telescopic_fastener_quantity_piece: 324 });
    expect(custom.parameters.pvc15_membrane_consumption_m2).toBe(80.5);
    expect(custom.parameters.telescopic_fastener_quantity_piece).toBe(324);
    const manual = custom.preliminaryNeeds.find(need => need.row_id === 'rc09:reinforced_pvc_roof_membrane_1_5mm')!;
    expect(canonicalArtifactPurchaseRequirement(manual)).toMatchObject({ quantity: '80.5', labelRu: 'Расход по расчёту' });
    expect(canonicalArtifactPurchaseRequirement(manual)).not.toHaveProperty('preliminaryParameterIds');
    expect((await compile({ area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.other })).parameters).not.toHaveProperty('pvc15_membrane_consumption_m2');
  });
  test('keeps only actual dimensions and scope choices customer-owned; no hours, product passports, stocks or norm inputs', () => {
    const customer = definition.parameters.filter(p => p.truth_metadata.visibility_role === 'USER_INPUT'
      && !['NORM_REQUIRED_BUT_PROJECT_SELECTED', 'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE'].includes(String(p.truth_metadata.value_source_role)));
    expect(customer.map(p => p.parameter_id)).toEqual(expect.arrayContaining(['area_m2', 'pvc15_base', 'edge_rail_length_m', 'detail_membrane_mode', 'pvc15_joint_transition_scope']));
    expect(customer.every(p => PVC15_CUSTOMER_FACT_IDS_S2744.includes(p.parameter_id))).toBe(true);
    expect(customer.length).toBeLessThanOrEqual(8);
    expect(historical.runtimeInput).toEqual({});
    expect(historical.parameters.find(p => p.parameter_id === 'telescopic_fastener_quantity_piece')!.truth_metadata).not.toHaveProperty('preliminary_value_formula_v1');
  });
  test('continues to reject fractional fastening counts and never fabricates physical purchase or prices', async () => {
    await expect(compile({ area_m2: 75, telescopic_fastener_quantity_piece: '324.5' })).rejects.toMatchObject({ code: 'PARAMETER_VALIDATION_FAILED' });
    const result = await compile({ area_m2: 75 });
    expect(result.parameters).not.toHaveProperty('reinforced_membrane_quantity_m2');
    expect(result.parameters).not.toHaveProperty('pvc15_supply_rc09_reinforced_pvc_roof_membrane_1_5mm_stock');
    expect(result.rows.every(row => row.unit_price == null)).toBe(true);
    await expect(compile({ area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.verified, reinforced_membrane_designation: 'произвольное изделие' }))
      .rejects.toMatchObject({ code: 'SOURCE_MANAGED_PARAMETER_OVERRIDE_NOT_ALLOWED' });
  });
  test('an explicit unknown substrate remains unknown without deleting the necessary separation branch', async () => {
    const unknown = 'Не знаю — требуется уточнение по объекту';
    const result = await compile({ area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.verified, pvc15_base: unknown });
    expect(result.parameters.pvc15_base).toBe(unknown);
    expect(result.parameters).not.toHaveProperty('pvc15_separation_area_m2');
    expect(result.preliminaryNeeds.some(need => need.row_id.startsWith('pvc15:separation:') && need.missing_parameter_ids.includes('pvc15_base'))).toBe(true);
    expect((await compile({ area_m2: 75, pvc15_system_profile: unknown })).parameters).not.toHaveProperty('pvc15_membrane_consumption_m2');
  });
  test('projects a size-only calculation into five object questions and does not resubmit automatic quantities as user facts', async () => {
    const short = await compile({ area_m2: 75 });
    expect(short.parameters).not.toHaveProperty('pvc15_system_profile');
    expect(short.parameters).not.toHaveProperty('pvc15_membrane_consumption_m2');
    const result = await compile({ area_m2: 75, pvc15_system_profile: PVC15_SYSTEM.verified });
    const consumers = buildMasterParameterCalculationConsumers({ parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources });
    const catalog = { catalogId: 'canonical-work:base:roofing_interior_flat_roof_install_standard', releaseId: 'current',
      workKey: 'roofing_interior_flat_roof_install_standard', definitionVersion: 5,
      parameterSchema: definition.parameters.map(p => {
        const guide = p.truth_metadata.guide as Record<string, string>;
        return { parameterId: p.parameter_id, ordinal: p.ordinal, valueType: p.value_type, unitId: p.unit_id, titleRu: p.title_ru,
          required: p.required, defaultValue: p.default_value, constraints: p.constraints_json,
          visibilityRole: p.truth_metadata.visibility_role, valueSourceRole: p.truth_metadata.value_source_role,
          runtimeProfileClassification: p.truth_metadata.runtime_profile_classification,
          requiredWhen: p.constraints_json?.requiredWhen, formulaConsumers: consumers.formulaConsumers[p.parameter_id],
          resourceBranchConsumers: consumers.resourceConsumers[p.parameter_id], guide: { guideKind: guide.guide_kind,
            guideValidationPolicy: guide.guide_validation_policy, sourceRole: guide.source_role, sourceDocument: guide.source_document,
            sourceLocator: guide.source_locator, sourceSnapshotHash: guide.source_snapshot_hash, guideShortRu: guide.guide_short_ru } };
      }) } as unknown as CanonicalEstimateCatalogItem;
    const current: CanonicalEstimateParameterSessionRevision = { revisionId: 'preview', releaseId: 'current', catalogId: catalog.catalogId, parameters: result.parameters,
      userInputSnapshot: { area_m2: 75 }, createdAt: '2026-10-07T00:00:00Z',
      parentRevisionId: null, definitionVersionId: 'definition', definitionVersion: 5, status: 'ready',
      acceptedBaselineSnapshot: {}, assumptionSnapshot: {},
      parameterSchemaHash: 's2744-schema', compilerVersion: 'minimal-input-control', checksumSha256: 'a'.repeat(64),
      preliminaryNeeds: result.preliminaryNeeds.map(n => ({ rowId: n.row_id, selected: n.selected, missingParameterIds: n.missing_parameter_ids,
        quantity: n.quantity, needState: n.need_state })) };
    const session = buildConsumerCanonicalParameterSession({ catalog, revision: current, draftId: 'short-normal-request' });
    const initialSession = buildConsumerCanonicalParameterSession({ catalog, revision: { ...current, parameters: short.parameters,
      preliminaryNeeds: short.preliminaryNeeds.map(n => ({ rowId: n.row_id, selected: n.selected, missingParameterIds: n.missing_parameter_ids, quantity: n.quantity, needState: n.need_state })) }, draftId: 'size-only-request' });
    expect([...initialSession.blockingMissingParameterIds].sort()).toEqual(['detail_membrane_mode', 'edge_rail_length_m', 'pvc15_base', 'pvc15_system_profile', 'pvc15_joint_transition_scope'].sort());
    expect([...session.blockingMissingParameterIds].sort()).toEqual(['detail_membrane_mode', 'edge_rail_length_m', 'pvc15_base', 'pvc15_joint_transition_scope'].sort());
    expect(session.parameters.find(p => p.parameterId === 'pvc15_membrane_consumption_m2')).toMatchObject({ value: 86.25, source: 'ASSUMED' });
    expect(buildCanonicalParameterCards({ session, revision: null }).find(card => card.key === 'pvc15_membrane_consumption_m2'))
      .toMatchObject({ value: 86.25, source: 'catalog_default', editable: true });
    const changed = await compile({ area_m2: 154, pvc15_system_profile: PVC15_SYSTEM.verified });
    const changedSession = buildConsumerCanonicalParameterSession({ catalog, revision: { ...current, parameters: changed.parameters,
      userInputSnapshot: { area_m2: 154, pvc15_system_profile: PVC15_SYSTEM.verified }, parentRevisionId: current.revisionId },
      parent: { revisionId: current.revisionId, releaseId: current.releaseId, catalogId: current.catalogId, parameters: result.parameters }, draftId: 'size-only-request' });
    expect(changedSession.parameters.find(p => p.parameterId === 'telescopic_fastener_quantity_piece')).toMatchObject({ value: 616, source: 'ASSUMED' });
    expect(changedSession.parameters.find(p => p.parameterId === 'pvc15_membrane_consumption_m2')).toMatchObject({ value: 177.1, source: 'ASSUMED' });
    const projectOverride = buildConsumerCanonicalParameterSession({ catalog, revision: { ...current, parameters: { ...changed.parameters, pvc15_membrane_consumption_m2: 180 },
      userInputSnapshot: { area_m2: 154, pvc15_membrane_consumption_m2: 180 } }, draftId: 'project-override' });
    expect(projectOverride.parameters.find(p => p.parameterId === 'pvc15_membrane_consumption_m2')).toMatchObject({ value: 180, source: 'USER_EXPLICIT' });
    expect(session.parameters).not.toEqual(expect.arrayContaining([expect.objectContaining({ parameterId: 'hot_air_welder_machine_h', value: null })]));
    const inherited = consumerCanonicalInheritedRecalculationInputs(current, catalog);
    expect(inherited).not.toHaveProperty('pvc15_membrane_consumption_m2');
    expect(inherited.area_m2).toBe(75);
    expect(consumerCanonicalInheritedRecalculationInputs({ ...current, userInputSnapshot: { area_m2: 75, pvc15_membrane_consumption_m2: 86.25 } }, catalog))
      .toHaveProperty('pvc15_membrane_consumption_m2', '86.25');
    expect(consumerCanonicalExplicitAutomaticParameters(catalog, { ...inherited, pvc15_membrane_consumption_m2: '86.25' }, inherited))
      .not.toHaveProperty('pvc15_membrane_consumption_m2');
  });
  test.each(['standard', 'small_area', 'large_area'])('preflights the shared %s binding without publishing or treating the fixture as a default', async variant => {
    const config = pvc15MinimalCustomerInputPublishConfigS2744({ definition: 'current', search: 'current-search' }, variant);
    expect(config.catalogAppend).toBeUndefined();
    expect(config.parameterDefinitions).toBe(definition.parameters);
    expect(config.runtimeProfileInput).toEqual(definition.runtimeInput);
    expect(await config.verifyCore()).toMatchObject({ completeRows: 26, fixturesAreNotDefaults: true, sourceGapsRetained: true, acceptedNewTypeDelta: 0 });
  });
});
