# CAPEX v2 Implementation Guide

CAPEX v2 is an additive pilot implementation under `/api/capex/v2` and `/capex-v2`. The legacy `/api/capex` and `/capex` surfaces remain available during the pilot.

## Control boundaries

- SAP SAC remains the annual planning and Board-approved budget source.
- GSAP remains the source for PO, actual, AUC, and asset extracts.
- CAPEX v2 stores staged import rows, validation results, posting lineage, immutable ledger entries, workflow evidence, and decisions.
- No business unit, cost centre, CAPEX category, or monetary approval chain is seeded by migration 031.
- Mandatory HSSE/Worker Welfare screening is the fixed first gate. Later approval steps come only from an activated workflow version backed by a signed artifact, business sign-off, explicit effective date, and successful named-assignee simulation for every active rule.
- Pilot workflows write `authority_mode=PILOT`. A `BINDING` workflow cannot be activated unless `CAPEX_V2_SSO_READY=true`.

## Runtime configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `CAPEX_V2_ENABLED` | enabled | Set to `false` to disable the v2 API while leaving legacy CAPEX available. |
| `CAPEX_V2_SSO_READY` | `false` | Allows activation of binding workflow versions only after production identity controls are ready. |
| `CAPEX_V2_DOCUMENT_ROOT` | `backend/storage/capex-v2` from the backend working directory | Local pilot document-provider root. Production should supply a Shell-approved provider. |
| `CAPEX_V2_MAX_DOCUMENT_BYTES` | `26214400` | Per-document upload limit. |
| `CAPEX_V2_MALWARE_SCAN_MODE` | disabled | When `enabled`, new files remain `PENDING` for an external scanner integration. |

Run `npm run migrate` from `backend/` to create the isolated `capex_v2` schema.

The pilot rollback is the feature flag: set `CAPEX_V2_ENABLED=false` and keep legacy CAPEX operational. A destructive schema rollback exists at `backend/src/database/rollbacks/031_capex_v2_foundation.sql` for isolated test/pilot teardown only; its SQL is verified inside a rolled-back test transaction.

## Approved budget CSV

The controlled SAC import accepts these headers:

```csv
business_function,external_project_reference,description,amount,currency,source_date
```

`business_function` must match an active name in the approved v2 Business Unit / Function master. No separate code is required. Cost centre is not part of the approved-budget import contract unless Shell confirms an authoritative mapping later. Legacy pilot files using `business_function_code` or `organization_code` remain accepted during transition. Amounts use OMR with no more than three decimal places. A batch must validate with zero invalid rows before posting. Posting creates a new budget version, allocations, and baseline ledger entries; it never updates the prior baseline in place.

## Access assignments

V2 access is derived server-side from effective-dated `user_scope_assignments`:

- `PORTFOLIO`: all authorized CAPEX v2 records.
- `BUSINESS_UNIT`: records in the assigned organization.
- `OWN`: requests owned by the user, anchored to an assigned organization for creation.
- `ASSIGNED`: workflow steps assigned to the user.

Capabilities are explicit strings on each assignment. Portfolio-wide configuration, imports, approvals, and executive dashboards require the capability on a `PORTFOLIO` assignment; a similarly named BU capability does not grant portfolio access. Phase 1 uses:

- `master-data:manage`
- `workflow:manage`
- `budget:view`
- `budget:manage`
- `budget:approve`
- `budget:transfer:create`
- `dashboard:bu`
- `dashboard:portfolio`
- `request:create`

Until Shell provides and signs the authoritative role-permission matrix, the CAPEX configuration UI does not expose user-role, access-scope, or capability entry. User Management is the single administration surface for identity, platform role, Department, and the separate CAPEX Business / Function anchor. Saving that anchor creates a fail-closed internal `OWN` assignment with no elevated capabilities. Broader scopes and capabilities must not be configured interactively from inferred job titles.

Administrators have pilot access to configuration, but approval decisions still require the named step assignee.

## Pilot setup order

1. Load the authoritative organization master. Cost-centre and CAPEX-category masters remain outside requester entry until their authoritative contracts are confirmed.
2. Assign each pilot user to the approved Business / Function in User Management. Load broader effective-dated role scopes and capabilities only after the signed role-permission matrix is available.
3. Create the CAPEX request workflow definition.
4. Create a draft version from the signed MOA, including explicit value/quotation rules and post-HSSE approver roles.
5. Use route simulation to confirm one named assignee resolves for every step and record at least one successful simulation for every active rule.
6. Activate the version with its signed artifact reference, business sign-off reference, and explicit effective date. Activation and its audit event commit atomically.
7. Create a fiscal cycle, stage the SAC CSV, validate, reconcile, and post it.
8. Pilot request creation, evidence upload, quotations, HSSE screening, MOA approval, and project creation.

Drafts require only the core request identity and description. A budget allocation populated from the controlled SAC import, project evidence, complete quotations, and supplier selection are enforced at submission. A single matching allocation is selected automatically; multiple matches require an explicit selection. A returned request reopens requester-owned fields, urgency, documents, and quotations; quotation changes are rejected while the request is under review.

Fabricated legacy/demo records are not migrated. Migration tooling must populate `capex_v2.migration_map` only for source-verified records.
