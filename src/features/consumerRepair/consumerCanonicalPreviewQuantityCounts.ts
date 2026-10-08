/** Count persisted physical quantities independently of outstanding source or
 * condition checks. A known preliminary need is not a missing quantity. */
export function canonicalPreviewQuantityCounts(input: {
    calculatedRowIds: readonly string[];
    preliminaryNeeds: readonly {
        rowId: string;
        quantity?: unknown;
    }[];
}): {
    knownQuantityCount: number;
    missingQuantityCount: number;
} {
    const known = new Set(input.calculatedRowIds);
    const missing = new Set<string>();
    for (const need of input.preliminaryNeeds) {
        const quantity = need.quantity;
        if ((typeof quantity === 'number' || typeof quantity === 'string')
            && String(quantity).trim() !== '' && Number.isFinite(Number(quantity)))
            known.add(need.rowId);
        else if (!known.has(need.rowId))
            missing.add(need.rowId);
    }
    for (const id of known)
        missing.delete(id);
    return { knownQuantityCount: known.size, missingQuantityCount: missing.size };
}
