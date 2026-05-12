import { resolveAiScreenRuntime } from "../../src/features/ai/screenRuntime/aiScreenRuntimeResolver";
import type { AiUserRole } from "../../src/features/ai/policy/aiRolePolicy";

type TestAuth = { userId: string; role: AiUserRole };

const director: TestAuth = { userId: "director-user", role: "director" };
const accountant: TestAuth = { userId: "accountant-user", role: "accountant" };
const buyer: TestAuth = { userId: "buyer-user", role: "buyer" };
const foreman: TestAuth = { userId: "foreman-user", role: "foreman" };
const warehouse: TestAuth = { userId: "warehouse-user", role: "warehouse" };
const contractor: TestAuth = { userId: "contractor-user", role: "contractor" };
const office: TestAuth = { userId: "office-user", role: "office" };

function runtime(auth: TestAuth, screenId: string) {
  return resolveAiScreenRuntime({ auth, request: { screenId } });
}

describe("AI screen runtime role scope", () => {
  it("allows director/control cross-domain runtime", () => {
    expect(runtime(director, "director.dashboard").status).toBe("loaded");
    expect(runtime(director, "accountant.main").status).toBe("loaded");
    expect(runtime(director, "warehouse.main").status).toBe("loaded");
  });

  it("keeps finance scoped to accountant/director/control", () => {
    expect(runtime(accountant, "accountant.main").status).toBe("loaded");
    expect(runtime(buyer, "accountant.main").status).toBe("blocked");
    expect(runtime(contractor, "accountant.main").status).toBe("blocked");
  });

  it("keeps procurement, foreman, warehouse, contractor, office, map, and chat scoped", () => {
    expect(runtime(buyer, "buyer.main").domain).toBe("procurement");
    expect(runtime(foreman, "foreman.main").domain).toBe("projects");
    expect(runtime(warehouse, "warehouse.main").domain).toBe("warehouse");
    expect(runtime(contractor, "contractor.main").cards[0]?.summary).toContain("Own tasks");
    expect(runtime(office, "office.hub").status).toBe("loaded");
    expect(runtime(buyer, "map.main").status).toBe("loaded");
    expect(runtime(contractor, "chat.main").status).toBe("loaded");
  });
});
