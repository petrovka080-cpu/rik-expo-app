"""Retry only a rejected incomplete Windows Job PID snapshot; never use it.
The pinned original helper and its ownership/membership checks remain intact.
"""
import time
from owned_launcher_job import OwnedLauncherJob as OriginalOwnedLauncherJob
class OwnedLauncherJob(OriginalOwnedLauncherJob):
 MAX_SNAPSHOT_ATTEMPTS=8
 def pids(self):
  for attempt in range(self.MAX_SNAPSHOT_ATTEMPTS):
   try:return super().pids()
   except AssertionError as error:
    if str(error)!='LAUNCHER_JOB_PID_LIST_INCOMPLETE' or attempt+1==self.MAX_SNAPSHOT_ATTEMPTS:raise
    self.pid_snapshot_retry_count=getattr(self,'pid_snapshot_retry_count',0)+1
    time.sleep(.005)
  raise AssertionError('UNREACHABLE_JOB_PID_SNAPSHOT_RETRY')
