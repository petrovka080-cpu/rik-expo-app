/** Historical MASTER/publisher byte order. Keep localeCompare unchanged: using
 * the calculation serializer's Unicode sort changes already published hashes.
 * Native clients consume server evidence; this is not a new calculation hash. */
export function canonicalDefinitionPublicationStableValueR1(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalDefinitionPublicationStableValueR1);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalDefinitionPublicationStableValueR1(child)]));
  }
  return value;
}
