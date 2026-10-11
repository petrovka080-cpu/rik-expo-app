import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { ConsumerCanonicalReleaseMigrationConfirmation, useConsumerCanonicalReleaseMigrationConfirmation } from "../../src/features/consumerRepair/ConsumerCanonicalReleaseMigrationConfirmation";

const prompt = { revisionId: "parent", titleRu: "Кровля", fromReleaseId: "old-release", toReleaseId: "new-release", fromDefinitionVersion: 1, toDefinitionVersion: 2 };
type Confirmation = ReturnType<typeof useConsumerCanonicalReleaseMigrationConfirmation>;

describe("release migration consent UI", () => {
  let api: Confirmation;
  let renderer: TestRenderer.ReactTestRenderer;
  const Harness = ({ workspace }: { workspace: string }) => {
    api = useConsumerCanonicalReleaseMigrationConfirmation(workspace);
    return <ConsumerCanonicalReleaseMigrationConfirmation prompt={api.prompt} onConfirm={api.confirm} onCancel={api.cancel} />;
  };
  beforeEach(() => { act(() => { renderer = TestRenderer.create(<Harness workspace="owner-draft-a" />); }); });
  afterEach(() => { act(() => renderer.unmount()); });

  it("shows the target work and requires the dedicated confirmation button", async () => {
    let result!: Promise<boolean>;
    act(() => { result = api.confirmReleaseMigration(prompt); });
    expect(JSON.stringify(renderer.toJSON())).toContain("Кровля");
    act(() => renderer.root.findByProps({ testID: "consumer-estimate-release-migration-confirm" }).props.onPress());
    await expect(result).resolves.toBe(true);
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-release-migration-confirmation" })).toHaveLength(0);
  });

  it("cancel retains the parent and does not grant consent to another pending action", async () => {
    let result!: Promise<boolean>;
    act(() => { result = api.confirmReleaseMigration(prompt); });
    await expect(api.confirmReleaseMigration({ ...prompt, revisionId: "another" })).resolves.toBe(false);
    act(() => renderer.root.findByProps({ testID: "consumer-estimate-release-migration-cancel" }).props.onPress());
    await expect(result).resolves.toBe(false);
  });

  it("invalidates the pending notice when owner or draft changes", async () => {
    let result!: Promise<boolean>;
    const oldApi = api;
    act(() => { result = api.confirmReleaseMigration(prompt); });
    act(() => renderer.update(<Harness workspace="owner-draft-b" />));
    await expect(result).resolves.toBe(false);
    await expect(oldApi.confirmReleaseMigration(prompt)).resolves.toBe(false);
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-release-migration-confirmation" })).toHaveLength(0);
  });

  it("cancels the pending request when the screen unmounts", async () => {
    let result!: Promise<boolean>;
    act(() => { result = api.confirmReleaseMigration(prompt); });
    act(() => renderer.unmount());
    await expect(result).resolves.toBe(false);
  });

  it('requires explicit selection of every visible and hidden physical reset and shows old/new quantities', async () => {
    let result!: Promise<boolean>;
    const rows = [{ rowId: 'bench', titleRu: 'Скамья', unitId: 'pcs', oldQuantity: '5', calculatedQuantity: '3', excluded: false },
      { rowId: 'fixing', titleRu: 'Крепление', unitId: 'pcs', oldQuantity: '17', calculatedQuantity: '12', excluded: true }];
    act(() => { result = api.confirmReleaseMigration({ ...prompt, quantityClearPreview: { contractVersion: 'canonical-fusion-quantity-clear-preview/v1',
      catalogId: 'fusion', parentRevisionId: 'parent', parentChecksumSha256: 'a'.repeat(64), fromReleaseId: 'old-release', toReleaseId: 'new-release', rows } }); });
    const confirm = () => renderer.root.findByProps({ testID: 'consumer-estimate-release-migration-confirm' });
    expect(confirm().props.disabled).toBe(true);
    expect(JSON.stringify(renderer.toJSON())).toContain('17');
    expect(JSON.stringify(renderer.toJSON())).toContain('строка сейчас исключена');
    act(() => renderer.root.findByProps({ testID: 'consumer-estimate-quantity-clear-bench' }).props.onPress());
    expect(confirm().props.disabled).toBe(true);
    act(() => renderer.root.findByProps({ testID: 'consumer-estimate-quantity-clear-fixing' }).props.onPress());
    expect(confirm().props.disabled).toBe(false);
    act(() => confirm().props.onPress());
    await expect(result).resolves.toBe(true);
  });
});
