const { HttpError } = require('./http');
const { databaseUserId } = require('./audit');
const { assertRequestAccess } = require('./requestService');

async function attachDocument(client, storage, {
  requestId,
  quotationId = null,
  documentKind,
  supersedesDocumentId = null,
  changeNote = null,
  file,
  user,
  context,
}) {
  if (!file?.buffer?.length) throw new HttpError(400, 'DOCUMENT_REQUIRED', 'Choose a document to upload');
  const request = await assertRequestAccess(client, requestId, context);
  const actorId = databaseUserId(user);
  if (!context.isAdmin && request.ownerUserId !== actorId) {
    throw new HttpError(403, 'REQUEST_OWNER_REQUIRED', 'Only the requester may upload evidence');
  }
  if (!['DRAFT', 'RETURNED'].includes(request.status)) {
    throw new HttpError(409, 'DOCUMENTS_LOCKED', 'Request evidence is locked while the request is under review');
  }

  let entityType = 'REQUEST';
  let entityId = requestId;
  if (quotationId) {
    const { rowCount } = await client.query(
      `SELECT 1 FROM capex_v2.quotations WHERE id=$1 AND request_id=$2`,
      [quotationId, requestId]
    );
    if (!rowCount) throw new HttpError(404, 'QUOTATION_NOT_FOUND', 'Quotation not found on this request');
    entityType = 'QUOTATION';
    entityId = quotationId;
  }

  const stored = await storage.put(file.buffer);
  await client.query('BEGIN');
  try {
    const { rows: [document] } = await client.query(
      `INSERT INTO capex_v2.documents
         (storage_provider, storage_key, original_filename, media_type, byte_size,
          sha256, scan_status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, original_filename AS "filename", media_type AS "mediaType",
                 byte_size AS "byteSize", sha256, scan_status AS "scanStatus",
                 created_at AS "createdAt"`,
      [
        stored.provider,
        stored.key,
        file.originalname,
        file.mimetype || 'application/octet-stream',
        stored.byteSize,
        stored.sha256,
        process.env.CAPEX_V2_MALWARE_SCAN_MODE === 'enabled' ? 'PENDING' : 'NOT_CONFIGURED',
        actorId,
      ]
    );

    let versionNumber = 1;
    if (supersedesDocumentId) {
      const { rows: [previous] } = await client.query(
        `SELECT dv.version_number
           FROM capex_v2.document_versions dv
           JOIN capex_v2.entity_documents ed ON ed.document_id=dv.document_id
          WHERE dv.document_id=$1 AND ed.entity_type=$2 AND ed.entity_id=$3 AND ed.is_current=TRUE`,
        [supersedesDocumentId, entityType, entityId]
      );
      if (!previous) throw new HttpError(404, 'SUPERSEDED_DOCUMENT_NOT_FOUND', 'The document being replaced was not found');
      versionNumber = previous.version_number + 1;
      await client.query(
        `UPDATE capex_v2.entity_documents SET is_current=FALSE
          WHERE document_id=$1 AND entity_type=$2 AND entity_id=$3`,
        [supersedesDocumentId, entityType, entityId]
      );
    }
    await client.query(
      `INSERT INTO capex_v2.document_versions
         (document_id, version_number, supersedes_document_id, change_note, created_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [document.id, versionNumber, supersedesDocumentId, changeNote || null, actorId]
    );
    await client.query(
      `INSERT INTO capex_v2.entity_documents
         (document_id, entity_type, entity_id, document_kind)
       VALUES ($1,$2,$3,$4)`,
      [document.id, entityType, entityId, documentKind || (quotationId ? 'QUOTATION_EVIDENCE' : 'PROJECT_EVIDENCE')]
    );
    await client.query(`UPDATE capex_v2.requests SET version=version+1, updated_at=NOW() WHERE id=$1`, [requestId]);
    await client.query('COMMIT');
    return { ...document, documentKind, versionNumber };
  } catch (error) {
    await client.query('ROLLBACK');
    await storage.delete(stored.key).catch(() => {});
    throw error;
  }
}

async function downloadDocument(client, storage, documentId, context) {
  const { rows: [document] } = await client.query(
    `SELECT d.*, ed.entity_type, ed.entity_id,
            CASE
              WHEN ed.entity_type='REQUEST' THEN ed.entity_id
              WHEN ed.entity_type='QUOTATION' THEN q.request_id
              ELSE NULL
            END AS request_id
       FROM capex_v2.documents d
       JOIN capex_v2.entity_documents ed ON ed.document_id=d.id
       LEFT JOIN capex_v2.quotations q ON ed.entity_type='QUOTATION' AND q.id=ed.entity_id
      WHERE d.id=$1`,
    [documentId]
  );
  if (!document) throw new HttpError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
  if (document.scan_status === 'BLOCKED') {
    throw new HttpError(409, 'DOCUMENT_BLOCKED', 'This document was blocked by malware screening');
  }
  if (document.request_id) await assertRequestAccess(client, document.request_id, context);
  else if (!context.isAdmin && !context.scopes.some((scope) => scope.type === 'PORTFOLIO')) {
    throw new HttpError(403, 'DOCUMENT_FORBIDDEN', 'You cannot access this document');
  }
  return {
    filename: document.original_filename,
    mediaType: document.media_type,
    buffer: await storage.read(document.storage_key),
  };
}

module.exports = { attachDocument, downloadDocument };
