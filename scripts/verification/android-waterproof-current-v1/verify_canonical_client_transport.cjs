'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
function verifyFunction(source,expected,parser){
 let fn=null,used=0;
 for(let end=source.indexOf('}');end>=0;end=source.indexOf('}',end+1)){
  try{const tree=parser.parse(source.slice(0,end+1),{sourceType:'script'});if(tree.program.body.length===1&&tree.program.body[0].type==='FunctionDeclaration'){fn=tree.program.body[0];used=end+1;break;}}catch{}
 }
 if(!fn||fn.id?.name!=='resolveFunctionUrl'||fn.params.length)throw Error('TRANSPORT_FUNCTION_UNPARSEABLE');
 const vars=fn.body.body.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations);
 const configured=vars.filter(n=>n.id.type==='Identifier'&&n.id.name==='configured');if(configured.length!==1)throw Error('TRANSPORT_CONFIGURED_DECLARATION');
 const init=configured[0].init;if(init?.type!=='CallExpression'||init.arguments.length||init.callee.type!=='MemberExpression'||init.callee.computed||init.callee.property.name!=='trim')throw Error('TRANSPORT_TRIM_BINDING');
 const call=init.callee.object;if(call.type!=='CallExpression'||call.callee.type!=='Identifier'||call.callee.name!=='String'||call.arguments.length!==1)throw Error('TRANSPORT_STRING_BINDING');
 const value=call.arguments[0];let mode;
 if(value.type==='StringLiteral'&&value.value===expected)mode='EXACT_DIRECT_LITERAL';
 else{
  const t=value.type==='ConditionalExpression'?value.test:null,a=t?.type==='BinaryExpression'&&t.operator==='!='&&t.right.type==='NullLiteral'?t.left:null;
  const name=a?.type==='AssignmentExpression'&&a.operator==='='&&a.left.type==='Identifier'&&a.right.type==='StringLiteral'&&a.right.value===expected?a.left.name:null;
  if(!name||value.consequent.type!=='Identifier'||value.consequent.name!==name||value.alternate.type!=='StringLiteral'||value.alternate.value!==''||!vars.some(n=>n.id.type==='Identifier'&&n.id.name===name&&n.init===null))throw Error('TRANSPORT_NONCONSTANT_OR_WRONG_NULLISH_BINDING');
  mode='EXACT_BABEL_NULLISH_LITERAL';
 }
 const url=vars.filter(n=>n.id.type==='Identifier'&&n.id.name==='url');if(url.length!==1||url[0].init?.type!=='LogicalExpression'||url[0].init.operator!=='||'||url[0].init.left.type!=='Identifier'||url[0].init.left.name!=='configured')throw Error('TRANSPORT_URL_NOT_BOUND_TO_CONFIGURED');
 let bad=false;function walk(n){if(!n||typeof n!=='object')return;if((n.type==='AssignmentExpression'||n.type==='UpdateExpression')&&['configured','url'].includes((n.left??n.argument)?.name))bad=true;if(n.type==='VariableDeclarator'&&n.id?.name==='String')bad=true;for(const [key,v]of Object.entries(n))if(key!=='loc'&&key!=='start'&&key!=='end'){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}walk(fn.body);if(bad)throw Error('TRANSPORT_BINDING_REASSIGNED_OR_STRING_SHADOWED');
 const ret=fn.body.body.filter(n=>n.type==='ReturnStatement');if(ret.length!==1||ret[0].argument?.type!=='CallExpression'||ret[0].argument.callee?.type!=='MemberExpression'||ret[0].argument.callee.computed||ret[0].argument.callee.object?.name!=='url'||ret[0].argument.callee.property?.name!=='replace')throw Error('TRANSPORT_RETURN_NOT_BOUND_TO_URL');
 return {status:'PASS_EXACT_CANONICAL_CLIENT_TRANSPORT_AST',functionName:fn.id.name,configuredUrl:expected,mode,functionBytes:Buffer.byteLength(source.slice(0,used)),functionSha256:crypto.createHash('sha256').update(source.slice(0,used)).digest('hex')};
}
function verifyBundle(bundle,expected,parser){
 const fd=fs.openSync(bundle,'r'),chunk=Buffer.alloc(65536),hash=crypto.createHash('sha256');let carry=Buffer.alloc(0),bytes=0;const results=new Map(),candidates=new Set();
 function inspect(block,base){const text=block.toString('latin1'),rx=/\bfunction\s+resolveFunctionUrl\s*\(\s*\)\s*\{/g;let m;while((m=rx.exec(text))){const offset=base+m.index;candidates.add(offset);if(results.has(offset))continue;try{results.set(offset,verifyFunction(block.subarray(m.index,m.index+16384).toString('utf8'),expected,parser));}catch(e){if(block.length-m.index>=16384)throw e;}}}
 try{let count;while((count=fs.readSync(fd,chunk,0,chunk.length,null))){const next=chunk.subarray(0,count);hash.update(next);const block=Buffer.concat([carry,next]);inspect(block,bytes-carry.length);bytes+=count;carry=Buffer.from(block.subarray(Math.max(0,block.length-32768)));}inspect(carry,bytes-carry.length);}finally{fs.closeSync(fd);}
 if(results.size!==1||candidates.size!==1)throw Error('TRANSPORT_FUNCTION_NOT_UNIQUE_OR_UNVERIFIED:'+results.size+'/'+candidates.size);
 return {...results.values().next().value,bundleSha256:hash.digest('hex'),bundleBytes:bytes,functionOccurrences:results.size,noBundleExecution:true};
}
module.exports={verifyFunction,verifyBundle};
if(require.main===module){const args=process.argv.slice(2),arg=n=>{const i=args.indexOf(n);if(i<0)throw Error('MISSING_'+n);return args[i+1];};const root=path.resolve(arg('--root')),parser=createRequire(path.join(root,'package.json'))('@babel/parser');const result=verifyBundle(arg('--bundle'),arg('--expected-url'),parser);fs.writeFileSync(arg('--report'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
