import type { CapturedPhotoAsset } from "../mobilePhotoCapture/mobilePhotoCaptureService";
import { safeJsonParse } from "../format";
import { formatEstimateUnitLabel } from "./globalEstimate";
import {
  runPhotoMaterialRecognition,
  type PhotoMaterialCatalogProduct,
  type PhotoMaterialObservation,
  type PhotoMaterialStoredImage,
} from "./photoMaterialExistingRow";
import { requestAiGeneratedText } from "./aiRepository";
import {
  normalizeCatalogItemSearchText,
  searchCatalogItemsForPicker,
  type CatalogItemPickerItem,
} from "../catalog/catalog.facade";

type FileSystemModule = {
  readAsStringAsync?: (uri: string, options?: { encoding?: string }) => Promise<string>;
  EncodingType?: {
    Base64?: string;
  };
};

type PhotoMaterialAiCandidate = {
  name?: unknown;
  confidence?: unknown;
  unit?: unknown;
  barcode?: unknown;
  package?: unknown;
  material_key?: unknown;
};

type PhotoMaterialAiResponse = {
  materials?: unknown;
  barcode?: unknown;
  visible_text?: unknown;
};

export type ConsumerRepairPhotoMaterialRecognitionResult = {
  scanId: string;
  initialQuery: string | undefined;
  statusMessageRu: string;
  observations: PhotoMaterialObservation[];
  catalogCandidates: CatalogItemPickerItem[];
  automatic_estimate_mutations: 0;
  automatic_catalog_mutations: 0;
  fake_green_claimed: false;
};

export type ConsumerRepairPhotoMaterialRecognitionDeps = {
  readLocalImageBase64?: (uri: string) => Promise<string>;
};

const SYSTEM_INSTRUCTION = [
  "Ты распознаёшь строительные материалы на фото для подбора позиции из каталога.",
  "Не придумывай цену и количество. Не создавай смету.",
  "Верни только JSON без markdown.",
  'Формат: {"materials":[{"name":"...","confidence":0.0,"unit":"...","barcode":"...","package":"...","material_key":"..."}],"barcode":"...","visible_text":["..."]}',
  "Если материал не виден, верни пустой список materials.",
].join("\n");

const USER_TEXT = [
  "Recognize the construction material from all visible evidence: the object itself, shape, texture, packaging, label text, barcode, QR code, and price tag.",
  "Do not limit the answer to barcode or price-tag OCR. If the item is visually recognizable, return material names that can be searched in the catalog.",
  "Return likely catalog search names in Russian when possible.",
  "Определи, какой строительный материал на фото.",
  "Нужны только названия материалов и признаки для поиска в каталоге.",
  "Если вариантов несколько, верни до 5 вариантов.",
].join("\n");

function loadFileSystem(): FileSystemModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-file-system/legacy") as FileSystemModule;
  } catch {
    return null;
  }
}

