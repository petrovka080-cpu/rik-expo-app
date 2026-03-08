import React from 'react';
import { View, ScrollView, Animated } from 'react-native';
import { openSignedUrlUniversal } from "../../src/lib/files";
import { UI, s } from "../../src/screens/director/director.styles";
import DirectorDashboard from "../../src/screens/director/DirectorDashboard";
import PeriodPickerSheet from "../../src/components/PeriodPickerSheet";
import { ensureSignedIn } from '../../src/lib/supabaseClient';
import DirectorFinanceCardModal from "../../src/screens/director/DirectorFinanceCardModal";
import DirectorFinanceContent from "../../src/screens/director/DirectorFinanceContent";
import DirectorReportsModal from "../../src/screens/director/DirectorReportsModal";
import DirectorSheetModal from "../../src/screens/director/DirectorSheetModal";
import { useDirectorScreenController } from "../../src/screens/director/useDirectorScreenController";

export default function DirectorScreen() {
  const vm = useDirectorScreenController();

  const financePeriodUi = React.useMemo(() => ({
    cardBg: UI.cardBg,
    text: UI.text,
    sub: UI.sub,
    border: "rgba(255,255,255,0.14)",
    accentBlue: "#3B82F6",
    approve: "#22C55E",
  }), []);

  return (
    <View style={[s.container, { backgroundColor: UI.bg }]}>
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

        groups={vm.groups as any}
        propsHeads={vm.data.propsHeads as any}
        loadingRows={vm.data.loadingRows}
        loadingProps={vm.data.loadingProps}

        foremanRequestsCount={vm.groups.length}
        foremanPositionsCount={vm.data.rows.length}
        buyerPropsCount={vm.data.buyerPropsCount}
        buyerPositionsCount={vm.data.buyerPositionsCount}

        labelForRequest={(rid: any) => vm.data.labelForRequest(rid)}
        fmtDateOnly={vm.fmtDateOnly}
        submittedAtByReq={vm.data.submittedAtByReq}

        openRequestSheet={vm.openRequestSheet as any}
        ProposalRow={vm.propRow.ProposalRow as any}
        screenLock={vm.screenLock}

        ensureSignedIn={ensureSignedIn}
        fetchRows={vm.data.fetchRows as any}
        fetchProps={vm.data.fetchProps as any}
        rtToast={vm.rtToast}

        finLoading={vm.finLoading}
        finRows={vm.finRows as any}
        finRep={vm.finRep as any}
        finSpendRows={vm.finSpendRows as any}
        money={vm.money}
        FIN_DUE_DAYS_DEFAULT={7}
        FIN_CRITICAL_DAYS={14}
        fetchFinance={vm.financePanel.fetchFinance as any}
        finFrom={vm.finFrom}
        finTo={vm.finTo}

        openFinancePage={(page: any) => vm.openFinancePage(page)}
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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <DirectorFinanceContent
            finPage={vm.finPage}
            finLoading={vm.finLoading}
            finRep={vm.finRep}
            finSpendRows={vm.finSpendRows}
            finKindName={vm.finKindName}
            finKindList={vm.finKindList}
            finSupplier={vm.finSupplier}
            supplierPdfBusy={vm.financePanel.supplierPdfBusy}
            FIN_CRITICAL_DAYS={14}
            pushFin={vm.pushFin}
            openSupplier={vm.financePanel.openSupplier}
            openFinKind={vm.financePanel.openFinKind}
            onSupplierPdf={vm.financePanel.onSupplierPdf}
            fmtDateOnly={vm.fmtDateOnly}
          />
        </ScrollView>
      </DirectorFinanceCardModal>

      <DirectorReportsModal
        visible={vm.reports.repOpen}
        onClose={vm.reports.closeReports}
        repData={vm.reports.repData}
        repDiscipline={vm.reports.repDiscipline}
        repPeriodShort={vm.reports.repPeriodShort}
        repLoading={vm.reports.repLoading}
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
        reqItemNoteById={vm.data.reqItemNoteByIdRef.current}
        propReqIdsByProp={vm.data.propReqIdsByPropRef.current}
        reqMetaById={vm.data.reqMetaByIdRef.current}
        isProposalPdfBusy={vm.proposalActions.isProposalPdfBusy}
        loadProposalAttachments={vm.proposalDetail.loadProposalAttachments}
        onOpenAttachment={(url, fileName) => {
          void openSignedUrlUniversal(url, fileName);
        }}
        rejectProposalItem={vm.proposalActions.rejectProposalItem}
        onDirectorReturn={vm.proposalDetail.onDirectorReturn}
        openProposalPdf={vm.proposalActions.openProposalPdf}
        exportProposalExcel={vm.proposalActions.exportProposalExcel}
        approveProposal={vm.proposalActions.approveProposal}
      />
    </View>
  );
}
