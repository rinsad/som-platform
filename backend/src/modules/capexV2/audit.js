const { randomUUID } = require('crypto');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function databaseUserId(user) {
  return typeof user?.id === 'string' && UUID_RE.test(user.id) ? user.id : null;
}

function correlationId(req) {
  const supplied = req?.headers?.['x-correlation-id'];
  return typeof supplied === 'string' && UUID_RE.test(supplied) ? supplied : randomUUID();
}

async function recordAudit(client, {
  req,
  eventType,
  entityType,
  entityId = null,
  organizationUnitId = null,
  authorityMode = null,
  beforeState = null,
  afterState = null,
  metadata = {},
}) {
  const id = correlationId(req);
  await client.query(
    `INSERT INTO capex_v2.audit_events
       (correlation_id, event_type, entity_type, entity_id, actor_user_id, actor_role,
        authority_mode, organization_unit_id, before_state, after_state, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb)`,
    [
      id,
      eventType,
      entityType,
      entityId,
      databaseUserId(req?.user),
      req?.user?.role || null,
      authorityMode,
      organizationUnitId,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      JSON.stringify(metadata),
    ]
  );
  return id;
}

module.exports = { recordAudit, databaseUserId, correlationId, UUID_RE };

