import { canonicalEstimateResourceIncludedByDefault } from './canonicalEstimateResourceInclusionV1';
import type { CanonicalEstimateResourceDefinition } from './canonicalEstimateCompileCore';
import { compareFormulaGraphDecimals, isFormulaGraphExactDecimal } from './formulaGraph';
import { resolveInclusionGraph } from './inclusionGraph';
import type { CanonicalEstimateRowOverride } from './contracts';

export type CanonicalOrderedSpecificationBinding = {
  rowId: string;
  parameterIds: string[];
  inclusionAst: Record<string, unknown>;
};

/** Small definition-owned projection; no row traces or commercial formulas in the form. */
export function canonicalOrderedSpecificationBindings(resources: readonly Pick<CanonicalEstimateResourceDefinition,
  'row_id' | 'resource_graph' | 'inclusion_ast' | 'source_metadata'>[]): CanonicalOrderedSpecificationBinding[] {
  return resources.flatMap(resource => {
    const ids = resource.resource_graph?.titleSpecificationParameterIds;
    if (resource.resource_graph?.excludeKnownZeroQuantityV1 !== true
      || !canonicalEstimateResourceIncludedByDefault(resource)
      || !Array.isArray(ids) || ids.length === 0
      || ids.some(id => typeof id !== 'string' || !id.trim())) return [];
    return [{ rowId: resource.row_id, parameterIds: [...new Set(ids as string[])], inclusionAst: resource.inclusion_ast }];
  });
}

/** A resolved specification remains editable while its actual manual order remains selected. */
export function canonicalOrderedSpecificationParameterIds(
  bindings: readonly CanonicalOrderedSpecificationBinding[] | undefined,
  rowOverrides: Readonly<Record<string, CanonicalEstimateRowOverride>> | undefined,
  parameters: Record<string, unknown>,
): string[] {
  return [...new Set((bindings ?? []).flatMap(binding => {
    const override = rowOverrides?.[binding.rowId];
    const quantity = override?.quantity;
    if (override?.provenance?.kind !== 'manual' || override.includedInEstimate === false
      || (typeof quantity !== 'string' && typeof quantity !== 'number')
      || !isFormulaGraphExactDecimal(quantity)
      || compareFormulaGraphDecimals(quantity, '0') <= 0) return [];
    try {
      return resolveInclusionGraph(binding.inclusionAst, parameters).value === true ? binding.parameterIds : [];
    } catch {
      return [];
    }
  }))].sort();
}
