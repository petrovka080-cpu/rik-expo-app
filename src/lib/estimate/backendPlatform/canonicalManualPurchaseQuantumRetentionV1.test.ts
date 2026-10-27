// WORK candidate for transplantation beside canonicalPurchaseBalanceV1.ts.
// NOT RUN. Retained foundation scenarios accompany the separate full-chain drafts.
import {
  CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1,
  canonicalExactManualPurchaseQuantityV1,
  canonicalManualPurchaseSupplyBlockMessageV1,
  parseCanonicalManualPurchaseSupplyBlockV1,
  resolveCanonicalManualPurchaseSupplyBlockV1,
  resolveCanonicalPurchaseBalanceV1,
  validateCanonicalPurchaseOrderQuantityV1,
} from "./canonicalPurchaseBalanceV1";
import { effectivePurchaseBalanceExpressionsR1 } from "../v4/effectivePurchaseBalanceR1";

const owner = "material:test:linear";
const unit = "m";
const declared = new Set(["consumed", "stock", "reserve", "M"]);
const base = { unitId: unit, consumedExpression: "consumed", stockExpression: "stock",
  reserveExpression: "reserve", orderQuantumExpression: "75*M" };
const optIn = { ...base, manualQuantumViolationPolicy: CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1 };
const known = { consumed: "6", stock: "0", reserve: "0", M: "1" };
const provenance = { kind: "manual", reason: "Сохранённое пользователем количество" };
const block = (quantity: string, parameters = known, policy: unknown = optIn) =>
  resolveCanonicalManualPurchaseSupplyBlockV1(policy, owner, unit, quantity, provenance, parameters, declared);

