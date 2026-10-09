import { CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT } from "./catalogFirstEstimateMinimumInputAudit.shared";
import {
  canonicalPublisherEffectivePriceKey,
  canonicalPublisherPriceBindingIsCompatible,
} from "./canonicalDefinitionPublisherR1";
import {
  buildMasterParameterCalculationConsumers,
  buildMasterCapabilityMatrix,
  resolveMasterSingleDefinitionNextCounts,
  validateIndependentCompletenessMapReferences,
} from "./prepareMasterSingleDefinitionSuccessorR1";

describe('preliminary publisher capability boundary', () => {
  it('persists named unresolved resources without declaring the applicable scope complete', () => {
    const matrix = buildMasterCapabilityMatrix(['installation'], [{ row_id: 'base' }, { row_id: 'installation' }]);
    expect(matrix.find(entry => entry.capability === 'FULL_APPLICABLE_SCOPE')).toEqual({
      capability: 'FULL_APPLICABLE_SCOPE', status: 'NEEDS_SOURCE', unresolvedResourceRowIds: ['installation'], preliminaryCompositionOnly: true,
    });
    expect(matrix.find(entry => entry.capability === 'PRICE')?.status).toBe('GREEN_UNKNOWN_IS_NULL');
    expect(buildMasterCapabilityMatrix(undefined, [])[2]).toEqual({ capability: 'FULL_APPLICABLE_SCOPE', status: 'GREEN' });
  });
  it('rejects an empty, missing or duplicate unresolved row claim', () => {
    for (const rows of [[], ['absent'], ['installation', 'installation']]) {
      expect(() => buildMasterCapabilityMatrix(rows, [{ row_id: 'installation' }])).toThrow('MASTER_LIMITED_SCOPE');
    }
  });
});

describe("master publisher calculation consumers without DB publication", () => {
  it("uses formula, resource fact/title gates and inclusion controls, not invented consumers", () => {
    expect(buildMasterParameterCalculationConsumers({
      parameters: ["quantity", "product", "method", "unused"].map(parameter_id => ({ parameter_id })),
      formulas: [{ formula_id: "volume", input_parameter_ids: ["quantity"] }],
      resources: [{ row_id: "order", formula_id: "volume", resource_graph: { titleSpecificationParameterIds: ["product"], inputParameterIds: ["method"] },
        inclusion_ast: { kind: "equals", parameterId: "method", value: "selected" } }],
    })).toEqual({
      formulaConsumers: { quantity: ["volume"], product: [], method: [], unused: [] },
      resourceConsumers: { quantity: ["order"], product: ["order"], method: ["order"], unused: [] },
    });
  });
  it("retains declared fallback only for existing rows and preserves inferred-consumer precedence", () => {
    expect(buildMasterParameterCalculationConsumers({
      parameters: [{ parameter_id: "fallback", truth_metadata: { resource_branch_consumers: ["existing", "absent"] } },
        { parameter_id: "inferred", truth_metadata: { resource_branch_consumers: ["existing"] } }],
      formulas: [{ formula_id: "volume", input_parameter_ids: ["inferred"] }],
      resources: [{ row_id: "existing", formula_id: "other", resource_graph: {}, inclusion_ast: {} },
        { row_id: "calculated", formula_id: "volume", resource_graph: {}, inclusion_ast: {} }],
    }).resourceConsumers).toEqual({ fallback: ["existing"], inferred: ["calculated"] });
  });
  it("serializes each needed resource graph once across many fields, without losing nested source/branch consumers", () => {
    const graphReads: number[] = [], inclusionReads: number[] = [];
    const parameters = Array.from({ length: 30 }, (_, index) => ({ parameter_id: `actual_${index}` }));
    const resources = Array.from({ length: 12 }, (_, index) => ({ row_id: `actual-row-${index}`, formula_id: "not-consumed-formula",
      resource_graph: { toJSON: () => { graphReads.push(index); return { deeply: { nested: { inputParameterIds: [`actual_${index}`] } } }; } },
      inclusion_ast: { toJSON: () => { inclusionReads.push(index); return { kind: "equals", parameterId: `actual_${index + 12}`, value: "chosen" }; } },
    }));
    const result = buildMasterParameterCalculationConsumers({ parameters, formulas: [], resources });
    expect(graphReads).toHaveLength(resources.length); expect(inclusionReads).toHaveLength(resources.length);
    for (let index = 0; index < 12; index += 1) {
      expect(result.resourceConsumers[`actual_${index}`]).toEqual([`actual-row-${index}`]);
      expect(result.resourceConsumers[`actual_${index + 12}`]).toEqual([`actual-row-${index}`]);
    }
    expect(result.resourceConsumers.actual_29).toEqual([]);
  });
  it("preserves formula short-circuiting and rereads changed definitions without a retained global serialization cache", () => {
    const forbidden = { toJSON: () => { throw new Error("Formula ownership must not serialize an unused branch"); } };
    expect(buildMasterParameterCalculationConsumers({ parameters: [{ parameter_id: "quantity" }],
      formulas: [{ formula_id: "f", input_parameter_ids: ["quantity"] }],
      resources: [{ row_id: "r", formula_id: "f", resource_graph: forbidden, inclusion_ast: forbidden }],
    }).resourceConsumers).toEqual({ quantity: ["r"] });
    const resource = { row_id: "r", formula_id: "none", resource_graph: { inputParameterIds: ["first"] }, inclusion_ast: {} };
    const input = { parameters: ["first", "next"].map(parameter_id => ({ parameter_id })), formulas: [], resources: [resource] };
    expect(buildMasterParameterCalculationConsumers(input).resourceConsumers).toEqual({ first: ["r"], next: [] });
    resource.resource_graph.inputParameterIds = ["next"];
    expect(buildMasterParameterCalculationConsumers(input).resourceConsumers).toEqual({ first: [], next: ["r"] });
  });
});

