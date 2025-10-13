// src/lib/format.ts
export function formatRequestDisplay(idUuid?: string | null, idOld?: number | null) {
  if (typeof idOld === 'number' && Number.isFinite(idOld)) return `Заявка #${idOld}`;
  if (idUuid && typeof idUuid === 'string') return `Заявка #${idUuid.slice(0, 8)}`;
  return 'Заявка';
}
