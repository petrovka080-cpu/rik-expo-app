import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ConsumerRepairRequestScreenController } from '../../src/features/consumerRepair/ConsumerRepairRequestScreen';
import { ParameterDisclosurePanel } from '../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel';
import { buildConsumerCanonicalParameterSession } from '../../src/features/consumerRepair/consumerCanonicalParameterEditor';
import { __resetConsumerRepairRequestStoreForTests, createConsumerRepairRequestDraft } from '../../src/lib/consumerRequests';
import { appendCanonicalBackendRevisionProjection } from '../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection';
import { buildCanonicalConsumerRepairRevisionFixture } from '../consumerRepair/canonicalConsumerRepairRevisionFixture';
import { getCanonicalEstimateCatalogItem, getCanonicalEstimateRevision } from '../../src/lib/estimate/backendPlatform/canonicalEstimateClient';
import type { CanonicalEstimateCatalogItem } from '../../src/lib/estimate/backendPlatform/contracts';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../src/lib/estimate/backendPlatform/canonicalEstimateClient', () => ({
  getCanonicalEstimateCatalogItem: jest.fn(), getCanonicalEstimateRevision: jest.fn(),
}));
const childId = '00000000-0000-5000-8000-000000000002';
const nextId = '00000000-0000-5000-8000-000000000003';
const nextRelease = '00000000-0000-5000-8000-000000000004';
let renderer: TestRenderer.ReactTestRenderer | null = null;
beforeEach(() => { jest.clearAllMocks(); __resetConsumerRepairRequestStoreForTests(); });
afterEach(() => { if (renderer) act(() => renderer!.unmount()); renderer = null; __resetConsumerRepairRequestStoreForTests(); });

async function mount(flags: { recovered?: boolean; quantityPolicyTransition?: boolean }, failure = false) {
  const initial = createConsumerRepairRequestDraft({ consumerUserId: 'outcome-owner', problemText: 'Фундамент 35,5 метров',
    aiDraft: buildCanonicalConsumerRepairRevisionFixture('Фундамент 35,5 метров') });
  const parentId = String(initial.items[0].sourceParameters!.canonicalBackendRevisionId);
  const releaseId = String(initial.items[0].sourceParameters!.canonicalBackendReleaseId);
  const catalog: CanonicalEstimateCatalogItem = { catalogId: 'canonical-work:test:consumer-history-fixture', releaseId,
    namespace: 'global', domain: 'concrete_foundation', workKey: 'strip', titleRu: 'Фундамент', definitionVersion: 1,
    applicability: {}, professionalMetadata: {}, parameterSchema: [{ parameterId: 'total_axis_length_m', titleRu: 'Общая длина',
      ordinal: 1, unitId: 'm', valueType: 'decimal', required: true, defaultValue: null, constraints: { min: 0.000001 },
      visibilityRole: 'USER_INPUT', valueSourceRole: 'USER_MEASURED', formulaConsumers: ['exact-project-formula'] }] };
  const project = (previous: typeof initial | null, id: string, parent: string | null, value: number) => appendCanonicalBackendRevisionProjection({
    previousBundle: previous, nextBundle: { ...initial, items: initial.items.map(item => ({ ...item, sourceParameters: { ...item.sourceParameters,
      canonicalBackendRevisionId: id, canonicalBackendReleaseId: parent ? nextRelease : releaseId } })) },
    payload: { workKey: 'strip', inputText: initial.draft.problemText, canonicalBackend: { compilerOwner: 'backend', revisionId: id,
      parentRevisionId: parent, revisionNumber: parent ? 2 : 1, releaseId: parent ? nextRelease : releaseId,
      catalogId: catalog.catalogId, createdAt: initial.draft.createdAt, checksumSha256: 'a'.repeat(64),
      formulaGraphVersion: 'test', parameterSchemaHash: 'b'.repeat(64), parameters: { total_axis_length_m: value } } } as never });
  const session = (id: string, parent: string | null, value: number) => buildConsumerCanonicalParameterSession({ catalog,
    draftId: initial.draft.id, revision: { revisionId: id, parentRevisionId: parent, releaseId: parent ? nextRelease : releaseId,
      catalogId: catalog.catalogId, definitionVersionId: 'test-definition', definitionVersion: 1, status: 'ready',
      parameters: { total_axis_length_m: value }, userInputSnapshot: { total_axis_length_m: value }, acceptedBaselineSnapshot: {},
      assumptionSnapshot: {}, parameterSchemaHash: 'b'.repeat(64), compilerVersion: 'test', checksumSha256: 'a'.repeat(64),
      createdAt: initial.draft.createdAt, preliminaryNeeds: [] } });
  const parent = project(null, parentId, null, 35.5), child = project(parent, childId, parentId, 35.5);
  const recalculate = jest.fn(async () => {
    if (failure) throw new Error('CONSUMER_REPAIR_TRANSACTIONAL_COMMIT_NOT_DURABLE');
    return { bundle: child, session: session(childId, parentId, 35.5), ...flags };
  });
  (getCanonicalEstimateRevision as jest.Mock).mockImplementation(async (id: string) => ({ revisionId: id, catalogId: catalog.catalogId,
    releaseId: id === parentId ? releaseId : nextRelease }));
  (getCanonicalEstimateCatalogItem as jest.Mock).mockResolvedValue({ ...catalog, releaseId: nextRelease });
  await act(async () => { renderer = TestRenderer.create(<ConsumerRepairRequestScreenController consumerUserId='outcome-owner'
    onPrepareCanonicalEstimate={jest.fn()} onLoadCanonicalRevisionDraft={jest.fn()}
    onLoadCanonicalParameterSession={jest.fn(async () => session(parentId, null, 35.5))}
    onRecalculateCanonicalEstimate={recalculate} onSelectCanonicalCatalogItem={jest.fn()}
    onAddCanonicalCatalogItem={jest.fn()} onOpenPhotoForMaterialRecognition={jest.fn()} />); });
  const controller = renderer!.root.findByType(ConsumerRepairRequestScreenController).instance as ConsumerRepairRequestScreenController;
  await act(async () => controller.setState({ bundle: parent, canonicalBackendParameterSession: session(parentId, null, 35.5), problemText: '' }));
  await act(async () => renderer!.root.findByProps({ testID: 'request-estimate-parameters-toggle' }).props.onPress());
  return { parentId, controller, recalculate, session, project, child };
}