const formulas = [{ formula_id: "formula:roller-hours" }];
const resources = [{ row_id: "row:roller", formula_id: "formula:roller-hours" }];
const resourcesWithIncludedComponent = [
  ...resources,
  {
    row_id: "row:roller-water",
    formula_id: "formula:roller-hours",
    resource_graph: {
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
      parentCostOwnerId: "row:roller",
    },
  },
];

function completenessMap(resolution: Record<string, unknown> = {
  kind: "ROW",
  rowId: "row:roller",
}) {
  return {
    contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
    sourceKind: "TECHNOLOGY_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: "a".repeat(64),
    entries: [{
      operationId: "operation:breakdown-rolling",
      expectedResourceId: "resource:breakdown-roller",
      condition: "asphalt_compaction_selected",
      sourceId: "source:technology-map:v1",
      formulaId: "formula:roller-hours",
      resolution,
    }],
  };
}

describe("master successor independent completeness references", () => {
  test("accepts an independently authored entry that resolves to the published row and formula", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap(),
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
    })).toEqual([]);
  });

  test("accepts an operation explicitly included in an existing parent row", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap({
        kind: "INCLUDED_IN_PARENT",
        parentRowId: "row:roller",
      }),
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
    })).toEqual([]);
  });

  test("accepts an independently required visible component included in a parent price", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap({
        kind: "INCLUDED_COMPONENT_ROW",
        rowId: "row:roller-water",
        parentRowId: "row:roller",
      }),
      formulaDefinitions: formulas,
      resourceDefinitions: resourcesWithIncludedComponent,
    })).toEqual([]);
  });

  test("rejects removal of an independently required included component", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap({
        kind: "INCLUDED_COMPONENT_ROW",
        rowId: "row:roller-water",
        parentRowId: "row:roller",
      }),
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
    })).toContain("ENTRY_0_ROW_REFERENCE");
  });

  test("rejects removal or rewiring of the price-owning parent", () => {
    const map = completenessMap({
      kind: "INCLUDED_COMPONENT_ROW",
      rowId: "row:roller-water",
      parentRowId: "row:roller",
    });
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: map,
      formulaDefinitions: formulas,
      resourceDefinitions: resourcesWithIncludedComponent.slice(1),
    })).toContain("ENTRY_0_PARENT_ROW_REFERENCE");
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: map,
      formulaDefinitions: formulas,
      resourceDefinitions: [
        resources[0],
        {
          ...resourcesWithIncludedComponent[1],
          resource_graph: {
            costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
            parentCostOwnerId: "row:other",
          },
        },
      ],
    })).toContain("ENTRY_0_PARENT_ROW_MISMATCH");
  });

  test("rejects stale row and formula references", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap(),
      formulaDefinitions: [{ formula_id: "formula:other" }],
      resourceDefinitions: [{ row_id: "row:other", formula_id: "formula:other" }],
    })).toEqual(expect.arrayContaining([
      "ENTRY_0_ROW_REFERENCE",
      "ENTRY_0_FORMULA_REFERENCE",
    ]));
  });

  test("rejects a row whose formula differs from the independent map", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap(),
      formulaDefinitions: formulas,
      resourceDefinitions: [{ row_id: "row:roller", formula_id: "formula:other" }],
    })).toContain("ENTRY_0_ROW_FORMULA_MISMATCH");
  });

  test("rejects a map generated from the current rows", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: {
        ...completenessMap(),
        generatedFromCurrentRows: true,
      },
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
    })).toContain("NOT_INDEPENDENT");
  });
});

