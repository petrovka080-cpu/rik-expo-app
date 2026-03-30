const fs = require('fs');

const file = 'src/screens/warehouse/components/IncomingItemsSheet.tsx';
if (fs.existsSync(file)) {
    let txt = fs.readFileSync(file, 'utf8');
    txt = txt.replace(/<FlatList\s+data=\{items\}\s+keyExtractor/g, '<FlatList<ItemRow>\n        data={items}\n        keyExtractor');
    fs.writeFileSync(file, txt, 'utf8');
}
console.log('Fixed IncomingItemsSheet.tsx');
