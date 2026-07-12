import { useSearchParams } from 'react-router-dom';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function setParamValue(params, key, value, defaultValue) {
  if (value == null || value === '' || value === defaultValue) {
    params.delete(key);
    return;
  }
  params.set(key, String(value));
}

export default function usePaginationQuery({
  defaultPage = 1,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  defaults = {},
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const allowedPageSizes = pageSizeOptions.map((size) => Number(size)).filter((size) => Number.isFinite(size) && size > 0);
  const page = parsePositiveInt(searchParams.get('page'), defaultPage);
  const requestedPageSize = parsePositiveInt(searchParams.get('pageSize'), defaultPageSize);
  const pageSize = allowedPageSizes.includes(requestedPageSize) ? requestedPageSize : defaultPageSize;

  const filters = Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [key, searchParams.get(key) ?? value])
  );

  const updateSearchParams = (mutate) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      mutate(next);
      return next;
    });
  };

  const setPage = (nextPage) => {
    const safePage = parsePositiveInt(nextPage, defaultPage);
    updateSearchParams((next) => {
      setParamValue(next, 'page', safePage, defaultPage);
    });
  };

  const setPageSize = (nextPageSize) => {
    const requested = parsePositiveInt(nextPageSize, defaultPageSize);
    const safePageSize = allowedPageSizes.includes(requested) ? requested : defaultPageSize;
    updateSearchParams((next) => {
      setParamValue(next, 'pageSize', safePageSize, defaultPageSize);
      setParamValue(next, 'page', defaultPage, defaultPage);
    });
  };

  const setFilter = (key, value) => {
    updateSearchParams((next) => {
      setParamValue(next, key, value, defaults[key]);
      setParamValue(next, 'page', defaultPage, defaultPage);
    });
  };

  return {
    page,
    pageSize,
    pageSizeOptions: allowedPageSizes,
    filters,
    setPage,
    setPageSize,
    setFilter,
  };
}
