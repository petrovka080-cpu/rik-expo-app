import {
  GREEN_SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_READY,
  verifyCatalogRequestServiceOwnerSplit,
} from "../../scripts/architecture/verifyCatalogRequestServiceOwnerSplit";

describe("S_SCALE_11 catalog request service owner split", () => {
  it("keeps the catalog request service below the god-file budget", () => {
    const verification = verifyCatalogRequestServiceOwnerSplit();

    expect(verification.final_status).toBe(
      GREEN_SCALE_CATALOG_REQUEST_SERVICE_OWNER_SPLIT_READY,
    );
    expect(verification.findings).toEqual([]);
    expect(verification.metrics.originalCatalogRequestServiceLines).toBe(1164);
    expect(
      verification.metrics.catalogRequestServiceCurrentLines,
    ).toBeLessThanOrEqual(verification.metrics.catalogRequestServiceLineBudget);
    expect(verification.metrics.catalogRequestServiceUnderBudget).toBe(true);
    expect(verification.metrics.catalogRequestServiceLineReduction).toBeGreaterThanOrEqual(
      250,
    );
  });

  it("moves only mapping, meta payload, and draft storage ownership out of the service", () => {
    const verification = verifyCatalogRequestServiceOwnerSplit();

    expect(verification.metrics.helperSurfaces).toBe(3);
    expect(verification.metrics.helperSurfacesPresent).toBe(true);
    expect(
      verification.inventory.map((entry) => entry.role).sort(),
    ).toEqual(["draft_local_state", "mapping", "meta_payload"]);
    expect(verification.metrics.serviceImportsHelperOwners).toBe(true);
    expect(verification.metrics.publicEntrypointPreserved).toBe(true);
    expect(verification.metrics.typeExportsPreserved).toBe(true);
  });

  it("does not add hooks, UI imports, direct Supabase, business logic drift, or fake green", () => {
    const verification = verifyCatalogRequestServiceOwnerSplit();

    expect(verification.metrics.noHooksAdded).toBe(true);
    expect(verification.metrics.noUiImportsAdded).toBe(true);
    expect(verification.metrics.noDirectSupabaseAdded).toBe(true);
    expect(verification.metrics.sourceModuleBudgetPreserved).toBe(true);
    expect(verification.metrics.businessLogicChanged).toBe(false);
    expect(verification.metrics.fakeGreenClaimed).toBe(false);
  });
});
