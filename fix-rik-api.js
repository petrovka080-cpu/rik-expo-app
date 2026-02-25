const fs = require('fs');
const file = 'src/lib/rik_api.ts';
let txt = fs.readFileSync(file, 'utf8');

// Strip out the commented items completely to avoid TS1003/TS1136 parsing errors
txt = txt.replace(/\/\*\s*resolveProposalPrettyTitle\s*\*\/\s*,?/g, '');
txt = txt.replace(/\/\*\s*webOpenPdfWindow\s*\*\/\s*,?/g, '');
txt = txt.replace(/\/\*\s*webWritePdfWindow\s*\*\/\s*,?/g, '');
txt = txt.replace(/\/\*\s*webDownloadHtml\s*\*\/\s*,?/g, '');

// Clean up any remaining double commas or hanging commas before braces
txt = txt.replace(/,\s*,/g, ',');
txt = txt.replace(/,\s*}/g, '\n}');

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed syntax errors in rik_api.ts');
