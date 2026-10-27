/**
 * accountantInbox.query.key — query key factory for accountant inbox.
 *
 * P6.2: Centralizes query key construction for accountant inbox.
 */

import type { Tab } from "./types";

export const accountantInboxKeys = {
  all: ["accountant", "inbox"] as const,
  tab: (tab: Tab) => ["accountant", "inbox", tab] as const,
} as const;
