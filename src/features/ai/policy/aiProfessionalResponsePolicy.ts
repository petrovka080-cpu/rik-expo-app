import type { AiDomain, AiUserRole } from "./aiRolePolicy";

export type AiProfessionalResponsePolicyParams = {
  role: AiUserRole;
  domain?: AiDomain | null;
};

const ROLE_STRUCTURE: Record<AiUserRole, readonly string[]> = {
  director: [
    "cross-domain summary",
    "key risks",
    "approval status",
    "next controlled action",
  ],
  control: [
    "cross-domain summary",
    "key risks",
    "approval status",
    "next controlled action",
  ],
  foreman: [
    "object or project",
    "completed work",
    "open blockers",
    "materials and requests",
    "draft report or act",
  ],
  buyer: [
    "materials or suppliers",
    "price, schedule, and availability",
    "supplier risk",
    "request or RFQ draft",
    "approval requirement",
  ],
  accountant: [
    "amount, debt, or payment status",
    "counterparty",
    "documents",
    "risk",
    "next action",
  ],
  warehouse: [
    "stock balance",
    "movement",
    "shortage risk",
    "request proposal",
    "approval for stock mutation",
  ],
  contractor: [
    "own tasks or acts",
    "open closeout items",
    "required documents",
    "what to send for review",
  ],
  office: [
    "office scope",
    "documents or users",
    "risk",
    "next controlled action",
  ],
  admin: [
    "admin scope",
    "documents or users",
    "risk",
    "next controlled action",
  ],
  unknown: [
    "safe route",
    "unavailable data",
    "next non-mutating action",
  ],
};

export function buildAiProfessionalResponsePolicyPrompt(
  params: AiProfessionalResponsePolicyParams,
): string {
  const roleLines = ROLE_STRUCTURE[params.role] ?? ROLE_STRUCTURE.unknown;
  return [
    "Professional construction AI response policy:",
    "Answer as a construction operations assistant, not as a casual chatbot.",
    "Use this structure when data is available:",
    "1. Kratkiy vyvod / Краткий вывод",
    "2. Chto naydeno / Что найдено",
    "3. Riski / Риски",
    "4. Chto mozhno sdelat dalshe / Что можно сделать дальше",
    "5. Nuzhen li approval / Нужен ли approval",
    "6. Hidden or unavailable data by role / Какие данные скрыты или недоступны по роли",
    `Role: ${params.role}`,
    `Domain: ${params.domain ?? "unknown"}`,
    `Role-specific focus: ${roleLines.join("; ")}`,
    "Hard rules: do not invent data; say when data is unavailable by role; do not reveal hidden finance, supplier, token, provider, or internal details; do not claim an action is done when it is only drafted; mark approval_required clearly; never suggest bypassing approval.",
  ].join("\n");
}

export function assertProfessionalResponsePolicyApplied(systemPrompt: string): boolean {
  return (
    systemPrompt.includes("Professional construction AI response policy") &&
    systemPrompt.includes("approval_required") &&
    systemPrompt.includes("do not invent data")
  );
}
