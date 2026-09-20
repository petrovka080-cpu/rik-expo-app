import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import {
  STRIP_FOUNDATION_GOLD_INPUT,
  STRIP_FOUNDATION_INPUTS,
  compileStripFoundationEstimate,
} from "../concreteBackendR6/reinforcedConcreteStripFoundationR1";
import {
  ASPHALT_SURFACE_DRAINAGE_CATALOG_ID,
  ASPHALT_SURFACE_DRAINAGE_INPUTS,
  ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT,
  compileAsphaltSurfaceDrainageEstimate,
} from "../drainageBackendR4/asphaltSurfaceDrainageR1";

type Json = Record<string, any>;

export type CatalogRefinementFixture = Readonly<{
  fixtureKind: string;
  parameters: Readonly<Record<string, unknown>>;
}>;

const STRIP_FOUNDATION_CATALOG_ID = "canonical-work:expanded:strip_foundation";
const STRIP_FOUNDATION_CONTRACT =
  "rik-expo-app.r4-a13-6.strip-foundation-cip31-rebar-schedule-successor.v2";
const ASPHALT_SURFACE_DRAINAGE_CONTRACT =
  "rik-expo-app.r4-a13-4.asphalt-surface-drainage-norm-successor.v1";
const FIXTURE_ROOT = resolve("data/estimate-benchmarks");
const FORMWORK_INLINE_SCENARIO = /^FORMWORK_FRAMI_XLIFE_[A-Z0-9_]+$/u;
const FORMWORK_CATALOG_ID = /^canonical-work:base:concrete_foundation_.+_form_.+$/u;
const ASPHALT_REMOVAL_CATALOG_IDS = new Set([
  "built-in-ai-1000:0670",
  "built-in-ai-1000:0705",
]);

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value != null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

function record(value: unknown): Json | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Json
    : null;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function fileFixture(catalogId: string, reference: Json): CatalogRefinementFixture | null {
  if (typeof reference.fixture !== "string") return null;
  const fixturePath = reference.fixture.trim();
  if (!fixturePath) return null;
  if (!fixturePath.replaceAll("\\", "/").startsWith("data/estimate-benchmarks/")) return null;
  const absolutePath = resolve(fixturePath);
  const relativePath = relative(FIXTURE_ROOT, absolutePath);
  if (!relativePath || relativePath.startsWith("..") || resolve(FIXTURE_ROOT, relativePath) !== absolutePath) {
    throw new Error(`REFINEMENT_FIXTURE_PATH_OUTSIDE_ALLOWLIST:${fixturePath}`);
  }
  const bytes = readFileSync(absolutePath);
  const expectedHash = text(reference.fixtureSha256);
  const actualHash = sha256(bytes);
  if (!expectedHash || actualHash !== expectedHash) {
    throw new Error(`REFINEMENT_FIXTURE_HASH_MISMATCH:${fixturePath}:${expectedHash}:${actualHash}`);
  }
  const fixture = record(JSON.parse(bytes.toString("utf8")));
  const parameters = record(fixture?.parameters);
  if (fixture == null || text(fixture.catalogId) !== catalogId || parameters == null) {
    throw new Error(`REFINEMENT_FIXTURE_CONTRACT_INVALID:${fixturePath}`);
  }
  if (text(fixture.sourceClassification) !== "SYNTHETIC_ACCEPTANCE_FIXTURE_NOT_PROJECT_DATA") {
    throw new Error(`REFINEMENT_FIXTURE_PROJECT_DATA_BOUNDARY_MISSING:${fixturePath}`);
  }
  const expectedParameterCount = Number(reference.expectedParameters ?? fixture.expectedParameterCount);
  if (!Number.isInteger(expectedParameterCount)
    || Object.keys(parameters).length !== expectedParameterCount) {
    throw new Error(`REFINEMENT_FIXTURE_PARAMETER_COUNT_MISMATCH:${fixturePath}`);
  }
  return {
    fixtureKind: `validation_scenario_file:${fixturePath}`,
    parameters,
  };
}

