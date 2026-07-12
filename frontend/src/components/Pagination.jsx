function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 1) return [1];
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const filtered = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items = [];

  filtered.forEach((page, index) => {
    if (index > 0 && page - filtered[index - 1] > 1) {
      items.push(`gap-${page}`);
    }
    items.push(page);
  });

  return items;
}

export default function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
}) {
  const hasItems = totalItems > 0;
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : page;
  const startItem = hasItems ? (safePage - 1) * pageSize + 1 : 0;
  const endItem = hasItems ? Math.min(safePage * pageSize, totalItems) : 0;
  const pageItems = buildPageItems(safePage, totalPages);

  return (
    <div style={s.root}>
      <div style={s.summary}>
        {hasItems ? `Showing ${startItem}-${endItem} of ${totalItems}` : 'No results to display'}
      </div>

      <div style={s.controls}>
        <label style={s.pageSizeLabel}>
          <span style={s.pageSizeText}>Rows</span>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            style={s.pageSizeSelect}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div style={s.pageButtons}>
          <button
            type="button"
            style={s.navButton}
            disabled={safePage <= 1 || totalPages === 0}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="Previous page"
          >
            Prev
          </button>

          {pageItems.map((item) => (
            typeof item === 'string' ? (
              <span key={item} style={s.ellipsis}>…</span>
            ) : (
              <button
                key={item}
                type="button"
                style={{ ...s.pageButton, ...(item === safePage ? s.pageButtonActive : {}) }}
                onClick={() => onPageChange(item)}
                aria-current={item === safePage ? 'page' : undefined}
              >
                {item}
              </button>
            )
          ))}

          <button
            type="button"
            style={s.navButton}
            disabled={totalPages === 0 || safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    padding: '14px 16px',
    borderTop: '1px solid var(--gray-100)',
    background: 'var(--gray-50)',
  },
  summary: {
    fontSize: 12.5,
    color: 'var(--gray-500)',
    fontWeight: 600,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  pageSizeLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  pageSizeText: {
    fontSize: 12,
    fontWeight: 800,
    color: 'var(--label-secondary)',
    textTransform: 'uppercase',
  },
  pageSizeSelect: {
    minWidth: 72,
    height: 34,
    border: '1px solid var(--gray-300)',
    borderRadius: 'var(--radius-sm)',
    background: '#fff',
    color: 'var(--gray-700)',
    fontSize: 12.5,
    fontWeight: 700,
    padding: '0 10px',
    fontFamily: 'inherit',
  },
  pageButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  navButton: {
    minWidth: 64,
    height: 34,
    border: '1px solid var(--gray-300)',
    borderRadius: 'var(--radius-sm)',
    background: '#fff',
    color: 'var(--gray-700)',
    fontSize: 12.5,
    fontWeight: 800,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  pageButton: {
    width: 34,
    height: 34,
    border: '1px solid var(--gray-300)',
    borderRadius: 'var(--radius-sm)',
    background: '#fff',
    color: 'var(--gray-700)',
    fontSize: 12.5,
    fontWeight: 800,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  pageButtonActive: {
    background: 'var(--shell-red)',
    borderColor: 'var(--shell-red-dark)',
    color: '#fff',
  },
  ellipsis: {
    width: 24,
    textAlign: 'center',
    color: 'var(--gray-400)',
    fontWeight: 800,
  },
};
