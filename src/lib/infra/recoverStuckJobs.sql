UPDATE submit_jobs
SET
  status = 'pending',
  worker_id = NULL,
  locked_until = NULL
WHERE
  status = 'processing'
  AND locked_until < now();
