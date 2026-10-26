test('the actual parameter editor specification helper runs with the server compiler unavailable',()=>{
  const compiler='../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
  try {
    jest.isolateModules(()=>{
      jest.doMock(compiler,()=>{throw new Error('SERVER_COMPILER_REACHED_FROM_CLIENT_EDITOR');});
      expect(()=>require(compiler)).toThrow('SERVER_COMPILER_REACHED_FROM_CLIENT_EDITOR');
      const helper:typeof import('../../src/lib/estimate/backendPlatform/canonicalOrderedSpecificationBindings')=require('../../src/lib/estimate/backendPlatform/canonicalOrderedSpecificationBindings');
      const common={inclusion_ast:{kind:'equals',parameterId:'branch',value:'selected'},resource_graph:{excludeKnownZeroQuantityV1:true,titleSpecificationParameterIds:['dimension','dimension']},source_metadata:{}};
      const bindings=helper.canonicalOrderedSpecificationBindings([
        {...common,row_id:'paid'},
        {...common,row_id:'shared',source_metadata:{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'}},
      ]);
      expect(bindings).toEqual([{rowId:'paid',parameterIds:['dimension'],inclusionAst:common.inclusion_ast}]);
      const manual={paid:{quantity:'2',unitPrice:'10',provenance:{kind:'manual' as const}}};
      expect(helper.canonicalOrderedSpecificationParameterIds(bindings,manual,{branch:'selected'})).toEqual(['dimension']);
      expect(helper.canonicalOrderedSpecificationParameterIds(bindings,manual,{branch:'other'})).toEqual([]);
      expect(helper.canonicalOrderedSpecificationParameterIds(bindings,{paid:{...manual.paid,includedInEstimate:false}},{branch:'selected'})).toEqual([]);
      expect(helper.canonicalOrderedSpecificationParameterIds(bindings,{paid:{...manual.paid,quantity:'0'}},{branch:'selected'})).toEqual([]);
      expect(helper.canonicalOrderedSpecificationParameterIds(bindings,{paid:{...manual.paid,quantity:'unknown'}},{branch:'selected'})).toEqual([]);
      expect(manual.paid).toEqual({quantity:'2',unitPrice:'10',provenance:{kind:'manual'}});
    });
  } finally {jest.dontMock(compiler);}
});
