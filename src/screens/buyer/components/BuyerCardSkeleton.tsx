import React from "react";
import { View } from "react-native";
import type { StylesBag } from "./component.types";

export const BuyerCardSkeleton = React.memo(function BuyerCardSkeleton({ s }: { s: StylesBag }) {
    return (
        <View style={[s.proposalCard, { opacity: 0.5, borderStyle: 'dashed' }]}>
            <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ gap: 6 }}>
                        <View style={{ width: 140, height: 18, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                        <View style={{ width: 80, height: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
                    </View>
                    <View style={{ width: 100, height: 24, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
                    <View style={{ width: 120, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                    <View style={{ width: 40, height: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
                </View>
            </View>
        </View>
    );
});
