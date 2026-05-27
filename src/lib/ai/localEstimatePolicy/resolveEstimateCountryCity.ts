import type { LocalEstimatePolicyInput } from "./localEstimatePolicyTypes";

export function resolveEstimateCountryCity(input: LocalEstimatePolicyInput): {
  countryCode: string | null;
  city: string | null;
  source: "explicit" | "prompt" | "unknown";
} {
  if (input.countryCode || input.city) {
    return { countryCode: input.countryCode ?? null, city: input.city ?? null, source: "explicit" };
  }
  const text = (input.text ?? "").toLocaleLowerCase("ru-RU");
  if (/бишкек|кыргыз|kyrgyz|bishkek/.test(text)) return { countryCode: "KG", city: "Bishkek", source: "prompt" };
  if (/дубай|dubai|uae|оаэ/.test(text)) return { countryCode: "AE", city: "Dubai", source: "prompt" };
  if (/dallas|texas|tx/.test(text)) return { countryCode: "US", city: "Dallas", source: "prompt" };
  if (/berlin|герман/.test(text)) return { countryCode: "DE", city: "Berlin", source: "prompt" };
  return { countryCode: null, city: null, source: "unknown" };
}
