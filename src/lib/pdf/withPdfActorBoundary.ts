import { getSessionBoundaryGeneration, observeSessionBoundaryPrincipal } from "../session/sessionBoundary";
type SessionResult = { data: { session: { user: { id: string } } | null }; error: unknown };
export type PdfActorAuth = {
  getSession: () => PromiseLike<SessionResult>;
  onAuthStateChange: (callback: (event: string, session: { user: { id: string } } | null) => void) => {
    data: { subscription: { unsubscribe: () => void } };
  };
};

// This fences delivery to the initiating actor. SQL/Edge still establish all
// authority. No JWT or role metadata is interpreted as authorization here.
export type PdfDeliveryBoundary = Readonly<{
  actorId: string;
  key: string;
  assertActive: () => void;
  assertCurrent: () => Promise<void>;
}>;
export async function withPdfActorBoundary<T>(auth: PdfActorAuth, operation: (assertCurrent: () => Promise<void>, actorId: string, delivery: PdfDeliveryBoundary) => Promise<T>): Promise<T> {
  let expectedActor: string | null = null;
  let switched = false;
  let generation = getSessionBoundaryGeneration();
  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    if (session || event === "SIGNED_OUT" || event === "USER_DELETED") observeSessionBoundaryPrincipal(session?.user.id ?? null);
    if (expectedActor !== null && (event === "SIGNED_OUT" || session?.user.id !== expectedActor)) {
      switched = true;
    }
  });
  try {
    const initial = await auth.getSession();
    if (initial.error || !initial.data.session?.user.id) throw new Error("PDF authenticated actor required");
    expectedActor = initial.data.session.user.id;
    observeSessionBoundaryPrincipal(expectedActor);
    generation = getSessionBoundaryGeneration();
    const assertActive = () => {
      if (switched || generation !== getSessionBoundaryGeneration()) {
        throw new Error("PDF actor changed; open again in the current session");
      }
    };
    const assertCurrent = async () => {
      const current = await auth.getSession();
      assertActive();
      if (current.error || current.data.session?.user.id !== expectedActor) {
        throw new Error("PDF actor changed; open again in the current session");
      }
    };
    const delivery: PdfDeliveryBoundary = Object.freeze({
      actorId: expectedActor, key: `${expectedActor}:${generation}`, assertActive, assertCurrent,
    });
    const result = await operation(assertCurrent, expectedActor, delivery);
    await assertCurrent();
    return result;
  } finally {
    subscription.unsubscribe();
  }
}
