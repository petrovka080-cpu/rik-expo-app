// src/lib/format.ts

const LABEL_REQUEST = "\u0417\u0430\u044f\u0432\u043a\u0430";

export function formatRequestDisplay(idUuid?: string | null, idOld?: number | null) {
  if (typeof idOld === "number" && Number.isFinite(idOld)) return `${LABEL_REQUEST} #${idOld}`;
  if (idUuid && typeof idUuid === "string") return `${LABEL_REQUEST} #${idUuid.slice(0, 8)}`;
  return LABEL_REQUEST;
}

export type ProposalRoleTag = "B" | "A" | "S" | "C";

export function roleBadgeLabel(role?: ProposalRoleTag): string {
  switch (role) {
    case "B":
      return "\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0435\u0446";
    case "A":
      return "\u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440\u0438\u044f";
    case "S":
      return "\u0421\u043a\u043b\u0430\u0434";
    case "C":
      return "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a";
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
      : "PR-\u2014";
  return base;
}
