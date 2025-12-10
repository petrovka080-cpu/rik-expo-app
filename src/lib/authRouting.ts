// src/lib/authRouting.ts
// Маршрутизация на стартовую вкладку по роли

export const FALLBACK_TAB = '/(tabs)/foreman';

export function pathForRole(role: string | null | undefined): string {
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
