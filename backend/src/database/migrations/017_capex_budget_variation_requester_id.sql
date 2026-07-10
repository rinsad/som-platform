-- Budget-variation self-approval was enforced by comparing display names,
-- which two users sharing a name (or a renamed account) could defeat. Record
-- the requester's user id so the decision endpoint can compare by identity.
ALTER TABLE capex_budget_variations
  ADD COLUMN IF NOT EXISTS requested_by_id UUID;
