-- SOM Platform: CAPEX longer free-text payment terms
-- The CAPEX request and quotation forms allow realistic business terms that
-- exceed 50 characters, so widen these columns to avoid 500s on submit.

ALTER TABLE capex_requests
  ALTER COLUMN payment_terms TYPE VARCHAR(255);

ALTER TABLE capex_supplier_quotations
  ALTER COLUMN payment_terms TYPE VARCHAR(255);
