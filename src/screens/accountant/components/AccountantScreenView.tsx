import React from "react";
import { View, ScrollView } from "react-native";

import PeriodPickerSheet from "../../../components/PeriodPickerSheet";
import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import { formatProposalBaseNo, roleBadgeLabel } from "../../../lib/format";
import { normalizeRuText } from "../../../lib/text/encoding";
import WarehouseFioModal from "../../warehouse/components/WarehouseFioModal";
import AccountantSubcontractTab from "../AccountantSubcontractTab";
import ActivePaymentForm from "./ActivePaymentForm";
import { AccountantCardContent } from "./AccountantCardContent";
import { AccountantHeader } from "./AccountantHeader";
import { AccountantListBlock } from "./AccountantListSection";
import CardModal from "./CardModal";
import NotificationsModal from "./NotificationsModal";
import { ReadOnlyPaymentReceipt } from "./ReadOnlyReceipt";
import { UI } from "../ui";
import { SafeView, safeAlert, runNextTick, statusFromRaw } from "../helpers";
import type { AttachmentRow } from "../types";
import type { AccountantScreenComposition } from "../useAccountantScreenComposition";

const ruText = (v: unknown, fallback = "") => normalizeRuText(String(v ?? fallback));

export function AccountantScreenView(model: AccountantScreenComposition) {
  const {
    insets,
    busyKey,
    runAction,
    tab,
    setTabWithCachePreview,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    periodOpen,
    setPeriodOpen,
    cardOpen,
    currentPaymentId,
    accountantFio,
    setAccountantFio,
    cardScrollRef,
    payFormReveal,
    headerHeight,
    headerShadow,
    titleSize,
    subOpacity,
    HEADER_MAX,
    onListScroll,
    onCardScroll,
    current,
    invoiceNo,
    setInvoiceNo,
    invoiceDate,
    setInvoiceDate,
    supplierName,
    setSupplierName,
    amount,
    setAmount,
    note,
    setNote,
    allocRows,
    setAllocRows,
    setAllocOk,
    setAllocSum,
    bankName,
    setBankName,
    bik,
    setBik,
    rs,
    setRs,
    inn,
    setInn,
    kpp,
    setKpp,
    INV_PREFIX,
    invMM,
    setInvMM,
    invDD,
    setInvDD,
    mmRef,
    ddRef,
    clamp2,
    payKind,
    setPayKind,
    isReadOnlyTab,
    isPayActiveTab,
    payAccent,
    kbTypeNum,
    canPayUi,
    kbOpen,
    kbdH,
    scrollInputIntoView,
    rows,
    loading,
    refreshing,
    inboxLoadingMore,
    inboxHasMore,
    inboxTotalCount,
    historyRows,
    historyLoading,
    historyRefreshing,
    historyLoadingMore,
    historyHasMore,
    historyTotalCount,
    loadHistory,
    loadMoreInbox,
    loadMoreHistory,
    onRefresh,
    onRefreshHistory,
    bellOpen,
    setBellOpen,
    notifs,
    unread,
    loadNotifs,
    markAllRead,
    accountantHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
    attRows,
    attState,
    attMessage,
    onOpenAttachments,
    openOneAttachment,
    closeCard,
    onOpenProposalPdf,
    onOpenInvoiceDoc,
    onOpenPaymentReport,
    onPayConfirm,
    onReturnToBuyer,
    renderInboxRow,
    historyHeader,
    renderHistoryRow,
    isHistoryTab,
  } = model;

  return (
    <SafeView style={{ flex: 1, backgroundColor: UI.bg }}>
      <RoleScreenLayout>
      <AccountantHeader
        headerHeight={headerHeight}
        headerShadow={headerShadow}
        titleSize={titleSize}
        subOpacity={subOpacity}
        tab={tab}
        setTab={setTabWithCachePreview}
        unread={unread}
        rowsCount={isHistoryTab ? historyTotalCount : inboxTotalCount}
        accountantFio={accountantFio}
        onOpenFioModal={() => setIsFioConfirmVisible(true)}
        onBell={() => { setBellOpen(true); void loadNotifs(); }}
        onExcel={() => safeAlert("Excel", "Экспорт Excel для этого раздела будет добавлен.")}
      />

      {tab === "Подряды" ? (
        <AccountantSubcontractTab contentTopPad={HEADER_MAX + 16} />
      ) : (
        <AccountantListBlock
          isHistory={isHistoryTab}
          historyRows={historyRows}
          rows={rows}
          historyHeader={historyHeader}
          historyLoading={historyLoading}
          loading={loading}
          historyRefreshing={historyRefreshing}
          refreshing={refreshing}
          historyLoadingMore={historyLoadingMore}
          loadingMore={inboxLoadingMore}
          historyHasMore={historyHasMore}
          hasMore={inboxHasMore}
          onRefreshHistory={onRefreshHistory}
          onRefresh={onRefresh}
          onEndReachedHistory={loadMoreHistory}
          onEndReached={loadMoreInbox}
          onScroll={onListScroll}
          contentTopPad={HEADER_MAX + 16}
          onRenderHistory={renderHistoryRow}
          onRenderInbox={renderInboxRow}
          uiTextColor={UI.text} uiSubColor={UI.sub}
        />
      )}

      <PeriodPickerSheet
        visible={periodOpen}
        onClose={() => setPeriodOpen(false)}
        initialFrom={dateFrom}
        initialTo={dateTo}
        onClear={() => { setDateFrom(''); setDateTo(''); runNextTick(() => void loadHistory(true)); }}
        onApply={(from, to) => { setDateFrom(from); setDateTo(to); runNextTick(() => void loadHistory(true)); }}
        ui={{ cardBg: UI.cardBg, text: UI.text, sub: UI.sub, border: 'rgba(255,255,255,0.14)', approve: UI.btnApprove, accentBlue: '#3B82F6' }}
      />

      <CardModal
        visible={cardOpen}
        onClose={closeCard}
        insetsTop={insets.top || 0}
        insetsBottom={insets.bottom || 0}
        kbOpen={kbOpen}
        kbdH={kbdH}
        ui={UI}
        busyKey={busyKey}
        isReadOnlyTab={isReadOnlyTab}
        canPayUi={canPayUi}
        headerSubtitle={`${formatProposalBaseNo(current?.proposal_no, String(current?.proposal_id ?? ""))} • ${ruText(current?.supplier || "—")} • счёт ${ruText(current?.invoice_number || "без №")}`}
        onReturnToBuyer={onReturnToBuyer}
        onOpenPdf={onOpenProposalPdf}
        onExcel={() => safeAlert("Excel", "Экспорт Excel для этой карточки будет добавлен.")}
        onPay={onPayConfirm}
        runAction={runAction}
        scrollRef={(r: ScrollView | null) => { payFormReveal.scrollRef.current = r; cardScrollRef.current = r; }}
        onScroll={onCardScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 68 }}
      >
        {isReadOnlyTab ? (
          <ReadOnlyPaymentReceipt
            current={current}
            tab={tab}
            currentPaymentId={currentPaymentId}
            accountantFio={accountantFio}
            note={note}
            bankName={bankName}
            bik={bik}
            rs={rs}
            inn={inn}
            kpp={kpp}
            attRows={attRows}
            attState={attState}
            attMessage={attMessage}
            busyKey={busyKey}
            onRefreshAtt={async () => {
              const pid = String(current?.proposal_id ?? "").trim();
              await onOpenAttachments(pid, { silent: true, force: true });
            }}
            onOpenFile={(f: AttachmentRow) => void openOneAttachment(f)}
            onOpenInvoice={onOpenInvoiceDoc}
            onOpenReport={onOpenPaymentReport}
            invoiceNoDraft={invoiceNo}
            invoiceDateDraft={invoiceDate}
          />
        ) : (
          <>
            <AccountantCardContent
              current={current}
              tab={tab}
              isHist={isHistoryTab}
              busyKey={busyKey}
              attRows={attRows}
              attState={attState}
              attMessage={attMessage}
              currentDisplayStatus={current?.payment_status ?? "К оплате"}
              onRefreshAtt={async () => {
                const pid = String(current?.proposal_id ?? "").trim();
                await onOpenAttachments(pid, { silent: true, force: true });
              }}
              onOpenFile={(f: AttachmentRow) => void openOneAttachment(f)}
              onOpenInvoice={onOpenInvoiceDoc}
              onOpenReport={onOpenPaymentReport}
              formatProposalBaseNo={formatProposalBaseNo}
              roleBadgeLabel={roleBadgeLabel}
              statusFromRaw={statusFromRaw}
              runAction={runAction}
            />
            <View style={{ height: 12 }} />
            <ActivePaymentForm
              busyKey={busyKey}
              isPayActiveTab={isPayActiveTab}
              payAccent={payAccent}
              kbTypeNum={kbTypeNum}
              current={current}
              supplierName={supplierName}
              invoiceNo={invoiceNo}
              invoiceDate={invoiceDate}
              INV_PREFIX={INV_PREFIX}
              invMM={invMM}
              invDD={invDD}
              setSupplierName={setSupplierName}
              setInvoiceNo={setInvoiceNo}
              setInvoiceDate={setInvoiceDate}
              setInvMM={setInvMM}
              setInvDD={setInvDD}
              clamp2={clamp2}
              mmRef={mmRef}
              ddRef={ddRef}
              scrollInputIntoView={scrollInputIntoView}
              accountantFio={accountantFio}
              setAccountantFio={setAccountantFio}
              payKind={payKind}
              setPayKind={setPayKind}
              amount={amount}
              setAmount={setAmount}
              note={note}
              setNote={setNote}
              bankName={bankName}
              setBankName={setBankName}
              bik={bik}
              setBik={setBik}
              rs={rs}
              setRs={setRs}
              inn={inn}
              setInn={setInn}
              kpp={kpp}
              setKpp={setKpp}
              allocRows={allocRows}
              setAllocRows={setAllocRows}
              onAllocStatus={(ok: boolean, sum: number) => { setAllocOk(ok); setAllocSum(sum); }}
            />
          </>
        )}
      </CardModal>

      <NotificationsModal visible={bellOpen} notifs={notifs} onMarkAllRead={markAllRead} onClose={() => setBellOpen(false)} />
      <WarehouseFioModal visible={isFioConfirmVisible} initialFio={accountantFio} onConfirm={handleFioConfirm} loading={isFioLoading} history={accountantHistory} />
      </RoleScreenLayout>
    </SafeView >
  );
}
