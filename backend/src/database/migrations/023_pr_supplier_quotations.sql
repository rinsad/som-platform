-- Consolidate purchase-request supplier rows and quote attachments.

CREATE TABLE IF NOT EXISTS pr_supplier_quotations (
  id                         VARCHAR(40) PRIMARY KEY,
  pr_id                      VARCHAR(30) NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  supplier_name              VARCHAR(200) NOT NULL,
  quote_amount_omr           NUMERIC(14,2) NOT NULL CHECK (quote_amount_omr > 0),
  document_id                VARCHAR(30) REFERENCES pr_documents(id) ON DELETE SET NULL,
  is_selected                BOOLEAN NOT NULL DEFAULT false,
  legacy_attachment_exempt   BOOLEAN NOT NULL DEFAULT false,
  created_by                 VARCHAR(200),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_supplier_quotations_pr_id
  ON pr_supplier_quotations(pr_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pr_supplier_quotations_selected
  ON pr_supplier_quotations(pr_id)
  WHERE is_selected = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pr_supplier_quotations_active_supplier
  ON pr_supplier_quotations(pr_id, lower(supplier_name));

WITH supplier_rows AS (
  SELECT
    pr.id AS pr_id,
    supplier.elem,
    supplier.ordinality,
    pr.selected_supplier,
    COUNT(*) OVER (PARTITION BY pr.id) AS supplier_count,
    COUNT(doc.id) FILTER (WHERE doc.type = 'Quote') OVER (PARTITION BY pr.id) AS quote_doc_count,
    doc.id AS document_id
  FROM purchase_requests pr
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pr.suppliers, '[]'::jsonb)) WITH ORDINALITY AS supplier(elem, ordinality)
  LEFT JOIN LATERAL (
    SELECT d.id, d.type
    FROM pr_documents d
    WHERE d.pr_id = pr.id
      AND d.type = 'Quote'
    ORDER BY d.uploaded_at, d.id
    OFFSET supplier.ordinality - 1
    LIMIT 1
  ) doc ON true
  WHERE supplier.elem ? 'name'
    AND NULLIF(trim(supplier.elem->>'name'), '') IS NOT NULL
    AND NULLIF(supplier.elem->>'quoteAmount', '') IS NOT NULL
)
INSERT INTO pr_supplier_quotations (
  id,
  pr_id,
  supplier_name,
  quote_amount_omr,
  document_id,
  is_selected,
  legacy_attachment_exempt,
  created_by
)
SELECT
  'QTN-' || pr_id || '-' || lpad(ordinality::text, 2, '0'),
  pr_id,
  trim(elem->>'name'),
  (elem->>'quoteAmount')::numeric,
  CASE WHEN supplier_count = quote_doc_count THEN document_id ELSE NULL END,
  COALESCE(trim(elem->>'name') = selected_supplier, false),
  CASE WHEN supplier_count = quote_doc_count THEN false ELSE true END,
  'System migration'
FROM supplier_rows
WHERE (elem->>'quoteAmount') ~ '^[0-9]+(\.[0-9]+)?$'
ON CONFLICT (id) DO NOTHING;

UPDATE purchase_requests pr
SET quote_count = q.quote_count,
    requires_justification = q.quote_count < 3
FROM (
  SELECT pr_id, COUNT(*)::int AS quote_count
  FROM pr_supplier_quotations
  WHERE document_id IS NOT NULL OR legacy_attachment_exempt = true
  GROUP BY pr_id
) q
WHERE pr.id = q.pr_id;
