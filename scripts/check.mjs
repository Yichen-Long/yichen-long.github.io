import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { buildSite } from './build.mjs';

const { html, profile, outputPath } = await buildSite();
assert(html.startsWith('<!doctype html>'), 'An HTML entry point must be generated.');
assert(html.includes('<html lang="en">'), 'The page needs a document language.');
assert(html.includes('name="viewport"'), 'The page needs a mobile viewport.');
assert(!/\b(?:TODO|TBD|YOUR_NAME|example\.com)\b/.test(html), 'Public pages must not contain template instructions.');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'HTML IDs must be unique.');
let checked = 0;
async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}
const pages = await htmlFiles(outputPath);
for (const page of pages) {
  const body = await readFile(page, 'utf8');
  const base = new URL(relative(outputPath, page).split(sep).join('/'), 'https://local.test/');
  for (const [, rawUrl] of body.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = rawUrl.replace(/&amp;/g, '&');
    if (/^(?:https?:|mailto:)/.test(url)) continue;
    const local = new URL(url, base);
    assert.equal(local.origin, 'https://local.test', `Unexpected URL scheme in ${page}: ${url}`);
    let target = resolve(outputPath, `.${decodeURIComponent(local.pathname)}`);
    assert(target === outputPath || target.startsWith(outputPath + sep), `Path must stay within website output: ${url}`);
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    await access(target);
    if (local.hash) {
      const targetHtml = await readFile(target, 'utf8');
      assert(targetHtml.includes(`id="${decodeURIComponent(local.hash.slice(1))}"`), `Missing section target: ${url}`);
    }
    checked++;
  }
}
for (const file of ['index.html', 'robots.txt', 'sitemap.xml', '.nojekyll']) await access(resolve(outputPath, file));
const groups = Object.values(profile.publications);
if (groups.every(items => !items.length)) assert(!ids.includes('publications'), 'Empty publications should be hidden.');
for (const field of ['experience', 'teaching', 'awards']) {
  if (!profile[field].length) assert(!ids.includes(field), `Empty ${field} should be hidden.`);
}
await access(resolve(outputPath, 'blog/index.html'));
assert(!pages.some(path => /_template|CONTENT_TEMPLATE|CONTENT_TODO|BLOG_GUIDE/.test(path)), 'Working templates must not enter the website output.');
console.log(`Checks passed: ${pages.length} HTML pages, ${checked} local links/assets, no empty profile sections or sample content.`);
