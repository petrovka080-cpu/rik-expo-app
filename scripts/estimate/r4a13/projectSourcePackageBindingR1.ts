import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

type Json = Record<string, unknown>;
type VerifiedExcerptReceipt = Readonly<{
  artifactId: string;
  excerptFileName: string;
  bytes: number;
  sha256: string;
}>;

type VerifiedExcerptFile = Readonly<{
  excerptFileName: string;
  bytes: number;
  sha256: string;
}>;

export const PROJECT_SOURCE_PACKAGE_BINDING_CONTRACT =
  "rik-expo-app.s27-9.project-source-package-binding.v1";

export type VerifiedProjectSourcePackageBinding = Readonly<{
  manifestFileName: string;
  manifestBytes: number;
  manifestSha256: string;
  packageId: string;
  sourceKey: string;
  packagePayloadSha256: string;
  mappingPayloadSha256: string;
  artifactReceipts: readonly Readonly<{
    artifactId: string;
    fileName: string;
    bytes: number;
    sha256: string;
    documentNumber: string;
    revision: string;
    documentDate: string;
    approvalStatus: string;
    approvedBy: readonly string[];
  }>[];
  excerptReceipts: readonly Readonly<{
    artifactId: string;
    excerptFileName: string;
    bytes: number;
    sha256: string;
  }>[];
  verifiedLocators: readonly Readonly<{
    artifactId: string;
    excerptFileName: string;
    excerptBytes: number;
    excerptSha256: string;
    documentLocator: Readonly<Json>;
  }>[];
  projectMetadata: Readonly<Json>;
  mapping: Readonly<Json>;
}>;

export type ExpectedProjectSourcePackageMapping = Readonly<{
  expectedCatalogId: string;
  expectedDefinitionSha256: string;
  expectedRowId: string;
}>;

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

