import React, { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { useStore } from "zustand";

import { usePlatformNetworkStore, ensurePlatformNetworkService } from "../lib/offline/platformNetwork.service";
import {
  summarizePlatformOfflineOverview,
  pickDominantPlatformSyncStatus,
  type PlatformOfflineContourSummary,
} from "../lib/offline/platformOffline.model";
import { foremanDurableDraftStore } from "../screens/foreman/foreman.durableDraft.store";
import { useWarehouseReceiveDraftStore } from "../screens/warehouse/warehouse.receiveDraft.store";
import { useContractorProgressDraftStore } from "../screens/contractor/contractor.progressDraft.store";

const cardTone = {
  neutral: {
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(15,23,42,0.04)",
    titleColor: "#0F172A",
    detailColor: "#475569",
  },
  info: {
    borderColor: "rgba(56,189,248,0.28)",
    backgroundColor: "rgba(56,189,248,0.10)",
    titleColor: "#0C4A6E",
    detailColor: "#075985",
  },
  success: {
    borderColor: "rgba(22,163,74,0.24)",
    backgroundColor: "rgba(34,197,94,0.10)",
    titleColor: "#166534",
    detailColor: "#166534",
  },
  warning: {
    borderColor: "rgba(245,158,11,0.24)",
    backgroundColor: "rgba(245,158,11,0.12)",
    titleColor: "#92400E",
    detailColor: "#92400E",
  },
  danger: {
    borderColor: "rgba(239,68,68,0.24)",
    backgroundColor: "rgba(239,68,68,0.10)",
    titleColor: "#991B1B",
    detailColor: "#991B1B",
  },
} as const;

const buildWarehouseContour = (
  drafts: ReturnType<typeof useWarehouseReceiveDraftStore.getState>["drafts"],
): PlatformOfflineContourSummary => {
  const records = Object.values(drafts);
  const statuses = records.map((record) => record.status);
  return {
    key: "warehouse_receive",
    label: "\u0421\u043a\u043b\u0430\u0434",
    syncStatus: pickDominantPlatformSyncStatus(statuses),
    pendingCount: records.reduce((sum, record) => sum + Math.max(0, record.pendingCount ?? 0), 0),
    retryCount: records.reduce((sum, record) => sum + Math.max(0, record.retryCount ?? 0), 0),
    lastSyncAt: records.reduce((best, record) => Math.max(best, Number(record.lastSyncAt ?? 0) || 0), 0) || null,
    lastError: records.find((record) => record.lastError)?.lastError ?? null,
  };
};

const buildContractorContour = (
  drafts: ReturnType<typeof useContractorProgressDraftStore.getState>["drafts"],
): PlatformOfflineContourSummary => {
  const records = Object.values(drafts);
  const statuses = records.map((record) => record.syncStatus);
  return {
    key: "contractor_progress",
    label: "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a",
    syncStatus: pickDominantPlatformSyncStatus(statuses),
    pendingCount: records.reduce((sum, record) => sum + Math.max(0, record.pendingCount ?? 0), 0),
    retryCount: records.reduce((sum, record) => sum + Math.max(0, record.retryCount ?? 0), 0),
    lastSyncAt: records.reduce((best, record) => Math.max(best, Number(record.lastSyncAt ?? 0) || 0), 0) || null,
    lastError: records.find((record) => record.lastError)?.lastError ?? null,
  };
};

const buildForemanContour = (
  state: typeof foremanDurableDraftStore.getState extends () => infer T ? T : never,
): PlatformOfflineContourSummary => {
  // P6.3d: If there is no active draft snapshot, any remaining sync metadata
  // is orphaned/stale (the request already moved past draft status).
  // Report idle to prevent the global banner from showing phantom warnings.
  const hasActiveSnapshot = Boolean(state.snapshot);
  return {
    key: "foreman_draft",
    label: "\u041f\u0440\u043e\u0440\u0430\u0431",
    syncStatus: hasActiveSnapshot ? state.syncStatus : "idle",
    pendingCount: hasActiveSnapshot ? Math.max(0, state.pendingOperationsCount ?? 0) : 0,
    retryCount: hasActiveSnapshot ? Math.max(0, state.retryCount ?? 0) : 0,
    lastSyncAt: state.lastSyncAt,
    lastError: hasActiveSnapshot ? state.lastError : null,
  };
};

export default function PlatformOfflineStatusHost() {
  const network = usePlatformNetworkStore((state) => state);
  const foremanState = useStore(foremanDurableDraftStore, (state) => state);
  const warehouseDrafts = useWarehouseReceiveDraftStore((state) => state.drafts);
  const contractorDrafts = useContractorProgressDraftStore((state) => state.drafts);

  useEffect(() => {
    void ensurePlatformNetworkService();
  }, []);

  const overview = useMemo(() => {
    const contours = [
      buildForemanContour(foremanState),
      buildWarehouseContour(warehouseDrafts),
      buildContractorContour(contractorDrafts),
    ];
    return summarizePlatformOfflineOverview({
      network,
      contours,
    });
  }, [contractorDrafts, foremanState, network, warehouseDrafts]);

  if (!overview.visible) return null;

  const tone = cardTone[overview.tone];

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 }}>
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: tone.borderColor,
          backgroundColor: tone.backgroundColor,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: tone.titleColor, fontWeight: "900", fontSize: 13 }}>
          {overview.label}
        </Text>
        {overview.detail ? (
          <Text style={{ marginTop: 4, color: tone.detailColor, fontSize: 12, fontWeight: "700" }}>
            {overview.detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
