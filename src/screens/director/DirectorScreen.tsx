import React from "react";
import { Animated } from "react-native";
import { useRouter } from "expo-router";
import { openAppAttachment } from "../../lib/documents/attachmentOpener";
import { UI, s } from "./director.styles";
import DirectorDashboard from "./DirectorDashboard";
import PeriodPickerSheet from "../../components/PeriodPickerSheet";
import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
import { ensureSignedIn, supabase } from "../../lib/supabaseClient";
import DirectorFinanceCardModal from "./DirectorFinanceCardModal";
import DirectorFinanceContent from "./DirectorFinanceContent";
import DirectorReportsModal from "./DirectorReportsModal";
import DirectorSheetModal from "./DirectorSheetModal";
import { useDirectorScreenController } from "./useDirectorScreenController";
import {
  buildDirectorProductionReportPdfDescriptor,
  buildDirectorSubcontractReportPdfDescriptor,
} from "./director.reports.pdfService";
import { useGlobalBusy } from "../../ui/GlobalBusy";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { generateDirectorPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { createModalAwarePdfOpener } from "../../lib/pdf/pdf.runner";
import { exportDirectorSubcontractReportPdf } from "../../lib/api/pdf_director";

export function DirectorScreen() {
  const vm = useDirectorScreenController();
  const busy = useGlobalBusy();
  const router = useRouter();
  const reportsCompanyName = process.env.EXPO_PUBLIC_COMPANY_NAME ?? "RIK Construction";
  // D-MODAL-PDF: Stabilize the opener — avoid recreating on every render.
  const reportsPdfOpener = React.useMemo(
    () => createModalAwarePdfOpener(vm.reports.closeReports),
    [vm.reports.closeReports],
  );

  const onExportProductionPdf = React.useCallback(async () => {
    const template = await buildDirectorProductionReportPdfDescriptor({
      companyName: reportsCompanyName,
      generatedBy: "Директор",
      periodFrom: vm.reports.repFrom,
      periodTo: vm.reports.repTo,
      objectName: vm.reports.repObjectName,
      repData: vm.reports.repData,
      repDiscipline: vm.reports.repDiscipline,
      preferPriceStage: vm.reports.repDisciplinePriceLoading ? "base" : "priced",
    });
    await reportsPdfOpener.prepareAndPreview({
      busy,
      supabase,
      key: "pdf:director:reports:production",
      label: "Открываю PDF...",
      descriptor: template,
      router,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [
    busy,
    router,
    reportsCompanyName,
    vm.reports.repFrom,
    vm.reports.repTo,
    vm.reports.repObjectName,
    vm.reports.repData,
    vm.reports.repDiscipline,
    vm.reports.repDisciplinePriceLoading,
  ]);

  const onExportSubcontractPdfLegacy = React.useCallback(async () => {
    const title = "Отчёт по подрядам";
    const template = await generateDirectorPdfDocument({
      title,
      fileName: buildPdfFileName({
        documentType: "director_report",
        title,
        dateIso: vm.reports.repTo ?? vm.reports.repFrom ?? undefined,
      }),
      documentType: "director_report",
      getUri: async () => {
        return await exportDirectorSubcontractReportPdf({
          companyName: reportsCompanyName,
          generatedBy: "Директор",
          periodFrom: vm.reports.repFrom,
          periodTo: vm.reports.repTo,
          objectName: vm.reports.repObjectName,
        });
      },
    });
    await reportsPdfOpener.prepareAndPreview({
      busy,
      supabase,
      key: "pdf:director:reports:subcontract",
      label: "Открываю PDF...",
      descriptor: template,
      router,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [busy, router, reportsCompanyName, vm.reports.repFrom, vm.reports.repTo, vm.reports.repObjectName]);

  const onExportSubcontractPdf = React.useCallback(async () => {
    const template = await buildDirectorSubcontractReportPdfDescriptor({
      companyName: reportsCompanyName,
      generatedBy: "Директор",
      periodFrom: vm.reports.repFrom,
      periodTo: vm.reports.repTo,
      objectName: vm.reports.repObjectName,
    });
    await reportsPdfOpener.prepareAndPreview({
      busy,
      supabase,
      key: "pdf:director:reports:subcontract",
      label: "Открываю PDF...",
      descriptor: template,
      router,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [busy, router, reportsCompanyName, vm.reports.repFrom, vm.reports.repTo, vm.reports.repObjectName]);
  void onExportSubcontractPdfLegacy;

  const financePeriodUi = React.useMemo(
    () => ({
      cardBg: UI.cardBg,
      text: UI.text,
      sub: UI.sub,
      border: "rgba(255,255,255,0.14)",
      accentBlue: "#3B82F6",
      approve: "#22C55E",
    }),
    [],
  );

  return (
    <RoleScreenLayout style={[s.container, { backgroundColor: UI.bg }]}>
      <DirectorDashboard
        HEADER_MAX={vm.HEADER_MAX}
        HEADER_MIN={vm.HEADER_MIN}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: vm.scrollY } } }], { useNativeDriver: false })}
        headerHeight={vm.headerHeight}
        headerShadow={vm.headerShadow}
        titleSize={vm.titleSize}
        subOpacity={vm.subOpacity}
        dirTab={vm.dirTab}
        setDirTab={vm.setDirTab}
        tab={vm.tab}
        setTab={vm.setTab}
        closeSheet={vm.closeSheet}
        groups={vm.groups}
        propsHeads={vm.data.propsHeads}
        propsHasMore={vm.data.propsHasMore}
        loadingPropsMore={vm.data.loadingPropsMore}
        loadingRows={vm.data.loadingRows}
        loadingProps={vm.data.loadingProps}
        foremanRequestsCount={vm.groups.length}
        foremanPositionsCount={vm.data.rows.length}
        buyerPropsCount={vm.data.buyerPropsCount}
        buyerPositionsCount={vm.data.buyerPositionsCount}
        labelForRequest={vm.data.labelForRequest}
        fmtDateOnly={vm.fmtDateOnly}
        submittedAtByReq={vm.data.submittedAtByReq}
        openRequestSheet={vm.openRequestSheet}
        ProposalRow={vm.propRow.ProposalRow}
        screenLock={vm.screenLock}
        ensureSignedIn={ensureSignedIn}
        fetchRows={vm.data.fetchRows}
        fetchProps={vm.data.fetchProps}
        loadMoreProps={vm.data.loadMoreProps}
        rtToast={vm.rtToast}
        finLoading={vm.finLoading}
        finScope={vm.finScope}
        money={vm.money}
        FIN_DUE_DAYS_DEFAULT={7}
        FIN_CRITICAL_DAYS={14}
        fetchFinance={vm.financePanel.fetchFinance}
        finFrom={vm.finFrom}
        finTo={vm.finTo}
        openFinancePage={vm.openFinancePage}
        openReports={() => void vm.reports.openReports()}
        reportsPeriodShort={vm.reports.repPeriodShort}
      />

      <DirectorFinanceCardModal
        visible={vm.finOpen}
        onClose={vm.financePanel.onCloseFinanceTop}
        title={vm.financePanel.financeTitle}
        periodShort={vm.financePanel.financePeriodShort}
        loading={vm.financePanel.financeTopLoading}
        onOpenPeriod={() => vm.financePanel.setFinPeriodOpen(true)}
        onRefresh={() => void vm.financePanel.fetchFinance()}
        onPdf={vm.finPage === "supplier" ? vm.financePanel.onSupplierPdf : vm.financePanel.onFinancePdf}
        overlay={
          vm.finPeriodOpen ? (
            <PeriodPickerSheet
              visible={vm.finPeriodOpen}
              onClose={() => vm.financePanel.setFinPeriodOpen(false)}
              initialFrom={vm.finFrom || ""}
              initialTo={vm.finTo || ""}
              onApply={vm.financePanel.applyFinPeriod}
              onClear={vm.financePanel.clearFinPeriod}
              ui={financePeriodUi}
            />
          ) : null
        }
      >
        <DirectorFinanceContent
          finPage={vm.finPage}
          finLoading={vm.finLoading}
          finScope={vm.finScope}
          finKindName={vm.finKindName}
          finKindList={vm.finKindList}
          finSupplier={vm.finSupplier}
          finSupplierLoading={vm.finSupplierLoading}
          supplierPdfBusy={vm.financePanel.supplierPdfBusy}
          FIN_CRITICAL_DAYS={14}
          pushFin={vm.pushFin}
          openSupplier={vm.financePanel.openSupplier}
          openFinKind={vm.financePanel.openFinKind}
          onSupplierPdf={vm.financePanel.onSupplierPdf}
          fmtDateOnly={vm.fmtDateOnly}
        />
      </DirectorFinanceCardModal>

      <DirectorReportsModal
        visible={vm.reports.repOpen}
        onClose={vm.reports.closeReports}
        repData={vm.reports.repData}
        repDiscipline={vm.reports.repDiscipline}
        repPeriodShort={vm.reports.repPeriodShort}
        repLoading={vm.reports.repLoading}
        repDisciplinePriceLoading={vm.reports.repDisciplinePriceLoading}
        repPeriodOpen={vm.reports.repPeriodOpen}
        onOpenPeriod={() => vm.reports.setRepPeriodOpen(true)}
        onClosePeriod={() => vm.reports.setRepPeriodOpen(false)}
        repFrom={vm.reports.repFrom}
        repTo={vm.reports.repTo}
        onApplyPeriod={(from: string, to: string) => void vm.reports.applyReportPeriod(from || null, to || null)}
        onClearPeriod={vm.reports.clearReportPeriod}
        repObjOpen={vm.reports.repObjOpen}
        onCloseRepObj={() => vm.reports.setRepObjOpen(false)}
        repOptObjects={vm.reports.repOptObjects}
        applyObjectFilter={vm.reports.applyObjectFilter}
        repObjectName={vm.reports.repObjectName}
        onOpenRepObj={() => vm.reports.setRepObjOpen(true)}
        repOptLoading={vm.reports.repOptLoading}
        repTab={vm.reports.repTab}
        setRepTab={vm.reports.setRepTab}
        onRefresh={vm.reports.refreshReports}
        onExportProductionPdf={onExportProductionPdf}
        onExportSubcontractPdf={onExportSubcontractPdf}
      />

      <DirectorSheetModal
        isVisible={vm.isSheetOpen}
        onClose={vm.closeSheet}
        sheetTitle={vm.sheetTitle}
        sheetKind={vm.sheetKind}
        sheetRequest={vm.sheetRequest}
        sheetProposalId={vm.sheetProposalId}
        screenLock={vm.screenLock}
        actingId={vm.actingId}
        reqDeleteId={vm.reqDeleteId}
        reqSendId={vm.reqSendId}
        isRequestPdfBusy={vm.requestActions.isRequestPdfBusy}
        onRejectItem={vm.requestActions.rejectRequestItem}
        onDeleteAll={vm.requestActions.deleteRequestAll}
        onOpenPdf={vm.requestActions.openRequestPdf}
        onExportExcel={vm.requestActions.exportRequestExcel}
        onApproveAndSend={vm.requestActions.approveRequestAndSend}
        loadedByProp={vm.loadedByProp}
        itemsByProp={vm.itemsByProp}
        propsHeads={vm.data.propsHeads}
        propApproveId={vm.propApproveId}
        propReturnId={vm.propReturnId}
        decidingId={vm.decidingId}
        actingPropItemId={vm.actingPropItemId}
        propAttByProp={vm.propAttByProp}
        propAttBusyByProp={vm.propAttBusyByProp}
        propAttErrByProp={vm.propAttErrByProp}
        reqItemNoteById={vm.data.reqItemNoteByIdRef.current}
        propReqIdsByProp={vm.data.propReqIdsByPropRef.current}
        reqMetaById={vm.data.reqMetaByIdRef.current}
        isProposalPdfBusy={vm.proposalActions.isProposalPdfBusy}
        loadProposalAttachments={vm.proposalDetail.loadProposalAttachments}
        onOpenAttachment={(file) => {
          void openAppAttachment({
            url: file.url,
            bucketId: file.bucket_id,
            storagePath: file.storage_path,
            fileName: file.file_name,
          });
        }}
        rejectProposalItem={vm.proposalActions.rejectProposalItem}
        onDirectorReturn={vm.proposalDetail.onDirectorReturn}
        openProposalPdf={vm.proposalActions.openProposalPdf}
        exportProposalExcel={vm.proposalActions.exportProposalExcel}
        approveProposal={vm.proposalActions.approveProposal}
      />
    </RoleScreenLayout>
  );
}
