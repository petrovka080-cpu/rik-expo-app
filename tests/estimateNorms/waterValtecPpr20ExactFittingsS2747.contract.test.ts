import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VALTEC_EXACT_FITTINGS_S2747 as pack, VALTEC_EXACT_FITTINGS_S2747_PARAMETERS as parameters,
  VALTEC_EXACT_FITTINGS_S2747_RESOURCES as resources, VALTEC_EXACT_FITTINGS_S2747_SOURCE_PACK_SHA256,
  compileWaterValtecPpr20ExactFittingsS2747 as compile } from '../../src/lib/estimate/v4/waterValtecPpr20ExactFittingsS2747';
import { WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT as facts,
  WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS, compileWaterValtecPpr20StandardS2723 as previousCompile,
} from '../../src/lib/estimate/v4/waterValtecPpr20StandardS2723';
import { selectCanonicalArtifactRows, canonicalArtifactVisibleRowTitle } from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';

const selections = Object.fromEntries(pack.projectSelections.map(selection => [selection.parameterId, selection.values[0]]));

test('binds the verified immutable primary passport and precise family locators without changing any arithmetic owner', () => {
  const file = readFileSync('data/estimate-benchmarks/source-packs/water-valtec-ppr20-exact-fittings-s27-47.json');
  expect(createHash('sha256').update(file).digest('hex')).toBe(VALTEC_EXACT_FITTINGS_S2747_SOURCE_PACK_SHA256);
  expect(parameters).toHaveLength(40); expect(resources).toHaveLength(52);
  expect(WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS).toHaveLength(38);
  for (const component of [...pack.fixedComponents, ...pack.projectSelections]) {
    expect(resources.find(resource => resource.row_id === component.rowId)?.source_metadata?.normativeTrace)
      .toEqual([expect.objectContaining({ source_definition_hash: pack.artifactSha256, exact_locator: component.exactLocator })]);
  }
});

test('keeps known counts while exact project interfaces are unresolved, without guessing a purchasable model', async () => {
  const result = await compile({ ...facts });
  expect(result.rows).toHaveLength(49);
  expect(result.preliminaryNeeds).toHaveLength(3);
  for (const selection of pack.projectSelections) {
    expect(result.preliminaryNeeds.find(need => need.row_id === selection.rowId)).toMatchObject({
      quantity: String(facts[selection.countParameterId as keyof typeof facts]), need_state: 'CONDITION_REQUIRED',
      missing_parameter_ids: [selection.parameterId], selected: true,
    });
    expect(result.rows.find(row => row.row_id === selection.rowId)).toBeUndefined();
    const parameter = parameters.find(p => p.parameter_id === selection.parameterId)!;
    expect(parameter.default_value).toBeNull(); expect(parameter.required).toBe(false);
    expect(parameter.truth_metadata).toMatchObject({ value_source_role: 'CONDITIONAL_PROJECT_FACT',
      provenance: { consumer_input_role_v1: 'OBJECT_FACT' }, hidden_default_forbidden: true });
  }
});

test('does not ask fitting selection when that fitting count is explicitly zero', async () => {
  const result = await compile({ ...facts, elbow_count: 0, tee_count: 0, threaded_transition_count: 0 });
  expect(result.preliminaryNeeds).toEqual([]);
  expect(result.rows).toHaveLength(52);
  for (const selection of pack.projectSelections) expect(result.rows.find(row => row.row_id === selection.rowId)?.quantity).toBe('0');
});

test('applies every documented angle and threaded interface with identical physical quantity, water and one shared machine budget', async () => {
  const previous = await previousCompile({ ...facts });
  for (const selection of pack.projectSelections) for (const value of selection.values) {
    const submitted = { ...facts, ...selections, [selection.parameterId]: value };
    const result = await compile(submitted);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(52);
    for (const row of previous.rows) expect(result.rows.find(current => current.row_id === row.row_id)?.quantity).toBe(row.quantity);
    const selected = result.rows.find(row => row.row_id === selection.rowId)!;
    expect(selected.title_ru).toBe(value);
    expect(canonicalArtifactVisibleRowTitle(selected, submitted)).toBe(value);
    expect(selected.included_in_procurement).toBe(true);
    expect(result.rows.every(row => row.unit_price == null && row.amount == null)).toBe(true);
    expect(result.rows.filter(row => row.row_id === 'water-ppr20:04:equipment:fusion-machine'))
      .toEqual([expect.objectContaining({ quantity: '3.223333333' })]);
    expect(selectCanonicalArtifactRows(result.rows).procurementRows.some(row => row.row_id === selection.rowId)).toBe(true);
  }
});

test('rejects unsupported reductions, mixed interfaces and unverified products instead of using a generic fallback', async () => {
  for (const selection of pack.projectSelections) await expect(compile({ ...facts, ...selections,
    [selection.parameterId]: 'Произвольное изделие 25 мм' })).rejects.toThrow();
});

test('preserves size-only preliminary quantities and resolves only the corresponding selection', async () => {
  const short = await compile({ route_length_m: 100 });
  expect(short.rows).toHaveLength(34); expect(short.preliminaryNeeds).toHaveLength(18);
  const partial = await compile({ ...facts, valtec_elbow_selection: selections.valtec_elbow_selection });
  expect(partial.preliminaryNeeds.map(need => need.missing_parameter_ids).flat().sort())
    .toEqual(['valtec_tee_selection', 'valtec_thread_selection']);
});
