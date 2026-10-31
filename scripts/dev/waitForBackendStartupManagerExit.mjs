export function waitForBackendStartupManagerExit(runtime = process) {
  const managerPid = Number(runtime.env.LOCAL_DEVELOPER_BACKEND_STARTUP_MANAGER_PID);
  delete runtime.env.LOCAL_DEVELOPER_BACKEND_STARTUP_MANAGER_PID;
  if (!Number.isSafeInteger(managerPid) || managerPid <= 0
    || managerPid === runtime.pid || managerPid !== runtime.ppid) {
    throw new Error('BACKEND_STARTUP_MANAGER_PID_INVALID');
  }
  if (typeof runtime.send !== 'function') throw new Error('BACKEND_STARTUP_MANAGER_IPC_REQUIRED');
  if (!runtime.connected) return Promise.resolve();
  // IPC closes when the launching manager exits. Unlike a PID probe, this
  // also works when a Windows job still retains the exited process object.
  return new Promise((resolve, reject) => {
    const disconnected = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(() => {
      runtime.removeListener('disconnect', disconnected);
      reject(new Error('BACKEND_STARTUP_MANAGER_EXIT_TIMEOUT'));
    }, 5000);
    runtime.once('disconnect', disconnected);
    if (!runtime.connected) {
      runtime.removeListener('disconnect', disconnected);
      disconnected();
    }
  });
}

if (process.env.LOCAL_DEVELOPER_BACKEND_STARTUP_MANAGER_PID) {
  await waitForBackendStartupManagerExit();
}
