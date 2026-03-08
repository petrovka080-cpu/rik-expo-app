import { StyleSheet } from 'react-native';

import { D, UI } from './buyerUi';

export const buyerStyles = StyleSheet.create({
  screen: { flex: 1 },

  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 6,
  },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  tabPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tabPillActive: {
    backgroundColor: UI.cardBg,
    borderColor: UI.accent,
    borderWidth: 1.5,
  },
  tabPillText: {
    color: UI.sub,
    fontWeight: '800',
    fontSize: 14,
  },
  tabPillTextActive: { color: UI.text, fontWeight: '900' },

  tabBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tabBadgeActive: {
    backgroundColor: UI.accent,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '900', color: '#E5E7EB' },
  tabBadgeTextActive: { color: '#000' },

  group: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
    backgroundColor: UI.cardBg,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  groupTitle: { fontSize: 16, fontWeight: '900', color: UI.text },
  groupMeta: { fontSize: 13, fontWeight: '700', color: UI.sub, marginTop: 2 },

  card: {
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    backgroundColor: UI.cardBg,
    marginBottom: 8,
  },
  cardPicked: {
    borderColor: UI.accent,
    backgroundColor: 'rgba(34,197,94,0.04)',
  },

  cardTitle: { fontSize: 16, fontWeight: '900', color: UI.text },
  cardMeta: { marginTop: 4, color: UI.sub, fontSize: 13, fontWeight: '700' },

  smallBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { fontWeight: '900', color: UI.text, fontSize: 13 },

  openBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: { color: UI.accent, fontWeight: '900', fontSize: 18 },

  proposalCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: UI.cardBg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 12,
  },

  dirSheet: {
    height: '92%',
    width: "100%",
    backgroundColor: D.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },

  dirSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 10,
  },
  dirSheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dirSheetTitle: {
    flex: 1,
    color: D.text,
    fontWeight: '900',
    fontSize: 20,
  },
  dirSheetCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dirSheetCloseText: { color: D.text, fontWeight: '900', fontSize: 13 },

  sheetBody: {
    flex: 1,
    width: "100%",
  },

  sheetSection: {
    flex: 1,
    width: "100%",
  },

  dirMobCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  dirMobMain: { flex: 1 },
  dirMobTitle: { fontSize: 15, fontWeight: '900', color: D.text },
  dirMobMeta: { marginTop: 4, fontSize: 13, fontWeight: '700', color: D.sub },
  dirMobNote: { marginTop: 6, fontSize: 13, color: D.text, opacity: 0.8 },

  reqNoteBox: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
    borderLeftWidth: 4,
    borderLeftColor: UI.accent,
  },
  reqNoteLine: {
    color: UI.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },

  fieldInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: D.text,
    fontSize: 15,
  },

  suggestBoxInline: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: '#1A2433',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  suggestItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  buyerMobCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buyerMobCardPicked: {
    borderColor: UI.accent,
    backgroundColor: 'rgba(34,197,94,0.06)',
  },

  sendBtnWarnWrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    padding: 2,
  }
});
