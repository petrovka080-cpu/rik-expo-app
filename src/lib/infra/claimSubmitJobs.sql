UPDATE submit_jobs
SET
  status = 'processing',
  started_at = now(),
  worker_id = $1,
  locked_until = now() + interval '5 minutes'
WHERE id IN (
  SELECT id
  FROM (
    SELECT DISTINCT ON (COALESCE(entity_key, id::text))
      id,
      created_at
    FROM submit_jobs
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY COALESCE(entity_key, id::text), created_at
  ) q
  ORDER BY created_at
  LIMIT $2
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
