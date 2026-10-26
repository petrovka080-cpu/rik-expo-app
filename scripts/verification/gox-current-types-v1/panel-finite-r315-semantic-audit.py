if True:
 counts=read(raw/'final-actual-counters.json');observed['actualCounters']=counts
 expected={'actualCoreBegin':13,'actualCoreCompleted':13,'RESULT':9,'REJECT':4,'verifyCoreCalls':1};assert {k:counts[k] for k in expected}==expected
 jest=read(D/'02-config-and-finite13/actual-jest.json');assert jest['success'] is True and jest['numPassedTests']==1 and jest['numFailedTests']==0
 assert len(jest['testResults'])==1 and Path(jest['testResults'][0]['name'])==S/p['entry']
 before=read(raw/'ordinary-config-constructed-before-core.json');assert before['shape']==[38,121,121] and before['actualCoreBegin']==0
 fx=read(S/'data/estimate-benchmarks/fixtures/panel-ready-grid-whole-post-independent-r287.json');pack=read(S/'data/estimate-benchmarks/source-packs/panel-ready-grid-whole-post-project-r287.json');prefix=pack['prefix']+':'
 payable={pack['retainedFactory']['ownerRowId'],pack['retainedToolPost']['ownerRowId'],*[prefix+x for x in fx['newPaidOwnerSuffixes']]};proc={pack['retainedFactory']['ownerRowId'],*[prefix+x for x in fx['newProcurementOwnerSuffixes']]};audited=[]
 expected_files={'actual-core-'+e['id']+'.json' for e in fx['entries']};actual_files={f.name for f in raw.glob('actual-core-*.json') if f.name!='actual-core-entry-counter.json'};assert actual_files==expected_files
 for e in fx['entries']:
  path=raw/('actual-core-'+e['id']+'.json');v=read(path)
  if e.get('rejectCode'):assert v['kind']=='REJECT' and v['code']==e['rejectCode']
  else:
   assert v['kind']=='RESULT';r=v['value'];rows=r['rows'];needs=r['preliminaryNeeds'];ids=[x['row_id'] for x in rows+needs];assert len(ids)==len(set(ids))
   if e['mode'] not in ['legacy','retained','zero']:
    for x in rows:
     if x['row_id'] not in payable:assert x['included_in_estimate'] is False
     if x['row_id'] not in proc:assert x['included_in_procurement'] is False
    for old in fx['protectedOldNeedIds']:assert any(x['row_id']==old and 'amount' not in x for x in needs)
    if e['mode']=='missing':
     target=prefix+e['expectedNeedSuffix'];matches=[x for x in needs if x['row_id']==target];assert len(matches)==1 and not any(x['row_id']==target for x in rows);n=matches[0]
     assert n['quantity']==e['expectedNeedQuantity'] and n['need_state']==e['expectedNeedState'] and n['unit_price'] is None and 'amount' not in n and n['missing_parameter_ids']==e['remove']
    else:
     assert r['totals']['amount']==e['expectedTotal']=='5300'
     for rid,qty in fx['expectedQualifiedQuantities'].items():assert len([x for x in rows if x['row_id']==rid and x['quantity']==qty])==1
     assert sum((Decimal(x['amount']) for x in rows if x['included_in_estimate'] and x['amount'] is not None),Decimal(0))==Decimal('5300')
     for suffix in ['mount-included','connection-included','readiness-included','qa-included','completion-included','measured-panels']:
      owner=next(x for x in rows if x['row_id']==prefix+suffix);assert owner['included_in_estimate'] is False and owner['included_in_procurement'] is False
  audited.append({'id':e['id'],'kind':v['kind'],'raw':ref(path)})
 proof=raw/'INDEPENDENT_BOUNDED_RAW13_PROOF_R315.json';save(proof,{'status':'PASS_ALL13_EXACT_IDS_OWNERS_KNOWN_VS_UNKNOWN_TEST_ONLY','cases':audited,'counts':counts,'knownTotalTestOnly':'5300','protectedNeedCount':17,'sourceApproval':False,'PPR':'HOLD','quoteScope':'HOLD','publication':0,'FULL':False});observed['independentRawProof']=ref(proof);observed['status']='PASS_ACTUAL_PANEL_ORDINARY_CONFIG_FINITE13_TEST_ONLY'
