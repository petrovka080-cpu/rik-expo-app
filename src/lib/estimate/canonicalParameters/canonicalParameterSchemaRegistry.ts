import type { CanonicalParameterSchema } from "./canonicalParameterCore";

export type CanonicalParameterSchemaRegistry = {
  schemas: readonly CanonicalParameterSchema[];
  getBySchemaId(schemaId: string): CanonicalParameterSchema | null;
  getByWorkPassportId(workPassportId: string): CanonicalParameterSchema | null;
  getByCanonicalWorkKey(canonicalWorkKey: string): CanonicalParameterSchema | null;
};

function key(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ru-RU");
}
export function createCanonicalParameterSchemaRegistry(
  schemas: readonly CanonicalParameterSchema[],
): CanonicalParameterSchemaRegistry {
  const bySchemaId = new Map<string, CanonicalParameterSchema>();
  const byPassport = new Map<string, CanonicalParameterSchema>();
  const byWork = new Map<string, CanonicalParameterSchema>();
  for (const schema of schemas) {
    const schemaKey = key(schema.schemaId);
    const passportKey = key(schema.workPassportId);
    const workKey = key(schema.canonicalWorkKey);
    if (bySchemaId.has(schemaKey)) throw new Error(`CANONICAL_PARAMETER_SCHEMA_DUPLICATE:${schema.schemaId}`);
    if (byPassport.has(passportKey)) throw new Error(`CANONICAL_PARAMETER_PASSPORT_DUPLICATE:${schema.workPassportId}`);
    if (byWork.has(workKey)) throw new Error(`CANONICAL_PARAMETER_WORK_DUPLICATE:${schema.canonicalWorkKey}`);
    bySchemaId.set(schemaKey, schema);
    byPassport.set(passportKey, schema);
    byWork.set(workKey, schema);
  }
  return Object.freeze({
    schemas: Object.freeze([...schemas]),
    getBySchemaId: (schemaId) => bySchemaId.get(key(schemaId)) ?? null,
    getByWorkPassportId: (workPassportId) => byPassport.get(key(workPassportId)) ?? null,
    getByCanonicalWorkKey: (canonicalWorkKey) => byWork.get(key(canonicalWorkKey)) ?? null,
  });
}
