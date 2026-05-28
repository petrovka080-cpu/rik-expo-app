import { resolveCountryRegionCity } from "../globalLocalContext";
import type { EstimateIntentExtraction } from "./estimateRoutingTypes";

export function normalizeEstimatePromptText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, " ");
}

export function detectEstimatePromptLanguage(text: string): string {
  return /[а-я]/i.test(text) ? "ru" : "en";
}

export function extractEstimateVolume(text: string): { volume?: number; unit?: string } {
  const match = normalizeEstimatePromptText(text).match(/(\d+(?:[\s,.]\d{3})*(?:[,.]\d+)?)\s*(м2|м²|кв\.?\s*м|квадрат(?:ных|ный|а|ов)?\s*метр(?:ов|а)?|m2|m²|sqm|sq\s*ft|ft2|м3|м³|m3|куб\.?\s*м|пог\.?\s*м|погонн(?:ых|ый|ые)?\s*метр(?:ов|а)?|метр(?:ов|а)?|м(?=$|\s|,|\.)|кг|kg|тонн?|т(?=$|\s|,|\.)|шт|штук|pcs|розеток|дверей|окон|точек|точки|точка|компл\.?|комплект)/i);
  if (!match) return {};

  const volume = Number(match[1].replace(/\s/g, "").replace(",", "."));
  const rawUnit = match[2].replace(/\s+/g, " ").toLowerCase();
  const unit =
    /м2|м²|кв|квадрат|m2|m²|sqm/.test(rawUnit) ? "sq_m" :
      /sq ft|ft2/.test(rawUnit) ? "sq_ft" :
        /м3|м³|m3|куб/.test(rawUnit) ? "m3" :
          /пог|метр|^м$/.test(rawUnit) ? "linear_m" :
            /кг|kg/.test(rawUnit) ? "kg" :
              /тон|^т$/.test(rawUnit) ? "ton" :
                /компл|комплект/.test(rawUnit) ? "set" :
                  "pcs";

  return { volume, unit };
}

export function extractEstimateLocation(text: string): EstimateIntentExtraction["location"] {
  const normalized = normalizeEstimatePromptText(text);
  const localContext = resolveCountryRegionCity({ prompt: text });
  if (localContext.source === "explicit_prompt" && localContext.countryCode) {
    return {
      countryCode: localContext.countryCode,
      stateOrRegion: localContext.region,
      city: localContext.city,
    };
  }
  if (/(бишкек|кыргыз|kg|kgs)/.test(normalized)) return { countryCode: "KG", city: "Bishkek" };
  if (/(дубай|dubai|uae|оаэ)/.test(normalized)) return { countryCode: "AE", city: "Dubai" };
  if (/(dallas|texas|tx|сша|usa|us)/.test(normalized)) return { countryCode: "US", stateOrRegion: "TX", city: "Dallas" };
  if (/(germany|deutschland|герман|берлин|berlin)/.test(normalized)) return { countryCode: "DE" };
  return undefined;
}

export function extractEstimatePrompt(text: string): EstimateIntentExtraction {
  const normalizedText = normalizeEstimatePromptText(text);
  const volume = extractEstimateVolume(text);
  return {
    normalizedText,
    language: detectEstimatePromptLanguage(text),
    volume: volume.volume,
    unit: volume.unit,
    location: extractEstimateLocation(text),
  };
}
