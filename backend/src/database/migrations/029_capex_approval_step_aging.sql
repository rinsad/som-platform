-- Track when each approval step became active so calendar-day aging is stable
-- across delegation, escalation, and application restarts.
ALTER TABLE capex_approval_steps
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

WITH ordered_steps AS (
  SELECT
    s.id,
    s.status,
    r.current_step_id,
    COALESCE(
      LAG(s.decided_at) OVER (PARTITION BY s.request_id ORDER BY s.step_order),
      r.submitted_at,
      r.created_at
    ) AS inferred_started_at
  FROM capex_approval_steps s
  JOIN capex_requests r ON r.id = s.request_id
)
UPDATE capex_approval_steps s
SET started_at = ordered_steps.inferred_started_at
FROM ordered_steps
WHERE s.id = ordered_steps.id
  AND s.started_at IS NULL
  AND (ordered_steps.status <> 'Pending' OR ordered_steps.id = ordered_steps.current_step_id);

CREATE INDEX IF NOT EXISTS idx_capex_approval_steps_pending_age
  ON capex_approval_steps(request_id, started_at)
  WHERE status = 'Pending';
