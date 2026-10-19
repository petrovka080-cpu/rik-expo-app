const fs=require('node:fs');
const W='C:/Users/User/Documents/Codex/2026-10-19/new-chat/work/construction-groups-canonical-checks-r15';
const s=JSON.parse(fs.readFileSync(W+'/canonical-jest-construction-groups-inputs-r15.json','utf8'));
const base=require(s.canonicalRoot+'/jest.config.js');
module.exports={...base,rootDir:s.canonicalRoot,
 roots:s.testRoots,modulePaths:[s.canonicalRoot+'/node_modules'],
 resolver:W+'/canonical-jest-construction-groups-resolver-r15.cjs',testMatch:s.suites.map(x=>x.path),
 cache:false,cacheDirectory:W+'/canonical-jest-construction-groups-cache-r15',watchman:false,
 collectCoverage:false,coverageThreshold:undefined,maxWorkers:1,testTimeout:30000};