function stripFoundationFixture(input: {
  catalogId: string;
  reference: Json;
  acceptanceEvidenceSha256: string;
}): CatalogRefinementFixture | null {
  if (input.catalogId !== STRIP_FOUNDATION_CATALOG_ID
    || text(input.reference.scenario) !== "STRIP_FOUNDATION_TECHNOLOGICAL_GOLD") return null;
  const safeBaselineInputs = Object.fromEntries(STRIP_FOUNDATION_INPUTS.flatMap((parameter) => {
    const value = parameter.defaultValue ?? (parameter.visibilityRole === "INTERNAL_ONLY"
      ? STRIP_FOUNDATION_GOLD_INPUT[parameter.parameterId]
      : undefined);
    return value == null ? [] : [[parameter.parameterId, value]];
  }));
  const parameterSchemaSha256 = sha256(STRIP_FOUNDATION_INPUTS.map((parameter) => [
    parameter.parameterId,
    parameter.valueType,
    parameter.unitId,
    parameter.required,
    parameter.requiredWhen ?? null,
    parameter.choices ?? [],
    parameter.visibilityRole,
  ]));
  const compiledGold = compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT);
  const actualEvidenceSha256 = sha256({
    contract: STRIP_FOUNDATION_CONTRACT,
    safeBaselineInputs,
    parameterSchemaSha256,
    gold: compiledGold.map((row) => [
      row.rowId,
      row.category,
      row.evaluatedQuantity,
      row.normalizedUom,
    ]),
  });
  const referenceHash = text(input.reference.acceptanceEvidenceSha256);
  if (!referenceHash
    || referenceHash !== input.acceptanceEvidenceSha256
    || actualEvidenceSha256 !== input.acceptanceEvidenceSha256) {
    throw new Error(
      `REFINEMENT_FIXTURE_EVIDENCE_HASH_MISMATCH:${referenceHash}:${input.acceptanceEvidenceSha256}:${actualEvidenceSha256}`,
    );
  }
  return {
    fixtureKind: "validation_scenario_registry:STRIP_FOUNDATION_TECHNOLOGICAL_GOLD",
    parameters: STRIP_FOUNDATION_GOLD_INPUT,
  };
}

function evidenceBoundInlineFormworkFixture(input: {
  catalogId: string;
  reference: Json;
  acceptanceEvidenceSha256: string;
}): CatalogRefinementFixture | null {
  const scenario = text(input.reference.scenario);
  const parameters = record(input.reference.fixture);
  if (!FORMWORK_CATALOG_ID.test(input.catalogId)
    || !FORMWORK_INLINE_SCENARIO.test(scenario)
    || parameters == null) return null;
  const referenceEvidenceSha256 = text(
    input.reference.targetEvidenceSha256 ?? input.reference.acceptanceEvidenceSha256,
  );
  if (!/^[a-f0-9]{64}$/u.test(referenceEvidenceSha256)
    || referenceEvidenceSha256 !== input.acceptanceEvidenceSha256) {
    throw new Error(
      `REFINEMENT_INLINE_FIXTURE_EVIDENCE_HASH_MISMATCH:${scenario}:${referenceEvidenceSha256}:${input.acceptanceEvidenceSha256}`,
    );
  }
  if (Object.keys(parameters).length === 0) {
    throw new Error(`REFINEMENT_INLINE_FIXTURE_EMPTY:${scenario}`);
  }
  return {
    fixtureKind: `validation_scenario_inline_evidence_bound:${scenario}`,
    parameters,
  };
}

function asphaltSurfaceDrainageFixture(input: {
  catalogId: string;
  reference: Json;
  acceptanceEvidenceSha256: string;
}): CatalogRefinementFixture | null {
  if (input.catalogId !== ASPHALT_SURFACE_DRAINAGE_CATALOG_ID
    || text(input.reference.scenario) !== "ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD") return null;
  const compiledGold = compileAsphaltSurfaceDrainageEstimate(
    ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT,
  );
  const parameterSchemaSha256 = sha256(ASPHALT_SURFACE_DRAINAGE_INPUTS.map((parameter) => [
    parameter.parameterId,
    parameter.valueType,
    parameter.unitId,
    parameter.required,
    parameter.requiredWhen ?? null,
    parameter.choices ?? [],
    parameter.minimum ?? null,
    parameter.maximum ?? null,
    parameter.visibilityRole,
  ]));
  const actualEvidenceSha256 = sha256({
    contract: ASPHALT_SURFACE_DRAINAGE_CONTRACT,
    parameterSchemaSha256,
    goldInput: ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT,
    goldRows: compiledGold.map((row) => [
      row.rowId,
      row.category,
      row.evaluatedQuantity,
      row.normalizedUom,
    ]),
    independentlyFrozenExpected: {
      trenchExcavationM3: 54,
      beddingM3: 10.8,
      backfillM3: 32.4,
      trayConcreteM3: 14.4,
      trayModules: 174,
      trayGratings: 360,
      trayJoints: 179,
      trayFasteners: 720,
      traySiltTraps: 6,
      sealantKg: 21.48,
      soilDisposalTKm: 388.8,
    },
  });
  const referenceHash = text(input.reference.acceptanceEvidenceSha256);
  if (!referenceHash
    || referenceHash !== input.acceptanceEvidenceSha256
    || actualEvidenceSha256 !== input.acceptanceEvidenceSha256) {
    throw new Error(
      `REFINEMENT_FIXTURE_EVIDENCE_HASH_MISMATCH:${referenceHash}:${input.acceptanceEvidenceSha256}:${actualEvidenceSha256}`,
    );
  }
  return {
    fixtureKind: "validation_scenario_registry:ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD",
    parameters: ASPHALT_SURFACE_DRAINAGE_LINEAR_GOLD_INPUT,
  };
}

