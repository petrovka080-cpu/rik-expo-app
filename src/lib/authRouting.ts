// src/lib/authRouting.ts
// РњР°СЂС€СЂСѓС‚РёР·Р°С†РёСЏ РЅР° СЃС‚Р°СЂС‚РѕРІСѓСЋ РІРєР»Р°РґРєСѓ РїРѕ СЂРѕР»Рё

export type RoleHomePath = "/(tabs)/market";

export const FALLBACK_TAB: RoleHomePath = "/(tabs)/market";

export function pathForRole(_role: string | null | undefined): RoleHomePath {
  return FALLBACK_TAB;
}

export function shouldEnforceClientRoleRedirect(): boolean {
  const runtime = globalThis as typeof globalThis & { __DEV__?: unknown };
  return runtime.__DEV__ !== true;
}

export function postAuthPathForRole(role: string | null | undefined): RoleHomePath {
  return shouldEnforceClientRoleRedirect() ? pathForRole(role) : FALLBACK_TAB;
}
