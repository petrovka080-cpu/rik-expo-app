import { resolveCountryRegionCity } from "./resolveCountryRegionCity";
import type { GlobalLocalContext } from "./globalLocalContextTypes";

export function resolveUserLocaleFallback(userLocale: string | undefined): GlobalLocalContext {
  return resolveCountryRegionCity({ userLocale });
}
