# Project Structure

```text
apps/
  web/
    app/
      (auth)/login/
      (trader)/dashboard/
      (trader)/deposit/
      (trader)/withdraw/
      (trader)/trade/buy/
      (trader)/trade/sell/
      (admin)/admin/
      (admin)/admin/users/
      (admin)/admin/scenarios/
      (admin)/admin/assignments/
    components/
    lib/
docs/
  prisma-schema-proposal.md
```

The new scaffold is intentionally separate from the existing `frontend/` and `backend/` folders so those files remain untouched while the Next.js simulator takes shape.
