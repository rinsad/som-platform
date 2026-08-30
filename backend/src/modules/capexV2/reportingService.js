const { requestScopePredicate } = require('./access');
const { databaseUserId } = require('./audit');

async function getDashboard(client, context, view, user) {
  const scope = requestScopePredicate(context, { startIndex: 1 });
  const requestParams = [...scope.params];
  const actorId = databaseUserId(user);

  const requests = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status='DRAFT')::int AS drafts,
              COUNT(*) FILTER (WHERE status='RETURNED')::int AS returned,
              COUNT(*) FILTER (WHERE status='IN_REVIEW')::int AS "inReview",
              COUNT(*) FILTER (WHERE status='APPROVED')::int AS approved,
              COUNT(*) FILTER (WHERE urgent=TRUE AND status NOT IN ('APPROVED','REJECTED','WITHDRAWN'))::int AS urgent
         FROM capex_v2.requests r WHERE ${scope.sql}`,
      requestParams
    );
  const approvals = actorId
      ? await client.query(
          `SELECT COUNT(*)::int AS pending,
                  COALESCE(MAX(EXTRACT(DAY FROM NOW()-started_at)),0)::int AS "oldestPendingDays"
             FROM capex_v2.workflow_instance_steps WHERE assigned_user_id=$1 AND status='PENDING'`,
          [actorId]
        )
      : { rows: [{ pending: 0, oldestPendingDays: 0 }] };
  const financials = await client.query(
      `SELECT COALESCE((
                SELECT SUM(original_entry.amount)
                  FROM capex_v2.budget_ledger_entries original_entry
                  JOIN capex_v2.budget_allocations original_allocation ON original_allocation.id=original_entry.allocation_id
                  JOIN capex_v2.budget_versions original_version ON original_version.id=original_allocation.budget_version_id
                 WHERE original_version.version_number=1 AND original_entry.entry_type='BASELINE'
                   AND ($1::uuid[] IS NULL OR original_allocation.organization_unit_id=ANY($1::uuid[]))
              ),0)::text AS "originalBudget",
              COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')),0)::text AS "authorizedBudget",
              COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('COMMITMENT','COMMITMENT_REVERSAL')),0)::text AS commitments,
              COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('ACTUAL','ACTUAL_REVERSAL')),0)::text AS actuals,
              COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type='FORECAST'),0)::text AS forecast,
              (COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')),0)
               - COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type='FORECAST'),0))::text AS variance,
              (COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION')),0)
               - COALESCE(SUM(l.amount) FILTER (WHERE l.entry_type IN ('COMMITMENT','COMMITMENT_REVERSAL','ACTUAL','ACTUAL_REVERSAL')),0))::text AS available
         FROM capex_v2.budget_ledger_entries l
         LEFT JOIN capex_v2.budget_allocations a ON a.id=l.allocation_id
         LEFT JOIN capex_v2.budget_versions v ON v.id=a.budget_version_id
        WHERE (
          ($1::uuid[] IS NULL AND (a.id IS NULL OR v.status='POSTED'))
          OR ($1::uuid[] IS NOT NULL AND a.organization_unit_id=ANY($1::uuid[]) AND v.status='POSTED')
        )`,
      [
        context.isAdmin || context.scopes.some((item) => item.type === 'PORTFOLIO')
          ? null
          : context.scopes.filter((item) => item.organizationUnitId).map((item) => item.organizationUnitId),
      ]
    );
  const organizations = await client.query(
      `SELECT o.id, o.name,
              (SELECT COUNT(*)::int FROM capex_v2.requests r
                WHERE r.organization_unit_id=o.id AND ${scope.sql}) AS requests,
              COALESCE((
                SELECT SUM(l.amount) FILTER (WHERE l.entry_type IN ('BASELINE','TRANSFER_IN','TRANSFER_OUT','CORRECTION'))
                  FROM capex_v2.budget_allocations a
                  JOIN capex_v2.budget_versions v ON v.id=a.budget_version_id AND v.status='POSTED'
                  LEFT JOIN capex_v2.budget_ledger_entries l ON l.allocation_id=a.id
                 WHERE a.organization_unit_id=o.id
              ),0)::text AS budget,
              COALESCE((
                SELECT SUM(l.amount) FILTER (WHERE l.entry_type IN ('ACTUAL','ACTUAL_REVERSAL'))
                  FROM capex_v2.budget_allocations a
                  JOIN capex_v2.budget_versions v ON v.id=a.budget_version_id AND v.status='POSTED'
                  LEFT JOIN capex_v2.budget_ledger_entries l ON l.allocation_id=a.id
                 WHERE a.organization_unit_id=o.id
              ),0)::text AS actuals
         FROM capex_v2.organization_units o
        WHERE o.is_active=TRUE
          AND ($${requestParams.length + 1}::uuid[] IS NULL OR o.id=ANY($${requestParams.length + 1}::uuid[]))
        ORDER BY o.name`,
      [
        ...requestParams,
        context.isAdmin || context.scopes.some((item) => item.type === 'PORTFOLIO')
          ? null
          : context.scopes.filter((item) => item.organizationUnitId).map((item) => item.organizationUnitId),
      ]
    );
  const recent = await client.query(
      `SELECT r.id, r.request_number AS "requestNumber", r.title, r.status, r.urgent,
              r.estimated_value::text AS "estimatedValue", o.name AS "organizationName",
              r.updated_at AS "updatedAt"
         FROM capex_v2.requests r
         JOIN capex_v2.organization_units o ON o.id=r.organization_unit_id
        WHERE ${scope.sql}
        ORDER BY r.updated_at DESC LIMIT 8`,
      requestParams
    );

  return {
    view,
    authorityNotice: process.env.CAPEX_V2_SSO_READY === 'true'
      ? 'Production identity controls enabled'
      : 'Pilot mode — approvals are not yet production-authoritative',
    requests: requests.rows[0],
    approvals: approvals.rows[0],
    financials: financials.rows[0],
    organizations: organizations.rows,
    recentRequests: recent.rows,
  };
}

module.exports = { getDashboard };
