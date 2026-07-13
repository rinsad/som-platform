# SOM Platform Server Demo Users

Last updated: 2026-07-13

These users were confirmed after the latest deploy, business-data reset, reseed, and demo-user email cleanup on the server.

The older `video.*@shell.om` demo emails are no longer the active CAPEX test accounts. Use the role-based emails below instead.

## Common password

- `Test@1234` for:
  - `admin@shell.om`
  - all CAPEX demo users listed below

## Notes

- CAPEX demo users now use role-based emails like `project-owner@shell.om` and `finance-manager@shell.om`.
- `rinsad@gmail.com` remains unchanged because it is not part of the CAPEX reseed set.
- Purchase Request access is granted by role: approver roles can view and decide PRs, requester roles can create PRs, and audit/reference roles are view-only.

## Users

| Email | Full name | Role | Active | PR access | Password note |
| --- | --- | --- | --- | --- | --- |
| `admin@shell.om` | SOM Administrator | Admin | Yes | Full admin | `Test@1234` |
| `rinsad@gmail.com` | Rinsad Ahamed | Employee | Yes | Not part of CAPEX demo reseed | Not changed during reseed |
| `capex.admin@shell.om` | CAPEX Admin | Admin | Yes | Full admin | `Test@1234` |
| `asset-team@shell.om` | Asset Team | Asset Team | Yes | View | `Test@1234` |
| `business-gm@shell.om` | Business GM | Business GM | Yes | View, approve/edit | `Test@1234` |
| `ceo-board@shell.om` | CEO Board | CEO/Board | Yes | View, approve/edit | `Test@1234` |
| `cfo@shell.om` | CFO | CFO | Yes | View, approve/edit | `Test@1234` |
| `cp-lead@shell.om` | CP Lead | CP Lead | Yes | View, approve/edit | `Test@1234` |
| `cp-manager@shell.om` | CP Manager | CP Manager | Yes | View, approve/edit | `Test@1234` |
| `finance-business@shell.om` | Finance in Business | Finance in Business | Yes | View, approve/edit | `Test@1234` |
| `finance-manager@shell.om` | Finance Manager | Finance Manager | Yes | View, approve/edit | `Test@1234` |
| `hsse-focal@shell.om` | HSSE Focal | HSSE Focal | Yes | View, approve/edit | `Test@1234` |
| `internal-audit@shell.om` | Internal Audit | Internal Audit | Yes | View | `Test@1234` |
| `manager@shell.om` | Line Manager | Manager | Yes | View, create, approve/edit | `Test@1234` |
| `project-engineer@shell.om` | Project Engineer | Project Engineer | Yes | View, create | `Test@1234` |
| `project-owner@shell.om` | Project Owner | Project Owner | Yes | View, create, approve/edit | `Test@1234` |
