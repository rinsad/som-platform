function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePagination(query = {}, options = {}) {
  const defaultPage = parsePositiveInt(options.defaultPage, 1);
  const defaultPageSize = parsePositiveInt(options.defaultPageSize, 10);
  const maxPageSize = parsePositiveInt(options.maxPageSize, 100);
  const hasPagingInput = query.page !== undefined || query.pageSize !== undefined;

  const page = parsePositiveInt(query.page, defaultPage);
  const requestedPageSize = parsePositiveInt(query.pageSize, defaultPageSize);
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  return {
    enabled: hasPagingInput,
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

function buildPaginationMeta({ page, pageSize, totalItems }) {
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const totalPages = safeTotalItems === 0 ? 0 : Math.ceil(safeTotalItems / pageSize);

  return {
    page,
    pageSize,
    totalItems: safeTotalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: totalPages > 0 && page < totalPages,
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
