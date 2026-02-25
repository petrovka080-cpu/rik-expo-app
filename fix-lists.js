const fs = require('fs');

const fixWarehouse = () => {
    const file = 'app/(tabs)/warehouse.tsx';
    let txt = fs.readFileSync(file, 'utf8');
    let old = txt;
    txt = txt.replace(/\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g, '.catch((e) => console.warn(e))');
    console.log('Fixed warehouse.tsx catches:', old !== txt);
    fs.writeFileSync(file, txt, 'utf8');
};

const fixWarehouseRec = () => {
    const file = 'src/screens/warehouse/warehouse.recipient.ts';
    let txt = fs.readFileSync(file, 'utf8');
    let old = txt;
    txt = txt.replace(/\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g, '.catch((e) => console.warn(e))');
    console.log('Fixed warehouse.recipient.ts catches:', old !== txt);
    fs.writeFileSync(file, txt, 'utf8');
};

const fixForeman = () => {
    const file = 'app/(tabs)/foreman.tsx';
    let txt = fs.readFileSync(file, 'utf8');
    let old = txt;
    txt = txt.replace(/\.catch\(\s*\(\)\s*=>\s*null\s*\)/g, '.catch((e) => console.warn(e))');
    console.log('Fixed foreman.tsx catches:', old !== txt);
    fs.writeFileSync(file, txt, 'utf8');
};

fixWarehouse();
fixWarehouseRec();
fixForeman();
