import { withPdfActorBoundary } from "./withPdfActorBoundary";
const makeAuth = () => {
  let actor: string | null = "A";
  let notify: (event: string, session: { user: { id: string } } | null) => void = () => {};
  const unsubscribe = jest.fn();
  const session = () => actor ? { user: { id: actor } } : null;
  return {
    unsubscribe,
    emit: (event: string, id: string | null) => { actor = id; notify(event, session()); },
    auth: {
      getSession: jest.fn(async () => ({ data: { session: session() }, error: null })),
      onAuthStateChange: (callback: typeof notify) => { notify = callback; return { data: { subscription: { unsubscribe } } }; },
    },
  };
};
describe("PDF delivery actor fence", () => {
  it("permits token refresh for the same actor", async () => {
    const fake = makeAuth();
    await expect(withPdfActorBoundary(fake.auth, async () => { fake.emit("TOKEN_REFRESHED", "A"); return "file"; })).resolves.toBe("file");
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it.each(["B", null])("rejects result after switching to %s", async actor => {
    const fake = makeAuth();
    await expect(withPdfActorBoundary(fake.auth, async () => { fake.emit(actor ? "SIGNED_IN" : "SIGNED_OUT", actor); return "secret"; })).rejects.toThrow("actor changed");
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("rejects A→B→A even when final actor matches", async () => {
    const fake = makeAuth();
    await expect(withPdfActorBoundary(fake.auth, async () => { fake.emit("SIGNED_IN", "B"); fake.emit("SIGNED_IN", "A"); return "secret"; })).rejects.toThrow("actor changed");
  });
  it("blocks anonymous operation before transport", async () => {
    const fake = makeAuth(); fake.emit("SIGNED_OUT", null);
    const operation = jest.fn(async () => "secret");
    await expect(withPdfActorBoundary(fake.auth, operation)).rejects.toThrow("authenticated actor");
    expect(operation).not.toHaveBeenCalled();
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("unsubscribes and propagates backend denial", async () => {
    const fake = makeAuth();
    await expect(withPdfActorBoundary(fake.auth, async () => { throw new Error("MFA denied"); })).rejects.toThrow("MFA denied");
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
