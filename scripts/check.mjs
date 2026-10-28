import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildSite } from './build.mjs';

const { html, profile, outputPath } = await buildSite();
assert(html.startsWith('<!doctype html>'), 'An HTML entry point must be generated.');
assert(html.includes('<html lang="en">'), 'The page needs a document language.');
assert(html.includes('name="viewport"'), 'The page needs a mobile viewport.');
assert(!/\b(?:TODO|TBD|YOUR_NAME|example\.com)\b/.test(html), 'Public pages must not contain template instructions.');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'HTML IDs must be unique.');
let checked = 0;
for (const [, url] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  if (url.startsWith('#')) {
    assert(ids.includes(url.slice(1)), `Missing section target: ${url}`);
    checked++;
  } else if (!/^(?:https?:|mailto:)/.test(url)) {
    assert(!url.includes('..'), `Unexpected path traversal: ${url}`);
    await access(resolve(outputPath, url));
    checked++;
  }
}
for (const file of ['index.html', 'robots.txt', 'sitemap.xml', '.nojekyll']) await access(resolve(outputPath, file));
const groups = Object.values(profile.publications);
if (groups.every(items => !items.length)) assert(!ids.includes('publications'), 'Empty publications should be hidden.');
for (const field of ['experience', 'teaching', 'awards']) {
  if (!profile[field].length) assert(!ids.includes(field), `Empty ${field} should be hidden.`);
}
console.log(`Checks passed: valid output, ${checked} local links/assets, no empty sections or sample content.`);
