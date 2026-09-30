// Shared paging envelope. Every list endpoint (discovery, followers, feed…)
// returns the same shape so clients only ever write one pagination handler.

/** The metadata needed to request the next page. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** One page of results plus its metadata. */
export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

/**
 * Wraps `items` in the envelope. `totalPages` is never 0: an empty page still
 * has page 1, otherwise a client computing `page + 1` would loop forever on an
 * empty result set.
 */
export function paginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    items,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
