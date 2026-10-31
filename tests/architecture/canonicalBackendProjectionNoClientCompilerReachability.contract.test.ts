import * as ts from 'typescript';
import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("canonical backend projection has no client compiler reachability", () => {
  it("keeps the canonical revision PDF projection on a compiler-free adapter", () => {
    const canonicalAdapter = readRepoFile(
      "src/lib/estimate/backendPlatform/canonicalEstimateClientForemanProjection.ts",
    );
    const sharedBinding = readRepoFile(
      "src/lib/estimateStructuredPipeline/structuredEstimateForemanBinding.ts",
    );
    const pdfAdapter = readRepoFile(
      "src/lib/ai/estimatePdf/estimatePdfGlobalResultAdapter.ts",
    );

    expect(canonicalAdapter).toContain("buildStructuredEstimateForemanBinding");
    expect(sharedBinding).toContain("estimatePdfGlobalResultAdapter");
    expect(sharedBinding).not.toContain("estimatePdfSourceResolver");
    expect(pdfAdapter).not.toMatch(
      /globalEstimateCalculator|expandedEstimateCompiler|productionExpandedWorkCatalog10000|compileProductionExpandedEstimate10000/u,
    );
  });
});


test('actual client projection loads without replaying the server physical norm resolver',()=>{
  const physical='../../src/lib/estimate/backendPlatform/canonicalEstimatePhysicalNormProjection';
  try {
    jest.isolateModules(()=>{
      jest.doMock(physical,()=>{throw new Error('FORBIDDEN_CLIENT_PHYSICAL_RESOLVER');});
      expect(()=>require(physical)).toThrow('FORBIDDEN_CLIENT_PHYSICAL_RESOLVER');
      const client=require('../../src/lib/estimate/backendPlatform/canonicalEstimateClientForemanProjection');
      expect(client.adaptCanonicalRevisionToStructuredEstimate).toEqual(expect.any(Function));
      expect(client.adaptCanonicalCompilationToAssistantProjection({})).toBeNull();
    });
  } finally {jest.dontMock(physical);}
});


test('both existing rows endpoints attach backend evidence and preserve immutable saved amendments',()=>{
  const paths=['supabase/functions/canonical-estimate/index.ts','scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts'];
  for(const path of paths){
    const source=ts.createSourceFile(path,readRepoFile(path),ts.ScriptTarget.Latest,true);
    const scopes:ts.Node[]=[];
    const select=(node:ts.Node)=>{
      if(path.startsWith('supabase/')&&ts.isFunctionDeclaration(node)&&node.name?.text==='readRevisionRows')scopes.push(node);
      if(path.startsWith('scripts/')&&ts.isIfStatement(node)&&/path\[2\]\s*===\s*["']rows["']/u.test(node.expression.getText(source)))scopes.push(node.thenStatement);
      ts.forEachChild(node,select);
    };select(source);expect(scopes).toHaveLength(1);
    const calls:ts.CallExpression[]=[];const visit=(node:ts.Node)=>{if(ts.isCallExpression(node))calls.push(node);ts.forEachChild(node,visit);};visit(scopes[0]!);
    const mapped=calls.filter(node=>node.expression.getText(source)==='canonicalEstimateRevisionRowFromStorage');
    expect(mapped).toHaveLength(1);expect(mapped[0]!.arguments[3]?.getText(source)).toBe('revision.amendment_contract');
    const attached=calls.filter(node=>node.expression.getText(source)==='attachCanonicalPhysicalNormEvidenceV1');
    expect(attached).toHaveLength(1);expect(attached[0]!.arguments[1]).toBe(mapped[0]);
    expect(attached[0]!.arguments[0]?.getText(source)).toBe('canonicalPhysicalNormRevisionFromStorageV1(revision)');
    expect(scopes[0]!.getText(source)).toContain('amendment_contract');
  }
});
