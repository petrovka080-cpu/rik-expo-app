import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

const mockList=jest.fn(),mockEnroll=jest.fn(),mockChallenge=jest.fn(),mockVerify=jest.fn(),mockUnenroll=jest.fn(),mockAlert=jest.fn();
let mockFocusStart:()=>void|(()=>void),mockFocusCleanup:void|(()=>void);
jest.mock('@react-navigation/native',()=>({useFocusEffect:(callback:()=>void|(()=>void))=>{
 const React=require('react');React.useEffect(()=>{mockFocusStart=callback;mockFocusCleanup=callback();return()=>mockFocusCleanup?.();},[callback]);
}}));
jest.mock('react-native',()=>({View:'View',Text:'Text',TextInput:'TextInput',Pressable:'Pressable',ScrollView:'ScrollView',Platform:{OS:'web'},StyleSheet:{create:(x:unknown)=>x},Alert:{alert:(...x:unknown[])=>mockAlert(...x)}}));
jest.mock('react-native-svg',()=>({SvgXml:'SvgXml'}));
jest.mock('../../src/screens/security/SecurityScreen.auth.transport',()=>({
 listSecurityTotpFactors:()=>mockList(),enrollSecurityTotpFactor:()=>mockEnroll(),
 challengeSecurityTotpFactor:(id:string)=>mockChallenge(id),verifySecurityTotpFactor:(x:unknown)=>mockVerify(x),unenrollSecurityTotpFactor:(id:string)=>mockUnenroll(id),
}));
import {SecurityScreen} from '../../src/screens/security/SecurityScreen';
const factor=(id:string,status='verified',factor_type='totp')=>({id,status,factor_type,friendly_name:id});
const factors=(all:ReturnType<typeof factor>[])=>({data:{all},error:null});
const enrollment={data:{id:'new-factor',totp:{qr_code:'<svg>TEST-QR-ONLY</svg>',uri:'otpauth://TEST-ONLY',secret:'TEST-SECRET-ONLY'}},error:null};
const deferred=<T,>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};};
let tree:ReturnType<typeof TestRenderer.create>|undefined;
const button=(id:string)=>tree!.root.findByProps({testID:id});
const text=()=>JSON.stringify(tree!.toJSON());
const mount=async()=>{await act(async()=>{tree=TestRenderer.create(<SecurityScreen/>);});};
const press=async(id:string)=>{await act(async()=>button(id).props.onPress());};
const code=async(value:string)=>{await act(async()=>button('totp-code').props.onChangeText(value));};
beforeEach(()=>{for(const mock of [mockList,mockEnroll,mockChallenge,mockVerify,mockUnenroll,mockAlert])mock.mockReset();mockList.mockResolvedValue(factors([]));mockEnroll.mockResolvedValue(enrollment);mockChallenge.mockResolvedValue({data:{id:'challenge'},error:null});mockVerify.mockResolvedValue({data:{},error:null});mockUnenroll.mockResolvedValue({data:{},error:null});});
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;});

