const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const W='C:/Users/User/Documents/Codex/2026-10-19/new-chat/work/construction-groups-canonical-checks-r15',spec=JSON.parse(fs.readFileSync(W+'/canonical-jest-construction-groups-inputs-r15.json','utf8'));
const norm=p=>path.resolve(p).replaceAll('\\','/');
const R=norm(spec.canonicalRoot),checked=new Set();
module.exports=(request,options)=>{
 const resolved=options.defaultResolver(request,{...options,paths:[...(options.paths||[]),R+'/node_modules']});
 const p=norm(resolved);
 if(p.startsWith(R+'/')&&!p.startsWith(R+'/node_modules/')){
  const digest=spec.canonicalSourcePins[p.slice(R.length+1)];if(!digest)throw Error('UNPINNED_ACTUAL_CANONICAL_IMPORT:'+p);
  if(!checked.has(p)){if(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==digest)throw Error('ACTUAL_CANONICAL_PIN_DRIFT:'+p);checked.add(p);}
 }
 return resolved;
};
