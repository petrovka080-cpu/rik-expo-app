// src/screens/warehouse/components/ReportDocRowItem.tsx
//
// Memoized row component for WarehouseReportsTab document list (active day view).
// Receives pre-shaped props from selectReportDocRowShape — no key building inside render.

import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI, s } from "../warehouse.styles";
import type { ReportDocRowShape } from "./warehouseReports.row.model";

type Props = {
  shape: ReportDocRowShape;
  testId: string;
  onOpenDetails: (docId: string | number) => void;
  onOpenPdf: (docId: string | number) => void;
};

function ReportDocRowItemInner({ shape, testId, onOpenDetails, onOpenPdf }: Props) {
  const { docId, docNo, pdfBusy, who, objName } = shape;

  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable
        onPress={() => {
          if (!docId) return;
          onOpenDetails(docId);
        }}
      >
        <View style={s.mobCard}>
          <View style={s.mobMain}>
            <Text style={s.mobTitle}>{docNo}</Text>
            {who ? <Text style={s.mobMeta}>{who}</Text> : null}
            {objName ? <Text style={s.mobMeta}>{objName}</Text> : null}
          </View>

          <Pressable
            testID={testId}
            hitSlop={10}
            disabled={!docId || pdfBusy}
            onPress={(e) => {
              e.stopPropagation?.();
              if (!docId || pdfBusy) return;
              onOpenPdf(docId);
            }}
            accessibilityState={{ disabled: !docId || pdfBusy, busy: pdfBusy }}
          >
            {pdfBusy ? (
              <ActivityIndicator size="small" color={UI.text} />
            ) : (
              <Ionicons name="document-text-outline" size={20} color={UI.text} />
            )}
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

/**
 * Memoized with field-level comparator.
 * Re-renders only when docId, docNo, pdfBusy, who, objName, or stable callbacks change.
 */
export const ReportDocRowItem = React.memo(ReportDocRowItemInner, (prev, next) => {
  return (
    prev.shape.docId === next.shape.docId &&
    prev.shape.docNo === next.shape.docNo &&
    prev.shape.pdfBusy === next.shape.pdfBusy &&
    prev.shape.who === next.shape.who &&
    prev.shape.objName === next.shape.objName &&
    prev.testId === next.testId &&
    prev.onOpenDetails === next.onOpenDetails &&
    prev.onOpenPdf === next.onOpenPdf
  );
});

ReportDocRowItem.displayName = "ReportDocRowItem";
