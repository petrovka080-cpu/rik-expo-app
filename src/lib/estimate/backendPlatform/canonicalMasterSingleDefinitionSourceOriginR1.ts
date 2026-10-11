import { canonicalDefinitionPublicationStableValueR1 } from './canonicalDefinitionPublicationStableValueR1';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';

type Row = Readonly<Record<string, unknown>>;
const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = (value: unknown) => canonicalEstimateSha256HexText(JSON.stringify(canonicalDefinitionPublicationStableValueR1(value)));
const SHA = /^[a-f0-9]{64}$/u, COMMIT = /^[a-f0-9]{40}$/u;
const KEYS = ['contract', 'head', 'tree', 'masterSha256', 'parentReleaseId', 'parentSearchReleaseId', 'sourceHashes',
  'parameters', 'formulas', 'resources', 'runtimeProfileInput', 'runtimeProfileClassification', 'runtimeProfileSourceIds',
  'sourceId', 'normId', 'sourceMetadata', 'passport', 'applicability', 'binding', 'locators', 'projectSourcePackage',
  'projectSourcePackageSet', 'search', 'validationScenario', 'coreAcceptance'];
export type CanonicalMasterSingleDefinitionSourceOriginR1 = Readonly<{
  contractVersion: 'canonical-master-single-definition-source-origin/v1';
  catalogId: string;
  fingerprint: string;
  envelope: Row;
}>;

/** Immutable publisher input declaration, not a permission or calculation
 * definition. A future publisher stores it on its own release; legacy origins
 * require an independently admitted original artifact. Never use inherited
 * release.metadata.sourceFingerprint/sourceHashes as this declaration. */
export function buildCanonicalMasterSingleDefinitionSourceOriginR1(input: {
  catalogId: string;
  envelope: Row;
}): CanonicalMasterSingleDefinitionSourceOriginR1 | null {
  const e = input.envelope;
  if (typeof input.catalogId !== 'string' || !input.catalogId || !isRow(e)
    || KEYS.some(key => !Object.hasOwn(e, key) || e[key] === undefined)
    || Object.keys(e).some(key => !KEYS.includes(key) && key !== 'catalogAppend')
    || typeof e.contract !== 'string' || !e.contract || typeof e.head !== 'string' || !COMMIT.test(e.head)
    || typeof e.tree !== 'string' || !COMMIT.test(e.tree) || typeof e.masterSha256 !== 'string' || !SHA.test(e.masterSha256)
    || !Array.isArray(e.parameters) || !Array.isArray(e.formulas) || !Array.isArray(e.resources)
    || !Array.isArray(e.sourceHashes) || !e.sourceHashes.length
    || e.sourceHashes.some(row => !isRow(row) || typeof row.path !== 'string' || !row.path
      || typeof row.sha256 !== 'string' || !SHA.test(row.sha256))) return null;
  try {
    // Capture the exact publisher JSON representation before any later plan
    // assembly can mutate a shared input object. JSONB preserves this content.
    const envelope = JSON.parse(JSON.stringify(canonicalDefinitionPublicationStableValueR1(e))) as Row;
    return { contractVersion: 'canonical-master-single-definition-source-origin/v1', catalogId: input.catalogId,
      fingerprint: hash(envelope), envelope };
  } catch { return null; }
}

/** Necessary origin/hash gate against independently loaded SQL provenance and
 * reconstructed source schemas. Full snapshot manifest chain/aggregate,
 * original source inventory admission, lineage, rights and consent are separate
 * mandatory gates. There is no HTTP flag declaring these checks complete. */
export function canonicalMasterSingleDefinitionSourceOriginMatchesR1(input: {
  origin: unknown;
  catalogId: string;
  fingerprint: string;
  sourceCommit: string;
  sourceTree: string;
  masterSha256: string;
  sourcePackageSha256: string;
  parameterSchemaSha256: string;
  definitionSchemaSha256: string;
}): boolean {
  const o = input.origin;
  if (!isRow(o) || Object.keys(o).length !== 4 || o.contractVersion !== 'canonical-master-single-definition-source-origin/v1'
    || o.catalogId !== input.catalogId || o.fingerprint !== input.fingerprint || !isRow(o.envelope)) return false;
  const rebuilt = buildCanonicalMasterSingleDefinitionSourceOriginR1({ catalogId: input.catalogId, envelope: o.envelope });
  if (!rebuilt || rebuilt.fingerprint !== input.fingerprint || o.envelope.head !== input.sourceCommit
    || o.envelope.tree !== input.sourceTree || o.envelope.masterSha256 !== input.masterSha256) return false;
  return hash(o.envelope.parameters) === input.parameterSchemaSha256
    && hash({ formulaRows: o.envelope.formulas, resourceRows: o.envelope.resources }) === input.definitionSchemaSha256
    && hash({ contract: o.envelope.contract, fingerprint: input.fingerprint,
      definitionSchemaSha256: input.definitionSchemaSha256 }) === input.sourcePackageSha256;
}
