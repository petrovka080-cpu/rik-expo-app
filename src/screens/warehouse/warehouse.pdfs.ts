import { useCallback } from "react";
import { beginCanonicalPdfBoundary } from "../../lib/pdf/canonicalPdfObservability";
import { generateWarehousePdfViaBackend } from "../../lib/api/warehousePdfBackend.service";
import type { WarehousePdfRequest } from "../../lib/pdf/warehousePdf.shared";
import {
  buildWarehousePdfBusyKey,
  createWarehousePdfFileName,
  type WarehousePdfBusyLike,
  useWarehousePdfPreviewBoundary,
} from "./warehouse.pdf.boundary";

const requireWarehousePdfDocId = (docId: string | number) => {
  const text = String(docId ?? "").trim();
  if (!text) return null;
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return null;
  return {
    text,
    numeric: Math.trunc(numeric),
  };
};

const requireWarehousePdfDayLabel = (dayLabel: string) => {
  const text = String(dayLabel ?? "").trim();
  return text || null;
};

type UseWarehousePdfArgs = {
  busy: WarehousePdfBusyLike;
  reportsMode: "choice" | "issue" | "incoming";
  periodFrom: string;
  periodTo: string;
  warehousemanFio: string;
  notifyError: (title: string, message?: string) => void;
  orgName: string;
  warehouseName?: string;
  incomingRegisterSourceFingerprint?: string | null;
};

