import { withPdfActorBoundary, type PdfDeliveryBoundary } from "../pdf/withPdfActorBoundary";
import { supabase } from "../supabaseClient";

export async function resolveRequestDraftSyncAccessToken(): Promise<string | null> {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token ?? null;
}

export function withRequestDraftSyncActor<T>(operation: (assertCurrent: () => Promise<void>, actorId: string, delivery: PdfDeliveryBoundary) => Promise<T>): Promise<T> {
  return withPdfActorBoundary(supabase.auth, operation);
}
