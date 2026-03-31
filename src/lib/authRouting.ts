// src/lib/authRouting.ts
// РњР°СЂС€СЂСѓС‚РёР·Р°С†РёСЏ РЅР° СЃС‚Р°СЂС‚РѕРІСѓСЋ РІРєР»Р°РґРєСѓ РїРѕ СЂРѕР»Рё

export type RoleHomePath =
  | '/(tabs)/director'
  | '/(tabs)/buyer'
  | '/(tabs)/accountant'
  | '/(tabs)/warehouse'
  | '/(tabs)/security'
  | '/(tabs)/foreman';

export const FALLBACK_TAB: RoleHomePath = '/(tabs)/foreman';

export function pathForRole(role: string | null | undefined): RoleHomePath {
  const r = (role ?? '').toLowerCase();
  switch (r) {
    case 'director':
      return '/(tabs)/director';
    case 'buyer':
      return '/(tabs)/buyer';
    case 'accountant':
      return '/(tabs)/accountant';
    case 'warehouse':
      return '/(tabs)/warehouse';
    case 'security':
      return '/(tabs)/security';
    case 'foreman':
      return '/(tabs)/foreman';
    default:
      return FALLBACK_TAB;
  }
}

export function shouldEnforceClientRoleRedirect(): boolean {
  const runtime = globalThis as typeof globalThis & { __DEV__?: unknown };
  return runtime.__DEV__ !== true;
}

export function postAuthPathForRole(role: string | null | undefined): RoleHomePath {
  return shouldEnforceClientRoleRedirect() ? pathForRole(role) : FALLBACK_TAB;
}
