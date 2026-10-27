const trim = (value: unknown) => String(value ?? "").trim();

export const MARKETPLACE_SOURCE_APP_CODE = "MARKETPLACE";
export const MARKETPLACE_NOTE_PREFIX = "marketplace:";

export const buildMarketplaceNoteTag = (listingId: string) =>
  `${MARKETPLACE_NOTE_PREFIX}${trim(listingId)}`;

export const isMarketplaceAppCode = (value: unknown) =>
  trim(value).toUpperCase() === MARKETPLACE_SOURCE_APP_CODE;

export const isMarketplaceNoteTag = (value: unknown) =>
  trim(value).toLowerCase().startsWith(MARKETPLACE_NOTE_PREFIX);

export const isMarketplaceSourceValue = (params: {
  appCode?: unknown;
  note?: unknown;
}) => isMarketplaceAppCode(params.appCode) || isMarketplaceNoteTag(params.note);
