import type {
  PhotoMaterialCandidate,
  PhotoMaterialCatalogProduct,
  PhotoMaterialObservation,
  PhotoMaterialRecognitionResult,
  PhotoMaterialStoredImage,
} from "./photoMaterialExistingRowTypes";
import { photoMaterialCandidatePayloadHash } from "./photoMaterialExistingRowHash";
import { validatePhotoMaterialImages } from "./photoMaterialExistingRowImages";

function normalizeText(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/[^a-zа-я0-9]+/giu, " ").trim().replace(/\s+/g, " ");
}

function observationsForField(
  observations: readonly PhotoMaterialObservation[],
  field: PhotoMaterialObservation["field"],
): PhotoMaterialObservation[] {
  return observations.filter((observation) => observation.field === field);
}

function observedPrice(observations: readonly PhotoMaterialObservation[]): number | null {
  const price = observationsForField(observations, "price")
    .sort((left, right) => right.confidence - left.confidence)[0]?.value;
  return typeof price === "number" && Number.isFinite(price) && price >= 0 ? price : null;
}

function candidateId(scanId: string, productId: string): string {
  return `${scanId}:candidate:${productId}`;
}

function buildCandidate(input: {
  scanId: string;
  product: PhotoMaterialCatalogProduct;
  source: PhotoMaterialCandidate["source"];
  confidence: number;
  evidenceObservationIds: string[];
  photoUnitPrice: number | null;
}): PhotoMaterialCandidate {
  const withoutHash = {
    candidateId: candidateId(input.scanId, input.product.productId),
    scanId: input.scanId,
    productId: input.product.productId,
    catalogItemId: input.product.catalogItemId ?? null,
    visibleName: input.product.visibleName,
    packageLabel: input.product.packageLabel ?? null,
    packageQuantity: input.product.packageQuantity ?? null,
    packageUnit: input.product.packageUnit ?? null,
    barcode: input.product.barcode ?? null,
    materialKey: input.product.materialKey,
    unit: input.product.unit,
    unitLabel: input.product.unitLabel,
    confidence: input.confidence,
    source: input.source,
    evidenceObservationIds: input.evidenceObservationIds,
    photoUnitPrice: input.photoUnitPrice,
    governedUnitPrice: input.product.governedUnitPrice ?? null,
    governedPriceSourceId: input.product.governedPriceSourceId ?? null,
    governedPriceSourceLabel: input.product.governedPriceSourceLabel ?? null,
    currency: input.product.currency,
  };
  return {
    ...withoutHash,
    payloadHash: photoMaterialCandidatePayloadHash(withoutHash),
  };
}

function exactBarcodeCandidates(input: {
  scanId: string;
  observations: readonly PhotoMaterialObservation[];
  catalog: readonly PhotoMaterialCatalogProduct[];
  photoUnitPrice: number | null;
}): PhotoMaterialCandidate[] {
  const barcodes = observationsForField(input.observations, "barcode")
    .map((observation) => ({
      value: String(observation.value).trim(),
      observation,
    }))
    .filter((item) => item.value);
  if (!barcodes.length) return [];
  const candidates: PhotoMaterialCandidate[] = [];
  for (const item of barcodes) {
    const product = input.catalog.find((candidate) => candidate.barcode === item.value);
    if (!product) continue;
    candidates.push(buildCandidate({
      scanId: input.scanId,
      product,
      source: "EXACT_BARCODE",
      confidence: Math.max(0.95, item.observation.confidence),
      evidenceObservationIds: [item.observation.observationId],
      photoUnitPrice: input.photoUnitPrice,
    }));
  }
  return candidates;
}

function probableCandidates(input: {
  scanId: string;
  observations: readonly PhotoMaterialObservation[];
  catalog: readonly PhotoMaterialCatalogProduct[];
  photoUnitPrice: number | null;
}): PhotoMaterialCandidate[] {
  const textObservations = input.observations.filter((observation) =>
    observation.field === "product_name" || observation.field === "package" || observation.field === "material_key"
  );
  const tokens = textObservations.map((observation) => normalizeText(String(observation.value))).filter(Boolean);
  if (!tokens.length) return [];
  return input.catalog
    .map((product) => {
      const normalizedName = normalizeText([
        product.visibleName,
        product.packageLabel ?? "",
        product.materialKey,
        product.category ?? "",
      ].join(" "));
      const score = tokens.reduce((sum, token) => {
        if (!token) return sum;
        if (product.materialKey === token) return sum + 0.45;
        const parts = token.split(" ").filter((part) => part.length > 1);
        const matches = parts.filter((part) => normalizedName.includes(part)).length;
        return sum + Math.min(0.35, matches * 0.08);
      }, 0.35);
      return { product, score };
    })
    .filter((item) => item.score >= 0.45)
    .sort((left, right) => right.score - left.score || left.product.productId.localeCompare(right.product.productId))
    .slice(0, 3)
    .map((item) => buildCandidate({
      scanId: input.scanId,
      product: item.product,
      source: item.product.catalogItemId ? "CATALOG_MATCH" : "MATERIAL_MASTER_MATCH",
      confidence: Math.min(0.89, Number(item.score.toFixed(2))),
      evidenceObservationIds: textObservations.map((observation) => observation.observationId),
      photoUnitPrice: input.photoUnitPrice,
    }));
}

export function runPhotoMaterialRecognition(input: {
  scanId: string;
  images: readonly PhotoMaterialStoredImage[];
  observations: readonly PhotoMaterialObservation[];
  catalog: readonly PhotoMaterialCatalogProduct[];
}): PhotoMaterialRecognitionResult {
  const quality = validatePhotoMaterialImages(input.images);
  if (!quality.ok) {
    return {
      scanId: input.scanId,
      status: "FAILED",
      observations: [...input.observations],
      candidates: [],
      quality,
      automatic_estimate_mutations: 0,
      automatic_revision_creation: 0,
      automatic_price_application: 0,
      automatic_catalog_mutations: 0,
      fake_green_claimed: false,
    };
  }
  const photoUnitPrice = observedPrice(input.observations);
  const exact = exactBarcodeCandidates({
    scanId: input.scanId,
    observations: input.observations,
    catalog: input.catalog,
    photoUnitPrice,
  });
  const candidates = exact.length > 0
    ? exact.slice(0, 1)
    : probableCandidates({
        scanId: input.scanId,
        observations: input.observations,
        catalog: input.catalog,
        photoUnitPrice,
      });
  return {
    scanId: input.scanId,
    status: candidates.length > 0 ? "NEEDS_CONFIRMATION" : "FAILED",
    observations: [...input.observations],
    candidates,
    quality,
    automatic_estimate_mutations: 0,
    automatic_revision_creation: 0,
    automatic_price_application: 0,
    automatic_catalog_mutations: 0,
    fake_green_claimed: false,
  };
}
