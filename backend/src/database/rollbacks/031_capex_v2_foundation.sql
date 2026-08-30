-- CAPEX v2 pilot rollback only.
-- This removes the isolated v2 schema and all of its data. Never run it after
-- production cutover without an approved retention/export procedure.
DROP SCHEMA IF EXISTS capex_v2 CASCADE;
