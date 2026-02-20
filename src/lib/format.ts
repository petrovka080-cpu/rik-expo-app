// src/lib/format.ts

export function formatRequestDisplay(idUuid?: string | null, idOld?: number | null) {
  if (typeof idOld === "number" && Number.isFinite(idOld)) return `Заявка #${idOld}`;
  if (idUuid && typeof idUuid === "string") return `Заявка #${idUuid.slice(0, 8)}`;
  return "Заявка";
}

export type ProposalRoleTag = "B" | "A" | "S" | "C";

export function roleBadgeLabel(role?: ProposalRoleTag): string {
  switch (role) {
    case "B":
      return "Снабженец";
    case "A":
      return "Бухгалтерия";
    case "S":
      return "Склад";
    case "C":
      return "Подрядчик";
    default:
      return "";
  }
}

export function formatProposalBaseNo(
  proposalNo: string | null | undefined,
  proposalId: string | null | undefined
) {
  const base =
    proposalNo && String(proposalNo).trim()
      ? String(proposalNo).trim()
      : proposalId
      ? `PR-${String(proposalId).slice(0, 8)}`
      : "PR-—";
  return base;
}