it('loads an existing verified TOTP factor instead of offering a second enrolment',async()=>{
 mockList.mockResolvedValue(factors([factor('phone','verified','phone'),factor('existing')]));await mount();
 expect(text()).toContain('TOTP активен');expect(tree!.root.findAllByProps({testID:'totp-enroll'})).toHaveLength(0);
 await press('totp-unenroll');expect(mockUnenroll).toHaveBeenCalledWith('existing');expect(mockEnroll).not.toHaveBeenCalled();
});
it('does not allow enrolment before the authoritative factor read completes',async()=>{
 const pending=deferred<ReturnType<typeof factors>>();mockList.mockReturnValue(pending.promise);await mount();
 expect(text()).toContain('Проверяю состояние');expect(tree!.root.findAllByProps({testID:'totp-enroll'})).toHaveLength(0);
 await act(async()=>pending.resolve(factors([])));expect(button('totp-enroll')).toBeDefined();
});
it('keeps factor lookup failure separate from no factor and supports retry',async()=>{
 mockList.mockResolvedValueOnce({data:null,error:new Error('lookup failed')}).mockResolvedValueOnce(factors([factor('recovered')]));await mount();
 expect(text()).toContain('lookup failed');expect(tree!.root.findAllByProps({testID:'totp-enroll'})).toHaveLength(0);
 await press('totp-retry');expect(text()).toContain('TOTP активен');expect(mockList).toHaveBeenCalledTimes(2);
});
it('loads an unfinished factor without pretending its old QR or secret can be recovered',async()=>{
 mockList.mockResolvedValue(factors([factor('pending','unverified')]));await mount();
 expect(text()).toContain('Настройка не завершена');expect(text()).not.toContain('TOTP активен');
 await code('123456');await press('totp-verify');expect(mockChallenge).toHaveBeenCalledWith('pending');expect(text()).toContain('TOTP активен');
});
it('clears the enrolment QR URI secret and one-time code after successful verification',async()=>{
 await mount();await press('totp-enroll');expect(text()).toContain('TEST-QR-ONLY');await code('123456');await press('totp-verify');
 expect(mockVerify).toHaveBeenCalledWith({factorId:'new-factor',challengeId:'challenge',code:'123456'});
 expect(text()).not.toContain('TEST-QR-ONLY');expect(text()).not.toContain('TEST-SECRET-ONLY');expect(text()).not.toContain('otpauth://TEST-ONLY');expect(button('totp-code').props.value).toBe('');expect(text()).toContain('TOTP активен');
});
it('retains an unverified enrolment on failed verification so the user can retry',async()=>{
 mockVerify.mockResolvedValue({data:null,error:new Error('invalid code')});await mount();await press('totp-enroll');await code('123456');await press('totp-verify');
 expect(text()).toContain('TEST-QR-ONLY');expect(text()).not.toContain('TOTP активен');expect(mockAlert).toHaveBeenLastCalledWith('Не удалось подтвердить код','invalid code');
});
it('requires exactly six decimal digits before creating a challenge',async()=>{
 mockList.mockResolvedValue(factors([factor('existing')]));await mount();
 for(const value of ['12345','1234567','abcdef']){await code(value);await press('totp-verify');}
 expect(mockChallenge).not.toHaveBeenCalled();
});
it('deduplicates rapid enrolment requests before the next render',async()=>{
 const pending=deferred<typeof enrollment>();mockEnroll.mockReturnValue(pending.promise);await mount();const invoke=button('totp-enroll').props.onPress;
 await act(async()=>{void invoke();void invoke();});expect(mockEnroll).toHaveBeenCalledTimes(1);
 await act(async()=>pending.resolve(enrollment));expect(button('totp-code')).toBeDefined();
});
it('keeps the remaining verified factor selected after removing one of several factors',async()=>{
 mockList.mockResolvedValue(factors([factor('a'),factor('b')]));await mount();await press('totp-unenroll');expect(mockUnenroll).toHaveBeenCalledWith('a');expect(text()).toContain('TOTP активен');
 await press('totp-unenroll');expect(mockUnenroll).toHaveBeenLastCalledWith('b');expect(button('totp-enroll')).toBeDefined();
});
it('retains active factor state when the server rejects unenrolment',async()=>{
 mockList.mockResolvedValue(factors([factor('a')]));mockUnenroll.mockResolvedValue({data:null,error:new Error('AAL2 required')});await mount();await press('totp-unenroll');
 expect(text()).toContain('TOTP активен');expect(mockAlert).toHaveBeenLastCalledWith('Не удалось отключить TOTP','AAL2 required');
});
it('ignores an enrolment response after screen exit and reloads factor state on remount',async()=>{
 const pending=deferred<typeof enrollment>();mockEnroll.mockReturnValue(pending.promise);await mount();await act(async()=>{void button('totp-enroll').props.onPress();});
 await act(async()=>tree!.unmount());tree=undefined;await act(async()=>pending.resolve(enrollment));expect(mockAlert).not.toHaveBeenCalled();
 mockList.mockResolvedValue(factors([factor('new-factor')]));await mount();expect(text()).toContain('TOTP активен');expect(text()).not.toContain('TEST-QR-ONLY');
});

it('clears setup secrets on blur and reloads authoritative factors when the mounted screen regains focus',async()=>{
 await mount();await press('totp-enroll');expect(text()).toContain('TEST-QR-ONLY');
 await act(async()=>mockFocusCleanup?.());expect(text()).not.toContain('TEST-QR-ONLY');expect(text()).not.toContain('TEST-SECRET-ONLY');
 mockList.mockResolvedValue(factors([factor('new-factor')]));await act(async()=>{mockFocusCleanup=mockFocusStart();});
 expect(mockList).toHaveBeenCalledTimes(2);expect(text()).toContain('TOTP активен');
});

it('does not let a late enrolment response on an old focus restore a secret or release a new action lock',async()=>{
 const old=deferred<typeof enrollment>(),next=deferred<typeof enrollment>();mockEnroll.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
 await mount();await act(async()=>{void button('totp-enroll').props.onPress();});await act(async()=>mockFocusCleanup?.());
 await act(async()=>{mockFocusCleanup=mockFocusStart();});await act(async()=>{void button('totp-enroll').props.onPress();});
 await act(async()=>old.resolve(enrollment));expect(text()).not.toContain('TEST-QR-ONLY');expect(mockAlert).not.toHaveBeenCalled();
 expect(button('totp-enroll').props.disabled).toBe(true);expect(mockEnroll).toHaveBeenCalledTimes(2);
 await act(async()=>next.resolve(enrollment));expect(text()).toContain('TEST-QR-ONLY');
});
