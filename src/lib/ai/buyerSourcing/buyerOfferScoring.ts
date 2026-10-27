import type { BuyerSourcingOffer, SupplierScore } from "./buyerSourcingTypes";

const riskPenalty: Record<BuyerSourcingOffer["riskLevel"], number> = {
  low: 0,
  medium: 10,
  high: 25,
  critical: 45,
};

const availabilityScore: Record<BuyerSourcingOffer["availability"], number> = {
  in_stock: 20,
  limited: 12,
  on_request: 6,
  unknown: 0,
};

const specificationScore: Record<BuyerSourcingOffer["specificationMatch"], number> = {
  exact: 20,
  close_analog: 12,
  needs_review: 6,
  unknown: 0,
};

function priceScore(offer: BuyerSourcingOffer, offers: BuyerSourcingOffer[]): number {
  if (typeof offer.price !== "number") return 0;
  const prices = offers.map((item) => item.price).filter((price): price is number => typeof price === "number");
  if (prices.length === 0) return 0;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max === min) return 20;
  return Math.round(20 - ((offer.price - min) / (max - min)) * 12);
}

function deliveryScore(offer: BuyerSourcingOffer): number {
  if (typeof offer.deliveryDays !== "number") return 0;
  if (offer.deliveryDays <= 1) return 20;
  if (offer.deliveryDays <= 3) return 16;
  if (offer.deliveryDays <= 7) return 10;
  return 4;
}

function reliabilityScore(offer: BuyerSourcingOffer): number {
  if (offer.sourceType === "approved_vendor") return 15;
  if (offer.sourceType === "supplier_history") return 14;
  if (offer.sourceType === "supplier_offer") return 12;
  if (offer.sourceType === "own_marketplace") return 10;
  return 6;
}

function documentRiskScore(offer: BuyerSourcingOffer): number {
  if (offer.riskReasonsRu.some((reason) => /документ|доставк|срок/i.test(reason))) return 6;
  return 10;
}

export function scoreBuyerOffer(offer: BuyerSourcingOffer, offers: BuyerSourcingOffer[]): SupplierScore {
  const p = priceScore(offer, offers);
  const d = deliveryScore(offer);
  const a = availabilityScore[offer.availability];
  const s = specificationScore[offer.specificationMatch];
  const r = reliabilityScore(offer);
  const doc = documentRiskScore(offer);
  const totalScore = Math.max(0, p + d + a + s + r + doc - riskPenalty[offer.riskLevel]);
  const reasonsRu = [
    ...(p >= 16 ? ["цена лучше большинства найденных вариантов"] : []),
    ...(d >= 16 ? ["срок поставки короткий"] : []),
    ...(a >= 12 ? ["наличие подтверждено источником"] : []),
    ...(s >= 12 ? ["соответствие спецификации достаточное для shortlist"] : []),
    ...(r >= 12 ? ["есть approved/history/source evidence"] : []),
  ];
  const warningsRu = [
    ...(offer.specificationMatch !== "exact" ? ["аналог требует проверки по проекту или спецификации"] : []),
    ...(offer.availability === "unknown" ? ["наличие не подтверждено"] : []),
    ...(typeof offer.price !== "number" ? ["цена не указана в источнике"] : []),
    ...offer.riskReasonsRu,
  ];
  return {
    offerId: offer.id,
    totalScore,
    priceScore: p,
    deliveryScore: d,
    availabilityScore: a,
    specificationMatchScore: s,
    reliabilityScore: r,
    documentRiskScore: doc,
    reasonsRu: reasonsRu.length > 0 ? reasonsRu : ["вариант сохранен как source-backed, но требует проверки перед согласованием"],
    warningsRu,
  };
}

export function scoreBuyerOffers(offers: BuyerSourcingOffer[]): SupplierScore[] {
  return offers
    .map((offer) => scoreBuyerOffer(offer, offers))
    .sort((left, right) => right.totalScore - left.totalScore);
}
