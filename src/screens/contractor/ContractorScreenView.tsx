import React from "react";
import { View } from "react-native";

import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
import ActBuilderModal from "./components/ActBuilderModal";
import ContractDetailsModal from "./components/ContractDetailsModal";
import ContractorActivationView from "./components/ContractorActivationView";
import ContractorLoadingView from "./components/ContractorLoadingView";
import ContractorSubcontractsList from "./components/ContractorSubcontractsList";
import ContractorWorkModal from "./components/ContractorWorkModal";
import EstimateMaterialsModal from "./components/EstimateMaterialsModal";
import Text from "./components/NormalizedText";
import WorkStagePickerModal from "./components/WorkStagePickerModal";
import { styles } from "./contractor.styles";
import type { ContractorScreenController } from "./useContractorScreenController";

const UI_TEXT = {
  loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
  activationTitle: "\u0410\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f \u043f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a\u0430",
  activationSubtitle: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0434 \u0430\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u0438, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0432\u044b\u0434\u0430\u043b \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440.",
  activationPlaceholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0434 \u0430\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u0438, \u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: A3F9-C8ZD",
  activating: "\u0410\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f...",
  activate: "\u0410\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  homeTitle: "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a",
} as const;

export default function ContractorScreenView(props: ContractorScreenController) {
  const {
    modalHeaderTopPad,
    sheetHeaderTopPad,
    loadingProfile,
    profile,
    code,
    setCode,
    activating,
    activateCode,
    contractorWorkCards,
    screenContract,
    refreshing,
    loadingWorks,
    rowsReady,
    subcontractsReady,
    handleRefresh,
    handleOpenUnifiedCard,
    workModalVisible,
    closeWorkModal,
    onAnyModalDismissed,
    contractorWorkModalProps,
    actBuilderVisible,
    setActBuilderVisible,
    actBuilderModalProps,
    workOverlayModal,
    closeContractDetailsModal,
    jobHeader,
    workModalRow,
    resolvedObjectName,
    closeEstimateMaterialsModal,
    workModalMaterials,
    setWorkModalMaterials,
    workModalReadOnly,
    workSearchVisible,
    workSearchQuery,
    handleWorkSearchChange,
    workSearchResults,
    renderWorkSearchItem,
    setWorkSearchVisible,
    clearWorkSearchState,
    closeWorkStagePickerModal,
    workStageOptions,
    renderWorkStageItem,
  } = props;

  if (loadingProfile && !profile) {
    return <ContractorLoadingView text={UI_TEXT.loading} />;
  }

  if (!profile?.is_contractor) {
    return (
      <ContractorActivationView
        code={code}
        activating={activating}
        onCodeChange={setCode}
        onActivate={activateCode}
        title={UI_TEXT.activationTitle}
        subtitle={UI_TEXT.activationSubtitle}
        placeholder={UI_TEXT.activationPlaceholder}
        activateText={UI_TEXT.activate}
        activatingText={UI_TEXT.activating}
      />
    );
  }

  return (
    <RoleScreenLayout style={[styles.container, styles.homeContainer]}>
      <View pointerEvents="none" style={styles.homeGlow} />
      <View style={styles.homeHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={[styles.headerTitle, styles.homeHeaderTitle]}>{UI_TEXT.homeTitle}</Text>
        </View>
      </View>

      <ContractorSubcontractsList
        data={contractorWorkCards}
        screenContract={screenContract}
        refreshing={refreshing}
        loadingWorks={loadingWorks || !rowsReady || !subcontractsReady}
        onRefresh={handleRefresh}
        onOpen={handleOpenUnifiedCard}
        styles={styles}
      />

      <ContractorWorkModal
        visible={workModalVisible}
        onClose={closeWorkModal}
        onDismiss={onAnyModalDismissed}
        modalHeaderTopPad={modalHeaderTopPad}
        {...contractorWorkModalProps}
      />

      <ActBuilderModal
        visible={actBuilderVisible}
        onClose={() => setActBuilderVisible(false)}
        onDismiss={onAnyModalDismissed}
        modalHeaderTopPad={modalHeaderTopPad}
        {...actBuilderModalProps}
      />

      <ContractDetailsModal
        visible={workOverlayModal === "contract"}
        onClose={closeContractDetailsModal}
        jobHeader={jobHeader}
        workModalRow={workModalRow}
        resolvedObjectName={resolvedObjectName}
      />

      <EstimateMaterialsModal
        visible={workOverlayModal === "estimate"}
        onClose={closeEstimateMaterialsModal}
        sheetHeaderTopPad={sheetHeaderTopPad}
        workModalMaterials={workModalMaterials}
        setWorkModalMaterials={setWorkModalMaterials}
        workModalReadOnly={workModalReadOnly}
        workSearchVisible={workSearchVisible}
        workSearchQuery={workSearchQuery}
        handleWorkSearchChange={handleWorkSearchChange}
        workSearchResults={workSearchResults}
        renderWorkSearchItem={renderWorkSearchItem}
        onOpenSearch={() => setWorkSearchVisible(true)}
        closeSearch={clearWorkSearchState}
      />

      <WorkStagePickerModal
        visible={workOverlayModal === "stage"}
        onClose={closeWorkStagePickerModal}
        sheetHeaderTopPad={sheetHeaderTopPad}
        workStageOptions={workStageOptions}
        renderWorkStageItem={renderWorkStageItem}
      />
    </RoleScreenLayout>
  );
}