import { PROFILE_TAB_ROUTE } from "./navigation/coreRoutes";

export type PostAuthEntryPath = typeof PROFILE_TAB_ROUTE;

// Unified post-auth entry goes through the identity/access hub.
// Role-specific auto-redirects are intentionally not supported anymore.
export const POST_AUTH_ENTRY_ROUTE: PostAuthEntryPath = PROFILE_TAB_ROUTE;
