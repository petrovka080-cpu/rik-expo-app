import type { PdfDeliveryBoundary } from "../pdf/withPdfActorBoundary";
export type RequestCompanyChoice = { companyId: string; name: string };
export type RequestCompanyPrompt = {
  id: number; actorId: string; boundaryKey: string;
  choices: RequestCompanyChoice[]; select: (id: string) => void; cancel: () => void;
};
type HostGate = { actorId: string | null; blocked: boolean };
let prompt: RequestCompanyPrompt | null = null;
let promptSeq = 0;
const hosts = new Map<symbol, HostGate>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
export const getRequestCompanyPrompt = () => prompt;
export const subscribeRequestCompanyPrompt = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function assertRequestCompanyPromptGate(actorId: string): void {
  if (![...hosts.values()].some(gate => !gate.blocked && gate.actorId === actorId)) {
    throw new Error("REQUEST_COMPANY_ASSURANCE_REQUIRED: выбор компании недоступен до проверки сессии");
  }
}
export function registerRequestCompanyPromptHost(gate: HostGate) {
  const key = Symbol("request-company-host");
  hosts.set(key, gate);
  if (prompt && (gate.blocked || gate.actorId !== prompt.actorId)) prompt.cancel();
  return () => {
    hosts.delete(key);
    if (prompt && ![...hosts.values()].some(host => !host.blocked && host.actorId === prompt?.actorId)) prompt.cancel();
  };
}
export function chooseRequestCompany(choices: RequestCompanyChoice[], owner: PdfDeliveryBoundary): Promise<string> {
  owner.assertActive();
  assertRequestCompanyPromptGate(owner.actorId);
  if (prompt) return Promise.reject(new Error("Завершите текущий выбор компании"));
  return new Promise((resolve, reject) => {
    let settled = false;
    const current: RequestCompanyPrompt = {
      id: ++promptSeq, actorId: owner.actorId, boundaryKey: owner.key, choices,
      select: id => {
        if (settled || prompt !== current || !choices.some(choice => choice.companyId === id)) return;
        try { owner.assertActive(); assertRequestCompanyPromptGate(owner.actorId); }
        catch { current.cancel(); return; }
        settled = true;
        prompt = null; notify(); resolve(id);
      },
      cancel: () => {
        if (settled) return;
        settled = true;
        if (prompt === current) { prompt = null; notify(); }
        reject(new Error("Создание заявки отменено"));
      },
    };
    prompt = current;
    notify();
  });
}