export function useWarehousePdf(args: UseWarehousePdfArgs) {
  const {
    busy,
    reportsMode,
    periodFrom,
    periodTo,
    warehousemanFio,
    notifyError,
    orgName,
    warehouseName,
    incomingRegisterSourceFingerprint,
  } = args;

  const previewWarehousePdf = useWarehousePdfPreviewBoundary({
    busy,
    notifyError,
  });

  const previewCanonicalWarehousePdf = useCallback(async (args: {
    key: string;
    label: string;
    title: string;
    fileName: string;
    documentType: "warehouse_document" | "warehouse_register" | "warehouse_materials";
    entityId?: string;
    request: WarehousePdfRequest;
  }) => {
    const boundary = beginCanonicalPdfBoundary({
      screen: "warehouse",
      surface: "warehouse_pdf_open",
      role: "warehouse",
      documentType: args.request.documentType,
      sourceKind: "backend_payload",
      fallbackUsed: false,
    });

    boundary.success("click_start", {
      sourceKind: "backend_payload",
      extra: {
        documentKind: args.request.documentKind,
        entityId: args.entityId ?? null,
      },
    });
    boundary.success("busy_enter", {
      sourceKind: "backend_payload",
      extra: {
        busyKey: args.key,
        documentKind: args.request.documentKind,
      },
    });

    await previewWarehousePdf({
      key: args.key,
      label: args.label,
      title: args.title,
      fileName: args.fileName,
      documentType: args.documentType,
      entityId: args.entityId,
      getRemoteUrl: async () => {
        const result = await generateWarehousePdfViaBackend(args.request);
        boundary.success("viewer_open_start", {
          sourceKind: result.sourceKind,
          extra: {
            documentKind: args.request.documentKind,
            fileName: result.fileName,
          },
        });
        return result.signedUrl;
      },
    });

    boundary.success("busy_exit", {
      sourceKind: "remote-url",
      extra: {
        busyKey: args.key,
        documentKind: args.request.documentKind,
      },
    });
  }, [previewWarehousePdf]);

  const onPdfDocument = useCallback(async (docId: string | number) => {
    const normalizedDocId = requireWarehousePdfDocId(docId);
    const pid = normalizedDocId?.text ?? "";
    if (!pid) {
      notifyError("PDF", "Некорректный номер документа.");
      return;
    }

    if (reportsMode === "incoming") {
      await previewCanonicalWarehousePdf({
        key: buildWarehousePdfBusyKey({
          kind: "document",
          reportsMode: "incoming",
          docId: pid,
        }),
        label: "Готовлю приходный ордер...",
        title: `Приходный ордер ${pid}`,
        fileName: createWarehousePdfFileName({
          documentType: "warehouse_document",
          title: "warehouse_incoming",
          entityId: pid,
        }),
        documentType: "warehouse_document",
        entityId: pid,
        request: {
          version: "v1",
          role: "warehouse",
          documentType: "warehouse_document",
          documentKind: "incoming_form",
          incomingId: pid,
          generatedBy: warehousemanFio || null,
          companyName: orgName || null,
          warehouseName: warehouseName || null,
        },
      });
      return;
    }

    await previewCanonicalWarehousePdf({
      key: buildWarehousePdfBusyKey({
        kind: "document",
        reportsMode: "issue",
        docId: pid,
      }),
      label: "Готовлю расходную накладную...",
      title: `Расходная накладная ${pid}`,
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_document",
        title: "warehouse_issue",
        entityId: pid,
      }),
      documentType: "warehouse_document",
      entityId: pid,
      request: {
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_document",
        documentKind: "issue_form",
        issueId: normalizedDocId?.numeric ?? 0,
        generatedBy: warehousemanFio || null,
        companyName: orgName || null,
        warehouseName: warehouseName || null,
      },
    });
  }, [
    notifyError,
    orgName,
    previewCanonicalWarehousePdf,
    reportsMode,
    warehouseName,
    warehousemanFio,
  ]);

  const onPdfRegister = useCallback(async () => {
    const isIncoming = reportsMode === "incoming";
    await previewCanonicalWarehousePdf({
      key: buildWarehousePdfBusyKey({
        kind: "register",
        reportsMode: isIncoming ? "incoming" : "issue",
        periodFrom,
        periodTo,
      }),
      label: "Готовлю реестр...",
      title: isIncoming ? "Реестр прихода" : "Реестр расхода",
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_register",
        title: isIncoming ? "warehouse_incoming_register" : "warehouse_issue_register",
        entityId: `${periodFrom || "all"}_${periodTo || "all"}`,
      }),
      documentType: "warehouse_register",
      request: {
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_register",
        documentKind: isIncoming ? "incoming_register" : "issue_register",
        periodFrom: periodFrom || null,
        periodTo: periodTo || null,
        generatedBy: warehousemanFio || null,
        companyName: orgName || null,
        warehouseName: warehouseName || null,
        ...(isIncoming && incomingRegisterSourceFingerprint
          ? { clientSourceFingerprint: incomingRegisterSourceFingerprint }
          : {}),
      },
    });
  }, [
    incomingRegisterSourceFingerprint,
    orgName,
    periodFrom,
    periodTo,
    previewCanonicalWarehousePdf,
    reportsMode,
    warehouseName,
    warehousemanFio,
  ]);

  const onPdfMaterials = useCallback(async () => {
    const isIncoming = reportsMode === "incoming";
    await previewCanonicalWarehousePdf({
      key: buildWarehousePdfBusyKey({
        kind: "materials",
        reportsMode: isIncoming ? "incoming" : "issue",
        periodFrom,
        periodTo,
      }),
      label: "Готовлю свод материалов...",
      title: isIncoming ? "Отчёт по приходу материалов" : "Отчёт по расходу материалов",
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_materials",
        title: isIncoming ? "warehouse_incoming_materials" : "warehouse_issued_materials",
        entityId: `${periodFrom || "all"}_${periodTo || "all"}`,
      }),
      documentType: "warehouse_materials",
      request: {
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_materials",
        documentKind: isIncoming ? "incoming_materials" : "issue_materials",
        periodFrom: periodFrom || null,
        periodTo: periodTo || null,
        generatedBy: warehousemanFio || null,
        companyName: orgName || null,
        warehouseName: warehouseName || null,
      },
    });
  }, [
    orgName,
    periodFrom,
    periodTo,
    previewCanonicalWarehousePdf,
    reportsMode,
    warehouseName,
    warehousemanFio,
  ]);

  const onPdfObjectWork = useCallback(async () => {
    await previewCanonicalWarehousePdf({
      key: buildWarehousePdfBusyKey({
        kind: "object-work",
        periodFrom,
        periodTo,
      }),
      label: "Готовлю отчёт по объектам...",
      title: "Отчёт по объектам и работам",
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_materials",
        title: "warehouse_object_work",
        entityId: `${periodFrom || "all"}_${periodTo || "all"}`,
      }),
      documentType: "warehouse_materials",
      request: {
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_materials",
        documentKind: "object_work",
        periodFrom: periodFrom || null,
        periodTo: periodTo || null,
        objectId: null,
        objectName: null,
        generatedBy: warehousemanFio || null,
        companyName: orgName || null,
        warehouseName: warehouseName || null,
      },
    });
  }, [
    orgName,
    periodFrom,
    periodTo,
    previewCanonicalWarehousePdf,
    warehouseName,
    warehousemanFio,
  ]);

  const onPdfDayRegister = useCallback(async (dayLabel: string) => {
    const normalizedDayLabel = requireWarehousePdfDayLabel(dayLabel);
    if (!normalizedDayLabel) {
      notifyError("PDF", "Invalid report day.");
      return;
    }

    const isIncoming = reportsMode === "incoming";
    await previewCanonicalWarehousePdf({
      key: buildWarehousePdfBusyKey({
        kind: "day-register",
        reportsMode: isIncoming ? "incoming" : "issue",
        dayLabel: normalizedDayLabel,
      }),
      label: "Готовлю дневной реестр...",
      title: isIncoming ? `Приход за ${normalizedDayLabel}` : `Выдача за ${normalizedDayLabel}`,
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_register",
        title: isIncoming ? "warehouse_incoming_day_register" : "warehouse_issue_day_register",
        entityId: normalizedDayLabel,
      }),
      documentType: "warehouse_register",
      request: {
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_register",
        documentKind: isIncoming ? "incoming_day_register" : "issue_day_register",
        periodFrom: null,
        periodTo: null,
        dayLabel: normalizedDayLabel,
        generatedBy: warehousemanFio || null,
        companyName: orgName || null,
        warehouseName: warehouseName || null,
      },
    });
  }, [
    notifyError,
    orgName,
    previewCanonicalWarehousePdf,
    reportsMode,
    warehouseName,
    warehousemanFio,
  ]);

  const onPdfDayMaterials = useCallback(async (dayLabel: string) => {
    const normalizedDayLabel = requireWarehousePdfDayLabel(dayLabel);
    if (!normalizedDayLabel) {
      notifyError("PDF", "Invalid report day.");
      return;
    }

    const isIncoming = reportsMode === "incoming";
    await previewCanonicalWarehousePdf({
      key: buildWarehousePdfBusyKey({
        kind: "day-materials",
        reportsMode: isIncoming ? "incoming" : "issue",
        dayLabel: normalizedDayLabel,
      }),
      label: "Готовлю дневной отчёт по материалам...",
      title: isIncoming
        ? `Приход материалов за ${normalizedDayLabel}`
        : `Расход материалов за ${normalizedDayLabel}`,
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_materials",
        title: isIncoming ? "warehouse_incoming_day_materials" : "warehouse_issue_day_materials",
        entityId: normalizedDayLabel,
      }),
      documentType: "warehouse_materials",
      request: {
        version: "v1",
        role: "warehouse",
        documentType: "warehouse_materials",
        documentKind: isIncoming ? "incoming_day_materials" : "issue_day_materials",
        periodFrom: null,
        periodTo: null,
        dayLabel: normalizedDayLabel,
        generatedBy: warehousemanFio || null,
        companyName: orgName || null,
        warehouseName: warehouseName || null,
      },
    });
  }, [
    notifyError,
    orgName,
    previewCanonicalWarehousePdf,
    reportsMode,
    warehouseName,
    warehousemanFio,
  ]);

  return {
    onPdfDocument,
    onPdfRegister,
    onPdfMaterials,
    onPdfObjectWork,
    onPdfDayRegister,
    onPdfDayMaterials,
  };
}
