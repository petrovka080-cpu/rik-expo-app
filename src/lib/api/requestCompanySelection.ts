import { supabase } from "../supabaseClient";
import { withPdfActorBoundary } from "../pdf/withPdfActorBoundary";
import { assertRequestCompanyPromptGate, chooseRequestCompany, getRequestCompanyPrompt, type RequestCompanyChoice } from "./requestCompanyPrompt";
import { requireExplicitRequestCompany } from "./requestCompanyScope";

// The server checks current MFA and exact creation roles. A UI choice is intent,
// not authority; the canonical creator/trigger checks the same company again.
export async function withRequestCompanySelection<T>(hint: string | null | undefined, operation: (companyId: string, actorId: string) => Promise<T>): Promise<T> {
  return withPdfActorBoundary(supabase.auth, async (assertCurrent, actorId, delivery) => {
    await assertCurrent();
    assertRequestCompanyPromptGate(actorId);
    if (hint) { return operation(requireExplicitRequestCompany(hint), actorId); }
    const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
    const result = await rpc("office_request_creation_companies_v2", {});
    await assertCurrent();
    assertRequestCompanyPromptGate(actorId);
    if (result.error) throw new Error("Не удалось проверить компании для создания заявки");
    if (!Array.isArray(result.data)) throw new Error("Недействительный список компаний");
    const choices: RequestCompanyChoice[] = result.data.map((row: Record<string, unknown>) => ({
      companyId: requireExplicitRequestCompany(row.company_id), name: String(row.name ?? "").trim(),
    }));
    if (!choices.length || choices.some(choice => !choice.name)) throw new Error("Нет компании с правом создания заявки");
    // Even a sole membership is presented explicitly; no silent first-company
    // selection and no durable authority is stored in a client cache.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || session?.user.id !== actorId) { const current = getRequestCompanyPrompt(); if (current?.boundaryKey === delivery.key) current.cancel(); }
    });
    try {
      const companyId = await chooseRequestCompany(choices, delivery);
      await assertCurrent();
      assertRequestCompanyPromptGate(actorId);
      return await operation(companyId, actorId);
    } finally {
      subscription.unsubscribe();
    }
  });
}