function isRecord(value: unknown): value is Json {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function immutableJson(value: unknown): unknown {
  if (Array.isArray(value)) return Object.freeze(value.map(immutableJson));
  if (isRecord(value)) {
    return Object.freeze(Object.fromEntries(Object.entries(value)
      .map(([key, child]) => [key, immutableJson(child)])));
  }
  return value;
}

function immutableJsonRecord(value: Json): Readonly<Json> {
  return immutableJson(value) as Readonly<Json>;
}

function sha256(value: Buffer | string | unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string"
    ? value
    : JSON.stringify(stable(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function payloadWithoutHash(manifest: Json): Json {
  const { packagePayloadSha256: _ignored, ...payload } = manifest;
  return payload;
}

function requireText(record: Json, key: string, errors: string[], prefix: string): void {
  if (!text(record[key])) errors.push(`${prefix}_${key.toUpperCase()}`);
}

function isCalendarDate(value: unknown): boolean {
  const normalized = text(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(normalized);
  if (match == null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const observed = new Date(Date.UTC(year, month - 1, day));
  return observed.getUTCFullYear() === year
    && observed.getUTCMonth() === month - 1
    && observed.getUTCDate() === day;
}

function validateApprovedBy(value: unknown, errors: string[], prefix: string): void {
  const approvedBy = Array.isArray(value) ? value.map(text) : [];
  if (approvedBy.length === 0 || approvedBy.some((identity) => !identity)) {
    errors.push(`${prefix}_APPROVED_BY`);
  }
  const canonicalIdentities = approvedBy.map((identity) =>
    identity.normalize("NFKC").toLowerCase());
  if (new Set(canonicalIdentities).size !== approvedBy.length) {
    errors.push(`${prefix}_APPROVED_BY_DUPLICATE`);
  }
}

function canonicalLocatorIdentity(locator: Json): Readonly<Json> {
  return Object.freeze({
    artifactId: text(locator.artifactId),
    sheetOrPage: text(locator.sheetOrPage),
    nodePositionOrClause: text(locator.nodePositionOrClause),
    claimSupported: text(locator.claimSupported),
    applicabilityBoundary: text(locator.applicabilityBoundary),
    excerptFile: text(locator.excerptFile),
    excerptBytes: locator.excerptBytes,
    excerptSha256: text(locator.excerptSha256).toLowerCase(),
  });
}

export function projectSourcePackagePayloadSha256(manifest: Json): string {
  return sha256(payloadWithoutHash(manifest));
}

export function validateProjectSourcePackageManifest(manifest: unknown): readonly string[] {
  const errors: string[] = [];
  if (!isRecord(manifest)) return ["MANIFEST_NOT_OBJECT"];
  if (manifest.schemaVersion !== PROJECT_SOURCE_PACKAGE_BINDING_CONTRACT) {
    errors.push("CONTRACT");
  }
  requireText(manifest, "packageId", errors, "PACKAGE");
  requireText(manifest, "sourceKey", errors, "PACKAGE");

  const project = isRecord(manifest.project) ? manifest.project : null;
  if (project == null) {
    errors.push("PROJECT_NOT_OBJECT");
  } else {
    for (const key of [
      "objectName",
      "projectCode",
      "projectStage",
      "issuingOrganization",
      "documentSetRevision",
      "documentSetDate",
      "approvalStatus",
      "applicabilityStatement",
    ]) requireText(project, key, errors, "PROJECT");
    validateApprovedBy(project.approvedBy, errors, "PROJECT");
    if (project.approvalStatus !== "APPROVED_FOR_USE") {
      errors.push("PROJECT_APPROVAL_STATUS");
    }
    if (!isCalendarDate(project.documentSetDate)) {
      errors.push("PROJECT_DOCUMENT_SET_DATE");
    }
  }

  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  if (artifacts.length === 0) errors.push("ARTIFACTS_EMPTY");
  const artifactIds = new Set<string>();
  for (const [index, rawArtifact] of artifacts.entries()) {
    const prefix = `ARTIFACT_${index}`;
    if (!isRecord(rawArtifact)) {
      errors.push(`${prefix}_SHAPE`);
      continue;
    }
    for (const key of [
      "artifactId",
      "file",
      "fileName",
      "sha256",
      "documentNumber",
      "revision",
      "documentDate",
      "approvalStatus",
    ]) requireText(rawArtifact, key, errors, prefix);
    const artifactId = text(rawArtifact.artifactId);
    if (artifactIds.has(artifactId)) errors.push(`${prefix}_DUPLICATE_ID`);
    artifactIds.add(artifactId);
    if (!SHA256_PATTERN.test(text(rawArtifact.sha256).toLowerCase())) {
      errors.push(`${prefix}_SHA256`);
    }
    const bytes = rawArtifact.bytes;
    if (typeof bytes !== "number" || !Number.isSafeInteger(bytes) || bytes <= 0) {
      errors.push(`${prefix}_BYTES`);
    }
    validateApprovedBy(rawArtifact.approvedBy, errors, prefix);
    if (rawArtifact.approvalStatus !== "APPROVED_FOR_USE") {
      errors.push(`${prefix}_APPROVAL_STATUS`);
    }
    if (!isCalendarDate(rawArtifact.documentDate)) {
      errors.push(`${prefix}_DOCUMENT_DATE`);
    }
  }

  const mappings = Array.isArray(manifest.catalogMappings) ? manifest.catalogMappings : [];
  if (mappings.length === 0) errors.push("MAPPINGS_EMPTY");
  const mappingKeys = new Set<string>();
  for (const [index, rawMapping] of mappings.entries()) {
    const prefix = `MAPPING_${index}`;
    if (!isRecord(rawMapping)) {
      errors.push(`${prefix}_SHAPE`);
      continue;
    }
    for (const key of ["catalogId", "definitionSha256", "rowId"]) {
      requireText(rawMapping, key, errors, prefix);
    }
    if (!SHA256_PATTERN.test(text(rawMapping.definitionSha256).toLowerCase())) {
      errors.push(`${prefix}_DEFINITION_SHA256`);
    }
    const mappingKey = `${text(rawMapping.catalogId)}\u0000${text(rawMapping.rowId)}`;
    if (mappingKeys.has(mappingKey)) errors.push(`${prefix}_DUPLICATE`);
    mappingKeys.add(mappingKey);
    if (typeof rawMapping.applicable !== "boolean") {
      errors.push(`${prefix}_APPLICABLE`);
      continue;
    }
    const locators = Array.isArray(rawMapping.documentLocators)
      ? rawMapping.documentLocators
      : [];
    if (rawMapping.applicable === false) {
      if (!text(rawMapping.nonApplicabilityStatement)) {
        errors.push(`${prefix}_NON_APPLICABILITY_STATEMENT`);
      }
      if (locators.length > 0) errors.push(`${prefix}_NON_APPLICABLE_HAS_LOCATORS`);
      continue;
    }
    if (locators.length === 0) errors.push(`${prefix}_LOCATORS_EMPTY`);
    const locatorPayloads = new Set<string>();
    for (const [locatorIndex, rawLocator] of locators.entries()) {
      const locatorPrefix = `${prefix}_LOCATOR_${locatorIndex}`;
      if (!isRecord(rawLocator)) {
        errors.push(`${locatorPrefix}_SHAPE`);
        continue;
      }
      const locatorPayloadSha256 = sha256(canonicalLocatorIdentity(rawLocator));
      if (locatorPayloads.has(locatorPayloadSha256)) {
        errors.push(`${locatorPrefix}_DUPLICATE`);
      }
      locatorPayloads.add(locatorPayloadSha256);
      for (const key of [
        "artifactId",
        "sheetOrPage",
        "nodePositionOrClause",
        "claimSupported",
        "applicabilityBoundary",
        "excerptFile",
        "excerptSha256",
      ]) requireText(rawLocator, key, errors, locatorPrefix);
      if (!artifactIds.has(text(rawLocator.artifactId))) {
        errors.push(`${locatorPrefix}_ARTIFACT_REFERENCE`);
      }
      if (!SHA256_PATTERN.test(text(rawLocator.excerptSha256).toLowerCase())) {
        errors.push(`${locatorPrefix}_EXCERPT_SHA256`);
      }
      const excerptBytes = rawLocator.excerptBytes;
      if (typeof excerptBytes !== "number"
        || !Number.isSafeInteger(excerptBytes)
        || excerptBytes <= 0) {
        errors.push(`${locatorPrefix}_EXCERPT_BYTES`);
      }
    }
  }

  const declaredPayloadSha256 = text(manifest.packagePayloadSha256).toLowerCase();
  if (!SHA256_PATTERN.test(declaredPayloadSha256)) {
    errors.push("PACKAGE_PAYLOAD_SHA256");
  } else if (declaredPayloadSha256 !== projectSourcePackagePayloadSha256(manifest)) {
    errors.push("PACKAGE_PAYLOAD_SHA256_MISMATCH");
  }
  return [...new Set(errors)];
}

function resolveContainedArtifactPath(manifestPath: string, file: string): string {
  if (isAbsolute(file)) throw new Error("PROJECT_SOURCE_PACKAGE_ABSOLUTE_ARTIFACT_PATH");
  const base = realpathSync(dirname(manifestPath));
  const candidatePath = resolve(base, file);
  const candidateRelative = relative(base, candidatePath);
  if (!candidateRelative || isAbsolute(candidateRelative) || candidateRelative === ".."
    || candidateRelative.startsWith("../") || candidateRelative.startsWith("..\\")) {
    throw new Error("PROJECT_SOURCE_PACKAGE_ARTIFACT_PATH_ESCAPE");
  }
  const artifactPath = realpathSync(candidatePath);
  const relativePath = relative(base, artifactPath);
  if (!relativePath || isAbsolute(relativePath) || relativePath === ".."
    || relativePath.startsWith("../") || relativePath.startsWith("..\\")) {
    throw new Error("PROJECT_SOURCE_PACKAGE_ARTIFACT_SYMLINK_ESCAPE");
  }
  return artifactPath;
}

export function loadVerifiedProjectSourcePackageBindings(input: Readonly<{
  manifestPath: string;
  expectedSourceKey: string;
  expectedMappings: readonly ExpectedProjectSourcePackageMapping[];
}>): readonly VerifiedProjectSourcePackageBinding[] {
  if (!input.expectedSourceKey.trim()) {
    throw new Error("PROJECT_SOURCE_PACKAGE_EXPECTED_SOURCE_KEY_EMPTY");
  }
  if (input.expectedMappings.length === 0) {
    throw new Error("PROJECT_SOURCE_PACKAGE_EXPECTED_MAPPINGS_EMPTY");
  }
  const expectedMappingKeys = new Set<string>();
  for (const [index, expected] of input.expectedMappings.entries()) {
    if (!expected.expectedCatalogId.trim()) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_EXPECTED_CATALOG_ID_EMPTY:${index}`);
    }
    if (!SHA256_PATTERN.test(expected.expectedDefinitionSha256.toLowerCase())) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_EXPECTED_DEFINITION_SHA256_INVALID:${index}`);
    }
    if (!expected.expectedRowId.trim()) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_EXPECTED_ROW_ID_EMPTY:${index}`);
    }
    const key = `${expected.expectedCatalogId}\u0000${expected.expectedRowId}`;
    if (expectedMappingKeys.has(key)) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_EXPECTED_MAPPING_DUPLICATE:${index}`);
    }
    expectedMappingKeys.add(key);
  }
  const manifestPath = resolve(input.manifestPath);
  let manifestBytes: Buffer;
  let manifest: unknown;
  try {
    manifestBytes = readFileSync(manifestPath);
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch (error) {
    throw new Error(`PROJECT_SOURCE_PACKAGE_READ:${error instanceof Error ? error.message : String(error)}`);
  }
  const errors = validateProjectSourcePackageManifest(manifest);
  if (errors.length > 0) throw new Error(`PROJECT_SOURCE_PACKAGE_INVALID:${errors.join(",")}`);
  const typed = manifest as Json;
  if (text(typed.sourceKey) !== input.expectedSourceKey) {
    throw new Error("PROJECT_SOURCE_PACKAGE_SOURCE_KEY_MISMATCH");
  }
  const artifacts = typed.artifacts as Json[];
  const artifactPaths = new Set<string>();
  const artifactReceipts = artifacts.map((artifact) => {
    const artifactPath = resolveContainedArtifactPath(manifestPath, text(artifact.file));
    if (artifactPaths.has(artifactPath)) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_DUPLICATE_ARTIFACT_FILE:${text(artifact.artifactId)}`);
    }
    artifactPaths.add(artifactPath);
    if (basename(artifactPath) !== text(artifact.fileName)) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_FILE_NAME_MISMATCH:${text(artifact.artifactId)}`);
    }
    const bytes = readFileSync(artifactPath);
    const actualSha256 = sha256(bytes);
    if (bytes.length !== Number(artifact.bytes)) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_BYTES_MISMATCH:${text(artifact.artifactId)}`);
    }
    if (actualSha256 !== text(artifact.sha256).toLowerCase()) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_SHA256_MISMATCH:${text(artifact.artifactId)}`);
    }
    return Object.freeze({
      artifactId: text(artifact.artifactId),
      fileName: text(artifact.fileName),
      bytes: bytes.length,
      sha256: actualSha256,
      documentNumber: text(artifact.documentNumber),
      revision: text(artifact.revision),
      documentDate: text(artifact.documentDate),
      approvalStatus: text(artifact.approvalStatus),
      approvedBy: Object.freeze((artifact.approvedBy as unknown[]).map(text)),
    });
  });
  const mappings = typed.catalogMappings as Json[];
  const excerptFileByIdentity = new Map<string, VerifiedExcerptFile>();
  const excerptPathByLocator = new Map<Json, string>();
  const verifyExcerpt = (locator: Json): VerifiedExcerptReceipt => {
    const excerptPath = resolveContainedArtifactPath(manifestPath, text(locator.excerptFile));
    excerptPathByLocator.set(locator, excerptPath);
    const expectedBytes = Number(locator.excerptBytes);
    const expectedSha256 = text(locator.excerptSha256).toLowerCase();
    const identity = `${excerptPath}\u0000${expectedBytes}\u0000${expectedSha256}`;
    let verifiedFile = excerptFileByIdentity.get(identity);
    if (verifiedFile == null) {
      const bytes = readFileSync(excerptPath);
      const actualSha256 = sha256(bytes);
      if (bytes.length !== expectedBytes) {
        throw new Error(`PROJECT_SOURCE_PACKAGE_EXCERPT_BYTES_MISMATCH:${text(locator.artifactId)}`);
      }
      if (actualSha256 !== expectedSha256) {
        throw new Error(`PROJECT_SOURCE_PACKAGE_EXCERPT_SHA256_MISMATCH:${text(locator.artifactId)}`);
      }
      verifiedFile = Object.freeze({
        excerptFileName: basename(excerptPath),
        bytes: bytes.length,
        sha256: actualSha256,
      });
      excerptFileByIdentity.set(identity, verifiedFile);
    }
    return Object.freeze({
      artifactId: text(locator.artifactId),
      ...verifiedFile,
    });
  };
  const excerptReceiptByLocator = new Map<Json, VerifiedExcerptReceipt>();
  const excerptReceipts = mappings.flatMap((candidateMapping) =>
    (Array.isArray(candidateMapping.documentLocators)
      ? candidateMapping.documentLocators as Json[]
      : []).map((locator) => {
      const receipt = verifyExcerpt(locator);
      excerptReceiptByLocator.set(locator, receipt);
      return receipt;
    }));
  for (const mapping of mappings) {
    const locatorIdentities = new Set<string>();
    const locators = Array.isArray(mapping.documentLocators)
      ? mapping.documentLocators as Json[]
      : [];
    for (const locator of locators) {
      const excerptPath = excerptPathByLocator.get(locator);
      if (excerptPath == null) throw new Error("PROJECT_SOURCE_PACKAGE_EXCERPT_PATH_NOT_VERIFIED");
      const locatorIdentity = sha256({
        ...canonicalLocatorIdentity(locator),
        excerptFile: excerptPath,
      });
      if (locatorIdentities.has(locatorIdentity)) {
        throw new Error(
          `PROJECT_SOURCE_PACKAGE_DUPLICATE_LOCATOR_FILE_ALIAS:${text(mapping.catalogId)}:${text(mapping.rowId)}`,
        );
      }
      locatorIdentities.add(locatorIdentity);
    }
  }
  const bindings = input.expectedMappings.map((expected) => {
    const matches = mappings.filter((mapping) =>
      text(mapping.catalogId) === expected.expectedCatalogId
      && text(mapping.rowId) === expected.expectedRowId);
    if (matches.length !== 1) throw new Error(
      `PROJECT_SOURCE_PACKAGE_MAPPING_CARDINALITY:${expected.expectedCatalogId}:${expected.expectedRowId}`,
    );
    const mapping = matches[0]!;
    if (text(mapping.definitionSha256).toLowerCase()
      !== expected.expectedDefinitionSha256.toLowerCase()) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_DEFINITION_SHA256_MISMATCH:${expected.expectedCatalogId}`);
    }
    if (mapping.applicable !== true) {
      throw new Error(`PROJECT_SOURCE_PACKAGE_MAPPING_NOT_APPLICABLE:${expected.expectedCatalogId}`);
    }
    const verifiedLocators = (mapping.documentLocators as Json[]).map((locator) => {
      const receipt = excerptReceiptByLocator.get(locator);
      if (receipt == null) {
        throw new Error(`PROJECT_SOURCE_PACKAGE_EXCERPT_RECEIPT_MISSING:${expected.expectedCatalogId}`);
      }
      return Object.freeze({
        artifactId: receipt.artifactId,
        excerptFileName: receipt.excerptFileName,
        excerptBytes: receipt.bytes,
        excerptSha256: receipt.sha256,
        documentLocator: immutableJsonRecord(locator),
      });
    });
    return Object.freeze({
      manifestFileName: basename(manifestPath),
      manifestBytes: manifestBytes.length,
      manifestSha256: sha256(manifestBytes),
      packageId: text(typed.packageId),
      sourceKey: text(typed.sourceKey),
      packagePayloadSha256: text(typed.packagePayloadSha256).toLowerCase(),
      mappingPayloadSha256: sha256(mapping),
      artifactReceipts: Object.freeze(artifactReceipts),
      excerptReceipts: Object.freeze(excerptReceipts),
      verifiedLocators: Object.freeze(verifiedLocators),
      projectMetadata: immutableJsonRecord(typed.project as Json),
      mapping: immutableJsonRecord(mapping),
    });
  });
  return Object.freeze(bindings);
}

export function loadVerifiedProjectSourcePackageBinding(input: Readonly<{
  manifestPath: string;
  expectedSourceKey: string;
  expectedCatalogId: string;
  expectedDefinitionSha256: string;
  expectedRowId: string;
}>): VerifiedProjectSourcePackageBinding {
  return loadVerifiedProjectSourcePackageBindings({
    manifestPath: input.manifestPath,
    expectedSourceKey: input.expectedSourceKey,
    expectedMappings: [{
      expectedCatalogId: input.expectedCatalogId,
      expectedDefinitionSha256: input.expectedDefinitionSha256,
      expectedRowId: input.expectedRowId,
    }],
  })[0]!;
}
