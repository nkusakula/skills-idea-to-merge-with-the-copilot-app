// Pure helpers for Mona's Bookmark Manager App.
//
// Nothing in this module touches the DOM or browser storage APIs directly —
// it only takes plain values in and returns plain values out. That keeps it
// safe to import from the static Astro build, from the client-side <script>
// in Bookmarks.astro, and from unit tests that run under plain Node.js
// without a browser.

export const STORAGE_KEY = 'mona-bookmarks';

const BASE62_ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const SLUG_PATTERN = /^mona-[0-9a-zA-Z]+$/;

/**
 * Normalise a user-typed URL so that equivalent inputs (with or without a
 * scheme) end up saved identically. Returns `null` when the input can't be
 * turned into a structurally valid URL, so callers never have to deal with
 * throwing behaviour.
 *
 * @param {unknown} input
 * @returns {string | null}
 */
export function normalizeUrl(input) {
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // A scheme is any "letter followed by letters/digits/+/-/." then "://".
  // Anything without one is treated as a bare host/path and gets "https://"
  // prepended, so "example.com" and "https://example.com" converge.
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    // Used only to validate structure — we intentionally keep `withScheme`
    // (not the URL object's `.href`) as the saved value, since `URL` adds a
    // trailing "/" to bare hosts and would change the visible format.
    // eslint-disable-next-line no-new
    new URL(withScheme);
  } catch {
    return null;
  }

  return withScheme;
}

/**
 * @param {unknown} value
 * @returns {value is { url: string; slug: string }}
 */
export function isValidBookmark(value) {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof candidate.url === 'string' &&
    candidate.url.trim().length > 0 &&
    typeof candidate.slug === 'string' &&
    SLUG_PATTERN.test(candidate.slug)
  );
}

/**
 * Parse and validate a raw `localStorage` value, dropping anything that
 * isn't a well-formed array of `{ url, slug }` entries. Never throws —
 * empty, corrupted (invalid JSON), legacy (wrong shape), or non-array
 * values all safely resolve to an empty list.
 *
 * @param {unknown} raw
 * @returns {Array<{ url: string; slug: string }>}
 */
export function loadBookmarks(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(isValidBookmark)
    .map((entry) => ({ url: entry.url, slug: entry.slug }));
}

/**
 * Update a bookmark URL without changing its slug.
 *
 * @param {Array<{ url: string; slug: string }>} bookmarks
 * @param {string} slug
 * @param {unknown} input
 * @returns {Array<{ url: string; slug: string }> | null}
 */
export function updateBookmarkUrl(bookmarks, slug, input) {
  const normalized = normalizeUrl(input);
  if (!normalized || !Array.isArray(bookmarks)) return null;

  const index = bookmarks.findIndex((bookmark) => bookmark.slug === slug);
  if (index === -1) return null;

  return bookmarks.map((bookmark, currentIndex) =>
    currentIndex === index ? { ...bookmark, url: normalized } : bookmark,
  );
}

/**
 * Render a single bookmark using the exact " :: " separator the app shows
 * between the URL and its slug, e.g. "https://example.com :: mona-7fk2".
 *
 * @param {{ url: string; slug: string }} bookmark
 * @returns {string}
 */
export function formatBookmark(bookmark) {
  return `${bookmark.url} :: ${bookmark.slug}`;
}

/**
 * @param {number} length
 * @returns {string}
 */
function randomBase62(length) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += BASE62_ALPHABET[Math.floor(Math.random() * BASE62_ALPHABET.length)];
  }
  return out;
}

/**
 * Generate a short "mona-" prefixed base62 slug that doesn't collide with
 * any slug already in use.
 *
 * @param {Iterable<string>} [existingSlugs]
 * @returns {string}
 */
export function createSlug(existingSlugs = []) {
  const used = new Set(existingSlugs);
  let slug = `mona-${randomBase62(4)}`;
  while (used.has(slug)) {
    slug = `mona-${randomBase62(4)}`;
  }
  return slug;
}
