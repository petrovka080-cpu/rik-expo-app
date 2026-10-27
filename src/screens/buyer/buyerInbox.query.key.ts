/**
 * buyerInbox.query.key — query key factory for buyer inbox.
 *
 * P6.3: Centralizes query key construction for buyer inbox.
 */

export const buyerInboxKeys = {
  all: ["buyer", "inbox"] as const,
  search: (searchQuery: string) =>
    ["buyer", "inbox", searchQuery] as const,
} as const;
