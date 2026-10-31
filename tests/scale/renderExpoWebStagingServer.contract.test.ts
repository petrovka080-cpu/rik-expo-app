import {runInNewContext} from 'node:vm';
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("Render Expo web staging service config", () => {
  it("defines production web build/start scripts without dev server fallback", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["render:build:web"]).toContain("expo/bin/cli export --platform web --output-dir dist");
    expect(packageJson.scripts["render:start:web"]).toBe("node scripts/render/serveExpoWebStaging.mjs");
    expect(packageJson.scripts["render:start:web"]).not.toContain("expo start");
  });

  it("serves a Render-compatible health/version API and SPA fallback", () => {
    const server = readProjectFile("scripts/render/serveExpoWebStaging.mjs");

    expect(server).toContain('url.pathname === "/health"');
    expect(server).toContain('url.pathname === "/api/version"');
    expect(server).toContain('url.pathname === "/__version"');
    expect(server).toContain('const CATALOG_VERSION = "catalog:11610"');
    expect(server).toContain('return existsSync(indexPath) ? indexPath : null');
    expect(server).toContain('server.listen(port, host');
    expect(server).toContain('const host = process.env.HOST ?? "0.0.0.0"');
  });

  it("keeps Render app staging isolated from BFF/prod auto deploy", () => {
    const renderYaml = readProjectFile("render.yaml");

    expect(renderYaml).toContain("name: rik-expo-app-staging");
    expect(renderYaml).toContain("repo: https://github.com/petrovka080-cpu/rik-expo-app.git");
    expect(renderYaml).toContain("branch: release/production-candidate");
    expect(renderYaml).toContain("buildCommand: npm ci && npm run render:build:web");
    expect(renderYaml).toContain("startCommand: npm run render:start:web");
    expect(renderYaml).toContain("healthCheckPath: /health");
    expect(renderYaml).toContain("autoDeploy: false");
    expect(renderYaml).not.toContain("gox-build-production-bff");
    expect(renderYaml).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("keeps Android Render acceptance on external URL instead of localhost reverse", () => {
    const androidHealth = readProjectFile("scripts/e2e/checkAndroidEmulatorHealth.ts");

    expect(androidHealth).toContain("function isLocalhostUrl(baseUrl: string)");
    expect(androidHealth).toContain("if (isLocalhostUrl(baseUrl))");
    expect(androidHealth).toContain("const launch = adbShell(serial");
  });
});

describe('same streamed Expo server PDF module MIME contract',()=>{
 it.each([['pdf.mjs','text/javascript; charset=utf-8'],['pdf.worker.mjs','text/javascript; charset=utf-8'],['decoder.wasm','application/wasm'],['font.ttf','font/ttf'],['map.bcmap','application/octet-stream']])('serves browser-required content type for%s without starting a server',(name,expected)=>{
   const script=readProjectFile('scripts/render/serveExpoWebStaging.mjs'),fn=script.match(/function contentType\(filePath\) \{[\s\S]*?\n\}/);
   expect(fn).not.toBeNull();const contentType=runInNewContext(fn![0]+';contentType',{path:{extname:path.extname}})as(file:string)=>string;expect(contentType(name)).toBe(expected);
 });
 it('keeps existing stream/no-cache-index/SPA transport and configurable canonical-root/port',()=>{
   const script=readProjectFile('scripts/render/serveExpoWebStaging.mjs');expect(script).toContain('createReadStream(filePath).pipe(res)');expect(script).toContain('headers["Cache-Control"] = "no-cache"');expect(script).toContain('argValue("root")');expect(script).toContain('argValue("port")');expect(script).not.toContain('expo start');
 });
});
describe('same static server malformed-request isolation without opening a network listener',()=>{
 function actualHandler(){
  const raw=readProjectFile('scripts/render/serveExpoWebStaging.mjs'),script=raw.replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.url',"'file:///source/serveExpoWebStaging.mjs'");
  let request!:(req:any,res:any)=>void;const events=new Map<string,Function>();
  const server={on:(name:string,fn:Function)=>{events.set(name,fn);return server;},listen:jest.fn()};
  runInNewContext(script,{URL,path,process:{argv:['node','server'],cwd:()=>PROJECT_ROOT,env:{EXPO_PUBLIC_BUILD_COMMIT:'contract-source',EXPO_PUBLIC_BUILD_BRANCH:'contract-branch',APP_RUNTIME:'staging'},exit:()=>{throw new Error('unexpected process exit');}},console:{log:jest.fn(),error:jest.fn()},execFileSync:()=>'',fileURLToPath:()=>path.join(PROJECT_ROOT,'scripts/render/serveExpoWebStaging.mjs'),existsSync:(file:string)=>file.endsWith('index.html'),statSync:()=>({isFile:()=>true}),createReadStream:()=>({pipe:(res:any)=>res.end('INDEX_BYTES')}),createServer:(fn:typeof request)=>{request=fn;return server;}});
  const call=(url:string)=>{const errors=new Map<string,Function>(),res:any={status:0,headers:{},body:'',headersSent:false,writableEnded:false,destroyed:false,writeHead:(status:number,headers:unknown)=>{res.status=status;res.headers=headers;res.headersSent=true;},end:(body='')=>{res.body=String(body);res.writableEnded=true;},destroy:()=>{res.destroyed=true;}};request({url,method:'GET',on:(name:string,fn:Function)=>errors.set(name,fn)},res);return{res,errors};};
  return{call,events,server};
 }
 it.each(['/%ZZ','/%E0%A4%A','/%C3%28','/%FF','http://[','/%00'])('returns400 for%s then the same actual handler still serves health and root200',url=>{
  const h=actualHandler(),bad=h.call(url).res;expect(bad.status).toBe(400);expect(JSON.parse(bad.body).error).toBe('invalid_request_url');
  const health=h.call('/health').res;expect(health.status).toBe(200);expect(JSON.parse(health.body)).toMatchObject({status:'ok',source_sha:'contract-source'});
  const root=h.call('/').res;expect(root.status).toBe(200);expect(root.body).toBe('INDEX_BYTES');expect(h.server.listen).toHaveBeenCalledTimes(1);
 });
 it('isolates HTTP parser errors to one connection and keeps later health/root requests usable',()=>{
  const h=actualHandler(),socket={writable:true,end:jest.fn(),destroy:jest.fn()};h.events.get('clientError')!({code:'HPE_INVALID_URL'},socket);
  expect(socket.end).toHaveBeenCalledWith('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');expect(socket.destroy).not.toHaveBeenCalled();
  expect(h.call('/health').res.status).toBe(200);expect(h.call('/').res.status).toBe(200);
  h.events.get('clientError')!({code:'HPE_HEADER_OVERFLOW'},socket);expect(socket.end).toHaveBeenLastCalledWith(expect.stringContaining('431 Request Header Fields Too Large'));
  h.events.get('clientError')!({code:'ECONNRESET'},socket);expect(socket.destroy).toHaveBeenCalledTimes(1);
 });
});