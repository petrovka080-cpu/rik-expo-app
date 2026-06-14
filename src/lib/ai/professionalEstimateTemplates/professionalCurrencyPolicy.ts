import type {
  ProfessionalCurrency,
  ProfessionalRegion,
} from "./professionalEstimateTypes";

export const PROFESSIONAL_REGION_CURRENCY: Readonly<Record<ProfessionalRegion, ProfessionalCurrency>> = Object.freeze({
  KG_BISHKEK: "KGS",
  KG_OSH: "KGS",
  KZ_ALMATY: "KZT",
  KZ_ASTANA: "KZT",
  RU_DEFAULT: "RUB",
  UZ_TASHKENT: "UZS",
});

export function currencyForProfessionalRegion(region: ProfessionalRegion): ProfessionalCurrency {
  return PROFESSIONAL_REGION_CURRENCY[region];
}
