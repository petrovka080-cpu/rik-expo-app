import { useCallback, useEffect, useRef } from "react";

type QueueOptions = {
  closeWork?: boolean;
  closeActBuilder?: boolean;
};

type Params = {
  workModalVisible: boolean;
  actBuilderVisible: boolean;
  closeWorkModal: () => void;
  closeActBuilder: () => void;
};

export function useContractorModalFlow(params: Params) {
  const { workModalVisible, actBuilderVisible, closeWorkModal, closeActBuilder } = params;

  const modalTransitionActionRef = useRef<null | (() => void)>(null);
  const modalTransitionPendingDismissRef = useRef(0);

  const runQueuedModalTransition = useCallback(() => {
    const run = modalTransitionActionRef.current;
    if (!run) return;
    modalTransitionActionRef.current = null;
    run();
  }, []);

  const onAnyModalDismissed = useCallback(() => {
    if (modalTransitionPendingDismissRef.current <= 0) return;
    modalTransitionPendingDismissRef.current -= 1;
    if (modalTransitionPendingDismissRef.current === 0) {
      runQueuedModalTransition();
    }
  }, [runQueuedModalTransition]);

  const queueAfterClosingModals = useCallback(
    (run: () => void, opts?: QueueOptions) => {
      modalTransitionActionRef.current = run;
      let pendingDismisses = 0;
      const shouldCloseWork = !!opts?.closeWork && workModalVisible;
      const shouldCloseAct = !!opts?.closeActBuilder && actBuilderVisible;
      if (shouldCloseWork) pendingDismisses += 1;
      if (shouldCloseAct) pendingDismisses += 1;
      modalTransitionPendingDismissRef.current = pendingDismisses;
      if (shouldCloseWork) closeWorkModal();
      if (shouldCloseAct) closeActBuilder();
      if (!pendingDismisses) runQueuedModalTransition();
    },
    [
      actBuilderVisible,
      closeActBuilder,
      closeWorkModal,
      runQueuedModalTransition,
      workModalVisible,
    ]
  );

  useEffect(() => {
    if (modalTransitionPendingDismissRef.current <= 0) return;
    if (workModalVisible || actBuilderVisible) return;
    modalTransitionPendingDismissRef.current = 0;
    runQueuedModalTransition();
  }, [workModalVisible, actBuilderVisible, runQueuedModalTransition]);

  return {
    onAnyModalDismissed,
    queueAfterClosingModals,
  };
}