async function readImageBase64(uri: string): Promise<string | null> {
  const fileSystem = loadFileSystem();
  if (!fileSystem?.readAsStringAsync) return null;
  const raw = await fileSystem.readAsStringAsync(uri, {
    encoding: fileSystem.EncodingType?.Base64 ?? "base64",
  });
  const value = String(raw || "").trim();
  return value || null;
}

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function clampConfidence(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.max(0, Math.min(1, parsed));
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function parseAiResponse(raw: string): PhotoMaterialAiResponse {
  const parsed = safeJsonParse<PhotoMaterialAiResponse>(extractJsonObject(raw), {});
  return parsed.ok ? parsed.value : {};
}

function materialCandidatesFromResponse(response: PhotoMaterialAiResponse): PhotoMaterialAiCandidate[] {
  if (!Array.isArray(response.materials)) return [];
  return response.materials
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object" && !Array.isArray(item))
    .slice(0, 5);
}

function buildObservations(input: {
  scanId: string;
  imageId: string;
  response: PhotoMaterialAiResponse;
}): PhotoMaterialObservation[] {
  const observations: PhotoMaterialObservation[] = [];
  const addObservation = (
    field: PhotoMaterialObservation["field"],
    value: string | number,
    confidence: number,
    indexKey: string,
  ) => {
    if (typeof value === "string" && !value.trim()) return;
    observations.push({
      observationId: `${input.scanId}:vision:${field}:${indexKey}`,
      scanId: input.scanId,
      imageId: input.imageId,
      source: field === "barcode" ? "BARCODE" : "VISION",
      field,
      value,
      confidence,
    });
  };

  const topBarcode = cleanString(input.response.barcode);
  if (topBarcode) addObservation("barcode", topBarcode, 0.9, "root");

  materialCandidatesFromResponse(input.response).forEach((candidate, index) => {
    const confidence = clampConfidence(candidate.confidence);
    addObservation("product_name", cleanString(candidate.name), confidence, String(index));
    addObservation("barcode", cleanString(candidate.barcode), confidence, String(index));
    addObservation("package", cleanString(candidate.package), confidence, String(index));
    addObservation("unit", cleanString(candidate.unit), confidence, String(index));
    addObservation("material_key", cleanString(candidate.material_key), confidence, String(index));
  });

  return observations;
}

function uniqueQueries(response: PhotoMaterialAiResponse): string[] {
  const names = materialCandidatesFromResponse(response)
    .map((candidate) => cleanString(candidate.name))
    .filter(Boolean);
  const visibleText = Array.isArray(response.visible_text)
    ? response.visible_text.map(cleanString).filter((value) => value.length >= 2)
    : [];
  return [...new Set([...names, ...visibleText])].slice(0, 5);
}

function mapPickerItemToCatalogProduct(item: CatalogItemPickerItem): PhotoMaterialCatalogProduct {
  const visibleName = item.name;
  const unit = item.unit || "pcs";
  return {
    productId: item.catalogItemId,
    catalogItemId: item.catalogItemId,
    visibleName,
    packageLabel: null,
    packageQuantity: null,
    packageUnit: null,
    barcode: null,
    materialKey: item.materialKey || normalizeCatalogItemSearchText(visibleName),
    category: item.category ?? item.kind ?? null,
    unit,
    unitLabel: item.unitLabel || formatEstimateUnitLabel(unit),
    governedUnitPrice: item.unitPrice ?? null,
    governedPriceSourceId: item.sourceId,
    governedPriceSourceLabel: item.sourceLabel,
    currency: item.currency ?? "KGS",
    source: "catalog_item",
  };
}

async function loadCatalogCandidates(queries: readonly string[]): Promise<CatalogItemPickerItem[]> {
  const results: CatalogItemPickerItem[] = [];
  const seen = new Set<string>();
  for (const query of queries) {
    const rows = await searchCatalogItemsForPicker(query, 8).catch(() => []);
    for (const row of rows) {
      const key = `${row.catalogItemId}:${row.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(row);
    }
  }
  return results.slice(0, 20);
}

export async function recognizeConsumerRepairPhotoMaterial(input: {
  scanId: string;
  asset: CapturedPhotoAsset;
  storedImage: PhotoMaterialStoredImage;
  deps?: ConsumerRepairPhotoMaterialRecognitionDeps;
}): Promise<ConsumerRepairPhotoMaterialRecognitionResult> {
  const readLocalImage = input.deps?.readLocalImageBase64 ?? readImageBase64;
  const imageData = await readLocalImage(input.asset.localUri).catch(() => null);
  if (!imageData) {
    return {
      scanId: input.scanId,
      initialQuery: undefined,
      statusMessageRu: "Фото принято. Не удалось прочитать снимок, введите название материала вручную.",
      observations: [],
      catalogCandidates: [],
      automatic_estimate_mutations: 0,
      automatic_catalog_mutations: 0,
      fake_green_claimed: false,
    };
  }

  const rawResponse = await requestAiGeneratedText({
    sourcePath: "photo_material_recognition",
    request: {
      model: process.env.EXPO_PUBLIC_GEMINI_VISION_MODEL || process.env.EXPO_PUBLIC_GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      contents: [{
        role: "user",
        parts: [
          { text: USER_TEXT },
          { inlineData: { mimeType: input.asset.mimeType, data: imageData } },
        ],
      }],
      generationConfig: {
        temperature: 0,
        topP: 0.1,
        maxOutputTokens: 700,
        responseMimeType: "application/json",
      },
    },
  }).catch(() => "");

  const response = rawResponse ? parseAiResponse(rawResponse) : {};
  const observations = buildObservations({
    scanId: input.scanId,
    imageId: input.storedImage.imageId,
    response,
  });
  const queries = uniqueQueries(response);
  const catalogCandidates = await loadCatalogCandidates(queries);
  const recognition = runPhotoMaterialRecognition({
    scanId: input.scanId,
    images: [input.storedImage],
    observations,
    catalog: catalogCandidates.map(mapPickerItemToCatalogProduct),
  });
  const bestCandidate = recognition.candidates[0];
  const initialQuery = bestCandidate?.visibleName ?? queries[0];

  return {
    scanId: input.scanId,
    initialQuery,
    statusMessageRu: initialQuery
      ? `Фото распознано: ${initialQuery}. Выберите материал из каталога.`
      : "Фото принято. Материал не распознан уверенно, введите название вручную.",
    observations,
    catalogCandidates,
    automatic_estimate_mutations: 0,
    automatic_catalog_mutations: 0,
    fake_green_claimed: false,
  };
}
