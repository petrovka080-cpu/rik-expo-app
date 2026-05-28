import type { GlobalLocalCountryPolicy } from "./globalLocalContextTypes";

export const GLOBAL_LOCAL_COUNTRY_POLICIES: readonly GlobalLocalCountryPolicy[] = Object.freeze([
  {
    countryCode: "KG",
    countryName: "Kyrgyzstan",
    currency: "KGS",
    unitSystem: "metric",
    language: "ru",
    aliases: ["kyrgyzstan", "киргизия", "кыргызстан", "kg"],
    cities: [
      { city: "Bishkek", aliases: ["bishkek", "бишкек", "бишкеке"], region: "Chuy" },
      { city: "Osh", aliases: ["osh", "ош"], region: "Osh" },
      { city: "Tokmok", aliases: ["tokmok", "токмок"], region: "Chuy" },
    ],
    supportedLocalData: true,
  },
  {
    countryCode: "KZ",
    countryName: "Kazakhstan",
    currency: "KZT",
    unitSystem: "metric",
    language: "ru",
    aliases: ["kazakhstan", "казахстан", "kz"],
    cities: [
      { city: "Almaty", aliases: ["almaty", "алматы"] },
      { city: "Astana", aliases: ["astana", "астана", "астане"] },
    ],
    supportedLocalData: true,
  },
  {
    countryCode: "US",
    countryName: "United States",
    currency: "USD",
    unitSystem: "imperial",
    language: "en",
    aliases: ["usa", "united states", "america", "сша", "us"],
    cities: [
      { city: "Austin", aliases: ["austin", "austin texas"], region: "TX" },
      { city: "Dallas", aliases: ["dallas"], region: "TX" },
      { city: "Los Angeles", aliases: ["los angeles"], region: "CA" },
      { city: "New York", aliases: ["new york"], region: "NY" },
    ],
    supportedLocalData: true,
  },
  {
    countryCode: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    unitSystem: "mixed",
    language: "en",
    aliases: ["uk", "united kingdom", "great britain", "england", "london", "великобритания"],
    cities: [{ city: "London", aliases: ["london", "лондон"] }],
    supportedLocalData: true,
  },
  {
    countryCode: "DE",
    countryName: "Germany",
    currency: "EUR",
    unitSystem: "metric",
    language: "de",
    aliases: ["germany", "deutschland", "германия", "de"],
    cities: [
      { city: "Berlin", aliases: ["berlin", "берлин"] },
      { city: "Munich", aliases: ["munich", "munchen", "muenchen", "мюнхен"] },
    ],
    supportedLocalData: true,
  },
  {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    currency: "AED",
    unitSystem: "metric",
    language: "en",
    aliases: ["uae", "united arab emirates", "emirates", "dubai", "оаэ", "дубай"],
    cities: [{ city: "Dubai", aliases: ["dubai", "дубай"] }],
    supportedLocalData: true,
  },
  {
    countryCode: "NP",
    countryName: "Nepal",
    currency: "NPR",
    unitSystem: "metric",
    language: "en",
    aliases: ["nepal", "непал"],
    cities: [{ city: "Kathmandu", aliases: ["kathmandu", "катманду"] }],
    supportedLocalData: false,
  },
]);

export function findGlobalLocalCountryPolicy(countryCode: string | null | undefined): GlobalLocalCountryPolicy | undefined {
  if (!countryCode) return undefined;
  const normalized = countryCode.toUpperCase();
  return GLOBAL_LOCAL_COUNTRY_POLICIES.find((policy) => policy.countryCode === normalized);
}