function r555AsphaltRemovalFullApplicableFixture(input: {
  catalogId: string;
  reference: Json;
  allReferences: readonly Json[];
  acceptanceEvidenceSha256: string;
}): CatalogRefinementFixture | null {
  if (!ASPHALT_REMOVAL_CATALOG_IDS.has(input.catalogId)
    || text(input.reference.scenario) !== "R555_ASPHALT_FULL_APPLICABLE_DEFAULT") return null;
  const expectedRows = Number(input.reference.expectedRows);
  const zeroRows = Number(input.reference.zeroRows);
  const genericRows = Number(input.reference.genericRows);
  const currentEvidenceReference = input.allReferences.some((reference) =>
    text(reference.scenario) === "R6_NO_HIDDEN_RUNTIME_ASSUMPTIONS"
    && text(reference.acceptanceEvidenceSha256) === input.acceptanceEvidenceSha256);
  if (expectedRows !== 21 || zeroRows !== 0 || genericRows !== 0 || !currentEvidenceReference) {
    throw new Error(`REFINEMENT_ASPHALT_REMOVAL_SCENARIO_DRIFT:${input.catalogId}`);
  }
  return {
    fixtureKind: "validation_scenario_registry:R555_ASPHALT_FULL_APPLICABLE_DEFAULT",
    // The exact demolition/milling catalog selection owns this package. The
    // production compiler treats it as binding metadata, not a guessed project
    // quantity (compileAsphaltRemovalThroughCoreV4).
    parameters: { asphalt_removal_package_required: true },
  };
}

export function resolveCatalogRefinementFixture(input: {
  catalogId: string;
  validationScenarioRefs: unknown;
  acceptanceEvidenceSha256: unknown;
}): CatalogRefinementFixture | null {
  const references = Array.isArray(input.validationScenarioRefs)
    ? input.validationScenarioRefs.map(record).filter((value): value is Json => value != null)
    : [];
  for (const reference of references) {
    const fromFile = fileFixture(input.catalogId, reference);
    if (fromFile != null) return fromFile;
    const fromInlineFormwork = evidenceBoundInlineFormworkFixture({
      catalogId: input.catalogId,
      reference,
      acceptanceEvidenceSha256: text(input.acceptanceEvidenceSha256),
    });
    if (fromInlineFormwork != null) return fromInlineFormwork;
    const fromAsphaltSurfaceDrainage = asphaltSurfaceDrainageFixture({
      catalogId: input.catalogId,
      reference,
      acceptanceEvidenceSha256: text(input.acceptanceEvidenceSha256),
    });
    if (fromAsphaltSurfaceDrainage != null) return fromAsphaltSurfaceDrainage;
    const fromR555AsphaltRemoval = r555AsphaltRemovalFullApplicableFixture({
      catalogId: input.catalogId,
      reference,
      allReferences: references,
      acceptanceEvidenceSha256: text(input.acceptanceEvidenceSha256),
    });
    if (fromR555AsphaltRemoval != null) return fromR555AsphaltRemoval;
    const fromRegistry = stripFoundationFixture({
      catalogId: input.catalogId,
      reference,
      acceptanceEvidenceSha256: text(input.acceptanceEvidenceSha256),
    });
    if (fromRegistry != null) return fromRegistry;
  }
  return null;
}
