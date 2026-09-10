// Unit tests for the pure bookmark helpers — no browser required.
// Run with: node --test test/bookmarks.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  normalizeUrl,
  isValidBookmark,
  loadBookmarks,
  formatBookmark,
  createSlug,
} from '../src/lib/bookmarks.js';

test('storage key is the documented "mona-bookmarks"', () => {
  assert.equal(STORAGE_KEY, 'mona-bookmarks');
});

test('normalizeUrl: a URL with and without "https://" normalises to the same saved value', () => {
  assert.equal(normalizeUrl('example.com'), 'https://example.com');
  assert.equal(normalizeUrl('https://example.com'), 'https://example.com');
  assert.equal(normalizeUrl('example.com'), normalizeUrl('https://example.com'));

  assert.equal(normalizeUrl('www.example.com'), 'https://www.example.com');
  assert.equal(
    normalizeUrl('https://www.example.com'),
    normalizeUrl('www.example.com'),
  );
});

test('normalizeUrl: trims surrounding whitespace', () => {
  assert.equal(normalizeUrl('  example.com  '), 'https://example.com');
});

test('normalizeUrl: preserves an explicit non-https scheme', () => {
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com');
});

test('normalizeUrl: rejects empty or non-string input without throwing', () => {
  assert.equal(normalizeUrl(''), null);
  assert.equal(normalizeUrl('   '), null);
  assert.equal(normalizeUrl(null), null);
  assert.equal(normalizeUrl(undefined), null);
  assert.equal(normalizeUrl(42), null);
});

test('normalizeUrl: rejects structurally invalid URLs without throwing', () => {
  assert.equal(normalizeUrl('https://'), null);
  assert.equal(normalizeUrl('not a url with spaces'), null);
});

test('loadBookmarks: an empty stored value recovers to an empty list', () => {
  assert.deepEqual(loadBookmarks(''), []);
  assert.deepEqual(loadBookmarks(null), []);
  assert.deepEqual(loadBookmarks(undefined), []);
});

test('loadBookmarks: a corrupted (invalid JSON) stored value recovers to an empty list', () => {
  assert.deepEqual(loadBookmarks('{not valid json'), []);
  assert.deepEqual(loadBookmarks('undefined'), []);
});

test('loadBookmarks: a legacy (wrong shape) stored value recovers to an empty list', () => {
  // Legacy shape: array of plain strings instead of { url, slug } objects.
  assert.deepEqual(loadBookmarks(JSON.stringify(['https://example.com'])), []);
  // Legacy shape: a single object instead of an array of objects.
  assert.deepEqual(
    loadBookmarks(JSON.stringify({ url: 'https://example.com', slug: 'mona-abcd' })),
    [],
  );
});

test('loadBookmarks: a non-array stored value recovers to an empty list', () => {
  assert.deepEqual(loadBookmarks(JSON.stringify(42)), []);
  assert.deepEqual(loadBookmarks(JSON.stringify('just a string')), []);
  assert.deepEqual(loadBookmarks(JSON.stringify(true)), []);
});

test('loadBookmarks: drops malformed entries but keeps valid ones', () => {
  const raw = JSON.stringify([
    { url: 'https://example.com', slug: 'mona-7fk2' },
    { url: 'https://valid.com' }, // missing slug
    { slug: 'mona-abcd' }, // missing url
    { url: '', slug: 'mona-abcd' }, // empty url
    { url: 'https://bad.com', slug: 'not-a-mona-slug' }, // bad slug format
    'https://just-a-string.com',
    null,
    42,
    { url: 'https://second.com', slug: 'mona-z9z9' },
  ]);

  assert.deepEqual(loadBookmarks(raw), [
    { url: 'https://example.com', slug: 'mona-7fk2' },
    { url: 'https://second.com', slug: 'mona-z9z9' },
  ]);
});

test('isValidBookmark: accepts well-formed entries and rejects the rest', () => {
  assert.equal(isValidBookmark({ url: 'https://example.com', slug: 'mona-7fk2' }), true);
  assert.equal(isValidBookmark(null), false);
  assert.equal(isValidBookmark(undefined), false);
  assert.equal(isValidBookmark('string'), false);
  assert.equal(isValidBookmark({ url: 'https://example.com' }), false);
  assert.equal(isValidBookmark({ slug: 'mona-7fk2' }), false);
});

test('formatBookmark: formats as "<url> :: <slug>" with the exact " :: " separator', () => {
  assert.equal(
    formatBookmark({ url: 'https://www.example.com', slug: 'mona-7fk2' }),
    'https://www.example.com :: mona-7fk2',
  );
});

test('formatBookmark: separator is exactly " :: " (single spaces, double colon)', () => {
  const formatted = formatBookmark({ url: 'https://example.com', slug: 'mona-abcd' });
  assert.match(formatted, / :: /);
  assert.equal(formatted.includes('  ::'), false);
  assert.equal(formatted.includes('::  '), false);
});

test('createSlug: generates a "mona-" prefixed base62 slug', () => {
  const slug = createSlug();
  assert.match(slug, /^mona-[0-9a-zA-Z]+$/);
});

test('createSlug: avoids colliding with already-used slugs', () => {
  const used = new Set();
  for (let i = 0; i < 200; i += 1) {
    const slug = createSlug(used);
    assert.equal(used.has(slug), false);
    used.add(slug);
  }
});
