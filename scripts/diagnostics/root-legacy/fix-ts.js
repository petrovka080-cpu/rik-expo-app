const fs = require('fs');

function replaceFile(path, replacer) {
    if (!fs.existsSync(path)) return;
    let txt = fs.readFileSync(path, 'utf8');
    const org = txt;
    txt = replacer(txt);
    if (txt !== org) {
        fs.writeFileSync(path, txt, 'utf8');
        console.log('Fixed', path);
    } else {
        console.log('No changes needed in', path);
    }
}

// 1. MapRenderer.native.tsx
replaceFile('src/components/map/MapRenderer.native.tsx', t =>
    t.replace(/ref=\{\(r\) => \(mapRef\.current = r\)\}/g, 'ref={(r) => { mapRef.current = r; }}')
);

// 2. ResultsBottomSheet.tsx
replaceFile('src/components/map/ResultsBottomSheet.tsx', t =>
    t.replace(/ref=\{\(r\) => \(listRef\.current = r\)\}/g, 'ref={(r) => { listRef.current = r; }}')
);

// 3. CalcModal.tsx
replaceFile('src/components/foreman/CalcModal.tsx', t =>
    t.replace(/ref=\{\(r\) => \(scrollRef\.current = r\)\}/g, 'ref={(r) => { scrollRef.current = r; }}')
);

// 4. warehouse.incoming.ts (Line 64)
replaceFile('src/screens/warehouse/warehouse.incoming.ts', t =>
    t.replace(/const res = await Promise\.all\(\[\s+supabase\s+\.from\("wh_incoming"\)[\s\S]*?\.eq\("status", "pending"\),\s+\]\);/g,
        (match) => match.replace(/\.eq\("status", "pending"\)/, '.eq("status", "pending").throwOnError()'))
        .replace(/supabase\s*\.from\("wh_incoming"\)[\s\S]*?\.eq\("status", "pending"\)/g, (match) => match.endsWith('.then((x) => x)') ? match : match + '.then((x) => x)')
);

// 5. catalog_api.ts
replaceFile('src/lib/catalog_api.ts', t =>
    t.replace(/buildProposalPdfHtmlPretty/g, 'buildProposalPdfHtml')
);

// 6. _layout.tsx
replaceFile('app/(tabs)/_layout.tsx', t =>
    t.replace(/detachInactiveScreens: false,?\n?/g, '')
);

// 7. buyer.tsx (lines 1241, 1390, 1416)
// The issue is an expected signature of (p: { proposalId: string, invoiceNumber: string, invoiceDate: string, invoiceAmount: number, invoiceCurrency: string }) => Promise<void>
// But we give it (input: string | number | { ... }) => Promise<boolean>
// Buyer.fetchers.ts has these defined.
replaceFile('app/(tabs)/buyer.tsx', t => {
    return t
        .replace(/onPaymentSubmit=\{handlePaymentSubmit\}/g, 'onPaymentSubmit={async (p) => { await handlePaymentSubmit(p); }}')
        .replace(/onApprove=\{handleAccept\}/g, 'onApprove={async (pid) => { await handleAccept(pid); }}')
        .replace(/onAccept=\{handleAccept\}/g, 'onAccept={async (pid) => { await handleAccept(pid); }}');
});

// 8. Error in WarehouseSheet.tsx: height: string is not assignable to type 'DimensionValue'. And overflowY.
replaceFile('src/screens/warehouse/components/WarehouseSheet.tsx', t =>
    t.replace(/overflowY:\s*"hidden"/g, 'overflow: "hidden"')
);

// 9. Error in profile.tsx: 'timeout' does not exist in LocationOptions, 'modeCheckIcon' does not exist
replaceFile('app/(tabs)/profile.tsx', t =>
    t.replace(/timeout:\s*\d+,?/g, '')
        .replace(/s\.modeCheckIcon/g, 's.modeCheck')
);

console.log('Replacements executed');
