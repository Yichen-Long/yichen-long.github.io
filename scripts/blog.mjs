import MarkdownIt from 'markdown-it';
import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false });

function parsePost(source, filename) {
  const match = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: start with a metadata block between --- lines.`);
  const meta = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const entry = line.match(/^([a-z]+):\s*(.+)$/);
    if (!entry) throw new Error(`${filename}: invalid metadata line: ${line}`);
    const [, key, raw] = entry;
    if (!['title', 'date', 'summary', 'tags', 'draft', 'lang'].includes(key) || key in meta) throw new Error(`${filename}: unknown or duplicate field ${key}.`);
    try { meta[key] = /^(?:"|\[|true$|false$)/.test(raw) ? JSON.parse(raw) : raw; }
    catch { throw new Error(`${filename}: invalid value for ${key}. Use double quotes around text.`); }
  }
  if (typeof meta.title !== 'string' || !meta.title.trim()) throw new Error(`${filename}: title is required.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '') || new Date(`${meta.date}T00:00:00Z`).toISOString().slice(0, 10) !== meta.date) throw new Error(`${filename}: date must be a real YYYY-MM-DD date.`);
  if (typeof meta.draft !== 'boolean') throw new Error(`${filename}: explicitly set draft: true or draft: false.`);
  if (meta.summary !== undefined && typeof meta.summary !== 'string') throw new Error(`${filename}: summary must be text.`);
  if (meta.tags !== undefined && (!Array.isArray(meta.tags) || meta.tags.some(tag => typeof tag !== 'string'))) throw new Error(`${filename}: tags must be a JSON string array.`);
  if (!['en', 'zh-Hans', 'zh-CN'].includes(meta.lang ?? 'zh-Hans')) throw new Error(`${filename}: use en or zh-Hans for lang.`);
  const slug = filename.replace(/\.md$/, '');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error(`${filename}: use an English filename with letters, numbers, and hyphens.`);
  if (!meta.draft && !match[2].trim()) throw new Error(`${filename}: published posts need body text.`);
  return { ...meta, slug, body: match[2], tags: meta.tags ?? [], lang: meta.lang ?? 'zh-Hans' };
}

function page({ title, description, canonical, profile, content, lang = 'en' }) {
  return `<!doctype html>
<html lang="${escape(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(description)}">
  <title>${escape(title)} | ${escape(profile.name)}</title>
  <link rel="canonical" href="${escape(canonical)}">
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../assets/style.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="page blog-page">
    <nav class="blog-nav" aria-label="Site navigation"><a href="../">← ${escape(profile.name)}</a><a href="./">Blog</a></nav>
    <main id="main">${content}</main>
    <footer><span>© ${escape(profile.updated.slice(0, 4))} ${escape(profile.name)}</span><a href="../">Academic homepage</a></footer>
  </div>
</body>
</html>\n`;
}

export async function buildBlog({ root, outputPath, profile, postsPath = resolve(root, 'content/posts') }) {
  const files = (await readdir(postsPath)).filter(filename => filename.endsWith('.md') && !filename.startsWith('_'));
  const posts = [];
  for (const filename of files) {
    const post = parsePost(await readFile(resolve(postsPath, filename), 'utf8'), filename);
    if (!post.draft) posts.push(post);
  }
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const blogPath = resolve(outputPath, 'blog');
  await mkdir(blogPath, { recursive: true });
  const desiredFiles = new Set(['index.html', ...posts.map(post => `${post.slug}.html`)]);
  for (const item of await readdir(blogPath, { withFileTypes: true })) {
    if (item.isFile() && /^[a-z0-9-]+\.html$/.test(item.name) && !desiredFiles.has(item.name)) await unlink(resolve(blogPath, item.name));
  }
  const tags = post => post.tags.map(tag => `<span>${escape(tag)}</span>`).join('');
  const indexContent = `<header class="blog-header"><h1>Blog</h1><p>Research notes, technical write-ups, and things I am learning.</p></header>${posts.length ? `<ol class="post-list">${posts.map(post => `<li><time datetime="${post.date}">${post.date}</time><h2><a href="${post.slug}.html">${escape(post.title)}</a></h2>${post.summary ? `<p>${escape(post.summary)}</p>` : ''}<div class="post-tags">${tags(post)}</div></li>`).join('\n')}</ol>` : '<div class="empty-blog"><p>No posts yet.</p><p>Notes on circuits, design automation, and research will appear here.</p></div>'}`;
  await writeFile(resolve(blogPath, 'index.html'), page({ title: 'Blog', description: `Research notes and writing by ${profile.name}.`, canonical: new URL('blog/', profile.siteUrl).href, profile, content: indexContent }));
  for (const post of posts) {
    const content = `<article class="blog-article"><header class="post-header"><time datetime="${post.date}">${post.date}</time><h1>${escape(post.title)}</h1>${post.summary ? `<p class="post-summary">${escape(post.summary)}</p>` : ''}<div class="post-tags">${tags(post)}</div></header><div class="post-body">${markdown.render(post.body)}</div></article><p class="back-to-blog"><a href="./">← All posts</a></p>`;
    await writeFile(resolve(blogPath, `${post.slug}.html`), page({ title: post.title, description: post.summary ?? post.title, canonical: new URL(`blog/${post.slug}.html`, profile.siteUrl).href, profile, content, lang: post.lang }));
  }
  return posts.map(post => ({ url: new URL(`blog/${post.slug}.html`, profile.siteUrl).href, date: post.date }));
}
