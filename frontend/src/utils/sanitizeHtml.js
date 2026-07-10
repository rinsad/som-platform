// Renders a KB search snippet safely. The backend wraps matched query terms in
// <mark>…</mark> but does NOT escape the surrounding document content, so a doc
// containing raw markup (e.g. <script>) would otherwise inject HTML into the
// public portal. Escape everything, then re-allow only the intended <mark> tags.
export function sanitizeSnippet(raw) {
  if (raw == null) return '';
  const escaped = String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return escaped
    .replace(/&lt;mark&gt;/g, '<mark>')
    .replace(/&lt;\/mark&gt;/g, '</mark>');
}