describe("opt-in manual purchase quantum retention foundation; no integration claim", () => {
  it("preserves strict default rejection, both when only M is known and when the balance is resolved", () => {
    expect(block("8", known, base)).toBeNull();
    expect(() => validateCanonicalPurchaseOrderQuantityV1(base, owner, unit, "8", { M: "1" }, declared))
      .toThrow(expect.objectContaining({ code: "ROW_AMENDMENT_INVALID" }));
    expect(() => resolveCanonicalPurchaseBalanceV1(base, owner, unit, "8", known, declared))
      .toThrow(expect.objectContaining({ code: "ROW_AMENDMENT_INVALID" }));
  });

  it("retains exact Q before consumption is known, without physical balance or inferred supply", () => {
    const saved = resolveCanonicalManualPurchaseSupplyBlockV1(optIn, owner, unit, "8.000000000", provenance, { M: "1" }, declared)!;
    expect(saved).toMatchObject({ rawManualQuantity: "8.000000000", quantum: "75", reasonCode: "ORDER_QUANTUM_VIOLATION",
      procurementReady: false, physicalBalanceReady: false, derivedQuantityPublishable: false });
    for (const key of ["effectiveOrder", "remaining", "freeBeyondReserve", "packages", "wholeBars", "unitPrice", "consumed"]) {
      expect(saved).not.toHaveProperty(key);
    }
  });

  it("does not clear the block merely because consumption later becomes known", () => {
    expect(block("8")).toEqual(resolveCanonicalManualPurchaseSupplyBlockV1(optIn, owner, unit, "8", provenance, { M: "1" }, declared));
  });

  it("keeps unknown supply quantum explicitly unconfirmed, including zero Q", () => {
    for (const quantity of ["8", "0"]) {
      expect(resolveCanonicalManualPurchaseSupplyBlockV1(optIn, owner, unit, quantity, provenance, {}, declared))
        .toMatchObject({ rawManualQuantity: quantity, quantum: null, reasonCode: "ORDER_QUANTUM_UNCONFIRMED", procurementReady: false });
    }
  });

  it("leaves a valid exact multiple on the original balance path", () => {
    expect(block("150.000")).toBeNull();
    expect(resolveCanonicalPurchaseBalanceV1(optIn, owner, unit, "150.000", known, declared))
      .toEqual(resolveCanonicalPurchaseBalanceV1(base, owner, unit, "150.000", known, declared));
  });

  it("does not grant an automatic quantity an exception", () => {
    expect(resolveCanonicalManualPurchaseSupplyBlockV1(optIn, owner, unit, null, null, known, declared)).toBeNull();
    expect(() => resolveCanonicalPurchaseBalanceV1(optIn, owner, unit, "8", known, declared))
      .toThrow(expect.objectContaining({ code: "ROW_AMENDMENT_INVALID" }));
    expect(() => validateCanonicalPurchaseOrderQuantityV1(optIn, owner, unit, "8", { M: "1" }, declared))
      .toThrow(expect.objectContaining({ code: "ROW_AMENDMENT_INVALID" }));
  });

  it("requires manual provenance rather than inferring it from a number", () => {
    for (const invalid of [null, {}, { kind: "automatic" }, { kind: "manual", reason: 5 }, { kind: "manual", reason: "x".repeat(501) }]) {
      expect(() => resolveCanonicalManualPurchaseSupplyBlockV1(optIn, owner, unit, "8", invalid, known, declared))
        .toThrow(expect.objectContaining({ code: "ROW_AMENDMENT_INVALID" }));
    }
  });

  it("retains exact text outside IEEE-754 integer precision without Number coercion", () => {
    expect(block("9007199254740993.000000001")?.rawManualQuantity).toBe("9007199254740993.000000001");
    expect(canonicalExactManualPurchaseQuantityV1("+0008.000000000")).toBe("+0008.000000000");
  });

  it.each(["-1", "-0", "1e3", "NaN", "Infinity", "8.0000000001", "100000000000000000000000000000000000000000000", "", " 8 ", "8,5"])(
    "rejects out-of-domain raw value %s without rounding", value => {
      expect(() => block(value)).toThrow(expect.objectContaining({ code: "ROW_AMENDMENT_INVALID" }));
    });

  it("rejects invalid source quantum rather than treating definition defects as manual retention", () => {
    for (const quantum of ["0", "-3"]) {
      expect(() => block("8", known, { ...optIn, orderQuantumExpression: quantum }))
        .toThrow(expect.objectContaining({ code: "DEFINITION_INTEGRITY_FAILED" }));
    }
  });

  it("does not mask known invalid physical/source values behind the retained quantum violation", () => {
    for (const field of ["consumed", "stock", "reserve"]) {
      expect(() => block("8", { ...known, [field]: "-1" }))
        .toThrow(expect.objectContaining({ code: "DEFINITION_INTEGRITY_FAILED" }));
    }
    const selected = { ...optIn, stockExpression: "0", reserveExpression: "0",
      balanceScope: "new_order_vs_required_consumption", requirementBasis: "selected_supply_order", plannedConsumptionExpression: "7" };
    expect(() => block("8", known, selected))
      .toThrow(expect.objectContaining({ code: "DEFINITION_INTEGRITY_FAILED" }));
  });

  it("rejects an unknown policy spelling, decimal opt-in, wrong unit and undeclared inputs", () => {
    for (const policy of [
      { ...base, manualQuantumViolationPolicy: "round-up" },
      { ...base, manualQuantumViolationPolicy: undefined },
      { ...optIn, unitId: "piece" },
      { ...optIn, orderQuantumExpression: "unknown" },
      { unitId: unit, consumedExpression: "consumed", stockExpression: "0", reserveExpression: "0",
        quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption",
        manualQuantumViolationPolicy: CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1 },
    ]) expect(() => block("8", known, policy)).toThrow(expect.objectContaining({ code: "DEFINITION_INTEGRITY_FAILED" }));
  });

  it("round-trips a JSON-persisted block without changing its raw quantity or provenance", () => {
    const saved = block("8.000")!;
    expect(parseCanonicalManualPurchaseSupplyBlockV1(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(parseCanonicalManualPurchaseSupplyBlockV1(null)).toBeNull();
  });

  it("rejects forged readiness, inconsistent reasons, extra fields and corrupt saved decimals", () => {
    const saved = block("8")!;
    for (const delta of [
      { procurementReady: true }, { physicalBalanceReady: true }, { derivedQuantityPublishable: true },
      { quantum: "0" }, { quantum: "4" }, { rawManualQuantity: 8 }, { rawManualQuantity: "8.0000000001" },
      { reasonCode: "ORDER_QUANTUM_UNCONFIRMED" }, { reasonCode: "OTHER" }, { ownerRowId: "" },
      { version: "v0" }, { effectiveOrder: "8" }, { manualProvenance: { kind: "automatic" } },
    ]) expect(() => parseCanonicalManualPurchaseSupplyBlockV1({ ...saved, ...delta }))
      .toThrow(expect.objectContaining({ code: "ARTIFACT_PURCHASE_SUPPLY_BLOCK_INVALID" }));
  });

  it("keeps source inputs and provenance immutable", () => {
    const before = JSON.stringify({ optIn, known, provenance });
    block("8");
    expect(JSON.stringify({ optIn, known, provenance })).toBe(before);
  });

  it("builds a plain saved-value warning with public title and unit labels", () => {
    const message = canonicalManualPurchaseSupplyBlockMessageV1(block("8.000")!, "Мой угловой профиль", "м");
    expect(message).toContain("Мой угловой профиль: сохранено ручное количество 8.000 м");
    expect(message).toContain("шагу поставки 75 м");
    expect(message).toContain("Закупка не готова");
    expect(message).toContain("Сохранённое значение не изменено");
    expect(message).not.toContain("Целые изделия");
  });

  it("keeps all legacy factory formulas unchanged and adds only the explicit supply flag", () => {
    const input = { ownerRowId: owner, orderUnitId: unit, consumed: "consumed", stock: "stock", reserve: "reserve", quantum: "75*M" };
    const old = effectivePurchaseBalanceExpressionsR1(input);
    const next = effectivePurchaseBalanceExpressionsR1({ ...input, manualQuantumViolationPolicy: CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1 });
    const { manualQuantumViolationPolicy, ...purchaseBalance } = next.owner.purchaseBalance!;
    expect(manualQuantumViolationPolicy).toBe(CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1);
    expect({ ...next, owner: { ...next.owner, purchaseBalance } }).toEqual(old);
  });
});
