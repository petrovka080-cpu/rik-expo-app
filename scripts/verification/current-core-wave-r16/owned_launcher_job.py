"""An unnamed Windows job owns only suspended sole-launcher children.

Child inheritance and no breakaway flags retain detached backend ownership.
PostgreSQL is deliberately outside this job and receives its normal smart stop.
Docs: https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects
"""
import ctypes
from ctypes import wintypes as w
kernel=ctypes.WinDLL('kernel32',use_last_error=True)
def signature(name,args,result):
 fn=getattr(kernel,name);fn.argtypes=args;fn.restype=result;return fn
close=signature('CloseHandle',[w.HANDLE],w.BOOL)
create=signature('CreateJobObjectW',[ctypes.c_void_p,w.LPCWSTR],w.HANDLE)
set_info=signature('SetInformationJobObject',[w.HANDLE,ctypes.c_int,ctypes.c_void_p,w.DWORD],w.BOOL)
query=signature('QueryInformationJobObject',[w.HANDLE,ctypes.c_int,ctypes.c_void_p,w.DWORD,ctypes.POINTER(w.DWORD)],w.BOOL)
open_process=signature('OpenProcess',[w.DWORD,w.BOOL,w.DWORD],w.HANDLE)
assign=signature('AssignProcessToJobObject',[w.HANDLE,w.HANDLE],w.BOOL)
terminate=signature('TerminateJobObject',[w.HANDLE,w.UINT],w.BOOL)
in_job=signature('IsProcessInJob',[w.HANDLE,w.HANDLE,ctypes.POINTER(w.BOOL)],w.BOOL)
snapshot=signature('CreateToolhelp32Snapshot',[w.DWORD,w.DWORD],w.HANDLE)
open_thread=signature('OpenThread',[w.DWORD,w.BOOL,w.DWORD],w.HANDLE)
resume_thread=signature('ResumeThread',[w.HANDLE],w.DWORD)
class BasicLimits(ctypes.Structure):
 _fields_=[('PerProcessUserTimeLimit',ctypes.c_longlong),('PerJobUserTimeLimit',ctypes.c_longlong),('LimitFlags',w.DWORD),('MinimumWorkingSetSize',ctypes.c_size_t),('MaximumWorkingSetSize',ctypes.c_size_t),('ActiveProcessLimit',w.DWORD),('Affinity',ctypes.c_size_t),('PriorityClass',w.DWORD),('SchedulingClass',w.DWORD)]
class IoCounters(ctypes.Structure):
 _fields_=[(key,ctypes.c_ulonglong) for key in ['ReadOperationCount','WriteOperationCount','OtherOperationCount','ReadTransferCount','WriteTransferCount','OtherTransferCount']]
class ExtendedLimits(ctypes.Structure):
 _fields_=[('BasicLimitInformation',BasicLimits),('IoInfo',IoCounters),('ProcessMemoryLimit',ctypes.c_size_t),('JobMemoryLimit',ctypes.c_size_t),('PeakProcessMemoryUsed',ctypes.c_size_t),('PeakJobMemoryUsed',ctypes.c_size_t)]
class ThreadEntry(ctypes.Structure):
 _fields_=[('dwSize',w.DWORD),('cntUsage',w.DWORD),('th32ThreadID',w.DWORD),('th32OwnerProcessID',w.DWORD),('tpBasePri',w.LONG),('tpDeltaPri',w.LONG),('dwFlags',w.DWORD)]
thread_first=signature('Thread32First',[w.HANDLE,ctypes.POINTER(ThreadEntry)],w.BOOL)
thread_next=signature('Thread32Next',[w.HANDLE,ctypes.POINTER(ThreadEntry)],w.BOOL)
class OwnedLauncherJob:
 def __init__(self):
  self.handle=create(None,None)
  if not self.handle:raise ctypes.WinError(ctypes.get_last_error())
  limits=ExtendedLimits();limits.BasicLimitInformation.LimitFlags=0x2000 # KILL_ON_JOB_CLOSE; no breakaway flags
  if not set_info(self.handle,9,ctypes.byref(limits),ctypes.sizeof(limits)):
   error=ctypes.WinError(ctypes.get_last_error());self.close();raise error
 def pids(self):
  assert self.handle
  capacity=4096;buffer=ctypes.create_string_buffer(8+capacity*ctypes.sizeof(ctypes.c_size_t));returned=w.DWORD()
  if not query(self.handle,3,buffer,len(buffer),ctypes.byref(returned)):raise ctypes.WinError(ctypes.get_last_error())
  assigned=w.DWORD.from_buffer(buffer,0).value;listed=w.DWORD.from_buffer(buffer,4).value
  assert assigned==listed and listed<=capacity,'LAUNCHER_JOB_PID_LIST_INCOMPLETE'
  return list((ctypes.c_size_t*listed).from_buffer(buffer,8))
 def assign_and_resume_suspended(self,process):
  assert process.poll() is None
  handle=open_process(0x0100|0x0001|0x1000,False,process.pid)
  if not handle:raise ctypes.WinError(ctypes.get_last_error())
  try:
   if not assign(self.handle,handle):raise ctypes.WinError(ctypes.get_last_error())
   member=w.BOOL()
   if not in_job(handle,self.handle,ctypes.byref(member)):raise ctypes.WinError(ctypes.get_last_error())
   assert member.value and process.pid in self.pids(),'SUSPENDED_LAUNCHER_JOB_MEMBERSHIP_REQUIRED'
  finally:close(handle)
  threads=[];shot=snapshot(0x00000004,0)
  if shot==ctypes.c_void_p(-1).value:raise ctypes.WinError(ctypes.get_last_error())
  try:
   entry=ThreadEntry();entry.dwSize=ctypes.sizeof(entry);found=thread_first(shot,ctypes.byref(entry))
   while found:
    if entry.th32OwnerProcessID==process.pid:threads.append(entry.th32ThreadID)
    found=thread_next(shot,ctypes.byref(entry))
   if ctypes.get_last_error()!=18:raise ctypes.WinError(ctypes.get_last_error()) # NO_MORE_FILES
  finally:close(shot)
  assert len(threads)==1,'ONE_INITIAL_SUSPENDED_THREAD_REQUIRED'
  thread=open_thread(0x0002,False,threads[0])
  if not thread:raise ctypes.WinError(ctypes.get_last_error())
  try:
   previous=resume_thread(thread)
   if previous==0xffffffff:raise ctypes.WinError(ctypes.get_last_error())
   assert previous==1,'UNEXPECTED_SUSPEND_COUNT'
  finally:close(thread)
 def close(self):
  if getattr(self,'handle',None):
   handle=self.handle;self.handle=None
   if not close(handle):raise ctypes.WinError(ctypes.get_last_error())
 def terminate(self):
  assert self.handle
  if not terminate(self.handle,0xD174):raise ctypes.WinError(ctypes.get_last_error())