describe("master successor compatible price inheritance", () => {
  const sourceResource = {
    row_id: "source:roller",
    cost_owner_id: "stable:roller-rental",
    unit_id: "machine_hour",
  };

  test("uses the stable cost owner before a route-local price key", () => {
    expect(canonicalPublisherEffectivePriceKey(sourceResource, "route:legacy-key"))
      .toBe("stable:roller-rental");
  });

  test("keeps a price route only for the same cost owner and unit", () => {
    expect(canonicalPublisherPriceBindingIsCompatible({
      sourceResource,
      targetResource: {
        row_id: "renamed:roller",
        cost_owner_id: "stable:roller-rental",
        unit_id: "machine_hour",
      },
      sourceBindingPriceKey: "route:legacy-key",
    })).toBe(true);
    expect(canonicalPublisherPriceBindingIsCompatible({
      sourceResource,
      targetResource: {
        row_id: "renamed:roller",
        cost_owner_id: "stable:roller-rental",
        unit_id: "shift",
      },
      sourceBindingPriceKey: "route:legacy-key",
    })).toBe(false);
    expect(canonicalPublisherPriceBindingIsCompatible({
      sourceResource,
      targetResource: {
        row_id: "renamed:roller",
        cost_owner_id: "stable:other-rental",
        unit_id: "machine_hour",
      },
      sourceBindingPriceKey: "route:legacy-key",
    })).toBe(false);
  });

  test("falls back to binding and row identities when cost owners are absent", () => {
    expect(canonicalPublisherPriceBindingIsCompatible({
      sourceResource: { row_id: "legacy-row", unit_id: "kg" },
      targetResource: { row_id: "stable-price-key", unit_id: "kg" },
      sourceBindingPriceKey: "stable-price-key",
    })).toBe(true);
  });
});

describe("master successor definition count modes", () => {
  const parent = { definitions: 10_331, parameters: 32_450, formulas: 586_735, resources: 586_965 };
  const nextTarget = { parameters: 3, formulas: 4, resources: 4 };

  test("append adds one identity and the full new definition shape", () => {
    expect(resolveMasterSingleDefinitionNextCounts({
      parent,
      previousTarget: null,
      nextTarget,
    })).toEqual({
      definitions: 10_332,
      parameters: 32_453,
      formulas: 586_739,
      resources: 586_969,
    });
  });

  test("replacement preserves the identity denominator and swaps only the target shape", () => {
    expect(resolveMasterSingleDefinitionNextCounts({
      parent,
      previousTarget: { parameters: 2, formulas: 2, resources: 3 },
      nextTarget,
    })).toEqual({
      definitions: 10_331,
      parameters: 32_451,
      formulas: 586_737,
      resources: 586_966,
    });
  });
});