it.each([{ recovered: true }, { quantityPolicyTransition: true }])('opens a saved composition without showing a failed or parameter-applied message (%j)', async flags => {
  const { controller, recalculate } = await mount(flags);
  await act(async () => { await renderer!.root.findByProps({ testID: 'saved-estimate-composition-refresh' }).props.onPress(); });
  expect(recalculate).toHaveBeenCalledTimes(1);
  expect(recalculate).toHaveBeenCalledWith(expect.objectContaining({ patches: [] }));
  expect(controller.state.bundle?.estimateDraftRevisionState?.currentRevisionId).toBe(childId);
  expect(controller.state.statusMessage).not.toContain('ещё не применены');
  expect(renderer!.root.findAllByProps({ testID: 'request-estimate-parameter-apply-error' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ testID: 'request-estimate-parameter-apply-success' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ testID: 'request-estimate-parameter-apply-status' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ testID: 'request-estimate-saved-revision-opened' }).props.children).toBe('Сохранённая смета открыта.');
});

it.each([{ recovered: true }, { quantityPolicyTransition: true }])('retains unapplied input when opening a child and applies it only on the next explicit action (%j)', async flags => {
  const { controller, recalculate, session, project, child } = await mount(flags);
  const input = () => renderer!.root.findByProps({ testID: 'editable-param-inline-editor-total_axis_length_m' })
    .findByProps({ testID: 'editable-param-popover-input' });
  act(() => input().props.onChangeText('36'));
  await act(async () => renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.onPress());
  expect(recalculate).toHaveBeenCalledTimes(1);
  expect(controller.state.bundle?.estimateDraftRevisionState?.currentRevisionId).toBe(childId);
  expect(input().props.value).toBe('36');
  const panel = renderer!.root.findByType(ParameterDisclosurePanel).instance as ParameterDisclosurePanel;
  expect(panel.state.baselineValues.total_axis_length_m).toBe('35.5');
  expect(panel.state.applyState).toBe('revision_opened');
  expect(renderer!.root.findAllByProps({ testID: 'request-estimate-parameter-apply-error' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ testID: 'request-estimate-parameter-apply-success' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ testID: 'request-estimate-saved-revision-opened' }).props.children).toContain('ещё не применены');
  recalculate.mockImplementationOnce(async () => ({ bundle: project(child, nextId, childId, 36), session: session(nextId, childId, 36) }));
  await act(async () => renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.onPress());
  expect(recalculate).toHaveBeenCalledTimes(2);
  expect(recalculate).toHaveBeenLastCalledWith(expect.objectContaining({ revisionId: childId,
    patches: [{ operation: 'update_param', paramKey: 'total_axis_length_m', rawValue: '36' }] }));
  expect(panel.state.applyState).toBe('success');
  expect(panel.state.baselineValues.total_axis_length_m).toBe('36');
  expect(controller.state.bundle?.estimateDraftRevisionState?.currentRevisionId).toBe(nextId);
});

