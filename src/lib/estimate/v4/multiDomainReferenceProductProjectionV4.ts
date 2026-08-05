import { deterministicNormalizedSourceHash } from "./professionalOntologyContracts";
import { safeJsonParse } from "../../format";
import {
  compileMultiDomainReferencePassportV4,
  MULTI_DOMAIN_REFERENCE_PASSPORTS_V4,
  type CompiledReferenceBoqRowV4,
} from "./multiDomainReferencePassportsV4";

export type ManualReferencePriceV4 = {
  amount: number;
  currency: string;
  region: string;
  priceDate: string;
};

export type LegacyMaterialPriceV4 = {
  rowDefinitionId: string;
  semanticKey?: string;
  manualPrice: ManualReferencePriceV4;
  aggregate: boolean;
};

export type MaterialPriceMigrationV4 = {
  pricesBySemanticKey: Readonly<Record<string, ManualReferencePriceV4>>;
  reviewRequired: readonly {
    rowDefinitionId: string;
    reason: "LEGACY_AGGREGATE_PRICE_CANNOT_BE_DISTRIBUTED";
  }[];
};

export function migrateAtomicMaterialManualPricesV4(
  rows: readonly LegacyMaterialPriceV4[],
): MaterialPriceMigrationV4 {
  const pricesBySemanticKey: Record<string, ManualReferencePriceV4> = {};
  const reviewRequired: MaterialPriceMigrationV4["reviewRequired"][number][] = [];
  for (const row of rows) {
    if (row.aggregate || !row.semanticKey) {
      reviewRequired.push({
        rowDefinitionId: row.rowDefinitionId,
        reason: "LEGACY_AGGREGATE_PRICE_CANNOT_BE_DISTRIBUTED",
      });
      continue;
    }
    pricesBySemanticKey[row.semanticKey] = row.manualPrice;
  }
  return { pricesBySemanticKey, reviewRequired };
}

export type MultiDomainReferenceProjectionV4 = {
  revision: {
    requestedCatalogWorkId: string;
    professionalEstimatePassportId: string;
    semanticOwner: string;
    calculationStrategyId: string;
    formulaGraphVersion: string;
    parameterValues: Readonly<Record<string, number>>;
    assumptions: readonly { parameterId: string; value: number; source: string }[];
    sourceProfile: string;
    boq: readonly (CompiledReferenceBoqRowV4 & { manualPrice: ManualReferencePriceV4 | null })[];
    comments: readonly string[];
    attachmentMetadata: readonly { attachmentId: string; name: string; mimeType: string; size: number }[];
  };
  pdfModel: {
    passportId: string;
    professionalNameRu: string;
    resultUnit: string;
    formulaGraphVersion: string;
    boq: MultiDomainReferenceProjectionV4["revision"]["boq"];
  };
  procurementModel: {
    passportId: string;
    rows: readonly (CompiledReferenceBoqRowV4 & { manualPrice: ManualReferencePriceV4 | null })[];
  };
  checksum: string;
};

export function projectMultiDomainReferenceEstimateV4(input: {
  catalogWorkId: string;
  parameterValues: Readonly<Record<string, number>>;
  manualPrices?: Readonly<Record<string, ManualReferencePriceV4>>;
  manualPricesBySemanticKey?: Readonly<Record<string, ManualReferencePriceV4>>;
  comments?: readonly string[];
  attachmentMetadata?: readonly { attachmentId: string; name: string; mimeType: string; size: number }[];
}): MultiDomainReferenceProjectionV4 {
  const passport = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.find((item) => item.catalogWorkId === input.catalogWorkId);
  if (!passport) throw new Error(`UNKNOWN_REFERENCE_PASSPORT:${input.catalogWorkId}`);
  const compilation = compileMultiDomainReferencePassportV4(input.catalogWorkId, input.parameterValues);
  const parameterValues = Object.fromEntries(passport.parameters.map((parameter) => [
    parameter.parameterId,
    compilation.formulaValues[parameter.parameterId],
  ]));
  const boq = compilation.boq.map((row) => ({
    ...row,
    manualPrice: input.manualPricesBySemanticKey?.[row.semanticKey ?? ""] ??
      input.manualPrices?.[row.rowDefinitionId] ??
      null,
  }));
  const revision = {
    requestedCatalogWorkId: passport.catalogWorkId,
    professionalEstimatePassportId: passport.professionalEstimatePassportId,
    semanticOwner: passport.semanticOwner,
    calculationStrategyId: passport.calculationStrategyId,
    formulaGraphVersion: passport.formulaGraphVersion,
    parameterValues,
    assumptions: passport.parameters.filter((parameter) => parameter.requiredLevel !== "P0").map((parameter) => ({
      parameterId: parameter.parameterId,
      value: parameterValues[parameter.parameterId],
      source: parameter.defaultSource ?? "USER_OVERRIDE",
    })),
    sourceProfile: passport.methodologyProfile,
    boq,
    comments: [...(input.comments ?? [])],
    attachmentMetadata: [...(input.attachmentMetadata ?? [])],
  };
  const projectionWithoutChecksum = {
    revision,
    pdfModel: {
      passportId: passport.professionalEstimatePassportId,
      professionalNameRu: passport.professionalNameRu,
      resultUnit: passport.resultUnit,
      formulaGraphVersion: passport.formulaGraphVersion,
      boq,
    },
    procurementModel: {
      passportId: passport.professionalEstimatePassportId,
      rows: boq.filter((row) => row.category === "materials" || row.category === "equipment"),
    },
  };
  return {
    ...projectionWithoutChecksum,
    checksum: deterministicNormalizedSourceHash([projectionWithoutChecksum]),
  };
}

export function restoreMultiDomainReferenceProjectionV4(serialized: string): MultiDomainReferenceProjectionV4 {
  const result = safeJsonParse<MultiDomainReferenceProjectionV4 | null>(serialized, null);
  if (!result.ok) throw result.error;
  const parsed = result.value;
  if (!parsed) throw new Error("REFERENCE_PROJECTION_INVALID");
  const { checksum, ...payload } = parsed;
  if (deterministicNormalizedSourceHash([payload]) !== checksum) throw new Error("REFERENCE_PROJECTION_CHECKSUM_MISMATCH");
  return parsed;
}