it('keeps a genuine local commit failure as an error and retains the parent and unsaved input', async () => {
  const { parentId, controller, recalculate } = await mount({}, true);
  const input = () => renderer!.root.findByProps({ testID: 'editable-param-inline-editor-total_axis_length_m' })
    .findByProps({ testID: 'editable-param-popover-input' });
  act(() => input().props.onChangeText('36'));
  await act(async () => renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.onPress());
  expect(recalculate).toHaveBeenCalledTimes(1);
  expect(controller.state.bundle?.estimateDraftRevisionState?.currentRevisionId).toBe(parentId);
  expect(input().props.value).toBe('36');
  expect(renderer!.root.findByType(ParameterDisclosurePanel).instance.state.applyState).toBe('error');
  expect(renderer!.root.findAll(node => typeof node.type === 'string' && node.props.testID === 'request-estimate-parameter-apply-error')).toHaveLength(1);
  expect(renderer!.root.findAllByProps({ testID: 'request-estimate-saved-revision-opened' })).toHaveLength(0);
});

it('ignores an ordinary Apply completion after another saved revision is opened', async () => {
  const { controller, recalculate, session, project, child, parentId } = await mount({ recovered: true });
  let finish!: (value: Awaited<ReturnType<typeof recalculate>>) => void;
  recalculate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  act(() => renderer!.root.findByProps({ testID: 'editable-param-inline-editor-total_axis_length_m' })
    .findByProps({ testID: 'editable-param-popover-input' }).props.onChangeText('36'));
  act(() => renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.onPress());
  await act(async () => controller.setState({ bundle: project(null, nextId, null, 38),
    canonicalBackendParameterSession: session(nextId, null, 38) }));
  expect(renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.disabled).toBe(false);
  await act(async () => finish({ bundle: child, session: session(childId, parentId, 35.5), recovered: true }));
  expect(controller.state.bundle?.estimateDraftRevisionState?.currentRevisionId).toBe(nextId);
  expect(renderer!.root.findAllByProps({ testID: 'request-estimate-parameter-apply-error' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ testID: 'request-estimate-saved-revision-opened' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.disabled).toBe(false);
});

it('does not update an unmounted parameter panel after the pending screen action completes', async () => {
  const { recalculate, session, child, parentId } = await mount({ recovered: true });
  let finish!: (value: Awaited<ReturnType<typeof recalculate>>) => void;
  recalculate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  act(() => renderer!.root.findByProps({ testID: 'editable-param-inline-editor-total_axis_length_m' })
    .findByProps({ testID: 'editable-param-popover-input' }).props.onChangeText('36'));
  act(() => renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.onPress());
  const panel = renderer!.root.findByType(ParameterDisclosurePanel).instance as ParameterDisclosurePanel;
  const setState = jest.spyOn(panel, 'setState');
  act(() => renderer!.unmount()); renderer = null; setState.mockClear();
  await act(async () => finish({ bundle: child, session: session(childId, parentId, 35.5), recovered: true }));
  expect(setState).not.toHaveBeenCalled();
});

it('does not let the old ordinary Apply response unlock a newer operation in another revision', async () => {
  const { session, project } = await mount({});
  const props = renderer!.root.findByType(ParameterDisclosurePanel).props as React.ComponentProps<typeof ParameterDisclosurePanel>;
  act(() => renderer!.unmount());
  let finishA!: (value: boolean) => void, finishB!: (value: boolean) => void;
  const apply = jest.fn().mockImplementationOnce(() => new Promise(resolve => { finishA = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { finishB = resolve; }));
  await act(async () => { renderer = TestRenderer.create(<ParameterDisclosurePanel {...props} onApplyParamBatch={apply} />); });
  act(() => renderer!.root.findByProps({ testID: 'editable-param-inline-editor-total_axis_length_m' })
    .findByProps({ testID: 'editable-param-popover-input' }).props.onChangeText('36'));
  act(() => renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.onPress());
  const revisionB = project(null, nextId, null, 38).estimateDraftRevisionState!.revisions.at(-1)!;
  await act(async () => renderer!.update(<ParameterDisclosurePanel {...props} onApplyParamBatch={apply}
    revision={revisionB} canonicalParameterSession={session(nextId, null, 38)} />));
  expect(renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.disabled).toBe(false);
  act(() => renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.onPress());
  expect(apply).toHaveBeenCalledTimes(2);
  await act(async () => finishA(false));
  expect(renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.disabled).toBe(true);
  expect(renderer!.root.findAllByProps({ testID: 'request-estimate-parameter-apply-error' })).toHaveLength(0);
  await act(async () => finishB(true));
  expect(renderer!.root.findByProps({ testID: 'editable-param-batch-apply' }).props.disabled).toBe(false);
});
